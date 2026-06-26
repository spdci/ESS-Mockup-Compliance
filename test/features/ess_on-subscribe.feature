@method=POST @endpoint=/ess/on-subscribe
Feature: Subscription callback handler for ESS registry

This API is called by SP systems to confirm subscription results.

    @smoke
    Scenario: Successfully receive subscription confirmation callback
        Given ESS is ready to receive subscribe callback
        When A POST request to on subscribe is sent
        Then The response from the async search should be received
        And The async search response should have status 200
        And The on subscribe response should be ACK
        And The async search response should be returned in a timely manner within 15000ms
        And The on subscribe response should match the expected JSON schema

    @negative
    Scenario: On-subscribe with malformed payload
        Given ESS receives invalid subscription callback
        When A POST request to on subscribe is sent
        Then The response should still be received
        And The system should handle invalid payload gracefully