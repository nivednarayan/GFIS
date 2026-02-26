// backend/services/confidence_score.js

function apply_confidence_score(validation_result) {
  let score = 100;

  validation_result.error_codes.forEach(code => {
    if (code.startsWith("MISSING")) score -= 20;
    if (code === "ADDRESS_MISMATCH") score -= 30;
    if (code === "AGE_NOT_ELIGIBLE") score -= 50;
  });

  score = Math.max(score, 0);
  validation_result.confidence_score = score;

  if (score >= 90) validation_result.risk_level = "LOW";
  else if (score >= 70) validation_result.risk_level = "MEDIUM";
  else validation_result.risk_level = "HIGH";

  return validation_result;
}

module.exports = { apply_confidence_score };