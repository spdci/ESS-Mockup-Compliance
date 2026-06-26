import chai from 'chai';
import pkg from 'pactum';
const { spec } = pkg;
import { Given, When, Then } from '@cucumber/cucumber';

import {
  localhost,
  txnStatusEndpoint,
  acceptHeader,
  txnStatusRequest
} from './helpers/helpers.js';

let response;
let request;

const baseUrl = localhost + txnStatusEndpoint;

Given('System wants to check transaction status', function () {
  request = spec();
});

When('A POST request to txn status is sent', async function () {
  response = await request
    .post(baseUrl)
    .withHeaders(acceptHeader.key, acceptHeader.value)
    .withJson(txnStatusRequest);

  this.response = response;
});

Then('Txn status should be completed', function () {
  chai.expect(this.response.body.message.txn_status).to.equal('completed');
});