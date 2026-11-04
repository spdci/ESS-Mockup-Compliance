// A valid, minimal-but-realistic request for every endpoint.

import { endpoints, senderId, receiverId } from './helpers.js';
import { records, publishedExamples } from '../fixtures/records.js';
import {
  msgHeader, callbackHeader, envelope, searchItem, searchMessage, idTypeValueQuery,
  subscribeItem, subscribeMessage, unsubscribeMessage, txnStatusMessage, enrolledMessage,
  searchResponseMessage, subscribeResponseMessage, unsubscribeResponseMessage,
  txnStatusResponseMessage, notifyEvent, notifyMessage,
} from './payloads.js';

// A reference record: records.<type>.<name>, or a published example ("spec example",
// "process flow 2", ...).
export function recordFixture(type, name) {
  if (!records[type]) throw new Error(`Unknown record type "${type}". Known: ${Object.keys(records).join(', ')}`);
  const found = records[type][name] ?? publishedExamples[type]?.[name];
  if (!found) throw new Error(`Unknown ${type} fixture "${name}". Known: ${[...Object.keys(records[type]), ...Object.keys(publishedExamples[type] || {})].join(', ')}`);
  return structuredClone(found);
}

export function defaultMessage(endpointName) {
  switch (endpointName) {
    case 'search':
    case 'sync search':
      return searchMessage([searchItem('Member', idTypeValueQuery('Member', 'full'))]);
    case 'subscribe':
      return subscribeMessage([subscribeItem('enrolment')]);
    case 'unsubscribe':
      return unsubscribeMessage(['SUB-0001']);
    case 'txn status':
    case 'sync txn status':
      return txnStatusMessage('search', 'transaction_id');
    case 'check enrollment':
      return enrolledMessage('ESSPerson', ['jobseeker']);
    case 'on-search':
      return searchResponseMessage('Member', [recordFixture('Member', 'full')]);
    case 'on-subscribe':
      return subscribeResponseMessage();
    case 'on-unsubscribe':
      return unsubscribeResponseMessage();
    case 'txn on-status':
      return txnStatusResponseMessage('search', { recordType: 'Member', records: [recordFixture('Member', 'full')] });
    case 'notify':
      return notifyMessage([notifyEvent('enrolment', 'Member', [recordFixture('Member', 'unemployed')])]);
    case 'notify ess':
      return notifyMessage([notifyEvent('enrolment', 'Member', recordFixture('Member', 'jobseeker'))]);
    default:
      throw new Error(`No default message for endpoint "${endpointName}"`);
  }
}

// Endpoints whose request carries a callback header (MsgCallbackHeader). Notifications to the
// ESS are sent by the SP-MIS, the other callbacks by the ESS.
const usesCallbackHeader = new Set(['on-search', 'on-subscribe', 'on-unsubscribe', 'notify', 'txn on-status', 'notify ess']);

export function buildRequest(endpointName, message = defaultMessage(endpointName)) {
  const { action } = endpoints[endpointName];
  const items = message.search_request || message.subscribe_request || message.search_response
    || message.subscribe_response || message.notify_event || [message];
  const counts = { totalCount: items.length };
  let header;
  if (endpointName === 'notify ess') header = callbackHeader(action, { ...counts, from: senderId, to: receiverId });
  else if (usesCallbackHeader.has(endpointName)) header = callbackHeader(action, counts);
  else header = msgHeader(action, counts);
  return envelope(header, message);
}
