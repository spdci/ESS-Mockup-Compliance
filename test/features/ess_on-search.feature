@method=POST @endpoint=/ess/on-search
Feature: On-search callback receiver for ESS registry

This API is exposed by ESS registry.
It receives asynchronous search results from external registries (SP systems).

    @smoke
    Scenario: Successfully receive on-search callback
        Given ESS receives a valid search_response callback
        When A POST request to on-search is sent
        Then The response should be received
        And The response status should be 200
        And The response should have "Content-Type": "application/json" header
        And The response should contain "ack_status" equal to "ACK"
        And The response should include "correlation_id"
        And The response should be returned within 15000ms

    @negative
    Scenario: On-search with malformed payload
        Given ESS receives invalid JSON payload
        When A POST request to on-search is sent
        Then The response should still be handled gracefully

    @schema
    Scenario: On-search response schema validation
        Given A valid on-search request is sent
        When The response is received
        Then The response should match the expected JSON schema