@data @pwd
Feature: ESS data rules for persons with disability (Member.is_disabled, DisabilityInfo)

In the ESS a person with disability is a Member flagged with is_disabled and described by
disability_info: one DisabilityInfo per functional domain of the Washington Group Short
Set (disability_limitation_type: VIS_SS, HEAR_SS, MOB_SS, COG_SS, SC_SS, COM_SS) with its
functional_severity (1 no difficulty, 2 some difficulty, 3 a lot of difficulty, 4 cannot
do at all). Neither attribute is mandatory, but when they are sent they must be correct
and agree with each other and with the employment situation:
  - is_disabled is a boolean (true / false, or 1 / 0);
  - every domain and severity comes from its code list (code or published label);
  - a severity applies to a domain, and a domain is listed once;
  - "a lot of difficulty" or "cannot do at all" in a domain means the person is disabled;
    a person flagged disabled cannot report "no difficulty" in every domain.

This feature runs offline and proves the rules applied to every person with disability
returned or sent by the API scenarios (@pwd searches, notifications, enrolment checks).

Sources: core/v1/data (Member.is_disabled, Member.disability_info, DisabilityInfo),
core/v1/code (FunctionalLimitationType, DisabilityTypeEnum, FunctionalSeverityEnum),
extensions/ess/v1/code/UnemploymentReason (4: own illness or disability).

  # ---------------------------------------------------------------------------
  # Reference persons with disability
  # ---------------------------------------------------------------------------
  @smoke
  Scenario Outline: Reference person with disability "<record>" is valid ESS data
    Given the "<record>" Member record
    Then the record should be valid

    Examples:
      | record            |
      | disabled          |
      | disabled by label |

  Scenario Outline: Reference disability information "<record>" is valid ESS data
    Given the "<record>" DisabilityInfo record
    Then the record should be valid

    Examples:
      | record  |
      | full    |
      | label   |
      | minimal |

  Scenario: A person with disability flagged only, without details, is accepted
    Given the "minimal" Member record
    When its "is_disabled" attribute is set to 'true'
    Then the record should be valid

  Scenario Outline: Optional disability attribute "<attribute>" may be omitted
    Given the "disabled" Member record
    When its "<attribute>" attribute is removed
    Then the record should be valid

    Examples:
      | attribute                                    |
      | is_disabled                                  |
      | disability_info                              |
      | disability_info.0.@type                      |
      | disability_info.1                            |
      | disability_info.1.functional_severity        |
      | unemployment_reason                          |

  # ---------------------------------------------------------------------------
  # Every domain and severity is accepted, as a code, a label or (severity) an integer
  # ---------------------------------------------------------------------------
  # The flag and the second entry are removed so that each value is checked on its own,
  # without the consistency rules (a "no difficulty" severity on a flagged person, a domain
  # repeated by the second entry).
  Scenario Outline: Every <list> value is accepted for <attribute>
    Given the "disabled" Member record
    When its "is_disabled" attribute is removed
    And its "disability_info.1" attribute is removed
    Then every "<list>" code should be accepted as "<attribute>"

    Examples:
      | list                    | attribute                                    |
      | functionalType          | disability_info.0.disability_limitation_type |
      | functionalTypeLabel     | disability_info.0.disability_limitation_type |
      | functionalSeverity      | disability_info.0.functional_severity        |
      | functionalSeverityLabel | disability_info.0.functional_severity        |

  Scenario Outline: Every <list> value is accepted for the data standard naming functional_type
    Given the "disabled" Member record
    When its "is_disabled" attribute is removed
    And its "disability_info.1" attribute is removed
    And its "disability_info.0.disability_limitation_type" attribute is removed
    Then every "<list>" code should be accepted as "disability_info.0.functional_type"

    Examples:
      | list                |
      | functionalType      |
      | functionalTypeLabel |

  Scenario Outline: Every functionalType value is accepted in the list <attribute>
    Given the "disabled" Member record
    When its "is_disabled" attribute is removed
    And its "disability_info.1" attribute is removed
    And its "disability_info.0.<other>" attribute is removed
    Then every "functionalType" code should be accepted in the list "disability_info.0.<attribute>"

    Examples:
      | attribute                  | other                      |
      | disability_limitation_type | functional_type            |
      | functional_type            | disability_limitation_type |

  Scenario: Severity labels are also accepted in lower case
    Given the "disabled" Member record
    When its "is_disabled" attribute is removed
    And its "disability_info.1" attribute is removed
    Then every "functionalSeverityLabel" label should be accepted in lower case as "disability_info.0.functional_severity"

  Scenario: Severity codes are also accepted as JSON integers
    Given the "disabled" Member record
    When its "is_disabled" attribute is removed
    And its "disability_info.1" attribute is removed
    Then every "functionalSeverity" code should be accepted as a JSON integer for "disability_info.0.functional_severity"

  # ---------------------------------------------------------------------------
  # Correct disability descriptions
  # ---------------------------------------------------------------------------
  Scenario Outline: A person with disability may be described as <case>
    Given the "disabled" Member record
    When its "<attribute>" attribute is set to '<value>'
    Then the record should be valid

    Examples:
      | case                                    | attribute       | value                                                                                         |
      | flagged with the integer 1              | is_disabled     | 1                                                                                             |
      | one domain cannot do at all             | disability_info | [{"disability_limitation_type":"SC_SS","functional_severity":"4"}]                            |
      | several domains in one entry            | disability_info | [{"disability_limitation_type":["VIS_SS","HEAR_SS"],"functional_severity":3}]                 |
      | domains without severity                | disability_info | [{"disability_limitation_type":["COG_SS"]}]                                                   |
      | both namings agreeing                   | disability_info | [{"disability_limitation_type":"MOB_SS","functional_type":["MOB_SS"],"functional_severity":"4"}] |
      | labels                                  | disability_info | [{"disability_limitation_type":"Mobility","functional_severity":"Cannot do at all"}]          |
      | an empty list                           | disability_info | []                                                                                            |

  Scenario Outline: A person without disability may report <case>
    Given the "full" Member record
    When its "disability_info" attribute is set to '<value>'
    Then the record should be valid

    Examples:
      | case                         | value                                                                    |
      | no difficulty                | [{"disability_limitation_type":"VIS_SS","functional_severity":"1"}]      |
      | some difficulty              | [{"disability_limitation_type":"HEAR_SS","functional_severity":"2"}]     |
      | a domain without severity    | [{"disability_limitation_type":"COM_SS"}]                                |

  # ---------------------------------------------------------------------------
  # Incorrect disability values are rejected
  # ---------------------------------------------------------------------------
  Scenario Outline: "<attribute>" rejects the incorrect value <value>
    Given the "disabled" Member record
    When its "<attribute>" attribute is set to '<value>'
    Then the record should be rejected because of "<error>"

    Examples: Disability flag
      | attribute   | value  | error                                                   |
      | is_disabled | "yes"  | /is_disabled must be equal to one of the allowed values |
      | is_disabled | "true" | /is_disabled must be equal to one of the allowed values |
      | is_disabled | 2      | /is_disabled must be equal to one of the allowed values |
      | is_disabled | null   | /is_disabled must be equal to one of the allowed values |

    Examples: Disability information
      | attribute                                    | value                          | error                                                                                    |
      | disability_info                              | {"disability_limitation_type":"VIS_SS"} | /disability_info must be array                                                  |
      | disability_info                              | ["VIS_SS"]                     | /disability_info/0 must be object                                                        |
      | disability_info.0.disability_limitation_type | "BLIND"                        | /disability_info/0/disability_limitation_type must be equal to one of the allowed values |
      | disability_info.0.disability_limitation_type | "VIS"                          | /disability_info/0/disability_limitation_type must be equal to one of the allowed values |
      | disability_info.0.disability_limitation_type | ["wheelchair user"]            | /disability_info/0/disability_limitation_type/0 must be equal to one of the allowed values |
      | disability_info.0.disability_limitation_type | []                             | /disability_info/0/disability_limitation_type must NOT have fewer than 1 items           |
      | disability_info.0.functional_type            | "physical"                     | /disability_info/0/functional_type must be equal to one of the allowed values            |
      | disability_info.0.functional_severity        | "severe"                       | /disability_info/0/functional_severity must be equal to one of the allowed values        |
      | disability_info.0.functional_severity        | 5                              | /disability_info/0/functional_severity must be equal to one of the allowed values        |
      | disability_info.0.functional_severity        | 0                              | /disability_info/0/functional_severity must be equal to one of the allowed values        |
      | disability_info.0.functional_severity        | "4.0"                          | /disability_info/0/functional_severity must be equal to one of the allowed values        |

  # ---------------------------------------------------------------------------
  # Consistency of the disability description
  # ---------------------------------------------------------------------------
  Scenario Outline: Disability attributes must be consistent: <rule>
    Given the "<record>" Member record
    When its "<attribute>" attribute is set to '<value>'
    Then the record should be rejected because of "<error>"

    Examples:
      | rule                                       | record   | attribute       | value                                                                        | error                                                                |
      | severe limitation but flagged not disabled | disabled | is_disabled     | false                                                                        | is_disabled is false but disability_info reports                     |
      | severe limitation but flagged 0            | disabled | is_disabled     | 0                                                                            | is_disabled is 0 but disability_info reports                         |
      | severe limitation (label) not disabled     | full     | disability_info | [{"disability_limitation_type":"Vision","functional_severity":"a lot of difficulty"}] | is_disabled is false but disability_info reports            |
      | disabled but no difficulty anywhere        | disabled | disability_info | [{"disability_limitation_type":"MOB_SS","functional_severity":"1"},{"disability_limitation_type":"VIS_SS","functional_severity":"No difficulty"}] | every disability_info entry reports |
      | severity without its domain                | disabled | disability_info | [{"functional_severity":"4"}]                                                | gives a functional_severity without the disability_limitation_type   |
      | a domain listed twice                      | disabled | disability_info | [{"disability_limitation_type":"MOB_SS","functional_severity":"4"},{"disability_limitation_type":["MOB_SS"],"functional_severity":"3"}] | lists the functional domain MOB_SS more than once |
      | a domain listed twice (code and label)     | disabled | disability_info | [{"disability_limitation_type":"HEAR_SS"},{"disability_limitation_type":"Hearing"}] | lists the functional domain HEAR_SS more than once          |
      | the two namings disagree                   | disabled | disability_info | [{"disability_limitation_type":"MOB_SS","functional_type":"VIS_SS","functional_severity":"4"}] | contradicts functional_type                         |

  Scenario: A person with disability out of work because of it is consistent
    Given the "disabled" Member record
    Then the record should be valid

  Scenario: A person with disability in employment must not give an unemployment reason
    Given the "disabled" Member record
    When its "employment_status" attribute is set to '"1"'
    Then the record should be rejected because of "says the member is employed"

  Scenario Outline: Disability information on its own rejects <case>
    Given the "full" DisabilityInfo record
    When its "<attribute>" attribute is set to '<value>'
    Then the record should be rejected because of "<error>"

    Examples:
      | case                  | attribute                  | value     | error                                                                         |
      | an unknown domain     | disability_limitation_type | ["DEAF"]  | /disability_limitation_type/0 must be equal to one of the allowed values      |
      | an unknown severity   | functional_severity        | "extreme" | /functional_severity must be equal to one of the allowed values               |
      | a severity alone      | disability_limitation_type | <removed> | gives a functional_severity without the disability_limitation_type           |
