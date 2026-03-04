const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Build detailed field schema descriptions for the prompt
 */
function buildFieldSchema(requiredFields) {
  return requiredFields.map(field => {
    let description = `- ${field.name} (${field.label})`;
    
    if (field.type) {
      description += ` - Type: ${field.type}`;
    }
    
    if (field.validation) {
      if (field.validation.min !== undefined) {
        description += `, Min: ${field.validation.min}`;
      }
      if (field.validation.max !== undefined) {
        description += `, Max: ${field.validation.max}`;
      }
      if (field.validation.pattern) {
        description += `, Pattern: ${field.validation.pattern}`;
      }
    }
    
    if (field.options && field.options.length > 0) {
      description += ` - Valid options: ${field.options.join(', ')}`;
    }
    
    if (field.required) {
      description += ' [REQUIRED]';
    }
    
    return description;
  }).join('\n');
}

/**
 * Extract structured data from free text using Google Gemini
 */
async function extract(introText, requiredFields) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured in environment variables');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

  const fieldSchema = buildFieldSchema(requiredFields);
  const fieldNames = requiredFields.map(f => f.name).join(', ');

  const prompt = `You are a data extraction assistant for Indian government scheme applications.

Extract the following fields from the user's introduction text:

${fieldSchema}

User's Introduction:
"""
${introText}
"""

CRITICAL RULES:
1. Extract ONLY if the information is explicitly mentioned or clearly implied
2. Do NOT guess or infer missing information
3. Do NOT mix up fields (e.g., "married" is maritalStatus, not fullName)
4. For Aadhaar: must be exactly 12 digits
5. For mobile: must be exactly 10 digits starting with 6-9
6. For age: extract only numeric value
7. For income: extract numeric value only (no currency symbols)
8. For gender: use "male" or "female" only
9. For maritalStatus: use "single", "married", "widowed", or "divorced"
10. If a field is not mentioned, omit it from the response

Respond ONLY with valid JSON in this exact format:
{
  "fullName": "extracted name or omit if not found",
  "age": numeric_value_or_omit,
  "gender": "male/female or omit",
  "mobileNumber": "10_digit_number or omit",
  "aadhaarNumber": "12_digit_number or omit",
  "annualIncome": numeric_value_or_omit,
  "state": "state name or omit",
  "district": "district name or omit",
  "maritalStatus": "status or omit",
  "familyMembers": numeric_value_or_omit
}

Return only fields that are found. Do not include null or empty values.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Gemini response');
    }

    const extractedData = JSON.parse(jsonMatch[0]);
    
    // Remove null/undefined/empty values
    const cleanedData = {};
    for (const [key, value] of Object.entries(extractedData)) {
      if (value !== null && value !== undefined && value !== '') {
        cleanedData[key] = value;
      }
    }

    console.log(`Gemini extracted: ${JSON.stringify(cleanedData)}`);
    return cleanedData;

  } catch (error) {
    if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('Gemini API quota exceeded');
    } else if (error.message?.includes('404') || error.message?.includes('NOT_FOUND')) {
      throw new Error('Gemini model not available');
    } else if (error.message?.includes('API_KEY')) {
      throw new Error('Invalid Gemini API key');
    }
    
    throw new Error(`Gemini extraction failed: ${error.message}`);
  }
}

module.exports = { extract, buildFieldSchema };
