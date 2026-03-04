/**
 * Schema for PM-KISAN Scheme
 * Pradhan Mantri Kisan Samman Nidhi
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
    note: 'Must be 18 or above'
  },
  {
    name: 'gender',
    label: 'Gender',
    type: 'select',
    required: false,
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
    name: 'landHolding',
    label: 'Land Holding (in hectares)',
    type: 'number',
    required: false,
    validation: {
      min: 0,
      max: 10000
    }
  }
];

const schemeInfo = {
  name: 'PM-KISAN',
  description: 'Income support to farmers',
  eligibility: 'Small and marginal farmers',
  benefits: '₹6,000 per year in three installments'
};

module.exports = {
  requiredFields,
  schemeInfo
};
