import chai from 'chai';
import pkg from 'pactum';
const { spec } = pkg;
import { Given, When, Then } from '@cucumber/cucumber';

import {
  localhost,
  checkEnrollmentEndpoint,
  acceptHeader,
  checkEnrollmentRequest
} from './helpers/helpers.js';

let response;
let request;

const baseUrl = localhost + checkEnrollmentEndpoint ;

Given('System wants to check enrollment status', function () {
  request = spec();
});

When('A POST request to check enrollment is sent', async function () {
  response = await request
    .post(baseUrl)
    .withHeaders(acceptHeader.key, acceptHeader.value)
    .withJson(checkEnrollmentRequest);

  this.response = response;
});

Then('The enrollment response should be received', function () {
  chai.expect(this.response).to.exist;
});

Then('The enrolled_status should be {string}', function (status) {
  chai.expect(this.response.body.message.enrolled_response[0].enrolled_status)
    .to.equal(status);
});