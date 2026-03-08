import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AudioRecorder from '../../components/AudioRecorder';

const API_BASE_URL = 'http://localhost:5000/api';

const universalFieldLabels = {
  fullName: 'Full Name (as per Aadhaar)',
  aadhaarNumber: 'Aadhaar Number',
  mobileNumber: 'Mobile Number',
  email: 'Email ID',
  dateOfBirth: 'Date of Birth',
  address: 'Address (Village, District, State)',
  bankDetails: 'Bank Account Details (IFSC + Account Number)',
  income: 'Annual Family Income',
};

const fieldMeta = {
  aadhaarNumber: {
    type: 'text',
    validation: {
      pattern: '^[0-9]{12}$',
      message: 'Please enter a valid 12-digit Aadhaar number.',
    },
  },
  mobileNumber: {
    type: 'text',
    validation: {
      pattern: '^[0-9]{10}$',
      message: 'Please enter a valid 10-digit mobile number.',
    },
  },
};

const buildGuidedFields = (schemeData) => {
  if (!schemeData || !schemeData.fields) return [];
  return schemeData.fields.map((field) => ({
    name: field.name,
    label: field.label,
    type: field.type || 'text',
    section: 'Scheme Fields',
    required: field.required !== false,
    validation: field.validation,
    options: field.options,
  }));
};

const buildQuestion = (field, stepNumber, totalSteps) => {
  const optionsText = field.options?.length ? ` Options: ${field.options.join(' / ')}` : '';
  return `Step ${stepNumber}/${totalSteps} (${field.section})\n${field.label}${optionsText}`;
};

const validateFieldInput = (field, value) => {
  if (!field.required) return null;
  if (!value.trim()) return `${field.label} is required. Please enter a value.`;

  if (field.type === 'number' && Number.isNaN(Number(value))) {
    return `Please enter a valid number for ${field.label}.`;
  }

  if (field.options?.length) {
    const isValidOption = field.options.some(
      (option) => option.toLowerCase() === value.trim().toLowerCase(),
    );

    if (!isValidOption) {
      return `Please enter one of: ${field.options.join(', ')}.`;
    }
  }

  if (field.validation?.pattern) {
    const regex = new RegExp(field.validation.pattern);
    if (!regex.test(value.trim())) {
      return field.validation.message || `Invalid value for ${field.label}.`;
    }
  }

  return null;
};

const cleanExtractedValue = (value) => value.replace(/^[\s:,-]+|[\s:,-]+$/g, '').trim();

const normalizeToken = (value = '') =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const FIELD_ALIASES = {
  name: ['name', 'full name', 'applicant name'],
  aadhaar: ['aadhaar', 'aadhar', 'aadhaar number', 'aadhar number', 'uid'],
  mobile: ['mobile', 'mobile number', 'phone', 'phone number', 'contact number'],
  email: ['email', 'email id', 'mail'],
  dateofbirth: ['dob', 'date of birth', 'birth date'],
  income: ['income', 'annual income', 'annual agricultural income', 'salary', 'yearly income'],
  address: ['address', 'residence', 'home address'],
};

const inferAliasKeys = (field) => {
  const nameToken = normalizeToken(field.name || '');
  const labelToken = normalizeToken(field.label || '');

  return Object.keys(FIELD_ALIASES).filter(
    (key) => nameToken.includes(key) || labelToken.includes(key),
  );
};

const parseIntroKeyValuePairs = (introText) => {
  const pairs = [];
  
  // Split by commas or newlines to get individual statements
  const segments = introText
    .split(/,|\n|;/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  segments.forEach((segment) => {
    // Try direct match: "key: value" or "key = value"
    let directMatch = segment.match(/^([^:=-]{2,40})\s*[:=-]\s*(.+)$/);
    if (directMatch) {
      pairs.push({
        key: normalizeToken(directMatch[1]),
        value: cleanExtractedValue(directMatch[2]),
      });
      return;
    }

    // Try natural language: "key is value"
    let naturalMatch = segment.match(/^([a-z\s]+?)\s+is\s+(.+)$/i);
    if (naturalMatch) {
      const potentialKey = normalizeToken(naturalMatch[1]);
      if (potentialKey.length > 1) {
        pairs.push({
          key: potentialKey,
          value: cleanExtractedValue(naturalMatch[2]),
        });
        return;
      }
    }
  });

  return pairs;
};

const getValueFromKeyValuePairs = (field, parsedPairs) => {
  if (!parsedPairs.length) return '';

  const directTokens = [normalizeToken(field.label), normalizeToken(field.name)].filter(Boolean);
  const aliasKeys = inferAliasKeys(field);
  const aliasTokens = aliasKeys.flatMap((aliasKey) => FIELD_ALIASES[aliasKey] || []);
  const supportedTokens = [...directTokens, ...aliasTokens.map(normalizeToken)];

  const match = parsedPairs.find((pair) => supportedTokens.includes(pair.key));
  return match?.value || '';
};

const findValueByLabeledPattern = (sourceText, tokens) => {
  const escapedTokens = tokens
    .filter(Boolean)
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  if (!escapedTokens.length) return '';

  const pattern = new RegExp(
    `(?:${escapedTokens.join('|')})\\s*(?:is|:|=|-)?\\s*([^\\n,.]+)`,
    'i',
  );
  const match = sourceText.match(pattern);
  return match ? cleanExtractedValue(match[1]) : '';
};

const extractFieldValueFromIntro = (field, introText) => {
  const sourceText = introText.trim();
  if (!sourceText) return '';

  const parsedPairs = parseIntroKeyValuePairs(sourceText);
  const pairValue = getValueFromKeyValuePairs(field, parsedPairs);
  if (pairValue) return pairValue;

  const fieldName = (field.name || '').toLowerCase();
  const fieldLabel = (field.label || '').toLowerCase();

  if (fieldName.includes('email') || fieldLabel.includes('email')) {
    const match = sourceText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return match ? match[0] : '';
  }

  if (fieldName.includes('aadhaar') || fieldLabel.includes('aadhaar')) {
    const match = sourceText.match(/\b\d{12}\b/);
    return match ? match[0] : '';
  }

  if (fieldName.includes('mobile') || fieldLabel.includes('mobile') || fieldName.includes('phone')) {
    const match = sourceText.match(/\b\d{10}\b/);
    return match ? match[0] : '';
  }

  if (fieldName.includes('dateofbirth') || fieldName.includes('dob') || fieldLabel.includes('date of birth')) {
    const match = sourceText.match(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/);
    return match ? match[0] : '';
  }

  if (field.options?.length) {
    const normalizedText = sourceText.toLowerCase();
    const selectedOption = field.options.find((option) =>
      normalizedText.includes(option.toLowerCase()),
    );
    if (selectedOption) return selectedOption;
  }

  if (fieldName.includes('name') || fieldLabel.includes('name')) {
    const labeledName = findValueByLabeledPattern(sourceText, [
      'name',
      'full name',
      'applicant name',
      field.label,
      field.name,
    ]);
    if (labeledName) return labeledName;

    const introPattern = sourceText.match(/(?:my name is|i am|i'm)\s+([a-z][a-z\s'.-]{1,60})/i);
    if (introPattern) return cleanExtractedValue(introPattern[1]);
  }

  if (fieldName.includes('income') || fieldLabel.includes('income')) {
    const incomeMatch = sourceText.match(
      /(?:income|salary|annual income|annual agricultural income)[^\d]{0,20}(\d[\d,]*)/i,
    );
    if (incomeMatch) return incomeMatch[1].replace(/,/g, '');
  }

  if (
    fieldName.includes('land') ||
    fieldLabel.includes('land') ||
    fieldName.includes('cultivable') ||
    fieldLabel.includes('cultivable')
  ) {
    if (/\b(yes|y|true|haan|ha)\b/i.test(sourceText)) return 'Yes';
    if (/\b(no|n|false|nahi|nah)\b/i.test(sourceText)) return 'No';
  }

  if (fieldName.includes('address') || fieldLabel.includes('address')) {
    return findValueByLabeledPattern(sourceText, ['address', field.label, field.name]);
  }

  return findValueByLabeledPattern(sourceText, [field.label, field.name]);
};

const getFieldCanonicalType = (field) => {
  const nameToken = normalizeToken(field.name || '');
  const labelToken = normalizeToken(field.label || '');

  if (nameToken.includes('name') || labelToken.includes('name')) return 'name';
  if (nameToken.includes('aadhaar') || nameToken.includes('aadhar') || labelToken.includes('aadhaar') || labelToken.includes('aadhar')) return 'aadhaar';
  if (nameToken.includes('mobile') || nameToken.includes('phone') || labelToken.includes('mobile') || labelToken.includes('phone')) return 'mobile';
  if (nameToken.includes('email') || labelToken.includes('email')) return 'email';
  if (nameToken.includes('dateofbirth') || nameToken.includes('dob') || labelToken.includes('date of birth') || labelToken.includes('dob')) return 'dateOfBirth';
  if (nameToken.includes('income') || labelToken.includes('income')) return 'income';
  if (nameToken.includes('land') || labelToken.includes('land') || nameToken.includes('cultivable') || labelToken.includes('cultivable')) return 'landOwnership';
  if (nameToken.includes('address') || labelToken.includes('address')) return 'address';

  return '';
};

const isAadhaarField = (field) => getFieldCanonicalType(field) === 'aadhaar';

const getLoggedInAadhaar = (user) => {
  if (!user) return '';

  const rawAadhaar = user.aadhaar || user.aadhaarNumber || user.aadhar || user.aadharNumber || '';
  const digitsOnly = String(rawAadhaar).replace(/\D/g, '');
  return digitsOnly.length === 12 ? digitsOnly : '';
};

const extractCommonFactsFromIntro = (introText) => {
  const sourceText = introText.trim();
  const facts = {};

  if (!sourceText) return facts;

  const parsedPairs = parseIntroKeyValuePairs(sourceText);
  parsedPairs.forEach((pair) => {
    const key = normalizeToken(pair.key);
    if (!key || !pair.value) return;

    if (FIELD_ALIASES.name.some((alias) => key.includes(normalizeToken(alias)))) {
      facts.name = pair.value;
    }

    if (FIELD_ALIASES.aadhaar.some((alias) => key.includes(normalizeToken(alias)))) {
      const digits = pair.value.replace(/\D/g, '');
      if (digits) facts.aadhaar = digits.slice(0, 12);
    }

    if (FIELD_ALIASES.mobile.some((alias) => key.includes(normalizeToken(alias)))) {
      const digits = pair.value.replace(/\D/g, '');
      if (digits) facts.mobile = digits.slice(-10);
    }

    if (FIELD_ALIASES.email.some((alias) => key.includes(normalizeToken(alias)))) {
      facts.email = pair.value;
    }

    if (FIELD_ALIASES.dateofbirth.some((alias) => key.includes(normalizeToken(alias)))) {
      facts.dateOfBirth = pair.value;
    }

    if (FIELD_ALIASES.income.some((alias) => key.includes(normalizeToken(alias)))) {
      const amount = pair.value.replace(/[^\d.]/g, '');
      if (amount) facts.income = amount;
    }

    if (FIELD_ALIASES.address.some((alias) => key.includes(normalizeToken(alias)))) {
      facts.address = pair.value;
    }
  });

  const nameSentenceMatch = sourceText.match(
    /(?:my name is|i am|i'm|this is)\s+([a-z][a-z\s'.-]{1,80}?)(?=\s+(?:and|my|i|mobile|aadhaar|aadhar|income|land|address|dob|date of birth)\b|[,.]|$)/i,
  );
  if (nameSentenceMatch?.[1]) {
    facts.name = cleanExtractedValue(nameSentenceMatch[1]);
  }

  const emailMatch = sourceText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (emailMatch) facts.email = emailMatch[0];

  if (!facts.aadhaar) {
    const aadhaarMatch = sourceText.match(/(\d{4}\s?\d{4}\s?\d{4}|\d{12})/);
    if (aadhaarMatch) {
      const cleaned = aadhaarMatch[1].replace(/\s/g, '');
      if (cleaned.length === 12) facts.aadhaar = cleaned;
    }
  }

  if (!facts.mobile) {
    const mobileMatch = sourceText.match(/(?:\+91[\s-]?)?\b([6-9]\d{9})\b/);
    if (mobileMatch && mobileMatch[1].length === 10) facts.mobile = mobileMatch[1];
  }

  if (!facts.dateOfBirth) {
    const dobMatch = sourceText.match(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/);
    if (dobMatch) facts.dateOfBirth = dobMatch[1];
  }

  if (!facts.income) {
    const incomeMatch = sourceText.match(/(?:income|salary|annual income|annual agricultural income)[^\d]{0,20}(\d[\d,]*)/i);
    if (incomeMatch) facts.income = incomeMatch[1].replace(/,/g, '');
  }

  if (!facts.landOwnership) {
    if (/\b(yes|y|true|haan|ha)\b/i.test(sourceText)) facts.landOwnership = 'Yes';
    else if (/\b(no|n|false|nahi|nah)\b/i.test(sourceText)) facts.landOwnership = 'No';
  }

  if (!facts.address) {
    const addressMatch = sourceText.match(/(?:address|live in|located at|my address is|from|at)\s+([^,]+(?:,[^,]+)?)/i);
    if (addressMatch) facts.address = addressMatch[1].trim();
  }

  // Context-based family member detection: "my family has X people" or "X family members"
  if (!facts.familyMembers) {
    const familyMatch = sourceText.match(/(?:my family|family of)\s+(?:has|have|is|are|with)\s+(\d+)\s+(?:people|members|persons)/i);
    if (familyMatch) facts.familyMembers = familyMatch[1];
  }

  // Ration card: "ration card number is ABC123" or similar
  if (!facts.rationCard) {
    const rationMatch = sourceText.match(/(?:ration\s+card\s+(?:number|no)?\s*[:=]?\s*)([A-Z0-9]+)/i);
    if (rationMatch) facts.rationCard = rationMatch[1];
  }

  return facts;
};

const getFactValueForField = (field, facts) => {
  const fieldType = getFieldCanonicalType(field);
  const fieldNameLower = (field.name || '').toLowerCase();
  const fieldLabelLower = (field.label || '').toLowerCase();

  if (fieldType === 'name') return facts.name || '';
  if (fieldType === 'aadhaar') return facts.aadhaar || '';
  if (fieldType === 'mobile') return facts.mobile || '';
  if (fieldType === 'email') return facts.email || '';
  if (fieldType === 'dateOfBirth') return facts.dateOfBirth || '';
  if (fieldType === 'income') return facts.income || '';
  if (fieldType === 'landOwnership') return facts.landOwnership || '';
  if (fieldType === 'address') return facts.address || '';

  // Fallback: check by field name for extracted facts
  if (facts.familyMembers && (fieldNameLower.includes('family') || fieldNameLower.includes('member'))) {
    return facts.familyMembers;
  }
  if (facts.rationCard && (fieldNameLower.includes('ration') || fieldNameLower.includes('card'))) {
    return facts.rationCard;
  }

  return '';
};

const extractAnswersFromIntro = (requiredFields, introText) => {
  const facts = extractCommonFactsFromIntro(introText);
  const sourceText = introText.trim();

  return requiredFields.reduce((answers, field) => {
    // Strategy 1: Try to get from common facts (extracted earlier)
    let extractedValue = getFactValueForField(field, facts);
    
    // Strategy 2: Try field-specific extraction
    if (!extractedValue) {
      extractedValue = extractFieldValueFromIntro(field, sourceText);
    }

    // Strategy 3: For numeric fields, look for context-aware numbers
    if (!extractedValue && (field.type === 'number' || field.type === 'text')) {
      const fieldNameLower = (field.name || '').toLowerCase();
      const fieldLabelLower = (field.label || '').toLowerCase();
      const isFamilyCountField =
        fieldNameLower.includes('members') ||
        fieldNameLower.includes('family') ||
        fieldLabelLower.includes('members') ||
        fieldLabelLower.includes('family');
      const isRationCardField =
        fieldNameLower.includes('ration') ||
        fieldLabelLower.includes('ration') ||
        (fieldNameLower.includes('card') && fieldLabelLower.includes('number'));

      // Is this a "count" or "number" field?
      if (
        !isRationCardField &&
        (isFamilyCountField ||
          fieldNameLower.includes('count') ||
          fieldLabelLower.includes('count'))
      ) {
        // Try context-aware patterns first
        let numberMatch = null;
        
        if (fieldNameLower.includes('family') || fieldNameLower.includes('member')) {
          // Look for "X people", "X members", "X family"
          numberMatch = sourceText.match(/\b(\d+)\s+(?:people|members|person|member|persons|family|families)/i);
        }
        
        if (!numberMatch) {
          // Fallback: just get first number
          numberMatch = sourceText.match(/\b(\d+)\b/);
        }
        
        if (numberMatch) {
          const num = numberMatch[1];
          // Quick validation for reasonable range
          if (parseInt(num) > 0 && parseInt(num) < 999) {
            extractedValue = num;
          }
        }
      }
    }

    // Strategy 4: For text fields with options, try to find any matching option in text
    if (!extractedValue && field.options && field.options.length > 0) {
      const textLower = sourceText.toLowerCase();
      const foundOption = field.options.find(
        (opt) => textLower.includes(opt.toLowerCase()),
      );
      if (foundOption) {
        extractedValue = foundOption;
      }
    }

    if (!extractedValue) return answers;

    const validationError = validateFieldInput(field, extractedValue);
    if (validationError) return answers;

    return {
      ...answers,
      [field.name]: extractedValue,
    };
  }, {});
};

const extractAnswersFromIntroAPI = async (requiredFields, introText) => {
  const localExtraction = extractAnswersFromIntro(requiredFields, introText);

  try {
    const response = await fetch(`${API_BASE_URL}/input/extract-intro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        introText,
        requiredFields,
      }),
    });

    if (!response.ok) {
      return localExtraction;
    }

    const payload = await response.json();
    const extracted = payload?.data?.extracted;
    if (!extracted || typeof extracted !== 'object') {
      return localExtraction;
    }

    // Keep deterministic local extraction as a safety net when API misses fields.
    return {
      ...localExtraction,
      ...extracted,
    };
  } catch (error) {
    return localExtraction;
  }
};

function SchemeAssist() {
  const { schemeId } = useParams();
  const { user } = useAuth();
  const recognitionRef = useRef(null);
  const latestChatInputRef = useRef('');
  const voiceSessionBaseRef = useRef('');
  const initializationRef = useRef(false); // Prevent React.StrictMode double initialization
  const speedChangeTimeoutRef = useRef(null); // Debounce speed changes
  const spokenMessagesIndexRef = useRef(-1); // Track last message that was spoken
  const [schemeData, setSchemeData] = useState(null);
  const [applicationId, setApplicationId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isMicSupported, setIsMicSupported] = useState(true);
  const [voiceStatus, setVoiceStatus] = useState('Click mic to start speaking');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [collectedAnswers, setCollectedAnswers] = useState({});
  const [hasCapturedIntro, setHasCapturedIntro] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [textToSpeechEnabled, setTextToSpeechEnabled] = useState(true);
  const [speechRate, setSpeechRate] = useState(1);
  const [lastBotMessage, setLastBotMessage] = useState('');
  const [isSpeechPaused, setIsSpeechPaused] = useState(false);
  const [speechSessionKey, setSpeechSessionKey] = useState(0);

  const districtId = useMemo(
    () => user?.districtId || user?.district || 'district-001',
    [user],
  );

  const guidedFields = useMemo(() => (schemeData ? buildGuidedFields(schemeData) : []), [schemeData]);
  const requiredGuidedFields = useMemo(
    () => guidedFields.filter((field) => field.required),
    [guidedFields],
  );
  const loggedInAadhaar = useMemo(() => getLoggedInAadhaar(user), [user]);

  const buildAadhaarAcceptedMessage = useCallback(() => {
    if (!loggedInAadhaar || !requiredGuidedFields.length) return '';

    const maskedAadhaar = `XXXX-XXXX-${loggedInAadhaar.slice(-4)}`;
    return `Step 1/${requiredGuidedFields.length} (Identity)\nAadhaar already accepted from your login profile: ${maskedAadhaar}.`;
  }, [loggedInAadhaar, requiredGuidedFields.length]);

  const markLatestBotMessageForReplay = useCallback((chatMessages = []) => {
    let lastBotMessageIndex = -1;

    for (let index = chatMessages.length - 1; index >= 0; index -= 1) {
      if (chatMessages[index]?.role === 'bot') {
        lastBotMessageIndex = index;
        break;
      }
    }

    spokenMessagesIndexRef.current = lastBotMessageIndex - 1;
  }, []);

  const enforceLoggedInAadhaar = useCallback(
    (answers = {}) => {
      if (!loggedInAadhaar || !requiredGuidedFields.length) return answers;

      let changed = false;
      const mergedAnswers = { ...answers };

      requiredGuidedFields.forEach((field) => {
        if (!isAadhaarField(field)) return;

        if (mergedAnswers[field.name] !== loggedInAadhaar) {
          mergedAnswers[field.name] = loggedInAadhaar;
          changed = true;
        }
      });

      return changed ? mergedAnswers : answers;
    },
    [loggedInAadhaar, requiredGuidedFields],
  );

  const conversationCompleted = currentStepIndex >= requiredGuidedFields.length;

  const findNextMissingRequiredStep = useCallback(
    (answers) => {
      const nextMissingIndex = requiredGuidedFields.findIndex((field) => {
        const value = answers[field.name];
        return typeof value !== 'string' || !value.trim();
      });

      return nextMissingIndex === -1 ? requiredGuidedFields.length : nextMissingIndex;
    },
    [requiredGuidedFields],
  );

  useEffect(() => {
    const normalizedAnswers = enforceLoggedInAadhaar(collectedAnswers);
    if (normalizedAnswers !== collectedAnswers) {
      setCollectedAnswers(normalizedAnswers);
      const nextStepIndex = findNextMissingRequiredStep(normalizedAnswers);
      setCurrentStepIndex(nextStepIndex);
    }
  }, [collectedAnswers, enforceLoggedInAadhaar, findNextMissingRequiredStep]);

  const getQuestionProgress = useCallback(
    (fieldIndex, answers) => {
      const answeredRequiredCount = requiredGuidedFields.reduce((count, field) => {
        const value = answers[field.name];
        return typeof value === 'string' && value.trim() ? count + 1 : count;
      }, 0);

      const currentFieldValue = requiredGuidedFields[fieldIndex]
        ? answers[requiredGuidedFields[fieldIndex].name]
        : '';
      const isCurrentFieldAlreadyAnswered =
        typeof currentFieldValue === 'string' && currentFieldValue.trim();

      return {
        stepNumber: isCurrentFieldAlreadyAnswered ? answeredRequiredCount : answeredRequiredCount + 1,
        totalSteps: requiredGuidedFields.length || 1,
      };
    },
    [requiredGuidedFields],
  );

  // Helper functions for localStorage persistence
  const getStorageKey = (suffix) => `scheme_assist_${schemeId}_${suffix}`;

  const createApplicationDraft = async () => {
    const appResponse = await fetch(`${API_BASE_URL}/applications/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ districtId }),
    });

    if (!appResponse.ok) {
      throw new Error('Failed to create application');
    }

    const appData = await appResponse.json();
    const newAppId = appData.applicationId;
    console.log('[APP] Draft created with real UUID:', newAppId);
    setApplicationId(newAppId);
    localStorage.setItem(getStorageKey('appId'), newAppId);
    return newAppId;
  };

  const saveStateToLocalStorage = (stepIndex, answers, msgHistory) => {
    try {
      localStorage.setItem(getStorageKey('step'), JSON.stringify(stepIndex));
      localStorage.setItem(getStorageKey('answers'), JSON.stringify(answers));
      localStorage.setItem(getStorageKey('messages'), JSON.stringify(msgHistory));
    } catch (err) {
      console.error('Error saving to localStorage:', err);
    }
  };

  const getStateFromLocalStorage = () => {
    try {
      const savedStep = localStorage.getItem(getStorageKey('step'));
      const savedAnswers = localStorage.getItem(getStorageKey('answers'));
      const savedMessages = localStorage.getItem(getStorageKey('messages'));

      return {
        step: savedStep ? JSON.parse(savedStep) : null,
        answers: savedAnswers ? JSON.parse(savedAnswers) : null,
        messages: savedMessages ? JSON.parse(savedMessages) : null,
      };
    } catch (err) {
      console.error('Error reading from localStorage:', err);
      return { step: null, answers: null, messages: null };
    }
  };

  const clearStateFromLocalStorage = () => {
    try {
      localStorage.removeItem(getStorageKey('step'));
      localStorage.removeItem(getStorageKey('answers'));
      localStorage.removeItem(getStorageKey('messages'));
      localStorage.removeItem(getStorageKey('appId'));
      localStorage.removeItem(getStorageKey('submitted'));
      localStorage.removeItem(getStorageKey('submittedData'));
      localStorage.removeItem(getStorageKey('submittedMessages'));
    } catch (err) {
      console.error('Error clearing localStorage:', err);
    }
  };

  const saveSubmittedState = (appId, data, chatMessages) => {
    try {
      localStorage.setItem(getStorageKey('submitted'), 'true');
      localStorage.setItem(getStorageKey('submittedData'), JSON.stringify(data));
      localStorage.setItem(getStorageKey('submittedMessages'), JSON.stringify(chatMessages));
      localStorage.setItem(getStorageKey('appId'), appId);
    } catch (err) {
      console.error('Error saving submitted state:', err);
    }
  };

  const getSubmittedState = () => {
    try {
      const submitted = localStorage.getItem(getStorageKey('submitted'));
      const data = localStorage.getItem(getStorageKey('submittedData'));
      const chatMessages = localStorage.getItem(getStorageKey('submittedMessages'));
      const appId = localStorage.getItem(getStorageKey('appId'));
      return {
        isSubmitted: submitted === 'true',
        data: data ? JSON.parse(data) : null,
        messages: chatMessages ? JSON.parse(chatMessages) : null,
        appId: appId,
      };
    } catch (err) {
      console.error('Error reading submitted state:', err);
      return { isSubmitted: false, data: null, messages: null, appId: null };
    }
  };

  const speakText = useCallback((text, options = {}) => {
    const { speed = speechRate, forceRestart = false } = options;

    if (!textToSpeechEnabled || !('speechSynthesis' in window)) {
      return;
    }

    // Only interrupt current playback for explicit replay/override actions.
    if (forceRestart) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
      setIsSpeechPaused(false);
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speed;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.lang = 'en-IN';

    // Minimal event listeners
    utterance.onstart = () => setIsSpeechPaused(false);
    utterance.onend = () => setIsSpeechPaused(false);
    utterance.onerror = (event) => console.log('TTS Error:', event.error);

    window.speechSynthesis.speak(utterance);
    setLastBotMessage(text);
  }, [textToSpeechEnabled, speechRate]);

  const increaseSpeechRate = useCallback(() => {
    setSpeechRate(prev => Math.min(prev + 0.25, 2));
  }, []);

  const decreaseSpeechRate = useCallback(() => {
    setSpeechRate(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  const repeatLastPrompt = useCallback(() => {
    if (lastBotMessage && textToSpeechEnabled) {
      speakText(lastBotMessage, { speed: speechRate, forceRestart: true });
    }
  }, [lastBotMessage, textToSpeechEnabled, speechRate, speakText]);

  const pauseSpeech = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.pause();
      setIsSpeechPaused(true);
    }
  }, []);

  const resumeSpeech = useCallback(() => {
    if ('speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsSpeechPaused(false);
    }
  }, []);

  const toggleTextToSpeech = useCallback(() => {
    setTextToSpeechEnabled(prev => {
      const newState = !prev;
      if (!newState && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        setIsSpeechPaused(false);
      }
      return newState;
    });
  }, []);

  // Auto-speak all new bot messages as they appear
  useEffect(() => {
    if (!textToSpeechEnabled || messages.length === 0) return;

    // Find all new bot messages that haven't been spoken yet
    const newBotMessages = messages
      .slice(spokenMessagesIndexRef.current + 1)
      .filter(msg => msg.role === 'bot')
      .map(msg => msg.text);

    // Queue each new message; browser TTS will play them sequentially.
    if (newBotMessages.length > 0) {
      newBotMessages.forEach((text) => {
        speakText(text, { speed: speechRate, forceRestart: false });
      });

      // Update the index of the last spoken message
      spokenMessagesIndexRef.current = messages.length - 1;
    }
  }, [messages, textToSpeechEnabled, speakText, speechRate]);

  // Fetch scheme data on mount and ensure a draft application exists
  useEffect(() => {
    // Guard against React.StrictMode double initialization in development
    if (initializationRef.current) return;
    initializationRef.current = true;

    const initializeApplication = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch scheme fields from backend
        const schemeResponse = await fetch(`${API_BASE_URL}/schemes/${schemeId}/fields`);
        if (!schemeResponse.ok) {
          throw new Error('Failed to load scheme data');
        }
        const schemeInfo = await schemeResponse.json();
        setSchemeData(schemeInfo);

        // Check if application was previously submitted
        const submittedState = getSubmittedState();
        
        if (submittedState.isSubmitted && submittedState.appId && submittedState.data) {
          // Restore submitted state
          setApplicationId(submittedState.appId);
          setHasSubmitted(true);
          setHasCapturedIntro(true);
          setSubmittedData(submittedState.data);
          
          // Restore the original chat messages if available
          if (submittedState.messages && submittedState.messages.length > 0) {
            setMessages(submittedState.messages);
            markLatestBotMessageForReplay(submittedState.messages);
          } else {
            // Fallback: Show submitted message if no history
            const submittedMessages = [
              {
                role: 'bot',
                text: `Application already submitted. Your Reference ID is: ${submittedState.appId}`,
              },
              {
                role: 'bot',
                text: 'Here is your submitted data:',
              },
            ];
            
            // Add submitted answers to messages
            if (submittedState.data.responses) {
              Object.entries(submittedState.data.responses).forEach(([key, value]) => {
                submittedMessages.push({
                  role: 'bot',
                  text: `• ${key}: ${value}`,
                });
              });
            }
            
            setMessages(submittedMessages);
            markLatestBotMessageForReplay(submittedMessages);
          }
          
          setIsLoading(false);
          return;
        }

        // Check if there's existing state in localStorage (draft)
        const savedState = getStateFromLocalStorage();
        const savedAppId = localStorage.getItem(getStorageKey('appId'));

        if (savedState.answers && savedState.step !== null && savedState.messages) {
          // Restore previous session
          const normalizedSavedAnswers = enforceLoggedInAadhaar(savedState.answers || {});
          const hasUserInputHistory = (savedState.messages || []).some(
            (message) => message?.role === 'user' && typeof message.text === 'string' && message.text.trim(),
          );

          setCollectedAnswers(normalizedSavedAnswers);
          setCurrentStepIndex(findNextMissingRequiredStep(normalizedSavedAnswers));
          // Only skip intro mode when the user has already sent at least one answer before.
          setHasCapturedIntro(Boolean(hasUserInputHistory));
          setMessages(savedState.messages);
          setChatInput('');
          if (savedAppId) {
            setApplicationId(savedAppId);
          } else {
            try {
              await createApplicationDraft();
            } catch (draftError) {
              console.error('Failed to auto-create application draft for restored session:', draftError);
            }
          }
          markLatestBotMessageForReplay(savedState.messages);
        } else {
          // Start fresh - create draft immediately so audio polling can use applicationId
          if (savedAppId) {
            setApplicationId(savedAppId);
          } else {
            try {
              await createApplicationDraft();
            } catch (draftError) {
              console.error('Failed to auto-create application draft:', draftError);
            }
          }
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Initialization error:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    initializeApplication();
  }, [schemeId]);

  // Initialize chatbot greeting when scheme data loads (only if no previous session)
  useEffect(() => {
    if (!schemeData || !requiredGuidedFields.length) return;

    const savedState = getStateFromLocalStorage();
    const submittedState = getSubmittedState();

    // Skip greeting if restoring previous session (either draft or submitted)
    if (savedState.messages && savedState.messages.length > 0) {
      return;
    }

    // Skip greeting if restoring submitted application
    if (submittedState.isSubmitted && submittedState.messages && submittedState.messages.length > 0) {
      return;
    }

    const greetingMessages = [
      {
        role: 'bot',
        text: `Hi, I will help you complete your ${schemeData.schemeName} application. Please introduce yourself in one message and include as many required details as you can.`,
      },
    ];

    setMessages(greetingMessages);
    setChatInput('');
    setCurrentStepIndex(0);
    setCollectedAnswers({});
    setHasCapturedIntro(false);

    
    // Reset spoken messages index for new conversation
    spokenMessagesIndexRef.current = -1;
  }, [schemeData, requiredGuidedFields]);

  // Initialize speech recognition
  useEffect(() => {
    latestChatInputRef.current = chatInput;
  }, [chatInput]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsMicSupported(false);
      setVoiceStatus('Voice input is not supported in this browser');
      return;
    }

    setIsMicSupported(true);
    setIsListening(false);
    setVoiceStatus('Click mic to start speaking');

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      setIsListening(true);
      voiceSessionBaseRef.current = latestChatInputRef.current.trim();
      setVoiceStatus('Listening... speak now');
    };

    recognition.onresult = (event) => {
      let transcriptChunk = '';

      for (let index = 0; index < event.results.length; index += 1) {
        transcriptChunk += `${event.results[index][0].transcript} `;
      }

      const nextInput = `${voiceSessionBaseRef.current} ${transcriptChunk}`.trim();
      setChatInput(nextInput);
    };

    recognition.onerror = (event) => {
      const errorCode = event?.error || 'unknown-error';
      setVoiceStatus(`Voice input failed (${errorCode}). Please tap mic again`);
      setIsListening(false);

      if (errorCode === 'aborted' || errorCode === 'network' || errorCode === 'audio-capture') {
        setSpeechSessionKey((prev) => prev + 1);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setVoiceStatus('Click mic to start speaking');
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch (err) {
        console.warn('Voice cleanup stop failed:', err);
      }
      recognitionRef.current = null;
    };
  }, [speechSessionKey]);

  /**
   * Handle audio transcription result from AudioRecorder component
   * 
   * When transcription completes:
   * - Append transcript as a user message to chat
   * - Auto-populate collectedAnswers with extracted fields
   * - Show detected fields in UI
   * 
   * Example:
   * User records: "My name is Ashar, my Aadhaar is 1234567890123"
   * 
   * Chat displays:
   * User: My name is Ashar, my Aadhaar is 1234567890123
   * 
   * Auto-filled fields:
   * ✔ fullName: Ashar
   * ✔ aadhaarNumber: 1234567890123
   */
  const handleTranscriptReady = useCallback((transcript, extractedFields, streamedApplicationId) => {
    if (!transcript) {
      console.warn('[SCHEME-ASSIST] Empty transcript received');
      return;
    }

    if (streamedApplicationId) {
      setApplicationId((prev) => prev || streamedApplicationId);
    }

    console.log('[SCHEME-ASSIST] Transcript ready:', {
      transcript,
      extractedFieldsCount: Object.keys(extractedFields || {}).length,
      extractedFields,
      streamedApplicationId,
    });

    setMessages((prev) => [
      ...prev,
      {
        role: 'user',
        text: `📝 From your audio: "${transcript}"`,
      },
    ]);

    if (extractedFields && typeof extractedFields === 'object' && Object.keys(extractedFields).length > 0) {
      setCollectedAnswers((prev) => {
        const updated = enforceLoggedInAadhaar({
          ...prev,
          ...extractedFields,
        });
        setCurrentStepIndex(findNextMissingRequiredStep(updated));
        return updated;
      });

      const detectedCount = Object.keys(extractedFields).length;
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: `✨ Detected ${detectedCount} field(s) from your audio. Continuing to fill remaining fields...`,
        },
      ]);
    }
  }, [enforceLoggedInAadhaar, findNextMissingRequiredStep]);

  const handleSend = async () => {
    if (hasSubmitted) return;

    const trimmed = chatInput.trim();

    // If conversation is completed, allow submit without requiring input
    if (conversationCompleted) {
      // Submit the application to backend with all collected answers
      try {
        let finalApplicationId = applicationId;

        // Only create application draft if it doesn't exist yet
        if (!finalApplicationId) {
          console.log('Creating application draft before submission...');
          finalApplicationId = await createApplicationDraft();
        }

        console.log('Submitting application with data:', {
          applicationId: finalApplicationId,
          collectedAnswers,
          totalFields: Object.keys(collectedAnswers).length,
        });

        const submitResponse = await fetch(
          `${API_BASE_URL}/applications/${finalApplicationId}/submit`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ collectedAnswers }),
          },
        );

        if (submitResponse.status === 404) {
          const newAppId = await createApplicationDraft();
          const recoveryMessages = [
            ...messages,
            {
              role: 'bot',
              text: 'Your previous draft was not found (it may have been deleted). A new draft is created. Click Submit Application once again to complete submission.',
            },
          ];
          setMessages(recoveryMessages);
          saveStateToLocalStorage(currentStepIndex, collectedAnswers, recoveryMessages);
          console.warn('Recovered from stale application id, new draft id:', newAppId);
          setChatInput('');
          return;
        }

        const submitData = await submitResponse.json();

        if (!submitResponse.ok) {
          const errorMessage = submitData.error || submitData.message || 'Failed to submit application';
          throw new Error(`[${submitResponse.status}] ${errorMessage}`);
        }

        console.log('Application submitted successfully:', submitData);

        const successText = `Application submitted successfully. Your Reference ID is: ${submitData.data.applicationId}. You can follow up on your application status later.`;
        const successMessages = [
          ...messages,
          {
            role: 'bot',
            text: successText,
          },
        ];

        setMessages(successMessages);
        setHasSubmitted(true);

        // Save submitted state to localStorage
        const submittedDataToSave = {
          applicationId: submitData.data.applicationId,
          schemeId: submitData.data.schemeId,
          status: submitData.data.status,
          submittedAt: submitData.data.submittedAt,
          totalAnswers: submitData.data.totalAnswers,
          responses: collectedAnswers,
        };
        saveSubmittedState(submitData.data.applicationId, submittedDataToSave, successMessages);
        setSubmittedData(submittedDataToSave);

        // Clear draft localStorage but keep submitted state
        try {
          localStorage.removeItem(getStorageKey('step'));
          localStorage.removeItem(getStorageKey('answers'));
          localStorage.removeItem(getStorageKey('messages'));
        } catch (err) {
          console.error('Error clearing draft state:', err);
        }
      } catch (err) {
        console.error('Submission error:', err);
        const errorMessages = [
          ...messages,
          {
            role: 'bot',
            text: `❌ Failed to submit application: ${err.message}. Your answers have been saved locally.`,
          },
        ];
        setMessages(errorMessages);
        // Save state on error so user doesn't lose data
        saveStateToLocalStorage(currentStepIndex, collectedAnswers, errorMessages);
      }

      setChatInput('');
      return;
    }

    // For regular answers, require input
    if (!trimmed) return;

    const nextMessages = [...messages, { role: 'user', text: trimmed }];

    if (!requiredGuidedFields.length) {
      setMessages(nextMessages);
      setChatInput('');
      return;
    }

    if (!hasCapturedIntro) {
      const extractedAnswers = await extractAnswersFromIntroAPI(requiredGuidedFields, trimmed);
      const updatedAnswers = enforceLoggedInAadhaar({
        ...collectedAnswers,
        ...extractedAnswers,
      });
      const nextStepIndex = findNextMissingRequiredStep(updatedAnswers);

      setCollectedAnswers(updatedAnswers);
      setCurrentStepIndex(nextStepIndex);
      setHasCapturedIntro(true);

      const capturedFieldsText = Object.keys(extractedAnswers).length
        ? requiredGuidedFields
            .filter((field) => extractedAnswers[field.name])
            .map((field) => `• ${field.label}: ${updatedAnswers[field.name]}`)
            .join('\n')
        : '';

      const aadhaarAcceptedText = buildAadhaarAcceptedMessage();

      if (nextStepIndex < requiredGuidedFields.length) {
        const { stepNumber, totalSteps } = getQuestionProgress(nextStepIndex, updatedAnswers);
        const nextQuestion = buildQuestion(
          requiredGuidedFields[nextStepIndex],
          stepNumber,
          totalSteps,
        );
        const introResponse = capturedFieldsText
          ? `Thanks! I captured these details from your introduction:\n${capturedFieldsText}\n\nNow I only need the missing required details.`
          : 'Thanks for the introduction. I could not capture required fields yet, so I will ask only the missing required details now.';

        const introWithAadhaar = aadhaarAcceptedText
          ? `${introResponse}\n\n${aadhaarAcceptedText}`
          : introResponse;

        const introMessages = [
          ...nextMessages,
          { role: 'bot', text: introWithAadhaar },
          { role: 'bot', text: nextQuestion },
        ];

        setMessages(introMessages);
        saveStateToLocalStorage(nextStepIndex, updatedAnswers, introMessages);
        setChatInput('');
        return;
      }

      const summaryLines = requiredGuidedFields.map(
        (field) => `• ${field.label}: ${updatedAnswers[field.name] || '-'}`,
      );

      const summaryText = `Great, I have collected all required inputs for ${schemeData.schemeName} from your introduction.\n\n${aadhaarAcceptedText ? `${aadhaarAcceptedText}\n\n` : ''}Summary:\n${summaryLines.join('\n')}\n\nClick Submit Application to finalize your application.`;
      const introCompleteMessages = [
        ...nextMessages,
        { role: 'bot', text: summaryText },
      ];

      setMessages(introCompleteMessages);
      saveStateToLocalStorage(nextStepIndex, updatedAnswers, introCompleteMessages);
      setChatInput('');
      return;
    }

    const currentField = requiredGuidedFields[currentStepIndex];
    const validationMessage = validateFieldInput(currentField, trimmed);

    if (validationMessage) {
      const { stepNumber, totalSteps } = getQuestionProgress(currentStepIndex, collectedAnswers);
      const errorMessages = [
        ...nextMessages,
        { role: 'bot', text: validationMessage },
        {
          role: 'bot',
          text: buildQuestion(currentField, stepNumber, totalSteps),
        },
      ];
      setMessages(errorMessages);
      // Save state even on validation error
      saveStateToLocalStorage(currentStepIndex, collectedAnswers, errorMessages);
      
      setChatInput('');
      return;
    }

    const updatedAnswers = enforceLoggedInAadhaar({
      ...collectedAnswers,
      [currentField.name]: trimmed,
    });

    const nextStepIndex = findNextMissingRequiredStep(updatedAnswers);
    setCollectedAnswers(updatedAnswers);
    setCurrentStepIndex(nextStepIndex);

    let newMessages;
    
    if (nextStepIndex < requiredGuidedFields.length) {
      const { stepNumber, totalSteps } = getQuestionProgress(nextStepIndex, updatedAnswers);
      const nextQuestion = buildQuestion(
        requiredGuidedFields[nextStepIndex],
        stepNumber,
        totalSteps,
      );
      newMessages = [
        ...nextMessages,
        {
          role: 'bot',
          text: nextQuestion,
        },
      ];
    } else {
      const summaryLines = requiredGuidedFields.map(
        (field) => `• ${field.label}: ${updatedAnswers[field.name] || '-'}`,
      );

      const summaryText = `Great, I have collected all required inputs for ${schemeData.schemeName}.\n\nSummary:\n${summaryLines.join('\n')}\n\nClick Submit Application to finalize your application.`;
      newMessages = [
        ...nextMessages,
        {
          role: 'bot',
          text: summaryText,
        },
      ];
    }

    setMessages(newMessages);
    // Save state after each successful answer (to localStorage only, not DB)
    saveStateToLocalStorage(nextStepIndex, updatedAnswers, newMessages);
    
    setChatInput('');
  };

  const handleInputKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleSend();
    }
  };

  const stopVoiceInput = useCallback(() => {
    if (!recognitionRef.current) {
      setIsListening(false);
      return;
    }

    try {
      recognitionRef.current.stop();
    } catch (err) {
      console.warn('Voice stop failed:', err);
    }

    setIsListening(false);
    setVoiceStatus('Click mic to start speaking');
  }, []);

  const handleResetForm = () => {
    const confirmMsg = hasSubmitted 
      ? 'Are you sure you want to submit another form? This will start a new application.'
      : 'Are you sure you want to reset the form? All entered data will be lost.';
      
    if (window.confirm(confirmMsg)) {
      const resetFormState = () => {
        stopVoiceInput();
        setSpeechSessionKey((prev) => prev + 1);

        // Clear all state
        setCurrentStepIndex(0);
        setCollectedAnswers(enforceLoggedInAadhaar({}));
        setChatInput('');
        setHasSubmitted(false);
        setSubmittedData(null);

        // Clear localStorage completely
        clearStateFromLocalStorage();
        setApplicationId(null);

        // Do NOT create a new application draft - it will be created only on actual submission
        // This prevents unwanted entries in the database for abandoned forms

        // Reset messages to initial greeting
        if (requiredGuidedFields.length > 0) {
          const resetGreetingMessages = [
            {
              role: 'bot',
              text: `Hi, I will help you complete your ${schemeData.schemeName} application. Please introduce yourself in one message and include as many required details as you can.`,
            },
          ];
          setMessages(resetGreetingMessages);
          markLatestBotMessageForReplay(resetGreetingMessages);
        }

        setHasCapturedIntro(false);
      };

      resetFormState();
    }
  };

  const handleMicClick = () => {
    if (!recognitionRef.current) {
      setVoiceStatus('Reinitializing voice input. Please try again');
      setSpeechSessionKey((prev) => prev + 1);
      return;
    }

    if (isListening) {
      stopVoiceInput();
      return;
    }

    try {
      recognitionRef.current.start();
    } catch (err) {
      console.warn('Voice start failed:', err);
      setVoiceStatus('Mic was busy. Reinitializing voice input');
      setIsListening(false);
      setSpeechSessionKey((prev) => prev + 1);
    }
  };

  if (isLoading) {
    return (
      <section className="page">
        <h2>Loading Scheme...</h2>
        <p>Please wait, fetching scheme details from server.</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page">
        <h2>Error Loading Scheme</h2>
        <p>{error}</p>
        <div className="page-links">
          <Link to="/citizen/apply">Back to Schemes</Link>
        </div>
      </section>
    );
  }

  if (!schemeData) {
    return (
      <section className="page">
        <h2>Scheme Not Found</h2>
        <p>Please select a valid scheme from the list.</p>
        <div className="page-links">
          <Link to="/citizen/apply">Back to Schemes</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="page page-chat-layout">
      <div className="voice-panel">
        <h2>{schemeData.schemeName}</h2>
        <p>Use voice input to start filling the application quickly.</p>

        <AudioRecorder
          applicationId={applicationId}
          districtId={districtId}
          onTranscriptReady={handleTranscriptReady}
        />

        <div className="page-links">
          <Link to="/citizen/apply">Back to Schemes</Link>
        </div>
      </div>

      <div className="chat-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Assistant Chat</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              className="tts-control-button"
              onClick={decreaseSpeechRate}
              title="Decrease speech speed"
              disabled={!textToSpeechEnabled || speechRate <= 0.5}
            >
              ⏪
            </button>
            <span className="speech-rate-display" title={`Current speed: ${speechRate}x`}>
              {speechRate}x
            </span>
            <button
              type="button"
              className="tts-control-button"
              onClick={increaseSpeechRate}
              title="Increase speech speed"
              disabled={!textToSpeechEnabled || speechRate >= 2}
            >
              ⏩
            </button>
            <button
              type="button"
              className="tts-control-button"
              onClick={repeatLastPrompt}
              title="Repeat last prompt"
              disabled={!textToSpeechEnabled || !lastBotMessage}
            >
              🔁
            </button>
            <button
              type="button"
              className="tts-control-button"
              onClick={isSpeechPaused ? resumeSpeech : pauseSpeech}
              title={isSpeechPaused ? "Resume speech" : "Pause speech"}
              disabled={!textToSpeechEnabled}
            >
              {isSpeechPaused ? '▶️' : '⏸️'}
            </button>
            <button
              type="button"
              className={`text-to-speech-button ${textToSpeechEnabled ? 'tts-enabled' : 'tts-disabled'}`}
              onClick={toggleTextToSpeech}
              title="Toggle text-to-speech for bot prompts"
            >
              {textToSpeechEnabled ? '🔊 ON' : '🔇 OFF'}
            </button>
          </div>
        </div>
        <div className="requirements-panel">
          <h4>Information Required</h4>
          <div className="requirements-block">
            <strong>Scheme Fields</strong>
            <ul>
              {schemeData.fields?.map((field) => (
                <li key={field.name}>{field.label}</li>
              ))}
            </ul>
          </div>

          {schemeData.requiredDocuments?.length > 0 && (
            <div className="requirements-block">
              <strong>Required Documents</strong>
              <ul>
                {schemeData.requiredDocuments.map((doc) => (
                  <li key={doc}>{doc}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="chat-messages">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`chat-bubble ${message.role}`}>
              {message.text.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          ))}
        </div>
        <div className="chat-input-row">
          <input
            type="text"
            placeholder={
              hasSubmitted
                ? 'Application submitted successfully'
                : conversationCompleted
                  ? 'Click Submit Application button to finalize'
                  : 'Type your answer for the current step...'
            }
            className="chat-input"
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            onKeyDown={handleInputKeyDown}
            disabled={conversationCompleted || hasSubmitted}
          />
          {!hasSubmitted ? (
            <button type="button" className="chat-send-button" onClick={handleSend}>
              {conversationCompleted ? 'Submit Application' : 'Send'}
            </button>
          ) : (
            <span className="chat-submitted-badge">Submitted</span>
          )}
          <button 
            type="button" 
            className="chat-reset-button" 
            onClick={handleResetForm}
            title={hasSubmitted ? "Submit another form" : "Clear all entered data and start over"}
          >
            {hasSubmitted ? 'Submit Another Form' : 'Reset Form'}
          </button>
        </div>
      </div>

      <style>{`
        .text-to-speech-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 0.4rem 0.8rem;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
          box-shadow: 0 2px 6px rgba(102, 126, 234, 0.4);
          white-space: nowrap;
        }

        .text-to-speech-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 3px 10px rgba(102, 126, 234, 0.6);
        }

        .text-to-speech-button:active {
          transform: translateY(0);
        }

        .text-to-speech-button.tts-disabled {
          background: linear-gradient(135deg, #a0a0a0 0%, #808080 100%);
          box-shadow: 0 2px 6px rgba(128, 128, 128, 0.4);
        }

        .text-to-speech-button.tts-disabled:hover {
          box-shadow: 0 3px 10px rgba(128, 128, 128, 0.6);
        }

        .tts-control-button {
          background: #f0f0f0;
          border: 1px solid #d0d0d0;
          padding: 0.3rem 0.6rem;
          border-radius: 4px;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
        }

        .tts-control-button:hover:not(:disabled) {
          background: #e0e0e0;
          transform: translateY(-1px);
        }

        .tts-control-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .tts-control-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .speech-rate-display {
          font-size: 0.75rem;
          font-weight: 600;
          color: #667eea;
          min-width: 35px;
          text-align: center;
          padding: 0.2rem 0.4rem;
          background: #f8f9ff;
          border-radius: 4px;
        }
      `}</style>
    </section>
  );
}

export default SchemeAssist;
