@method=POST @endpoint=/ess/notify
Feature: Registry event notification endpoint

This API is exposed by ESS registry.
It receives notifications from SP systems or external registries.

    @smoke
    Scenario: Successfully receive notification
        Given ESS receives a valid notification event
        When A POST request to notify is sent
        Then The notify response should be received
        And The notify response status should be 200
        And The notify response should have "Content-Type": "application/json" header
        And The notify response should be returned within 15000ms
        And The notify response ack_status should be "ACK"

    