/**
 * Risk Score Calculator Module
 * Converts risk signals into weighted risk scores and determines risk levels
 * Pure functions - no database calls
 */

// ============================================================================
// CONSTANTS - Risk Weights and Thresholds
// ============================================================================

const RISK_WEIGHTS = {
  ageMismatchFlag: 25,
  incomeIneligibleFlag: 30,
  missingDocumentsFlag: 20,
  duplicateFlag: 40,
  processingDelayThreshold: 7, // Days
  processingDelayScore: 10,
};

const RISK_LEVEL_THRESHOLDS = {
  LOW: { min: 0, max: 30 },
  MEDIUM: { min: 31, max: 60 },
  HIGH: { min: 61, max: 100 },
};

const MAX_RISK_SCORE = 100;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Check if riskSignals object is valid
 * @param {Object} riskSignals - Risk signals object
 * @returns {Boolean} True if valid
 */
const isValidRiskSignals = (riskSignals = {}) => {
  return (
    typeof riskSignals === "object" &&
    (typeof riskSignals.ageMismatchFlag === "boolean" ||
      riskSignals.ageMismatchFlag === null ||
      riskSignals.ageMismatchFlag === undefined) &&
    (typeof riskSignals.incomeIneligibleFlag === "boolean" ||
      riskSignals.incomeIneligibleFlag === null ||
      riskSignals.incomeIneligibleFlag === undefined) &&
    (typeof riskSignals.missingDocumentsFlag === "boolean" ||
      riskSignals.missingDocumentsFlag === null ||
      riskSignals.missingDocumentsFlag === undefined) &&
    (typeof riskSignals.duplicateFlag === "boolean" ||
      riskSignals.duplicateFlag === null ||
      riskSignals.duplicateFlag === undefined) &&
    (typeof riskSignals.processingDelayDays === "number" ||
      riskSignals.processingDelayDays === null ||
      riskSignals.processingDelayDays === undefined)
  );
};

/**
 * Check if risk score is within valid range
 * @param {Number} score - Risk score
 * @returns {Boolean} True if valid (0-100)
 */
const isValidScore = (score) => typeof score === "number" && score >= 0 && score <= MAX_RISK_SCORE;

// ============================================================================
// SCORE CALCULATION HELPERS
// ============================================================================

/**
 * Calculate score for a boolean flag
 * @param {Boolean} flag - Risk flag
 * @param {Number} weight - Weight of the flag
 * @returns {Number} Contribution to total score
 */
const calculateFlagScore = (flag, weight) => {
  return flag === true ? weight : 0;
};

/**
 * Calculate score for processing delay
 * @param {Number} delayDays - Processing delay in days
 * @returns {Number} Contribution to total score
 */
const calculateProcessingDelayScore = (delayDays) => {
  if (typeof delayDays !== "number" || delayDays <= 0) return 0;
  return delayDays > RISK_WEIGHTS.processingDelayThreshold
    ? RISK_WEIGHTS.processingDelayScore
    : 0;
};

/**
 * Calculate individual risk scores from signal flags
 * @param {Object} riskSignals - Risk signals object
 * @returns {Object} Individual component scores
 */
const calculateComponentScores = (riskSignals = {}) => {
  return {
    ageMismatchScore: calculateFlagScore(
      riskSignals.ageMismatchFlag,
      RISK_WEIGHTS.ageMismatchFlag
    ),
    incomeIneligibleScore: calculateFlagScore(
      riskSignals.incomeIneligibleFlag,
      RISK_WEIGHTS.incomeIneligibleFlag
    ),
    missingDocumentsScore: calculateFlagScore(
      riskSignals.missingDocumentsFlag,
      RISK_WEIGHTS.missingDocumentsFlag
    ),
    duplicateScore: calculateFlagScore(
      riskSignals.duplicateFlag,
      RISK_WEIGHTS.duplicateFlag
    ),
    processingDelayScore: calculateProcessingDelayScore(riskSignals.processingDelayDays),
  };
};

/**
 * Sum all component scores
 * @param {Object} componentScores - Individual component scores
 * @returns {Number} Total score
 */
const sumComponentScores = (componentScores = {}) => {
  return (
    (componentScores.ageMismatchScore || 0) +
    (componentScores.incomeIneligibleScore || 0) +
    (componentScores.missingDocumentsScore || 0) +
    (componentScores.duplicateScore || 0) +
    (componentScores.processingDelayScore || 0)
  );
};

/**
 * Normalize score to 0-100 range
 * Note: Current weights sum to 125, so we cap at 100
 * @param {Number} rawScore - Calculated raw score
 * @returns {Number} Normalized score (0-100)
 */
const normalizeScore = (rawScore) => {
  return Math.min(Math.max(rawScore, 0), MAX_RISK_SCORE);
};

// ============================================================================
// RISK LEVEL HELPERS
// ============================================================================

/**
 * Determine risk level based on score
 * @param {Number} riskScore - Risk score (0-100)
 * @returns {String} Risk level: "Low", "Medium", or "High"
 */
const determineRiskLevel = (riskScore) => {
  if (!isValidScore(riskScore)) return null;

  if (riskScore <= RISK_LEVEL_THRESHOLDS.LOW.max) {
    return "Low";
  } else if (riskScore <= RISK_LEVEL_THRESHOLDS.MEDIUM.max) {
    return "Medium";
  } else {
    return "High";
  }
};

/**
 * Get risk level with category details
 * @param {Number} riskScore - Risk score (0-100)
 * @returns {Object} Risk level and threshold information
 */
const getRiskLevelDetails = (riskScore) => {
  const level = determineRiskLevel(riskScore);

  if (!level) return null;

  const thresholds = RISK_LEVEL_THRESHOLDS[level.toUpperCase()];
  return {
    level,
    score: riskScore,
    min: thresholds.min,
    max: thresholds.max,
  };
};

// ============================================================================
// MAIN CALCULATOR FUNCTION
// ============================================================================

/**
 * Calculate comprehensive risk assessment
 * Combines individual risk signals into a normalized score and risk level
 * @param {Object} riskSignals - Risk signals object from riskSignalGenerator
 * @returns {Object} Object containing riskScore and riskLevel
 * @throws {Error} If riskSignals is invalid
 */
const calculateRiskScore = (riskSignals = {}) => {
  // Validate input
  if (!isValidRiskSignals(riskSignals)) {
    throw new Error("Invalid riskSignals object provided to calculateRiskScore");
  }

  // Calculate component scores
  const componentScores = calculateComponentScores(riskSignals);

  // Sum components
  const rawScore = sumComponentScores(componentScores);

  // Normalize to 0-100
  const normalizedScore = normalizeScore(rawScore);

  // Determine risk level
  const riskLevel = determineRiskLevel(normalizedScore);

  return {
    riskScore: normalizedScore,
    riskLevel,
    breakdown: {
      ageMismatchScore: componentScores.ageMismatchScore,
      incomeIneligibleScore: componentScores.incomeIneligibleScore,
      missingDocumentsScore: componentScores.missingDocumentsScore,
      duplicateScore: componentScores.duplicateScore,
      processingDelayScore: componentScores.processingDelayScore,
      totalBeforeNormalization: rawScore,
    },
  };
};

/**
 * Calculate risk score without detailed breakdown
 * Lightweight version for performance-critical paths
 * @param {Object} riskSignals - Risk signals object
 * @returns {Object} Simple object with riskScore and riskLevel
 */
const calculateRiskScoreLite = (riskSignals = {}) => {
  if (!isValidRiskSignals(riskSignals)) {
    return { riskScore: 0, riskLevel: "Low" };
  }

  const componentScores = calculateComponentScores(riskSignals);
  const rawScore = sumComponentScores(componentScores);
  const normalizedScore = normalizeScore(rawScore);

  return {
    riskScore: normalizedScore,
    riskLevel: determineRiskLevel(normalizedScore),
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Main functions
  calculateRiskScore,
  calculateRiskScoreLite,

  // Component scoring
  calculateComponentScores,
  calculateFlagScore,
  calculateProcessingDelayScore,
  sumComponentScores,
  normalizeScore,

  // Risk level determination
  determineRiskLevel,
  getRiskLevelDetails,

  // Validation
  isValidRiskSignals,
  isValidScore,

  // Constants
  RISK_WEIGHTS,
  RISK_LEVEL_THRESHOLDS,
  MAX_RISK_SCORE,
};
