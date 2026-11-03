@method=POST @endpoint=ess/on-search
Feature: Receive async search results from the ESS (POST /registry/on-search)

This API is exposed by the SP-MIS to receive search results from the ESS.
The suite plays the ESS: every payload it sends is first checked against the spec
(including the ESS data rules for persons, members and groups), then the SP-MIS must
acknowledge it. Payloads with incorrect optional data must be refused.

  Background:
    Given the "on-search" endpoint

  @smoke
  Scenario: Successfully receive async search results from the ESS
    Given an on-search callback carrying the "full" Member record
    Then the request should be a valid "on-search" message
    When the request is sent
    Then the HTTP status should be 200
    And the response should have a JSON content type
    And the response should be received within 15000 ms
    And the response should be a valid acknowledgement with ack_status "ACK"

  @functional
  Scenario Outline: Results carrying the <profile> <type> record are acknowledged
    Given an on-search callback carrying the "<profile>" <type> record
    Then the request should be a valid "on-search" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

    Examples: Persons
      | type      | profile   |
      | ESSPerson | full      |
      | ESSPerson | multi     |
      | ESSPerson | child     |
      | ESSPerson | deceased  |
      | ESSPerson | jobseeker |
      | ESSPerson | minimal   |

    Examples: Members
      | type   | profile        |
      | Member | full           |
      | Member | unemployed     |
      | Member | student        |
      | Member | child          |
      | Member | seasonal       |
      | Member | deceased       |
      | Member | jobseeker      |
      | Member | minimal        |
      | Member | process flow 1 |
      | Member | process flow 2 |

    @pwd
    Examples: Persons with disability
      | type   | profile           |
      | Member | disabled          |
      | Member | disabled by label |

    Examples: Groups
      | type  | profile    |
      | Group | full       |
      | Group | disability |
      | Group | large      |
      | Group | single     |
      | Group | minimal    |

  @functional
  Scenario Outline: Results carrying several <type> records are acknowledged
    Given an on-search callback carrying the <type> records "<records>"
    Then the request should be a valid "on-search" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

    Examples:
      | type      | records                                     |
      | ESSPerson | full, deceased, child                       |
      | Member    | unemployed, disabled, jobseeker, head       |
      | Group     | full, disability, large, single, minimal    |

  @functional
  Scenario: Untyped reg_records are Member records, as declared by the spec
    Given an on-search callback carrying the "jobseeker" Member record without a reg_record_type
    Then the request should be a valid "on-search" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

  @functional
  Scenario Outline: An empty <type> result is acknowledged
    Given an on-search callback with an empty <type> result
    Then the request should be a valid "on-search" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

    Examples:
      | type      |
      | ESSPerson |
      | Member    |
      | Group     |

  @functional
  Scenario Outline: A rejected search with reason code <code> is acknowledged
    Given an on-search callback rejected with reason code "<code>"
    Then the request should be a valid "on-search" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

    Examples: SearchStatusReasonCode
      | code                               |
      | rjct.reference_id.invalid          |
      | rjct.reference_id.duplicate        |
      | rjct.timestamp.invalid             |
      | rjct.search_criteria.invalid       |
      | rjct.filter.invalid                |
      | rjct.sort.invalid                  |
      | rjct.pagination.invalid            |
      | rjct.search.too_many_records_found |

  @negative
  Scenario Outline: An invalid on-search callback is rejected: <case>
    Given a valid request
    And the request field "<field>" becomes '<value>'
    When the request is sent
    Then the request should be rejected according to the DCI error model

    Examples: Envelope and header
      | case                       | field                     | value          |
      | missing header             | header                    | <removed>      |
      | wrong action               | header.action             | "search"       |
      | missing header status      | header.status             | <removed>      |
      | unknown header status      | header.status             | "done"         |
      | unknown header reason code | header.status_reason_code | "rjct.unknown" |
      | missing message_ts         | header.message_ts         | <removed>      |

    Examples: Search response
      | case                         | field                                          | value               |
      | missing transaction_id       | message.transaction_id                         | <removed>           |
      | missing correlation_id       | message.correlation_id                         | <removed>           |
      | correlation_id invalid chars | message.correlation_id                         | "ESS 0001"          |
      | missing search_response      | message.search_response                        | <removed>           |
      | missing status               | message.search_response.0.status               | <removed>           |
      | status as in process flow 3  | message.search_response.0.status               | "success"           |
      | unknown reason code          | message.search_response.0.status_reason_code   | "ok"                |
      | data without reg_records     | message.search_response.0.data                 | {"version":"1.0.0"} |
      | unknown reg_record_type      | message.search_response.0.data.reg_record_type | "Programme"         |
      | pagination missing total     | message.search_response.0.pagination           | {"page_size":1,"page_number":1} |
      | locale not ISO 639-3         | message.search_response.0.locale               | "en"                |

    @strict-data
    Examples: Member data in the result (optional, but must be correct when sent)
      | case                               | field                                                                          | value                 |
      | reg_records not an array           | message.search_response.0.data.reg_records                                     | {"employment_status":"1"} |
      | member identifier as a string      | message.search_response.0.data.reg_records.0.member_identifier                 | "M100000001"          |
      | identifier type outside the list   | message.search_response.0.data.reg_records.0.member_identifier.0.identifier_type | "NationalID"        |
      | employment status not in the list  | message.search_response.0.data.reg_records.0.employment_status                 | "employed"            |
      | employment status code out of range | message.search_response.0.data.reg_records.0.employment_status                | "8"                   |
      | occupation as free text            | message.search_response.0.data.reg_records.0.occupation                        | "teacher"             |
      | education level as free text       | message.search_response.0.data.reg_records.0.education_level                   | "bachelor"            |
      | marital status unknown             | message.search_response.0.data.reg_records.0.marital_status                    | "partnered"           |
      | language not ISO 639               | message.search_response.0.data.reg_records.0.language_code                     | ["English"]           |
      | unemployment reason unknown        | message.search_response.0.data.reg_records.0.unemployment_reason               | "laid off"            |
      | employment type unknown            | message.search_response.0.data.reg_records.0.employment_info.1.employment_type | "Full time"           |
      | employment start not ISO 8601      | message.search_response.0.data.reg_records.0.employment_info.1.start_date      | "01/09/2012"          |
      | employer empty                     | message.search_response.0.data.reg_records.0.employment_info.1.employer        | ""                    |
      | relationship as free text          | message.search_response.0.data.reg_records.0.related_person.0.relationship_type | "spouse"             |
      | person sex outside the list        | message.search_response.0.data.reg_records.0.demographic_info.sex              | "F"                   |
      | person phone not E.164             | message.search_response.0.data.reg_records.0.demographic_info.phone_number     | ["0891234567"]        |
      | person e-mail invalid              | message.search_response.0.data.reg_records.0.demographic_info.email            | ["alice.example.org"] |
      | is_disabled as text                | message.search_response.0.data.reg_records.0.is_disabled                       | "no"                  |

    @strict-data @pwd
    Examples: Disability data in the result
      | case                               | field                          | value                 |
      | functional domain unknown          | message.search_response.0.data | {"reg_record_type":"Member","reg_records":[{"is_disabled":true,"disability_info":[{"disability_limitation_type":"BLIND","functional_severity":"4"}]}]} |
      | functional severity out of range   | message.search_response.0.data | {"reg_record_type":"Member","reg_records":[{"is_disabled":true,"disability_info":[{"disability_limitation_type":"VIS_SS","functional_severity":"5"}]}]} |
      | disability_info not a list         | message.search_response.0.data | {"reg_record_type":"Member","reg_records":[{"is_disabled":true,"disability_info":{"disability_limitation_type":"MOB_SS"}}]} |

    @strict-data
    Examples: Person and group data in the result
      | case                           | field                          | value                 |
      | person name without names      | message.search_response.0.data | {"reg_record_type":"ESSPerson","reg_records":[{"name":{"prefix":"Ms."}}]} |
      | group identifier not a list    | message.search_response.0.data | {"reg_record_type":"Group","reg_records":[{"group_identifier":{"identifier_type":"UIN","identifier_value":"GRP-001"}}]} |
      | group type as free text        | message.search_response.0.data | {"reg_record_type":"Group","reg_records":[{"group_type":"clan"}]} |
      | group location as text         | message.search_response.0.data | {"reg_record_type":"Group","reg_records":[{"geographical_location":"Bangkok"}]} |
      | group size as text             | message.search_response.0.data | {"reg_record_type":"Group","reg_records":[{"group_size":"4"}]} |
      | group poverty score as text    | message.search_response.0.data | {"reg_record_type":"Group","reg_records":[{"poverty_score":"3.75"}]} |

  # ---------------------------------------------------------------------------
  # Data that is well-formed but inconsistent: detected by the ESS data rules
  # ---------------------------------------------------------------------------
  @strict-data
  Scenario Outline: Inconsistent <type> data in an on-search payload is detected: <case>
    Given an on-search callback carrying the "<profile>" <type> record with "<attribute>" set to '<value>'
    Then the request should not be a valid "on-search" message because of "<error>"

    Examples: Employment
      | case                                  | type   | profile | attribute                    | value        | error                                         |
      | unemployment reason while employed    | Member | full    | unemployment_reason          | "1"          | says the member is employed                   |
      | not employed but a job still running  | Member | full    | employment_status            | "6"          | is still running                              |
      | employment ends before it starts      | Member | full    | employment_info.0.end_date   | "2001-01-01" | is before start_date                          |
      | employment starts before birth        | Member | full    | employment_info.0.start_date | "1980-01-01" | is before demographic_info.birth_date         |
      | overlapping jobs at one employer      | Member | full    | employment_info.0            | {"employer":"Anytown Primary School","start_date":"2015-01-01","end_date":"2016-01-01"} | overlap for the same employer |
      | employment starts in the future       | Member | full    | employment_info.1.start_date | "2099-09-01" | is in the future                              |

    @pwd
    Examples: Disability
      | case                                  | type   | profile  | attribute                                    | value                     | error                                     |
      | severe limitation but not disabled    | Member | disabled | is_disabled                                  | false                     | but disability_info reports |
      | disabled but no difficulty at all     | Member | disabled | disability_info                              | [{"disability_limitation_type":"MOB_SS","functional_severity":"1"}] | every disability_info entry reports |
      | severity without a domain             | Member | disabled | disability_info.0.disability_limitation_type | <removed>                 | without the disability_limitation_type    |
      | the same domain listed twice          | Member | disabled | disability_info.1.disability_limitation_type | "MOB_SS"                  | more than once                            |

    Examples: Dates
      | case                           | type      | profile  | attribute                          | value        | error                                    |
      | birth date not a calendar day  | Member    | full     | demographic_info.birth_date        | "1985-02-30" | is not a valid ISO 8601 calendar date    |
      | registration in the future     | Member    | full     | registration_date                  | "2099-01-01" | is in the future                         |
      | updated before registration    | Member    | full     | last_updated                       | "2020-01-01" | is before registration_date              |
      | death before birth             | ESSPerson | deceased | death_date                         | "1930-01-01" | is before birth_date                     |

    Examples: Groups
      | case                          | type  | profile | attribute                        | value                  | error                    |
      | more members than group size  | Group | full    | group_size                       | 2                      | more than group_size     |
      | a member listed twice         | Group | full    | member_list.1.member_identifier  | [{"identifier_type":"UIN","identifier_value":"M100000001"}] | repeats member |
      | address chosen but not given  | Group | full    | address                          | <removed>              | but no address is given  |
      | individual group with members | Group | full    | group_type                       | "1"                    | has more than one member |
