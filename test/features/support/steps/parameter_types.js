import { defineParameterType } from '@cucumber/cucumber';

// ESS record types returned by searches and notifications.
defineParameterType({
  name: 'recordType',
  regexp: /ESSPerson|Member|Group/,
  transformer: (s) => s,
});

// Every ESS data object checked by the offline data rules (record types plus the
// EmploymentInfo and DisabilityInfo objects a member carries).
defineParameterType({
  name: 'dataType',
  regexp: /ESSPerson|Member|Group|EmploymentInfo|DisabilityInfo/,
  transformer: (s) => s,
});
