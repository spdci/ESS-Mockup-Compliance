@data
Feature: ESS person data rules (ESS_Person)

An ESS_Person (ESSPerson.jsonld) is a core Person: identifiers, name, sex, dates of birth
and death, addresses, phone numbers, e-mails and registration dates. Every attribute is
optional, but whenever one IS sent it must be correct: identifiers from the identifier
type list, sex from the SexCategory list, ISO 8601 calendar dates that are not in the
future and in a sensible order, E.164 phone numbers, RFC 5322 e-mails, ISO country codes
and valid coordinates.

This feature runs offline and proves the rules applied to every person returned or sent
by the API scenarios (person search results and the demographic_info of every member).

Sources: extensions/ess/v1/data/ESSPerson.jsonld, core/v1/data (Person, Identifier, Name,
Address, GeoLocation), core/v1/code (IdentifierTypeEnum, SexCategoryEnum).

  @smoke
  Scenario Outline: Reference person "<record>" is valid ESS data
    Given the "<record>" ESSPerson record
    Then the record should be valid

    Examples:
      | record    |
      | full      |
      | multi     |
      | student   |
      | child     |
      | seasonal  |
      | disabled  |
      | deceased  |
      | jobseeker |
      | minimal   |

  Scenario: A person with no attribute at all is accepted (nothing is mandatory)
    Given an empty ESSPerson record
    Then the record should be valid

  Scenario: The person of the spec Member example does not follow the ESS data standard
    Given the "spec example" ESSPerson record
    Then the record should be rejected because of "/identifier/0/identifier_type must be equal to one of the allowed values"

  Scenario Outline: Optional attribute "<attribute>" may be omitted
    Given the "full" ESSPerson record
    When its "<attribute>" attribute is removed
    Then the record should be valid

    Examples:
      | attribute                          |
      | @context                           |
      | @id                                |
      | @type                              |
      | identifier                         |
      | name                               |
      | name.second_name                   |
      | name.maiden_name                   |
      | name.prefix                        |
      | name.suffix                        |
      | sex                                |
      | birth_date                         |
      | address                            |
      | address.0.geo_location             |
      | address.0.postal_code              |
      | phone_number                       |
      | email                              |
      | registration_date                  |
      | last_updated                       |

  Scenario Outline: Every <list> code is accepted for <attribute>
    Given the "full" ESSPerson record
    Then every "<list>" code should be accepted as "<attribute>"

    Examples:
      | list           | attribute                    |
      | sex            | sex                          |
      | identifierType | identifier.0.identifier_type |

  Scenario Outline: "<attribute>" accepts the correct value <value>
    Given the "full" ESSPerson record
    When its "<attribute>" attribute is set to '<value>'
    Then the record should be valid

    Examples:
      | attribute    | value                                                                       |
      | name         | {"given_name":"Alice"}                                                      |
      | name         | {"surname":"Smith"}                                                         |
      | birth_date   | "1985-05-20"                                                                |
      | birth_date   | "1985-05-20T00:00:00+07:00"                                                 |
      | birth_date   | "1985-05-20T11:20"                                                          |
      | death_date   | "2024-01-01"                                                                |
      | address      | {"address_line_1":"1 Road","country_code":"THA"}                            |
      | address      | [{"address_line1":"Bophut Koh Samui","locality":"Thani"}]                   |
      | address      | [{"geo_location":{"latitude":"13.75","longitude":"100.5"}}]                 |
      | phone_number | ["+66891234567","+33612345678"]                                             |
      | phone_number | []                                                                          |
      | email        | ["a.smith@example.org"]                                                     |

  Scenario Outline: "<attribute>" rejects the incorrect value <value>
    Given the "full" ESSPerson record
    When its "<attribute>" attribute is set to '<value>'
    Then the record should be rejected because of "<error>"

    Examples: Identifiers and name
      | attribute                     | value                                        | error                                                          |
      | identifier                    | "100000001"                                  | /identifier must be array                                      |
      | identifier                    | []                                           | /identifier must NOT have fewer than 1 items                   |
      | identifier.0.identifier_type  | "NationalID"                                 | /identifier/0/identifier_type must be equal to one of the allowed values |
      | identifier.0.identifier_type  | "uin"                                        | /identifier/0/identifier_type must be equal to one of the allowed values |
      | identifier                    | [{"identifier_value":"1"}]                   | must have required property 'identifier_type'                  |
      | name                          | "Alice Smith"                                | /name must be object                                           |
      | name                          | {"prefix":"Ms."}                             | /name must have required property 'surname'                    |
      | name.given_name               | 42                                           | /name/given_name must be string                                |

    Examples: Sex
      | attribute | value    | error                                         |
      | sex       | "F"      | /sex must be equal to one of the allowed values |
      | sex       | "Female" | /sex must be equal to one of the allowed values |
      | sex       | 1        | /sex must be string                           |

    Examples: Dates
      | attribute         | value                  | error                                                          |
      | birth_date        | "20/05/1985"           | /birth_date must match pattern                                 |
      | birth_date        | "1985-02-30"           | birth_date "1985-02-30" is not a valid ISO 8601 calendar date  |
      | birth_date        | "2999-01-01"           | birth_date "2999-01-01" is in the future                       |
      | birth_date        | 1985                   | /birth_date must be string                                     |
      | death_date        | "yesterday"            | /death_date must match pattern                                 |
      | registration_date | "2022-13-01"           | /registration_date must match pattern                          |
      | last_updated      | "2999-01-01T00:00:00Z" | last_updated "2999-01-01T00:00:00Z" is in the future           |

    Examples: Contact details and address
      | attribute                                    | value                     | error                                                |
      | phone_number                                 | "+66891234567"            | /phone_number must be array                          |
      | phone_number                                 | ["0891234567"]            | /phone_number/0 must match pattern                   |
      | phone_number                                 | ["+66 89 123 4567"]       | /phone_number/0 must match pattern                   |
      | email                                        | ["alice.example.org"]     | /email/0 must match format "email"                   |
      | email                                        | "alice@example.org"       | /email must be array                                 |
      | address                                      | "123 Main St"             | /address must be object                              |
      | address.0.country_code                       | "Thailand"                | /address/0/country_code must match pattern           |
      | address.0.geo_location.plus_code.global_code | "not a plus code"         | /address/0/geo_location/plus_code/global_code must match pattern |
      | address.0.geo_location.plus_code.geometry.location.latitude | 95         | /address/0/geo_location/plus_code/geometry/location/latitude must be <= 90 |

  Scenario Outline: Person attributes must be consistent: <rule>
    Given the "<record>" ESSPerson record
    When its "<attribute>" attribute is set to '<value>'
    Then the record should be rejected because of "<error>"

    Examples:
      | rule                            | record   | attribute         | value                                                                                         | error                                                   |
      | died before birth               | deceased | death_date        | "1930-01-01"                                                                                  | death_date 1930-01-01 is before birth_date 1940-02-11   |
      | registered before birth         | full     | registration_date | "1980-01-01"                                                                                  | registration_date 1980-01-01 is before birth_date 1985-05-20 |
      | updated before registration     | full     | last_updated      | "2020-01-01"                                                                                  | last_updated 2020-01-01 is before registration_date 2022-01-10 |
      | duplicate identifiers           | full     | identifier        | [{"identifier_type":"UIN","identifier_value":"1"},{"identifier_type":"UIN","identifier_value":"1"}] | identifier contains duplicates: UIN\|1          |
      | geo bounds upside down          | full     | address.0.geo_location.plus_code.geometry.bounds.northeast.latitude | 10.0                         | is south of southwest.latitude                          |
      | latitude as text out of range   | full     | address           | [{"geo_location":{"latitude":"123.4","longitude":"100.5"}}]                                   | latitude "123.4" is outside [-90, 90]                   |
