@method=POST @endpoint=/ess/on-status
Feature: Transaction status callback handler for ESS registry

This API is called by external systems to notify ESS about transaction updates.

    @smoke
    Scenario: Successfully receive transaction status callback
        Given ESS is ready to receive transaction status callback
        When A POST request to on status is sent
        Then The response should be received
        And The async search response should have status 200
        And The on status response should be ACK
        And The async search response should be returned in a timely manner within 15000ms
        And The on status response should match the expected JSON schema

    @negative
    Scenario: On-status with invalid transaction state
        Given ESS receives invalid transaction status payload
        When A POST request to on status is sent
        Then The response should still be received
        And The system should handle invalid status gracefully