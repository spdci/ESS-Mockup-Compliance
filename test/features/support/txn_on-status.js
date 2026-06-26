import chai from 'chai';
import pkg from 'pactum';
const { spec } = pkg;

import { Given, When, Then } from '@cucumber/cucumber';

import {
  localhost,
  onStatusEndpoint,
  acceptHeader,
  onStatusRequest,
  ackResponseSchema,
  defaultExpectedResponseTime
} from './helpers/helpers.js';

import chaiJsonSchema from 'chai-json-schema';

chai.use(chaiJsonSchema);

let request;
let response;

const baseUrl = localhost + onStatusEndpoint;

Given('ESS is ready to receive transaction status callback', function () {
  request = spec();
});

When('A POST request to on status is sent', async function () {

  response = await request
    .post(baseUrl)
    .withHeaders(acceptHeader.key, acceptHeader.value)
    .withJson(onStatusRequest);

  this.response = response;
});

Then('The on status response should be received', function () {
  chai.expect(this.response).to.exist;
});

Then('The on status response should have status {int}', function (status) {
  chai.expect(this.response.statusCode).to.equal(status);
});

Then('The on status response should match the expected JSON schema', function () {
  chai.expect(this.response.body).to.be.jsonSchema(ackResponseSchema);
});

Then('The on status response should be returned within {int}ms', function (ms) {
  chai.expect(this.response.responseTime).to.be.lessThan(ms);
});