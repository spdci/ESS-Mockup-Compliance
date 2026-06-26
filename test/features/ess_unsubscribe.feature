@method=POST @endpoint=/ess/unsubscribe
Feature: Unsubscription from registry events

This API is exposed by ESS registry.
It allows SP systems to unsubscribe from registry events.

    @smoke
    Scenario: Successfully unsubscribe from events
        Given SP system unsubscribes from ESS events
        When A POST request to unsubscribe is sent
        Then The response should be received
        And The response status should be 200
        And The response should have "ack_status" equal to "ACK"
        And The response should be returned within 15000ms

    @schema
    Scenario: Unsubscribe response schema validation
        Given A valid unsubscribe request is sent
        When The response is received
        Then The response should match the expected JSON schema