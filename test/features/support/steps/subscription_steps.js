import './parameter_types.js';
import { Given, Then } from '@cucumber/cucumber';
import chai from 'chai';
import {
  subscribeItem, subscribeMessage, unsubscribeMessage, txnStatusMessage,
  searchResponseMessage, subscribeResponseMessage, unsubscribeResponseMessage,
  txnStatusResponseMessage, notifyEvent, notifyMessage,
} from '../helpers/payloads.js';
import { recordFixture } from '../helpers/defaults.js';
import { setPath, deletePath } from '../helpers/payloads.js';
import { validateMessage, formatErrors } from '../helpers/validator.js';
import { useRequest, inspectedMessage, REMOVED } from './common_steps.js';

const { expect } = chai;

const fixtures = (type, list) => list.split(',').map((name) => recordFixture(type, name.trim()));

// ---------------------------------------------------------------------------
// ESS-side requests
// ---------------------------------------------------------------------------
Given('a subscribe request for {string} events on {recordType} records filtered by {string}', function (eventType, type, filterType) {
  useRequest(this, subscribeMessage([subscribeItem(eventType, type, filterType)]));
});

Given('a subscribe request for {string} events on the record types {string}', function (eventType, list) {
  useRequest(this, subscribeMessage(list.split(',').map((type) => subscribeItem(eventType, type.trim()))));
});

Given('an unsubscribe request for the subscription codes {string}', function (list) {
  useRequest(this, unsubscribeMessage(list.split(',').map((c) => c.trim())));
});

Given('a transaction status request for {string} transactions by {string}', function (txnType, attributeType) {
  useRequest(this, txnStatusMessage(txnType, attributeType));
});

Then('the transaction status should be reported for a {string} transaction', function (txnType) {
  const r = inspectedMessage(this)?.txnstatus_response;
  expect(r, 'message.txnstatus_response').to.exist;
  expect(r.txn_type, 'txnstatus_response.txn_type').to.equal(txnType);
  expect(r.txn_status, 'txnstatus_response.txn_status').to.exist;
});

Then('every subscription should be confirmed with a subscription code', function () {
  const items = inspectedMessage(this)?.subscribe_response || [];
  expect(items, 'subscribe_response').to.not.be.empty;
  items.forEach((item, i) => {
    expect(item.status, `subscribe_response[${i}].status`).to.equal('succ');
    expect(item.subscriptions, `subscribe_response[${i}].subscriptions`).to.not.be.empty;
    item.subscriptions.forEach((s, j) => expect(s.status, `subscriptions[${j}].status`).to.equal('subscribe'));
  });
});

Then('every subscription should echo the requested event and record type', function () {
  const asked = Object.fromEntries(this.request.message.subscribe_request.map((i) => [i.reference_id, i.subscribe_criteria]));
  (inspectedMessage(this)?.subscribe_response || []).forEach((item, i) => {
    const criteria = asked[item.reference_id];
    expect(criteria, `subscribe_response[${i}].reference_id ${item.reference_id} was not requested`).to.exist;
    (item.subscriptions || []).forEach((s, j) => {
      if (s.reg_event_type !== undefined) expect(s.reg_event_type, `subscriptions[${j}].reg_event_type`).to.equal(criteria.reg_event_type);
      if (s.notify_record_type !== undefined) expect(s.notify_record_type, `subscriptions[${j}].notify_record_type`).to.equal(criteria.notify_record_type);
    });
  });
});

Then('every subscription code should be reported as unsubscribed', function () {
  const message = inspectedMessage(this);
  const asked = this.request.message.subscription_codes;
  expect(message.status, 'message.status').to.equal('succ');
  const reported = (message.subscription_status || []).filter((s) => s.status === 'unsubscribe').map((s) => s.code);
  expect(reported, 'unsubscribed codes').to.have.members(asked);
});

// ---------------------------------------------------------------------------
// SP-side callbacks (payloads an ESS sends to an SP-MIS)
// ---------------------------------------------------------------------------
Given('an on-search callback carrying the {string} {recordType} record', function (name, type) {
  useRequest(this, searchResponseMessage(type, [recordFixture(type, name)]));
});

Given('an on-search callback carrying the {recordType} records {string}', function (type, list) {
  useRequest(this, searchResponseMessage(type, fixtures(type, list)));
});

Given('an on-search callback carrying the {string} Member record without a reg_record_type', function (name) {
  const message = searchResponseMessage('Member', [recordFixture('Member', name)]);
  delete message.search_response[0].data.reg_record_type;
  useRequest(this, message);
});

// A record changed on the fly: "<attribute>" of "<fixture>" set to a JSON value (or <removed>).
Given('an on-search callback carrying the {string} {recordType} record with {string} set to {string}', function (name, type, path, json) {
  const record = recordFixture(type, name);
  if (json === REMOVED) deletePath(record, path);
  else setPath(record, path, JSON.parse(json));
  useRequest(this, searchResponseMessage(type, [record]));
});

Given('an on-search callback rejected with reason code {string}', function (code) {
  useRequest(this, searchResponseMessage('Member', [], { status: 'rjct', reasonCode: code }));
});

Given('an on-search callback with an empty {recordType} result', function (type) {
  useRequest(this, searchResponseMessage(type, []));
});

Given('an on-subscribe callback confirming the subscription', function () {
  useRequest(this, subscribeResponseMessage());
});

Given('an on-subscribe callback rejected with reason code {string}', function (code) {
  useRequest(this, subscribeResponseMessage({ status: 'rjct', reasonCode: code }));
});

Given('an on-unsubscribe callback confirming the unsubscription', function () {
  useRequest(this, unsubscribeResponseMessage());
});

Given('an on-unsubscribe callback rejected with reason code {string}', function (code) {
  useRequest(this, unsubscribeResponseMessage({ status: 'rjct', reasonCode: code }));
});

Given('a txn on-status callback for a {string} transaction', function (txnType) {
  useRequest(this, txnStatusResponseMessage(txnType, {
    recordType: 'Member',
    records: [recordFixture('Member', 'full')],
    beneficiaries: fixtures('Member', 'full, disabled'),
  }));
});

Given('a txn on-status callback for a search of the {string} {recordType} record', function (name, type) {
  useRequest(this, txnStatusResponseMessage('search', { recordType: type, records: [recordFixture(type, name)] }));
});

Given('a notify request for a {string} event carrying the {string} {recordType} record', function (eventType, name, type) {
  useRequest(this, notifyMessage([notifyEvent(eventType, type, [recordFixture(type, name)])]));
});

Given('a notify request for a {string} event carrying the {string} {recordType} record as a single object', function (eventType, name, type) {
  useRequest(this, notifyMessage([notifyEvent(eventType, type, recordFixture(type, name))]));
});

// One notification covering several records ("Member:jobseeker, Group:large, ...").
Given('a batch notify request for {string} events carrying {string}', function (eventType, list) {
  const events = list.split(',').map((p) => p.trim().split(':')).map(([type, name]) => notifyEvent(eventType, type, [recordFixture(type, name)]));
  useRequest(this, notifyMessage(events));
});

// A published example (process flow 1 / 2) notified as in the spec: reg_records as a single object.
Given('a notify request for a {string} event carrying the published {string} {recordType} example', function (eventType, name, type) {
  useRequest(this, notifyMessage([notifyEvent(eventType, type, recordFixture(type, name))]));
});

// A record changed on the fly: "<attribute>" of "<fixture>" set to a JSON value.
Given('a notify request for a {string} event carrying the {string} {recordType} record with {string} set to {string}', function (eventType, name, type, path, json) {
  const record = recordFixture(type, name);
  if (json === REMOVED) deletePath(record, path);
  else setPath(record, path, JSON.parse(json));
  useRequest(this, notifyMessage([notifyEvent(eventType, type, [record])]));
});

Then('the request should not be a valid {string} message because of {string}', function (kind, expected) {
  const errors = validateMessage(kind, this.request);
  expect(errors.some((e) => e.includes(expected)), `Expected an error mentioning "${expected}" but got:\n${formatErrors(errors)}`).to.be.true;
});
