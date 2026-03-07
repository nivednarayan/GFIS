/**
 * Risk Assessment Service
 * Orchestrates risk signal generation, scoring, and AI analysis
 * Provides comprehensive risk assessment for applications
 */

const riskSignalGenerator = require("./riskSignalGenerator");
const riskScoreCalculator = require("./riskScoreCalculator");
const { createClient: createBedrockClient } = require("./bedrockClient");

// ============================================================================
// CONSTANTS
// ============================================================================

const ASSESSMENT_STATUS = {
  SUCCESS: "success",
  PARTIAL: "partial",
  FAILED: "failed",
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Check if application object is valid for assessment
 * @param {Object} application - Application object
 * @returns {Boolean} True if valid
 */
const isValidApplication = (application = {}) => {
  return (
    typeof application === "object" &&
    (typeof application.applicationId === "string" || application.applicationId !== undefined) &&
    (typeof application.documents === "object" || application.documents === undefined)
  );
};

/**
 * Sanitize application data for assessment
 * Removes sensitive data and ensures consistency
 * @param {Object} application - Application object
 * @returns {Object} Sanitized application
 */
const sanitizeApplicationData = (application = {}) => {
  return {
    applicationId: application.applicationId || "unknown",
    schemeName: application.schemeName || "Unknown Scheme",
    status: application.status || "draft",
    createdAt: application.createdAt || new Date(),
    submittedAt: application.submittedAt || null,
    collectedAnswers: application.collectedAnswers || {},
    userInputs: application.userInputs || {},
    documents: application.documents || [],
    validationErrors: application.validationErrors || [],
  };
};

// ============================================================================
// ASSESSMENT PHASE FUNCTIONS
// ============================================================================

/**
 * Phase 1: Generate risk signals from application data
 * @param {Object} application - Application object
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Risk signals result
 */
const generateRiskSignals = async (application = {}, options = {}) => {
  try {
    const signals = riskSignalGenerator.generateRiskSignals(application, options);

    return {
      status: "success",
      data: signals,
      error: null,
    };
  } catch (error) {
    return {
      status: "failed",
      data: null,
      error: `Risk signal generation failed: ${error.message}`,
    };
  }
};

/**
 * Phase 2: Calculate risk score and level
 * @param {Object} riskSignals - Risk signals from phase 1
 * @returns {Promise<Object>} Risk score result
 */
const calculateRiskScore = async (riskSignals = {}) => {
  try {
    const assessment = riskScoreCalculator.calculateRiskScore(riskSignals);

    return {
      status: "success",
      data: {
        riskScore: assessment.riskScore,
        riskLevel: assessment.riskLevel,
        breakdown: assessment.breakdown,
      },
      error: null,
    };
  } catch (error) {
    return {
      status: "failed",
      data: null,
      error: `Risk score calculation failed: ${error.message}`,
    };
  }
};

/**
 * Phase 3: Get AI analysis from Bedrock
 * @param {Object} application - Application object
 * @param {Object} riskSignals - Risk signals from phase 1
 * @param {Number} riskScore - Risk score from phase 2
 * @returns {Promise<Object>} AI analysis result
 */
const getAIAnalysis = async (application = {}, riskSignals = {}, riskScore = 0) => {
  try {
    const bedrockClient = createBedrockClient();

    const result = await bedrockClient.analyzeRisk({
      applicationId: application.applicationId,
      schemeName: application.schemeName,
      riskSignals,
      riskScore,
      userInputs: application.collectedAnswers || application.userInputs || {},
      status: application.status,
      submittedAt: application.submittedAt,
    });

    if (!result.success) {
      return {
        status: "failed",
        data: null,
        error: `Bedrock analysis failed: ${result.error}`,
      };
    }

    return {
      status: "success",
      data: result.data,
      error: null,
      mode: result.mode,
    };
  } catch (error) {
    return {
      status: "failed",
      data: null,
      error: `AI analysis failed: ${error.message}`,
    };
  }
};

// ============================================================================
// RESULT MERGING
// ============================================================================

/**
 * Merge all assessment results into final structure
 * @param {Object} signalsResult - Risk signals result
 * @param {Object} scoreResult - Risk score result
 * @param {Object} aiResult - AI analysis result
 * @returns {Object} Merged assessment result
 */
const mergeAssessmentResults = (signalsResult = {}, scoreResult = {}, aiResult = {}) => {
  const riskSignals = signalsResult.data || {};
  const scoreData = scoreResult.data || {};
  const aiData = aiResult.data || {};

  // Determine overall assessment status
  const allSuccessful =
    signalsResult.status === "success" &&
    scoreResult.status === "success" &&
    aiResult.status === "success";

  const anyFailed =
    signalsResult.status === "failed" ||
    scoreResult.status === "failed" ||
    aiResult.status === "failed";

  const overallStatus = allSuccessful
    ? ASSESSMENT_STATUS.SUCCESS
    : anyFailed
      ? ASSESSMENT_STATUS.PARTIAL
      : ASSESSMENT_STATUS.FAILED;

  // Collect all errors
  const errors = [signalsResult.error, scoreResult.error, aiResult.error].filter(Boolean);

  return {
    status: overallStatus,
    riskSignals,
    riskScore: scoreData.riskScore || 0,
    riskLevel: scoreData.riskLevel || "Low",
    aiAnalysis: {
      rejectionProbability: aiData.rejectionProbability || null,
      topReasons: aiData.topReasons || [],
      fraudIndicator: aiData.fraudIndicator || null,
    },
    assessmentBreakdown: {
      riskSignalsStatus: signalsResult.status,
      riskScoreStatus: scoreResult.status,
      aiAnalysisStatus: aiResult.status,
      scoreBreakdown: scoreData.breakdown,
      aiMode: aiResult.mode,
    },
    errors: errors.length > 0 ? errors : null,
    timestamp: new Date().toISOString(),
  };
};

// ============================================================================
// MAIN ASSESSMENT FUNCTION
// ============================================================================

/**
 * Comprehensive risk assessment service
 * Orchestrates all risk assessment phases and returns merged results
 * @param {Object} application - Application object to assess
 * @param {Object} options - Assessment options
 * @param {Array} options.requiredDocuments - Required documents for scheme
 * @param {Number} options.incomeThreshold - Income eligibility threshold
 * @returns {Promise<Object>} Complete risk assessment result
 */
const assessApplicationRisk = async (application = {}, options = {}) => {
  try {
    // Validate input
    if (!isValidApplication(application)) {
      throw new Error("Invalid application object provided");
    }

    // Sanitize data
    const sanitized = sanitizeApplicationData(application);

    // Phase 1: Generate risk signals
    const signalsResult = await generateRiskSignals(sanitized, options);

    // Phase 2: Calculate risk score (always proceed even if signals fail)
    const scoreResult = await calculateRiskScore(signalsResult.data || {});

    // Phase 3: Get AI analysis (pass all data for context)
    const aiResult = await getAIAnalysis(
      sanitized,
      signalsResult.data || {},
      scoreResult.data?.riskScore || 0
    );

    // Merge all results
    const mergedResult = mergeAssessmentResults(signalsResult, scoreResult, aiResult);

    return {
      success: true,
      data: mergedResult,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: `Risk assessment failed: ${error.message}`,
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * Quick risk assessment (signals + score only, no AI)
 * Lightweight alternative for performance-critical paths
 * @param {Object} application - Application object
 * @param {Object} options - Assessment options
 * @returns {Promise<Object>} Quick assessment result
 */
const quickAssessmentRisk = async (application = {}, options = {}) => {
  try {
    if (!isValidApplication(application)) {
      throw new Error("Invalid application object provided");
    }

    const sanitized = sanitizeApplicationData(application);

    // Phase 1: Generate risk signals
    const signalsResult = await generateRiskSignals(sanitized, options);

    // Phase 2: Calculate risk score
    const scoreResult = await calculateRiskScore(signalsResult.data || {});

    const scoreData = scoreResult.data || {};

    return {
      success: true,
      data: {
        riskSignals: signalsResult.data || {},
        riskScore: scoreData.riskScore || 0,
        riskLevel: scoreData.riskLevel || "Low",
        breakdown: scoreData.breakdown,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: `Quick assessment failed: ${error.message}`,
      timestamp: new Date().toISOString(),
    };
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Main assessment functions
  assessApplicationRisk,
  quickAssessmentRisk,

  // Individual phase functions (for testing/advanced usage)
  generateRiskSignals,
  calculateRiskScore,
  getAIAnalysis,
  mergeAssessmentResults,

  // Helpers
  sanitizeApplicationData,
  isValidApplication,

  // Constants
  ASSESSMENT_STATUS,
};
