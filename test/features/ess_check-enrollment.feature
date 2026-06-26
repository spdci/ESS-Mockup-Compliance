@method=POST @endpoint=/registry/sync/check-enrollment
Feature: Enrollment status verification from ESS registry

This API is exposed by ESS registry.
It allows SP systems to verify whether a person is enrolled and active.

    @smoke
    Scenario: Successfully check enrollment status for active member
        Given SP system checks enrollment for person "ABC451123"
        When A POST request to check enrollment is sent
        Then The response should be received
        And The response status should be 200
        And The response should have "Content-Type": "application/json" header
        And The response should contain "enrolled_status"
        And The enrolled_status should be "Active"
        And The response should be returned within 15000ms

    @negative
    Scenario: Enrollment check for unknown person
        Given SP system checks enrollment for unknown identifier
        When A POST request to check enrollment is sent
        Then The response should be received
        And The system should return default or inactive status

    @schema
    Scenario: Enrollment response schema validation
        Given A valid enrollment check request is sent
        When The response is received
        Then The response should match the expected JSON schema