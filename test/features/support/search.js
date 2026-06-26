import chai from 'chai';
import pkg from 'pactum';
const { spec } = pkg;

import { Given, When, Then } from '@cucumber/cucumber';

import {
  localhost,
  asyncsearchEndpoint,
  acceptHeader,
  defaultExpectedResponseTime,
  asyncSearchRequest
} from './helpers/helpers.js';

import chaiJsonSchema from 'chai-json-schema';
chai.use(chaiJsonSchema);

let response;
let requestSpec;

const baseUrl = localhost + asyncsearchEndpoint;

Given('System wants to async search for persons in crvs', function () {
  requestSpec = spec();
});

When('A POST request to async search is sent', async function () {
  response = await requestSpec
    .post(baseUrl)
    .withHeaders(acceptHeader.key, acceptHeader.value)
    .withJson(asyncSearchRequest);

  this.response = response;
});

Then('The response from the async search should be received', function () {
  chai.expect(this.response).to.exist;
});

Then('The async search response should have status {int}', function (status) {
  chai.expect(this.response.statusCode).to.equal(Number(status));
});

Then(
  'The async search response should have {string}: {string} header',
  function (key, value) {
    chai.expect(this.response.headers).to.have.property(key.toLowerCase());
    chai.expect(this.response.headers[key.toLowerCase()]).to.include(value);
  }
);

Then(
  'The async search response should be returned in a timely manner within {int}ms',
  function (time) {
    chai.expect(this.response.responseTime).to.be.lessThan(time);
  }
);

Then(
  'The async search response should match the expected JSON schema',
  function () {
    chai.expect(this.response.body).to.be.jsonSchema(asyncSearchResponseSchema);
  }
);