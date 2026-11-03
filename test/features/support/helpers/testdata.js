// Identifiers the suite queries, per record type. The defaults match the records served by
// the mock ESS (fixtures/records.js). To run against a real ESS, point TEST_DATA_FILE at a
// JSON file overriding any entry, e.g.
//   { "records": { "Member": { "full": { "identifier_type": "UIN", "identifier_value": "M-0042" } } },
//     "enrolments": { "Member": { "full": "Active" } } }

import { readFileSync } from 'node:fs';

const uin = (identifier_value) => ({ identifier_type: 'UIN', identifier_value });

const defaults = {
  records: {
    ESSPerson: {
      full: uin('100000001'),
      multi: { identifier_type: 'MRN', identifier_value: 'MRN1982000202' },
      student: uin('100000003'),
      child: { identifier_type: 'BRN', identifier_value: 'BRN2014000004' },
      seasonal: uin('200000001'),
      disabled: uin('200000002'),
      deceased: { identifier_type: 'DRN', identifier_value: 'DRN2024000123' },
      jobseeker: uin('ABC451123'),
      minimal: uin('900000001'),
      unknown: uin('999999999'),
      // The mock rejects this value with rjct.search.too_many_records_found.
      too_many: uin('TOOMANY000'),
    },
    Member: {
      full: uin('M100000001'),
      unemployed: uin('M100000002'),
      student: uin('M100000003'),
      child: uin('M100000004'),
      seasonal: uin('M200000001'),
      disabled: uin('M200000002'),
      deceased: uin('M200000003'),
      'disabled by label': uin('M300000004'),
      jobseeker: uin('M400000001'),
      head: uin('M300000001'),
      minimal: uin('M900000001'),
      // A member found through the identifier of its person (demographic_info.identifier).
      'by person identifier': uin('100000001'),
      unknown: uin('M999999999'),
      too_many: uin('TOOMANY000'),
    },
    Group: {
      full: uin('GRP1001'),
      disability: uin('GRP2001'),
      large: uin('GRP3001'),
      single: uin('GRP4001'),
      minimal: uin('GRP9001'),
      // Households found through the identifier of one of their members.
      'by member identifier': uin('M200000002'),
      'by person identifier': uin('1234567893'),
      'by birth registration': { identifier_type: 'BRN', identifier_value: 'BRN2014000004' },
      unknown: uin('GRP9999'),
      too_many: uin('TOOMANY000'),
    },
  },
  // PRS.EMP.05: expected enrolment status per record ("none" = not enrolled).
  enrolments: {
    ESSPerson: { full: 'Active', jobseeker: 'Active', disabled: 'Active', deceased: 'Deceased', child: 'none', unknown: 'none' },
    Member: {
      full: 'Active', unemployed: 'Awaiting Renewal', student: 'Exited', seasonal: 'Reinstated', disabled: 'Active',
      deceased: 'Deceased', head: 'Inactive', 'disabled by label': 'Suspended', jobseeker: 'Active', minimal: 'none', unknown: 'none',
    },
    Group: { full: 'Active', disability: 'Active', large: 'Inactive', minimal: 'none', unknown: 'none' },
  },
  regType: 'ns:org:RegistryType:ESS',
};

const overrides = process.env.TEST_DATA_FILE ? JSON.parse(readFileSync(process.env.TEST_DATA_FILE, 'utf8')) : {};
const mergeByType = (base, extra = {}) => Object.fromEntries(Object.entries(base).map(([type, set]) => [type, { ...set, ...(extra[type] || {}) }]));

export const testData = {
  ...defaults,
  ...overrides,
  records: mergeByType(defaults.records, overrides.records),
  enrolments: mergeByType(defaults.enrolments, overrides.enrolments),
};

export function testRecord(type, name) {
  const set = testData.records[type];
  if (!set) throw new Error(`Unknown record type "${type}". Known: ${Object.keys(testData.records).join(', ')}`);
  if (!set[name]) throw new Error(`Unknown test ${type} "${name}". Known: ${Object.keys(set).join(', ')}`);
  return set[name];
}

export function expectedEnrolment(type, name) {
  const status = testData.enrolments[type]?.[name];
  if (!status) throw new Error(`No expected enrolment for ${type} "${name}"`);
  return status;
}
