@method=POST @endpoint=/registry/sync/check-enrollment
Feature: Enrollment status verification from ESS registry

This API is exposed by ESS registry.
It allows SP systems to verify whether a person is enrolled and active.

    @smoke
    Scenario: Successfully check enrollment status for active member
        Given SP system checks enrollment for person "ABC451123"
        When A POST request to check enrollment is sent
        Then The check enrollment response should be received
        And The check enrollment response status should be 200
        And The check enrollment response should have "Content-Type": "application/json" header
        And The check enrollment response should be returned within 15000ms
        And The enrolled_status should be "Active"

   