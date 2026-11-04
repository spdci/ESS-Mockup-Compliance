@method=POST @endpoint=ess/notify
Feature: Enrolment notifications between the ESS and the SP-MIS (POST /registry/notify)

Notifications flow both ways in the ESS standard. The subscriber exposes /registry/notify
and is called when a subscribed event occurs: a new enrolment / referral (enrolment) or a
change of enrolment status (enrolment_status_change).
  - ESS -> SP-MIS (endpoint "notify"): process flow 2, an employment support applicant is
    referred to a social assistance programme; PRS.EMP.04 case management updates.
  - SP-MIS -> ESS (endpoint "notify ess"): process flow 1, social protection beneficiaries
    are referred to an employment support programme.
The notification carries a callback header (action "notify") and a NotifyEventRequest;
reg_records may be a list or a single record (RegistryRecord.yaml, process flow examples).
Every record notified is checked against the ESS data rules before it is sent.

  @smoke
  Scenario Outline: Successfully notify a referral (<direction>)
    Given the "<endpoint>" endpoint
    And a notify request for a "enrolment" event carrying the "<profile>" Member record
    Then the request should be a valid "notify" message
    When the request is sent
    Then the HTTP status should be 200
    And the response should have a JSON content type
    And the response should be received within 15000 ms
    And the response should be a valid acknowledgement with ack_status "ACK"

    Examples:
      | direction     | endpoint   | profile    |
      | ESS to SP-MIS | notify     | unemployed |
      | SP-MIS to ESS | notify ess | jobseeker  |

  @functional
  Scenario Outline: A "<event>" notification carrying the <profile> <type> record is acknowledged by <endpoint>
    Given the "<endpoint>" endpoint
    And a notify request for a "<event>" event carrying the "<profile>" <type> record
    Then the request should be a valid "notify" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

    Examples: Referrals to social assistance (process flow 2, ESS to SP-MIS)
      | endpoint | event     | type   | profile           |
      | notify   | enrolment | Member | unemployed        |
      | notify   | enrolment | Member | disabled          |
      | notify   | enrolment | Member | disabled by label |
      | notify   | enrolment | Group  | large             |
      | notify   | enrolment | Group  | disability        |

    Examples: Referrals to employment support (process flow 1, SP-MIS to ESS)
      | endpoint   | event     | type      | profile   |
      | notify ess | enrolment | Member    | jobseeker |
      | notify ess | enrolment | Member    | head      |
      | notify ess | enrolment | ESSPerson | jobseeker |
      | notify ess | enrolment | Group     | single    |

    Examples: Case management status changes (PRS.EMP.04)
      | endpoint   | event                   | type   | profile  |
      | notify     | enrolment_status_change | Member | seasonal |
      | notify     | enrolment_status_change | Member | deceased |
      | notify     | enrolment_status_change | Member | student  |
      | notify ess | enrolment_status_change | Member | full     |
      | notify ess | enrolment_status_change | Member | minimal  |

    Examples: Namespaced event type
      | endpoint | event                                            | type   | profile    |
      | notify   | ns:org:RegistryEventType:enrolment               | Member | unemployed |
      | notify   | ns:org:RegistryEventType:enrolment_status_change | Group  | full       |

  @functional
  Scenario Outline: The published process flow <flow> notification is acknowledged
    Given the "<endpoint>" endpoint
    And a notify request for a "enrolment" event carrying the published "process flow <flow>" Member example
    Then the request should be a valid "notify" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

    Examples:
      | flow | endpoint   |
      | 1    | notify ess |
      | 2    | notify     |

  @functional
  Scenario Outline: reg_records may be a single <type> object, as declared in the spec
    Given the "notify" endpoint
    And a notify request for a "enrolment_status_change" event carrying the "<profile>" <type> record as a single object
    Then the request should be a valid "notify" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

    Examples:
      | type      | profile  |
      | Member    | disabled |
      | ESSPerson | deceased |
      | Group     | full     |

  @functional
  Scenario: A batch notification covers every affected record
    Given the "notify" endpoint
    And a batch notify request for "enrolment_status_change" events carrying "Member:deceased, Member:seasonal, Member:disabled, Group:disability"
    Then the request should be a valid "notify" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

  # ---------------------------------------------------------------------------
  # Well-formed but inconsistent data is detected before it is sent
  # ---------------------------------------------------------------------------
  @strict-data
  Scenario Outline: An inconsistent referral is detected: <case>
    Given the "notify" endpoint
    And a notify request for a "enrolment" event carrying the "<profile>" Member record with "<attribute>" set to '<value>'
    Then the request should not be a valid "notify" message because of "<error>"

    Examples:
      | case                                   | profile    | attribute           | value                    | error                                 |
      | unemployed but a job still running     | unemployed | employment_info.0.end_date | <removed>         | is still running                      |
      | employed with an unemployment reason   | unemployed | employment_status   | "Employee"               | says the member is employed           |
      | job ends before it starts              | unemployed | employment_info.0.end_date | "2000-01-01"      | is before start_date                  |
      | disabled flag contradicts limitations  | disabled   | is_disabled         | 0                        | but disability_info reports           |

  # ---------------------------------------------------------------------------
  # Notifications that break the spec must be refused
  # ---------------------------------------------------------------------------
  @negative
  Scenario Outline: An invalid notification to the <endpoint> endpoint is rejected: <case>
    Given the "<endpoint>" endpoint
    And a valid request
    And the request field "<field>" becomes '<value>'
    When the request is sent
    Then the request should be rejected according to the DCI error model

    Examples: Envelope and event
      | endpoint   | case                        | field                                           | value                  |
      | notify     | missing header              | header                                          | <removed>              |
      | notify     | wrong action                | header.action                                   | "on-search"            |
      | notify     | message header, not callback | header.status                                  | <removed>              |
      | notify     | missing transaction_id      | message.transaction_id                          | <removed>              |
      | notify     | empty notify_event          | message.notify_event                            | []                     |
      | notify     | missing reference_id        | message.notify_event.0.reference_id             | <removed>              |
      | notify     | invalid timestamp           | message.notify_event.0.timestamp                | "now"                  |
      | notify     | missing data                | message.notify_event.0.data                     | <removed>              |
      | notify     | missing reg_record_type     | message.notify_event.0.data.reg_record_type     | <removed>              |
      | notify     | missing reg_records         | message.notify_event.0.data.reg_records         | <removed>              |
      | notify     | unknown ESS event           | message.notify_event.0.data.reg_event_type      | "hired"                |
      | notify     | IBR event spelling          | message.notify_event.0.data.reg_event_type      | "enrollement"          |
      | notify     | unknown record type         | message.notify_event.0.data.reg_record_type     | "Beneficiary"          |
      | notify     | invalid locale              | message.notify_event.0.locale                   | "english"              |
      | notify ess | missing header              | header                                          | <removed>              |
      | notify ess | wrong action                | header.action                                   | "subscribe"            |
      | notify ess | empty notify_event          | message.notify_event                            | []                     |
      | notify ess | unknown ESS event           | message.notify_event.0.data.reg_event_type      | "REGISTER"             |

    @strict-data
    Examples: ESS data in the notification
      | endpoint   | case                            | field                                                         | value         |
      | notify     | employment status free text     | message.notify_event.0.data.reg_records.0.employment_status   | "unemployed"  |
      | notify     | unemployment reason free text   | message.notify_event.0.data.reg_records.0.unemployment_reason | "fired"       |
      | notify     | employment info end not a date  | message.notify_event.0.data.reg_records.0.employment_info.0.end_date | "end of 2024" |
      | notify     | phone not E.164                 | message.notify_event.0.data.reg_records.0.demographic_info.phone_number | ["+0"] |
      | notify     | birth date not ISO 8601         | message.notify_event.0.data.reg_records.0.demographic_info.birth_date | "15-03-1982" |
      | notify ess | employment status free text     | message.notify_event.0.data.reg_records.employment_status     | "jobless"     |
      | notify ess | employment type free text       | message.notify_event.0.data.reg_records.employment_info.0.employment_type | "temp" |
      | notify ess | identifier type outside list    | message.notify_event.0.data.reg_records.member_identifier.0.identifier_type | "Passport" |
      | notify ess | sex outside the list            | message.notify_event.0.data.reg_records.demographic_info.sex  | "M"           |
