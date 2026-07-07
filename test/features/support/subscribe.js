import chai from 'chai';
import pkg from 'pactum';
const { spec } = pkg;
import { Given, When, Then } from '@cucumber/cucumber';

import {
  localhost,
  subscribeEndpoint,
  acceptHeader,
  defaultExpectedResponseTime,
  subscribeRequest
} from './helpers/helpers.js';

let response;
let request;

const baseUrl = localhost + subscribeEndpoint;

Given('SP system subscribes to ESS events', function () {
  request = spec();
});

When('A POST request to subscribe is sent', async function () {
  response = await request
    .post(baseUrl)
    .withHeaders(acceptHeader.key, acceptHeader.value)
    .withJson(subscribeRequest);

  this.response = response;
});


// Then step: Ensure the response is received
Then(/^The subscribe response should be received$/, async function () {
  chai.expect(this.response).to.exist; // Uncomment once debugged
});

// Then step: Validate the response status code
Then(/^The subscribe response status should be (\d+)$/, async  function(status)  {
  chai.expect(this.response.statusCode).to.equal(status);
});

// Then step: Validate header in the response
Then(/^The subscribe response should have "([^"]*)": "([^"]*)" header$/, async function(key, value) {
  chai.expect(this.response.rawHeaders).to.include(key);
});

// Then step: Validate response time
Then(/^The subscribe response should be returned within 15000ms$/, async function() {
    chai.expect(this.response.responseTime).to.be.lessThan(defaultExpectedResponseTime);
  });

// Then step: Validate JSON schema of the response
Then('The subscribe response ack_status should be {string}', function (status) {
  const body = JSON.parse(this.response.body);

  chai.expect(body.message.ack_status)
    .to.equal(status);
});
