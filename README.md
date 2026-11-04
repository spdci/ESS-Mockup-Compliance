# ESS Registry Compliance and Mockup

Compliance test suite and mock API for the **DCI Employment Support System (ESS) API v1.0.0**
([`ess_api_v1.0.0.yaml`](https://github.com/spdci/api-standards)), checking the ESS data
standard: ESS_Person, ESS Member (with its employment situation and disability information),
ESS Group, Employment_Info, the ESS code directory (EmploymentType, UnemploymentReason,
EnrolmentStatus) and the core code lists. The data objects and code lists come from
[`spdci/schemas`](https://github.com/spdci/schemas) (`extensions/ess/v1`, `core/v1`); the
process flow examples from `api-standards/release/sample-jsons/assets/example_files/ess`.

## What is covered

All endpoints of the standard, split by the system that exposes them. The ESS API is
symmetric (either system may expose `/registry/*`): the suite tests the ESS as the registry
and the SP-MIS as the receiver of callbacks. Notifications flow both ways, so `notify` exists
on both sides.

| Side | Endpoint (mock path) | Spec path | Mock behaviour |
|---|---|---|---|
| ESS | `ess/sync/search` | `/registry/sync/search` | Search results (header `on-search` + SearchResponse) |
| ESS | `ess/search` | `/registry/search` | ACK, then `on-search` callback to `header.sender_uri` |
| ESS | `ess/sync/check-enrollment` | `/registry/sync/check-enrollment` | Header `on-check-enrollment` + EnrolledResponse: enrolment status per person |
| ESS | `ess/subscribe` | `/registry/subscribe` | ACK, then `on-subscribe` callback |
| ESS | `ess/unsubscribe` | `/registry/unsubscribe` | ACK, then `on-unsubscribe` callback |
| ESS | `ess/txn/status` | `/registry/txn/status` | ACK, then `txn/on-status` callback |
| ESS | `ess/sync/txn/status` | `/registry/sync/txn/status` | Transaction status (header `txn-on-status` + TxnStatusResponse) |
| ESS | `ess/notify` | `/registry/notify` | ACK (referrals from the SP-MIS, process flow 1) |
| SP-MIS | `ess/on-search` | `/registry/on-search` | ACK |
| SP-MIS | `ess/on-subscribe` | `/registry/on-subscribe` | ACK |
| SP-MIS | `ess/on-unsubscribe` | `/registry/on-unsubscribe` | ACK |
| SP-MIS | `ess/txn/on-status` | `/registry/txn/on-status` | ACK |
| SP-MIS | `ess/notify` | `/registry/notify` | ACK (referrals from the ESS, process flow 2) |

Every mock endpoint validates the request against the spec schema, including the ESS data it
carries, and answers an `ERR` acknowledgement (`err.request.bad`, HTTP 400) when it does not
conform.

A search targets one ESS record type, given by `search_criteria.reg_record_type`
(`ESSPerson`, `Member`, `Group`) or `response_entity` (`Member`, `Group`). Without either, the
records are members, as declared by the ESS SearchResponse:

- **person search**: ESS persons by identifier (UIN, BRN, MRN, DRN);
- **member search**: members by member identifier or by the identifier of their person, by
  employment situation (not employed, unemployment reason) and by disability;
- **group search**: households by group identifier or by the identifier of any of their
  members, by poverty score and size (process flow 3);
- **person with disability search**: members flagged `is_disabled` / described by
  `disability_info`, and the households they belong to.

### ESS data rules

Almost every ESS attribute is optional. The suite never requires them, but **whenever an
attribute is sent it must be correct**. The rules are applied to every record the ESS returns
(sync and async search results, transaction status, receipts) and to every record sent to an
SP-MIS or to the ESS (on-search, notify), and proven attribute by attribute in the offline rule
books (`@data`).

- **Types and formats**: identifiers are lists of `{identifier_type, identifier_value}` with a
  type from IdentifierTypeEnum; dates are ISO 8601 calendar dates that exist (`1985-02-30` is
  rejected) and are not in the future; phone numbers are E.164; e-mails RFC 5322; country codes
  ISO 3166; locales ISO 639-3; coordinates within range; group size an integer; poverty score
  a number; `is_disabled` a boolean (or `1` / `0`).
- **Code lists**: `sex`, `marital_status`, `employment_status` (EmploymentStatusEnum 1-7),
  `occupation` (ISCO-08 0-9), `education_level` (ISCED 0-8), `relationship_type`,
  `group_type` (AssistanceUnit), `employment_info.employment_type` (EmploymentType 1-5),
  `unemployment_reason` (UnemploymentReason 1-8), `disability_limitation_type` (Washington
  Group domains), `functional_severity` (1-4) and `enrolled_status` (EnrolmentStatus). Coded
  attributes accept the code, the published label (also in lower case, as the process flows
  send `"not employed"`, `"Seasonal"`, `"household"`) and, for numeric codes, a JSON integer.
  Free text such as `"employed"`, `"teacher"` or `"bachelor"` is rejected.
- **Employment consistency**: an `unemployment_reason` is only given when the member is not in
  employment; a member who is not employed has no employment period still running; an
  employment period ends after it starts, starts after birth and before death; periods with the
  same employer do not overlap. Contracts may end in the future.
- **Persons with disability**: a severity applies to a functional domain and each domain is
  listed once; "a lot of difficulty" or "cannot do at all" in a domain means `is_disabled` is
  not false; a person flagged disabled does not report "no difficulty" in every domain; the
  `disability_limitation_type` (core) and `functional_type` namings agree.
- **Persons and members**: death after birth, registration after birth, last update after
  registration, no duplicate identifiers, a member is not related to itself (except `SELF`),
  `demographic_info` is the person itself (not wrapped in `person`).
- **Groups**: no more members than `group_size`, an individual unit (`group_type` 1) has one
  member, no member listed twice, the head is one of the members, `place_address` points to a
  location that is given, and every member follows the member rules.
- **Messages**: the response echoes the request transaction, answers every `reference_id` with
  records of the requested type, honours pagination and sort, explains rejections with a reason
  code, and the enrolment check discloses only the enrolment status (no member data).

### Where the published examples deviate from the standard

The suite documents these as scenarios:

- the ESS `Member.yaml` example uses `NationalID`, `spouse`, `child`, `employed`, `teacher`,
  `bachelor` and a string `member_identifier`, none of which follow the code lists;
- the process flow 3 group sends `group_identifier` as a single object and
  `geographical_location` as text, and its search result uses `status: "success"`;
- process flow 1 sends `authorize.ts` as a `$ref` object;
- the process flow 1 and 2 members do follow the standard.

Choices made where the spec is ambiguous: `TxnStatusResponse.txn_status` is also accepted as a
SubscribeResponse / EnrolledResponse matching `txn_type`; `enrolled_status` accepts the seven
EnrolmentStatus labels (the API enum omits `Exited`); `additional_attributes` items are DCI
`{name, value}` pairs or one-key objects (`{"notes": "..."}`, process flow 3).

## Prerequisites

Docker and Docker Compose. To run without Docker you need Node.js 18 or later.

## Run the mocks

```bash
./test_entrypoint.sh
```

The ESS endpoints are served on port **3333** and the SP-MIS endpoints on port **3334**. Run
`GET /healthcheck` on either port to check they are up.

The mocks are generated from the test suite's schemas and records, so the two always agree.
After changing `schemas.js` or `fixtures/records.js`, regenerate them and rebuild:

```bash
node mock/generate-mocks.mjs
```

The generated `mockoon-ess.json` and `mockoon-sp.json` can be opened in the Mockoon desktop
app (v9 or later).

Mock test data: four households (plus a minimal group) and their members.

| Record type | Profile | Identifier | Enrolment status |
|---|---|---|---|
| Member | full (employed teacher, every attribute) | UIN `M100000001`, person UIN `100000001` | Active |
| Member | unemployed (redundancy, process flow 2) | UIN `M100000002`, person MRN `MRN1982000202` | Awaiting Renewal |
| Member | student (codes as JSON integers) | UIN `M100000003` | Exited |
| Member | child | UIN `M100000004`, person BRN `BRN2014000004` | none |
| Member | seasonal (labels, contract ending this year) | UIN `M200000001` | Reinstated |
| Member | disabled (person with disability) | UIN `M200000002`, person UIN `200000002` | Active |
| Member | deceased | UIN `M200000003`, person DRN `DRN2024000123` | Deceased |
| Member | disabled by label (person with disability, labels) | UIN `M300000004` | Suspended |
| Member | head (process flow 3 household) | UIN `M300000001` | Inactive |
| Member | jobseeker (process flows 1 and 4) | UIN `M400000001`, person UIN `ABC451123` | Active |
| Member | minimal | UIN `M900000001` | none |
| Group | full, disability, large, single, minimal | UIN `GRP1001`, `GRP2001`, `GRP3001`, `GRP4001`, `GRP9001` | Active, Active, Inactive, none, none |
| ESSPerson | the demographic_info of the members above | | |

The enrolment check answers the status above for any member, person or group identifier and
rejects (`rjct`, with a `status_reason_message`) identifiers without enrolment. Predicate
searches return the members not employed, the persons with disability, the members out of work
because of illness or disability, the women born since 1980, the households with
`poverty_score` < 5 and those with more than 3 members; expression searches return the
working-age members not employed and their households. The value `TOOMANY000` is rejected with
`rjct.search.too_many_records_found`. Any other identifier returns an empty result.

## Run the compliance tests

With Docker:

```bash
cd test && ./test_entrypoint.sh
```

Without Docker:

```bash
cd test && npm install && npx cucumber-js
```

Reports are written to `test/result` (HTML, JUnit XML, Cucumber messages).

### Continuous integration

`.github/workflows/compliance.yml` runs on every push to `main` and every pull request. It
checks that `mockoon-*.json` are up to date with the test schemas and fixtures, starts the
mocks, runs the whole suite and reports:

- a pass / fail **ESS compliance** check on the pull request;
- a per-feature results table, with the failing scenarios, on the run's summary page
  (written by `test/ci/summary.mjs`);
- the HTML, JUnit and Cucumber JSON reports as the `ess-compliance-report` artifact;
- on `main`, the HTML report of the latest run, published to GitHub Pages:
  <https://spdci.github.io/ESS-Mockup-Compliance/>.

### Testing your own implementation

| Variable | Default | Purpose |
|---|---|---|
| `ESS_BASE_URL` | `http://127.0.0.1:3333/` | ESS under test (search, check-enrollment, subscribe, txn status, notify, ...) |
| `SP_BASE_URL` | `http://127.0.0.1:3334/` | SP-MIS under test (on-search, notify, ...) |
| `CALLBACK_PORT` / `CALLBACK_BASE_URL` | `3335` / `http://127.0.0.1:3335/` | Listener used as `header.sender_uri`; must be reachable from the ESS under test |
| `TEST_DATA_FILE` | none | JSON overriding the identifiers queried and the enrolment statuses expected (see `helpers/testdata.js`) |
| `AUTH_TOKEN` | none | Sent as `Authorization: Bearer <token>` |
| `SENDER_ID` / `RECEIVER_ID` | `spmis.example.org` / `ess.example.org` | `header.sender_id` / `receiver_id` |
| `RESPONSE_TIMEOUT_MS` / `CALLBACK_TIMEOUT_MS` | `15000` / `10000` | Timeouts |
| `CUCUMBER_TAGS` (Docker only) | none | Tag expression to select scenarios |

Endpoint paths are listed in `test/features/support/helpers/helpers.js`.

A `TEST_DATA_FILE` names, per record type, identifiers that exist in your ESS, and the
enrolment status you expect for them (`none` when not enrolled):

```json
{
  "records": {
    "Member": { "disabled": { "identifier_type": "UIN", "identifier_value": "M-7781" } },
    "ESSPerson": { "jobseeker": { "identifier_type": "UIN", "identifier_value": "P-0042" } }
  },
  "enrolments": { "Member": { "disabled": "Active" } }
}
```

Select scenarios with tags:

| Tag | Scenarios |
|---|---|
| `@smoke` | basic checks for each endpoint |
| `@functional` | use cases |
| `@person`, `@member`, `@group` | sync search by record type |
| `@pwd` | persons with disability (searches, notifications, enrolment checks, data rules) |
| `@callback` | async round trips (need the listener to be reachable) |
| `@negative` | invalid requests |
| `@data` | offline ESS data rules |
| `@strict-data` | messages carrying incorrect ESS data must be rejected or are detected |
| `@mock` | relies on mock-only test data (exact enrolment statuses, too-many-records rejection) |

For example, to test a real ESS:

```bash
ESS_BASE_URL=https://ess.example.org/ TEST_DATA_FILE=./my-data.json npx cucumber-js --tags "not @mock"
```
