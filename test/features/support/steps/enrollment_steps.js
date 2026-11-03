// PRS.EMP.05 (compliance monitoring via status verification): /registry/sync/check-enrollment
// answers whether a person, member or household remains enrolled, with its enrolment status.

import './parameter_types.js';
import { Given, Then } from '@cucumber/cucumber';
import chai from 'chai';
import { enrolledMessage, enrolledByIdentifierMessage, newTransactionId } from '../helpers/payloads.js';
import { testRecord, expectedEnrolment } from '../helpers/testdata.js';
import { codes } from '../helpers/schemas.js';
import { useRequest, inspectedMessage } from './common_steps.js';

const { expect } = chai;

const names = (list) => list.split(',').map((n) => n.trim());
const enrolledItems = (world) => {
  const items = inspectedMessage(world)?.enrolled_response;
  expect(items, 'enrolled_response').to.be.an('array');
  return items;
};

Given('an enrolment check of the {string} {recordType}', function (name, type) {
  this.checked = [[type, name]];
  useRequest(this, enrolledMessage(type, [name]));
});

Given('an enrolment check of the {string} {recordType} by identifier', function (name, type) {
  this.checked = [[type, name]];
  useRequest(this, enrolledByIdentifierMessage(type, name));
});

// A batch of persons in one request ("in" operator).
Given('a batch enrolment check of the {recordType} records {string}', function (type, list) {
  this.checked = names(list).map((n) => [type, n]);
  useRequest(this, enrolledMessage(type, names(list)));
});

Given('the enrolment check asks for the {string} response entity', function (entity) {
  this.request.message.enrolled_criteria.response_entity = entity;
});

// The predicate form: { attribute_name, operator, attribute_value }.
Given('an enrolment check of the {string} {recordType} written as a predicate', function (name, type) {
  const { identifier_value } = testRecord(type, name);
  this.checked = [[type, name]];
  useRequest(this, {
    transaction_id: newTransactionId(),
    enrolled_criteria: {
      query_type: 'predicate',
      response_entity: type === 'Group' ? 'Group' : 'Member',
      query: { attribute_name: { ESSPerson: 'person_identifier', Member: 'member_identifier', Group: 'group_identifier' }[type], operator: 'eq', attribute_value: identifier_value },
    },
  });
});

// The exact request of the spec (EnrolledCriteria.yaml) and process flow 4.
Given('the enrolment check of the spec example', function () {
  this.checked = [['ESSPerson', 'jobseeker']];
  useRequest(this, {
    transaction_id: newTransactionId(),
    enrolled_criteria: { query_type: 'expression', response_entity: 'Member', query: { person_identifier: { eq: testRecord('ESSPerson', 'jobseeker').identifier_value } } },
  });
});

Then('the enrolment check should answer {int} item(s)', function (count) {
  expect(enrolledItems(this), 'enrolled_response items').to.have.lengthOf(count);
});

Then('every enrolment answer should have status {string}', function (status) {
  const items = enrolledItems(this);
  expect(items, 'enrolled_response').to.not.be.empty;
  items.forEach((item, i) => expect(item.status, `enrolled_response[${i}].status`).to.equal(status));
});

Then('the enrolled status should be {string}', function (expected) {
  const items = enrolledItems(this);
  expect(items, 'enrolled_response').to.not.be.empty;
  items.forEach((item, i) => expect(item.enrolled_status, `enrolled_response[${i}].enrolled_status`).to.equal(expected));
});

// Each checked record gets the enrolment status the test data expects; records without an
// enrolment ("none") are rejected with an explanation.
Then('every enrolment answer should report the expected enrolment status', function () {
  const items = enrolledItems(this);
  expect(items, 'enrolled_response items').to.have.lengthOf(this.checked.length);
  this.checked.forEach(([type, name], i) => {
    const expected = expectedEnrolment(type, name);
    const item = items[i];
    if (expected === 'none') {
      expect(item.status, `enrolled_response[${i}].status for the not enrolled ${type} "${name}"`).to.equal('rjct');
      expect(item.status_reason_message, `enrolled_response[${i}].status_reason_message`).to.be.a('string').and.not.empty;
    } else {
      expect(item.status, `enrolled_response[${i}].status for ${type} "${name}"`).to.equal('succ');
      expect(item.enrolled_status, `enrolled_response[${i}].enrolled_status for ${type} "${name}"`).to.equal(expected);
    }
  });
});

Then('every enrolled status should be a value of the EnrolmentStatus code list', function () {
  enrolledItems(this).forEach((item, i) => expect(codes.enrolledStatus, `enrolled_response[${i}].enrolled_status`).to.include(item.enrolled_status));
});

// Data minimisation: only the enrolment status comes back.
Then('the enrolment answer should disclose no member data', function () {
  const allowed = ['reference_id', 'timestamp', 'status', 'status_reason_message', 'enrolled_status'];
  enrolledItems(this).forEach((item, i) => {
    const extra = Object.keys(item).filter((k) => !allowed.includes(k));
    expect(extra, `enrolled_response[${i}] discloses more than the enrolment status`).to.be.empty;
  });
  const message = inspectedMessage(this);
  expect(Object.keys(message).filter((k) => !['transaction_id', 'correlation_id', 'enrolled_response'].includes(k)),
    'enrolment check response attributes beyond the spec').to.be.empty;
});
