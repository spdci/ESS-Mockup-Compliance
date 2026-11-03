@method=POST @endpoint=ess/txn/on-status
Feature: Receive a transaction status from the ESS (POST /registry/txn/on-status)

This API is exposed by the SP-MIS to receive the status of a previous transaction: a search
(SearchResponse), a subscription (SubscribeResponse), the receipt of members
(ReceiptRequest) or an enrolment check (EnrolledResponse, txn_type "enrolled"). The suite
plays the ESS: every payload, including the ESS data it carries, is first checked against
the spec.

  Background:
    Given the "txn on-status" endpoint

  @smoke
  Scenario: Successfully receive the status of a search transaction
    Given a txn on-status callback for a "search" transaction
    Then the request should be a valid "txn-on-status" message
    When the request is sent
    Then the HTTP status should be 200
    And the response should have a JSON content type
    And the response should be received within 15000 ms
    And the response should be a valid acknowledgement with ack_status "ACK"

  @functional
  Scenario Outline: The status of a <txn type> transaction is acknowledged
    Given a txn on-status callback for a "<txn type>" transaction
    Then the request should be a valid "txn-on-status" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

    Examples:
      | txn type  |
      | search    |
      | subscribe |
      | receipt   |
      | enrolled  |

  @functional
  Scenario Outline: The status of a search returning the <profile> <type> record is acknowledged
    Given a txn on-status callback for a search of the "<profile>" <type> record
    Then the request should be a valid "txn-on-status" message
    When the request is sent
    Then the response should be a valid acknowledgement with ack_status "ACK"

    Examples:
      | type      | profile           |
      | Member    | unemployed        |
      | Member    | disabled          |
      | Member    | disabled by label |
      | ESSPerson | deceased          |
      | Group     | large             |

  @negative
  Scenario Outline: An invalid txn/on-status callback is rejected: <case>
    Given a valid request
    And the request field "<field>" becomes '<value>'
    When the request is sent
    Then the request should be rejected according to the DCI error model

    Examples:
      | case                               | field                                                          | value          |
      | missing header                     | header                                                         | <removed>      |
      | wrong action                       | header.action                                                  | "txn-status"   |
      | missing header status              | header.status                                                  | <removed>      |
      | missing correlation_id             | message.correlation_id                                         | <removed>      |
      | missing txn_type                   | message.txnstatus_response.txn_type                            | <removed>      |
      | unknown txn_type                   | message.txnstatus_response.txn_type                            | "notify"       |
      | txn_status not matching txn_type   | message.txnstatus_response.txn_type                            | "receipt"      |
      | missing txn_status                 | message.txnstatus_response.txn_status                          | <removed>      |
      | search result with invalid status  | message.txnstatus_response.txn_status.search_response.0.status | "found"        |
      | search result without data records | message.txnstatus_response.txn_status.search_response.0.data   | {"reg_record_type":"Member"} |

    @strict-data
    Examples: ESS data in the transaction status
      | case                              | field                                                                                          | value      |
      | employment status as free text    | message.txnstatus_response.txn_status.search_response.0.data.reg_records.0.employment_status   | "working"  |
      | employment type as free text      | message.txnstatus_response.txn_status.search_response.0.data.reg_records.0.employment_info.0.employment_type | "contract" |
      | member relationship as free text  | message.txnstatus_response.txn_status.search_response.0.data.reg_records.0.related_person.0.relationship_type | "spouse" |
      | receipt without beneficiaries     | message.txnstatus_response                                                                     | {"txn_type":"receipt","txn_status":{"transaction_id":"T1","receipt_information":{"beneficiaries":[]}}} |
      | receipt member with bad sex       | message.txnstatus_response                                                                     | {"txn_type":"receipt","txn_status":{"transaction_id":"T1","receipt_information":{"beneficiaries":[{"demographic_info":{"sex":"M"}}]}}} |
      | enrolled status not in code list  | message.txnstatus_response                                                                     | {"txn_type":"enrolled","txn_status":{"transaction_id":"T1","correlation_id":"C1","enrolled_response":[{"reference_id":"R1","timestamp":"2026-01-01T00:00:00Z","status":"succ","enrolled_status":"Enrolled"}]}} |
