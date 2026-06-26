@method=POST @endpoint=/ess/sync/status
Feature: Synchronous transaction status check from ESS

This API allows SP systems to synchronously retrieve the status of a transaction from ESS.

    @smoke
    Scenario: Successfully retrieve transaction status
        Given System wants to retrieve transaction status synchronously
        When A POST request to sync status is sent
        Then The sync status response should be received
        And The async search response should have status 200
        And The transaction status should be "completed"
        And The sync status response should be returned in a timely manner within 15000ms
        And The sync status response should match the expected JSON schema

    @negative
    Scenario: Sync status with invalid transaction id
        Given System sends invalid transaction id for status check
        When A POST request to sync status is sent
        Then The sync status response should be received
        And The response should handle invalid transaction gracefully