// JSON Schemas (draft-07) for the DCI Employment Support System (ESS) API v1.0.0.
//
// Sources:
//  - api-standards/src/registry/ess_api_v1.0.0.yaml and the schemas it references
//    (registry/ess/*, registry/schema/*, extensions/ess/*, common/schema/*)
//  - schemas/extensions/ess/v1/data (Member, ESSPerson, EmploymentInfo, Group) and
//    schemas/extensions/ess/v1/code (EmploymentType, UnemploymentReason, EnrolmentStatus)
//  - schemas/core/v1/data (Person, Member, Group, Identifier, Name, Address, Place,
//    GeoLocation, RelatedPerson, DisabilityInfo) and schemas/core/v1/code
//  - the ESS process flow examples (release/sample-jsons/assets/example_files/ess)
//
// Every ESS data attribute is optional. The schemas therefore do not require them, but
// whenever an attribute IS present its type, format, code list and structure are enforced.
// Registry extensions (extra attributes) are allowed.
//
// Coded attributes accept the code ("6") or the label published in the code directory
// ("Not employed", also in lower case: "not employed"), because the ESS process flow
// examples exchange labels. Numeric codes are also accepted as JSON integers.
//
// The same definitions are embedded in the Mockoon mocks (valid_json_schema rules), so
// they deliberately use only draft-07 keywords and ajv-formats formats (no custom ones).

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------
const DATE = '\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])';
const TIME = '([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d(\\.\\d+)?)?';
const TZ = '(Z|[+-]([01]\\d|2[0-3]):?[0-5]\\d)';
// ISO 8601 calendar date, optionally with time and timezone (e.g. "1985-05-20T00:00:00Z").
export const ISO_DATE_PATTERN = `^${DATE}(T${TIME}${TZ}?)?$`;
// E.164 phone number (core Person.phone_number).
export const E164_PATTERN = '^\\+[1-9]\\d{1,14}$';
// ISO 639-3 language code, as required by the spec's `locale`.
export const LOCALE_PATTERN = '^[a-z]{3}$';
// Member.language_code: ISO 639 code (LanguageCodeEnum uses "eng", the spec example ["en", "es"]).
export const LANGUAGE_CODE_PATTERN = '^[a-z]{2,3}$';
// ISO 3166-1 alpha-2 / alpha-3 country code.
export const COUNTRY_CODE_PATTERN = '^[A-Z]{2,3}$';
// Open Location Code (plus code), full or padded.
export const PLUS_CODE_PATTERN = '^[23456789CFGHJMPQRVWX0]{2,8}\\+[23456789CFGHJMPQRVWX]{0,3}$';
// Decimal number sent as a string (schema:GeoCoordinates accepts Number or Text).
export const DECIMAL_STRING_PATTERN = '^-?\\d+(\\.\\d+)?$';

// ESS record types (RegistryRecordType), bare or namespaced ("spdci:Member"). The person
// is "ESS_Person" in ESSPerson.jsonld, "ESSPerson" in the spec Member example and
// "PES_Person" in process flow 2.
const NS = '^([A-Za-z0-9_.-]+:)*';
export const PERSON_RECORD_TYPE_PATTERN = `${NS}(ESSPerson|ESS_Person|PES_Person|Person)$`;
export const MEMBER_RECORD_TYPE_PATTERN = `${NS}Member$`;
export const GROUP_RECORD_TYPE_PATTERN = `${NS}Group$`;
export const RECORD_TYPE_PATTERN = `${NS}(ESSPerson|ESS_Person|PES_Person|Person|Member|Group)$`;
// ESS registry events (registry/ess/RegistryEventType.yaml), bare or namespaced.
export const ESS_EVENT_PATTERN = `${NS}(enrolment|enrolment_status_change)$`;

// ---------------------------------------------------------------------------
// Code lists
// ---------------------------------------------------------------------------
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => String(from + i));

// Published labels of the coded attributes (code directory rdfs:label), code -> label.
export const labels = {
  maritalStatus: { S: 'Never Married', M: 'Married', W: 'Widow', A: 'Annulled', D: 'Divorced', L: 'Legally Separated', U: 'Unmarried' },
  employmentStatus: { // core EmploymentStatusEnum (ICSE-18)
    1: 'Employee', 2: 'Employer', 3: 'Own-account workers', 4: 'Members of producers’ cooperative',
    5: 'Contributing family worker', 6: 'Not employed', 7: 'Unknown',
  },
  occupation: { // core OccupationEnum (ISCO-08 major groups)
    0: 'Armed forces occupation', 1: 'Manager', 2: 'Professional', 3: 'Technician and associate professional',
    4: 'Clerical support worker', 5: 'Service and sales worker', 6: 'Skilled agricultural, forestry and fishery worker',
    7: 'Craft and related trades worker', 8: 'Plant and machine operator, and assembler', 9: 'Elementary occupation',
  },
  educationLevel: { // core EducationCode (ISCED 2011)
    0: 'Early childhood education', 1: 'Primary education', 2: 'Lower secondary education',
    3: 'Upper secondary education', 4: 'Post-secondary non-tertiary education', 5: 'Short-cycle tertiary education',
    6: "Bachelor's or equivalent", 7: "Master's or equivalent", 8: 'Doctorate or equivalent',
  },
  assistanceUnit: { 1: 'Member (Person/Individual)', 2: 'Household', 3: 'Family' }, // core AssistanceUnit
  functionalType: { // core FunctionalLimitationType (Washington Group Short Set)
    VIS_SS: 'Vision', HEAR_SS: 'Hearing', MOB_SS: 'Mobility', COG_SS: 'COGNITION (REMEMBERING)',
    SC_SS: 'Self care', COM_SS: 'Communication',
  },
  functionalSeverity: { 1: 'No difficulty', 2: 'Some difficulty', 3: 'A lot of difficulty', 4: 'Cannot do at all' },
  // ----- ESS code directory (extensions/ess/v1/code) -----
  employmentType: { 1: 'Permanent', 2: 'Fixed-term', 3: 'Casual', 4: 'Seasonal', 5: 'Paid apprentices, trainees and interns' },
  unemploymentReason: {
    1: 'Dismissed or made redundant', 2: 'A job of limited duration has ended', 3: 'Personal or family responsibilities',
    4: 'Own illness or disability', 5: 'Education or training', 6: 'Retirement', 7: 'Military or community service',
    8: 'Other reasons',
  },
  enrolmentStatus: {
    1: 'Active', 2: 'Deceased', 3: 'Exited', 4: 'Suspended', 5: 'Inactive', 6: 'Reinstated', 7: 'Awaiting Renewal',
  },
};

const labelList = (name) => Object.values(labels[name]);

export const codes = {
  // ----- data: core code directory -----
  identifierType: ['UIN', 'BRN', 'MRN', 'DRN'], // IdentifierTypeEnum
  sex: ['male', 'female', 'other', 'unknown'], // SexCategoryEnum
  maritalStatus: Object.keys(labels.maritalStatus), // MaritalStatusEnum
  maritalStatusLabel: labelList('maritalStatus'),
  employmentStatus: range(1, 7), // EmploymentStatusEnum
  employmentStatusLabel: labelList('employmentStatus'),
  occupation: range(0, 9), // OccupationEnum
  occupationLabel: labelList('occupation'),
  educationLevel: range(0, 8), // EducationCode
  educationLevelLabel: labelList('educationLevel'),
  assistanceUnit: range(1, 3), // AssistanceUnit: 1 Member, 2 Household, 3 Family
  assistanceUnitLabel: labelList('assistanceUnit'),
  functionalType: Object.keys(labels.functionalType), // FunctionalLimitationType
  functionalTypeLabel: labelList('functionalType'),
  functionalSeverity: range(1, 4), // FunctionalSeverityEnum
  functionalSeverityLabel: labelList('functionalSeverity'),
  relationshipType: [ // core RelationshipTypeEnum (HL7 v3 RoleCode personal relationships)
    'SELF', 'PRIMSPOUS', 'FAMMEMB',
    'CHILD', 'CHLDADOPT', 'DAUADOPT', 'SONADOPT', 'CHLDFOST', 'DAUFOST', 'SONFOST', 'DAUC', 'DAU',
    'STPDAU', 'NCHILD', 'SON', 'SONC', 'STPSON', 'STPCHLD',
    'EXT', 'AUNT', 'MAUNT', 'PAUNT', 'COUSN', 'MCOUSN', 'PCOUSN',
    'GGRPRN', 'GGRFTH', 'MGGRFTH', 'PGGRFTH', 'GGRMTH', 'MGGRMTH', 'PGGRMTH', 'MGGRPRN', 'PGGRPRN',
    'GRNDCHILD', 'GRNDDAU', 'GRNDSON', 'GRPRN', 'GRFTH', 'MGRFTH', 'PGRFTH', 'GRMTH', 'PGRMTH', 'MGRMTH',
    'PGRPRN', 'MGRPRN',
    'INLAW', 'CHLDINLAW', 'DAUINLAW', 'SONINLAW', 'PRNINLAW', 'FTHINLAW', 'MTHINLAW', 'SIBINLAW',
    'BROINLAW', 'SISINLAW',
    'NIENEPH', 'NEPHEW', 'NIECE', 'UNCLE', 'PUNCLE', 'MUNCLE',
    'PRN', 'ADOPTP', 'ADOPTF', 'ADOPTM', 'FTH', 'FTHFOST', 'NFTH', 'NFTHF', 'STPFTH',
    'MTH', 'GESTM', 'MTHFOST', 'NMTH', 'NMTHF', 'STPMTH', 'NPRN', 'PRNFOST', 'STPPRN',
    'SIB', 'BRO', 'HBRO', 'NBRO', 'TWINBRO', 'FTWINBRO', 'ITWINBRO', 'STPBRO', 'HSIB', 'HSIS', 'NSIB',
    'NSIS', 'TWINSIS', 'FTWINSIS', 'ITWINSIS', 'TWIN', 'FTWIN', 'ITWIN', 'SIS', 'STPSIS', 'STPSIB',
    'SIGOTHR', 'DOMPART', 'FMRSPS', 'SPS', 'HUSB', 'WIFE',
  ],

  // ----- data: ESS code directory -----
  employmentType: range(1, 5), // EmploymentType
  employmentTypeLabel: labelList('employmentType'),
  unemploymentReason: range(1, 8), // UnemploymentReason
  unemploymentReasonLabel: labelList('unemploymentReason'),
  enrolmentStatus: range(1, 7), // EnrolmentStatus
  enrolmentStatusLabel: labelList('enrolmentStatus'),

  // ----- API -----
  essEvent: ['enrolment', 'enrolment_status_change'],
  recordType: ['ESSPerson', 'Member', 'Group'],
  responseEntity: ['Group', 'Member'], // common/ResponseEntity.yaml
  requestStatus: ['rcvd', 'pdng', 'succ', 'rjct'],
  ackStatus: ['ACK', 'NACK', 'ERR'],
  searchQueryType: ['idtype-value', 'expression', 'predicate'], // ess/QueryType.yaml (search)
  queryType: ['idtype-value', 'expression', 'predicate', 'graphql'], // common/QueryType.yaml (subscribe, check-enrollment)
  operator: ['gt', 'lt', 'eq', 'ge', 'le', 'in'],
  condition: ['and', 'or', 'not'],
  sortOrder: ['asc', 'desc'],
  txnType: ['search', 'subscribe', 'receipt'], // TxnStatusRequest
  txnResponseType: ['search', 'subscribe', 'receipt', 'enrolled'], // TxnStatusResponse
  attributeType: ['transaction_id', 'reference_id_list', 'correlation_id'],
  subscriptionStatus: ['subscribe', 'unsubscribe'],
  searchStatusReasonCode: [
    'rjct.reference_id.invalid', 'rjct.reference_id.duplicate', 'rjct.timestamp.invalid',
    'rjct.search_criteria.invalid', 'rjct.filter.invalid', 'rjct.sort.invalid',
    'rjct.pagination.invalid', 'rjct.search.too_many_records_found',
  ],
  subscribeStatusReasonCode: [
    'rjct.reference_id.invalid', 'rjct.reference_id.duplicate', 'rjct.timestamp.invalid',
    'rjct.notify_types.invalid', 'rjct.notify_details.invalid', 'rjct.person_id.invalid',
    'rjct.event.already_subscribed',
  ],
  unsubscribeStatusReasonCode: [
    'rjct.reference_id.invalid', 'rjct.reference_id.duplicate', 'rjct.timestamp.invalid',
    'rjct.subscription_code.invalid', 'rjct.requester.invalid', 'rjct.event.already_unsubscribed',
  ],
  headerStatusReasonCode: [
    'rjct.version.invalid', 'rjct.message_id.duplicate', 'rjct.message_ts.invalid',
    'rjct.action.invalid', 'rjct.action.not_supported', 'rjct.total_count.invalid',
    'rjct.total_count.limit_exceeded', 'rjct.errors.too_many',
  ],
  errorCode: [
    'err.request.bad', 'err.request.unauthorized', 'err.request.forbidden', 'err.request.not_found',
    'err.request.timeout', 'err.version.not_supported', 'err.request.too_many_requests',
    'err.sender_id.invalid', 'err.sender_uri.invalid', 'err.receiver_id.invalid',
    'err.signature.missing', 'err.signature.invalid', 'err.encryption.invalid',
    'err.service.unavailable',
  ],
};
codes.enrolledStatus = codes.enrolmentStatusLabel; // EnrolledResponse.enrolled_status

// The code a coded value stands for ("Not employed", "not employed", 6 and "6" -> "6"), or
// undefined when it is not a value of that code list.
export function codeOf(list, value) {
  if (value === undefined || value === null) return undefined;
  const text = String(value);
  if (Object.hasOwn(labels[list], text)) return text;
  return Object.keys(labels[list]).find((k) => labels[list][k].toLowerCase() === text.toLowerCase());
}

const ref = (name) => ({ $ref: `#/definitions/${name}` });
const str = { type: 'string' };
const nonEmptyStr = { type: 'string', minLength: 1 };
const jsonLd = {
  '@context': { type: ['string', 'object'] },
  '@id': str,
  '@type': str,
};
// A code from a code list, as the code or its published label (as published or in lower
// case). Numeric code lists ("1", "2", ...) also accept the JSON integer.
const coded = (list) => {
  const values = Object.keys(labels[list]);
  const names = Object.values(labels[list]);
  const numeric = values.every((v) => /^\d+$/.test(v)) ? values.map(Number) : [];
  return { enum: [...new Set([...values, ...numeric, ...names, ...names.map((n) => n.toLowerCase())])] };
};
// Booleans (core xsd:boolean); the core describes these flags as true (1) / false (0).
const flag = { enum: [true, false, 0, 1] };
// Cardinality 0...*: a non-empty list.
const listOf = (item) => ({ type: 'array', minItems: 1, items: item });
const oneOrList = (item) => ({ anyOf: [item, listOf(item)] });

// core Person attributes (ESS_Person is a core Person; also accepted on RelatedPerson.related_member).
const personProperties = {
  ...jsonLd,
  identifier: ref('IdentifierList'),
  name: ref('Name'),
  sex: { type: 'string', enum: codes.sex },
  birth_date: ref('IsoDate'),
  death_date: ref('IsoDate'),
  address: ref('AddressOrList'),
  phone_number: { type: 'array', items: { type: 'string', pattern: E164_PATTERN } },
  email: { type: 'array', items: { type: 'string', format: 'email' } },
  registration_date: ref('IsoDate'),
  last_updated: ref('IsoDate'),
};

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------
export const definitions = {
  // ----- common types -----
  DateTime: { type: 'string', format: 'date-time' },
  IsoDate: { type: 'string', pattern: ISO_DATE_PATTERN },
  TransactionId: { type: 'string', minLength: 1, maxLength: 99 },
  CorrelationId: { type: 'string', minLength: 1, maxLength: 99, pattern: '^[a-zA-Z0-9-]+$' },
  ReferenceId: nonEmptyStr,
  SubscriptionCode: { type: 'string', minLength: 1, maxLength: 99 },
  Locale: { type: 'string', pattern: LOCALE_PATTERN },
  RequestStatus: { type: 'string', enum: codes.requestStatus },
  StatusReasonMessage: { type: 'string', maxLength: 999 },
  Version: { type: 'string', minLength: 1 },
  RegType: nonEmptyStr,
  RegRecordType: { type: 'string', pattern: RECORD_TYPE_PATTERN },
  RegEventType: { type: 'string', pattern: ESS_EVENT_PATTERN },
  ResponseEntity: { type: 'string', enum: codes.responseEntity },
  AttributeValue: { type: ['string', 'number', 'boolean', 'object'] },
  Pagination: {
    type: 'object',
    required: ['page_size', 'page_number', 'total_count'],
    properties: {
      page_size: { type: 'integer', minimum: 1 },
      page_number: { type: 'integer', minimum: 1 },
      total_count: { type: 'integer', minimum: 0 },
    },
  },
  RequestPagination: {
    type: 'object',
    required: ['page_size'],
    properties: {
      page_size: { type: 'integer', minimum: 1 },
      page_number: { type: 'integer', minimum: 1 },
    },
  },
  Purpose: {
    type: 'object',
    properties: {
      text: str,
      code: str,
      ref_uri: { type: 'string', format: 'uri' },
    },
  },
  Consent: {
    type: 'object',
    properties: { ...jsonLd, ts: ref('DateTime'), purpose: ref('Purpose') },
  },

  // ----- message envelope -----
  MsgSignature: nonEmptyStr,
  Meta: { type: 'object' },
  MsgHeader: {
    type: 'object',
    required: ['message_id', 'message_ts', 'action', 'sender_id', 'total_count'],
    properties: {
      version: ref('Version'),
      message_id: nonEmptyStr,
      message_ts: ref('DateTime'),
      action: nonEmptyStr,
      sender_id: nonEmptyStr,
      sender_uri: { type: 'string', format: 'uri' },
      receiver_id: nonEmptyStr,
      total_count: { type: 'integer', minimum: 0 },
      is_msg_encrypted: { type: 'boolean' },
      meta: ref('Meta'),
    },
  },
  MsgCallbackHeader: {
    type: 'object',
    required: ['message_id', 'message_ts', 'action', 'status'],
    properties: {
      version: ref('Version'),
      message_id: nonEmptyStr,
      message_ts: ref('DateTime'),
      action: nonEmptyStr,
      status: ref('RequestStatus'),
      status_reason_code: { type: 'string', enum: codes.headerStatusReasonCode },
      status_reason_message: ref('StatusReasonMessage'),
      total_count: { type: 'integer', minimum: 0 },
      completed_count: { type: 'integer', minimum: 0 },
      sender_id: nonEmptyStr,
      receiver_id: nonEmptyStr,
      is_msg_encrypted: { type: 'boolean' },
      meta: ref('Meta'),
    },
  },
  EncryptedMessage: {
    type: 'object',
    required: ['header', 'ciphertext', 'encrypted_key', 'tag', 'iv'],
    properties: {
      header: {
        type: 'object',
        required: ['alg', 'enc', 'kid'],
        properties: { alg: nonEmptyStr, enc: nonEmptyStr, kid: nonEmptyStr },
      },
      ciphertext: nonEmptyStr,
      encrypted_key: nonEmptyStr,
      tag: nonEmptyStr,
      iv: nonEmptyStr,
    },
  },
  Error: {
    type: 'object',
    properties: {
      code: { type: 'string', enum: codes.errorCode },
      message: { type: 'string', maxLength: 999 },
    },
  },

  // ----- data building blocks (core) -----
  Identifier: {
    type: 'object',
    required: ['identifier_type', 'identifier_value'],
    properties: {
      ...jsonLd,
      identifier_type: { type: 'string', enum: codes.identifierType },
      identifier_value: nonEmptyStr,
    },
  },
  IdentifierList: listOf(ref('Identifier')),
  Name: {
    type: 'object',
    anyOf: [{ required: ['surname'] }, { required: ['given_name'] }],
    properties: {
      '@type': str,
      surname: str,
      given_name: str,
      second_name: str,
      maiden_name: str,
      prefix: str,
      suffix: str,
    },
  },
  Coordinate: {
    anyOf: [{ type: 'number' }, { type: 'string', pattern: DECIMAL_STRING_PATTERN }],
  },
  GeoCoordinates: {
    type: 'object',
    required: ['latitude', 'longitude'],
    properties: {
      '@id': str,
      '@type': str,
      latitude: { allOf: [ref('Coordinate'), { minimum: -90, maximum: 90 }] },
      longitude: { allOf: [ref('Coordinate'), { minimum: -180, maximum: 180 }] },
    },
  },
  GeoLocation: {
    type: 'object',
    properties: {
      '@id': str,
      '@type': str,
      latitude: { allOf: [ref('Coordinate'), { minimum: -90, maximum: 90 }] },
      longitude: { allOf: [ref('Coordinate'), { minimum: -180, maximum: 180 }] },
      altitude: ref('Coordinate'),
      plus_code: {
        type: 'object',
        properties: {
          global_code: { type: 'string', pattern: PLUS_CODE_PATTERN },
          geometry: {
            type: 'object',
            properties: {
              '@id': str,
              '@type': str,
              bounds: {
                type: 'object',
                properties: {
                  '@id': str,
                  '@type': str,
                  northeast: ref('GeoCoordinates'),
                  southwest: ref('GeoCoordinates'),
                },
              },
              location: ref('GeoCoordinates'),
            },
          },
        },
      },
    },
  },
  Address: {
    type: 'object',
    properties: {
      ...jsonLd,
      // core Address.jsonld uses address_line_1/2; other DCI examples address_line1/2.
      address_line_1: str,
      address_line_2: str,
      address_line1: str,
      address_line2: str,
      locality: str,
      sub_region_code: str,
      region_code: str,
      postal_code: str,
      country_code: { type: 'string', pattern: COUNTRY_CODE_PATTERN },
      geo_location: ref('GeoLocation'),
    },
  },
  // Person.address is 0...* (a list), Group.address one address: both forms are accepted.
  AddressOrList: oneOrList(ref('Address')),
  Place: {
    type: 'object',
    properties: {
      ...jsonLd,
      name: str,
      address_line: str,
      geo: ref('GeoLocation'),
      contained_in_place: { anyOf: [{ type: 'string' }, ref('Place')] },
      contains_place: { type: 'array', items: ref('Place') },
    },
  },
  AttributeNameValue: {
    type: 'object',
    required: ['name', 'value'],
    properties: { name: nonEmptyStr, value: ref('AttributeValue') },
  },
  // "A list of key-value pairs": DCI name/value objects, or one-key objects ({ "notes": "..." },
  // as in the ESS process flow 3 example).
  AdditionalAttribute: {
    anyOf: [
      ref('AttributeNameValue'),
      { type: 'object', minProperties: 1, maxProperties: 1, not: { required: ['name'] } },
    ],
  },
  AdditionalAttributes: { type: 'array', items: ref('AdditionalAttribute') },

  // ----- ESS_Person (ESSPerson.jsonld, subclass of core Person) -----
  ESSPerson: { type: 'object', properties: personProperties },

  // ----- DisabilityInfo (core DisabilityInfo.jsonld) -----
  FunctionalType: coded('functionalType'),
  DisabilityInfo: {
    type: 'object',
    properties: {
      '@type': str,
      // core DisabilityInfo.jsonld: disability_limitation_type; DCI data standards: functional_type.
      disability_limitation_type: oneOrList(ref('FunctionalType')),
      functional_type: oneOrList(ref('FunctionalType')),
      functional_severity: coded('functionalSeverity'),
    },
  },

  // ----- Employment_Info (EmploymentInfo.jsonld) -----
  EmploymentInfo: {
    type: 'object',
    properties: {
      ...jsonLd,
      start_date: ref('IsoDate'),
      end_date: ref('IsoDate'),
      job_title: nonEmptyStr,
      employer: nonEmptyStr,
      employment_type: coded('employmentType'),
    },
  },

  // ----- RelatedPerson -----
  // related_member is a Person in core RelatedPerson.jsonld and a Member reference in the
  // spec example: the attributes of both are accepted.
  RelatedMember: {
    type: 'object',
    properties: {
      ...personProperties,
      member_identifier: ref('IdentifierList'),
      demographic_info: ref('ESSPerson'),
    },
  },
  RelatedPerson: {
    type: 'object',
    properties: {
      '@type': str,
      relationship_type: { type: 'string', enum: codes.relationshipType },
      related_member: ref('RelatedMember'),
    },
  },

  // ----- ESS Member (extensions/ess Member.jsonld, subclass of core Member) -----
  Member: {
    type: 'object',
    properties: {
      ...jsonLd,
      member_identifier: ref('IdentifierList'),
      // ESS Member.jsonld: demographic_info is an ESS_Person.
      demographic_info: ref('ESSPerson'),
      related_person: { type: 'array', items: ref('RelatedPerson') },
      is_disabled: flag,
      disability_info: { type: 'array', items: ref('DisabilityInfo') },
      marital_status: coded('maritalStatus'),
      employment_status: coded('employmentStatus'),
      occupation: coded('occupation'),
      // IncomeLevelEnum is country-defined: any non-empty code.
      income_level: { anyOf: [nonEmptyStr, { type: 'integer' }] },
      language_code: { type: 'array', items: { type: 'string', pattern: LANGUAGE_CODE_PATTERN } },
      education_level: coded('educationLevel'),
      // ESS extension: employment history (a list; process flow 2 sends a single object).
      employment_info: { anyOf: [ref('EmploymentInfo'), { type: 'array', items: ref('EmploymentInfo') }] },
      unemployment_reason: coded('unemploymentReason'),
      additional_attributes: ref('AdditionalAttributes'),
      registration_date: ref('IsoDate'),
      last_updated: ref('IsoDate'),
    },
  },

  // ----- ESS Group (extensions/ess Group.jsonld, subclass of core Group) -----
  Group: {
    type: 'object',
    properties: {
      ...jsonLd,
      group_identifier: ref('IdentifierList'),
      group_type: coded('assistanceUnit'),
      geographical_location: ref('Place'),
      address: ref('AddressOrList'),
      place_address: flag,
      poverty_score: { type: 'number' },
      poverty_score_type: nonEmptyStr,
      group_head_info: ref('Member'),
      group_size: { type: 'integer', minimum: 1 },
      member_list: { type: 'array', items: ref('Member') },
      registration_date: ref('IsoDate'),
      last_updated: ref('IsoDate'),
      additional_attributes: ref('AdditionalAttributes'),
    },
  },

  // reg_records are validated against the data object named by reg_record_type. Without a
  // reg_record_type they are Member records, as declared by the spec's SearchResponse.
  RecordsByType: {
    allOf: [
      {
        if: {
          anyOf: [
            { not: { required: ['reg_record_type'] } },
            { properties: { reg_record_type: { type: 'string', pattern: MEMBER_RECORD_TYPE_PATTERN } }, required: ['reg_record_type'] },
          ],
        },
        then: { properties: { reg_records: ref('MemberRecords') } },
      },
      {
        if: { properties: { reg_record_type: { type: 'string', pattern: PERSON_RECORD_TYPE_PATTERN } }, required: ['reg_record_type'] },
        then: { properties: { reg_records: ref('ESSPersonRecords') } },
      },
      {
        if: { properties: { reg_record_type: { type: 'string', pattern: GROUP_RECORD_TYPE_PATTERN } }, required: ['reg_record_type'] },
        then: { properties: { reg_records: ref('GroupRecords') } },
      },
    ],
  },
  // Search responses carry an array; notify declares a single object (RegistryRecord.yaml),
  // which is how the process flow examples send it.
  ESSPersonRecords: { type: 'array', items: ref('ESSPerson') },
  MemberRecords: { type: 'array', items: ref('Member') },
  GroupRecords: { type: 'array', items: ref('Group') },
  SearchData: {
    type: 'object',
    required: ['reg_records'],
    properties: {
      version: ref('Version'),
      reg_type: ref('RegType'),
      reg_record_type: ref('RegRecordType'),
      reg_records: { type: 'array' },
    },
    allOf: [ref('RecordsByType')],
  },
  NotifyData: {
    type: 'object',
    required: ['reg_record_type', 'reg_records'],
    properties: {
      version: ref('Version'),
      reg_type: ref('RegType'),
      reg_event_type: ref('RegEventType'),
      reg_record_type: ref('RegRecordType'),
      reg_records: { type: ['array', 'object'] },
    },
    allOf: [
      {
        if: { properties: { reg_record_type: { type: 'string', pattern: MEMBER_RECORD_TYPE_PATTERN } }, required: ['reg_record_type'] },
        then: { properties: { reg_records: { anyOf: [ref('MemberRecords'), ref('Member')] } } },
      },
      {
        if: { properties: { reg_record_type: { type: 'string', pattern: PERSON_RECORD_TYPE_PATTERN } }, required: ['reg_record_type'] },
        then: { properties: { reg_records: { anyOf: [ref('ESSPersonRecords'), ref('ESSPerson')] } } },
      },
      {
        if: { properties: { reg_record_type: { type: 'string', pattern: GROUP_RECORD_TYPE_PATTERN } }, required: ['reg_record_type'] },
        then: { properties: { reg_records: { anyOf: [ref('GroupRecords'), ref('Group')] } } },
      },
    ],
  },
  // ReceiptInformation (extensions/ess/ReceiptInformation.yaml): beneficiaries are ESS Members.
  ReceiptInformation: {
    type: 'object',
    properties: {
      beneficiaries: listOf(ref('Member')),
    },
  },

  // ----- queries -----
  Expression: {
    type: 'object',
    required: ['attribute_name', 'operator', 'attribute_value'],
    properties: {
      attribute_name: nonEmptyStr,
      operator: { type: 'string', enum: codes.operator },
      attribute_value: ref('AttributeValue'),
    },
  },
  PredicateQuery: {
    type: 'array',
    minItems: 1,
    items: {
      type: 'object',
      required: ['expression1'],
      properties: {
        seq_num: { type: 'number' },
        expression1: ref('Expression'),
        condition: { type: 'string', enum: codes.condition },
        expression2: ref('Expression'),
      },
    },
  },
  IdTypeValueQuery: {
    type: 'object',
    required: ['type', 'value'],
    properties: {
      type: nonEmptyStr,
      value: ref('AttributeValue'),
    },
  },
  ExpressionQuery: {
    type: 'object',
    required: ['type', 'value'],
    properties: {
      type: nonEmptyStr,
      value: { type: 'object' },
    },
  },
  Query: {
    anyOf: [ref('IdTypeValueQuery'), ref('ExpressionQuery'), ref('PredicateQuery')],
  },
  SortItem: {
    type: 'object',
    required: ['attribute_name'],
    properties: {
      attribute_name: nonEmptyStr,
      sort_order: { type: 'string', enum: codes.sortOrder },
    },
  },
  // query must be consistent with query_type.
  SearchCriteria: {
    type: 'object',
    required: ['query_type', 'query'],
    properties: {
      version: ref('Version'),
      reg_type: ref('RegType'),
      reg_record_type: ref('RegRecordType'),
      query_type: { type: 'string', enum: codes.searchQueryType },
      response_entity: ref('ResponseEntity'),
      query: ref('Query'),
      sort: { type: 'array', items: ref('SortItem') },
      pagination: ref('RequestPagination'),
      consent: ref('Consent'),
      authorize: ref('Consent'),
    },
    allOf: [
      {
        if: { properties: { query_type: { const: 'idtype-value' } }, required: ['query_type'] },
        then: { properties: { query: ref('IdTypeValueQuery') } },
      },
      {
        if: { properties: { query_type: { const: 'predicate' } }, required: ['query_type'] },
        then: { properties: { query: ref('PredicateQuery') } },
      },
      {
        if: { properties: { query_type: { const: 'expression' } }, required: ['query_type'] },
        then: { properties: { query: ref('ExpressionQuery') } },
      },
    ],
  },
  Frequency: {
    type: 'object',
    required: ['start_time', 'end_time', 'frequency'],
    properties: {
      start_time: ref('DateTime'),
      end_time: ref('DateTime'),
      frequency: nonEmptyStr,
    },
  },
  SubscribeCriteria: {
    type: 'object',
    required: ['reg_event_type', 'filter', 'notify_record_type'],
    properties: {
      version: ref('Version'),
      reg_type: ref('RegType'),
      reg_event_type: ref('RegEventType'),
      frequency: ref('Frequency'),
      filter_type: { type: 'string', enum: codes.queryType },
      filter: ref('Query'),
      notify_record_type: ref('RegRecordType'),
      authorize: ref('Consent'),
    },
    allOf: [
      {
        if: { properties: { filter_type: { const: 'idtype-value' } }, required: ['filter_type'] },
        then: { properties: { filter: ref('IdTypeValueQuery') } },
      },
      {
        if: { properties: { filter_type: { const: 'predicate' } }, required: ['filter_type'] },
        then: { properties: { filter: ref('PredicateQuery') } },
      },
      {
        if: { properties: { filter_type: { enum: ['expression', 'graphql'] } }, required: ['filter_type'] },
        then: { properties: { filter: ref('ExpressionQuery') } },
      },
    ],
  },
  // EnrolledCriteria (extensions/ess/EnrolledCriteria.yaml): query is an object; its shape
  // follows query_type. The spec example is an expression keyed by attribute
  // ({ "person_identifier": { "eq": "ABC451123" } }).
  EnrolledCriteria: {
    type: 'object',
    required: ['query_type', 'query'],
    properties: {
      query_type: { type: 'string', enum: codes.queryType },
      response_entity: ref('ResponseEntity'),
      query: { type: 'object', minProperties: 1 },
    },
    allOf: [
      {
        if: { properties: { query_type: { const: 'idtype-value' } }, required: ['query_type'] },
        then: { properties: { query: ref('IdTypeValueQuery') } },
      },
      {
        if: { properties: { query_type: { const: 'predicate' } }, required: ['query_type'] },
        then: { properties: { query: ref('Expression') } },
      },
    ],
  },

  // ----- messages -----
  SearchRequest: {
    type: 'object',
    required: ['transaction_id', 'search_request'],
    properties: {
      transaction_id: ref('TransactionId'),
      search_request: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['reference_id', 'timestamp', 'search_criteria'],
          properties: {
            reference_id: ref('ReferenceId'),
            timestamp: ref('DateTime'),
            search_criteria: ref('SearchCriteria'),
            locale: ref('Locale'),
          },
        },
      },
    },
  },
  SearchResponseItem: {
    type: 'object',
    required: ['reference_id', 'timestamp', 'status'],
    properties: {
      reference_id: ref('ReferenceId'),
      timestamp: ref('DateTime'),
      status: ref('RequestStatus'),
      status_reason_code: { type: 'string', enum: codes.searchStatusReasonCode },
      status_reason_message: ref('StatusReasonMessage'),
      data: ref('SearchData'),
      pagination: ref('Pagination'),
      locale: ref('Locale'),
    },
  },
  SearchResponse: {
    type: 'object',
    required: ['transaction_id', 'correlation_id', 'search_response'],
    properties: {
      transaction_id: ref('TransactionId'),
      correlation_id: ref('CorrelationId'),
      search_response: { type: 'array', items: ref('SearchResponseItem') },
    },
  },
  SubscribeRequest: {
    type: 'object',
    required: ['transaction_id', 'subscribe_request'],
    properties: {
      transaction_id: ref('TransactionId'),
      subscribe_request: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['reference_id', 'timestamp', 'subscribe_criteria'],
          properties: {
            reference_id: ref('ReferenceId'),
            timestamp: ref('DateTime'),
            subscribe_criteria: ref('SubscribeCriteria'),
            locale: ref('Locale'),
          },
        },
      },
    },
  },
  Subscription: {
    type: 'object',
    required: ['code', 'status', 'timestamp'],
    properties: {
      version: ref('Version'),
      code: ref('SubscriptionCode'),
      status: { type: 'string', enum: codes.subscriptionStatus },
      timestamp: ref('DateTime'),
      reg_type: ref('RegType'),
      reg_event_type: ref('RegEventType'),
      frequency: ref('Frequency'),
      filter_type: { type: 'string', enum: codes.queryType },
      filter: ref('Query'),
      notify_record_type: ref('RegRecordType'),
      locale: ref('Locale'),
    },
  },
  SubscribeResponse: {
    type: 'object',
    required: ['transaction_id', 'correlation_id', 'subscribe_response'],
    properties: {
      transaction_id: ref('TransactionId'),
      correlation_id: ref('CorrelationId'),
      subscribe_response: {
        type: 'array',
        items: {
          type: 'object',
          required: ['reference_id', 'timestamp', 'status'],
          properties: {
            reference_id: ref('ReferenceId'),
            timestamp: ref('DateTime'),
            status: ref('RequestStatus'),
            status_reason_code: { type: 'string', enum: codes.subscribeStatusReasonCode },
            status_reason_message: ref('StatusReasonMessage'),
            subscriptions: { type: 'array', items: ref('Subscription') },
            locale: ref('Locale'),
          },
        },
      },
    },
  },
  UnSubscribeRequest: {
    type: 'object',
    required: ['transaction_id', 'timestamp', 'subscription_codes'],
    properties: {
      transaction_id: ref('TransactionId'),
      timestamp: ref('DateTime'),
      subscription_codes: { type: 'array', minItems: 1, items: ref('SubscriptionCode') },
    },
  },
  UnSubscribeResponse: {
    type: 'object',
    required: ['transaction_id', 'correlation_id', 'timestamp', 'status'],
    properties: {
      transaction_id: ref('TransactionId'),
      correlation_id: ref('CorrelationId'),
      timestamp: ref('DateTime'),
      status: ref('RequestStatus'),
      status_reason_code: { type: 'string', enum: codes.unsubscribeStatusReasonCode },
      status_reason_message: ref('StatusReasonMessage'),
      subscription_status: {
        type: 'array',
        items: {
          type: 'object',
          required: ['code', 'status'],
          properties: {
            code: ref('SubscriptionCode'),
            status: { type: 'string', enum: codes.subscriptionStatus },
          },
        },
      },
    },
  },
  NotifyEventRequest: {
    type: 'object',
    required: ['transaction_id', 'notify_event'],
    properties: {
      transaction_id: ref('TransactionId'),
      notify_event: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['reference_id', 'timestamp', 'data'],
          properties: {
            reference_id: ref('ReferenceId'),
            timestamp: ref('DateTime'),
            data: ref('NotifyData'),
            locale: ref('Locale'),
          },
        },
      },
    },
  },
  TxnStatusRequest: {
    type: 'object',
    required: ['transaction_id', 'txnstatus_request'],
    properties: {
      transaction_id: ref('TransactionId'),
      txnstatus_request: {
        type: 'object',
        required: ['reference_id', 'txn_type', 'attribute_type', 'attribute_value'],
        properties: {
          reference_id: ref('ReferenceId'),
          txn_type: { type: 'string', enum: codes.txnType },
          attribute_type: { type: 'string', enum: codes.attributeType },
          attribute_value: {
            anyOf: [
              ref('TransactionId'),
              { type: 'array', minItems: 1, items: ref('ReferenceId') },
            ],
          },
          locale: ref('Locale'),
        },
        // attribute_value must match the declared attribute_type.
        allOf: [
          {
            if: { properties: { attribute_type: { const: 'transaction_id' } }, required: ['attribute_type'] },
            then: { properties: { attribute_value: ref('TransactionId') } },
          },
          {
            if: { properties: { attribute_type: { const: 'correlation_id' } }, required: ['attribute_type'] },
            then: { properties: { attribute_value: ref('CorrelationId') } },
          },
          {
            if: { properties: { attribute_type: { const: 'reference_id_list' } }, required: ['attribute_type'] },
            then: { properties: { attribute_value: { type: 'array', minItems: 1, items: ref('ReferenceId') } } },
          },
        ],
      },
    },
  },
  ReceiptRequest: {
    type: 'object',
    required: ['transaction_id', 'receipt_information'],
    properties: {
      transaction_id: ref('TransactionId'),
      receipt_information: ref('ReceiptInformation'),
    },
  },
  // PRS.EMP.05: verify enrolment (registry/ess/EnrolledRequest.yaml, EnrolledResponse.yaml).
  EnrolledRequest: {
    type: 'object',
    required: ['transaction_id', 'enrolled_criteria'],
    properties: {
      transaction_id: ref('TransactionId'),
      enrolled_criteria: ref('EnrolledCriteria'),
    },
  },
  EnrolledResponse: {
    type: 'object',
    required: ['transaction_id', 'correlation_id', 'enrolled_response'],
    properties: {
      transaction_id: ref('TransactionId'),
      correlation_id: ref('CorrelationId'),
      enrolled_response: {
        type: 'array',
        items: {
          type: 'object',
          required: ['reference_id', 'timestamp', 'status', 'enrolled_status'],
          properties: {
            reference_id: ref('ReferenceId'),
            timestamp: ref('DateTime'),
            status: ref('RequestStatus'),
            status_reason_message: ref('StatusReasonMessage'),
            // The API lists Active, Deceased, Suspended, Inactive, Reinstated, Awaiting Renewal;
            // the ESS EnrolmentStatus code list adds Exited.
            enrolled_status: { type: 'string', enum: codes.enrolledStatus },
          },
        },
      },
    },
  },
  // The spec's txn_status is a SearchResponse or a ReceiptRequest; the suite also accepts the
  // SubscribeResponse / EnrolledResponse matching the other txn_type values.
  TxnStatusResponse: {
    type: 'object',
    required: ['transaction_id', 'correlation_id', 'txnstatus_response'],
    properties: {
      transaction_id: ref('TransactionId'),
      correlation_id: ref('CorrelationId'),
      txnstatus_response: {
        type: 'object',
        required: ['txn_type', 'txn_status'],
        properties: {
          txn_type: { type: 'string', enum: codes.txnResponseType },
          txn_status: {
            anyOf: [ref('SearchResponse'), ref('SubscribeResponse'), ref('ReceiptRequest'), ref('EnrolledResponse')],
          },
        },
        // txn_status must be the response type matching txn_type.
        allOf: [
          {
            if: { properties: { txn_type: { const: 'search' } }, required: ['txn_type'] },
            then: { properties: { txn_status: ref('SearchResponse') } },
          },
          {
            if: { properties: { txn_type: { const: 'subscribe' } }, required: ['txn_type'] },
            then: { properties: { txn_status: ref('SubscribeResponse') } },
          },
          {
            if: { properties: { txn_type: { const: 'receipt' } }, required: ['txn_type'] },
            then: { properties: { txn_status: ref('ReceiptRequest') } },
          },
          {
            if: { properties: { txn_type: { const: 'enrolled' } }, required: ['txn_type'] },
            then: { properties: { txn_status: ref('EnrolledResponse') } },
          },
        ],
      },
    },
  },

  // ----- synchronous HTTP responses -----
  AckResponse: {
    type: 'object',
    required: ['message'],
    properties: {
      message: {
        type: 'object',
        required: ['ack_status', 'timestamp', 'correlation_id'],
        properties: {
          ack_status: { type: 'string', enum: codes.ackStatus },
          timestamp: ref('DateTime'),
          error: ref('Error'),
          correlation_id: ref('CorrelationId'),
        },
        // An ERR acknowledgement must explain itself with an error code.
        if: { properties: { ack_status: { const: 'ERR' } }, required: ['ack_status'] },
        then: { required: ['error'], properties: { error: { required: ['code'] } } },
      },
    },
  },
  HttpErrorResponse: {
    type: 'object',
    required: ['errors'],
    properties: {
      errors: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['code'],
          properties: { code: nonEmptyStr, message: str },
        },
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Envelopes: { signature, header, message } per endpoint
// ---------------------------------------------------------------------------
const encryptedIf = {
  properties: {
    header: { properties: { is_msg_encrypted: { const: true } }, required: ['is_msg_encrypted'] },
  },
  required: ['header'],
};

function envelope({ headerDef, action, messageDef, messageRequired }) {
  return {
    type: 'object',
    required: messageRequired ? ['header', 'message'] : ['header'],
    properties: {
      signature: ref('MsgSignature'),
      header: {
        allOf: [ref(headerDef), { type: 'object', properties: action ? { action: { const: action } } : {} }],
      },
      message: { type: 'object' },
    },
    // message is the plain payload, or an EncryptedMessage when header.is_msg_encrypted is true.
    if: encryptedIf,
    then: { properties: { message: ref('EncryptedMessage') } },
    else: { properties: { message: ref(messageDef) } },
  };
}

// Header type, header action and whether message is required follow ess_api_v1.0.0.yaml.
// Unlike other DCI registries, ESS on-subscribe / on-unsubscribe carry a callback header.
export const envelopeDefinitions = {
  'search': envelope({ headerDef: 'MsgHeader', action: 'search', messageDef: 'SearchRequest', messageRequired: true }),
  'subscribe': envelope({ headerDef: 'MsgHeader', action: 'subscribe', messageDef: 'SubscribeRequest', messageRequired: true }),
  'unsubscribe': envelope({ headerDef: 'MsgHeader', action: 'unsubscribe', messageDef: 'UnSubscribeRequest', messageRequired: true }),
  'txn-status': envelope({ headerDef: 'MsgHeader', action: 'txn-status', messageDef: 'TxnStatusRequest', messageRequired: true }),
  'check-enrollment': envelope({ headerDef: 'MsgHeader', action: 'check-enrollment', messageDef: 'EnrolledRequest', messageRequired: true }),
  'on-search': envelope({ headerDef: 'MsgCallbackHeader', action: 'on-search', messageDef: 'SearchResponse', messageRequired: false }),
  'on-subscribe': envelope({ headerDef: 'MsgCallbackHeader', action: 'on-subscribe', messageDef: 'SubscribeResponse', messageRequired: true }),
  'on-unsubscribe': envelope({ headerDef: 'MsgCallbackHeader', action: 'on-unsubscribe', messageDef: 'UnSubscribeResponse', messageRequired: true }),
  'notify': envelope({ headerDef: 'MsgCallbackHeader', action: 'notify', messageDef: 'NotifyEventRequest', messageRequired: false }),
  'txn-on-status': envelope({ headerDef: 'MsgCallbackHeader', action: 'txn-on-status', messageDef: 'TxnStatusResponse', messageRequired: false }),
  'check-enrollment-response': envelope({ headerDef: 'MsgCallbackHeader', action: 'on-check-enrollment', messageDef: 'EnrolledResponse', messageRequired: false }),
};
envelopeDefinitions['sync-search-response'] = envelopeDefinitions['on-search'];
envelopeDefinitions['sync-txn-status-response'] = envelopeDefinitions['txn-on-status'];

// Top-level, self-contained schemas (every one embeds all definitions so it can be compiled
// on its own, which is what Mockoon's valid_json_schema rule needs).
const standalone = (root) => ({ ...root, definitions });

export const schemas = {
  ...Object.fromEntries(Object.entries(envelopeDefinitions).map(([k, v]) => [k, standalone(v)])),
  'ack': standalone(definitions.AckResponse),
  'http-error': standalone(definitions.HttpErrorResponse),
  'ESSPerson': standalone(definitions.ESSPerson),
  'Member': standalone(definitions.Member),
  'Group': standalone(definitions.Group),
  'EmploymentInfo': standalone(definitions.EmploymentInfo),
  'DisabilityInfo': standalone(definitions.DisabilityInfo),
};
