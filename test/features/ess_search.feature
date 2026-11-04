@method=POST @endpoint=ess/search
Feature: Asynchronous search of the Employment Support System (POST /registry/search)

This API is exposed by the ESS and called by SP-MIS systems (and vice versa).
The ESS acknowledges the request, then delivers a SearchResponse to the on-search
callback given in header.sender_uri. The persons, members and groups delivered in the
callback are checked against the ESS data rules.

  Background:
    Given the "search" endpoint

  @smoke
  Scenario: An async search is acknowledged
    Given a search for the "full" Member by identifier
    Then the request should be a valid "search" message
    When the request is sent
    Then the HTTP status should be 200
    And the response should have a JSON content type
    And the response should be received within 15000 ms
    And the response should be a valid acknowledgement with ack_status "ACK"

  @functional
  Scenario Outline: Every kind of search is acknowledged: <search>
    Given <request>
    Then the request should be a valid "search" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

    Examples:
      | search                  | request                                                                                    |
      | person by identifier    | a search for the "deceased" ESSPerson by identifier                                        |
      | member by identifier    | a search for the "unemployed" Member by identifier                                         |
      | person with disability  | a search for the "disabled" Member by identifier                                           |
      | group by identifier     | a search for the "large" Group by identifier                                               |
      | group of a person       | a search for the "by person identifier" Group by identifier                                |
      | member predicate        | a predicate search for Member records where "the member is not employed"                   |
      | disability predicate    | a predicate search for Member records where "the member is a person with disability"       |
      | group predicate         | a predicate search for Group records where "poverty_score is below 5"                      |
      | person predicate        | a predicate search for ESSPerson records where "the person is a woman born since 1980"     |
      | member expression       | an expression search for "Member who are working-age and not employed"                     |
      | group expression        | an expression search for "Group with working-age unemployed members"                       |
      | batch                   | a batch search mixing record types "Member:full, Member:disabled, ESSPerson:unknown"       |

  # ---------------------------------------------------------------------------
  # Full async round trip: results are delivered to header.sender_uri
  # ---------------------------------------------------------------------------
  @callback
  Scenario Outline: The <profile> <type> is delivered to the on-search callback
    Given a search for the "<profile>" <type> by identifier
    And the callback listener is used as sender_uri
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"
    And an "on-search" callback should be received
    And the callback should be a valid "on-search" message
    And every search result should have status "succ"
    And every returned record should be a <type> record
    And the result should contain the record identified by the query
    And every returned record should be valid ESS data

    Examples: Persons
      | type      | profile   |
      | ESSPerson | full      |
      | ESSPerson | minimal   |
      | ESSPerson | deceased  |
      | ESSPerson | jobseeker |

    Examples: Members
      | type   | profile           |
      | Member | full              |
      | Member | unemployed        |
      | Member | seasonal          |
      | Member | disabled          |
      | Member | disabled by label |

    Examples: Groups
      | type  | profile              |
      | Group | full                 |
      | Group | minimal              |
      | Group | large                |
      | Group | by member identifier |

  @callback @pwd
  Scenario: Persons with disability are delivered to the on-search callback
    Given a predicate search for Member records where "the member is a person with disability"
    And the callback listener is used as sender_uri
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"
    And an "on-search" callback should be received
    And the callback should be a valid "on-search" message
    And every returned member should be a person with disability
    And every returned record should be valid ESS data

  @callback
  Scenario: A paginated, sorted member search is delivered to the on-search callback
    Given a predicate search for Member records where "the member is not employed"
    And the search requests page 1 with page_size 3
    And the search results are sorted by "registration_date" in "asc" order
    And the callback listener is used as sender_uri
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"
    And an "on-search" callback should be received
    And the callback should be a valid "on-search" message
    And every returned record should be a Member record
    And every returned record should satisfy the predicate
    And the search result pagination should report page 1 with at most 3 records per page
    And the returned records should be sorted by "registration_date" in "asc" order
    And every returned record should be valid ESS data

  @callback
  Scenario: A mixed batch search is answered item by item in the on-search callback
    Given a batch search mixing record types "Member:jobseeker, Group:full, ESSPerson:child, Member:unknown"
    And the callback listener is used as sender_uri
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"
    And an "on-search" callback should be received
    And the callback should be a valid "on-search" message
    And each batch item should be answered with its own result
    And every returned record should be valid ESS data

  # ---------------------------------------------------------------------------
  # Requests that break the spec must be refused
  # ---------------------------------------------------------------------------
  @negative
  Scenario Outline: An invalid async search is rejected: <case>
    Given a valid request
    And the request field "<field>" becomes '<value>'
    When the request is sent
    Then the request should be rejected according to the DCI error model

    Examples:
      | case                                     | field                                                    | value        |
      | missing header                           | header                                                   | <removed>    |
      | missing message                          | message                                                  | <removed>    |
      | wrong action                             | header.action                                            | "on-search"  |
      | missing sender_id                        | header.sender_id                                         | <removed>    |
      | invalid message_ts                       | header.message_ts                                        | "2026-13-01" |
      | sender_uri not a URI                     | header.sender_uri                                        | "callback"   |
      | missing transaction_id                   | message.transaction_id                                   | <removed>    |
      | empty search_request                     | message.search_request                                   | []           |
      | missing search_criteria                  | message.search_request.0.search_criteria                 | <removed>    |
      | unknown query_type                       | message.search_request.0.search_criteria.query_type      | "sql"        |
      | unknown reg_record_type                  | message.search_request.0.search_criteria.reg_record_type | "Programme"  |
      | invalid locale                           | message.search_request.0.locale                          | "EN"         |
      | encrypted flag without encrypted payload | header.is_msg_encrypted                                  | true         |

  @negative
  Scenario: A body that is not JSON is rejected
    When the raw body "{not json" is sent
    Then the request should be rejected according to the DCI error model
