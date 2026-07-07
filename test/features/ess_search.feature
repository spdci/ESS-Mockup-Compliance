@method=POST @endpoint=/ess/search
Feature: Async search initiation from ESS registry

This API is exposed by ESS registry.
It is called by SP systems to initiate an asynchronous search request.
ESS will acknowledge and later respond via callback (on-search).

    @smoke
    Scenario: Successfully initiate async search request
        Given SP system wants to async search for eligible members in ESS
        When A POST request to async search is sent
        Then The response from the async search should be received
        And The async search response should have status 200
        And The async search response should have "Content-Type": "application/json" header
        And The async search response should be returned within 15000ms
        And The ack_status should be "ACK"
        
   