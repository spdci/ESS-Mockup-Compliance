@method=POST @endpoint=/ess/subscribe
Feature: Subscription management for registry events

This API is exposed by ESS registry.
It allows SP systems to subscribe to registry events.

    @smoke
    Scenario: Successfully subscribe to events
        Given SP system subscribes to ESS events
        When A POST request to subscribe is sent
        Then The subscribe response should be received
        And The subscribe response status should be 200
        And The subscribe response should have "Content-Type": "application/json" header
        And The subscribe response should be returned within 15000ms
        And The subscribe response ack_status should be "ACK"
    