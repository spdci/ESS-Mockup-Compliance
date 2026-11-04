@data
Feature: ESS member data rules (Member, Employment_Info, RelatedPerson)

An ESS Member is an individual (core Member) extended with its employment situation:
employment_status, occupation, education_level, employment history (employment_info) and
unemployment_reason. Every attribute is optional, but whenever one IS sent it must be
correct: a code from the code directory (as the code, its published label or, for
numeric codes, a JSON integer), the right data type and format, and consistent with the
rest of the record. The member's demographic_info is an ESS_Person and follows the
person data rules; persons with disability are covered by ess_pwd_member_data.feature.

This feature runs offline and proves the rules applied to every member returned or sent
by the API scenarios (member search results, group_head_info and member_list of every
group, notifications, transaction status receipts).

Sources: extensions/ess/v1/data (Member, EmploymentInfo, ESSPerson),
extensions/ess/v1/code (EmploymentType, UnemploymentReason), extensions/ess/Member.yaml,
core/v1/data (Member, RelatedPerson), core/v1/code (MaritalStatusEnum,
EmploymentStatusEnum, OccupationEnum, EducationCode, RelationshipTypeEnum,
LanguageCodeEnum, IncomeLevelEnum), ESS process flows 1-3.

  # ---------------------------------------------------------------------------
  # Reference records and published examples
  # ---------------------------------------------------------------------------
  @smoke
  Scenario Outline: Reference member "<record>" is valid ESS data
    Given the "<record>" Member record
    Then the record should be valid

    Examples:
      | record            |
      | full              |
      | unemployed        |
      | student           |
      | child             |
      | seasonal          |
      | disabled          |
      | deceased          |
      | disabled by label |
      | jobseeker         |
      | head              |
      | minimal           |

  Scenario: A member with no attribute at all is accepted (nothing is mandatory)
    Given an empty Member record
    Then the record should be valid

  Scenario Outline: The published <example> member follows the ESS data standard
    Given the "<example>" Member record
    Then the record should be valid

    Examples:
      | example        |
      | process flow 1 |
      | process flow 2 |

  Scenario: The published spec Member example does not follow the ESS data standard
    Given the "spec example" Member record
    Then the record should be rejected because of:
      | /demographic_info/identifier/0/identifier_type must be equal to one of the allowed values |
      | /related_person/0/relationship_type must be equal to one of the allowed values           |
      | /related_person/0/related_member/member_identifier must be array                         |
      | /related_person/1/relationship_type must be equal to one of the allowed values           |
      | /employment_status must be equal to one of the allowed values                            |
      | /occupation must be equal to one of the allowed values                                   |
      | /education_level must be equal to one of the allowed values                              |

  Scenario: A demographic_info wrapping the person in "person" is reported
    Given the "full" Member record
    When its "demographic_info" attribute is set to '{"person":{"identifier":[{"identifier_type":"UIN","identifier_value":"100000001"}]}}'
    Then the record should be rejected because of "demographic_info wraps the person in"

  # ---------------------------------------------------------------------------
  # Absent optional attributes are accepted
  # ---------------------------------------------------------------------------
  Scenario Outline: Optional attribute "<attribute>" may be omitted
    Given the "<record>" Member record
    When its "<attribute>" attribute is removed
    Then the record should be valid

    Examples:
      | record     | attribute                           |
      | full       | @context                            |
      | full       | @id                                 |
      | full       | @type                               |
      | full       | member_identifier                   |
      | full       | demographic_info                    |
      | full       | demographic_info.identifier         |
      | full       | demographic_info.name               |
      | full       | demographic_info.address            |
      | full       | related_person                      |
      | full       | related_person.0.relationship_type  |
      | full       | related_person.0.related_member     |
      | full       | is_disabled                         |
      | full       | marital_status                      |
      | full       | employment_status                   |
      | full       | occupation                          |
      | full       | income_level                        |
      | full       | language_code                       |
      | full       | education_level                     |
      | full       | employment_info                     |
      | full       | employment_info.1.start_date        |
      | full       | employment_info.1.job_title         |
      | full       | employment_info.1.employer          |
      | full       | employment_info.1.employment_type   |
      | full       | additional_attributes               |
      | full       | registration_date                   |
      | full       | last_updated                        |
      | unemployed | unemployment_reason                 |
      | unemployed | employment_info.0.employer          |
      | unemployed | employment_info.0.job_title         |

  # ---------------------------------------------------------------------------
  # Every code of every code list is accepted (code, published label, lower-case label)
  # ---------------------------------------------------------------------------
  Scenario Outline: Every <list> value is accepted for <attribute>
    Given the "<record>" Member record
    Then every "<list>" code should be accepted as "<attribute>"

    Examples: Codes
      | record     | list               | attribute                            |
      | full       | maritalStatus      | marital_status                       |
      | minimal    | employmentStatus   | employment_status                    |
      | full       | occupation         | occupation                           |
      | full       | educationLevel     | education_level                      |
      | full       | employmentType     | employment_info.1.employment_type    |
      | unemployed | unemploymentReason | unemployment_reason                  |
      | full       | relationshipType   | related_person.0.relationship_type   |
      | full       | identifierType     | member_identifier.0.identifier_type  |

    Examples: Published labels
      | record     | list                    | attribute                         |
      | full       | maritalStatusLabel      | marital_status                    |
      | minimal    | employmentStatusLabel   | employment_status                 |
      | full       | occupationLabel         | occupation                        |
      | full       | educationLevelLabel     | education_level                   |
      | full       | employmentTypeLabel     | employment_info.1.employment_type |
      | unemployed | unemploymentReasonLabel | unemployment_reason               |

  Scenario Outline: Every <list> label is also accepted in lower case for <attribute>
    Given the "<record>" Member record
    Then every "<list>" label should be accepted in lower case as "<attribute>"

    Examples:
      | record     | list                    | attribute                         |
      | full       | maritalStatusLabel      | marital_status                    |
      | minimal    | employmentStatusLabel   | employment_status                 |
      | full       | occupationLabel         | occupation                        |
      | full       | employmentTypeLabel     | employment_info.1.employment_type |
      | unemployed | unemploymentReasonLabel | unemployment_reason               |

  Scenario Outline: Numeric <list> codes are also accepted as JSON integers for <attribute>
    Given the "<record>" Member record
    Then every "<list>" code should be accepted as a JSON integer for "<attribute>"

    Examples:
      | record     | list               | attribute                         |
      | minimal    | employmentStatus   | employment_status                 |
      | full       | occupation         | occupation                        |
      | full       | educationLevel     | education_level                   |
      | full       | employmentType     | employment_info.1.employment_type |
      | unemployed | unemploymentReason | unemployment_reason               |

  # ---------------------------------------------------------------------------
  # Correct values for optional attributes are accepted
  # ---------------------------------------------------------------------------
  Scenario Outline: "<attribute>" accepts the correct value <value>
    Given the "<record>" Member record
    When its "<attribute>" attribute is set to '<value>'
    Then the record should be valid

    Examples: Member identifier and demographic information
      | record | attribute         | value                                                                                              |
      | full   | member_identifier | [{"identifier_type":"UIN","identifier_value":"M1"}]                                                |
      | full   | member_identifier | [{"identifier_type":"UIN","identifier_value":"M1"},{"identifier_type":"BRN","identifier_value":"B1"}] |
      | full   | demographic_info  | {"identifier":[{"identifier_type":"UIN","identifier_value":"100000001"}]}                          |
      | full   | demographic_info  | {}                                                                                                 |

    Examples: Related persons (RelatedPerson: Member reference or Person)
      | record | attribute      | value                                                                                                                 |
      | full   | related_person | []                                                                                                                    |
      | full   | related_person | [{"relationship_type":"SPS","related_member":{"member_identifier":[{"identifier_type":"UIN","identifier_value":"M2"}]}}] |
      | full   | related_person | [{"relationship_type":"CHILD","related_member":{"identifier":[{"identifier_type":"BRN","identifier_value":"B9"}],"name":{"given_name":"Kim"},"birth_date":"2015-01-01"}}] |
      | full   | related_person | [{"relationship_type":"SELF","related_member":{"member_identifier":[{"identifier_type":"UIN","identifier_value":"M100000001"}]}}] |
      | full   | related_person | [{"relationship_type":"FAMMEMB"}]                                                                                     |

    Examples: Employment history (Employment_Info, a list or one object)
      | record     | attribute       | value                                                                                                         |
      | full       | employment_info | []                                                                                                            |
      | full       | employment_info | {"employer":"Anytown Primary School","job_title":"Teacher","start_date":"2012-09-01","employment_type":"1"} |
      | full       | employment_info | [{"employer":"Anytown Primary School"}]                                                                      |
      | full       | employment_info | [{"start_date":"2012-09-01T08:00:00Z","end_date":"2030-06-30","employment_type":2}]                         |
      | unemployed | employment_info | [{"employer":"A","start_date":"2000-01-01","end_date":"2010-12-31"},{"employer":"A","start_date":"2011-01-01","end_date":"2024-12-31"}] |
      | unemployed | employment_info | [{"employer":"A","start_date":"2000-01-01","end_date":"2024-12-31"},{"employer":"B","start_date":"2020-01-01","end_date":"2024-06-30"}] |

    Examples: Employment situation
      | record     | attribute           | value                 |
      | full       | employment_status   | "7"                   |
      | full       | employment_status   | "Own-account workers" |
      | unemployed | unemployment_reason | "Retirement"          |
      | unemployed | unemployment_reason | 8                     |
      | full       | occupation          | "0"                   |
      | full       | income_level        | "3"                   |
      | full       | income_level        | 4                     |
      | full       | income_level        | "Q1"                  |

    Examples: Languages and additional attributes
      | record | attribute             | value                                                                             |
      | full   | language_code         | ["en"]                                                                            |
      | full   | language_code         | ["eng","fra","ara"]                                                               |
      | full   | language_code         | []                                                                                |
      | full   | additional_attributes | []                                                                                |
      | full   | additional_attributes | [{"name":"extra_work","value":"volunteer"}]                                       |
      | full   | additional_attributes | [{"name":"hours","value":12.5},{"name":"seasonal","value":true},{"name":"extra","value":{"since":"2020"}}] |
      | full   | additional_attributes | [{"extra_work":"volunteer"}]                                                      |

    Examples: Dates
      | record | attribute         | value                  |
      | full   | registration_date | "2022-01-10"           |
      | full   | registration_date | "1985-05-20T12:00:00Z" |
      | full   | last_updated      | "2026-01-01T00:00:00Z" |

  # ---------------------------------------------------------------------------
  # Incorrect values for optional attributes are rejected
  # ---------------------------------------------------------------------------
  Scenario Outline: "<attribute>" rejects the incorrect value <value>
    Given the "<record>" Member record
    When its "<attribute>" attribute is set to '<value>'
    Then the record should be rejected because of "<error>"

    Examples: Member identifier
      | record | attribute                           | value                                            | error                                                  |
      | full   | member_identifier                   | "M100000001"                                     | /member_identifier must be array                       |
      | full   | member_identifier                   | {"identifier_type":"UIN","identifier_value":"1"} | /member_identifier must be array                       |
      | full   | member_identifier                   | []                                               | /member_identifier must NOT have fewer than 1 items    |
      | full   | member_identifier.0.identifier_type | "NationalID"                                     | /member_identifier/0/identifier_type must be equal to one of the allowed values |
      | full   | member_identifier                   | [{"identifier_type":"UIN"}]                      | must have required property 'identifier_value'         |
      | full   | member_identifier.0.identifier_value | ""                                              | /member_identifier/0/identifier_value must NOT have fewer than 1 characters |

    Examples: Demographic information (person rules apply)
      | record | attribute                     | value          | error                                                            |
      | full   | demographic_info              | "Alice Smith"  | /demographic_info must be object                                 |
      | full   | demographic_info.sex          | "F"            | /demographic_info/sex must be equal to one of the allowed values |
      | full   | demographic_info.birth_date   | "20/05/1985"   | /demographic_info/birth_date must match pattern                  |
      | full   | demographic_info.phone_number | ["0891234567"] | /demographic_info/phone_number/0 must match pattern              |
      | full   | demographic_info.identifier   | []             | /demographic_info/identifier must NOT have fewer than 1 items    |
      | full   | demographic_info.birth_date   | "2999-01-01"   | demographic_info.birth_date "2999-01-01" is in the future        |

    Examples: Related persons
      | record | attribute                                         | value                                         | error                                                                 |
      | full   | related_person                                    | {"relationship_type":"SPS"}                   | /related_person must be array                                         |
      | full   | related_person.0.relationship_type                | "spouse"                                      | /related_person/0/relationship_type must be equal to one of the allowed values |
      | full   | related_person.0.relationship_type                | "sps"                                         | /related_person/0/relationship_type must be equal to one of the allowed values |
      | full   | related_person.0.relationship_type                | 1                                             | /related_person/0/relationship_type must be string                    |
      | full   | related_person.0.related_member                   | "M100000002"                                  | /related_person/0/related_member must be object                       |
      | full   | related_person.0.related_member.member_identifier | "M100000002"                                  | /related_person/0/related_member/member_identifier must be array      |
      | full   | related_person.1.related_member.birth_date        | "2015-02-30"                                  | related_member.birth_date "2015-02-30" is not a valid ISO 8601 calendar date |

    Examples: Marital status (MaritalStatusEnum: code or label)
      | record | attribute      | value       | error                                                      |
      | full   | marital_status | "single"    | /marital_status must be equal to one of the allowed values |
      | full   | marital_status | "m"         | /marital_status must be equal to one of the allowed values |
      | full   | marital_status | "X"         | /marital_status must be equal to one of the allowed values |
      | full   | marital_status | "MARRIED"   | /marital_status must be equal to one of the allowed values |

    Examples: Employment status (EmploymentStatusEnum 1-7), occupation (ISCO-08 0-9), education (ISCED 0-8)
      | record | attribute         | value          | error                                                         |
      | full   | employment_status | "employed"     | /employment_status must be equal to one of the allowed values |
      | full   | employment_status | "unemployed"   | /employment_status must be equal to one of the allowed values |
      | full   | employment_status | "0"            | /employment_status must be equal to one of the allowed values |
      | full   | employment_status | "8"            | /employment_status must be equal to one of the allowed values |
      | full   | employment_status | 9              | /employment_status must be equal to one of the allowed values |
      | full   | employment_status | "4.0"          | /employment_status must be equal to one of the allowed values |
      | full   | employment_status | true           | /employment_status must be equal to one of the allowed values |
      | full   | occupation        | "teacher"      | /occupation must be equal to one of the allowed values        |
      | full   | occupation        | "construction" | /occupation must be equal to one of the allowed values        |
      | full   | occupation        | "10"           | /occupation must be equal to one of the allowed values        |
      | full   | occupation        | 2.5            | /occupation must be equal to one of the allowed values        |
      | full   | education_level   | "bachelor"     | /education_level must be equal to one of the allowed values   |
      | full   | education_level   | "secondary"    | /education_level must be equal to one of the allowed values   |
      | full   | education_level   | "9"            | /education_level must be equal to one of the allowed values   |
      | full   | education_level   | -1             | /education_level must be equal to one of the allowed values   |

    Examples: Unemployment reason (UnemploymentReason 1-8)
      | record     | attribute           | value         | error                                                           |
      | unemployed | unemployment_reason | "laid off"    | /unemployment_reason must be equal to one of the allowed values |
      | unemployed | unemployment_reason | "0"           | /unemployment_reason must be equal to one of the allowed values |
      | unemployed | unemployment_reason | "9"           | /unemployment_reason must be equal to one of the allowed values |
      | unemployed | unemployment_reason | ["1"]         | /unemployment_reason must be equal to one of the allowed values |

    Examples: Employment history (Employment_Info)
      | record | attribute                         | value                | error                                                                   |
      | full   | employment_info                   | "teacher since 2012" | /employment_info must be object                                         |
      | full   | employment_info.1.employment_type | "Full time"          | /employment_info/1/employment_type must be equal to one of the allowed values |
      | full   | employment_info.1.employment_type | "6"                  | /employment_info/1/employment_type must be equal to one of the allowed values |
      | full   | employment_info.1.employment_type | 0                    | /employment_info/1/employment_type must be equal to one of the allowed values |
      | full   | employment_info.1.start_date      | "01/09/2012"         | /employment_info/1/start_date must match pattern                        |
      | full   | employment_info.1.start_date      | "2012-09-31"         | employment_info[1].start_date "2012-09-31" is not a valid ISO 8601 calendar date |
      | full   | employment_info.1.start_date      | "2999-09-01"         | employment_info[1].start_date "2999-09-01" is in the future             |
      | full   | employment_info.1.end_date        | 2030                 | /employment_info/1/end_date must be string                              |
      | full   | employment_info.1.employer        | ""                   | /employment_info/1/employer must NOT have fewer than 1 characters       |
      | full   | employment_info.1.job_title       | ["Teacher"]          | /employment_info/1/job_title must be string                             |
      | full   | employment_info.1                 | "Teacher"            | /employment_info/1 must be object                                       |

    Examples: Income level (country-defined code)
      | record | attribute    | value | error                                               |
      | full   | income_level | ""    | /income_level must NOT have fewer than 1 characters |
      | full   | income_level | 2.5   | /income_level must be integer                       |
      | full   | income_level | ["2"] | /income_level must be string                        |

    Examples: Languages and additional attributes
      | record | attribute             | value                       | error                                                               |
      | full   | language_code         | "en"                        | /language_code must be array                                        |
      | full   | language_code         | ["english"]                 | /language_code/0 must match pattern                                 |
      | full   | language_code         | ["EN"]                      | /language_code/0 must match pattern                                 |
      | full   | additional_attributes | {"extra_work":"volunteer"}  | /additional_attributes must be array                                |
      | full   | additional_attributes | ["volunteer"]               | /additional_attributes/0 must be object                             |
      | full   | additional_attributes | [{"name":"extra_work"}]     | /additional_attributes/0 must have required property 'value'        |
      | full   | additional_attributes | [{}]                        | /additional_attributes/0 must NOT have fewer than 1 properties      |
      | full   | additional_attributes | [{"name":"","value":1}]     | /additional_attributes/0/name must NOT have fewer than 1 characters |

    Examples: Dates
      | record | attribute         | value        | error                                                                |
      | full   | registration_date | "10/01/2022" | /registration_date must match pattern                                |
      | full   | registration_date | "2022-02-29" | registration_date "2022-02-29" is not a valid ISO 8601 calendar date |
      | full   | last_updated      | "2999-12-31" | last_updated "2999-12-31" is in the future                           |

  # ---------------------------------------------------------------------------
  # Cross-attribute consistency (only checked when the attributes are sent)
  # ---------------------------------------------------------------------------
  Scenario Outline: Member attributes must be consistent: <rule>
    Given the "<record>" Member record
    When its "<attribute>" attribute is set to '<value>'
    Then the record should be rejected because of "<error>"

    Examples: Employment situation
      | rule                                     | record     | attribute                    | value                       | error                                                                     |
      | unemployment reason while employed       | full       | unemployment_reason          | "1"                         | unemployment_reason 1 (Dismissed or made redundant) is given but employment_status 1 (Employee) says the member is employed |
      | employed (label) with unemployment reason | unemployed | employment_status           | "own-account workers"       | says the member is employed                                               |
      | not employed but a job still running     | full       | employment_status            | "Not employed"              | employment_info[1] is still running                                       |
      | not employed but the job ends next year  | unemployed | employment_info.0.end_date   | "2099-12-31"                | employment_info[0] is still running                                       |
      | job ends before it starts                | full       | employment_info.0.end_date   | "2005-01-01"                | employment_info[0].end_date 2005-01-01 is before start_date 2008-09-01    |
      | job starts before birth                  | full       | employment_info.0.start_date | "1980-01-01"                | employment_info[0].start_date 1980-01-01 is before demographic_info.birth_date 1985-05-20 |
      | job starts after death                   | deceased   | employment_info.0.start_date | "2024-12-01"                | is after demographic_info.death_date 2024-11-02                           |
      | overlapping jobs with one employer       | full       | employment_info.0            | {"employer":"Anytown Primary School","start_date":"2015-01-01","end_date":"2016-01-01"} | employment_info[0] and employment_info[1] overlap for the same employer   |

    Examples: Identity and dates
      | rule                                 | record | attribute                   | value                                                                                                   | error                                                                  |
      | registered before birth              | full   | registration_date           | "1980-01-01"                                                                                            | registration_date 1980-01-01 is before demographic_info.birth_date 1985-05-20 |
      | last update before registration      | full   | last_updated                | "2021-01-01"                                                                                            | last_updated 2021-01-01 is before registration_date 2022-01-10         |
      | person died before birth             | full   | demographic_info.death_date | "1980-01-01"                                                                                            | demographic_info.death_date 1980-01-01 is before birth_date 1985-05-20 |
      | related to itself                    | full   | related_person              | [{"relationship_type":"SPS","related_member":{"member_identifier":[{"identifier_type":"UIN","identifier_value":"M100000001"}]}}] | relates the member to itself (UIN\|M100000001) |
      | related to itself by person id       | full   | related_person              | [{"relationship_type":"CHILD","related_member":{"identifier":[{"identifier_type":"UIN","identifier_value":"100000001"}]}}] | relates the member to itself (UIN\|100000001) |
      | duplicate member identifiers         | full   | member_identifier           | [{"identifier_type":"UIN","identifier_value":"M1"},{"identifier_type":"UIN","identifier_value":"M1"}]   | member_identifier contains duplicates: UIN\|M1                         |

  Scenario: An employment history may hold a contract ending in the future when the member is employed
    Given the "seasonal" Member record
    Then the record should be valid

  # ---------------------------------------------------------------------------
  # Employment_Info on its own
  # ---------------------------------------------------------------------------
  Scenario Outline: Reference employment period "<record>" is valid ESS data
    Given the "<record>" EmploymentInfo record
    Then the record should be valid

    Examples:
      | record  |
      | full    |
      | ended   |
      | minimal |

  Scenario Outline: An employment period rejects <case>
    Given the "full" EmploymentInfo record
    When its "<attribute>" attribute is set to '<value>'
    Then the record should be rejected because of "<error>"

    Examples:
      | case                     | attribute       | value        | error                                                  |
      | an end before its start  | end_date        | "2010-01-01" | end_date 2010-01-01 is before start_date 2012-09-01    |
      | an unknown type          | employment_type | "Internship" | /employment_type must be equal to one of the allowed values |
      | a start in the future    | start_date      | "2999-01-01" | start_date "2999-01-01" is in the future               |
      | a date that is not real  | end_date        | "2030-02-30" | end_date "2030-02-30" is not a valid ISO 8601 calendar date |
