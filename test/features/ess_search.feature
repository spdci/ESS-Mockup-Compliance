@method=POST @endpoint=/ess/search
Feature: Async search initiation from ESS registry

This API is exposed by ESS registry.
It is called by SP systems to initiate an asynchronous search request.
ESS will acknowledge and later respond via callback (on-search).

    @smoke
    Scenario: Successfully initiate async search request
        Given SP system wants to search for eligible members in ESS
        When A POST request to async search is sent
        Then The response should be received
        And The response status should be 200
        And The response should have "Content-Type": "application/json" header
        And The response should contain "ack_status" equal to "ACK"
        And The response should contain a valid "correlation_id"
        And The response should be returned within 15000ms

    @negative
    Scenario: Async search request with missing transaction_id
        Given SP system sends search request without transaction_id
        When A POST request to async search is sent
        Then The response should still be received
        And The response status should be 200
        And The system should handle missing transaction_id gracefully

    @schema
    Scenario: Async search response schema validation
        Given A valid async search request is sent
        When The response is received
        Then The response should match the expected JSON schema