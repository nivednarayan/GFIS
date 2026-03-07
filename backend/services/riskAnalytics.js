/**
 * Risk Analytics Service
 * Provides MongoDB aggregation pipelines for risk analysis and reporting
 * Generates insights and metrics from risk assessment data
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const AGGREGATION_DEFAULTS = {
  LIMIT: 100,
  MIN_APPLICATIONS: 1,
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate Application model
 * @param {Object} Application - Mongoose Application model
 * @returns {Boolean} True if valid
 */
const isValidApplicationModel = (Application) => {
  return Application && typeof Application.aggregate === "function";
};

/**
 * Validate aggregation options
 * @param {Object} options - Aggregation options
 * @returns {Boolean} True if valid
 */
const isValidAggregationOptions = (options = {}) => {
  return (
    typeof options === "object" &&
    (typeof options.limit === "number" || options.limit === undefined) &&
    (typeof options.minApplications === "number" || options.minApplications === undefined)
  );
};

// ============================================================================
// PIPELINE BUILDERS
// ============================================================================

/**
 * Build aggregation pipeline for district-level risk analytics
 * Groups by district and computes risk metrics
 * @param {Object} options - Pipeline options
 * @returns {Array} Aggregation pipeline stages
 */
const buildDistrictRiskAnalyticsPipeline = (options = {}) => {
  const {
    limit = AGGREGATION_DEFAULTS.LIMIT,
    minApplications = AGGREGATION_DEFAULTS.MIN_APPLICATIONS,
  } = options;

  return [
    // Stage 1: Match only submitted applications with risk data
    {
      $match: {
        status: { $in: ["submitted", "under_review", "approved", "rejected"] },
        riskScore: { $exists: true, $ne: null },
      },
    },

    // Stage 2: Extract topReason from aiAnalysis.topReasons array
    {
      $addFields: {
        topReasonsArray: {
          $cond: [
            { $isArray: "$aiAnalysis.topReasons" },
            "$aiAnalysis.topReasons",
            [],
          ],
        },
      },
    },

    // Stage 3: Unwind topReasons to get individual reasons per application
    {
      $unwind: {
        path: "$topReasonsArray",
        preserveNullAndEmptyArrays: true,
      },
    },

    // Stage 4: Group by district and compute metrics
    {
      $group: {
        _id: {
          district: { $ifNull: ["$district", "Unknown"] },
          applicationId: "$applicationId",
          riskLevel: "$riskLevel",
          topReason: "$topReasonsArray",
        },
        riskScore: { $first: "$riskScore" },
        rejectionProbability: { $first: "$aiAnalysis.rejectionProbability" },
      },
    },

    // Stage 5: Re-group by district only to aggregate metrics
    {
      $group: {
        _id: "$_id.district",
        applicationCount: { $sum: 1 },
        averageRiskScore: { $avg: "$riskScore" },
        highRiskCount: {
          $sum: {
            $cond: [{ $eq: ["$_id.riskLevel", "High"] }, 1, 0],
          },
        },
        mediumRiskCount: {
          $sum: {
            $cond: [{ $eq: ["$_id.riskLevel", "Medium"] }, 1, 0],
          },
        },
        lowRiskCount: {
          $sum: {
            $cond: [{ $eq: ["$_id.riskLevel", "Low"] }, 1, 0],
          },
        },
        averageRejectionProbability: { $avg: "$rejectionProbability" },
        topReasons: {
          $push: {
            reason: "$_id.topReason",
            riskScore: "$riskScore",
          },
        },
      },
    },

    // Stage 6: Find most common top reason
    {
      $addFields: {
        mostCommonReason: {
          $reduce: {
            input: "$topReasons",
            initialValue: { reason: null, count: 0 },
            in: {
              $cond: [
                {
                  $eq: ["$$this.reason", "$$value.reason"],
                },
                {
                  reason: "$$value.reason",
                  count: { $add: ["$$value.count", 1] },
                },
                "$$value",
              ],
            },
          },
        },
      },
    },

    // Stage 7: Filter by minimum application count
    {
      $match: {
        applicationCount: { $gte: minApplications },
      },
    },

    // Stage 8: Sort by high risk count (descending)
    {
      $sort: {
        highRiskCount: -1,
        averageRiskScore: -1,
      },
    },

    // Stage 9: Limit results
    {
      $limit: limit,
    },

    // Stage 10: Project final fields
    {
      $project: {
        _id: 0,
        district: "$_id",
        applicationCount: 1,
        averageRiskScore: {
          $round: ["$averageRiskScore", 2],
        },
        highRiskCount: 1,
        mediumRiskCount: 1,
        lowRiskCount: 1,
        riskDistribution: {
          high: "$highRiskCount",
          medium: "$mediumRiskCount",
          low: "$lowRiskCount",
        },
        averageRejectionProbability: {
          $round: ["$averageRejectionProbability", 4],
        },
        mostCommonReason: "$mostCommonReason.reason",
        riskMetrics: {
          minRiskScore: { $min: "$topReasons.riskScore" },
          maxRiskScore: { $max: "$topReasons.riskScore" },
        },
      },
    },
  ];
};

/**
 * Build aggregation pipeline for scheme-level risk analytics
 * Groups by scheme and computes risk metrics
 * @param {Object} options - Pipeline options
 * @returns {Array} Aggregation pipeline stages
 */
const buildSchemeRiskAnalyticsPipeline = (options = {}) => {
  const { limit = AGGREGATION_DEFAULTS.LIMIT } = options;

  return [
    // Match submitted applications with risk data
    {
      $match: {
        status: { $in: ["submitted", "under_review", "approved", "rejected"] },
        riskScore: { $exists: true, $ne: null },
      },
    },

    // Group by scheme
    {
      $group: {
        _id: { $ifNull: ["$schemeName", "Unknown"] },
        applicationCount: { $sum: 1 },
        averageRiskScore: { $avg: "$riskScore" },
        highRiskCount: {
          $sum: {
            $cond: [{ $eq: ["$riskLevel", "High"] }, 1, 0],
          },
        },
        mediumRiskCount: {
          $sum: {
            $cond: [{ $eq: ["$riskLevel", "Medium"] }, 1, 0],
          },
        },
        lowRiskCount: {
          $sum: {
            $cond: [{ $eq: ["$riskLevel", "Low"] }, 1, 0],
          },
        },
        averageRejectionProbability: { $avg: "$aiAnalysis.rejectionProbability" },
        topFraudIndicators: { $push: "$aiAnalysis.fraudIndicator" },
      },
    },

    // Sort by application count
    {
      $sort: {
        applicationCount: -1,
      },
    },

    // Limit results
    {
      $limit: limit,
    },

    // Project final fields
    {
      $project: {
        _id: 0,
        schemeName: "$_id",
        applicationCount: 1,
        averageRiskScore: {
          $round: ["$averageRiskScore", 2],
        },
        highRiskCount: 1,
        mediumRiskCount: 1,
        lowRiskCount: 1,
        riskDistribution: {
          high: "$highRiskCount",
          medium: "$mediumRiskCount",
          low: "$lowRiskCount",
        },
        averageRejectionProbability: {
          $round: ["$averageRejectionProbability", 4],
        },
      },
    },
  ];
};

/**
 * Build aggregation pipeline for high-risk application detection
 * Identifies applications requiring immediate attention
 * @param {Object} options - Pipeline options
 * @returns {Array} Aggregation pipeline stages
 */
const buildHighRiskApplicationsPipeline = (options = {}) => {
  const { limit = 50 } = options;

  return [
    // Match high-risk applications
    {
      $match: {
        riskLevel: "High",
        status: { $in: ["draft", "submitted", "under_review"] },
      },
    },

    // Sort by risk score and rejection probability
    {
      $sort: {
        riskScore: -1,
        "aiAnalysis.rejectionProbability": -1,
      },
    },

    // Limit results
    {
      $limit: limit,
    },

    // Project relevant fields
    {
      $project: {
        _id: 0,
        applicationId: 1,
        schemeName: 1,
        district: { $ifNull: ["$district", "Unknown"] },
        riskScore: 1,
        riskLevel: 1,
        riskSignals: 1,
        aiAnalysis: 1,
        status: 1,
        submittedAt: 1,
      },
    },
  ];
};

// ============================================================================
// AGGREGATION EXECUTION FUNCTIONS
// ============================================================================

/**
 * Get district-level risk analytics
 * Groups applications by district and computes comprehensive risk metrics
 * @param {Object} Application - Mongoose Application model
 * @param {Object} options - Aggregation options (limit, minApplications)
 * @returns {Promise<Object>} Analytics result with district data
 */
const getDistrictRiskAnalytics = async (Application, options = {}) => {
  if (!isValidApplicationModel(Application)) {
    throw new Error("Invalid Application model provided");
  }

  if (!isValidAggregationOptions(options)) {
    throw new Error("Invalid aggregation options");
  }

  try {
    const pipeline = buildDistrictRiskAnalyticsPipeline(options);
    const results = await Application.aggregate(pipeline);

    return {
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        totalDistricts: results.length,
        districts: results,
      },
      error: null,
    };
  } catch (error) {
    throw new Error(`District risk analytics failed: ${error.message}`);
  }
};

/**
 * Get scheme-level risk analytics
 * Groups applications by scheme and computes risk metrics
 * @param {Object} Application - Mongoose Application model
 * @param {Object} options - Aggregation options (limit)
 * @returns {Promise<Object>} Analytics result with scheme data
 */
const getSchemeRiskAnalytics = async (Application, options = {}) => {
  if (!isValidApplicationModel(Application)) {
    throw new Error("Invalid Application model provided");
  }

  if (!isValidAggregationOptions(options)) {
    throw new Error("Invalid aggregation options");
  }

  try {
    const pipeline = buildSchemeRiskAnalyticsPipeline(options);
    const results = await Application.aggregate(pipeline);

    return {
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        totalSchemes: results.length,
        schemes: results,
      },
      error: null,
    };
  } catch (error) {
    throw new Error(`Scheme risk analytics failed: ${error.message}`);
  }
};

/**
 * Get high-risk applications requiring immediate attention
 * @param {Object} Application - Mongoose Application model
 * @param {Object} options - Aggregation options (limit)
 * @returns {Promise<Object>} High-risk applications list
 */
const getHighRiskApplications = async (Application, options = {}) => {
  if (!isValidApplicationModel(Application)) {
    throw new Error("Invalid Application model provided");
  }

  try {
    const pipeline = buildHighRiskApplicationsPipeline(options);
    const results = await Application.aggregate(pipeline);

    return {
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        count: results.length,
        applications: results,
      },
      error: null,
    };
  } catch (error) {
    throw new Error(`High-risk applications query failed: ${error.message}`);
  }
};

/**
 * Get overall risk statistics
 * Computes system-wide risk metrics
 * @param {Object} Application - Mongoose Application model
 * @returns {Promise<Object>} Overall risk statistics
 */
const getOverallRiskStatistics = async (Application) => {
  if (!isValidApplicationModel(Application)) {
    throw new Error("Invalid Application model provided");
  }

  try {
    const pipeline = [
      // Match applications with risk data
      {
        $match: {
          riskScore: { $exists: true, $ne: null },
        },
      },

      // Group and compute statistics
      {
        $group: {
          _id: null,
          totalApplications: { $sum: 1 },
          averageRiskScore: { $avg: "$riskScore" },
          minRiskScore: { $min: "$riskScore" },
          maxRiskScore: { $max: "$riskScore" },
          highRiskCount: {
            $sum: {
              $cond: [{ $eq: ["$riskLevel", "High"] }, 1, 0],
            },
          },
          mediumRiskCount: {
            $sum: {
              $cond: [{ $eq: ["$riskLevel", "Medium"] }, 1, 0],
            },
          },
          lowRiskCount: {
            $sum: {
              $cond: [{ $eq: ["$riskLevel", "Low"] }, 1, 0],
            },
          },
          averageRejectionProbability: { $avg: "$aiAnalysis.rejectionProbability" },
          avgAgeMismatchFlag: { $avg: { $cond: ["$riskSignals.ageMismatchFlag", 1, 0] } },
          avgIncomeIneligible: { $avg: { $cond: ["$riskSignals.incomeIneligibleFlag", 1, 0] } },
          avgMissingDocuments: { $avg: { $cond: ["$riskSignals.missingDocumentsFlag", 1, 0] } },
          avgDuplicate: { $avg: { $cond: ["$riskSignals.duplicateFlag", 1, 0] } },
        },
      },

      // Project formatted results
      {
        $project: {
          _id: 0,
          totalApplications: 1,
          riskScoreMetrics: {
            average: { $round: ["$averageRiskScore", 2] },
            min: "$minRiskScore",
            max: "$maxRiskScore",
          },
          riskDistribution: {
            high: "$highRiskCount",
            medium: "$mediumRiskCount",
            low: "$lowRiskCount",
          },
          riskPercentages: {
            high: {
              $round: [
                {
                  $multiply: [
                    { $divide: ["$highRiskCount", "$totalApplications"] },
                    100,
                  ],
                },
                2,
              ],
            },
            medium: {
              $round: [
                {
                  $multiply: [
                    { $divide: ["$mediumRiskCount", "$totalApplications"] },
                    100,
                  ],
                },
                2,
              ],
            },
            low: {
              $round: [
                {
                  $multiply: [
                    { $divide: ["$lowRiskCount", "$totalApplications"] },
                    100,
                  ],
                },
                2,
              ],
            },
          },
          averageRejectionProbability: {
            $round: ["$averageRejectionProbability", 4],
          },
          riskSignalFrequencies: {
            ageMismatch: { $round: [{ $multiply: ["$avgAgeMismatchFlag", 100] }, 2] },
            incomeIneligible: { $round: [{ $multiply: ["$avgIncomeIneligible", 100] }, 2] },
            missingDocuments: { $round: [{ $multiply: ["$avgMissingDocuments", 100] }, 2] },
            duplicate: { $round: [{ $multiply: ["$avgDuplicate", 100] }, 2] },
          },
        },
      },
    ];

    const results = await Application.aggregate(pipeline);
    const stats = results.length > 0 ? results[0] : null;

    if (!stats) {
      return {
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          message: "No applications with risk data found",
        },
        error: null,
      };
    }

    return {
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        ...stats,
      },
      error: null,
    };
  } catch (error) {
    throw new Error(`Overall risk statistics query failed: ${error.message}`);
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Main aggregation functions
  getDistrictRiskAnalytics,
  getSchemeRiskAnalytics,
  getHighRiskApplications,
  getOverallRiskStatistics,

  // Pipeline builders (for testing/advanced usage)
  buildDistrictRiskAnalyticsPipeline,
  buildSchemeRiskAnalyticsPipeline,
  buildHighRiskApplicationsPipeline,

  // Validation helpers
  isValidApplicationModel,
  isValidAggregationOptions,

  // Constants
  AGGREGATION_DEFAULTS,
};
