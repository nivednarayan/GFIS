/**
 * Risk Data Persistence Service
 * Handles database operations for risk assessment data
 * Updates application documents with risk signals, scores, and AI analysis
 */

const mongoose = require("mongoose");

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate application ID format
 * @param {String} applicationId - Application ID to validate
 * @returns {Boolean} True if valid
 */
const isValidApplicationId = (applicationId) => {
  return typeof applicationId === "string" && applicationId.trim().length > 0;
};

/**
 * Validate risk data structure
 * @param {Object} riskData - Risk data to validate
 * @returns {Boolean} True if valid
 */
const isValidRiskData = (riskData = {}) => {
  return (
    typeof riskData === "object" &&
    ((typeof riskData.riskSignals === "object" && riskData.riskSignals !== null) ||
      riskData.riskSignals === undefined) &&
    ((typeof riskData.riskScore === "number" && riskData.riskScore >= 0 && riskData.riskScore <= 100) ||
      riskData.riskScore === undefined) &&
    ((typeof riskData.riskLevel === "string" &&
      ["Low", "Medium", "High"].includes(riskData.riskLevel)) ||
      riskData.riskLevel === undefined) &&
    ((typeof riskData.aiAnalysis === "object" && riskData.aiAnalysis !== null) ||
      riskData.aiAnalysis === undefined)
  );
};

/**
 * Validate risk signals structure
 * @param {Object} riskSignals - Risk signals to validate
 * @returns {Boolean} True if valid
 */
const isValidRiskSignals = (riskSignals = {}) => {
  return (
    typeof riskSignals === "object" &&
    (typeof riskSignals.ageMismatchFlag === "boolean" || riskSignals.ageMismatchFlag === null) &&
    (typeof riskSignals.incomeIneligibleFlag === "boolean" ||
      riskSignals.incomeIneligibleFlag === null) &&
    (typeof riskSignals.missingDocumentsFlag === "boolean" ||
      riskSignals.missingDocumentsFlag === null) &&
    (typeof riskSignals.duplicateFlag === "boolean" || riskSignals.duplicateFlag === null) &&
    (typeof riskSignals.processingDelayDays === "number" ||
      riskSignals.processingDelayDays === null)
  );
};

/**
 * Validate AI analysis structure
 * @param {Object} aiAnalysis - AI analysis to validate
 * @returns {Boolean} True if valid
 */
const isValidAIAnalysis = (aiAnalysis = {}) => {
  return (
    typeof aiAnalysis === "object" &&
    (typeof aiAnalysis.rejectionProbability === "number" ||
      aiAnalysis.rejectionProbability === null) &&
    (Array.isArray(aiAnalysis.topReasons) || aiAnalysis.topReasons === undefined) &&
    (typeof aiAnalysis.fraudIndicator === "string" || aiAnalysis.fraudIndicator === null)
  );
};

// ============================================================================
// DATA SANITIZATION
// ============================================================================

/**
 * Sanitize and normalize risk data for database storage
 * @param {Object} riskData - Risk data to sanitize
 * @returns {Object} Sanitized risk data
 */
const sanitizeRiskData = (riskData = {}) => {
  const sanitized = {};

  // Sanitize risk signals
  if (riskData.riskSignals !== undefined && isValidRiskSignals(riskData.riskSignals)) {
    sanitized.riskSignals = {
      ageMismatchFlag: riskData.riskSignals.ageMismatchFlag ?? null,
      incomeIneligibleFlag: riskData.riskSignals.incomeIneligibleFlag ?? null,
      missingDocumentsFlag: riskData.riskSignals.missingDocumentsFlag ?? null,
      duplicateFlag: riskData.riskSignals.duplicateFlag ?? null,
      processingDelayDays: riskData.riskSignals.processingDelayDays ?? null,
    };
  }

  // Sanitize risk score (0-100)
  if (typeof riskData.riskScore === "number") {
    sanitized.riskScore = Math.min(Math.max(riskData.riskScore, 0), 100);
  }

  // Sanitize risk level
  if (
    typeof riskData.riskLevel === "string" &&
    ["Low", "Medium", "High"].includes(riskData.riskLevel)
  ) {
    sanitized.riskLevel = riskData.riskLevel;
  }

  // Sanitize AI analysis
  if (riskData.aiAnalysis !== undefined && isValidAIAnalysis(riskData.aiAnalysis)) {
    sanitized.aiAnalysis = {
      rejectionProbability: riskData.aiAnalysis.rejectionProbability ?? null,
      topReasons: Array.isArray(riskData.aiAnalysis.topReasons)
        ? riskData.aiAnalysis.topReasons.filter((r) => typeof r === "string")
        : [],
      fraudIndicator: riskData.aiAnalysis.fraudIndicator ?? null,
    };
  }

  return sanitized;
};

// ============================================================================
// DATABASE UPDATE FUNCTIONS
// ============================================================================

/**
 * Update application with risk assessment data
 * Uses $set operator to update only specified fields
 * @param {String} applicationId - Application ID to update
 * @param {Object} riskData - Risk assessment data containing riskSignals, riskScore, riskLevel, aiAnalysis
 * @param {Object} Application - Mongoose Application model
 * @returns {Promise<Object>} Updated application document
 * @throws {Error} If validation fails or database operation fails
 */
const updateApplicationRisk = async (applicationId, riskData, Application) => {
  // Validate inputs
  if (!isValidApplicationId(applicationId)) {
    throw new Error("Invalid application ID provided");
  }

  if (!isValidRiskData(riskData)) {
    throw new Error("Invalid risk data structure");
  }

  if (!Application || typeof Application.findByIdAndUpdate !== "function") {
    throw new Error("Invalid Application model provided");
  }

  try {
    // Sanitize data
    const sanitized = sanitizeRiskData(riskData);

    // If no valid data after sanitization, return error
    if (Object.keys(sanitized).length === 0) {
      throw new Error("No valid risk data to update");
    }

    // Build $set object with only provided fields
    const updateObject = {
      $set: sanitized,
    };

    // Perform update with new document returned
    const updatedApplication = await Application.findByIdAndUpdate(
      applicationId,
      updateObject,
      {
        new: true, // Return updated document
        runValidators: true, // Run schema validators
      }
    );

    // Check if document exists
    if (!updatedApplication) {
      throw new Error(`Application with ID ${applicationId} not found`);
    }

    return {
      success: true,
      data: updatedApplication,
      error: null,
    };
  } catch (error) {
    throw new Error(`Failed to update application risk data: ${error.message}`);
  }
};

/**
 * Update application risk by applicationId string (not MongoDB _id)
 * @param {String} applicationId - Application ID (custom field)
 * @param {Object} riskData - Risk assessment data
 * @param {Object} Application - Mongoose Application model
 * @returns {Promise<Object>} Updated application document
 */
const updateApplicationRiskByApplicationId = async (applicationId, riskData, Application) => {
  if (!isValidApplicationId(applicationId)) {
    throw new Error("Invalid application ID provided");
  }

  if (!isValidRiskData(riskData)) {
    throw new Error("Invalid risk data structure");
  }

  if (!Application || typeof Application.findOneAndUpdate !== "function") {
    throw new Error("Invalid Application model provided");
  }

  try {
    const sanitized = sanitizeRiskData(riskData);

    if (Object.keys(sanitized).length === 0) {
      throw new Error("No valid risk data to update");
    }

    const updateObject = {
      $set: sanitized,
    };

    const updatedApplication = await Application.findOneAndUpdate(
      { applicationId },
      updateObject,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedApplication) {
      throw new Error(`Application with ID ${applicationId} not found`);
    }

    return {
      success: true,
      data: updatedApplication,
      error: null,
    };
  } catch (error) {
    throw new Error(
      `Failed to update application risk data: ${error.message}`
    );
  }
};

/**
 * Batch update multiple applications with risk data
 * @param {Array<Object>} updates - Array of {applicationId, riskData} objects
 * @param {Object} Application - Mongoose Application model
 * @returns {Promise<Object>} Result with successful and failed updates
 */
const batchUpdateApplicationsRisk = async (updates = [], Application) => {
  if (!Array.isArray(updates) || updates.length === 0) {
    throw new Error("Updates array must be non-empty");
  }

  if (!Application || typeof Application.findOneAndUpdate !== "function") {
    throw new Error("Invalid Application model provided");
  }

  const results = {
    successful: [],
    failed: [],
  };

  for (const update of updates) {
    try {
      const result = await updateApplicationRiskByApplicationId(
        update.applicationId,
        update.riskData,
        Application
      );

      results.successful.push({
        applicationId: update.applicationId,
        document: result.data,
      });
    } catch (error) {
      results.failed.push({
        applicationId: update.applicationId,
        error: error.message,
      });
    }
  }

  return {
    totalProcessed: updates.length,
    successCount: results.successful.length,
    failureCount: results.failed.length,
    results,
  };
};

/**
 * Clear risk assessment data from an application
 * @param {String} applicationId - Application ID to clear
 * @param {Object} Application - Mongoose Application model
 * @returns {Promise<Object>} Updated application document
 */
const clearApplicationRisk = async (applicationId, Application) => {
  if (!isValidApplicationId(applicationId)) {
    throw new Error("Invalid application ID provided");
  }

  if (!Application || typeof Application.findOneAndUpdate !== "function") {
    throw new Error("Invalid Application model provided");
  }

  try {
    const updateObject = {
      $unset: {
        riskSignals: "",
        riskScore: "",
        riskLevel: "",
        aiAnalysis: "",
      },
    };

    const updatedApplication = await Application.findOneAndUpdate(
      { applicationId },
      updateObject,
      {
        new: true,
      }
    );

    if (!updatedApplication) {
      throw new Error(`Application with ID ${applicationId} not found`);
    }

    return {
      success: true,
      data: updatedApplication,
      error: null,
    };
  } catch (error) {
    throw new Error(`Failed to clear application risk data: ${error.message}`);
  }
};

/**
 * Get application risk assessment data
 * @param {String} applicationId - Application ID
 * @param {Object} Application - Mongoose Application model
 * @returns {Promise<Object>} Application with only risk fields
 */
const getApplicationRisk = async (applicationId, Application) => {
  if (!isValidApplicationId(applicationId)) {
    throw new Error("Invalid application ID provided");
  }

  if (!Application || typeof Application.findOne !== "function") {
    throw new Error("Invalid Application model provided");
  }

  try {
    const application = await Application.findOne(
      { applicationId },
      {
        riskSignals: 1,
        riskScore: 1,
        riskLevel: 1,
        aiAnalysis: 1,
        applicationId: 1,
      }
    );

    if (!application) {
      throw new Error(`Application with ID ${applicationId} not found`);
    }

    return {
      success: true,
      data: {
        applicationId: application.applicationId,
        riskSignals: application.riskSignals || null,
        riskScore: application.riskScore || null,
        riskLevel: application.riskLevel || null,
        aiAnalysis: application.aiAnalysis || null,
      },
      error: null,
    };
  } catch (error) {
    throw new Error(`Failed to retrieve application risk data: ${error.message}`);
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Main update functions
  updateApplicationRisk,
  updateApplicationRiskByApplicationId,
  batchUpdateApplicationsRisk,
  clearApplicationRisk,
  getApplicationRisk,

  // Validation helpers
  isValidApplicationId,
  isValidRiskData,
  isValidRiskSignals,
  isValidAIAnalysis,

  // Data sanitization
  sanitizeRiskData,
};
