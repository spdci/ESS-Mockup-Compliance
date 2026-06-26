import chai from 'chai';
import pkg from 'pactum';
const { spec } = pkg;
import { Given, When, Then } from '@cucumber/cucumber';

import {
  localhost,
  onSearchEndpoint,
  acceptHeader,
  onSearchRequest
} from './helpers/helpers.js';

let response;
let request;

const baseUrl = localhost + onSearchEndpoint;

Given('ESS is ready to receive on-search callback', function () {
  request = spec();
});

When('A POST request to on-search is sent', async function () {
  response = await request
    .post(baseUrl)
    .withHeaders(acceptHeader.key, acceptHeader.value)
    .withJson(onSearchRequest);

  this.response = response;
});

Then('The on-search response should be ACK', function () {
  chai.expect(this.response.body.message.ack_status).to.equal('ACK');
});