// backend/models/validation_result.js

class ValidationResult {
  constructor() {
    this.status = "PASS";          // PASS or FAIL
    this.error_codes = [];         // e.g. ["AGE_NOT_ELIGIBLE"]
    this.explanations = [];        // Human-readable messages
    this.confidence_score = 100;   // 0–100
    this.risk_level = "LOW";       // LOW / MEDIUM / HIGH
  }
}

module.exports = ValidationResult;