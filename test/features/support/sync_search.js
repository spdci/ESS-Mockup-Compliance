import chai from 'chai';
import pkg from 'pactum';
const { spec } = pkg;
import { Given, When, Then } from '@cucumber/cucumber';

import {
  localhost,
  syncSearchEndpoint,
  acceptHeader,
  syncSearchRequest,
  syncSearchSchema
} from './helpers/helpers.js';

import chaiJsonSchema from 'chai-json-schema';
chai.use(chaiJsonSchema);

let response;
let request;

const baseUrl = localhost + syncSearchEndpoint;

Given('System wants to sync search for members in ESS', function () {
  request = spec();
});

When('A POST request to sync search is sent', async function () {
  response = await request
    .post(baseUrl)
    .withHeaders(acceptHeader.key, acceptHeader.value)
    .withJson(syncSearchRequest);

  this.response = response;
});

Then('The sync search response status should be {int}', function (status) {
  chai.expect(this.response.statusCode).to.equal(status);
});

Then('The sync search response should contain member records', function () {
  chai.expect(this.response.body.message.search_response[0].data.reg_records).to.exist;
});