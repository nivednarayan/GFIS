// ==================== HELPER FUNCTIONS ====================

const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const cleanValue = (value = "") => String(value).replace(/^[\s:,-]+|[\s:,-]+$/g, "").trim();

const RESERVED_VALUE_WORDS = new Set([
  "number",
  "num",
  "no",
  "card",
  "ration",
  "aadhaar",
  "aadhar",
  "is",
]);

const getFieldName = (field = {}) => (typeof field === "string" ? field : field?.name || field?.label || "");

const getFieldLabel = (field = {}) => (typeof field === "string" ? field : field?.label || field?.name || "");

const getFieldOptions = (field = {}) => {
  if (!Array.isArray(field?.options)) return [];
  return field.options
    .map((option) => (typeof option === "string" ? option : option?.value || option?.label))
    .filter(Boolean);
};

const buildFieldGuide = (requiredFields = []) =>
  requiredFields
    .map((field, index) => {
      const name = getFieldName(field);
      const label = getFieldLabel(field);
      const type = typeof field === "string" ? "text" : field?.type || "text";
      const required = typeof field === "string" ? "unknown" : field?.required ? "true" : "false";
      const options = getFieldOptions(field);

      const pattern = typeof field === "string" ? "" : field?.validation?.pattern || "";
      const min = typeof field === "string" ? "" : field?.validation?.min;
      const max = typeof field === "string" ? "" : field?.validation?.max;

      const parts = [
        `${index + 1}. name="${name}"`,
        `label="${label}"`,
        `type="${type}"`,
        `required=${required}`,
      ];

      if (options.length) parts.push(`options=[${options.join(", ")}]`);
      if (pattern) parts.push(`pattern=${pattern}`);
      if (min !== undefined) parts.push(`min=${min}`);
      if (max !== undefined) parts.push(`max=${max}`);

      return parts.join(", ");
    })
    .join("\n");

const tryParseJsonObject = (text = "") => {
  const raw = String(text || "").trim();
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return {};
    try {
      return JSON.parse(match[0]);
    } catch {
      return {};
    }
  }
};

// ==================== STRICT VALIDATION ====================

function validateExtractedValueStrict(field = {}, value = "") {
  if (!value) return false;

  const v = cleanValue(String(value));
  if (!v) return false;

  const fieldName = normalizeText(field.name || field.label || "");

  // fullName: Must have proper noun shape, no digits, reject status words
  if (fieldName.includes("name")) {
    if (!/^[A-Z]/.test(v)) return false;
    if (!/[A-Za-z]{2,}/.test(v)) return false;
    if (/\d/.test(v)) return false;
    if (v.length > 40) return false;

    const rejectedWords = ["married", "single", "divorced", "widowed", "old", "years", "male", "female", "mr", "ms", "mrs", "dr", "sir", "madam"];
    const normalized = normalizeText(v);

    for (const rejected of rejectedWords) {
      if (new RegExp(`\\b${rejected}\\b`).test(normalized)) return false;
    }

    return v.length >= 3;
  }

  // maritalStatus: STRICT enum
  if (fieldName.includes("marital")) {
    const normalized = normalizeText(v);
    const validMap = {
      single: "Single",
      "not married": "Single",
      unmarried: "Single",
      married: "Married",
      divorced: "Divorced",
      widowed: "Widowed",
      widow: "Widowed",
      widower: "Widowed",
    };
    return Boolean(validMap[normalized]);
  }

  // gender: STRICT enum
  if (fieldName.includes("gender") || fieldName.includes("sex")) {
    const normalized = normalizeText(v);
    const validMap = {
      male: "Male",
      female: "Female",
      man: "Male",
      woman: "Female",
      boy: "Male",
      girl: "Female",
      m: "Male",
      f: "Female",
    };
    return Boolean(validMap[normalized]);
  }

  // age: numeric 1-120
  if (/\bage\b/.test(fieldName)) {
    const n = Number(v);
    return Number.isFinite(n) && n >= 1 && n <= 120;
  }

  // aadhaarNumber: 12 digits
  if (fieldName.includes("aadhaar") || fieldName.includes("aadhar")) {
    const digits = v.replace(/\D/g, "");
    return digits.length === 12;
  }

  // mobileNumber: 10 digits, starts 6-9
  if (fieldName.includes("mobile") || fieldName.includes("phone") || fieldName.includes("contact")) {
    const digits = v.replace(/\D/g, "");
    return /^[6-9]\d{9}$/.test(digits);
  }

  // address: max 100 chars
  if (fieldName.includes("address")) {
    return v.length >= 3 && v.length <= 100;
  }

  // income: numeric, 3-8 digits after removing commas/symbols
  if (fieldName.includes("income")) {
    const digits = v.replace(/[^\d]/g, "");
    return /^\d{1,9}$/.test(digits);
  }

  // percentage/marks: numeric 0-100
  if (fieldName.includes("percentage") || fieldName.includes("marks")) {
    const n = Number(String(v).replace(/[^\d.]/g, ""));
    return Number.isFinite(n) && n >= 0 && n <= 100;
  }

  // land area: numeric positive (acres/hectares)
  if (fieldName.includes("areaofland") || fieldName.includes("landarea") || /\barea\b/.test(fieldName)) {
    const n = Number(String(v).replace(/[^\d.]/g, ""));
    return Number.isFinite(n) && n >= 0 && n <= 100000;
  }

  // ownership fields: yes/no
  if (fieldName.includes("ownership") || fieldName.includes("houseownership") || fieldName.includes("landownership")) {
    const normalized = normalizeText(v);
    return ["yes", "no", "true", "false", "y", "n", "i own", "have", "do not own", "dont own", "don't own"].includes(normalized);
  }

  // institution/course: free text, reasonable length
  if (fieldName.includes("institution") || fieldName.includes("course")) {
    return v.length >= 2 && v.length <= 80;
  }

  // familyMembers: numeric 1-20
  if (fieldName.includes("family") || fieldName.includes("member")) {
    const n = Number(v);
    return Number.isFinite(n) && n >= 1 && n <= 20;
  }

  // rationCard: alphanumeric 5-20 chars, NOT short pure numeric
  if (fieldName.includes("ration")) {
    if (!/^[A-Za-z0-9/-]{5,20}$/.test(v)) return false;
    if (/^\d{1,4}$/.test(v)) return false;
    if (RESERVED_VALUE_WORDS.has(normalizeText(v))) return false;
    return true;
  }

  // select field: must be in options
  if (field.type === "select" && Array.isArray(field.options) && field.options.length) {
    return field.options.some((option) => {
      const optStr = typeof option === "string" ? option : option.label || option.value;
      return normalizeText(optStr) === normalizeText(v);
    });
  }

  return v.length > 0;
}

function normalizeValueByField(field = {}, value = "") {
  const fieldName = normalizeText(field.name || field.label || "");
  let normalizedValue = cleanValue(String(value));

  if (fieldName.includes("marital")) {
    const key = normalizeText(normalizedValue);
    const map = {
      single: "Single",
      "not married": "Single",
      unmarried: "Single",
      married: "Married",
      divorced: "Divorced",
      widowed: "Widowed",
      widow: "Widowed",
      widower: "Widowed",
    };
    normalizedValue = map[key] || normalizedValue;
  }

  if (fieldName.includes("gender") || fieldName.includes("sex")) {
    const key = normalizeText(normalizedValue);
    const map = { male: "Male", female: "Female", man: "Male", woman: "Female", boy: "Male", girl: "Female", m: "Male", f: "Female" };
    normalizedValue = map[key] || normalizedValue;
  }

  if (fieldName.includes("aadhaar") || fieldName.includes("aadhar")) {
    normalizedValue = normalizedValue.replace(/\D/g, "");
  }

  if (fieldName.includes("mobile") || fieldName.includes("phone") || fieldName.includes("contact")) {
    normalizedValue = normalizedValue.replace(/\D/g, "");
  }

  if (fieldName.includes("income")) {
    const incomeText = String(normalizedValue).toLowerCase();
    const numberMatch = incomeText.match(/\d[\d,]*(?:\.\d+)?/);

    if (numberMatch) {
      const base = Number(numberMatch[0].replace(/,/g, ""));
      let multiplier = 1;

      if (/\bcrore\b|\bcrores\b/.test(incomeText)) multiplier = 10000000;
      else if (/\blakh\b|\blakhs\b/.test(incomeText)) multiplier = 100000;
      else if (/\bthousand\b|\d+\s*k\b|\d+k\b/.test(incomeText)) multiplier = 1000;

      normalizedValue = String(Math.round(base * multiplier));
    } else {
      normalizedValue = normalizedValue.replace(/,/g, "").replace(/[^\d]/g, "");
    }
  }

  if (fieldName.includes("percentage") || fieldName.includes("marks")) {
    const n = Number(String(normalizedValue).replace(/[^\d.]/g, ""));
    if (Number.isFinite(n)) normalizedValue = String(n);
  }

  if (fieldName.includes("areaofland") || fieldName.includes("landarea") || /\barea\b/.test(fieldName)) {
    const n = Number(String(normalizedValue).replace(/[^\d.]/g, ""));
    if (Number.isFinite(n)) normalizedValue = String(n);
  }

  if (fieldName.includes("ownership") || fieldName.includes("houseownership") || fieldName.includes("landownership")) {
    const key = normalizeText(normalizedValue);
    const map = {
      yes: "Yes",
      y: "Yes",
      true: "Yes",
      "i own": "Yes",
      have: "Yes",
      no: "No",
      n: "No",
      false: "No",
      "do not own": "No",
      "dont own": "No",
      "don't own": "No",
    };
    normalizedValue = map[key] || normalizedValue;
  }

  if (fieldName.includes("state") || fieldName.includes("district")) {
    // Remove "state" or "district" suffix if included
    normalizedValue = normalizedValue.replace(/\s+(state|district|dist)$/i, "").trim();
  }

  if (fieldName.includes("ration")) {
    const key = normalizeText(normalizedValue);
    if (RESERVED_VALUE_WORDS.has(key)) return "";
  }

  return normalizedValue;
}

// ==================== REGEX FALLBACK (for when LLM providers unavailable) ====================

const FIELD_PATTERNS = {
  fullName: [
    /\bmy\s+name\s+is\s+([A-Z][a-zA-Z\s'-]{2,40})(?=\s*(?:[,.]|and|from|my|$))/i,
    /\b(?:i\s+am)\s+([A-Z][a-zA-Z\s'-]{2,40})(?=\s*[,.])/i,
    /\bcall\s+me\s+([A-Z][a-zA-Z\s'-]{2,40})(?=\s*(?:[,.]|and|$))/i,
    /\b(?:name|called|known\s+as)\s*[:=]\s*([A-Z][a-zA-Z\s'-]{2,40})(?=\s*[,.]|$)/i,
  ],
  aadhaarNumber: [
    /\b(\d{4}\s\d{4}\s\d{4})\b/,
    /\b(\d{12})\b/,
    /\b(?:aadhaar|aadhar)\s*(?:no|number|is)?\s*[:=]?\s*(\d{4}\s\d{4}\s\d{4}|\d{12})\b/i,
  ],
  mobileNumber: [
    /\b(?:\+91[\s-]?)?([6-9]\d{9})\b/,
    /\b(?:mobile|phone|contact)\s*(?:no|number|is)?\s*[:=]?\s*(?:\+91\s?)?([6-9]\d{9})\b/i,
  ],
  gender: [
    /\b(?:i\s+am|i'm|im|am)\s+(?:a\s+)?(male|female|man|woman|boy|girl)\b/i,
    /\b(male|female|man|woman)\b/i,
    /\b(?:gender|sex)\s*[:=]?\s*(male|female|m|f)\b/i,
  ],
  state: [
    /(?:from|state|in)\s+([A-Za-z][A-Za-z\s]{2,30})(?=\s+(?:state\b|\w*\s+district|,|$))/i,
    /\b(Maharashtra|Karnataka|Kerala|Punjab|Gujarat|Rajasthan|Tamil Nadu|Uttar Pradesh|Bihar|West Bengal|Madhya Pradesh|Odisha|Telangana|Andhra Pradesh|Haryana|Jharkhand|Assam|Chhattisgarh|Uttarakhand|Himachal Pradesh|Goa|Manipur|Meghalaya|Nagaland|Sikkim|Tripura|Arunachal Pradesh|Mizoram)\b/i,
  ],
  district: [
    /\b([A-Za-z][A-Za-z\s]{2,30})\s+(?:district|dist)\b/i,
    /\bfrom\s+([A-Za-z][A-Za-z\s]{2,30})\s+district\b/i,
  ],
  address: [/\b(?:from|live\s+(?:in|at)|at)\s+([A-Za-z\s,]{3,50}?)(?=\s+(?:and|my|,|\.)|$)/i],
  income: [
    /\b(?:income|annual\s+income|earning|salary)\s*(?:is|of|around|about)?\s*(?:₹|rs\.?\s*)?((?:\d+(?:,\d+)?(?:\.\d+)?)(?:\s*(?:k|thousand|lakh|lakhs|crore|crores))?)/i,
    /\b(?:₹|rs\.?\s*)((?:\d+(?:,\d+)?(?:\.\d+)?)(?:\s*(?:k|thousand|lakh|lakhs|crore|crores))?)\b/i,
    /\b((?:\d+(?:,\d+)?(?:\.\d+)?)(?:\s*(?:k|thousand|lakh|lakhs|crore|crores)))\b/i,
  ],
  familyMembers: [
    /\b(?:family|members)\s+(?:has|have)?\s*(\d{1,2})\s+(?:people|members)\b/i,
    /\b(\d{1,2})\s+(?:family\s+)?members?\b/i,
    /\b(?:we\s+are|there\s+are)\s+(\d{1,2})\s+(?:people|members)\s+in\s+(?:the\s+)?family\b/i,
  ],
  rationCard: [
    /\b(?:ration\s+card|rc)(?:\s*(?:number|no|num))?\s*(?:is|:|=)\s*([A-Za-z0-9/-]{5,20})\b/i,
    /\b(?:ration\s+card|rc)\s+([A-Za-z0-9/-]{5,20})\b/i,
  ],
  maritalStatus: [
    /\b(?:i\s+am|i'm|im|am)\s+(?:a\s+)?(not\s+married|unmarried|married|single|divorced|widowed|widow|widower)\b/i,
    /\b(?:\d{1,3})\s+years?\s+old\s+(not\s+married|unmarried|married|single|divorced|widowed|widow|widower)\b/i,
    /\b(not\s+married|unmarried|married|single|divorced|widowed|widow|widower)\s+(?:man|woman|person)\b/i,
    /\b(?:marital\s+status|status)\s*[:=]?\s*(not\s+married|unmarried|married|single|divorced|widowed|widow|widower)\b/i,
  ],
  age: [
    /\b(\d{1,3})\s+years?\s+old\b/i,
    /\b(?:i\s+(?:am|'m|m)|my)\s+age\s+(?:is)?\s*(\d{1,3})\b/i,
    /\b(?:i\s+(?:am|'m|m))\s+(\d{1,3})\s+years?\s*(?:old)?\b/i,
    /\b(?:age|my\s+age)\s+(?:is)?\s*[:=]?\s*(\d{1,3})\b/i,
    /\b(?:age)\s+(\d{1,3})\b/i,
  ],
  ownership: [
    /\b(?:do\s+you\s+own|own(?:ership)?|house\s+ownership|land\s+ownership)\s*(?:is|:)?\s*(yes|no)\b/i,
    /\b(i\s+own|have)\s+(?:a\s+)?(?:pucca\s+house|house|cultivable\s+land|land)\b/i,
    /\b(?:no\s+pucca\s+house|do\s+not\s+own\s+(?:a\s+)?(?:pucca\s+)?(?:house|land)|don't\s+own\s+(?:a\s+)?(?:pucca\s+)?(?:house|land))\b/i,
  ],
  areaOfLand: [
    /\b(?:area\s+of\s+land|land\s+area)\s*(?:is|:)?\s*(\d+(?:\.\d+)?)\s*(?:acres?|hectares?)?\b/i,
    /\b(\d+(?:\.\d+)?)\s*(?:acres?|hectares?)\b/i,
  ],
  institution: [
    /\b(?:studying|study)\s+at\s+([A-Za-z0-9 .,&'-]{3,80}?)(?=\s*(?:\.|,|and|course|percentage|income|$))/i,
    /\b(?:institution|college|school|university)\s*(?:name|is|:)?\s*([A-Za-z0-9 .,&'-]{3,80}?)(?=\s*(?:\.|,|and|course|percentage|income|$))/i,
  ],
  course: [
    /\b(?:course|stream|program)\s*(?:name|is|:)?\s*([A-Za-z0-9 .,&'-]{2,60}?)(?=\s*(?:\.|,|and|percentage|income|$))/i,
    /\b(?:pursuing|doing)\s+([A-Za-z0-9 .,&'-]{2,60}?)(?=\s*(?:\.|,|and|percentage|income|$))/i,
  ],
  percentage: [
    /\b(?:percentage|marks?)\s*(?:is|:)?\s*(\d+(?:\.\d+)?)\s*%?\b/i,
    /\b(\d+(?:\.\d+)?)\s*%\b/i,
  ],
};

function resolvePatternKey(field = {}) {
  const fieldName = normalizeText(getFieldName(field));
  const fieldLabel = normalizeText(getFieldLabel(field));
  const ref = `${fieldName} ${fieldLabel}`;
  const compact = ref.replace(/\s+/g, "");

  if (/\b(aadhaar|aadhar)\b/.test(ref) || compact.includes("aadhaar")) return "aadhaarNumber";
  if (/\b(mobile|phone|contact)\b/.test(ref) || compact.includes("mobilenumber")) return "mobileNumber";
  if (/\bmarital\b/.test(ref) || compact.includes("maritalstatus")) return "maritalStatus";
  if (/\b(gender|sex)\b/.test(ref)) return "gender";
  if (/\b(percentage|marks?)\b/.test(ref)) return "percentage";
  if (/\b(area\s*of\s*land|land\s*area|areaofland)\b/.test(ref) || compact.includes("areaofland") || compact.includes("landarea")) return "areaOfLand";
  if (/\b(landownership|houseownership|ownership|own\s+(?:cultivable\s+)?land|pucca\s+house)\b/.test(ref) || compact.includes("landownership") || compact.includes("houseownership")) return "ownership";
  if (/\b(state)\b/.test(ref)) return "state";
  if (/\b(district|dist)\b/.test(ref)) return "district";
  if (/\b(address)\b/.test(ref)) return "address";
  if (/\b(income|salary|earning)\b/.test(ref) || compact.includes("annualincome") || compact.includes("familyannualincome")) return "income";
  if (/\b(family|member)\b/.test(ref) || compact.includes("familymembers")) return "familyMembers";
  if (/\b(ration)\b/.test(ref) || compact.includes("rationcard")) return "rationCard";
  if (/\b(institution|college|school|university)\b/.test(ref)) return "institution";
  if (/\b(course|stream|program)\b/.test(ref)) return "course";
  if (/\bage\b/.test(ref)) return "age";
  if (/\b(name|student\s+name)\b/.test(ref) || compact.includes("fullname") || compact.includes("studentname")) return "fullName";

  return "";
}

function extractWithPatternFallback(introText, requiredFields) {
  const extracted = {};

  requiredFields.forEach((field) => {
    const fieldName = getFieldName(field);
    const patternKey = resolvePatternKey(field);
    const patterns = patternKey ? FIELD_PATTERNS[patternKey] || [] : [];

    if (!patterns.length) return;

    for (const pattern of patterns) {
      const match = introText.match(pattern);
      if (!match) continue;

      let value = match[1] || match[2] || "";

      if (!value && patternKey === "ownership") {
        const matchedText = String(match[0] || "").toLowerCase();
        if (/\b(i\s+own|have)\b/.test(matchedText)) value = "yes";
        else if (/\b(no\s+pucca\s+house|do\s+not\s+own|don't\s+own)\b/.test(matchedText)) value = "no";
      }

      if (!value) continue;

      if (patternKey === "income" && !/[a-z]/i.test(String(value))) {
        const matchedText = String(match[0] || "").toLowerCase();
        if (/\b\d+\s*k\b|\b\d+k\b/.test(matchedText)) value = `${value}k`;
        else if (/\blakh\b|\blakhs\b/.test(matchedText)) value = `${value} lakh`;
        else if (/\bcrore\b|\bcrores\b/.test(matchedText)) value = `${value} crore`;
        else if (/\bthousand\b/.test(matchedText)) value = `${value} thousand`;
      }

      value = cleanValue(value);
      const fieldObj = typeof field === "string" ? { name: field } : field;

      if (validateExtractedValueStrict(fieldObj, value)) {
        extracted[fieldName] = normalizeValueByField(fieldObj, value);
        break;
      }
    }
  });

  return extracted;
}

// ==================== LLM PROVIDERS ====================

async function callOpenAI({ prompt }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) return null;

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "{}";
}

async function callGemini({ prompt }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
      },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) return null;

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
}

async function callClaude({ prompt }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const model = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) return null;

  const data = await response.json();
  return data?.content?.[0]?.text || "{}";
}

function getProviderChain() {
  const provider = String(process.env.INTRO_EXTRACTION_PROVIDER || "openai").toLowerCase();

  if (provider === "gemini") return ["gemini"];
  if (provider === "openai") return ["openai"];
  if (provider === "claude") return ["claude"];
  if (provider === "auto") return ["openai", "gemini", "claude"];

  return ["openai"];
}

async function extractWithLLMOnly(introText, requiredFields) {
  const providerChain = getProviderChain();

  // Build detailed field schema from requiredFields for this specific scheme
  const fieldSchema = requiredFields
    .map((field) => {
      const name = getFieldName(field);
      const label = getFieldLabel(field);
      const type = typeof field === "string" ? "text" : field?.type || "text";
      const required = typeof field === "string" ? "required" : field?.required !== false ? "required" : "optional";
      const options = getFieldOptions(field);
      const validation = typeof field === "string" ? "" : field?.validation?.pattern || "";
      const min = typeof field === "string" ? "" : field?.validation?.min;
      const max = typeof field === "string" ? "" : field?.validation?.max;

      let fieldDef = `- ${name} (label: "${label}", type: ${type}, ${required})`;
      if (options.length) fieldDef += `\n  Options: ${options.join(" | ")}`;
      if (validation) fieldDef += `\n  Format: ${validation}`;
      if (min !== undefined) fieldDef += `\n  Min: ${min}`;
      if (max !== undefined) fieldDef += `\n  Max: ${max}`;

      return fieldDef;
    })
    .join("\n");

  const prompt = `You are a strict information extractor for government schemes.
Extract ONLY fields explicitly mentioned in the user's introduction.
Return a JSON object with matching field names as keys.

SCHEME FIELDS (these are the ONLY fields to extract for this scheme):
${fieldSchema}

USER INTRODUCTION:
"${introText}"

EXTRACTION RULES:
1. Extract ONLY if information is explicitly stated in the intro.
2. Field names MUST exactly match the list above.
3. Omit any field not mentioned - do NOT infer or guess.
4. For option-based fields (dropdowns/selects), return ONLY one exact option from the list.
5. Do NOT confuse different fields:
   - fullName is a person's name (NOT marital status, occupation, or adjectives)
   - maritalStatus is Single/Married/Divorced/Widowed (NOT a name)
   - familyMembers is a number (NOT confuse with aadhaar digits or other numbers)
   - aadhaarNumber is exactly 12 digits (NOT other numeric IDs)
   - mobileNumber is 10 digits starting 6-9 (NOT other phones or IDs)
6. Validate formats strictly:
   - Aadhaar: exactly 12 digits (remove spaces/dashes)
   - Mobile: exactly 10 digits, starts with 6-9
   - Age: numeric 1-120 only
7. Never return invalid or ambiguous data.
8. Return ONLY the JSON object, no explanations.

Example output (varies by scheme):
{"fullName":"Rajesh Kumar","aadhaarNumber":"123456789012","maritalStatus":"Married"}

Now extract from the intro above and return only JSON:`;

  for (const provider of providerChain) {
    try {
      let raw = null;

      if (provider === "openai") raw = await callOpenAI({ prompt });
      else if (provider === "gemini") raw = await callGemini({ prompt });
      else if (provider === "claude") raw = await callClaude({ prompt });

      if (!raw) continue;

      const parsed = tryParseJsonObject(raw);
      const extracted = {};

      requiredFields.forEach((field) => {
        const key = getFieldName(field);
        const fieldObj = typeof field === "string" ? { name: field } : field;
        const value = parsed?.[key];

        if (value === undefined || value === null || value === "") return;

        const normalizedValue = normalizeValueByField(fieldObj, value);
        if (validateExtractedValueStrict(fieldObj, normalizedValue)) {
          extracted[key] = normalizedValue;
        }
      });

      return { extracted, source: provider };
    } catch (error) {
      console.warn(`[intro_extractor_failproof] ${provider} provider error:`, error.message);
    }
  }

  // Fallback: If all LLM providers failed, use pattern-based extraction
  const patternExtracted = extractWithPatternFallback(introText, requiredFields);
  if (Object.keys(patternExtracted).length > 0) {
    return { extracted: patternExtracted, source: "pattern-fallback" };
  }

  return { extracted: {}, source: "none" };
}

// ==================== ORCHESTRATOR ====================

const extractIntroFailProof = async ({ introText = "", requiredFields = [] }) => {
  const { extracted, source } = await extractWithLLMOnly(introText, requiredFields);

  const fieldsMissing = requiredFields
    .map((field) => getFieldName(field))
    .filter((fieldName) => fieldName && !extracted[fieldName]);

  const captureRate = requiredFields.length > 0 ? Object.keys(extracted).length / requiredFields.length : 1;

  return {
    extracted,
    captureRate,
    source,
    fieldsExtracted: Object.keys(extracted),
    fieldsMissing,
  };
};

// ==================== BACKWARD COMPATIBILITY ====================

const extractIntroHybrid = async ({ introText = "", requiredFields = [] }) => {
  const result = await extractIntroFailProof({ introText, requiredFields });
  return {
    extracted: result.extracted,
    source: result.source,
    captureRate: result.captureRate,
  };
};

module.exports = {
  extractIntroHybrid,
  extractIntroFailProof,
};
