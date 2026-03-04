/**
 * Schema for Ayushman Bharat Health Scheme
 * PM-JAY (Pradhan Mantri Jan Arogya Yojana)
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
      min: 0,
      max: 120
    }
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
    note: 'Should be below poverty line for eligibility'
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
  name: 'Ayushman Bharat (PM-JAY)',
  description: 'National Health Protection Scheme providing health coverage',
  eligibility: 'Families below poverty line',
  benefits: 'Health cover up to ₹5 lakh per family per year'
};

module.exports = {
  requiredFields,
  schemeInfo
};
