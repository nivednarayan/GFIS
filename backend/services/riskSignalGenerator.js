        /**
         * Risk Signal Generator Module
         * Generates risk signals for applications based on various validation rules
         * Pure functions - no database calls
 * Uses small, focused helper functions for each risk check
 */

const DEFAULT_INCOME_THRESHOLD = 300000; // Annual income threshold in INR
const AGE_MISMATCH_TOLERANCE = 1; // Years

// ============================================================================
// INPUT EXTRACTORS - Get data from application objects
// ============================================================================

const extractDateOfBirth = (userInputs = {}) => userInputs.dateOfBirth;
const extractStatedAge = (userInputs = {}) => userInputs.age;
const extractAnnualIncome = (userInputs = {}) => userInputs.annualIncome;
const extractDocuments = (application = {}) => application.documents || [];
const extractCreatedAt = (application = {}) => application.createdAt;
const extractUserInputs = (application = {}) => application.collectedAnswers || application.userInputs || {};

// ============================================================================
// VALIDATION HELPERS - Check individual conditions
// ============================================================================

/**
 * Check if date string is valid
 * @param {Date|String} dateStr - Date to validate
 * @returns {Boolean} True if valid date
 */
const isValidDate = (dateStr) => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date);
};

/**
 * Check if value is a valid number
 * @param {*} value - Value to validate
 * @returns {Boolean} True if valid number
 */
const isValidNumber = (value) => {
  const num = parseInt(value);
  return !isNaN(num) && num >= 0;
};

/**
 * Check if array has elements
 * @param {Array} arr - Array to check
 * @returns {Boolean} True if array is not empty
 */
const hasElements = (arr = []) => Array.isArray(arr) && arr.length > 0;

// ============================================================================
// CALCULATION HELPERS - Compute derived values
// ============================================================================

/**
 * Calculate age from date of birth
 * @param {Date|String} dob - Date of birth
 * @returns {Number|null} Age in years or null if invalid
 */
const calculateAge = (dob) => {
  if (!isValidDate(dob)) return null;

  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

/**
 * Parse age from input string
 * @param {String|Number} age - Age value to parse
 * @returns {Number|null} Parsed age or null if invalid
 */
const parseAge = (age) => {
  const parsed = parseInt(age);
  return isNaN(parsed) ? null : parsed;
};

/**
 * Calculate days between two dates
 * @param {Date|String} fromDate - Start date
 * @param {Date|String} toDate - End date (defaults to today)
 * @returns {Number} Number of days
 */
const calculateDaysDifference = (fromDate, toDate = new Date()) => {
  if (!isValidDate(fromDate)) return 0;

  const start = new Date(fromDate);
  const end = new Date(toDate);
  const timeDiff = end - start;

  return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
};

/**
 * Parse income string to number
 * @param {String|Number} income - Income value
 * @returns {Number|null} Parsed income or null if invalid
 */
const parseIncome = (income) => {
  const parsed = parseInt(income);
  return isNaN(parsed) ? null : parsed;
};

// ============================================================================
// COMPARISON HELPERS - Compare values with thresholds
// ============================================================================

/**
 * Check if age and stated age have significant mismatch
 * @param {Number} calculatedAge - Age calculated from DOB
 * @param {Number} statedAge - Age stated by user
 * @returns {Boolean} True if mismatch exceeds tolerance
 */
const hasAgeMismatch = (calculatedAge, statedAge) => {
  if (calculatedAge === null || statedAge === null) return false;
  return Math.abs(calculatedAge - statedAge) > AGE_MISMATCH_TOLERANCE;
};

/**
 * Check if income exceeds threshold
 * @param {Number} income - Annual income
 * @param {Number} threshold - Income threshold
 * @returns {Boolean} True if income exceeds threshold
 */
const exceedsIncomeThreshold = (income, threshold) => {
  return income !== null && threshold !== null && income > threshold;
};

// ============================================================================
// DOCUMENT HELPERS - Check document-related conditions
// ============================================================================

/**
 * Extract document names from document array
 * @param {Array} documents - Array of document objects
 * @returns {Array} List of document names
 */
const getDocumentNames = (documents = []) => {
  return documents.map((doc) => (doc.documentName || "").toLowerCase());
};

/**
 * Normalize document name for comparison
 * @param {String} docName - Document name
 * @returns {String} Normalized name
 */
const normalizeDocName = (docName) => (docName || "").toLowerCase();

/**
 * Check if required document is present
 * @param {Array} uploadedNames - List of uploaded document names
 * @param {String} requiredName - Required document name
 * @returns {Boolean} True if document found
 */
const isDocumentPresent = (uploadedNames, requiredName) => {
  const normalized = normalizeDocName(requiredName);
  return uploadedNames.some((uploaded) => uploaded.includes(normalized));
};

/**
 * Check if all required documents are present
 * @param {Array} uploadedNames - List of uploaded document names
 * @param {Array} requiredDocuments - List of required document names
 * @returns {Boolean} True if all required documents found
 */
const allRequiredDocumentsPresent = (uploadedNames, requiredDocuments = []) => {
  if (!hasElements(requiredDocuments)) return true;
  return requiredDocuments.every((required) => isDocumentPresent(uploadedNames, required));
};

// ============================================================================
// RISK DETECTION FUNCTIONS - Main risk check functions
// ============================================================================

/**
 * Check for age mismatch risk
 * @param {Object} userInputs - Collected user inputs
 * @returns {Boolean} True if age mismatch detected
 */
const detectAgeMismatch = (userInputs = {}) => {
  const dob = extractDateOfBirth(userInputs);
  const age = extractStatedAge(userInputs);

  if (!dob || !age) return false;

  const calculatedAge = calculateAge(dob);
  const statedAge = parseAge(age);

  return hasAgeMismatch(calculatedAge, statedAge);
};

/**
 * Check for income eligibility risk
 * @param {Object} userInputs - Collected user inputs
 * @param {Number} incomeThreshold - Income threshold
 * @returns {Boolean} True if income ineligible
 */
const detectIncomeIneligibility = (userInputs = {}, incomeThreshold = DEFAULT_INCOME_THRESHOLD) => {
  const incomeRaw = extractAnnualIncome(userInputs);

  if (!incomeRaw) return false;

  const income = parseIncome(incomeRaw);
  return exceedsIncomeThreshold(income, incomeThreshold);
};

/**
 * Check for missing documents risk
 * @param {Array} documents - Array of uploaded documents
 * @param {Array} requiredDocuments - List of required document types
 * @returns {Boolean} True if required documents missing
 */
const detectMissingDocuments = (documents = [], requiredDocuments = []) => {
  const uploadedNames = getDocumentNames(documents);
  return !allRequiredDocumentsPresent(uploadedNames, requiredDocuments);
};

/**
 * Calculate processing delay in days
 * @param {Date} createdAt - Application creation date
 * @returns {Number} Days since creation
 */
const calculateProcessingDelay = (createdAt) => {
  return calculateDaysDifference(createdAt);
};

// ============================================================================
// MAIN ORCHESTRATOR FUNCTION
// ============================================================================

/**
 * Generate risk signals for an application
 * Orchestrates all risk checks and returns structured result
 * @param {Object} application - Application object containing userInputs, documents, createdAt
 * @param {Object} options - Configuration options
 * @param {Number} options.incomeThreshold - Income threshold (default: 300000)
 * @param {Array} options.requiredDocuments - List of required document types for the scheme
 * @returns {Object} Risk signals object with all flags
 */
const generateRiskSignals = (application = {}, options = {}) => {
  const { incomeThreshold = DEFAULT_INCOME_THRESHOLD, requiredDocuments = [] } = options;
  const userInputs = extractUserInputs(application);
  const documents = extractDocuments(application);
  const createdAt = extractCreatedAt(application);

  return {
    ageMismatchFlag: detectAgeMismatch(userInputs),
    incomeIneligibleFlag: detectIncomeIneligibility(userInputs, incomeThreshold),
    missingDocumentsFlag: detectMissingDocuments(documents, requiredDocuments),
    duplicateFlag: false, // Placeholder - implement duplicate detection logic later
    processingDelayDays: calculateProcessingDelay(createdAt),
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Main function
  generateRiskSignals,

  // Risk detection functions
  detectAgeMismatch,
  detectIncomeIneligibility,
  detectMissingDocuments,
  calculateProcessingDelay,

  // Calculation helpers
  calculateAge,
  calculateDaysDifference,
  parseAge,
  parseIncome,

  // Comparison helpers
  hasAgeMismatch,
  exceedsIncomeThreshold,

  // Document helpers
  getDocumentNames,
  normalizeDocName,
  isDocumentPresent,
  allRequiredDocumentsPresent,

  // Validation helpers
  isValidDate,
  isValidNumber,
  hasElements,

  // Input extractors
  extractDateOfBirth,
  extractStatedAge,
  extractAnnualIncome,
  extractDocuments,
  extractCreatedAt,
  extractUserInputs,

  // Constants
  DEFAULT_INCOME_THRESHOLD,
  AGE_MISMATCH_TOLERANCE,
};
