const COMMON_KEYWORDS = {
  name: ["name", "full name", "applicant name"],
  aadhaar: ["aadhaar", "aadhar", "aadhaar number", "aadhar number", "uid"],
  mobile: ["mobile", "mobile number", "phone", "phone number", "contact number"],
  email: ["email", "email id", "mail"],
  dateOfBirth: ["dob", "date of birth", "birth date"],
  income: ["income", "annual income", "annual agricultural income", "salary", "yearly income", "earn"],
  address: ["address", "residence", "home address", "live in", "located at", "from"],
  familyMembers: ["family", "family members", "number of family members", "members", "people"],
  rationCard: ["ration card", "ration card number", "ration number"],
  landOwnership: ["own cultivable land", "land ownership", "own land", "land"],
};

const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const cleanValue = (value = "") => String(value).replace(/^[\s:,-]+|[\s:,-]+$/g, "").trim();

const isLikelyRationCardValue = (value = "") => {
  const token = String(value).trim();
  if (!token) return false;
  if (/^\d{1,4}$/.test(token)) return false;
  return /^[A-Za-z0-9/-]{5,20}$/.test(token);
};

const extractFamilyMembersFromText = (introText = "") => {
  const matches = [
    introText.match(/(?:my\s+family|family\s+of)\s+(?:has|have|is|are|with)?\s*(\d{1,2})\s+(?:people|members|persons)/i),
    introText.match(/\b(\d{1,2})\s+(?:people|members|persons)\s+(?:in\s+)?family\b/i),
    introText.match(/family\s*members?\s*[:=-]?\s*(\d{1,2})\b/i),
  ].find(Boolean);

  if (!matches) return "";
  const count = Number(matches[1]);
  if (!Number.isFinite(count) || count <= 0 || count > 99) return "";
  return String(count);
};

const extractRationCardFromText = (introText = "") => {
  const rationMatch = introText.match(
    /(?:ration\s+card\s+(?:number|no)?\s*[:=]?\s*|\brc\s*(?:number|no)?\s*[:=]?\s*)([A-Za-z0-9/-]{1,30})/i,
  );

  if (!rationMatch) return "";
  const candidate = cleanValue(rationMatch[1]);
  return isLikelyRationCardValue(candidate) ? candidate : "";
};

const parseIntroKeyValuePairs = (introText = "") => {
  const segments = introText
    .split(/,|\n|;/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const pairs = [];

  segments.forEach((segment) => {
    const direct = segment.match(/^([^:=-]{2,60})\s*[:=-]\s*(.+)$/);
    if (direct) {
      pairs.push({
        key: normalizeText(direct[1]),
        value: cleanValue(direct[2]),
      });
      return;
    }

    const natural = segment.match(/^([a-z\s]+?)\s+is\s+(.+)$/i);
    if (natural) {
      pairs.push({
        key: normalizeText(natural[1]),
        value: cleanValue(natural[2]),
      });
    }
  });

  return pairs;
};

const hasAnyKeyword = (text = "", keywordList = []) =>
  keywordList.some((keyword) => normalizeText(text).includes(normalizeText(keyword)));

const getFieldCanonicalType = (field = {}) => {
  const token = `${field?.name || ""} ${field?.label || ""}`;

  if (hasAnyKeyword(token, COMMON_KEYWORDS.aadhaar)) return "aadhaar";
  if (hasAnyKeyword(token, COMMON_KEYWORDS.mobile)) return "mobile";
  if (hasAnyKeyword(token, COMMON_KEYWORDS.email)) return "email";
  if (hasAnyKeyword(token, COMMON_KEYWORDS.dateOfBirth)) return "dateOfBirth";
  if (hasAnyKeyword(token, COMMON_KEYWORDS.income)) return "income";
  if (hasAnyKeyword(token, COMMON_KEYWORDS.address)) return "address";
  if (hasAnyKeyword(token, COMMON_KEYWORDS.landOwnership)) return "landOwnership";
  if (hasAnyKeyword(token, COMMON_KEYWORDS.rationCard)) return "rationCard";
  if (hasAnyKeyword(token, COMMON_KEYWORDS.familyMembers)) return "familyMembers";
  if (hasAnyKeyword(token, COMMON_KEYWORDS.name)) return "name";

  return "";
};

const validateFieldInput = (field = {}, value = "") => {
  if (field.required !== false && !String(value).trim()) {
    return false;
  }

  if (field.type === "number" && Number.isNaN(Number(value))) {
    return false;
  }

  if (Array.isArray(field.options) && field.options.length > 0) {
    const optionMatch = field.options.some(
      (option) => normalizeText(option) === normalizeText(value),
    );
    if (!optionMatch) return false;
  }

  if (field.validation?.pattern) {
    try {
      const regex = new RegExp(field.validation.pattern);
      if (!regex.test(String(value).trim())) return false;
    } catch (error) {
      return false;
    }
  }

  return true;
};

const extractFactsFromIntro = (introText = "") => {
  const facts = {};
  const pairs = parseIntroKeyValuePairs(introText);

  pairs.forEach((pair) => {
    if (hasAnyKeyword(pair.key, COMMON_KEYWORDS.name)) {
      facts.name = pair.value;
    }

    if (hasAnyKeyword(pair.key, COMMON_KEYWORDS.aadhaar)) {
      const digits = pair.value.replace(/\D/g, "");
      if (digits.length >= 12) facts.aadhaar = digits.slice(0, 12);
    }

    if (hasAnyKeyword(pair.key, COMMON_KEYWORDS.mobile)) {
      const digits = pair.value.replace(/\D/g, "");
      if (digits.length >= 10) facts.mobile = digits.slice(-10);
    }

    if (hasAnyKeyword(pair.key, COMMON_KEYWORDS.email)) {
      facts.email = pair.value;
    }

    if (hasAnyKeyword(pair.key, COMMON_KEYWORDS.dateOfBirth)) {
      facts.dateOfBirth = pair.value;
    }

    if (hasAnyKeyword(pair.key, COMMON_KEYWORDS.income)) {
      const amount = pair.value.replace(/[^\d.]/g, "");
      if (amount) facts.income = amount;
    }

    if (hasAnyKeyword(pair.key, COMMON_KEYWORDS.address)) {
      facts.address = pair.value;
    }

    if (hasAnyKeyword(pair.key, COMMON_KEYWORDS.familyMembers)) {
      const count = pair.value.match(/\b(\d{1,3})\b/);
      if (count) facts.familyMembers = count[1];
    }

    if (hasAnyKeyword(pair.key, COMMON_KEYWORDS.rationCard)) {
      const candidate = cleanValue(pair.value);
      if (isLikelyRationCardValue(candidate)) {
        facts.rationCard = candidate;
      }
    }
  });

  const nameMatch = introText.match(
    /(?:my name is|this is)\s+([a-z][a-z\s'.-]{1,80}?)(?=\s+(?:and|my|my|mobile|aadhaar|aadhar|income|land|address|dob|date of birth|birth|aadhaar|aadhar|lived|stay)\b|[,.]|$)/i,
  );
  if (nameMatch?.[1]) {
    const nameCandidate = cleanValue(nameMatch[1]);
    const statusWords = ["married", "single", "divorced", "widowed"];
    // Only set name if it's not a status word
    if (!statusWords.includes(normalizeText(nameCandidate))) {
      facts.name = nameCandidate;
    }
  }

  const emailMatch = introText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (emailMatch) facts.email = emailMatch[0];

  const aadhaarMatch = introText.match(/(\d{4}\s?\d{4}\s?\d{4}|\d{12})/);
  if (aadhaarMatch && !facts.aadhaar) {
    const value = aadhaarMatch[1].replace(/\s/g, "");
    if (value.length === 12) facts.aadhaar = value;
  }

  const mobileMatch = introText.match(/(?:\+91[\s-]?)?\b([6-9]\d{9})\b/);
  if (mobileMatch && !facts.mobile) facts.mobile = mobileMatch[1];

  const dobMatch = introText.match(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/);
  if (dobMatch && !facts.dateOfBirth) facts.dateOfBirth = dobMatch[1];

  const incomeMatch = introText.match(/(?:income|salary|annual income|annual agricultural income|earn)[^\d]{0,20}(\d[\d,]*)/i);
  if (incomeMatch && !facts.income) facts.income = incomeMatch[1].replace(/,/g, "");

  if (!facts.familyMembers) {
    const familyMembers = extractFamilyMembersFromText(introText);
    if (familyMembers) facts.familyMembers = familyMembers;
  }

  if (!facts.rationCard) {
    const rationCard = extractRationCardFromText(introText);
    if (rationCard) facts.rationCard = rationCard;
  }

  if (/\b(yes|y|true|haan|ha)\b/i.test(introText)) facts.landOwnership = "Yes";
  if (/\b(no|n|false|nahi|nah)\b/i.test(introText)) facts.landOwnership = "No";

  if (!facts.address) {
    const addressMatch = introText.match(/(?:address|live in|located at|my address is|from|at)\s+([^,]+(?:,[^,]+)?)/i);
    if (addressMatch) facts.address = cleanValue(addressMatch[1]);
  }

  return facts;
};

const getFactValueForField = (field, facts = {}, introText = "") => {
  const canonicalType = getFieldCanonicalType(field);

  if (canonicalType && facts[canonicalType]) {
    const value = String(facts[canonicalType]).trim();
    // Apply validation before returning
    const validated = validateExtractedValue(field, value);
    if (validated) return validated;
  }

  const fieldName = normalizeText(field.name || "");
  const fieldLabel = normalizeText(field.label || "");

  if (facts.familyMembers && (fieldName.includes("family") || fieldName.includes("member") || fieldLabel.includes("family") || fieldLabel.includes("member"))) {
    return facts.familyMembers;
  }

  if (facts.rationCard && (fieldName.includes("ration") || fieldName.includes("card") || fieldLabel.includes("ration") || fieldLabel.includes("card"))) {
    return facts.rationCard;
  }

  if (Array.isArray(field.options) && field.options.length > 0) {
    const found = field.options.find((option) => normalizeText(introText).includes(normalizeText(option)));
    if (found) return found;
  }

  const isFamilyCountField =
    fieldName.includes("family") ||
    fieldName.includes("member") ||
    fieldLabel.includes("family") ||
    fieldLabel.includes("member") ||
    fieldName.includes("count") ||
    fieldLabel.includes("count");
  const isRationCardField =
    fieldName.includes("ration") ||
    fieldLabel.includes("ration") ||
    (fieldName.includes("card") && fieldLabel.includes("number"));

  if (!isRationCardField && (field.type === "number" || isFamilyCountField)) {
    const contextNumber = introText.match(/\b(\d{1,3})\s+(?:people|members|persons|count)\b/i);
    if (contextNumber) return contextNumber[1];
  }

  return "";
};

const localExtract = (introText = "", requiredFields = []) => {
  const facts = extractFactsFromIntro(introText);
  const extracted = {};

  requiredFields.forEach((field) => {
    const value = getFactValueForField(field, facts, introText);
    if (!value) return;

    if (!validateFieldInput(field, value)) return;

    extracted[field.name] = String(value).trim();
  });

  return extracted;
};

const getCaptureRate = (requiredFields = [], extracted = {}) => {
  if (!requiredFields.length) return 1;
  const captured = requiredFields.filter((field) => extracted[field.name]).length;
  return captured / requiredFields.length;
};

const validateExtractedValue = (field = {}, value = "") => {
  if (!value) return null;

  const normalized = String(value).trim();
  if (!normalized) return null;

  // Name field: reject status/condition words and validate length
  if ((normalizeText(field.name || "").includes("name") || normalizeText(field.label || "").includes("name")) &&
      field.type !== "select") {
    const statusWords = ["married", "single", "divorced", "widowed", "yes", "no", "true", "false"];
    if (statusWords.includes(normalizeText(normalized))) {
      return null; // Reject status words as names
    }
    // Reject overly long names (usually extraction errors)
    // Names should be: < 40 chars, < 3 words, no punctuation like periods
    const words = normalized.split(/\s+/);
    if (normalized.length > 40 || words.length > 3 || /[.,;:!?]/.test(normalized)) {
      return null;
    }  }

  // Address: max 50 chars, no connecting words like "and my"
  if ((normalizeText(field.name || "").includes("address") || normalizeText(field.label || "").includes("address")) &&
      field.type !== "select") {
    if (normalized.length > 50 || /\band\b|\bmy\b|\byour\b|\bi have\b/i.test(normalized)) {
      return null; // Reject addresses that include connecting phrases
    }
  }

  // Income: extract first numeric chunk that's reasonable size (3-8 digits)
  if (field.type === "number" && (normalizeText(field.name || "").includes("income") || normalizeText(field.label || "").includes("income"))) {
    // Match the first number that looks like income (3-8 digits)
    const incomeMatch = normalized.match(/\b(\d{3,8})\b/);
    if (incomeMatch) {
      return incomeMatch[1];
    }
    return null;
  }

  // Select field: must be in options
  if (field.type === "select" && Array.isArray(field.options) && field.options.length > 0) {
    const valid = field.options.some((option) => {
      const optStr = typeof option === "string" ? option : option.label || option.value;
      return normalizeText(optStr) === normalizeText(normalized);
    });
    if (!valid) return null;
    return normalized;
  }

  // Numeric fields
  if (field.type === "number") {
    const num = Number(normalized);
    if (!Number.isFinite(num) || num < 0) return null;
    return String(num);
  }

  // Aadhaar: 12 digits
  if (normalizeText(field.name || "").includes("aadhaar") || normalizeText(field.label || "").includes("aadhaar")) {
    const digits = normalized.replace(/\D/g, "");
    if (digits.length === 12) return digits;
    return null;
  }

  // Mobile: 10 digits
  if (normalizeText(field.name || "").includes("mobile") || normalizeText(field.label || "").includes("mobile")) {
    const digits = normalized.replace(/\D/g, "");
    if (digits.length === 10 && /^[6-9]/.test(digits)) return digits;
    return null;
  }

  // Marital status strict check
  if (normalizeText(field.label || "").includes("marital")) {
    const valid = ["single", "married", "divorced", "widowed"];
    if (!valid.includes(normalizeText(normalized))) return null;
    return normalized;
  }

  return normalized;
};

const callClaudeExtractor = async ({ introText, requiredFields }) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return {};

  // Build detailed field requirements for Claude
  const fieldRequirements = requiredFields
    .map((field) => {
      let req = `\n- ${field.label} (${field.name}):`;
      
      if (field.type === "select" && Array.isArray(field.options) && field.options.length > 0) {
        const opts = field.options.map((o) => (typeof o === "string" ? o : o.label || o.value));
        req += `\n  Type: Select from [${opts.join(", ")}]`;
        req += `\n  Look for: user mentioning any of these options`;
        req += `\n  Rule: ONLY return exact option values. NO other values accepted.`;
      }
      
      if (field.name.toLowerCase().includes("name") || field.label.toLowerCase().includes("name")) {
        req += `\n  Type: Person Name`;
        req += `\n  Look for: phrases like "my name is X", "this is X", "I'm X", "call me X"`;
        req += `\n  Rule: Extract ONLY the person name (2-3 words max). NO status words.`;
        req += `\n  Rule: REJECT if value is: married, single, divorced, widowed, yes, no, true, false`;
        req += `\n  Rule: Name must be < 40 chars and have no punctuation`;
      }
      
      if (field.name.toLowerCase().includes("aadhaar") || field.label.toLowerCase().includes("aadhaar")) {
        req += `\n  Type: Aadhaar Number`;
        req += `\n  Format: exactly 12 digits (remove spaces/dashes if present)`;
        req += `\n  Pattern: XXXX XXXX XXXX or XXXXXXXXXXXX`;
        req += `\n  Rule: Extract digits only, must be exactly 12 digits`;
      }
      
      if (field.name.toLowerCase().includes("mobile") || field.label.toLowerCase().includes("mobile") || field.label.toLowerCase().includes("phone")) {
        req += `\n  Type: Mobile Number`;
        req += `\n  Format: 10 digits, starts with 6, 7, 8, or 9`;
        req += `\n  Pattern: 98765XXXXX or +91 98765XXXXX`;
        req += `\n  Rule: Extract last 10 digits only`;
      }
      
      if (field.name.toLowerCase().includes("age") || field.label.toLowerCase().includes("age")) {
        req += `\n  Type: Age (number)`;
        req += `\n  Rule: Extract numeric value only. Must be 0-120`;
      }
      
      if (field.name.toLowerCase().includes("income") || field.label.toLowerCase().includes("income")) {
        req += `\n  Type: Income (number)`;
        req += `\n  Look for: text like "annual income is 400000", "income of 500000"`;
        req += `\n  Rule: Extract ONLY the number that directly follows income/salary keywords`;
        req += `\n  Rule: Stop at period, comma, or next keyword. Do NOT include subsequent numbers.`;
        req += `\n  Rule: Valid range: 3-8 digits (100 to 99,999,999)`;
        req += `\n  CRITICAL: If you find "annual income is 400000. My family has 3 members", extract ONLY 400000, NOT 4000003`;
      }
      
      if (field.name.toLowerCase().includes("address") || field.label.toLowerCase().includes("address")) {
        req += `\n  Type: Address (text)`;
        req += `\n  Look for: location phrases like "live in", "at", "from", "address is"`;
        req += `\n  Rule: Extract ONLY the location name (city, state, or address). Stop at next field/sentence.`;
        req += `\n  Rule: Max 50 characters. Remove extra text after location.`;
      }
      
      if (field.name.toLowerCase().includes("family") || field.label.toLowerCase().includes("family") || field.label.toLowerCase().includes("members")) {
        req += `\n  Type: Family Members Count (number)`;
        req += `\n  Look for: "my family has X people", "X family members", "family of X"`;
        req += `\n  Rule: Extract numeric value only`;
      }
      
      if (field.name.toLowerCase().includes("marital")) {
        req += `\n  Type: Marital Status`;
        req += `\n  Look for: "I am married/single/divorced/widowed", "married", etc.`;
        req += `\n  Rule: ONLY accept: Single, Married, Divorced, Widowed`;
      }
      
      if (field.name.toLowerCase().includes("ration") || field.label.toLowerCase().includes("ration")) {
        req += `\n  Type: Ration Card Number`;
        req += `\n  Look for: "ration card", "ration number", "RC", explicitly mentioning ration card`;
        req += `\n  Rule: Extract ration card codes (5-20 alphanumeric). REJECT short numbers (1-4 digits)`;
      }
      
      if (field.name.toLowerCase().includes("land") || field.label.toLowerCase().includes("land") || field.label.toLowerCase().includes("ownership")) {
        req += `\n  Type: Land Ownership (yes/no)`;
        req += `\n  Look for: "own land", "own cultivable land", "have land", "don't own land"`;
        req += `\n  Rule: Extract Yes or No`;
      }
      
      return req;
    })
    .join("\n");

  const prompt = `You are an expert form data extractor. Your task is to extract user information from their introduction text.

USER INTRODUCTION:
"${introText}"

FIELD REQUIREMENTS TO EXTRACT:
${fieldRequirements}

EXTRACTION RULES:
1. Return ONLY valid JSON with field names as keys
2. Omit fields NOT explicitly mentioned in the intro
3. Validate each extracted value against its specific rules above
4. For select fields: ONLY return exact values from the options list
5. For text fields: validate length, format, and content type
6. For numeric fields: extract numbers only, remove symbols
7. Be strict about validation - if in doubt, omit the field
8. Do NOT include explanations, comments, or markdown

EXAMPLES OF WRONG EXTRACTIONS (DO NOT DO):
- Extracting "married" as a full name ❌
- Returning "5" as a ration card number ❌
- Accepting "Delhi address is" as a name ❌
- Including status words/phrases in name field ❌

Return only valid JSON. No explanation.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest",
      max_tokens: 512,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
      system: "Return only valid JSON. No markdown, no explanations. Omit fields that don't match requirements.",
    }),
  });

  if (!response.ok) return {};

  const data = await response.json();
  const rawText = data?.content?.[0]?.text || "{}";

  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return {};
    const parsed = JSON.parse(jsonMatch[0]);

    const cleaned = {};
    requiredFields.forEach((field) => {
      const value = parsed[field.name];
      if (value === undefined || value === null) return;
      if (typeof value !== "string" && typeof value !== "number") return;
      
      const validated = validateExtractedValue(field, String(value));
      if (validated) {
        cleaned[field.name] = validated;
      }
    });

    return cleaned;
  } catch (error) {
    return {};
  }
};

const extractIntroHybrid = async ({ introText = "", requiredFields = [] }) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const mode = process.env.INTRO_EXTRACTION_AI_MODE || "claude-first";
  const threshold = Number(process.env.INTRO_EXTRACTION_THRESHOLD || 0.7);

  // Claude-first mode: try Claude first, local as fallback
  if (apiKey && mode !== "local-only" && requiredFields.length > 0) {
    const claudeResult = await callClaudeExtractor({ introText, requiredFields });
    const claudeRate = getCaptureRate(requiredFields, claudeResult);

    // If Claude captures above threshold, return it
    if (claudeRate >= threshold) {
      return {
        extracted: claudeResult,
        source: "claude",
        captureRate: claudeRate,
      };
    }

    // Otherwise supplement with local extraction
    const localResult = localExtract(introText, requiredFields);
    const merged = { ...claudeResult, ...localResult };

    return {
      extracted: merged,
      source: "hybrid-claude-local",
      captureRate: getCaptureRate(requiredFields, merged),
    };
  }

  // Fallback to local-only if no API key or mode is local-only
  const localResult = localExtract(introText, requiredFields);

  return {
    extracted: localResult,
    source: "local",
    captureRate: getCaptureRate(requiredFields, localResult),
  };
};

module.exports = {
  extractIntroHybrid,
};
