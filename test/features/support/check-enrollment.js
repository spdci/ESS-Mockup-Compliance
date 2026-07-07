import chai from 'chai';
import pkg from 'pactum';
const { spec } = pkg;
import { Given, When, Then } from '@cucumber/cucumber';

import {
  localhost,
  checkEnrollmentEndpoint,
  acceptHeader,
  defaultExpectedResponseTime,
  checkEnrollmentRequest
} from './helpers/helpers.js';

let response;
let request;

const baseUrl = localhost + checkEnrollmentEndpoint ;

Given('SP system checks enrollment for person "ABC451123"', function () {
  request = spec();
});

When('A POST request to check enrollment is sent', async function () {
  response = await request
    .post(baseUrl)
    .withHeaders(acceptHeader.key, acceptHeader.value)
    .withJson(checkEnrollmentRequest);

  this.response = response;
});

Then('The check enrollment response should be received', function () {
  chai.expect(this.response).to.exist;
});
Then('The check enrollment response status should be {int}', function (status) {
  chai.expect(this.response.statusCode).to.equal(status);
});

Then(/^The check enrollment response should have "([^"]*)": "([^"]*)" header$/, async function(key, value) {
  chai.expect(this.response.rawHeaders).to.include(key);
});

Then(/^The check enrollment response should be returned within 15000ms$/, async function() {
    chai.expect(this.response.responseTime).to.be.lessThan(defaultExpectedResponseTime);
  });

Then('The enrolled_status should be {string}', function (status) {
  chai.expect(this.response.body.message.enrolled_response[0].enrolled_status)
    .to.equal(status);
});