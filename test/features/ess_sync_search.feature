@method=POST @endpoint=/ess/sync/search
Feature: Synchronous search from ESS registry

This API is exposed by ESS registry.
It allows SP systems to perform immediate search and retrieve member records.

    @smoke
    Scenario: Successfully perform synchronous search
        Given SP system requests member data from ESS
        When A POST request to sync search is sent
        Then The response should be received
        And The sync search response status should be 200
        And The sync search response should have "Content-Type": "application/json" header
        And The sync search response should be returned within 15000ms
        And The sync search response should match the expected JSON schema
