@method=POST @endpoint=/ess/on-unsubscribe
Feature: Unsubscription callback handler for ESS registry

This API confirms that a subscription has been removed successfully.

    @smoke
    Scenario: Successfully receive unsubscribe confirmation
        Given ESS is ready to receive unsubscribe callback
        When A POST request to on unsubscribe is sent
        Then The response should be received
        And The async search response should have status 200
        And The on unsubscribe response should be ACK
        And The async search response should be returned in a timely manner within 15000ms
        And The on unsubscribe response should match the expected JSON schema

    @negative
    Scenario: On-unsubscribe with missing fields
        Given ESS receives invalid unsubscribe callback
        When A POST request to on unsubscribe is sent
        Then The response should still be received
        And The system should handle invalid payload gracefully