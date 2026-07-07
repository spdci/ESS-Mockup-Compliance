import chai from 'chai';
import pkg from 'pactum';
const { spec } = pkg;
import { Given, When, Then, Before } from '@cucumber/cucumber';
import {
  localhost,
  defaultExpectedResponseTime,
  acceptHeader,
  notifyEndpoint,
  notifyResponseSchema
} from './helpers/helpers.js';

import chaiJsonSchema from 'chai-json-schema'; // Import correctly
import chaiString from 'chai-string';

chai.use(chaiString);

chai.use(chaiJsonSchema); // Use the imported schema validation

const baseUrl = localhost + notifyEndpoint;

let specnotify;


// Given step: Initialize search for beneficiaries
Given(/^ESS receives a valid notification event$/, function () {
  specnotify = spec(); // Initialize the specSearch object
});

When(/^A POST request to notify is sent$/, async function () {
  try {
    const response = await specnotify
      .post(baseUrl)
      .withHeaders(acceptHeader.key, acceptHeader.value);
    this.response = response; // Save response for validation in Then steps
  } catch (err) {
    console.error("Request failed", err);
    throw err;
  }
});


// Then step: Ensure the response is received
Then(/^The notify response should be received$/, async function () {
  chai.expect(this.response).to.exist; // Uncomment once debugged
});

// Then step: Validate the response status code
Then(/^The notify response status should be (\d+)$/, async  function(status)  {
  chai.expect(this.response.statusCode).to.equal(status);
});

// Then step: Validate header in the response
Then(/^The notify response should have "([^"]*)": "([^"]*)" header$/, async function(key, value) {
  chai.expect(this.response.rawHeaders).to.include(key);
});

// Then step: Validate response time
Then(/^The notify response should be returned within 15000ms$/, async function() {
    chai.expect(this.response.responseTime).to.be.lessThan(defaultExpectedResponseTime);
  });

// Then step: Validate JSON schema of the response
Then('The notify response ack_status should be {string}', function (status) {
  const body = JSON.parse(this.response.body);

  chai.expect(body.message.ack_status)
    .to.equal(status);
});
