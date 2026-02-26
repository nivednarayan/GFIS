// backend/services/rejection_explanation.js

const rejection_reasons = require("../mock_data/rejection_reasons.json");

function generate_explanations(validation_result) {
  validation_result.error_codes.forEach(code => {
    if (rejection_reasons[code]) {
      validation_result.explanations.push(
        rejection_reasons[code].explanation
      );
    }
  });

  return validation_result;
}

module.exports = { generate_explanations };