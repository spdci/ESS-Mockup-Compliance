@method=POST @endpoint=/ess/txn/status
Feature: Transaction status retrieval from ESS registry

This API is exposed by ESS registry.
It allows SP systems to check status of previously initiated transactions.

    @smoke
    Scenario: Successfully retrieve transaction status
        Given SP system requests transaction status
        When A POST request to transaction status is sent
        Then The response should be received
        And The response status should be 200
        And The response should have "Content-Type": "application/json" header
        And The response should contain "txn_status"
        And The txn_status should be "completed"
        And The response should be returned within 15000ms

    @negative
    Scenario: Transaction status for invalid transaction_id
        Given SP system sends invalid transaction_id
        When A POST request to transaction status is sent
        Then The response should still be received

    @schema
    Scenario: Transaction status schema validation
        Given A valid transaction status request is sent
        When The response is received
        Then The response should match the expected JSON schema