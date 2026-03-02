/**
 * District AI Summary Generator
 * Generates governance insights, fraud patterns, and policy recommendations
 * using Bedrock AI analysis of district-level risk analytics
 */

const { createClient: createBedrockClient } = require("./bedrockClient");

// ============================================================================
// CONSTANTS
// ============================================================================

const PROMPT_TEMPLATE = `You are an expert policy analyst specializing in government scheme administration and fraud detection. Analyze the following district-level risk analytics data and provide actionable insights.

## DISTRICT RISK ANALYTICS
District: {{district}}
Total Applications: {{applicationCount}}
Average Risk Score: {{averageRiskScore}}/100
High-Risk Applications: {{highRiskCount}} ({{highRiskPercentage}}%)
Medium-Risk Applications: {{mediumRiskCount}} ({{mediumRiskPercentage}}%)
Low-Risk Applications: {{lowRiskCount}} ({{lowRiskPercentage}}%)

## RISK SIGNAL DISTRIBUTION
Most Common Issue: {{mostCommonReason}}

## REJECTION METRICS
Average Rejection Probability: {{averageRejectionProbability}}
Risk Distribution: {{riskDistribution}}

## KEY OBSERVATIONS
- {{observation1}}
- {{observation2}}
- {{observation3}}

## YOUR TASK
Based on this district-level data, provide a comprehensive analysis in the following JSON format:

{
  "governanceInsight": {
    "summary": "<2-3 sentence overview of district's governance efficiency>",
    "keyFindings": ["<finding1>", "<finding2>", "<finding3>"],
    "administrationQuality": "<Poor|Fair|Good|Excellent>",
    "applicationProcessingEfficiency": "<Low|Medium|High>"
  },
  "fraudPattern": {
    "suspectedPatterns": ["<pattern1>", "<pattern2>"],
    "riskIndicators": ["<indicator1>", "<indicator2>", "<indicator3>"],
    "fraudLikelihood": "<Low|Medium|High|Very High>",
    "recommendedInvestigation": "<description of recommended fraud investigation>"
  },
  "policyRecommendation": {
    "immediateActions": ["<action1>", "<action2>"],
    "shortTermImprovements": ["<improvement1>", "<improvement2>"],
    "longTermStrategy": "<strategic recommendation>",
    "trainingNeeds": "<specific training or capacity building needs>",
    "estimatedImpact": "<expected outcome if recommendations are implemented>"
  }
}

## GUIDELINES FOR ANALYSIS

**Governance Insight:**
- Assess document verification efficiency
- Evaluate application processing speed
- Identify administrative bottlenecks
- Rate overall governance quality

**Fraud Pattern:**
- Identify common fraud indicators in the data
- Look for unusual clusters or anomalies
- Consider income verification issues
- Assess document authenticity concerns
- Note suspicious patterns in rejections

**Policy Recommendation:**
- Provide immediately actionable steps
- Suggest process improvements
- Recommend staff training or capacity building
- Suggest policy changes if needed
- Include realistic implementation timeline

**Important Notes:**
- Focus on data-driven observations
- Consider socioeconomic context of the district
- Provide constructive, implementable recommendations
- Estimate realistic impact of recommendations
- Acknowledge any data limitations

Return ONLY valid JSON, no additional text.`;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate district analytics data
 * @param {Object} districtAnalytics - District analytics object
 * @returns {Boolean} True if valid
 */
const isValidDistrictAnalytics = (districtAnalytics = {}) => {
  return (
    typeof districtAnalytics === "object" &&
    typeof districtAnalytics.district === "string" &&
    typeof districtAnalytics.applicationCount === "number" &&
    typeof districtAnalytics.averageRiskScore === "number" &&
    typeof districtAnalytics.highRiskCount === "number" &&
    typeof districtAnalytics.mediumRiskCount === "number" &&
    typeof districtAnalytics.lowRiskCount === "number"
  );
};

/**
 * Validate AI summary response
 * @param {Object} response - Response to validate
 * @returns {Boolean} True if valid
 */
const isValidAISummary = (response = {}) => {
  return (
    typeof response === "object" &&
    response.governanceInsight &&
    typeof response.governanceInsight === "object" &&
    response.fraudPattern &&
    typeof response.fraudPattern === "object" &&
    response.policyRecommendation &&
    typeof response.policyRecommendation === "object" &&
    typeof response.governanceInsight.summary === "string" &&
    Array.isArray(response.fraudPattern.suspectedPatterns) &&
    Array.isArray(response.policyRecommendation.immediateActions)
  );
};

// ============================================================================
// DATA PREPARATION
// ============================================================================

/**
 * Extract key observations from analytics
 * @param {Object} districtAnalytics - District analytics object
 * @returns {Array<String>} Array of 3 key observations
 */
const extractKeyObservations = (districtAnalytics = {}) => {
  const observations = [];

  const {
    averageRiskScore = 0,
    highRiskCount = 0,
    applicationCount = 1,
    mostCommonReason = "Unknown",
    averageRejectionProbability = 0,
  } = districtAnalytics;

  // Observation 1: Risk level assessment
  if (averageRiskScore > 70) {
    observations.push(
      `High average risk score (${averageRiskScore}) indicates significant verification challenges in this district`
    );
  } else if (averageRiskScore > 40) {
    observations.push(
      `Moderate average risk score (${averageRiskScore}) with room for process improvements`
    );
  } else {
    observations.push(
      `Low average risk score (${averageRiskScore}) demonstrates effective governance and verification processes`
    );
  }

  // Observation 2: High-risk concentration
  const highRiskPercentage = (highRiskCount / applicationCount) * 100;
  if (highRiskPercentage > 40) {
    observations.push(
      `${highRiskPercentage.toFixed(1)}% of applications flagged as high-risk, suggesting systemic issues or strict verification`
    );
  } else if (highRiskPercentage > 20) {
    observations.push(
      `${highRiskPercentage.toFixed(1)}% high-risk applications indicate moderate concern areas`
    );
  } else {
    observations.push(
      `Low high-risk percentage (${highRiskPercentage.toFixed(1)}%) shows consistent application quality`
    );
  }

  // Observation 3: Rejection probability
  if (averageRejectionProbability > 0.6) {
    observations.push(
      `Average rejection probability of ${(averageRejectionProbability * 100).toFixed(1)}% suggests notable eligibility or documentation issues`
    );
  } else {
    observations.push(
      `Average rejection probability of ${(averageRejectionProbability * 100).toFixed(1)}% indicates manageable risk levels`
    );
  }

  return observations;
};

/**
 * Build prompt from template
 * @param {Object} districtAnalytics - District analytics data
 * @returns {String} Rendered prompt
 */
const buildDistrictSummaryPrompt = (districtAnalytics = {}) => {
  const {
    district = "Unknown",
    applicationCount = 0,
    averageRiskScore = 0,
    highRiskCount = 0,
    mediumRiskCount = 0,
    lowRiskCount = 0,
    averageRejectionProbability = 0,
    mostCommonReason = "Unknown",
    riskDistribution = {},
  } = districtAnalytics;

  const totalApps = Math.max(applicationCount, 1);
  const highRiskPercentage = ((highRiskCount / totalApps) * 100).toFixed(1);
  const mediumRiskPercentage = ((mediumRiskCount / totalApps) * 100).toFixed(1);
  const lowRiskPercentage = ((lowRiskCount / totalApps) * 100).toFixed(1);

  const observations = extractKeyObservations(districtAnalytics);

  let prompt = PROMPT_TEMPLATE;

  // Replace placeholders
  prompt = prompt.replace("{{district}}", district);
  prompt = prompt.replace("{{applicationCount}}", applicationCount);
  prompt = prompt.replace("{{averageRiskScore}}", averageRiskScore);
  prompt = prompt.replace("{{highRiskCount}}", highRiskCount);
  prompt = prompt.replace("{{highRiskPercentage}}", highRiskPercentage);
  prompt = prompt.replace("{{mediumRiskCount}}", mediumRiskCount);
  prompt = prompt.replace("{{mediumRiskPercentage}}", mediumRiskPercentage);
  prompt = prompt.replace("{{lowRiskCount}}", lowRiskCount);
  prompt = prompt.replace("{{lowRiskPercentage}}", lowRiskPercentage);
  prompt = prompt.replace("{{mostCommonReason}}", mostCommonReason);
  prompt = prompt.replace(
    "{{averageRejectionProbability}}",
    (averageRejectionProbability * 100).toFixed(2) + "%"
  );
  prompt = prompt.replace(
    "{{riskDistribution}}",
    JSON.stringify(riskDistribution)
  );

  // Replace observations
  observations.forEach((obs, index) => {
    prompt = prompt.replace(`{{observation${index + 1}}}`, obs);
  });

  return prompt;
};

// ============================================================================
// RESPONSE PARSING
// ============================================================================

/**
 * Parse and validate AI response
 * @param {String} responseText - Raw response from Bedrock
 * @returns {Object} Parsed summary
 * @throws {Error} If response cannot be parsed
 */
const parseAISummaryResponse = (responseText) => {
  try {
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate structure
    if (!isValidAISummary(parsed)) {
      throw new Error("Invalid response structure");
    }

    return parsed;
  } catch (error) {
    throw new Error(`Failed to parse AI summary response: ${error.message}`);
  }
};

// ============================================================================
// MAIN GENERATOR FUNCTION
// ============================================================================

/**
 * Generate comprehensive AI summary for district analytics
 * Calls Bedrock to analyze district data and provide insights
 * @param {Object} districtAnalytics - District analytics object
 * @param {Object} options - Options (e.g., { useMock: true })
 * @returns {Promise<Object>} Structured AI summary with insights, fraud patterns, and recommendations
 * @throws {Error} If validation fails or AI analysis fails
 */
const generateDistrictAISummary = async (districtAnalytics = {}, options = {}) => {
  try {
    // Validate input
    if (!isValidDistrictAnalytics(districtAnalytics)) {
      throw new Error("Invalid district analytics data");
    }

    // Build prompt
    const prompt = buildDistrictSummaryPrompt(districtAnalytics);

    // Call Bedrock client
    const bedrockClient = createBedrockClient();
    const result = await bedrockClient.analyzeRisk({
      applicationId: `DISTRICT_${districtAnalytics.district.toUpperCase()}`,
      schemeName: "District-Level Analysis",
      riskScore: districtAnalytics.averageRiskScore,
      riskSignals: {
        ageMismatchFlag: null,
        incomeIneligibleFlag: null,
        missingDocumentsFlag: null,
        duplicateFlag: null,
        processingDelayDays: null,
      },
    });

    // For district summary, we'll use the prompt directly
    // In production, this would call Bedrock with the custom prompt
    let summary;

    if (bedrockClient.useMockMode) {
      // Generate mock summary with governance insights
      summary = generateMockDistrictSummary(districtAnalytics);
    } else {
      // Parse real Bedrock response
      summary = parseAISummaryResponse(result.data);
    }

    return {
      success: true,
      data: {
        district: districtAnalytics.district,
        timestamp: new Date().toISOString(),
        ...summary,
      },
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: `District AI summary generation failed: ${error.message}`,
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * Generate mock district summary for testing/development
 * @param {Object} districtAnalytics - District analytics data
 * @returns {Object} Mock summary structure
 */
const generateMockDistrictSummary = (districtAnalytics = {}) => {
  const { district, averageRiskScore, highRiskCount, applicationCount, mostCommonReason } =
    districtAnalytics;

  const highRiskPercentage = ((highRiskCount / applicationCount) * 100).toFixed(1);

  return {
    governanceInsight: {
      summary: `${district} demonstrates a mix of governance strengths and areas needing improvement. With ${applicationCount} applications processed and an average risk score of ${averageRiskScore}, the district shows moderate administrative capacity. Document verification processes require enhancement to reduce high-risk applications.`,
      keyFindings: [
        `${highRiskPercentage}% of applications flagged as high-risk indicates need for stricter verification protocols`,
        "Document submission and authentication process shows inconsistencies",
        "Application processing timeline varies significantly across different officer teams",
      ],
      administrationQuality:
        averageRiskScore > 70 ? "Fair" : averageRiskScore > 40 ? "Good" : "Excellent",
      applicationProcessingEfficiency:
        highRiskPercentage > 40 ? "Low" : highRiskPercentage > 20 ? "Medium" : "High",
    },
    fraudPattern: {
      suspectedPatterns: [
        mostCommonReason || "Income verification issues",
        "Document authenticity concerns in batch submissions",
        "Potential duplication in applications from same household",
      ],
      riskIndicators: [
        "Unusual income-to-documentation mismatch",
        "Same address/phone number across multiple applications",
        "Document submission patterns deviating from district norms",
      ],
      fraudLikelihood: averageRiskScore > 70 ? "High" : "Medium",
      recommendedInvestigation:
        "Conduct detailed review of top 20% flagged applications, verify document authenticity with issuing authorities",
    },
    policyRecommendation: {
      immediateActions: [
        "Implement mandatory two-factor document verification for high-risk applications",
        "Conduct training workshop for application officers on document authentication",
        `Focus verification efforts on ${mostCommonReason || "primary risk areas"}`,
      ],
      shortTermImprovements: [
        "Establish standardized document checklist for all schemes",
        "Deploy digital identity verification tools (Aadhaar e-KYC integration)",
        "Create weekly review meetings for flagged applications",
      ],
      longTermStrategy:
        "Build district-level data analytics capacity to predict and prevent fraudulent applications before submission",
      trainingNeeds:
        "Officers require training in digital forensics, document verification, and risk assessment methodologies",
      estimatedImpact:
        "Expected 25-35% reduction in high-risk applications within 6 months, improved processing efficiency by 40%",
    },
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Main function
  generateDistrictAISummary,

  // Helper functions (for testing)
  buildDistrictSummaryPrompt,
  extractKeyObservations,
  parseAISummaryResponse,
  generateMockDistrictSummary,

  // Validation
  isValidDistrictAnalytics,
  isValidAISummary,

  // Constants
  PROMPT_TEMPLATE,
};
