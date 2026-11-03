// Validation of DCI ESS payloads: JSON Schema (structure, types, formats, code lists) plus the
// semantic rules a schema cannot express (real calendar dates, chronology, consistency
// between attributes: employment status vs employment history and unemployment reason,
// disability flag vs functional limitations, group vs its members, and between a request
// and its response).

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {
  schemas, codeOf, labels, ISO_DATE_PATTERN, PERSON_RECORD_TYPE_PATTERN, MEMBER_RECORD_TYPE_PATTERN,
  GROUP_RECORD_TYPE_PATTERN,
} from './schemas.js';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const compiled = {};
const compile = (name) => {
  if (!schemas[name]) throw new Error(`Unknown schema "${name}". Known: ${Object.keys(schemas).join(', ')}`);
  compiled[name] ??= ajv.compile(schemas[name]);
  return compiled[name];
};

const formatAjvErrors = (errors = []) => {
  // anyOf/if branches produce noisy duplicates, keep the most specific ones.
  const seen = new Set();
  return errors
    .filter((e) => !['anyOf', 'if', 'oneOf'].includes(e.keyword))
    .map((e) => {
      const where = e.instancePath || '(root)';
      const extra = e.keyword === 'enum' ? ` ${JSON.stringify(e.params.allowedValues.length > 12 ? [...e.params.allowedValues.slice(0, 12), '...'] : e.params.allowedValues)}`
        : e.keyword === 'const' ? ` ${JSON.stringify(e.params.allowedValue)}` : '';
      return `${where} ${e.message}${extra}`;
    })
    .filter((m) => (seen.has(m) ? false : seen.add(m)));
};

export function validateSchema(name, data) {
  const validate = compile(name);
  const valid = validate(data);
  return { valid, errors: valid ? [] : formatAjvErrors(validate.errors) };
}

// ---------------------------------------------------------------------------
// Record types
// ---------------------------------------------------------------------------
export const RECORD_TYPES = ['ESSPerson', 'Member', 'Group'];

// Maps a reg_record_type / response_entity value to ESSPerson, Member or Group
// (undefined when it is not an ESS record type).
export function recordTypeOf(value) {
  if (typeof value !== 'string') return undefined;
  if (new RegExp(PERSON_RECORD_TYPE_PATTERN).test(value)) return 'ESSPerson';
  if (new RegExp(MEMBER_RECORD_TYPE_PATTERN).test(value)) return 'Member';
  if (new RegExp(GROUP_RECORD_TYPE_PATTERN).test(value)) return 'Group';
  return undefined;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const isoDateRe = new RegExp(ISO_DATE_PATTERN);

export function isRealDate(value) {
  if (typeof value !== 'string' || !isoDateRe.test(value)) return false;
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

// Calendar-day comparison so that "1985-05-20" and "1985-05-20T00:00:00Z" are the same day.
const day = (value) => value.slice(0, 10);
const present = (v) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
const asList = (v) => (Array.isArray(v) ? v : [v]).filter(present);
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const today = () => new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10); // 1 day clock-skew tolerance
const validDay = (v) => (typeof v === 'string' && isRealDate(v) ? day(v) : undefined);
const idKey = (id) => (isObject(id) && typeof id.identifier_type === 'string' && typeof id.identifier_value === 'string'
  ? `${id.identifier_type}|${id.identifier_value}` : undefined);
const idKeys = (list) => (Array.isArray(list) ? list.map(idKey).filter(Boolean) : []);
const isTrue = (flag) => flag === true || flag === 1;
const isFalse = (flag) => flag === false || flag === 0;
const label = (list, code) => `${code} (${labels[list][code]})`;

// Every date that is sent must be a real calendar date and, unless it may lie ahead
// (e.g. the end of a fixed-term contract), not in the future.
function checkDates(record, fields, where, { future = false } = {}) {
  const errors = [];
  for (const field of fields) {
    for (const value of asList(record[field])) {
      if (typeof value !== 'string') continue; // type errors are reported by the schema
      if (!isRealDate(value)) errors.push(`${where}.${field} "${value}" is not a valid ISO 8601 calendar date`);
      else if (!future && day(value) > today()) errors.push(`${where}.${field} "${value}" is in the future`);
    }
  }
  return errors;
}

function checkUpdatedAfterRegistration(record, where) {
  const registration = validDay(record.registration_date);
  const lastUpdated = validDay(record.last_updated);
  return registration && lastUpdated && lastUpdated < registration
    ? [`${where}.last_updated ${lastUpdated} is before registration_date ${registration}`]
    : [];
}

function checkDuplicateIdentifiers(list, where) {
  const keys = idKeys(list);
  const duplicates = [...new Set(keys.filter((k, i) => keys.indexOf(k) !== i))];
  return duplicates.length ? [`${where} contains duplicates: ${duplicates.join(', ')}`] : [];
}

// Coordinates may be sent as text (schema:GeoCoordinates); their range is checked here.
function checkCoordinates(geo, where) {
  const errors = [];
  if (!isObject(geo)) return errors;
  for (const [axis, limit] of [['latitude', 90], ['longitude', 180]]) {
    const value = geo[axis];
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)) && Math.abs(Number(value)) > limit) {
      errors.push(`${where}.${axis} "${value}" is outside [-${limit}, ${limit}]`);
    }
  }
  return errors;
}

function checkPlace(place, where) {
  if (!isObject(place)) return [];
  return [
    ...checkCoordinates(place.geo, `${where}.geo`),
    ...asList(place.contains_place).flatMap((p, i) => checkPlace(p, `${where}.contains_place[${i}]`)),
    ...(isObject(place.contained_in_place) ? checkPlace(place.contained_in_place, `${where}.contained_in_place`) : []),
  ];
}

function checkAddresses(address, where) {
  const errors = [];
  for (const [i, a] of asList(address).entries()) {
    const geometry = a?.geo_location?.plus_code?.geometry;
    const ne = geometry?.bounds?.northeast;
    const sw = geometry?.bounds?.southwest;
    if (typeof ne?.latitude === 'number' && typeof sw?.latitude === 'number' && ne.latitude < sw.latitude) {
      errors.push(`${where}.address[${i}] geo bounds northeast.latitude ${ne.latitude} is south of southwest.latitude ${sw.latitude}`);
    }
    errors.push(...checkCoordinates(a?.geo_location, `${where}.address[${i}].geo_location`));
  }
  return errors;
}

// ---------------------------------------------------------------------------
// ESS_Person (core Person)
// ---------------------------------------------------------------------------
export function checkPersonRules(person, where = 'record') {
  if (!isObject(person)) return [`${where} must be an object`];
  const errors = checkDates(person, ['birth_date', 'death_date', 'registration_date', 'last_updated'], where);

  const birth = validDay(person.birth_date);
  const death = validDay(person.death_date);
  const registration = validDay(person.registration_date);
  if (birth && death && death < birth) errors.push(`${where}.death_date ${death} is before birth_date ${birth}`);
  if (birth && registration && registration < birth) errors.push(`${where}.registration_date ${registration} is before birth_date ${birth}`);
  errors.push(...checkUpdatedAfterRegistration(person, where));
  errors.push(...checkDuplicateIdentifiers(person.identifier, `${where}.identifier`));
  errors.push(...checkAddresses(person.address, where));
  return errors;
}

// ---------------------------------------------------------------------------
// Employment_Info
// ---------------------------------------------------------------------------
export function checkEmploymentInfoRules(job, where = 'record', person = undefined) {
  if (!isObject(job)) return [`${where} must be an object`];
  const errors = [
    ...checkDates(job, ['start_date'], where),
    // A fixed-term or seasonal contract may end in the future.
    ...checkDates(job, ['end_date'], where, { future: true }),
  ];
  const start = validDay(job.start_date);
  const end = validDay(job.end_date);
  if (start && end && end < start) errors.push(`${where}.end_date ${end} is before start_date ${start}`);
  const birth = validDay(person?.birth_date);
  const death = validDay(person?.death_date);
  if (start && birth && start < birth) errors.push(`${where}.start_date ${start} is before demographic_info.birth_date ${birth}`);
  if (start && death && start > death) errors.push(`${where}.start_date ${start} is after demographic_info.death_date ${death}`);
  return errors;
}

// An employment period still running today (no end_date, or an end_date ahead).
const isCurrentJob = (job) => isObject(job) && (!present(job.end_date) || (validDay(job.end_date) ?? '') > today());

// ---------------------------------------------------------------------------
// DisabilityInfo
// ---------------------------------------------------------------------------
// The functional domains of one entry (both namings, each domain once).
const limitationTypes = (info) => [...new Set([...asList(info?.disability_limitation_type), ...asList(info?.functional_type)]
  .map((t) => codeOf('functionalType', t)).filter(Boolean))];
const severityOf = (info) => codeOf('functionalSeverity', info?.functional_severity);

export function checkDisabilityInfoRules(info, where = 'record') {
  if (!isObject(info)) return [`${where} must be an object`];
  const errors = [];
  if (!limitationTypes(info).length && present(info.functional_severity)) {
    errors.push(`${where} gives a functional_severity without the disability_limitation_type it applies to`);
  }
  // Both namings may be sent, but they must name the same limitations.
  const a = asList(info.disability_limitation_type).map((t) => codeOf('functionalType', t)).filter(Boolean).sort();
  const b = asList(info.functional_type).map((t) => codeOf('functionalType', t)).filter(Boolean).sort();
  if (a.length && b.length && JSON.stringify(a) !== JSON.stringify(b)) {
    errors.push(`${where}.disability_limitation_type ${JSON.stringify(a)} contradicts functional_type ${JSON.stringify(b)}`);
  }
  return errors;
}

// ---------------------------------------------------------------------------
// ESS Member
// ---------------------------------------------------------------------------
const memberKeys = (member) => [...idKeys(member?.member_identifier), ...idKeys(member?.demographic_info?.identifier)];
const EMPLOYED = ['1', '2', '3', '4', '5']; // EmploymentStatusEnum: in employment
const NOT_EMPLOYED = '6';

export function checkMemberRules(member, where = 'record') {
  if (!isObject(member)) return [`${where} must be an object`];
  const errors = checkDates(member, ['registration_date', 'last_updated'], where);
  errors.push(...checkUpdatedAfterRegistration(member, where));
  errors.push(...checkDuplicateIdentifiers(member.member_identifier, `${where}.member_identifier`));

  const person = member.demographic_info;
  if (isObject(person)) {
    // demographic_info IS the ESS_Person (ESS Member.jsonld), not a wrapper around it.
    if (isObject(person.person)) {
      errors.push(`${where}.demographic_info wraps the person in "person": demographic_info must be the ESS_Person itself`);
    }
    errors.push(...checkPersonRules(person, `${where}.demographic_info`));
    const birth = validDay(person.birth_date);
    const registration = validDay(member.registration_date);
    if (birth && registration && registration < birth) {
      errors.push(`${where}.registration_date ${registration} is before demographic_info.birth_date ${birth}`);
    }
  }

  // ----- employment (ESS extension) -----
  const status = codeOf('employmentStatus', member.employment_status);
  const reason = codeOf('unemploymentReason', member.unemployment_reason);
  const jobs = asList(member.employment_info);
  jobs.forEach((job, i) => errors.push(...checkEmploymentInfoRules(job, `${where}.employment_info[${i}]`, person)));
  if (reason && EMPLOYED.includes(status)) {
    errors.push(`${where}.unemployment_reason ${label('unemploymentReason', reason)} is given but employment_status ${label('employmentStatus', status)} says the member is employed`);
  }
  if (status === NOT_EMPLOYED) {
    jobs.forEach((job, i) => {
      if (isCurrentJob(job)) errors.push(`${where}.employment_status is ${label('employmentStatus', status)} but employment_info[${i}] is still running (no end_date or an end_date ahead)`);
    });
  }
  // Employment periods of the same employer must not overlap.
  const periods = jobs.filter(isObject).map((job, i) => ({ i, employer: job.employer, start: validDay(job.start_date), end: validDay(job.end_date) ?? '9999-12-31' }))
    .filter((p) => p.start && typeof p.employer === 'string');
  periods.forEach((p, n) => periods.slice(n + 1).forEach((q) => {
    if (p.employer === q.employer && p.start <= q.end && q.start <= p.end) {
      errors.push(`${where}.employment_info[${p.i}] and employment_info[${q.i}] overlap for the same employer "${p.employer}"`);
    }
  }));

  // ----- disability (core Member: is_disabled, disability_info) -----
  const infos = asList(member.disability_info);
  infos.forEach((info, i) => errors.push(...checkDisabilityInfoRules(info, `${where}.disability_info[${i}]`)));
  const severities = infos.map(severityOf).filter(Boolean);
  // Washington Group: "a lot of difficulty" (3) or "cannot do at all" (4) in a domain is a disability.
  if (isFalse(member.is_disabled) && severities.some((s) => s === '3' || s === '4')) {
    errors.push(`${where}.is_disabled is ${JSON.stringify(member.is_disabled)} but disability_info reports "a lot of difficulty" or "cannot do at all"`);
  }
  if (isTrue(member.is_disabled) && severities.length && severities.every((s) => s === '1')) {
    errors.push(`${where}.is_disabled is ${JSON.stringify(member.is_disabled)} but every disability_info entry reports "no difficulty"`);
  }
  // One entry per functional domain.
  const domains = infos.flatMap(limitationTypes);
  const repeated = [...new Set(domains.filter((d, i) => domains.indexOf(d) !== i))];
  if (repeated.length) errors.push(`${where}.disability_info lists the functional domain ${repeated.join(', ')} more than once`);

  // A member cannot be related to itself, except with the relationship SELF.
  const own = memberKeys(member);
  for (const [i, related] of asList(member.related_person).entries()) {
    if (!isObject(related)) continue;
    const other = isObject(related.related_member)
      ? [...memberKeys(related.related_member), ...idKeys(related.related_member.identifier)] : [];
    const self = other.find((k) => own.includes(k));
    if (self && related.relationship_type !== 'SELF') {
      errors.push(`${where}.related_person[${i}] relates the member to itself (${self}) with relationship_type "${related.relationship_type}"`);
    }
    if (isObject(related.related_member)) {
      errors.push(...checkPersonRules(related.related_member, `${where}.related_person[${i}].related_member`));
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// ESS Group
// ---------------------------------------------------------------------------
export function checkGroupRules(group, where = 'record') {
  if (!isObject(group)) return [`${where} must be an object`];
  const errors = checkDates(group, ['registration_date', 'last_updated'], where);
  errors.push(...checkUpdatedAfterRegistration(group, where));
  errors.push(...checkDuplicateIdentifiers(group.group_identifier, `${where}.group_identifier`));
  errors.push(...checkAddresses(group.address, where));
  errors.push(...checkPlace(group.geographical_location, `${where}.geographical_location`));

  // place_address says which location applies: place (1) or address (0). The chosen one must be sent.
  if (isTrue(group.place_address) && !present(group.geographical_location)) errors.push(`${where}.place_address is 1 (use place) but no geographical_location is given`);
  if (isFalse(group.place_address) && !present(group.address)) errors.push(`${where}.place_address is 0 (use address) but no address is given`);

  const membersList = Array.isArray(group.member_list) ? group.member_list : [];
  membersList.forEach((m, i) => errors.push(...checkMemberRules(m, `${where}.member_list[${i}]`)));
  if (isObject(group.group_head_info)) errors.push(...checkMemberRules(group.group_head_info, `${where}.group_head_info`));

  // group_size is the total number of members: the list cannot hold more.
  if (Number.isInteger(group.group_size) && membersList.length > group.group_size) {
    errors.push(`${where}.member_list has ${membersList.length} members, more than group_size ${group.group_size}`);
  }
  // A group of type 1 (Member, an individual) has a single member.
  if (codeOf('assistanceUnit', group.group_type) === '1' && (membersList.length > 1 || (Number.isInteger(group.group_size) && group.group_size > 1))) {
    errors.push(`${where}.group_type is ${label('assistanceUnit', '1')} but the group has more than one member`);
  }
  // A member must not be listed twice.
  const seen = new Map();
  membersList.forEach((m, i) => {
    for (const key of idKeys(m?.member_identifier)) {
      if (seen.has(key)) errors.push(`${where}.member_list[${i}] repeats member ${key} of member_list[${seen.get(key)}]`);
      else seen.set(key, i);
    }
  });
  // The head of the group must be one of the listed members (when both are identifiable).
  const headKeys = memberKeys(group.group_head_info);
  const listedKeys = membersList.flatMap(memberKeys);
  if (headKeys.length && listedKeys.length && !headKeys.some((k) => listedKeys.includes(k))) {
    errors.push(`${where}.group_head_info (${headKeys[0]}) is not one of the members in member_list`);
  }
  return errors;
}

const rulesByType = {
  ESSPerson: checkPersonRules,
  Member: checkMemberRules,
  Group: checkGroupRules,
  EmploymentInfo: (r, where) => checkEmploymentInfoRules(r, where),
  DisabilityInfo: checkDisabilityInfoRules,
};

export function checkRecordRules(type, record, where = 'record') {
  return rulesByType[type](record, where);
}

// Schema + rules for one record of the given type.
export function validateRecord(type, record, where = 'record') {
  const { errors } = validateSchema(type, record);
  return [...errors.map((e) => where + e.replace(/^\(root\)/, '')), ...checkRecordRules(type, record, where)];
}

const recordsOf = (regRecords) => {
  if (Array.isArray(regRecords)) return regRecords;
  if (isObject(regRecords)) return [regRecords];
  return [];
};

// Extracts every ESS record from any message (search results, notifications, txn status,
// receipts), with the record type it must conform to. Without a reg_record_type,
// reg_records are Member records (as declared by the spec's SearchResponse).
export function extractRecords(message) {
  const out = [];
  if (!isObject(message)) return out;
  const fromItems = (items, path) => (Array.isArray(items) ? items : []).forEach((item, i) => {
    const data = item?.data;
    if (!isObject(data)) return;
    const type = data.reg_record_type === undefined ? 'Member' : recordTypeOf(data.reg_record_type);
    if (!type) return; // unknown record types are reported by the schema
    recordsOf(data.reg_records).forEach((record, j) => out.push({ type, record, where: `${path}[${i}].data.reg_records[${j}]` }));
  });
  const beneficiaries = (info, path) => (Array.isArray(info?.beneficiaries) ? info.beneficiaries : [])
    .forEach((record, j) => out.push({ type: 'Member', record, where: `${path}.beneficiaries[${j}]` }));
  fromItems(message.search_response, 'message.search_response');
  fromItems(message.notify_event, 'message.notify_event');
  const txnStatus = message.txnstatus_response?.txn_status;
  fromItems(txnStatus?.search_response, 'message.txnstatus_response.txn_status.search_response');
  beneficiaries(txnStatus?.receipt_information, 'message.txnstatus_response.txn_status.receipt_information');
  return out;
}

// ---------------------------------------------------------------------------
// Message-level rules
// ---------------------------------------------------------------------------

// Rules on a callback header (sync responses and async callbacks).
export function checkCallbackHeaderRules(header) {
  const errors = [];
  if (!header) return errors;
  if (Number.isInteger(header.total_count) && Number.isInteger(header.completed_count) && header.completed_count > header.total_count) {
    errors.push(`header.completed_count ${header.completed_count} is greater than header.total_count ${header.total_count}`);
  }
  if (header.status === 'rjct' && !header.status_reason_code) {
    errors.push('header.status is "rjct" but no header.status_reason_code explains the rejection');
  }
  return errors;
}

// The record type a search_request item asks for (reg_record_type, else response_entity).
export function requestedRecordType(requestItem) {
  const criteria = requestItem?.search_criteria;
  return recordTypeOf(criteria?.reg_record_type) || recordTypeOf(criteria?.response_entity);
}

// Rules on a search result item, optionally against the original search_request item.
export function checkSearchResponseItem(item, where, requestItem) {
  const errors = [];
  if (!item || typeof item !== 'object') return errors;
  if (item.status === 'succ' && !item.data) errors.push(`${where}.status is "succ" but no data is returned`);
  if (item.status === 'rjct' && !item.status_reason_code) errors.push(`${where}.status is "rjct" but no status_reason_code is given`);
  if (item.status === 'rjct' && item.data && recordsOf(item.data.reg_records).length) {
    errors.push(`${where}.status is "rjct" but records are returned`);
  }
  const count = recordsOf(item.data?.reg_records).length;
  const p = item.pagination;
  if (p && Number.isInteger(p.page_size) && count > p.page_size) {
    errors.push(`${where} returns ${count} records, more than pagination.page_size ${p.page_size}`);
  }
  if (p && Number.isInteger(p.total_count) && Number.isInteger(p.page_size) && Number.isInteger(p.page_number)
      && count > Math.max(0, p.total_count - (p.page_number - 1) * p.page_size)) {
    errors.push(`${where} returns ${count} records, more than pagination.total_count ${p.total_count} allows on page ${p.page_number}`);
  }
  const requested = requestItem?.search_criteria?.pagination;
  if (requested && p) {
    if (Number.isInteger(requested.page_size) && p.page_size > requested.page_size) {
      errors.push(`${where}.pagination.page_size ${p.page_size} exceeds the requested page_size ${requested.page_size}`);
    }
    const askedPage = requested.page_number ?? 1;
    if (p.page_number !== askedPage) errors.push(`${where}.pagination.page_number ${p.page_number} is not the requested page ${askedPage}`);
  }
  // The records returned must be of the record type that was asked for.
  const asked = requestedRecordType(requestItem);
  const returned = item.data?.reg_record_type;
  if (asked && count && returned !== undefined && recordTypeOf(returned) !== asked) {
    errors.push(`${where}.data.reg_record_type "${returned}" is not the requested record type ${asked}`);
  }
  if (asked && asked !== 'Member' && count && returned === undefined) {
    errors.push(`${where}.data.reg_record_type is missing: ${asked} records were requested and untyped reg_records are Member records`);
  }
  return errors;
}

// Correlates a SearchResponse with the SearchRequest it answers.
export function checkSearchCorrelation(requestMessage, responseMessage, where = 'message') {
  const errors = [];
  if (!requestMessage || !responseMessage) return errors;
  if (responseMessage.transaction_id !== requestMessage.transaction_id) {
    errors.push(`${where}.transaction_id "${responseMessage.transaction_id}" does not echo the request transaction_id "${requestMessage.transaction_id}"`);
  }
  const requestItems = requestMessage.search_request || [];
  const byRef = Object.fromEntries(requestItems.map((r) => [r.reference_id, r]));
  const items = responseMessage.search_response || [];
  items.forEach((item, i) => {
    if (!(item.reference_id in byRef)) errors.push(`${where}.search_response[${i}].reference_id "${item.reference_id}" was not part of the request`);
    errors.push(...checkSearchResponseItem(item, `${where}.search_response[${i}]`, byRef[item.reference_id]));
  });
  const answered = new Set(items.map((i) => i.reference_id));
  for (const r of requestItems) {
    if (!answered.has(r.reference_id)) errors.push(`${where}: request reference_id "${r.reference_id}" has no search_response`);
  }
  return errors;
}

function checkFrequency(frequency, where) {
  if (!frequency?.start_time || !frequency?.end_time) return [];
  const start = Date.parse(frequency.start_time);
  const end = Date.parse(frequency.end_time);
  return !Number.isNaN(start) && !Number.isNaN(end) && end < start
    ? [`${where}.end_time ${frequency.end_time} is before start_time ${frequency.start_time}`]
    : [];
}

const echoesTransaction = (request, message) => (request?.message && message.transaction_id !== request.message.transaction_id
  ? [`message.transaction_id "${message.transaction_id}" does not echo the request transaction_id "${request.message.transaction_id}"`]
  : []);

// Rules on the items of an EnrolledResponse.
function checkEnrolmentItems(items, where) {
  const errors = [];
  (Array.isArray(items) ? items : []).forEach((item, i) => {
    if (item?.status === 'rjct' && !item.status_reason_message) errors.push(`${where}[${i}].status is "rjct" but no status_reason_message explains it`);
    // PRS.EMP.05: the answer is the enrolment status, never the member's records.
    const disclosed = Object.keys(item || {}).filter((k) => ['data', 'reg_records', 'member', 'members', 'group', 'demographic_info', 'employment_info'].includes(k));
    if (disclosed.length) errors.push(`${where}[${i}] discloses ${disclosed.join(', ')}: the enrolment answer must be the enrolment status only`);
  });
  return errors;
}

// The kinds of message whose header is a callback header.
const CALLBACK_KINDS = [
  'on-search', 'on-subscribe', 'on-unsubscribe', 'notify', 'txn-on-status',
  'sync-search-response', 'sync-txn-status-response', 'check-enrollment-response',
];

// Full validation of a received message of the given kind. Returns a list of errors.
export function validateMessage(kind, body, request) {
  const errors = validateSchema(kind, body).errors.map((e) => `[schema] ${e}`);
  if (!body || typeof body !== 'object') return errors;

  const { header, message } = body;
  const encrypted = header?.is_msg_encrypted === true;

  if (CALLBACK_KINDS.includes(kind)) {
    errors.push(...checkCallbackHeaderRules(header).map((e) => `[rule] ${e}`));
    if (header?.status === 'succ' && !message) errors.push('[rule] header.status is "succ" but no message is returned');
  }
  if (encrypted || !message) return errors;
  const rule = (list) => errors.push(...list.map((e) => `[rule] ${e}`));

  // Search results
  if (['on-search', 'sync-search-response'].includes(kind)) {
    if (request?.message) rule(checkSearchCorrelation(request.message, message));
    else (message.search_response || []).forEach((item, i) => rule(checkSearchResponseItem(item, `message.search_response[${i}]`)));
  }
  if (['txn-on-status', 'sync-txn-status-response'].includes(kind)) {
    const r = message.txnstatus_response;
    rule(echoesTransaction(request, message));
    const askedType = request?.message?.txnstatus_request?.txn_type;
    if (askedType && r?.txn_type && r.txn_type !== askedType) {
      rule([`txnstatus_response.txn_type "${r.txn_type}" does not match the requested txn_type "${askedType}"`]);
    }
    (r?.txn_status?.search_response || []).forEach((item, i) => rule(checkSearchResponseItem(item, `message.txnstatus_response.txn_status.search_response[${i}]`)));
    rule(checkEnrolmentItems(r?.txn_status?.enrolled_response, 'message.txnstatus_response.txn_status.enrolled_response'));
  }
  if (['on-subscribe', 'on-unsubscribe', 'check-enrollment-response'].includes(kind)) {
    rule(echoesTransaction(request, message));
  }
  if (kind === 'on-subscribe') {
    (message.subscribe_response || []).forEach((item, i) => {
      if (item.status === 'rjct' && !item.status_reason_code) rule([`message.subscribe_response[${i}].status is "rjct" but no status_reason_code is given`]);
      if (item.status === 'succ' && !(item.subscriptions || []).length) rule([`message.subscribe_response[${i}].status is "succ" but no subscription code is returned`]);
      (item.subscriptions || []).forEach((s, j) => rule(checkFrequency(s.frequency, `message.subscribe_response[${i}].subscriptions[${j}].frequency`)));
    });
  }
  if (kind === 'subscribe') {
    (message.subscribe_request || []).forEach((item, i) => rule(checkFrequency(item?.subscribe_criteria?.frequency, `message.subscribe_request[${i}].subscribe_criteria.frequency`)));
  }
  if (kind === 'on-unsubscribe' && message.status === 'rjct' && !message.status_reason_code) {
    rule(['message.status is "rjct" but no status_reason_code is given']);
  }
  if (kind === 'check-enrollment-response') {
    rule(checkEnrolmentItems(message.enrolled_response, 'message.enrolled_response'));
  }

  // ESS data, wherever it appears.
  for (const { type, record, where } of extractRecords(message)) {
    errors.push(...checkRecordRules(type, record, where).map((e) => `[data] ${e}`));
  }
  return errors;
}

export function formatErrors(errors) {
  return errors.map((e) => `  - ${e}`).join('\n');
}
