import chai from 'chai';
import pkg from 'pactum';
const { spec } = pkg;
import { Given, When, Then } from '@cucumber/cucumber';

import {
  localhost,
  subscribeEndpoint,
  acceptHeader,
  subscribeRequest
} from './helpers/helpers.js';

let response;
let request;

const baseUrl = localhost + subscribeEndpoint;

Given('System subscribes to ESS events', function () {
  request = spec();
});

When('A POST request to subscribe is sent', async function () {
  response = await request
    .post(baseUrl)
    .withHeaders(acceptHeader.key, acceptHeader.value)
    .withJson(subscribeRequest);

  this.response = response;
});

Then('Subscription should return ACK', function () {
  chai.expect(this.response.body.message.ack_status).to.equal('ACK');
});