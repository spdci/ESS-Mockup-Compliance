@method=POST @endpoint=/ess/subscribe
Feature: Subscription management for registry events

This API is exposed by ESS registry.
It allows SP systems to subscribe to registry events.

    @smoke
    Scenario: Successfully subscribe to events
        Given SP system subscribes to ESS events
        When A POST request to subscribe is sent
        Then The response should be received
        And The response status should be 200
        And The response should have "Content-Type": "application/json" header
        And The response should contain "ack_status" equal to "ACK"
        And The response should be returned within 15000ms

    @schema
    Scenario: Subscribe response schema validation
        Given A valid subscribe request is sent
        When The response is received
        Then The response should match the expected JSON schema