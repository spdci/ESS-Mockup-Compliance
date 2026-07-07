import chai from 'chai';
import pkg from 'pactum';
const { spec } = pkg;
import { Given, When, Then } from '@cucumber/cucumber';

import {
  localhost,
  syncSearchEndpoint,
  acceptHeader,
  defaultExpectedResponseTime,
  syncSearchRequest,
  syncSearchSchema
} from './helpers/helpers.js';

import chaiJsonSchema from 'chai-json-schema';
chai.use(chaiJsonSchema);

let response;
let request;

const baseUrl = localhost + syncSearchEndpoint;

Given('SP system requests member data from ESS', function () {
  request = spec();
});

When('A POST request to sync search is sent', async function () {
  response = await request
    .post(baseUrl)
    .withHeaders(acceptHeader.key, acceptHeader.value)
    .withJson(syncSearchRequest);

  this.response = response;
});

Then('The response should be received', async function () {
  chai.expect(this.response).to.exist;
});

Then('The sync search response status should be {int}', function (status) {
  chai.expect(this.response.statusCode).to.equal(status);
});

Then(/^The sync search response should have "([^"]*)": "([^"]*)" header$/, async function(key, value) {
  chai.expect(this.response.rawHeaders).to.include(key);
});

Then(/^The sync search response should be returned within 15000ms$/, async function() {
    chai.expect(this.response.responseTime).to.be.lessThan(defaultExpectedResponseTime);
  });

// Then step: Validate JSON schema of the response
Then(/^The sync search response should match the expected JSON schema$/, async  function() {
  chai.expect(this.response.body).to.be.jsonSchema(syncSearchSchema);
});
