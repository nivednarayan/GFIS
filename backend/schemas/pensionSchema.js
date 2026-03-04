/**
 * Schema for Widow/Old Age Pension Schemes
 * Common schema for various state pension programs
 */

const requiredFields = [
  {
    name: 'fullName',
    label: 'Full Name',
    type: 'text',
    required: true,
    validation: {
      pattern: '^[A-Za-z]+(\\s+[A-Za-z]+)+$',
      minLength: 3,
      maxLength: 100
    }
  },
  {
    name: 'age',
    label: 'Age',
    type: 'number',
    required: true,
    validation: {
      min: 18,
      max: 120
    },
    note: 'Old age pension typically requires 60+ years'
  },
  {
    name: 'gender',
    label: 'Gender',
    type: 'select',
    required: true,
    options: ['male', 'female']
  },
  {
    name: 'aadhaarNumber',
    label: 'Aadhaar Number',
    type: 'text',
    required: true,
    validation: {
      pattern: '^\\d{12}$',
      length: 12
    }
  },
  {
    name: 'mobileNumber',
    label: 'Mobile Number',
    type: 'text',
    required: true,
    validation: {
      pattern: '^[6-9]\\d{9}$',
      length: 10
    }
  },
  {
    name: 'maritalStatus',
    label: 'Marital Status',
    type: 'select',
    required: true,
    options: ['single', 'married', 'widowed', 'divorced'],
    note: 'Required for widow pension eligibility'
  },
  {
    name: 'state',
    label: 'State',
    type: 'text',
    required: true
  },
  {
    name: 'district',
    label: 'District',
    type: 'text',
    required: true
  },
  {
    name: 'annualIncome',
    label: 'Annual Income',
    type: 'number',
    required: true,
    validation: {
      min: 0,
      max: 100000000
    },
    note: 'Should be below income threshold for eligibility'
  },
  {
    name: 'familyMembers',
    label: 'Family Members',
    type: 'number',
    required: false,
    validation: {
      min: 1,
      max: 50
    }
  }
];

const schemeInfo = {
  name: 'Widow/Old Age Pension',
  description: 'Financial assistance for widows and senior citizens',
  eligibility: 'Widows or senior citizens above 60 years with low income',
  benefits: 'Monthly pension (varies by state, typically ₹500-₹2000)'
};

module.exports = {
  requiredFields,
  schemeInfo
};
