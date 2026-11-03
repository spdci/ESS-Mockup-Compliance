@data
Feature: ESS group data rules (Group: households and families)

An ESS Group (Group.jsonld, a core Group) is a household or family of members, as
searched in process flow 3 (proactive enrolment of SP registered households). Every
attribute is optional, but whenever one IS sent it must be correct: group_type from the
AssistanceUnit list (code or label), identifiers as a list, a Place for
geographical_location, numeric poverty score, integer group size, valid members, and a
group consistent with its members.

This feature runs offline and proves the rules applied to every group returned or sent
by the API scenarios.

Sources: extensions/ess/v1/data/Group.jsonld, core/v1/data (Group, Place, Address,
Member), core/v1/code/AssistanceUnit, ESS process flow 3.

  @smoke
  Scenario Outline: Reference group "<record>" is valid ESS data
    Given the "<record>" Group record
    Then the record should be valid

    Examples:
      | record     |
      | full       |
      | disability |
      | large      |
      | single     |
      | minimal    |

  Scenario: A group with no attribute at all is accepted (nothing is mandatory)
    Given an empty Group record
    Then the record should be valid

  Scenario: The published process flow 3 group does not follow the ESS data standard
    Given the "process flow 3" Group record
    Then the record should be rejected because of:
      | /group_identifier must be array      |
      | /geographical_location must be object |

  Scenario Outline: Optional attribute "<attribute>" may be omitted
    Given the "full" Group record
    When its "<attribute>" attribute is removed
    Then the record should be valid

    Examples:
      | attribute                      |
      | @context                       |
      | group_identifier               |
      | group_type                     |
      | geographical_location          |
      | geographical_location.geo      |
      | poverty_score                  |
      | poverty_score_type             |
      | group_head_info                |
      | group_size                     |
      | member_list                    |
      | registration_date              |
      | last_updated                   |
      | additional_attributes          |

  Scenario Outline: Every <list> value is accepted for group_type
    Given the "minimal" Group record
    Then every "<list>" code should be accepted as "group_type"

    Examples:
      | list                |
      | assistanceUnit      |
      | assistanceUnitLabel |

  Scenario: Group type codes are also accepted as JSON integers
    Given the "minimal" Group record
    Then every "assistanceUnit" code should be accepted as a JSON integer for "group_type"

  Scenario Outline: "<attribute>" accepts the correct value <value>
    Given the "full" Group record
    When its "<attribute>" attribute is set to '<value>'
    Then the record should be valid

    Examples:
      | attribute             | value                                                                |
      | group_type            | "household"                                                          |
      | group_type            | "Family"                                                             |
      | poverty_score         | 0                                                                    |
      | poverty_score         | 12.75                                                                |
      | group_size            | 6                                                                    |
      | member_list           | []                                                                   |
      | geographical_location | {"name":"Anytown","contained_in_place":"Bangkok"}                    |
      | geographical_location | {"name":"Anytown","contains_place":[{"name":"Block A"}]}             |
      | address               | [{"address_line_1":"123 Main St","country_code":"TH"}]               |
      | additional_attributes | [{"name":"dwelling_type","value":"rural"},{"notes":"Eligible"}]      |

  Scenario Outline: "<attribute>" rejects the incorrect value <value>
    Given the "full" Group record
    When its "<attribute>" attribute is set to '<value>'
    Then the record should be rejected because of "<error>"

    Examples:
      | attribute                      | value                                            | error                                                        |
      | group_identifier               | {"identifier_type":"UIN","identifier_value":"1"} | /group_identifier must be array                              |
      | group_identifier               | []                                               | /group_identifier must NOT have fewer than 1 items           |
      | group_identifier.0.identifier_type | "GROUPID"                                    | /group_identifier/0/identifier_type must be equal to one of the allowed values |
      | group_type                     | "clan"                                           | /group_type must be equal to one of the allowed values       |
      | group_type                     | "4"                                              | /group_type must be equal to one of the allowed values       |
      | geographical_location          | "Bangkok"                                        | /geographical_location must be object                        |
      | geographical_location.geo.latitude | 100                                          | /geographical_location/geo/latitude must be <= 90            |
      | place_address                  | "address"                                        | /place_address must be equal to one of the allowed values    |
      | poverty_score                  | "3.75"                                           | /poverty_score must be number                                |
      | poverty_score_type             | ""                                               | /poverty_score_type must NOT have fewer than 1 characters    |
      | group_size                     | "4"                                              | /group_size must be integer                                  |
      | group_size                     | 4.5                                              | /group_size must be integer                                  |
      | group_size                     | 0                                                | /group_size must be >= 1                                     |
      | member_list                    | {"member_identifier":[]}                         | /member_list must be array                                   |
      | member_list.1.employment_status | "jobless"                                       | /member_list/1/employment_status must be equal to one of the allowed values |
      | member_list.0.demographic_info.sex | "F"                                          | /member_list/0/demographic_info/sex must be equal to one of the allowed values |
      | group_head_info                | "Alice Smith"                                    | /group_head_info must be object                              |
      | group_head_info.education_level | "bachelor"                                      | /group_head_info/education_level must be equal to one of the allowed values |
      | registration_date              | "15/01/2026"                                     | /registration_date must match pattern                        |
      | additional_attributes          | [{"a":1,"b":2}]                                  | /additional_attributes/0 must NOT have more than 1 properties |

  Scenario Outline: Group attributes must be consistent: <rule>
    Given the "<record>" Group record
    When its "<attribute>" attribute is set to '<value>'
    Then the record should be rejected because of "<error>"

    Examples:
      | rule                                   | record     | attribute                       | value                                                         | error                                                          |
      | more members than the group size       | full       | group_size                      | 3                                                             | member_list has 4 members, more than group_size 3              |
      | an individual unit with several members | full      | group_type                      | "Member (Person/Individual)"                                  | has more than one member                                       |
      | a member listed twice                  | full       | member_list.1.member_identifier | [{"identifier_type":"UIN","identifier_value":"M100000001"}]   | member_list[1] repeats member UIN\|M100000001 of member_list[0] |
      | head not among the members             | large      | group_head_info                 | {"member_identifier":[{"identifier_type":"UIN","identifier_value":"M999"}]} | group_head_info (UIN\|M999) is not one of the members |
      | address chosen but not given           | full       | address                         | <removed>                                                     | place_address is 0 (use address) but no address is given       |
      | place chosen but not given             | disability | geographical_location           | <removed>                                                     | place_address is 1 (use place) but no geographical_location   |
      | updated before registration            | full       | last_updated                    | "2020-01-01"                                                  | last_updated 2020-01-01 is before registration_date 2022-01-10 |
      | registered in the future               | full       | registration_date               | "2999-01-01"                                                  | registration_date "2999-01-01" is in the future                |
      | a member breaks the employment rules   | full       | member_list.1.employment_status | "1"                                                           | member_list[1].unemployment_reason                             |
      | a member breaks the disability rules   | disability | member_list.1.is_disabled       | false                                                         | member_list[1].is_disabled is false but disability_info reports |
      | the head breaks the person rules       | full       | group_head_info.demographic_info.death_date | "1980-01-01"                       | group_head_info.demographic_info.death_date 1980-01-01 is before birth_date |
