/**
 * Field Extraction from Transcripts
 * Extracts structured data from spoken audio transcripts
 * 
 * @module extractFields
 */

/**
 * Extract structured fields from a transcript
 * Supports common government form fields like name, Aadhaar, phone, age, etc.
 * 
 * @param {String} transcript - The transcribed text from audio
 * @returns {Object} Extracted fields with confidence scores
 * 
 * @example
 * extractFieldsFromTranscript("My name is Ashar Khan and my Aadhaar is 123456789012")
 * // Returns: { fullName: "Ashar Khan", aadhaar: "123456789012" }
 */
const extractFieldsFromTranscript = (transcript) => {
  if (!transcript || typeof transcript !== 'string') {
    return {};
  }

  const fields = {};
  const cleanedTranscript = sanitizeTranscriptForExtraction(transcript);
  const normalizedText = cleanedTranscript.toLowerCase();

  // Extract full name
  // Patterns: "my name is X", "i am X", "this is X"
  const namePatterns = [
    /(?:my name is|i am|this is|name|called)\s+([a-z]+(?:\s+[a-z]+){1,3})/i,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/  // Proper case at start
  ];

  for (const pattern of namePatterns) {
    const nameMatch = cleanedTranscript.match(pattern);
    if (nameMatch && nameMatch[1]) {
      const name = nameMatch[1].trim();
      // Validate: at least 2 characters, contains letters
      if (name.length >= 2 && /[a-zA-Z]/.test(name)) {
        fields.fullName = name;
        break;
      }
    }
  }

  // Extract Aadhaar number (12 digits)
  // Patterns: "aadhaar is X", "aadhaar number X", standalone 12-digit number
  const aadhaarPatterns = [
    /(?:aadhaar|aadhar|adhaar)(?:\s+(?:number|card|is))?\s*:?\s*(\d{12})/i,
    /\b(\d{4}\s*\d{4}\s*\d{4})\b/,  // Spaced format
    /\b(\d{12})\b/  // Continuous 12 digits
  ];

  for (const pattern of aadhaarPatterns) {
    const aadhaarMatch = cleanedTranscript.match(pattern);
    if (aadhaarMatch && aadhaarMatch[1]) {
      const aadhaar = aadhaarMatch[1].replace(/\s/g, '');
      if (aadhaar.length === 12 && /^\d{12}$/.test(aadhaar)) {
        fields.aadhaar = aadhaar;
        break;
      }
    }
  }

  // Extract phone number (10 digits)
  const phonePatterns = [
    /(?:phone|mobile|number|contact)(?:\s+(?:number|is))?\s*:?\s*(\d{10})/i,
    /\b([6-9]\d{9})\b/  // Indian mobile numbers start with 6-9
  ];

  for (const pattern of phonePatterns) {
    const phoneMatch = cleanedTranscript.match(pattern);
    if (phoneMatch && phoneMatch[1]) {
      const phone = phoneMatch[1].replace(/\s/g, '');
      if (phone.length === 10 && /^[6-9]\d{9}$/.test(phone)) {
        fields.phone = phone;
        break;
      }
    }
  }

  // Extract age
  const agePatterns = [
    /(?:age is|i am|aged)\s*(\d{1,3})(?:\s+years)?/i,
    /(\d{1,3})\s+years?\s+old/i
  ];

  for (const pattern of agePatterns) {
    const ageMatch = cleanedTranscript.match(pattern);
    if (ageMatch && ageMatch[1]) {
      const age = parseInt(ageMatch[1], 10);
      if (age > 0 && age < 150) {
        fields.age = age;
        break;
      }
    }
  }

  // Extract gender
  const genderPatterns = [
    /(?:gender is|i am)\s*(male|female|other|transgender)/i,
    /\b(male|female)\b/i
  ];

  for (const pattern of genderPatterns) {
    const genderMatch = normalizedText.match(pattern);
    if (genderMatch && genderMatch[1]) {
      fields.gender = genderMatch[1].toLowerCase();
      break;
    }
  }

  // Extract income (annual)
  const incomePatterns = [
    /(?:income|salary|earn)(?:\s+is)?\s*(?:rs\.?|rupees|₹)?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    /(?:rs\.?|rupees|₹)\s*(\d+(?:,\d+)*)\s*(?:per|annual|yearly)?/i
  ];

  for (const pattern of incomePatterns) {
    const incomeMatch = cleanedTranscript.match(pattern);
    if (incomeMatch && incomeMatch[1]) {
      const income = incomeMatch[1].replace(/,/g, '');
      const incomeNum = parseFloat(income);
      if (incomeNum > 0) {
        fields.annualIncome = incomeNum;
        break;
      }
    }
  }

  // Extract address fragments
  // Look for state, district, pincode
  const pincodeMatch = cleanedTranscript.match(/\b(\d{6})\b/);
  if (pincodeMatch) {
    fields.pincode = pincodeMatch[1];
  }

  // Common Indian states
  const states = ['andhra pradesh', 'karnataka', 'tamil nadu', 'kerala', 'maharashtra', 
                  'gujarat', 'rajasthan', 'delhi', 'punjab', 'haryana', 'up', 'uttar pradesh',
                  'bihar', 'west bengal', 'odisha', 'telangana', 'madhya pradesh'];
  
  for (const state of states) {
    if (normalizedText.includes(state)) {
      fields.state = state.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      break;
    }
  }

  console.log('[EXTRACT] Extracted fields:', fields);
  return fields;
};

/**
 * Calculate confidence score for extracted fields
 * Based on field completeness and validation
 * 
 * @param {Object} fields - Extracted fields
 * @returns {Number} Confidence score (0-1)
 */
const calculateConfidence = (fields) => {
  if (!fields || Object.keys(fields).length === 0) {
    return 0;
  }

  let score = 0;
  let maxScore = 0;

  // Name: 20 points if present
  maxScore += 20;
  if (fields.fullName && fields.fullName.split(' ').length >= 2) {
    score += 20;
  } else if (fields.fullName) {
    score += 10;
  }

  // Aadhaar: 30 points (high importance)
  maxScore += 30;
  if (fields.aadhaar && /^\d{12}$/.test(fields.aadhaar)) {
    score += 30;
  }

  // Phone: 20 points
  maxScore += 20;
  if (fields.phone && /^[6-9]\d{9}$/.test(fields.phone)) {
    score += 20;
  }

  // Age: 10 points
  maxScore += 10;
  if (fields.age && fields.age > 0 && fields.age < 150) {
    score += 10;
  }

  // Other fields: 5 points each
  ['gender', 'annualIncome', 'pincode', 'state'].forEach(field => {
    maxScore += 5;
    if (fields[field]) {
      score += 5;
    }
  });

  return score / maxScore;
};

/**
 * Remove technical IDs from transcript before field extraction.
 * Prevents false matches (e.g., APP-58170515-ZI392V being read as pincode/age fragments).
 */
const sanitizeTranscriptForExtraction = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\bAPP-[A-Z0-9-]+\b/gi, ' ')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Extract UUID applicationId only (legacy APP-* intentionally ignored).
 * @param {String} text
 * @returns {String|null}
 */
const extractPreferredApplicationId = (text) => {
  if (!text || typeof text !== 'string') return null;
  const match = text.match(
    /\b([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\b/i
  );
  return match ? match[1].toLowerCase() : null;
};

const isFinalProcessingStatus = (status) => {
  const normalized = String(status || "").toUpperCase();
  return normalized === "ANALYZED" || normalized === "COMPLETED";
};

module.exports = {
  extractFieldsFromTranscript,
  calculateConfidence,
  extractPreferredApplicationId,
  isFinalProcessingStatus
};
