import chai from 'chai';
import pkg from 'pactum';

const { spec } = pkg;

import { Given, When, Then } from '@cucumber/cucumber';

import {
  localhost,
  onSubscribeEndpoint,
  acceptHeader,
  onSubscribeRequest,
  ackResponseSchema
} from './helpers/helpers.js';

import chaiJsonSchema from 'chai-json-schema';

chai.use(chaiJsonSchema);

let request;
let response;

const baseUrl = localhost + onSubscribeEndpoint;

Given('ESS is ready to receive subscribe callback', function () {
  request = spec();
});

When('A POST request to on subscribe is sent', async function () {

  response = await request
    .post(baseUrl)
    .withHeaders(acceptHeader.key, acceptHeader.value)
    .withJson(onSubscribeRequest);

  this.response = response;
});

Then('The on subscribe response should be ACK', function () {
  chai.expect(this.response.body.message.ack_status).to.equal('ACK');
});

Then('The on subscribe response should match the expected JSON schema', function () {
  chai.expect(this.response.body).to.be.jsonSchema(ackResponseSchema);
});