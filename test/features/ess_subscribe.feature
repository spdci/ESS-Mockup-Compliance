@method=POST @endpoint=ess/subscribe
Feature: Subscribe to Employment Support System events (POST /registry/subscribe)

This API is exposed by the ESS (and by the SP-MIS, process flow 1) and called by systems
that want to be alerted when persons are enrolled (referrals, PRS.EMP.01 / PRS.EMP.02) or
when their enrolment status changes (case management, PRS.EMP.04).
The subscriber names the ESS event (RegistryEventType: enrolment, enrolment_status_change),
the record type to be notified with and the persons to watch (filter). The ESS acknowledges
the request and delivers the subscription result (SubscribeResponse with subscription codes)
to the on-subscribe callback.

  Background:
    Given the "subscribe" endpoint

  @smoke
  Scenario: A subscription to new enrolments is acknowledged
    Given a subscribe request for "enrolment" events on Member records filtered by "idtype-value"
    Then the request should be a valid "subscribe" message
    When the request is sent
    Then the HTTP status should be 200
    And the response should have a JSON content type
    And the response should be received within 15000 ms
    And the response should be a valid acknowledgement with ack_status "ACK"

  @functional
  Scenario Outline: Subscription to "<event>" events on <type> records filtered by <filter type> is acknowledged
    Given a subscribe request for "<event>" events on <type> records filtered by "<filter type>"
    Then the request should be a valid "subscribe" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

    Examples: Record types
      | event                   | type      | filter type  |
      | enrolment               | Member    | idtype-value |
      | enrolment               | Group     | idtype-value |
      | enrolment               | ESSPerson | idtype-value |
      | enrolment_status_change | Member    | idtype-value |
      | enrolment_status_change | Group     | idtype-value |

    Examples: Filter types (common QueryType, process flows 1 and 2 use GraphQL)
      | event                   | type   | filter type |
      | enrolment               | Member | predicate   |
      | enrolment               | Member | expression  |
      | enrolment               | Member | graphql     |
      | enrolment_status_change | Member | graphql     |

    Examples: Namespaced event type
      | event                                           | type   | filter type  |
      | ns:org:RegistryEventType:enrolment               | Member | idtype-value |
      | ns:org:RegistryEventType:enrolment_status_change | Member | predicate    |

  @functional
  Scenario: A batch subscription for several record types is acknowledged
    Given a subscribe request for "enrolment_status_change" events on the record types "Member, Group, ESSPerson"
    Then the request should be a valid "subscribe" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

  # ---------------------------------------------------------------------------
  # Full async round trip
  # ---------------------------------------------------------------------------
  @callback
  Scenario Outline: The subscription result for "<event>" on <type> records is delivered to the on-subscribe callback
    Given a subscribe request for "<event>" events on <type> records filtered by "<filter type>"
    And the callback listener is used as sender_uri
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"
    And an "on-subscribe" callback should be received
    And the callback should be a valid "on-subscribe" message
    And every subscription should be confirmed with a subscription code
    And every subscription should echo the requested event and record type

    Examples:
      | event                   | type   | filter type  |
      | enrolment               | Member | idtype-value |
      | enrolment               | Member | graphql      |
      | enrolment_status_change | Member | predicate    |
      | enrolment               | Group  | idtype-value |

  @callback
  Scenario: Every item of a batch subscription is confirmed in the on-subscribe callback
    Given a subscribe request for "enrolment" events on the record types "Member, Group, ESSPerson"
    And the callback listener is used as sender_uri
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"
    And an "on-subscribe" callback should be received
    And the callback should be a valid "on-subscribe" message
    And every subscription should be confirmed with a subscription code
    And every subscription should echo the requested event and record type

  # ---------------------------------------------------------------------------
  # Requests that break the spec must be refused
  # ---------------------------------------------------------------------------
  @negative
  Scenario Outline: An invalid subscription is rejected: <case>
    Given a valid request
    And the request field "<field>" becomes '<value>'
    When the request is sent
    Then the request should be rejected according to the DCI error model

    Examples:
      | case                           | field                                                               | value         |
      | missing header                 | header                                                              | <removed>     |
      | wrong action                   | header.action                                                       | "search"      |
      | missing message                | message                                                             | <removed>     |
      | missing transaction_id         | message.transaction_id                                              | <removed>     |
      | empty subscribe_request        | message.subscribe_request                                           | []            |
      | missing subscribe_criteria     | message.subscribe_request.0.subscribe_criteria                      | <removed>     |
      | missing reg_event_type         | message.subscribe_request.0.subscribe_criteria.reg_event_type       | <removed>     |
      | an SR event                    | message.subscribe_request.0.subscribe_criteria.reg_event_type       | "REGISTER"    |
      | an IBR spelling                | message.subscribe_request.0.subscribe_criteria.reg_event_type       | "enrollement" |
      | event in upper case            | message.subscribe_request.0.subscribe_criteria.reg_event_type       | "ENROLMENT"   |
      | missing filter                 | message.subscribe_request.0.subscribe_criteria.filter               | <removed>     |
      | filter not matching type       | message.subscribe_request.0.subscribe_criteria.filter               | [{"expression1":{"attribute_name":"employment_status","operator":"eq","attribute_value":"6"}}] |
      | unknown filter_type            | message.subscribe_request.0.subscribe_criteria.filter_type          | "sql"         |
      | missing notify_record_type     | message.subscribe_request.0.subscribe_criteria.notify_record_type   | <removed>     |
      | unknown notify_record_type     | message.subscribe_request.0.subscribe_criteria.notify_record_type   | "Programme"   |
      | frequency without end_time     | message.subscribe_request.0.subscribe_criteria.frequency.end_time   | <removed>     |
      | frequency start not ISO 8601   | message.subscribe_request.0.subscribe_criteria.frequency.start_time | "tomorrow"    |
      | frequency without frequency    | message.subscribe_request.0.subscribe_criteria.frequency.frequency  | <removed>     |
      | authorize ts as in flow 1      | message.subscribe_request.0.subscribe_criteria.authorize.ts         | {"$ref":"#/components/schemas/SubscriptionInfo/properties/timestamp"} |
      | invalid locale                 | message.subscribe_request.0.locale                                  | "en"          |
      | missing reference_id           | message.subscribe_request.0.reference_id                            | <removed>     |
