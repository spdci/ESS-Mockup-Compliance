#!/usr/bin/env node
// Generates the Mockoon environments of the DCI Employment Support System (ESS) v1.0.0 API:
//   mockoon-ess.json   ESS side, port 3003:
//                      search, sync/search, subscribe, unsubscribe, txn/status, sync/txn/status,
//                      sync/check-enrollment, notify (referrals sent by the SP-MIS)
//   mockoon-sp.json    SP-MIS side (callbacks and notifications received from the ESS), port 3004:
//                      on-search, on-subscribe, on-unsubscribe, txn/on-status, notify
//
// Every endpoint validates the request against the spec schema (Mockoon valid_json_schema
// rule) and answers an ERR acknowledgement when it does not conform. Async ESS endpoints
// ACK and then call header.sender_uri back with the spec callback (on-search, ...).
//
// Searches return members (Member), persons (ESSPerson) or groups (Group) depending on
// search_criteria.reg_record_type / response_entity (Member when neither is given). The
// enrolment check answers the enrolment status of each identifier queried.
//
// Schemas and records are imported from the test suite so that the mocks and the
// compliance tests always agree. Run after changing them:
//   node mock/generate-mocks.mjs

import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { schemas } from '../test/features/support/helpers/schemas.js';
import {
  members, recordsByIdentifier, predicateResults, expressionResults, enrolmentIndex,
} from '../test/features/support/fixtures/records.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Stable UUIDs so regenerating produces minimal diffs.
const uuid = (seed) => {
  const h = createHash('sha1').update(seed).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

const REG_TYPE = 'ns:org:RegistryType:ESS';
const ESS_ID = 'ess.example.org';
const NOW = '{{now "yyyy-MM-dd\'T\'HH:mm:ss.SSSxxx"}}';
const JSON_HEADERS = [{ key: 'Content-Type', value: 'application/json' }];

// ---------------------------------------------------------------------------
// Handlebars templates
// ---------------------------------------------------------------------------
const ack = (status = 'ACK') => `{
  "message": {
    "ack_status": "${status}",
    "timestamp": "${NOW}",
    "correlation_id": "{{guid}}"
  }
}`;

const err = (what) => `{
  "message": {
    "ack_status": "ERR",
    "timestamp": "${NOW}",
    "error": {
      "code": "err.request.bad",
      "message": "Request does not conform to the DCI Employment Support System ${what} schema"
    },
    "correlation_id": "{{guid}}"
  }
}`;

// One SearchResponse item for the search_request item in scope (`this`).
// The record type is search_criteria.reg_record_type, else response_entity, else Member.
// Records are looked up in the "index" data bucket: "<type>|<identifier_value>" for
// idtype-value queries, "<type>|predicate|<attribute of the first expression>" for
// predicate queries and "<type>|expression" for expression queries.
// Sort and pagination are honoured.
const searchItem = (indexVar) => `{{setVar 'all' (array)}}
      {{setVar 'rt' 'Member'}}{{#if this.search_criteria.response_entity}}{{setVar 'rt' this.search_criteria.response_entity}}{{/if}}{{#if this.search_criteria.reg_record_type}}{{setVar 'rt' this.search_criteria.reg_record_type}}{{/if}}
      {{#if (eq this.search_criteria.query_type 'idtype-value')}}{{setVar 'found' (dataRaw 'index' (concat @rt '|' this.search_criteria.query.value))}}{{else if (eq this.search_criteria.query_type 'predicate')}}{{setVar 'found' (dataRaw 'index' (concat @rt '|predicate|' this.search_criteria.query.[0].expression1.attribute_name))}}{{else}}{{setVar 'found' (dataRaw 'index' (concat @rt '|' this.search_criteria.query_type))}}{{/if}}
      {{#if @found}}{{setVar 'all' (slice @found 0)}}{{/if}}
      {{#if this.search_criteria.sort}}{{setVar 'all' (sortBy @all this.search_criteria.sort.[0].attribute_name this.search_criteria.sort.[0].sort_order)}}{{/if}}
      {{setVar 'size' (bodyRaw (concat 'message.search_request.' ${indexVar} '.search_criteria.pagination.page_size') 10)}}
      {{setVar 'page' (bodyRaw (concat 'message.search_request.' ${indexVar} '.search_criteria.pagination.page_number') 1)}}
      {{#if (eq this.search_criteria.query.value 'TOOMANY000')}}
      {
        "reference_id": "{{this.reference_id}}",
        "timestamp": "${NOW}",
        "status": "rjct",
        "status_reason_code": "rjct.search.too_many_records_found",
        "status_reason_message": "Too many records match the search criteria, refine the query",
        "locale": "{{#if this.locale}}{{this.locale}}{{else}}eng{{/if}}"
      }
      {{else}}
      {
        "reference_id": "{{this.reference_id}}",
        "timestamp": "${NOW}",
        "status": "succ",
        "data": {
          "version": "1.0.0",
          "reg_type": "${REG_TYPE}",
          "reg_record_type": "{{@rt}}",
          "reg_records": {{{stringify (slice @all (multiply (subtract @page 1) @size) (multiply @page @size))}}}
        },
        "pagination": {
          "page_size": {{@size}},
          "page_number": {{@page}},
          "total_count": {{len @all}}
        },
        "locale": "{{#if this.locale}}{{this.locale}}{{else}}eng{{/if}}"
      }
      {{/if}}`;

const searchMessage = `{
    "transaction_id": "{{bodyRaw 'message.transaction_id'}}",
    "correlation_id": "{{guid}}",
    "search_response": [
      {{#each (bodyRaw 'message.search_request')}}
      ${searchItem('@index')}{{#unless @last}},{{/unless}}
      {{/each}}
    ]
  }`;

const callbackHeader = (action, countPath) => `{
    "version": "1.0.0",
    "message_id": "{{guid}}",
    "message_ts": "${NOW}",
    "action": "${action}",
    "status": "succ",
    "total_count": ${countPath ? `{{len (bodyRaw '${countPath}')}}` : 1},
    "completed_count": ${countPath ? `{{len (bodyRaw '${countPath}')}}` : 1},
    "sender_id": "${ESS_ID}",
    "receiver_id": "{{bodyRaw 'header.sender_id'}}",
    "is_msg_encrypted": false
  }`;

const onSearchBody = `{
  "header": ${callbackHeader('on-search', 'message.search_request')},
  "message": ${searchMessage}
}`;

const subscribeMessage = `{
    "transaction_id": "{{bodyRaw 'message.transaction_id'}}",
    "correlation_id": "{{guid}}",
    "subscribe_response": [
      {{#each (bodyRaw 'message.subscribe_request')}}
      {
        "reference_id": "{{this.reference_id}}",
        "timestamp": "${NOW}",
        "status": "succ",
        "subscriptions": [
          {
            "version": "1.0.0",
            "code": "SUB-{{guid}}",
            "status": "subscribe",
            "timestamp": "${NOW}",
            "reg_type": "{{#if this.subscribe_criteria.reg_type}}{{this.subscribe_criteria.reg_type}}{{else}}${REG_TYPE}{{/if}}",
            "reg_event_type": "{{this.subscribe_criteria.reg_event_type}}",
            {{#if this.subscribe_criteria.frequency}}"frequency": {{{stringify this.subscribe_criteria.frequency}}},{{/if}}
            {{#if this.subscribe_criteria.filter_type}}"filter_type": "{{this.subscribe_criteria.filter_type}}",{{/if}}
            "filter": {{{stringify this.subscribe_criteria.filter}}},
            "notify_record_type": "{{this.subscribe_criteria.notify_record_type}}",
            "locale": "{{#if this.locale}}{{this.locale}}{{else}}eng{{/if}}"
          }
        ],
        "locale": "{{#if this.locale}}{{this.locale}}{{else}}eng{{/if}}"
      }{{#unless @last}},{{/unless}}
      {{/each}}
    ]
  }`;

const unsubscribeMessage = `{
    "transaction_id": "{{bodyRaw 'message.transaction_id'}}",
    "correlation_id": "{{guid}}",
    "timestamp": "${NOW}",
    "status": "succ",
    "subscription_status": [
      {{#each (bodyRaw 'message.subscription_codes')}}
      { "code": "{{this}}", "status": "unsubscribe" }{{#unless @last}},{{/unless}}
      {{/each}}
    ]
  }`;

// TxnStatusResponse for the txn_type asked: the search variant reports the search of the
// "full" member, the receipt variant the members received.
const txnStatusMessage = `{
    "transaction_id": "{{bodyRaw 'message.transaction_id'}}",
    "correlation_id": "{{guid}}",
    "txnstatus_response": {
      "txn_type": "{{bodyRaw 'message.txnstatus_request.txn_type'}}",
      "txn_status":
      {{#switch (bodyRaw 'message.txnstatus_request.txn_type')}}
      {{#case 'subscribe'}}
      {
        "transaction_id": "{{bodyRaw 'message.transaction_id'}}",
        "correlation_id": "{{guid}}",
        "subscribe_response": [
          {
            "reference_id": "{{bodyRaw 'message.txnstatus_request.reference_id'}}",
            "timestamp": "${NOW}",
            "status": "succ",
            "subscriptions": [
              { "version": "1.0.0", "code": "SUB-0001", "status": "subscribe", "timestamp": "${NOW}", "reg_type": "${REG_TYPE}", "reg_event_type": "enrolment", "notify_record_type": "Member" }
            ]
          }
        ]
      }
      {{/case}}
      {{#case 'receipt'}}
      {
        "transaction_id": "{{bodyRaw 'message.transaction_id'}}",
        "receipt_information": {
          "beneficiaries": {{{stringify (dataRaw 'receipt')}}}
        }
      }
      {{/case}}
      {{#default}}
      {
        "transaction_id": "{{bodyRaw 'message.transaction_id'}}",
        "correlation_id": "{{guid}}",
        "search_response": [
          {
            "reference_id": "{{bodyRaw 'message.txnstatus_request.reference_id'}}",
            "timestamp": "${NOW}",
            "status": "succ",
            "data": {
              "version": "1.0.0",
              "reg_type": "${REG_TYPE}",
              "reg_record_type": "Member",
              "reg_records": {{{stringify (dataRaw 'index' 'Member|M100000001')}}}
            },
            "pagination": { "page_size": 10, "page_number": 1, "total_count": 1 },
            "locale": "{{bodyRaw 'message.txnstatus_request.locale' 'eng'}}"
          }
        ]
      }
      {{/default}}
      {{/switch}}
    }
  }`;

// PRS.EMP.05: EnrolledResponse. The identifiers checked are read from the query
// (idtype-value "value", predicate "attribute_value", or the "eq" / "in" condition on
// person_identifier, member_identifier or group_identifier). One answer per identifier,
// from the "enrolment" data bucket; identifiers without enrolment are rejected.
const Q = 'message.enrolled_criteria.query';
const enrolledResponse = `{{setVar 'ids' (array)}}
{{#if (bodyRaw '${Q}.value')}}{{setVar 'ids' (array (bodyRaw '${Q}.value'))}}{{/if}}
{{#if (bodyRaw '${Q}.attribute_value')}}{{setVar 'ids' (array (bodyRaw '${Q}.attribute_value'))}}{{/if}}
{{#if (bodyRaw '${Q}.person_identifier.eq')}}{{setVar 'ids' (array (bodyRaw '${Q}.person_identifier.eq'))}}{{/if}}
{{#if (bodyRaw '${Q}.person_identifier.in')}}{{setVar 'ids' (bodyRaw '${Q}.person_identifier.in')}}{{/if}}
{{#if (bodyRaw '${Q}.member_identifier.eq')}}{{setVar 'ids' (array (bodyRaw '${Q}.member_identifier.eq'))}}{{/if}}
{{#if (bodyRaw '${Q}.member_identifier.in')}}{{setVar 'ids' (bodyRaw '${Q}.member_identifier.in')}}{{/if}}
{{#if (bodyRaw '${Q}.group_identifier.eq')}}{{setVar 'ids' (array (bodyRaw '${Q}.group_identifier.eq'))}}{{/if}}
{{#if (bodyRaw '${Q}.group_identifier.in')}}{{setVar 'ids' (bodyRaw '${Q}.group_identifier.in')}}{{/if}}
{
  "header": ${callbackHeader('on-check-enrollment')},
  "message": {
    "transaction_id": "{{bodyRaw 'message.transaction_id'}}",
    "correlation_id": "{{guid}}",
    "enrolled_response": [
      {{#each @ids}}
      {{setVar 'st' (dataRaw 'enrolment' this)}}
      {
        "reference_id": "{{this}}",
        "timestamp": "${NOW}",
        {{#if @st}}
        "status": "succ",
        "enrolled_status": "{{@st}}"
        {{else}}
        "status": "rjct",
        "status_reason_message": "No enrolment found for {{this}}",
        "enrolled_status": "Inactive"
        {{/if}}
      }{{#unless @last}},{{/unless}}
      {{/each}}
    ]
  }
}`;

// ---------------------------------------------------------------------------
// Environment builders
// ---------------------------------------------------------------------------
const response = (seed, { statusCode = 200, label, body, rules = [], isDefault = false, callbacks = [] }) => ({
  uuid: uuid(seed),
  body,
  latency: 0,
  statusCode,
  label,
  headers: JSON_HEADERS,
  bodyType: 'INLINE',
  filePath: '',
  databucketID: '',
  sendFileAsBody: false,
  rules,
  rulesOperator: 'OR',
  disableTemplating: false,
  fallbackTo404: false,
  default: isDefault,
  crudKey: 'id',
  callbacks,
});

const invalidRequest = (schemaName) => [{
  target: 'body', modifier: '', value: `schemas.${schemaName}`, invert: true, operator: 'valid_json_schema',
}];

// POST route: ERR when the request breaks the spec schema, otherwise `ok`.
function route(env, endpoint, documentation, schemaName, ok) {
  return {
    uuid: uuid(`${env}:${endpoint}`),
    type: 'http',
    documentation,
    method: 'post',
    endpoint,
    responses: [
      response(`${env}:${endpoint}:ok`, { ...ok, isDefault: true }),
      response(`${env}:${endpoint}:err`, {
        statusCode: 400,
        label: `Request not conforming to the ${schemaName} schema`,
        body: err(schemaName),
        rules: invalidRequest(schemaName),
      }),
    ],
    responseMode: null,
    streamingMode: null,
    streamingInterval: 0,
  };
}

const healthcheck = (env) => ({
  uuid: uuid(`${env}:healthcheck`),
  type: 'http',
  documentation: 'Liveness probe used by the test runner',
  method: 'get',
  endpoint: 'healthcheck',
  responses: [response(`${env}:healthcheck:ok`, { label: 'UP', body: '{ "status": "UP" }', isDefault: true })],
  responseMode: null,
  streamingMode: null,
  streamingInterval: 0,
});

const callback = (env, name, documentation, body) => ({
  uuid: uuid(`${env}:callback:${name}`),
  id: name,
  uri: "{{bodyRaw 'header.sender_uri'}}",
  name,
  documentation,
  method: 'post',
  headers: JSON_HEADERS,
  bodyType: 'INLINE',
  body,
  databucketID: '',
  filePath: '',
  sendFileAsBody: true,
});

const bucket = (env, name, documentation, value) => ({
  uuid: uuid(`${env}:bucket:${name}`),
  id: name,
  name,
  documentation,
  value: JSON.stringify(value, null, 2),
});

function environment({ key, name, port, routes, data, callbacks = [] }) {
  return {
    uuid: uuid(`env:${key}`),
    lastMigration: 33,
    name,
    endpointPrefix: '',
    latency: 0,
    port,
    hostname: '',
    folders: [],
    routes,
    rootChildren: routes.map((r) => ({ type: 'route', uuid: r.uuid })),
    proxyMode: false,
    proxyHost: '',
    proxyRemovePrefix: false,
    tlsOptions: { enabled: false, type: 'CERT', pfxPath: '', certPath: '', keyPath: '', caPath: '', passphrase: '' },
    cors: true,
    headers: JSON_HEADERS,
    proxyReqHeaders: [{ key: '', value: '' }],
    proxyResHeaders: [{ key: '', value: '' }],
    data,
    callbacks,
  };
}

// ---------------------------------------------------------------------------
// ESS side
// ---------------------------------------------------------------------------
const byQuery = {
  ...Object.fromEntries(Object.entries(predicateResults).map(([key, records]) => {
    const [type, attribute] = key.split('|');
    return [`${type}|predicate|${attribute}`, records];
  })),
  ...Object.fromEntries(Object.entries(expressionResults).map(([type, records]) => [`${type}|expression`, records])),
};
const index = { ...recordsByIdentifier(), ...byQuery };
// Data bucket keys are read with dataRaw, which treats "." as a path separator.
for (const key of Object.keys(index)) if (key.includes('.')) throw new Error(`Index key "${key}" must not contain "."`);

const essSchemas = Object.fromEntries(['search', 'subscribe', 'unsubscribe', 'txn-status', 'check-enrollment', 'notify'].map((k) => [k, schemas[k]]));

const essCallbacks = [
  callback('ess', 'on-search', 'Async search results sent to header.sender_uri', onSearchBody),
  callback('ess', 'on-subscribe', 'Subscription result sent to header.sender_uri',
    `{\n  "header": ${callbackHeader('on-subscribe', 'message.subscribe_request')},\n  "message": ${subscribeMessage}\n}`),
  callback('ess', 'on-unsubscribe', 'Unsubscribe result sent to header.sender_uri',
    `{\n  "header": ${callbackHeader('on-unsubscribe')},\n  "message": ${unsubscribeMessage}\n}`),
  callback('ess', 'txn-on-status', 'Transaction status sent to header.sender_uri',
    `{\n  "header": ${callbackHeader('txn-on-status')},\n  "message": ${txnStatusMessage}\n}`),
];
const fire = (name) => [{ uuid: uuid(`ess:callback:${name}`), latency: 300 }];

const ess = environment({
  key: 'ess',
  name: 'DCI Employment Support System v1.0.0 - ESS',
  port: 3003,
  routes: [
    route('ess', 'ess/sync/search', 'POST /registry/sync/search - search members, persons or groups and get results in the response', 'search', {
      label: 'Search results (header action on-search + SearchResponse)',
      body: `{\n  "header": ${callbackHeader('on-search', 'message.search_request')},\n  "message": ${searchMessage}\n}`,
    }),
    route('ess', 'ess/search', 'POST /registry/search - async search, results are sent to header.sender_uri (on-search)', 'search', {
      label: 'ACK, then on-search callback', body: ack(), callbacks: fire('on-search'),
    }),
    route('ess', 'ess/subscribe', 'POST /registry/subscribe - subscribe to ESS enrolment events, result sent to header.sender_uri (on-subscribe)', 'subscribe', {
      label: 'ACK, then on-subscribe callback', body: ack(), callbacks: fire('on-subscribe'),
    }),
    route('ess', 'ess/unsubscribe', 'POST /registry/unsubscribe - cancel subscriptions, result sent to header.sender_uri (on-unsubscribe)', 'unsubscribe', {
      label: 'ACK, then on-unsubscribe callback', body: ack(), callbacks: fire('on-unsubscribe'),
    }),
    route('ess', 'ess/txn/status', 'POST /registry/txn/status - async transaction status, result sent to header.sender_uri (txn/on-status)', 'txn-status', {
      label: 'ACK, then txn/on-status callback', body: ack(), callbacks: fire('txn-on-status'),
    }),
    route('ess', 'ess/sync/txn/status', 'POST /registry/sync/txn/status - transaction status in the response', 'txn-status', {
      label: 'Transaction status (header action txn-on-status + TxnStatusResponse)',
      body: `{\n  "header": ${callbackHeader('txn-on-status')},\n  "message": ${txnStatusMessage}\n}`,
    }),
    route('ess', 'ess/sync/check-enrollment', 'POST /registry/sync/check-enrollment - does a person remain enrolled (PRS.EMP.05)', 'check-enrollment', {
      label: 'EnrolledResponse (enrolment status per identifier)', body: enrolledResponse,
    }),
    route('ess', 'ess/notify', 'POST /registry/notify - referrals and status changes notified by the SP-MIS (PRS.EMP.01, PRS.EMP.04)', 'notify', {
      label: 'ACK', body: ack(),
    }),
    healthcheck('ess'),
  ],
  data: [
    bucket('ess', 'index', 'ESS records by "<record type>|<identifier_value>", "<record type>|predicate|<attribute>" and "<record type>|expression"', index),
    bucket('ess', 'enrolment', 'Enrolment status by identifier (member, person or group)', enrolmentIndex()),
    bucket('ess', 'receipt', 'Members reported by the receipt transaction status', [members.full, members.disabled]),
    bucket('ess', 'schemas', 'DCI ESS request schemas (generated from test/features/support/helpers/schemas.js)', essSchemas),
  ],
  callbacks: essCallbacks,
});

// ---------------------------------------------------------------------------
// SP side (callbacks and notifications an ESS sends)
// ---------------------------------------------------------------------------
const spSchemas = Object.fromEntries(['on-search', 'on-subscribe', 'on-unsubscribe', 'txn-on-status', 'notify'].map((k) => [k, schemas[k]]));

const sp = environment({
  key: 'sp',
  name: 'DCI Employment Support System v1.0.0 - SP-MIS callbacks',
  port: 3004,
  routes: [
    route('sp', 'ess/on-search', 'POST /registry/on-search - receive async search results', 'on-search', { label: 'ACK', body: ack() }),
    route('sp', 'ess/on-subscribe', 'POST /registry/on-subscribe - receive subscription result', 'on-subscribe', { label: 'ACK', body: ack() }),
    route('sp', 'ess/on-unsubscribe', 'POST /registry/on-unsubscribe - receive unsubscribe result', 'on-unsubscribe', { label: 'ACK', body: ack() }),
    route('sp', 'ess/txn/on-status', 'POST /registry/txn/on-status - receive transaction status', 'txn-on-status', { label: 'ACK', body: ack() }),
    route('sp', 'ess/notify', 'POST /registry/notify - receive ESS referrals and status changes (PRS.EMP.02, PRS.EMP.04)', 'notify', { label: 'ACK', body: ack() }),
    healthcheck('sp'),
  ],
  data: [bucket('sp', 'schemas', 'DCI ESS callback schemas (generated from test/features/support/helpers/schemas.js)', spSchemas)],
});

if (!index['Member|M100000001']?.includes(members.full)) throw new Error('The index must resolve Member|M100000001 to the full member');

writeFileSync(path.join(root, 'mockoon-ess.json'), `${JSON.stringify(ess, null, 2)}\n`);
writeFileSync(path.join(root, 'mockoon-sp.json'), `${JSON.stringify(sp, null, 2)}\n`);
console.log('Generated mockoon-ess.json and mockoon-sp.json');
