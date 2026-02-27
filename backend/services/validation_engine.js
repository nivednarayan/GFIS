// backend/services/validation_engine.js

const ValidationResult = require("../models/validation_result");
const scheme_rules = require("../mock_data/scheme_rules.json");
const mock_docs = require("../mock_data/mock_digilocker.json");

function validate_application(user_input) {
  const result = new ValidationResult();
  const rules = scheme_rules[user_input.scheme];

  // Check: scheme exists
  if (!rules) {
    result.status = "FAIL";
    result.error_codes.push("INVALID_SCHEME");
    return result;
  }

  // Check: required fields
  rules.required_fields.forEach(field => {
    if (!user_input[field]) {
      result.status = "FAIL";
      result.error_codes.push(`MISSING_${field.toUpperCase()}`);
    }
  });

  // Check: age eligibility
  if (user_input.age && user_input.age < rules.min_age) {
    result.status = "FAIL";
    result.error_codes.push("AGE_NOT_ELIGIBLE");
  }

  // Check: address mismatch (mock verification)
  if (
    user_input.address &&
    mock_docs.address &&
    user_input.address.toLowerCase() !== mock_docs.address.toLowerCase()
  ) {
    result.status = "FAIL";
    result.error_codes.push("ADDRESS_MISMATCH");
  }

  return result;
}

module.exports = { validate_application };
function validateApplication(data) {
  const { name, age } = data;

  let errors = [];
  let passedChecks = 0;
  let totalChecks = 2;

  // Required fields
  if (!name || age === undefined) {
    errors.push("MISSING_FIELDS");
  } else {
    passedChecks++;
  }

  // Age rule
  if (age >= 60) {
    passedChecks++;
  } else {
    errors.push("AGE_TOO_LOW");
  }

  return {
    isValid: errors.length === 0,
    errors,
    passedChecks,
    totalChecks
  };
}

module.exports = validateApplication;
