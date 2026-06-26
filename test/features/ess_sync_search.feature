@method=POST @endpoint=/ess/sync/search
Feature: Synchronous search from ESS registry

This API is exposed by ESS registry.
It allows SP systems to perform immediate search and retrieve member records.

    @smoke
    Scenario: Successfully perform synchronous search
        Given SP system requests member data from ESS
        When A POST request to sync search is sent
        Then The response should be received
        And The response status should be 200
        And The response should have "Content-Type": "application/json" header
        And The response should contain "search_response"
        And The response should include at least one "reg_record"
        And The response should be returned within 15000ms

    @smoke
    Scenario: Sync search by valid UIN returns member data
        Given SP system searches using UIN "42343545654"
        When A POST request to sync search is sent
        Then The response should contain member "Alice Smith"
        And The employment_status should be "employed"

    @negative
    Scenario: Sync search with unknown UIN
        Given SP system searches using invalid UIN "00000000000"
        When A POST request to sync search is sent
        Then The response should be received
        And The response should contain empty or default "reg_records"

    @schema
    Scenario: Sync search response schema validation
        Given A valid sync search request is sent
        When The response is received
        Then The response should match the expected JSON schema