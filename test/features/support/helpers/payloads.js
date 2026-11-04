// Builders for spec-compliant DCI ESS requests ({ signature, header, message }).

import { randomUUID } from 'node:crypto';
import { senderId, receiverId } from './helpers.js';
import { testData, testRecord } from './testdata.js';

const nowTs = () => new Date().toISOString();
const shortId = (prefix) => `${prefix}${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;

export const newTransactionId = () => shortId('TXN');
export const newReferenceId = () => shortId('REF');

export function msgHeader(action, { totalCount = 1, senderUri } = {}) {
  return {
    version: '1.0.0',
    message_id: randomUUID(),
    message_ts: nowTs(),
    action,
    sender_id: senderId,
    ...(senderUri ? { sender_uri: senderUri } : {}),
    receiver_id: receiverId,
    total_count: totalCount,
    is_msg_encrypted: false,
  };
}

// Header of callbacks and notifications; `from` / `to` default to an ESS sending to the SP-MIS.
export function callbackHeader(action, { status = 'succ', totalCount = 1, completedCount = totalCount, from = receiverId, to = senderId } = {}) {
  return {
    version: '1.0.0',
    message_id: randomUUID(),
    message_ts: nowTs(),
    action,
    status,
    total_count: totalCount,
    completed_count: completedCount,
    sender_id: from,
    receiver_id: to,
    is_msg_encrypted: false,
  };
}

export const envelope = (header, message) => ({ header, message });

// ----- queries -----
export function idTypeValueQuery(recordType, name) {
  const { identifier_type, identifier_value } = testRecord(recordType, name);
  return { query_type: 'idtype-value', query: { type: identifier_type, value: identifier_value } };
}

export function predicateQuery(conditions) {
  // conditions: [{ attribute_name, operator, attribute_value }, ...] joined with "and"
  const query = [];
  for (let i = 0; i < conditions.length; i += 2) {
    const item = { seq_num: i / 2 + 1, expression1: conditions[i] };
    if (conditions[i + 1]) Object.assign(item, { condition: 'and', expression2: conditions[i + 1] });
    query.push(item);
  }
  return { query_type: 'predicate', query };
}

// Expression queries (ExpTemplate: NoSQL-style expression) of the ESS process flows.
export const expressionQueries = {
  // Process flow 1 / 2: working-age members who are not employed.
  'Member who are working-age and not employed': {
    collection: 'Member',
    query: { $and: [{ employment_status: { $eq: '6' } }, { 'demographic_info.birth_date': { $gte: '1962-02-16', $lte: '2008-02-16' } }] },
  },
  // Process flow 3: households with working-age members who are not employed.
  'Group with working-age unemployed members': {
    collection: 'Group',
    query: { $and: [{ member_list: { $elemMatch: { employment_status: { $eq: 'not employed' }, 'demographic_info.birth_date': { $gte: '1962-02-16', $lte: '2008-02-16' } } } }] },
  },
  'ESSPerson who are women born since 1980': {
    collection: 'ESSPerson', query: { $and: [{ sex: { $eq: 'female' } }, { birth_date: { $gte: '1980-01-01' } }] },
  },
};

export function expressionQuery(name) {
  const expression = expressionQueries[name];
  if (!expression) throw new Error(`Unknown expression "${name}". Known: ${Object.keys(expressionQueries).join(', ')}`);
  return { query_type: 'expression', query: { type: 'ns:org:QueryType:expression', value: { expression } } };
}

export const consent = (type) => ({
  '@context': `https://schema.spdci.org/common/v1/api-schemas/${type}.jsonld`,
  '@type': type,
  ts: nowTs(),
  purpose: { text: 'Referral of social protection beneficiaries to employment support', code: 'ESS-REFERRAL', ref_uri: 'https://example.org/consent-codes' },
});

// Search criteria for a record type: reg_record_type always, response_entity for Group/Member.
export function searchItem(recordType, criteria, { locale } = {}) {
  return {
    reference_id: newReferenceId(),
    timestamp: nowTs(),
    search_criteria: {
      version: '1.0.0',
      reg_type: testData.regType,
      reg_record_type: recordType,
      ...(['Group', 'Member'].includes(recordType) ? { response_entity: recordType } : {}),
      ...criteria,
    },
    ...(locale ? { locale } : {}),
  };
}

export const searchMessage = (items) => ({ transaction_id: newTransactionId(), search_request: items });

// ----- enrolment check (PRS.EMP.05) -----
// The attribute holding the identifier of the record type queried.
export const enrolledAttribute = { ESSPerson: 'person_identifier', Member: 'member_identifier', Group: 'group_identifier' };

// The spec's expression form: { "<attribute>": { "eq": <value> } } ("in" for a batch).
export function enrolledMessage(recordType, names, { responseEntity } = {}) {
  const values = names.map((n) => testRecord(recordType, n).identifier_value);
  const query = { [enrolledAttribute[recordType]]: values.length === 1 ? { eq: values[0] } : { in: values } };
  return {
    transaction_id: newTransactionId(),
    enrolled_criteria: { query_type: 'expression', response_entity: responseEntity ?? (recordType === 'Group' ? 'Group' : 'Member'), query },
  };
}

export function enrolledByIdentifierMessage(recordType, name) {
  const { query_type, query } = idTypeValueQuery(recordType, name);
  return {
    transaction_id: newTransactionId(),
    enrolled_criteria: { query_type, response_entity: recordType === 'Group' ? 'Group' : 'Member', query },
  };
}

// ----- subscriptions -----
export function subscribeItem(eventType, recordType = 'Member', filterType = 'idtype-value') {
  const name = { Group: 'full', Member: 'full', ESSPerson: 'full' }[recordType];
  const filter = {
    'idtype-value': () => idTypeValueQuery(recordType, name),
    'predicate': () => predicateQuery([{ attribute_name: 'employment_status', operator: 'eq', attribute_value: '6' }]),
    'expression': () => expressionQuery('Member who are working-age and not employed'),
    // Process flow 1: a GraphQL subscription sent as an expression filter.
    'graphql': () => ({
      query_type: 'graphql',
      query: {
        type: 'ns:org:QueryType:graphql',
        value: { expression: 'subscription NewEligibleEnrolments { enrolment(employment_status: "not employed", age_gt: 18, age_lt: 64) { id demographic_info { name { given_name surname } email phone_number } } }' },
      },
    }),
  }[filterType]();
  const start = new Date();
  const end = new Date(start.getTime() + 365 * 24 * 3600 * 1000);
  return {
    reference_id: newReferenceId(),
    timestamp: nowTs(),
    subscribe_criteria: {
      version: '1.0.0',
      reg_type: testData.regType,
      reg_event_type: eventType,
      frequency: { start_time: start.toISOString(), end_time: end.toISOString(), frequency: 'real-time' },
      filter_type: filter.query_type,
      filter: filter.query,
      notify_record_type: recordType,
      authorize: consent('Authorize'),
    },
    locale: 'eng',
  };
}

export const subscribeMessage = (items) => ({ transaction_id: newTransactionId(), subscribe_request: items });

export const unsubscribeMessage = (codes) => ({ transaction_id: newTransactionId(), timestamp: nowTs(), subscription_codes: codes });

// ----- transaction status -----
export function txnStatusMessage(txnType, attributeType) {
  const attributeValue = {
    transaction_id: newTransactionId(),
    reference_id_list: [newReferenceId(), newReferenceId()],
    correlation_id: `CORR-${randomUUID().slice(0, 8)}`,
  }[attributeType];
  return {
    transaction_id: newTransactionId(),
    txnstatus_request: {
      reference_id: newReferenceId(),
      txn_type: txnType,
      attribute_type: attributeType,
      attribute_value: attributeValue,
      locale: 'eng',
    },
  };
}

// ----- callback payloads (what an ESS sends to an SP-MIS) -----
const correlationId = () => `ESS-${randomUUID().slice(0, 8)}`;

export function searchResponseMessage(recordType, records, { status = 'succ', reasonCode, transactionId = newTransactionId() } = {}) {
  return {
    transaction_id: transactionId,
    correlation_id: correlationId(),
    search_response: [{
      reference_id: newReferenceId(),
      timestamp: nowTs(),
      status,
      ...(reasonCode ? { status_reason_code: reasonCode, status_reason_message: 'Search could not be completed' } : {}),
      ...(status === 'rjct' ? {} : {
        data: { version: '1.0.0', reg_type: testData.regType, reg_record_type: recordType, reg_records: records },
        pagination: { page_size: Math.max(records.length, 1), page_number: 1, total_count: records.length },
      }),
      locale: 'eng',
    }],
  };
}

export function subscribeResponseMessage({ status = 'succ', reasonCode } = {}) {
  const item = subscribeItem('enrolment');
  const { authorize, ...criteria } = item.subscribe_criteria;
  return {
    transaction_id: newTransactionId(),
    correlation_id: correlationId(),
    subscribe_response: [{
      reference_id: item.reference_id,
      timestamp: nowTs(),
      status,
      ...(reasonCode ? { status_reason_code: reasonCode, status_reason_message: 'Subscription refused' } : {}),
      ...(status === 'succ' ? {
        subscriptions: [{ code: 'SUB-0001', status: 'subscribe', timestamp: nowTs(), ...criteria, locale: 'eng' }],
      } : {}),
      locale: 'eng',
    }],
  };
}

export function unsubscribeResponseMessage({ status = 'succ', reasonCode } = {}) {
  return {
    transaction_id: newTransactionId(),
    correlation_id: correlationId(),
    timestamp: nowTs(),
    status,
    ...(reasonCode ? { status_reason_code: reasonCode, status_reason_message: 'Unsubscribe refused' } : {}),
    subscription_status: [{ code: 'SUB-0001', status: 'unsubscribe' }],
  };
}

export function receiptRequestMessage(beneficiaries) {
  return { transaction_id: newTransactionId(), receipt_information: { beneficiaries } };
}

export function enrolledResponseMessage(statuses) {
  return {
    transaction_id: newTransactionId(),
    correlation_id: correlationId(),
    enrolled_response: statuses.map((enrolled_status) => ({ reference_id: newReferenceId(), timestamp: nowTs(), status: 'succ', enrolled_status })),
  };
}

export function txnStatusResponseMessage(txnType, { recordType = 'Member', records = [], beneficiaries = [] } = {}) {
  const txnStatus = {
    search: () => searchResponseMessage(recordType, records),
    subscribe: () => subscribeResponseMessage(),
    receipt: () => receiptRequestMessage(beneficiaries),
    enrolled: () => enrolledResponseMessage(['Active', 'Suspended']),
  }[txnType]();
  return {
    transaction_id: txnStatus.transaction_id,
    correlation_id: txnStatus.correlation_id || correlationId(),
    txnstatus_response: { txn_type: txnType, txn_status: txnStatus },
  };
}

export function notifyEvent(eventType, recordType, records) {
  return {
    reference_id: newReferenceId(),
    timestamp: nowTs(),
    data: {
      version: '1.0.0',
      reg_type: testData.regType,
      reg_event_type: eventType,
      reg_record_type: recordType,
      reg_records: records,
    },
    locale: 'eng',
  };
}

export const notifyMessage = (events) => ({ transaction_id: newTransactionId(), notify_event: events });

export const encryptedMessage = () => ({
  header: { alg: 'RSA-OAEP-256', enc: 'A256GCM', kid: `${senderId}|key-1` },
  ciphertext: 'eyJ0cmFuc2FjdGlvbl9pZCI6IlRYTjEyMyJ9',
  encrypted_key: 'OKOawDo13gRp2ojaHV7LFpZcgV7T6DVZKTyKOMTYUmKoTCVJRgckCL9kiMT03JGeipsEdY3mx',
  tag: 'Mz-VPPyU4RlcuYv1IwIvzw',
  iv: '48V1_ALb6US04U3b',
});

// ----- path helpers ("message.search_request.0.locale") -----
const parsePath = (path) => path.split('.').map((p) => (/^\d+$/.test(p) ? Number(p) : p));

export function getPath(obj, path) {
  return parsePath(path).reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

export function setPath(obj, path, value) {
  const keys = parsePath(path);
  let o = obj;
  keys.slice(0, -1).forEach((k, i) => {
    if (o[k] == null || typeof o[k] !== 'object') o[k] = typeof keys[i + 1] === 'number' ? [] : {};
    o = o[k];
  });
  o[keys.at(-1)] = value;
}

export function deletePath(obj, path) {
  const keys = parsePath(path);
  const parent = getPath(obj, keys.slice(0, -1).join('.')) ?? (keys.length === 1 ? obj : undefined);
  if (parent && typeof parent === 'object') {
    if (Array.isArray(parent)) parent.splice(keys.at(-1), 1);
    else delete parent[keys.at(-1)];
  }
}

export const clone = (o) => structuredClone(o);
