@method=POST @endpoint=ess/sync/check-enrollment
Feature: Check whether a person remains enrolled (POST /registry/sync/check-enrollment)

PRS.EMP.05 (compliance monitoring via status verification): an SP-MIS asks the ESS whether
a person, a member or a household remains enrolled in an employment support programme.
The request carries header action "check-enrollment" and an EnrolledRequest
(enrolled_criteria: query_type, response_entity Group or Member, query). The ESS answers
with header action "on-check-enrollment" and an EnrolledResponse: one item per person
checked with its enrolled_status (EnrolmentStatus code list: Active, Deceased, Exited,
Suspended, Inactive, Reinstated, Awaiting Renewal), never the person's records.

The suite uses the spec's expression form ({ "person_identifier": { "eq": "ABC451123" } },
"in" for batches), plus the idtype-value and predicate forms.

  Background:
    Given the "check enrollment" endpoint

  @smoke
  Scenario: Successfully check the enrolment of the person of the spec example (process flow 4)
    Given the enrolment check of the spec example
    Then the request should be a valid "check-enrollment" message
    When the request is sent
    Then the HTTP status should be 200
    And the response should have a JSON content type
    And the response should be received within 15000 ms
    And the response should be a valid "check-enrollment-response" message
    And every enrolment answer should have status "succ"
    And the enrolment check should answer 1 item
    And the enrolled status should be "Active"
    And the enrolment answer should disclose no member data

  # ---------------------------------------------------------------------------
  # Every enrolment status, at person, member and household level
  # ---------------------------------------------------------------------------
  @functional @mock
  Scenario Outline: The <type> "<profile>" is reported with its enrolment status
    Given an enrolment check of the "<profile>" <type>
    Then the request should be a valid "check-enrollment" message
    When the request is sent
    Then the response should be a valid "check-enrollment-response" message
    And every enrolment answer should report the expected enrolment status
    And every enrolled status should be a value of the EnrolmentStatus code list
    And the enrolment answer should disclose no member data

    Examples: Person level (person_identifier)
      | type      | profile   |
      | ESSPerson | full      |
      | ESSPerson | jobseeker |
      | ESSPerson | deceased  |
      | ESSPerson | child     |
      | ESSPerson | unknown   |

    Examples: Member level (member_identifier)
      | type   | profile           |
      | Member | full              |
      | Member | unemployed        |
      | Member | student           |
      | Member | seasonal          |
      | Member | deceased          |
      | Member | head              |
      | Member | jobseeker         |
      | Member | minimal           |
      | Member | unknown           |

    @pwd
    Examples: Persons with disability
      | type   | profile           |
      | Member | disabled          |
      | Member | disabled by label |

    Examples: Household level (group_identifier)
      | type  | profile    |
      | Group | full       |
      | Group | disability |
      | Group | large      |
      | Group | minimal    |
      | Group | unknown    |

  @functional @mock
  Scenario Outline: The enrolment check also accepts the <form> query form
    Given an enrolment check of the "<profile>" <type> <form>
    Then the request should be a valid "check-enrollment" message
    When the request is sent
    Then the response should be a valid "check-enrollment-response" message
    And every enrolment answer should report the expected enrolment status

    Examples:
      | form                 | type   | profile    |
      | by identifier        | Member | full       |
      | by identifier        | Group  | full       |
      | written as a predicate | Member | disabled |
      | written as a predicate | Group  | large    |

  @functional @mock
  Scenario Outline: A batch of <type> records is checked in one request
    Given a batch enrolment check of the <type> records "<records>"
    Then the request should be a valid "check-enrollment" message
    When the request is sent
    Then the response should be a valid "check-enrollment-response" message
    And every enrolment answer should report the expected enrolment status
    And the enrolment answer should disclose no member data

    Examples:
      | type      | records                                                   |
      | Member    | full, unemployed, disabled, deceased, minimal, unknown    |
      | ESSPerson | full, jobseeker, child                                    |
      | Group     | full, large, unknown                                      |

  @functional
  Scenario Outline: The response entity <entity> is accepted
    Given an enrolment check of the "full" Member
    And the enrolment check asks for the "<entity>" response entity
    Then the request should be a valid "check-enrollment" message
    When the request is sent
    Then the response should be a valid "check-enrollment-response" message

    Examples:
      | entity |
      | Member |
      | Group  |

  # ---------------------------------------------------------------------------
  # Requests that break the spec must be refused
  # ---------------------------------------------------------------------------
  @negative
  Scenario Outline: An invalid enrolment check is rejected: <case>
    Given a valid request
    And the request field "<field>" becomes '<value>'
    When the request is sent
    Then the request should be rejected according to the DCI error model

    Examples:
      | case                               | field                                     | value                |
      | missing header                     | header                                    | <removed>            |
      | missing message                    | message                                   | <removed>            |
      | action of the former mock          | header.action                             | "enrollementstatus"  |
      | search action                      | header.action                             | "search"             |
      | missing sender_id                  | header.sender_id                          | <removed>            |
      | missing transaction_id             | message.transaction_id                    | <removed>            |
      | missing enrolled_criteria          | message.enrolled_criteria                 | <removed>            |
      | missing query_type                 | message.enrolled_criteria.query_type      | <removed>            |
      | unknown query_type                 | message.enrolled_criteria.query_type      | "sql"                |
      | missing query                      | message.enrolled_criteria.query           | <removed>            |
      | empty query                        | message.enrolled_criteria.query           | {}                   |
      | query not an object                | message.enrolled_criteria.query           | "ABC451123"          |
      | unknown response_entity            | message.enrolled_criteria.response_entity | "Beneficiary"        |
      | idtype-value without value         | message.enrolled_criteria                 | {"query_type":"idtype-value","query":{"type":"UIN"}} |
      | predicate without operator         | message.enrolled_criteria                 | {"query_type":"predicate","query":{"attribute_name":"person_identifier","attribute_value":"ABC451123"}} |

  @negative
  Scenario: A body that is not JSON is rejected
    When the raw body "person_identifier=ABC451123" is sent
    Then the request should be rejected according to the DCI error model
