import chai from 'chai';
import pkg from 'pactum';

const { spec } = pkg;

import { Given, When, Then } from '@cucumber/cucumber';

import {
  localhost,
  onUnsubscribeEndpoint,
  acceptHeader,
  onUnsubscribeRequest,
  ackResponseSchema
} from './helpers/helpers.js';

import chaiJsonSchema from 'chai-json-schema';

chai.use(chaiJsonSchema);

let request;
let response;

const baseUrl = localhost + onUnsubscribeEndpoint;

Given('ESS is ready to receive unsubscribe callback', function () {
  request = spec();
});

When('A POST request to on unsubscribe is sent', async function () {

  response = await request
    .post(baseUrl)
    .withHeaders(acceptHeader.key, acceptHeader.value)
    .withJson(onUnsubscribeRequest);

  this.response = response;
});

Then('The on unsubscribe response should be ACK', function () {
  chai.expect(this.response.body.message.ack_status).to.equal('ACK');
});

Then('The on unsubscribe response should match the expected JSON schema', function () {
  chai.expect(this.response.body).to.be.jsonSchema(ackResponseSchema);
});