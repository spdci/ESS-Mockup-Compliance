import chai from 'chai';
import pkg from 'pactum';

const { spec } = pkg;

import { Given, When, Then } from '@cucumber/cucumber';

import {
  localhost,
  syncStatusEndpoint,
  acceptHeader,
  syncStatusRequest,
  syncStatusSchema
} from './helpers/helpers.js';

import chaiJsonSchema from 'chai-json-schema';

chai.use(chaiJsonSchema);

let request;
let response;

const baseUrl = localhost + syncStatusEndpoint;

Given('System wants to retrieve transaction status synchronously', function () {
  request = spec();
});

When('A POST request to sync status is sent', async function () {

  response = await request
    .post(baseUrl)
    .withHeaders(acceptHeader.key, acceptHeader.value)
    .withJson(syncStatusRequest);

  this.response = response;
});

Then('The sync status response should be received', function () {
  chai.expect(this.response).to.exist;
});

Then('The transaction status should be {string}', function (status) {
  chai.expect(this.response.body.message.txn_status).to.equal(status);
});

Then('The sync status response should match the expected JSON schema', function () {
  chai.expect(this.response.body).to.be.jsonSchema(syncStatusSchema);
});