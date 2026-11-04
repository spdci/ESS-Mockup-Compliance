// Runtime configuration of the compliance suite.
// Point ESS_BASE_URL at the Employment Support System implementation under test (the
// /registry/* endpoints it exposes) and SP_BASE_URL at the SP-MIS implementation receiving
// callbacks and notifications (on-search, notify, ...). Both default to the bundled Mockoon mocks.

const withSlash = (url) => (url.endsWith('/') ? url : `${url}/`);

export const essBaseUrl = withSlash(process.env.ESS_BASE_URL || 'http://127.0.0.1:3333/');
export const spBaseUrl = withSlash(process.env.SP_BASE_URL || 'http://127.0.0.1:3334/');

// Local listener used as header.sender_uri for async flows, so the callbacks the
// ESS sends (on-search, on-subscribe, ...) can be captured and validated.
export const callbackPort = Number(process.env.CALLBACK_PORT || 3335);
export const callbackBaseUrl = withSlash(
  process.env.CALLBACK_BASE_URL || `http://127.0.0.1:${callbackPort}/`,
);

export const defaultResponseTime = Number(process.env.RESPONSE_TIMEOUT_MS || 15000);
export const defaultExpectedResponseTime = defaultResponseTime;
export const callbackTimeout = Number(process.env.CALLBACK_TIMEOUT_MS || 10000);

// Optional bearer token (spec security scheme: Authorization: Bearer <jwt>).
export const authToken = process.env.AUTH_TOKEN || '';

export const senderId = process.env.SENDER_ID || 'spmis.example.org';
export const receiverId = process.env.RECEIVER_ID || 'ess.example.org';

export const acceptHeader = {
  key: 'Accept',
  value: 'application/json',
};
export const contentTypeHeader = {
  key: 'content-type',
  value: 'application/json; charset=utf-8',
};

// Every endpoint of the DCI Employment Support System (ESS) API v1.0.0.
//  side          : which system exposes it (ess = employment support system, sp = SP-MIS)
//  requestSchema : envelope schema the request must conform to
//  responseSchema: schema of the synchronous HTTP response
//  callback      : for async endpoints, the callback the ESS must send to header.sender_uri
// The ESS API is symmetric (either system may expose /registry/*); the suite tests the ESS as
// the registry and the SP-MIS as the receiver of callbacks. Notifications flow both ways
// (process flow 1: SP-MIS -> ESS, process flow 2: ESS -> SP-MIS), so notify exists on both sides.
export const endpoints = {
  'search': {
    side: 'ess', path: 'ess/search', action: 'search',
    requestSchema: 'search', responseSchema: 'ack',
    callback: { path: 'ess/on-search', action: 'on-search', schema: 'on-search' },
  },
  'sync search': {
    side: 'ess', path: 'ess/sync/search', action: 'search',
    requestSchema: 'search', responseSchema: 'sync-search-response',
  },
  'subscribe': {
    side: 'ess', path: 'ess/subscribe', action: 'subscribe',
    requestSchema: 'subscribe', responseSchema: 'ack',
    callback: { path: 'ess/on-subscribe', action: 'on-subscribe', schema: 'on-subscribe' },
  },
  'unsubscribe': {
    side: 'ess', path: 'ess/unsubscribe', action: 'unsubscribe',
    requestSchema: 'unsubscribe', responseSchema: 'ack',
    callback: { path: 'ess/on-unsubscribe', action: 'on-unsubscribe', schema: 'on-unsubscribe' },
  },
  'txn status': {
    side: 'ess', path: 'ess/txn/status', action: 'txn-status',
    requestSchema: 'txn-status', responseSchema: 'ack',
    callback: { path: 'ess/txn/on-status', action: 'txn-on-status', schema: 'txn-on-status' },
  },
  'sync txn status': {
    side: 'ess', path: 'ess/sync/txn/status', action: 'txn-status',
    requestSchema: 'txn-status', responseSchema: 'sync-txn-status-response',
  },
  // PRS.EMP.05: does a person remain enrolled (enrolment status of a member or group).
  'check enrollment': {
    side: 'ess', path: 'ess/sync/check-enrollment', action: 'check-enrollment',
    requestSchema: 'check-enrollment', responseSchema: 'check-enrollment-response',
  },
  // PRS.EMP.01 / PRS.EMP.04: the SP-MIS notifies the ESS of referrals and status changes.
  'notify ess': {
    side: 'ess', path: 'ess/notify', action: 'notify',
    requestSchema: 'notify', responseSchema: 'ack',
  },
  'on-search': {
    side: 'sp', path: 'ess/on-search', action: 'on-search',
    requestSchema: 'on-search', responseSchema: 'ack',
  },
  'on-subscribe': {
    side: 'sp', path: 'ess/on-subscribe', action: 'on-subscribe',
    requestSchema: 'on-subscribe', responseSchema: 'ack',
  },
  'on-unsubscribe': {
    side: 'sp', path: 'ess/on-unsubscribe', action: 'on-unsubscribe',
    requestSchema: 'on-unsubscribe', responseSchema: 'ack',
  },
  'txn on-status': {
    side: 'sp', path: 'ess/txn/on-status', action: 'txn-on-status',
    requestSchema: 'txn-on-status', responseSchema: 'ack',
  },
  // PRS.EMP.02 / PRS.EMP.04: the ESS notifies the SP-MIS of referrals and status changes.
  'notify': {
    side: 'sp', path: 'ess/notify', action: 'notify',
    requestSchema: 'notify', responseSchema: 'ack',
  },
};

export const endpointUrl = (name) => {
  const endpoint = endpoints[name];
  if (!endpoint) throw new Error(`Unknown endpoint "${name}". Known: ${Object.keys(endpoints).join(', ')}`);
  return (endpoint.side === 'ess' ? essBaseUrl : spBaseUrl) + endpoint.path;
};

// Kept for backwards compatibility with the previous helper exports.
export const localhost = essBaseUrl.replace(/\/$/, '');
export const asyncsearchEndpoint = `/${endpoints.search.path}`;
export const syncSearchEndpoint = `/${endpoints['sync search'].path}`;
export const checkEnrollmentEndpoint = `/${endpoints['check enrollment'].path}`;
export const txnStatusEndpoint = `/${endpoints['txn status'].path}`;
export const syncStatusEndpoint = `/${endpoints['sync txn status'].path}`;
export const subscribeEndpoint = `/${endpoints.subscribe.path}`;
export const unsubscribeEndpoint = `/${endpoints.unsubscribe.path}`;
export const notifyEndpoint = `/${endpoints['notify ess'].path}`;
export const onSearchEndpoint = `/${endpoints['on-search'].path}`;
export const onSubscribeEndpoint = `/${endpoints['on-subscribe'].path}`;
export const onUnsubscribeEndpoint = `/${endpoints['on-unsubscribe'].path}`;
export const onStatusEndpoint = `/${endpoints['txn on-status'].path}`;
