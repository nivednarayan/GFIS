/**
 * Regex-based pattern extraction for fallback when Gemini fails
 */

const FIELD_PATTERNS = {
  fullName: {
    patterns: [
      /(?:my name is|i am|this is|called)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?:\s+(?:here|from|age|mobile))/i,
      /([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:is|am)/i
    ],
    validate: (value) => {
      // Name must have at least 2 words and no numbers
      return /^[A-Za-z]+(?:\s+[A-Za-z]+)+$/.test(value) && !/^\d+$/.test(value);
    }
  },

  age: {
    patterns: [
      /(?:age|aged|years old|yrs)\s*:?\s*(\d{1,3})/i,
      /(\d{1,3})\s*(?:years old|yrs|years)/i,
      /(?:i am|i'm)\s*(\d{1,3})\s*(?:years)?/i
    ],
    validate: (value) => {
      const num = parseInt(value);
      return num >= 0 && num <= 120;
    },
    normalize: (value) => parseInt(value)
  },

  gender: {
    patterns: [
      /(?:gender|sex)\s*:?\s*(male|female|m|f)/i,
      /\b(male|female)\b/i
    ],
    normalize: (value) => {
      const v = value.toLowerCase();
      if (v === 'm' || v === 'male') return 'male';
      if (v === 'f' || v === 'female') return 'female';
      return value;
    }
  },

  mobileNumber: {
    patterns: [
      /(?:mobile|phone|contact|number)\s*:?\s*([6-9]\d{9})/i,
      /\b([6-9]\d{9})\b/
    ],
    validate: (value) => /^[6-9]\d{9}$/.test(value),
    normalize: (value) => value.replace(/\D/g, '')
  },

  aadhaarNumber: {
    patterns: [
      /(?:aadhaar|aadhar|uid)\s*:?\s*(\d{12})/i,
      /\b(\d{12})\b/
    ],
    validate: (value) => /^\d{12}$/.test(value),
    normalize: (value) => value.replace(/\D/g, '')
  },

  annualIncome: {
    patterns: [
      /(?:income|earning|salary)\s*:?\s*(?:rs\.?|₹)?\s*(\d+(?:,\d+)*)/i,
      /(?:rs\.?|₹)\s*(\d+(?:,\d+)*)/i
    ],
    validate: (value) => {
      const num = parseInt(value.replace(/,/g, ''));
      return num >= 0 && num <= 100000000; // Max 10 crore
    },
    normalize: (value) => parseInt(value.replace(/,/g, ''))
  },

  state: {
    patterns: [
      /(?:state|from)\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /\b(Maharashtra|Karnataka|Kerala|Punjab|Gujarat|Rajasthan|Tamil Nadu|Uttar Pradesh|Bihar|West Bengal|Madhya Pradesh|Odisha|Telangana|Andhra Pradesh|Haryana|Jharkhand|Assam|Chhattisgarh|Uttarakhand|Himachal Pradesh|Goa|Manipur|Meghalaya|Nagaland|Sikkim|Tripura|Arunachal Pradesh|Mizoram)\b/i
    ]
  },

  district: {
    patterns: [
      /(?:district|dist)\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /from\s+([A-Z][a-z]+)\s+district/i
    ]
  },

  maritalStatus: {
    patterns: [
      /(?:marital status|status)\s*:?\s*(single|married|widowed|divorced)/i,
      /\b(single|married|widowed|divorced|unmarried)\b/i
    ],
    normalize: (value) => {
      const v = value.toLowerCase();
      if (v === 'unmarried') return 'single';
      return v;
    },
    validate: (value) => {
      return ['single', 'married', 'widowed', 'divorced'].includes(value.toLowerCase());
    }
  },

  familyMembers: {
    patterns: [
      /(?:family members|family size|members in family)\s*:?\s*(\d+)/i,
      /(\d+)\s*(?:members in|people in|family members)/i
    ],
    validate: (value) => {
      const num = parseInt(value);
      return num >= 1 && num <= 50;
    },
    normalize: (value) => parseInt(value)
  }
};

/**
 * Extract fields from text using regex patterns
 */
function extract(introText, requiredFields) {
  const extracted = {};
  const text = introText || '';

  // Get list of field names we need to extract
  const fieldsToExtract = requiredFields.map(f => f.name);

  for (const fieldName of fieldsToExtract) {
    const fieldConfig = FIELD_PATTERNS[fieldName];
    if (!fieldConfig) continue;

    // Try each pattern for this field
    for (const pattern of fieldConfig.patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let value = match[1].trim();

        // Apply normalization if defined
        if (fieldConfig.normalize) {
          value = fieldConfig.normalize(value);
        }

        // Validate if validation function exists
        if (fieldConfig.validate && !fieldConfig.validate(value)) {
          continue; // Try next pattern
        }

        // Store the extracted value
        extracted[fieldName] = value;
        break; // Stop trying patterns for this field
      }
    }
  }

  console.log(`Pattern extractor found: ${JSON.stringify(extracted)}`);
  return extracted;
}

module.exports = { extract, FIELD_PATTERNS };
