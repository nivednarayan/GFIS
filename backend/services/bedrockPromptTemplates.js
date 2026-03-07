/**
 * Bedrock Prompt Templates
 * AI prompts for risk analysis and application evaluation
 * Used by bedrockClient.js for Bedrock API calls
 */

// ============================================================================
// RISK ANALYSIS PROMPT TEMPLATE
// ============================================================================

/**
 * Comprehensive risk analysis prompt template
 * Analyzes an application based on risk signals and data inconsistencies
 * Requests rejection probability, reasons, and fraud indicators
 */
const RISK_ANALYSIS_PROMPT_TEMPLATE = `You are an expert AI analyst specializing in government scheme application evaluation and fraud detection. Analyze the following application data and assess the risk of rejection and potential fraud indicators.

## APPLICATION DETAILS
Application ID: {{applicationId}}
Scheme Name: {{schemeName}}
Status: {{status}}
Submitted At: {{submittedAt}}

## APPLICANT INFORMATION
Age: {{age}}
Date of Birth: {{dateOfBirth}}
Annual Income: {{annualIncome}}
State/District: {{district}}

## RISK SIGNALS DETECTED
- Age Mismatch Flag: {{ageMismatchFlag}}
- Income Ineligible Flag: {{incomeIneligibleFlag}}
- Missing Documents Flag: {{missingDocumentsFlag}}
- Duplicate Application Flag: {{duplicateFlag}}
- Processing Delay Days: {{processingDelayDays}}

## COMPUTED RISK METRICS
- Overall Risk Score: {{riskScore}}/100
- Current Risk Level: {{riskLevel}}

## UPLOADED DOCUMENTS
{{#documents}}
- {{documentName}}: Uploaded on {{uploadedAt}}
{{/documents}}

## VALIDATION ERRORS (If Any)
{{#validationErrors}}
- {{fieldName}}: {{error}}
{{/validationErrors}}

## YOUR TASK
Based on the above information, provide a comprehensive risk assessment in the following JSON format:

{
  "rejectionProbability": <number between 0.0 and 1.0 representing likelihood of rejection>,
  "riskLevel": "<Low|Medium|High>",
  "topReasons": [
    "<primary reason for rejection risk>",
    "<secondary reason for rejection risk>",
    "<tertiary reason for rejection risk>"
  ],
  "fraudIndicator": "<None|Suspicious|Likely|Confirmed>"
}

## GUIDELINES FOR ANALYSIS

**Rejection Probability:**
- 0.0-0.2: Very low risk of rejection
- 0.2-0.4: Low risk of rejection
- 0.4-0.6: Moderate risk of rejection
- 0.6-0.8: High risk of rejection
- 0.8-1.0: Very high risk of rejection

**Top Reasons (select from):**
- Age verification mismatch with stated age
- Income exceeds scheme eligibility threshold
- Required documents not uploaded
- Duplicate application from same applicant
- Data inconsistencies in personal information
- Processing delays indicating administrative issues
- Document quality or authenticity concerns
- Scheme eligibility criteria not fully met
- Incomplete or missing mandatory fields
- Suspicious patterns in application data

**Fraud Indicators:**
- None: No fraud indicators detected
- Suspicious: Minor inconsistencies or warnings detected
- Likely: Multiple red flags suggesting potential fraud
- Confirmed: Strong evidence of fraudulent activity

**Important Notes:**
- Be conservative in your assessment; false positives are costly but false negatives are worse
- Consider the context of government scheme applications (often filled by less tech-savvy users)
- Focus on verifiable data mismatches and missing documents
- Weight the risk signals provided by the system accordingly

Return ONLY valid JSON, no additional text or explanation.`;

// ============================================================================
// SIMPLIFIED RISK ANALYSIS PROMPT (FOR QUICK ANALYSIS)
// ============================================================================

const RISK_ANALYSIS_PROMPT_SIMPLE = `Analyze this government scheme application for rejection risk:

**Application:** {{applicationId}} (Scheme: {{schemeName}})
**Risk Signals:** Age Mismatch: {{ageMismatchFlag}}, Income Ineligible: {{incomeIneligibleFlag}}, Missing Docs: {{missingDocumentsFlag}}, Duplicate: {{duplicateFlag}}, Delay Days: {{processingDelayDays}}
**Risk Score:** {{riskScore}}/100

Return valid JSON only:
{
  "rejectionProbability": <0.0-1.0>,
  "riskLevel": "<Low|Medium|High>",
  "topReasons": ["reason1", "reason2", "reason3"],
  "fraudIndicator": "<None|Suspicious|Likely|Confirmed>"
}`;

// ============================================================================
// PROMPT BUILDER FUNCTIONS
// ============================================================================

/**
 * Build prompt from template by replacing placeholders
 * @param {String} template - Template string with {{placeholder}} syntax
 * @param {Object} data - Data object with values for placeholders
 * @returns {String} Rendered prompt
 */
const renderPrompt = (template = "", data = {}) => {
  if (!template || typeof template !== "string") {
    return "";
  }

  let rendered = template;

  // Replace simple placeholders: {{key}}
  Object.keys(data).forEach((key) => {
    const value = data[key];
    const placeholder = `{{${key}}}`;
    const regex = new RegExp(placeholder, "g");

    if (typeof value === "object") {
      rendered = rendered.replace(regex, JSON.stringify(value));
    } else {
      rendered = rendered.replace(regex, value !== null && value !== undefined ? value : "N/A");
    }
  });

  // Handle conditionals: {{#key}}...{{/key}}
  const conditionalRegex = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
  rendered = rendered.replace(conditionalRegex, (match, key, content) => {
    return data[key] && (Array.isArray(data[key]) ? data[key].length > 0 : true) ? content : "";
  });

  // Remove any remaining unmatched placeholders
  rendered = rendered.replace(/\{\{[\w#/]+\}\}/g, "");

  return rendered;
};

/**
 * Build comprehensive risk analysis prompt
 * @param {Object} applicationData - Application object with all required fields
 * @returns {String} Rendered prompt ready for Bedrock
 */
const buildComprehensivePrompt = (applicationData = {}) => {
  const {
    applicationId = "N/A",
    schemeName = "Unknown",
    status = "draft",
    submittedAt = "Not submitted",
    age = "N/A",
    dateOfBirth = "N/A",
    annualIncome = "N/A",
    district = "N/A",
    ageMismatchFlag = false,
    incomeIneligibleFlag = false,
    missingDocumentsFlag = false,
    duplicateFlag = false,
    processingDelayDays = 0,
    riskScore = 0,
    riskLevel = "Low",
    documents = [],
    validationErrors = [],
  } = applicationData;

  return renderPrompt(RISK_ANALYSIS_PROMPT_TEMPLATE, {
    applicationId,
    schemeName,
    status,
    submittedAt,
    age,
    dateOfBirth,
    annualIncome,
    district,
    ageMismatchFlag: ageMismatchFlag ? "Yes" : "No",
    incomeIneligibleFlag: incomeIneligibleFlag ? "Yes" : "No",
    missingDocumentsFlag: missingDocumentsFlag ? "Yes" : "No",
    duplicateFlag: duplicateFlag ? "Yes" : "No",
    processingDelayDays,
    riskScore,
    riskLevel,
    documents,
    validationErrors,
  });
};

/**
 * Build simple risk analysis prompt (lightweight)
 * @param {Object} riskData - Object with risk signals and metrics
 * @returns {String} Rendered prompt ready for Bedrock
 */
const buildSimplePrompt = (riskData = {}) => {
  const {
    applicationId = "N/A",
    schemeName = "Unknown",
    ageMismatchFlag = false,
    incomeIneligibleFlag = false,
    missingDocumentsFlag = false,
    duplicateFlag = false,
    processingDelayDays = 0,
    riskScore = 0,
  } = riskData;

  return renderPrompt(RISK_ANALYSIS_PROMPT_SIMPLE, {
    applicationId,
    schemeName,
    ageMismatchFlag: ageMismatchFlag ? "Yes" : "No",
    incomeIneligibleFlag: incomeIneligibleFlag ? "Yes" : "No",
    missingDocumentsFlag: missingDocumentsFlag ? "Yes" : "No",
    duplicateFlag: duplicateFlag ? "Yes" : "No",
    processingDelayDays,
    riskScore,
  });
};

// ============================================================================
// PROMPT EXAMPLES
// ============================================================================

/**
 * Example prompt with real application data
 * Shows how prompt is rendered with actual values
 */
const EXAMPLE_RENDERED_PROMPT = `You are an expert AI analyst specializing in government scheme application evaluation and fraud detection. Analyze the following application data and assess the risk of rejection and potential fraud indicators.

## APPLICATION DETAILS
Application ID: APP20240315001
Scheme Name: Ayushman Bharat
Status: submitted
Submitted At: 2024-03-15T10:30:00Z

## APPLICANT INFORMATION
Age: 42
Date of Birth: 1982-03-10
Annual Income: 350000
State/District: Karnataka / Bangalore

## RISK SIGNALS DETECTED
- Age Mismatch Flag: No
- Income Ineligible Flag: Yes
- Missing Documents Flag: No
- Duplicate Application Flag: No
- Processing Delay Days: 5

## COMPUTED RISK METRICS
- Overall Risk Score: 45/100
- Current Risk Level: Medium

## UPLOADED DOCUMENTS
- Aadhar Card: Uploaded on 2024-03-15T09:00:00Z
- Income Certificate: Uploaded on 2024-03-15T09:30:00Z
- Bank Statement: Uploaded on 2024-03-15T10:00:00Z

## YOUR TASK
Based on the above information, provide a comprehensive risk assessment in the following JSON format:

{
  "rejectionProbability": <number between 0.0 and 1.0 representing likelihood of rejection>,
  "riskLevel": "<Low|Medium|High>",
  "topReasons": [
    "<primary reason for rejection risk>",
    "<secondary reason for rejection risk>",
    "<tertiary reason for rejection risk>"
  ],
  "fraudIndicator": "<None|Suspicious|Likely|Confirmed>"
}`;

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Prompt templates
  RISK_ANALYSIS_PROMPT_TEMPLATE,
  RISK_ANALYSIS_PROMPT_SIMPLE,
  EXAMPLE_RENDERED_PROMPT,

  // Builder functions
  renderPrompt,
  buildComprehensivePrompt,
  buildSimplePrompt,
};
