@method=POST @endpoint=/ess/notify
Feature: Registry event notification endpoint

This API is exposed by ESS registry.
It receives notifications from SP systems or external registries.

    @smoke
    Scenario: Successfully receive notification
        Given ESS receives a valid notification event
        When A POST request to notify is sent
        Then The response should be received
        And The response status should be 200
        And The response should contain "ack_status" equal to "ACK"
        And The response should be returned within 15000ms

    @negative
    Scenario: Notification with invalid payload
        Given ESS receives malformed notification
        When A POST request to notify is sent
        Then The system should handle it gracefully

    @schema
    Scenario: Notification schema validation
        Given A valid notification request is sent
        When The response is received
        Then The response should match the expected JSON schema