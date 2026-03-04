/**
 * Validate extracted fields to ensure data quality
 * Prevents field confusion and enforces strict type checking
 */

// Words that should never appear in a person's name
const REJECTED_NAME_WORDS = [
  'single', 'married', 'widowed', 'divorced', 'male', 'female',
  'age', 'years', 'income', 'aadhaar', 'mobile', 'phone'
];

/**
 * Validate a single field based on its type and constraints
 */
function validateField(fieldName, value, fieldSchema) {
  if (value === null || value === undefined || value === '') {
    return { valid: false, reason: 'Empty value' };
  }

  switch (fieldName) {
    case 'fullName':
      return validateFullName(value);
    
    case 'age':
      return validateAge(value);
    
    case 'gender':
      return validateGender(value);
    
    case 'mobileNumber':
      return validateMobile(value);
    
    case 'aadhaarNumber':
      return validateAadhaar(value);
    
    case 'annualIncome':
      return validateIncome(value);
    
    case 'maritalStatus':
      return validateMaritalStatus(value);
    
    case 'familyMembers':
      return validateFamilyMembers(value);
    
    case 'state':
    case 'district':
      return validateLocation(value);

    case 'rationCard':
    case 'rationCardNumber':
      return validateRationCard(value);

    default:
      return { valid: true }; // Unknown field types pass through
  }
}

/**
 * Validate full name
 */
function validateFullName(value) {
  const name = String(value).trim();
  
  // Must have at least 2 words (first + last name)
  if (!/^[A-Za-z]+(?:\s+[A-Za-z]+)+$/.test(name)) {
    return { valid: false, reason: 'Name must have at least 2 words with only letters' };
  }
  
  // Must not contain rejected words (using word boundaries)
  for (const rejected of REJECTED_NAME_WORDS) {
    const regex = new RegExp(`\\b${rejected}\\b`, 'i');
    if (regex.test(name)) {
      return { valid: false, reason: `Name contains invalid word: ${rejected}` };
    }
  }
  
  // Must not be purely numeric
  if (/^\d+$/.test(name)) {
    return { valid: false, reason: 'Name cannot be purely numeric' };
  }
  
  return { valid: true };
}

/**
 * Validate age
 */
function validateAge(value) {
  const age = parseInt(value);
  
  if (isNaN(age)) {
    return { valid: false, reason: 'Age must be a number' };
  }
  
  if (age < 0 || age > 120) {
    return { valid: false, reason: 'Age must be between 0 and 120' };
  }
  
  return { valid: true };
}

/**
 * Validate gender
 */
function validateGender(value) {
  const gender = String(value).toLowerCase();
  
  if (!['male', 'female', 'm', 'f'].includes(gender)) {
    return { valid: false, reason: 'Gender must be male or female' };
  }
  
  return { valid: true };
}

/**
 * Validate mobile number
 */
function validateMobile(value) {
  const mobile = String(value).replace(/\D/g, '');
  
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    return { valid: false, reason: 'Mobile must be 10 digits starting with 6-9' };
  }
  
  return { valid: true };
}

/**
 * Validate Aadhaar number
 */
function validateAadhaar(value) {
  const aadhaar = String(value).replace(/\D/g, '');
  
  if (!/^\d{12}$/.test(aadhaar)) {
    return { valid: false, reason: 'Aadhaar must be exactly 12 digits' };
  }
  
  return { valid: true };
}

/**
 * Validate annual income
 */
function validateIncome(value) {
  const income = parseInt(String(value).replace(/,/g, ''));
  
  if (isNaN(income)) {
    return { valid: false, reason: 'Income must be a number' };
  }
  
  if (income < 0) {
    return { valid: false, reason: 'Income cannot be negative' };
  }
  
  if (income > 100000000) { // 10 crore max
    return { valid: false, reason: 'Income exceeds maximum limit' };
  }
  
  return { valid: true };
}

/**
 * Validate marital status
 */
function validateMaritalStatus(value) {
  const status = String(value).toLowerCase();
  
  if (!['single', 'married', 'widowed', 'divorced'].includes(status)) {
    return { valid: false, reason: 'Marital status must be single, married, widowed, or divorced' };
  }
  
  return { valid: true };
}

/**
 * Validate family members
 */
function validateFamilyMembers(value) {
  const members = parseInt(value);
  
  if (isNaN(members)) {
    return { valid: false, reason: 'Family members must be a number' };
  }
  
  if (members < 1 || members > 50) {
    return { valid: false, reason: 'Family members must be between 1 and 50' };
  }
  
  return { valid: true };
}

/**
 * Validate location (state/district)
 */
function validateLocation(value) {
  const location = String(value).trim();
  
  if (location.length < 2) {
    return { valid: false, reason: 'Location name too short' };
  }
  
  if (!/^[A-Za-z\s]+$/.test(location)) {
    return { valid: false, reason: 'Location must contain only letters' };
  }
  
  return { valid: true };
}

/**
 * Validate ration card number
 */
function validateRationCard(value) {
  const rationCard = String(value || '').trim();

  if (!/^[A-Za-z0-9\/-]{4,20}$/.test(rationCard)) {
    return { valid: false, reason: 'Ration card must be 4-20 alphanumeric characters' };
  }

  if (['number', 'num', 'no', 'card', 'ration'].includes(rationCard.toLowerCase())) {
    return { valid: false, reason: 'Ration card value cannot be a keyword' };
  }

  return { valid: true };
}

/**
 * Validate all extracted fields
 * @param {Object} extractedData - The extracted data object
 * @param {Array} requiredFields - Schema definition of required fields
 * @returns {Object} - Validated data with invalid fields removed
 */
function validateFields(extractedData, requiredFields) {
  const validatedData = {};
  
  for (const [fieldName, value] of Object.entries(extractedData)) {
    // Find field schema
    const fieldSchema = requiredFields.find(f => f.name === fieldName);
    
    // Validate the field
    const validation = validateField(fieldName, value, fieldSchema);
    
    if (validation.valid) {
      validatedData[fieldName] = value;
    } else {
      console.warn(`⚠️ Field ${fieldName} failed validation: ${validation.reason} (value: ${value})`);
    }
  }
  
  return validatedData;
}

module.exports = validateFields;
