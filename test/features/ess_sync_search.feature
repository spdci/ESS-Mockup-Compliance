@method=POST @endpoint=ess/sync/search
Feature: Synchronous search of the Employment Support System (POST /registry/sync/search)

This API is exposed by the ESS and called by SP-MIS systems (and vice versa).
The response carries a callback header (action "on-search") and a SearchResponse.
A search targets one ESS record type (search_criteria.reg_record_type / response_entity):
members (Member, the default record type of the ESS SearchResponse), persons (ESSPerson)
or groups / households (Group).
Every returned record is checked against the ESS data rules of its type: attributes are
optional, but whatever is returned must be correct (codes, formats, dates, employment and
disability consistency).

  Background:
    Given the "sync search" endpoint

  @smoke
  Scenario: Successful sync search of a member by member identifier
    Given a search for the "full" Member by identifier
    Then the request should be a valid "search" message
    When the request is sent
    Then the HTTP status should be 200
    And the response should have a JSON content type
    And the response should be received within 15000 ms
    And the response should be a valid "sync-search-response" message
    And every search result should have status "succ"
    And the result should contain the record identified by the query
    And every returned record should be valid ESS data

  # ---------------------------------------------------------------------------
  # Person search (ESS_Person)
  # ---------------------------------------------------------------------------
  @functional @person
  Scenario Outline: Person search by <identifier type> returns correct data for the <profile> person
    Given a search for the "<profile>" ESSPerson by identifier
    Then the request should be a valid "search" message
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And every search result should have status "succ"
    And every returned record should be a ESSPerson record
    And the result should contain the record identified by the query
    And at least 1 record should be returned
    And every returned record should be valid ESS data

    Examples:
      | identifier type | profile   |
      | UIN             | full      |
      | MRN             | multi     |
      | UIN             | student   |
      | BRN             | child     |
      | UIN             | seasonal  |
      | UIN             | disabled  |
      | DRN             | deceased  |
      | UIN             | jobseeker |
      | UIN             | minimal   |

  # ---------------------------------------------------------------------------
  # Member search (ESS Member: employment situation, disability)
  # ---------------------------------------------------------------------------
  @functional @member
  Scenario Outline: Member search returns correct data for the <profile> member
    Given a search for the "<profile>" Member by identifier
    Then the request should be a valid "search" message
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And every search result should have status "succ"
    And every returned record should be a Member record
    And the result should contain the record identified by the query
    And at least 1 record should be returned
    And every returned record should be valid ESS data

    Examples: Employment situations
      | profile              |
      | full                 |
      | unemployed           |
      | student              |
      | child                |
      | seasonal             |
      | deceased             |
      | jobseeker            |
      | head                 |
      | minimal              |
      | by person identifier |

    @pwd
    Examples: Persons with disability
      | profile           |
      | disabled          |
      | disabled by label |

  @functional @member
  Scenario: Untyped searches return Member records, as declared by the spec
    Given a search for the "unemployed" Member by identifier without a reg_record_type
    Then the request should be a valid "search" message
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And every search result should have status "succ"
    And every returned record should be a Member record
    And the result should contain the record identified by the query
    And every returned record should be valid ESS data

  # ---------------------------------------------------------------------------
  # Group search (households, process flow 3)
  # ---------------------------------------------------------------------------
  @functional @group
  Scenario Outline: Group search returns correct data for the <profile> group
    Given a search for the "<profile>" Group by identifier
    Then the request should be a valid "search" message
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And every search result should have status "succ"
    And every returned record should be a Group record
    And the result should contain the record identified by the query
    And at least 1 record should be returned
    And every returned record should be valid ESS data

    Examples: By group identifier
      | profile    |
      | full       |
      | disability |
      | large      |
      | single     |
      | minimal    |

    Examples: Household of a person (by the identifier of one of its members)
      | profile               |
      | by member identifier  |
      | by person identifier  |
      | by birth registration |

  @functional @group @pwd
  Scenario: The household of a person with disability includes that person
    Given a search for the "by member identifier" Group by identifier
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And every returned group should include a person with disability
    And every returned record should be valid ESS data

  # ---------------------------------------------------------------------------
  # Eligibility queries of the ESS process flows
  # ---------------------------------------------------------------------------
  @functional
  Scenario Outline: Predicate search for <type> records where <predicate>
    Given a predicate search for <type> records where "<predicate>"
    Then the request should be a valid "search" message
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And every search result should have status "succ"
    And every returned record should be a <type> record
    And every returned record should satisfy the predicate
    And every returned record should be valid ESS data

    Examples:
      | type      | predicate                                             |
      | Member    | the member is not employed                            |
      | Member    | the member left work because of illness or disability |
      | ESSPerson | the person is a woman born since 1980                 |
      | Group     | poverty_score is below 5                              |
      | Group     | the household has more than 3 members                 |

  @functional @pwd
  Scenario: A search for persons with disability returns only persons with disability
    Given a predicate search for Member records where "the member is a person with disability"
    Then the request should be a valid "search" message
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And every search result should have status "succ"
    And every returned record should be a Member record
    And every returned record should satisfy the predicate
    And every returned member should be a person with disability
    And every returned record should be valid ESS data

  @functional
  Scenario Outline: Expression search for <expression>
    Given an expression search for "<expression>"
    Then the request should be a valid "search" message
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And every search result should have status "succ"
    And at least 1 record should be returned
    And every returned record should be valid ESS data

    Examples:
      | expression                                  |
      | Member who are working-age and not employed |
      | Group with working-age unemployed members   |
      | ESSPerson who are women born since 1980     |

  # ---------------------------------------------------------------------------
  # Optional search criteria: pagination, sort, locale, consent / authorize
  # ---------------------------------------------------------------------------
  @functional
  Scenario Outline: Pagination is honoured (page <page>, page_size <size>)
    Given a predicate search for Member records where "the member is not employed"
    And the search requests page <page> with page_size <size>
    Then the request should be a valid "search" message
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And the search result pagination should report page <page> with at most <size> records per page
    And every returned record should be valid ESS data

    Examples:
      | page | size |
      | 1    | 1    |
      | 2    | 2    |
      | 1    | 5    |
      | 1    | 100  |

  @functional
  Scenario Outline: Sorting <type> records by <attribute> <order> is honoured
    Given a predicate search for <type> records where "<predicate>"
    And the search results are sorted by "<attribute>" in "<order>" order
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And the returned records should be sorted by "<attribute>" in "<order>" order

    Examples:
      | type      | predicate                             | attribute         | order |
      | Member    | the member is not employed            | registration_date | asc   |
      | Member    | the member is not employed            | registration_date | desc  |
      | Group     | poverty_score is below 5              | poverty_score     | asc   |
      | Group     | poverty_score is below 5              | poverty_score     | desc  |
      | ESSPerson | the person is a woman born since 1980 | birth_date        | asc   |
      | ESSPerson | the person is a woman born since 1980 | birth_date        | desc  |

  @functional
  Scenario: The requested locale is honoured
    Given a search for the "full" Member by identifier
    And the search request asks for locale "fra"
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And every requested locale should be honoured

  @functional
  Scenario: A search carrying consent and authorize information is accepted
    Given a search for the "jobseeker" Member by identifier
    And the search request carries consent and authorize information
    Then the request should be a valid "search" message
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And every search result should have status "succ"

  # ---------------------------------------------------------------------------
  # Batch, not found, rejection by the registry
  # ---------------------------------------------------------------------------
  @functional
  Scenario Outline: A batch search of <type> records answers every item with its own result
    Given a batch search for the <type> records "<records>"
    Then the request should be a valid "search" message
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And each batch item should be answered with its own result
    And every returned record should be valid ESS data

    Examples:
      | type      | records                                         |
      | ESSPerson | full, deceased, child, unknown                  |
      | Member    | full, unemployed, disabled, seasonal, unknown   |
      | Group     | full, disability, large, single, minimal, unknown |

  @functional
  Scenario: A batch search may mix persons, members and groups
    Given a batch search mixing record types "Member:jobseeker, Group:large, ESSPerson:deceased, Member:disabled by label, Group:unknown"
    Then the request should be a valid "search" message
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And each batch item should be answered with its own result
    And every returned record should be valid ESS data

  @functional
  Scenario Outline: Searching an unknown <type> returns no record or a coded rejection
    Given a search for the "unknown" <type> by identifier
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And the search result should be empty or rejected with a valid reason code

    Examples:
      | type      |
      | ESSPerson |
      | Member    |
      | Group     |

  @functional @mock
  Scenario: A rejected search item carries a spec reason code and no data
    Given a search for the "too_many" Member by identifier
    When the request is sent
    Then the response should be a valid "sync-search-response" message
    And the search result should be rejected with reason code "rjct.search.too_many_records_found"

  # ---------------------------------------------------------------------------
  # Requests that break the spec must be refused
  # ---------------------------------------------------------------------------
  @negative
  Scenario Outline: An invalid request is rejected: <case>
    Given a valid request
    And the request field "<field>" becomes '<value>'
    When the request is sent
    Then the request should be rejected according to the DCI error model

    Examples: Envelope and header
      | case                       | field                   | value        |
      | missing header             | header                  | <removed>    |
      | missing message            | message                 | <removed>    |
      | wrong action               | header.action           | "on-search"  |
      | missing message_id         | header.message_id       | <removed>    |
      | missing message_ts         | header.message_ts       | <removed>    |
      | message_ts not ISO 8601    | header.message_ts       | "13/10/2026" |
      | missing sender_id          | header.sender_id        | <removed>    |
      | missing total_count        | header.total_count      | <removed>    |
      | total_count not an integer | header.total_count      | "one"        |
      | sender_uri not a URI       | header.sender_uri       | "not a uri"  |
      | is_msg_encrypted not bool  | header.is_msg_encrypted | "no"         |

    Examples: Search request
      | case                          | field                                                    | value                                   |
      | missing transaction_id        | message.transaction_id                                   | <removed>                               |
      | transaction_id too long       | message.transaction_id                                   | "TXN0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000" |
      | missing search_request        | message.search_request                                   | <removed>                               |
      | empty search_request          | message.search_request                                   | []                                      |
      | missing reference_id          | message.search_request.0.reference_id                    | <removed>                               |
      | missing timestamp             | message.search_request.0.timestamp                       | <removed>                               |
      | invalid timestamp             | message.search_request.0.timestamp                       | "yesterday"                             |
      | missing search_criteria       | message.search_request.0.search_criteria                 | <removed>                               |
      | missing query_type            | message.search_request.0.search_criteria.query_type      | <removed>                               |
      | unknown query_type            | message.search_request.0.search_criteria.query_type      | "sql"                                   |
      | graphql is not an ESS search  | message.search_request.0.search_criteria.query_type      | "graphql"                               |
      | missing query                 | message.search_request.0.search_criteria.query           | <removed>                               |
      | query not matching type       | message.search_request.0.search_criteria.query           | [{"expression1":{"attribute_name":"employment_status","operator":"eq","attribute_value":"6"}}] |
      | idtype-value without value    | message.search_request.0.search_criteria.query           | {"type":"UIN"}                          |
      | unknown reg_record_type       | message.search_request.0.search_criteria.reg_record_type | "Household"                             |
      | unknown response_entity       | message.search_request.0.search_criteria.response_entity | "Person"                                |
      | invalid locale                | message.search_request.0.locale                          | "english"                               |
      | pagination without page_size  | message.search_request.0.search_criteria.pagination      | {"page_number":1}                       |
      | page_size zero                | message.search_request.0.search_criteria.pagination      | {"page_size":0}                         |
      | invalid sort order            | message.search_request.0.search_criteria.sort            | [{"attribute_name":"registration_date","sort_order":"up"}] |
      | consent with invalid ts       | message.search_request.0.search_criteria.consent         | {"ts":"now"}                            |

    Examples: Predicate query
      | case                        | field                                    | value                                   |
      | unknown operator            | message.search_request.0.search_criteria | {"query_type":"predicate","query":[{"expression1":{"attribute_name":"employment_status","operator":"like","attribute_value":"6"}}]} |
      | unknown condition           | message.search_request.0.search_criteria | {"query_type":"predicate","query":[{"expression1":{"attribute_name":"employment_status","operator":"eq","attribute_value":"6"},"condition":"xor","expression2":{"attribute_name":"is_disabled","operator":"eq","attribute_value":true}}]} |
      | expression without operator | message.search_request.0.search_criteria | {"query_type":"predicate","query":[{"expression1":{"attribute_name":"employment_status","attribute_value":"6"}}]} |
      | empty predicate             | message.search_request.0.search_criteria | {"query_type":"predicate","query":[]}  |

  @negative
  Scenario: A body that is not JSON is rejected
    When the raw body "this is not json" is sent
    Then the request should be rejected according to the DCI error model
