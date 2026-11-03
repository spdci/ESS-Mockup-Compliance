// ESS records covering every data profile of the standard, for the three record types:
//   ESSPerson (ESS_Person, a core Person), Member (ESS Member) and Group (ESS Group).
// They form one consistent employment support registry: households (Group) list their
// members (Member), each member's demographic_info is a person (ESSPerson), and members
// carry their employment situation (employment_status, employment_info,
// unemployment_reason) and, for persons with disability, is_disabled and disability_info.
// Profiles range from a record carrying only an identifier up to one carrying every
// optional attribute; coded attributes are sent as codes, labels or JSON integers.
//
// They are used by the tests (payloads sent to the ESS and SP endpoints, reference records
// for the data rules) and by mock/generate-mocks.mjs (records served by the mock ESS), so the
// mock and the tests always agree on the data.

const context = {
  spdci: 'https://schema.spdci.org/extensions/ess/v1/data',
  spdcicore: 'https://schema.spdci.org/core/v1/data',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  owl: 'http://www.w3.org/2002/07/owl#',
};

const id = (identifier_type, identifier_value) => ({ '@type': 'Identifier', identifier_type, identifier_value });
const ref = (value) => ({ '@type': 'Member', member_identifier: [id('UIN', value)] });

// ---------------------------------------------------------------------------
// ESSPerson (demographic information)
// ---------------------------------------------------------------------------
const alice = {
  '@context': context,
  '@id': 'https://example.org/ess_person/100000001',
  '@type': 'spdci:ESS_Person',
  identifier: [id('UIN', '100000001'), id('BRN', 'BRN1985000101')],
  name: { '@type': 'Name', surname: 'Smith', given_name: 'Alice', second_name: 'Mary', maiden_name: 'Jones', prefix: 'Ms.', suffix: 'PhD' },
  sex: 'female',
  birth_date: '1985-05-20T00:00:00Z',
  address: [{
    '@type': 'Address',
    address_line_1: '123 Main St',
    address_line_2: 'Apartment 4',
    locality: 'Anytown',
    sub_region_code: 'SR01',
    region_code: 'R1',
    postal_code: '12345',
    country_code: 'TH',
    geo_location: {
      '@type': 'GeoLocation',
      plus_code: {
        global_code: '7P52GQ8P+2V',
        geometry: {
          bounds: {
            northeast: { '@type': 'GeoCoordinates', latitude: 13.7570, longitude: 100.5025 },
            southwest: { '@type': 'GeoCoordinates', latitude: 13.7555, longitude: 100.5010 },
          },
          location: { '@type': 'GeoCoordinates', latitude: 13.7563, longitude: 100.5018 },
        },
      },
    },
  }],
  phone_number: ['+66891234567'],
  email: ['alice.smith@example.org'],
  registration_date: '2022-01-10T08:00:00Z',
  last_updated: '2025-06-15T10:00:00Z',
};

// Several identifiers (including a medical record number), phones, e-mails and addresses.
const bob = {
  '@type': 'spdci:ESS_Person',
  identifier: [id('UIN', '100000002'), id('MRN', 'MRN1982000202')],
  name: { surname: 'Smith', given_name: 'Bob', prefix: 'Mr.' },
  sex: 'male',
  birth_date: '1982-03-15',
  address: [
    { address_line_1: '123 Main St', locality: 'Anytown', postal_code: '12345', country_code: 'TH' },
    { address_line1: '5 Rue de Rivoli', address_line2: 'Bat. B', locality: 'Paris', postal_code: '75001', country_code: 'FRA' },
  ],
  phone_number: ['+66891234568', '+33612345678'],
  email: ['bob.smith@example.org', 'b.smith@example.net'],
  registration_date: '2022-01-10',
};

const charlie = {
  identifier: [id('UIN', '100000003'), id('BRN', 'BRN2010000303')],
  name: { surname: 'Smith', given_name: 'Charlie' },
  sex: 'male',
  birth_date: '2010-07-05',
  registration_date: '2022-01-10',
};

// A child known only by a birth registration number.
const daisy = {
  identifier: [id('BRN', 'BRN2014000004')],
  name: { surname: 'Smith', given_name: 'Daisy' },
  sex: 'female',
  birth_date: '2014-09-22',
};

const lindiwe = {
  identifier: [id('UIN', '200000001')],
  name: { surname: 'Nkosi', given_name: 'Lindiwe' },
  sex: 'female',
  birth_date: '1970-05-05',
  phone_number: ['+27821234567'],
  address: { address_line_1: '45 Vilakazi Street', locality: 'Soweto', region_code: 'GT', country_code: 'ZA' },
  registration_date: '2019-03-01',
  last_updated: '2024-01-01',
};

// Person with disability.
const thabo = {
  identifier: [id('UIN', '200000002')],
  name: { surname: 'Nkosi', given_name: 'Thabo' },
  sex: 'male',
  birth_date: '1998-02-11',
  phone_number: ['+27827654321'],
  registration_date: '2019-03-01',
};

// Deceased (death registration number).
const sipho = {
  identifier: [id('UIN', '200000003'), id('DRN', 'DRN2024000123')],
  name: { surname: 'Nkosi', given_name: 'Sipho' },
  sex: 'male',
  birth_date: '1940-02-11',
  death_date: '2024-11-02T23:40:00Z',
  registration_date: '2019-03-01',
  last_updated: '2024-11-05',
};

// The Doe household of the ESS process flow 3 example, written per the data standard.
const john = { identifier: [id('UIN', '1234567890')], name: { given_name: 'John', surname: 'Doe' }, sex: 'male', birth_date: '1990-04-15', email: ['john.doe@example.com'], phone_number: ['+66891234560'] };
const jane = { identifier: [id('UIN', '1234567891')], name: { given_name: 'Jane', surname: 'Doe' }, sex: 'female', birth_date: '1992-07-20' };
const mark = { identifier: [id('UIN', '1234567892')], name: { given_name: 'Mark', surname: 'Doe' }, sex: 'male', birth_date: '2000-03-10' };
const lisa = { identifier: [id('UIN', '1234567893')], name: { given_name: 'Lisa', surname: 'Doe' }, sex: 'female', birth_date: '1985-09-05' };

// The job seeker of process flows 1 and 4 (person_identifier ABC451123).
const bobJohnson = {
  '@type': 'ESS_Person',
  identifier: [id('UIN', 'ABC451123')],
  name: { '@type': 'Name', surname: 'Johnson', given_name: 'Bob' },
  birth_date: '1992-03-15',
  sex: 'male',
  email: ['bob.johnson@example.com'],
  phone_number: ['+66892345678'],
};

const minimalPerson = { identifier: [id('UIN', '900000001')] };

export const persons = {
  full: alice,
  multi: bob,
  student: charlie,
  child: daisy,
  seasonal: lindiwe,
  disabled: thabo,
  deceased: sipho,
  jobseeker: bobJohnson,
  minimal: minimalPerson,
};

// ---------------------------------------------------------------------------
// Members (ESS Member: core Member + employment_info, unemployment_reason)
// ---------------------------------------------------------------------------
const aliceMember = {
  '@context': context,
  '@id': 'https://example.org/ess_member/M100000001',
  '@type': 'spdci:Member',
  member_identifier: [id('UIN', 'M100000001')],
  demographic_info: alice,
  related_person: [
    { '@type': 'RelatedPerson', relationship_type: 'SPS', related_member: ref('M100000002') },
    { '@type': 'RelatedPerson', relationship_type: 'CHILD', related_member: { identifier: [id('UIN', '100000003')], name: { given_name: 'Charlie', surname: 'Smith' }, birth_date: '2010-07-05' } },
  ],
  is_disabled: false,
  marital_status: 'M',
  employment_status: '1',
  occupation: '2',
  income_level: '2',
  language_code: ['eng', 'tha'],
  education_level: '6',
  employment_info: [
    { '@type': 'Employment_Info', employer: 'Anytown Learning Centre', job_title: 'Tutor', start_date: '2008-09-01', end_date: '2012-06-30', employment_type: '2' },
    { '@type': 'Employment_Info', employer: 'Anytown Primary School', job_title: 'Teacher', start_date: '2012-09-01', employment_type: '1' },
  ],
  additional_attributes: [{ name: 'job_search_registered', value: false }],
  registration_date: '2022-01-10T08:00:00Z',
  last_updated: '2025-06-15T10:00:00Z',
};

// Long-term unemployed after redundancy (process flow 2 profile).
const bobMember = {
  member_identifier: [id('UIN', 'M100000002')],
  demographic_info: bob,
  related_person: [{ relationship_type: 'SPS', related_member: ref('M100000001') }],
  is_disabled: 0,
  marital_status: 'M',
  employment_status: '6',
  unemployment_reason: '1',
  occupation: '8',
  education_level: '3',
  employment_info: [{ employer: 'Anytown Steel Works', job_title: 'Machine operator', start_date: '2005-04-01', end_date: '2024-12-31', employment_type: '1' }],
  registration_date: '2022-01-10',
  last_updated: '2025-02-01',
};

const charlieMember = {
  member_identifier: [id('UIN', 'M100000003')],
  demographic_info: charlie,
  related_person: [{ relationship_type: 'MTH', related_member: ref('M100000001') }],
  marital_status: 'S',
  employment_status: 6,
  unemployment_reason: 5,
  education_level: 2,
  registration_date: '2022-01-10',
};

const daisyMember = {
  member_identifier: [id('UIN', 'M100000004')],
  demographic_info: daisy,
  education_level: '1',
};

// Seasonal worker on a fixed contract ending later this year (codes as labels).
const lindiweMember = {
  member_identifier: [id('UIN', 'M200000001')],
  demographic_info: lindiwe,
  marital_status: 'Widow',
  employment_status: 'Employee',
  occupation: 'Skilled agricultural, forestry and fishery worker',
  education_level: 'Primary education',
  employment_info: {
    employer: 'Highveld Farms', job_title: 'Harvest worker', start_date: '2026-03-01', end_date: '2026-12-31', employment_type: 'Seasonal',
  },
  registration_date: '2019-03-01',
  last_updated: '2026-03-02',
};

// Person with disability, not employed because of it.
const thaboMember = {
  member_identifier: [id('UIN', 'M200000002')],
  demographic_info: thabo,
  is_disabled: true,
  disability_info: [
    { '@type': 'DisabilityInfo', disability_limitation_type: ['MOB_SS'], functional_severity: '4' },
    { '@type': 'DisabilityInfo', disability_limitation_type: 'HEAR_SS', functional_severity: '2' },
  ],
  marital_status: 'S',
  employment_status: '6',
  unemployment_reason: '4',
  occupation: '4',
  education_level: '4',
  language_code: ['eng', 'zul'],
  employment_info: [{ employer: 'Soweto Call Centre', job_title: 'Call agent', start_date: '2018-01-15', end_date: '2023-08-31', employment_type: '3' }],
  registration_date: '2019-03-01',
  last_updated: '2025-09-01',
};

const siphoMember = {
  member_identifier: [id('UIN', 'M200000003')],
  demographic_info: sipho,
  marital_status: 'W',
  employment_status: '6',
  unemployment_reason: '6',
  employment_info: [{ employer: 'Gauteng Railways', job_title: 'Conductor', start_date: '1965-01-01', end_date: '2005-02-11', employment_type: '1' }],
  registration_date: '2019-03-01',
  last_updated: '2024-11-05',
};

const johnMember = { '@type': 'spdci:Member', member_identifier: [id('UIN', 'M300000001')], demographic_info: john, employment_status: 'not employed', unemployment_reason: 'A job of limited duration has ended', registration_date: '2026-01-15' };
const janeMember = { '@type': 'spdci:Member', member_identifier: [id('UIN', 'M300000002')], demographic_info: jane, employment_status: 'not employed', unemployment_reason: 'personal or family responsibilities', registration_date: '2026-01-15' };
const markMember = { '@type': 'spdci:Member', member_identifier: [id('UIN', 'M300000003')], demographic_info: mark, employment_status: 'not employed', unemployment_reason: 'Education or training', registration_date: '2026-01-16' };
// Person with disability, attributes sent as labels and integer flag.
const lisaMember = {
  '@type': 'spdci:Member',
  member_identifier: [id('UIN', 'M300000004')],
  demographic_info: lisa,
  is_disabled: 1,
  disability_info: [{ functional_type: ['VIS_SS'], functional_severity: 'A lot of difficulty' }, { disability_limitation_type: 'Communication', functional_severity: 'some difficulty' }],
  employment_status: 'not employed',
  unemployment_reason: 'Own illness or disability',
  registration_date: '2026-01-15',
};

const bobJohnsonMember = {
  '@context': { spdci: 'https://schema.spdci.org/extensions/ess/v1/', common: 'https://schema.spdci.org/common/v1/' },
  '@id': 'https://example.org/member/123456789',
  '@type': 'spdci:Member',
  member_identifier: [id('UIN', 'M400000001')],
  demographic_info: bobJohnson,
  employment_status: 'not employed',
  unemployment_reason: '2',
  employment_info: [{ employer: 'Bangkok Logistics', job_title: 'Warehouse clerk', start_date: '2019-05-01', end_date: '2025-04-30', employment_type: 'Fixed-term' }],
  registration_date: '2026-01-15T08:00:00Z',
  last_updated: '2026-02-15T10:00:00Z',
};

const minimalMember = { member_identifier: [id('UIN', 'M900000001')] };

export const members = {
  full: aliceMember,
  unemployed: bobMember,
  student: charlieMember,
  child: daisyMember,
  seasonal: lindiweMember,
  disabled: thaboMember,
  deceased: siphoMember,
  'disabled by label': lisaMember,
  jobseeker: bobJohnsonMember,
  head: johnMember,
  minimal: minimalMember,
};

// ---------------------------------------------------------------------------
// Groups (households)
// ---------------------------------------------------------------------------
export const groups = {
  full: {
    '@context': context,
    '@id': 'https://example.org/ess_group/GRP1001',
    '@type': 'spdci:Group',
    group_identifier: [id('UIN', 'GRP1001')],
    group_type: '2',
    geographical_location: {
      '@type': 'Place',
      name: 'Anytown',
      address_line: '123 Main St, Anytown',
      geo: { latitude: 13.7563, longitude: 100.5018 },
      contained_in_place: { name: 'Bangkok' },
    },
    address: { address_line_1: '123 Main St', locality: 'Anytown', postal_code: '12345', country_code: 'TH' },
    place_address: 0,
    poverty_score: 3.5,
    poverty_score_type: 'PMT',
    group_head_info: aliceMember,
    group_size: 4,
    member_list: [aliceMember, bobMember, charlieMember, daisyMember],
    registration_date: '2022-01-10',
    last_updated: '2025-06-15',
    additional_attributes: [{ name: 'dwelling_type', value: 'urban' }],
  },
  // Household with a person with disability and a deceased member.
  disability: {
    group_identifier: [id('UIN', 'GRP2001')],
    group_type: 'Household',
    geographical_location: { name: 'Soweto', geo: { latitude: '-26.2485', longitude: '27.8540' } },
    place_address: true,
    poverty_score: 2.1,
    poverty_score_type: 'PMT',
    group_head_info: lindiweMember,
    group_size: 3,
    member_list: [lindiweMember, thaboMember, siphoMember],
    registration_date: '2019-03-01',
    last_updated: '2026-03-02',
  },
  // Process flow 3: household of working-age members who are not employed.
  large: {
    '@type': 'spdci:Group',
    group_identifier: [id('UIN', 'GRP3001')],
    group_type: 'household',
    geographical_location: { name: 'Bangkok' },
    group_head_info: johnMember,
    group_size: 5,
    member_list: [johnMember, janeMember, markMember, lisaMember],
    poverty_score: 4.2,
    registration_date: '2026-01-15T08:00:00Z',
    last_updated: '2026-02-15T10:00:00Z',
    additional_attributes: [{ notes: 'Eligible for SP support' }],
  },
  single: {
    group_identifier: [id('UIN', 'GRP4001')],
    group_type: 1,
    group_head_info: bobJohnsonMember,
    group_size: 1,
    member_list: [bobJohnsonMember],
    poverty_score: 6.8,
  },
  minimal: { group_identifier: [id('UIN', 'GRP9001')] },
};

// Building blocks checked on their own by the offline rules.
export const employmentInfos = {
  full: { '@type': 'Employment_Info', employer: 'Anytown Primary School', job_title: 'Teacher', start_date: '2012-09-01', end_date: '2030-08-31', employment_type: '1' },
  ended: { employer: 'Anytown Steel Works', job_title: 'Machine operator', start_date: '2005-04-01', end_date: '2024-12-31', employment_type: 'Permanent' },
  minimal: {},
};

export const disabilityInfos = {
  full: { '@type': 'DisabilityInfo', disability_limitation_type: ['MOB_SS', 'SC_SS'], functional_severity: '3' },
  label: { functional_type: 'Vision', functional_severity: 'Cannot do at all' },
  minimal: {},
};

export const records = {
  ESSPerson: persons,
  Member: members,
  Group: groups,
  EmploymentInfo: employmentInfos,
  DisabilityInfo: disabilityInfos,
};

// ---------------------------------------------------------------------------
// Published examples
// ---------------------------------------------------------------------------
// extensions/ess/Member.yaml example (its additional_attributes, invalid JSON in the spec,
// written as a one-key object).
export const specMemberExample = {
  '@context': {
    spdci: 'https://schema.spdci.org/core/v1/data',
    rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
    xsd: 'http://www.w3.org/2001/XMLSchema#',
    owl: 'http://www.w3.org/2002/07/owl#',
    common: 'https://schema.spdci.org/common/v1/',
  },
  '@id': 'https://example.org/ess_person/847951632',
  '@type': 'spdci:member',
  member_identifier: [{ '@type': 'Identifier', identifier_type: 'UIN', identifier_value: '42343545654' }],
  demographic_info: {
    '@type': 'ESSPerson',
    identifier: [{ '@type': 'Identifier', identifier_type: 'NationalID', identifier_value: '9876543210' }],
    name: { '@type': 'Name', surname: 'Smith', given_name: 'Alice', prefix: 'Ms.', suffix: '' },
    sex: 'female',
    birth_date: '1985-05-20',
  },
  related_person: [
    { '@type': 'RelatedPerson', relationship_type: 'spouse', related_member: { '@type': 'Member', '@id': 'https://example.org/member/123456789', member_identifier: 'M123456789' } },
    { '@type': 'RelatedPerson', relationship_type: 'child', related_member: { '@type': 'Member', '@id': 'https://example.org/member/987654322', 'spdci:member_identifier': 'M987654322' } },
  ],
  is_disabled: false,
  marital_status: 'married',
  employment_status: 'employed',
  occupation: 'teacher',
  income_level: 'middle',
  language_code: ['en', 'es'],
  education_level: 'bachelor',
  additional_attributes: [{ extra_work: 'volunteer' }],
  registration_date: '2022-01-10T08:00:00Z',
  last_updated: '2023-06-15T10:00:00Z',
};
export const specPersonExample = specMemberExample.demographic_info;

// Process flow 1 (processflow1res.json): the member notified to the ESS.
export const processFlow1Member = {
  '@context': { spdci: 'https://schema.spdci.org/extensions/ess/v1/', common: 'https://schema.spdci.org/common/v1/' },
  '@id': 'https://example.org/member/123456789',
  '@type': 'spdci:Member',
  member_identifier: [{ '@type': 'Identifier', identifier_type: 'UIN', identifier_value: '9876543210' }],
  demographic_info: {
    '@type': 'ESS_Person',
    name: { '@type': 'Name', surname: 'Johnson', given_name: 'Bob', prefix: '', suffix: '' },
    birth_date: '1992-03-15',
    sex: 'male',
    email: ['bob.johnson@example.com'],
    phone_number: ['+66892345678'],
  },
  employment_status: 'not employed',
  registration_date: '2026-01-15T08:00:00Z',
  last_updated: '2026-02-15T10:00:00Z',
};

// Process flow 2 (processflow2res.json): the long-term unemployed member notified to the SP-MIS.
export const processFlow2Member = {
  '@context': { spdci: 'https://schema.spdci.org/extensions/ess/v1/', common: 'https://schema.spdci.org/common/v1/' },
  '@id': 'https://example.org/member/987654321',
  '@type': 'spdci:Member',
  member_identifier: [{ '@type': 'Identifier', identifier_type: 'UIN', identifier_value: '42343545654' }],
  demographic_info: {
    '@type': 'PES_Person',
    name: { '@type': 'Name', surname: 'Smith', given_name: 'Alice', prefix: 'Ms.', suffix: '' },
    birth_date: '1985-05-20',
    sex: 'female',
    email: ['alice.smith@example.com'],
    phone_number: ['+66891234567'],
  },
  employment_status: 'not employed',
  employment_info: { employer: 'Previous Employer Ltd', start_date: '2019-01-01', end_date: '2024-01-15', employment_type: 'Seasonal', job_title: 'farmer' },
  registration_date: '2022-01-10T08:00:00Z',
  last_updated: '2026-02-15T10:00:00Z',
};

// Process flow 3 (processflow3res.json): the first group returned.
export const processFlow3Group = {
  '@context': { spdci: 'https://schema.spdci.org/core/v1/data', common: 'https://schema.spdci.org/common/v1/' },
  '@id': 'https://example.org/group/001',
  '@type': 'spdci:Group',
  group_identifier: { '@type': 'Identifier', identifier_type: 'UIN', identifier_value: 'GRP-001' },
  group_type: 'household',
  geographical_location: 'Bangkok',
  group_head_info: {
    '@type': 'spdci:Member',
    '@id': 'https://example.org/member/111',
    member_identifier: [{ '@type': 'Identifier', identifier_type: 'UIN', identifier_value: '1234567890' }],
    demographic_info: { name: { given_name: 'John', surname: 'Doe' }, sex: 'male', birth_date: '1990-04-15', email: ['john.doe@example.com'], phone_number: ['+66891234567'] },
    employment_status: 'not employed',
  },
  group_size: 4,
  member_list: [
    { '@type': 'spdci:Member', '@id': 'https://example.org/member/111', demographic_info: { name: { given_name: 'John', surname: 'Doe' }, sex: 'male', birth_date: '1990-04-15', email: ['john.doe@example.com'], phone_number: ['+66891234567'] }, employment_status: 'not employed' },
    { '@type': 'spdci:Member', '@id': 'https://example.org/member/112', demographic_info: { name: { given_name: 'Jane', surname: 'Doe' }, sex: 'female', birth_date: '1992-07-20' }, employment_status: 'not employed' },
    { '@type': 'spdci:Member', '@id': 'https://example.org/member/113', demographic_info: { name: { given_name: 'Mark', surname: 'Doe' }, sex: 'male', birth_date: '2000-03-10' }, employment_status: 'not employed' },
    { '@type': 'spdci:Member', '@id': 'https://example.org/member/114', demographic_info: { name: { given_name: 'Lisa', surname: 'Doe' }, sex: 'female', birth_date: '1985-09-05' }, employment_status: 'not employed' },
  ],
  registration_date: '2026-01-15T08:00:00Z',
  last_updated: '2026-02-15T10:00:00Z',
  additional_attributes: [{ notes: 'Eligible for SP support' }],
};

export const publishedExamples = {
  Member: { 'spec example': specMemberExample, 'process flow 1': processFlow1Member, 'process flow 2': processFlow2Member },
  ESSPerson: { 'spec example': specPersonExample },
  Group: { 'process flow 3': processFlow3Group },
};

// ---------------------------------------------------------------------------
// Lookups, as an ESS would resolve them
// ---------------------------------------------------------------------------
const identifiersOfPerson = (p) => (Array.isArray(p?.identifier) ? p.identifier : []);
const identifiersOfMember = (m) => [
  ...(Array.isArray(m?.member_identifier) ? m.member_identifier : []),
  ...identifiersOfPerson(m?.demographic_info),
];
const identifiersOfGroup = (g) => [
  ...(Array.isArray(g?.group_identifier) ? g.group_identifier : []),
  ...[g?.group_head_info, ...(g?.member_list || [])].flatMap(identifiersOfMember),
];
export const identifiersOf = {
  ESSPerson: identifiersOfPerson,
  Member: identifiersOfMember,
  Group: identifiersOfGroup,
};

const searchable = ['ESSPerson', 'Member', 'Group'];

// "<record type>|<identifier value>" -> records. A person is found by its identifiers, a member
// by its member identifier or its person identifiers, a group by its group identifier or the
// identifiers of any of its members.
export function recordsByIdentifier() {
  const index = {};
  for (const type of searchable) {
    for (const record of Object.values(records[type])) {
      const values = new Set(identifiersOf[type](record).map((i) => i.identifier_value));
      for (const value of values) (index[`${type}|${value}`] ??= []).push(record);
    }
  }
  return index;
}

const notEmployed = [bobMember, charlieMember, thaboMember, siphoMember, johnMember, janeMember, markMember, lisaMember, bobJohnsonMember];
const workingAge = (m) => m.demographic_info.birth_date >= '1962-02-16' && m.demographic_info.birth_date <= '2008-02-16';

// Records matching the predicate searches, by "<record type>|<attribute of the first expression>".
export const predicateResults = {
  'Member|employment_status': notEmployed,
  'Member|is_disabled': [thaboMember, lisaMember],
  'Member|unemployment_reason': [thaboMember, lisaMember],
  'ESSPerson|sex': [alice, daisy, lisa, jane],
  'Group|poverty_score': [groups.full, groups.disability, groups.large],
  'Group|group_size': [groups.full, groups.large],
};

// Records matching the expression searches (process flows 1-3), by record type.
export const expressionResults = {
  Member: notEmployed.filter((m) => !m.demographic_info.death_date && workingAge(m)),
  ESSPerson: [alice, daisy, lisa, jane],
  Group: [groups.full, groups.disability, groups.large, groups.single],
};

// PRS.EMP.05: enrolment status of each member (and household) in the ESS programme.
// Identifiers not listed have no enrolment.
const enrolments = [
  [aliceMember, 'Active'],
  [bobMember, 'Awaiting Renewal'],
  [charlieMember, 'Exited'],
  [lindiweMember, 'Reinstated'],
  [thaboMember, 'Active'],
  [siphoMember, 'Deceased'],
  [johnMember, 'Inactive'],
  [lisaMember, 'Suspended'],
  [bobJohnsonMember, 'Active'],
];
const groupEnrolments = [[groups.full, 'Active'], [groups.disability, 'Active'], [groups.large, 'Inactive']];

// "<identifier value>" -> enrolment status label.
export function enrolmentIndex() {
  const index = {};
  for (const [member, status] of enrolments) {
    for (const i of identifiersOfMember(member)) index[i.identifier_value] = status;
  }
  for (const [group, status] of groupEnrolments) {
    for (const i of group.group_identifier) index[i.identifier_value] = status;
  }
  return index;
}
