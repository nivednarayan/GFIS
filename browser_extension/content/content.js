const FIELD_CONFIG = {
  fatherName: ["father name", "guardian name", "husband name"],
  name: ["full name", "fullname", "applicant name", "beneficiary name", "candidate name"],
  age: ["age", "applicant age", "years"],
  address: ["address", "residential address", "home address", "current address", "addr"],
  email: ["email", "email address", "mail", "email id"],
  mobile: ["mobile", "phone", "contact", "mobile number", "phone number"],
  aadhaar: ["aadhaar", "aadhar", "aadhaar number", "aadhar number", "uid"],
  dateOfBirth: ["date of birth", "dob", "birth date"],
  gender: ["gender", "sex"],
  maritalStatus: ["marital status"],
  income: ["income", "annual income", "family income"],
  occupation: ["occupation", "profession"],
  pinCode: ["pincode", "pin code", "postal code", "zip"],
  state: ["state", "state ut", "state / ut", "state name"],
  district: ["district", "district name"],
  rationCardNumber: ["ration card", "ration card number", "ration number", "rationcard"],
  familyMembers: ["family members", "number of family members", "family member count", "members in family"],
};

const FILL_PRIORITY = [
  "fatherName",
  "name",
  "aadhaar",
  "rationCardNumber",
  "mobile",
  "email",
  "dateOfBirth",
  "age",
  "gender",
  "maritalStatus",
  "occupation",
  "address",
  "district",
  "state",
  "pinCode",
  "income",
  "familyMembers",
];

const BLOCKED_INPUT_TYPES = new Set([
  "hidden",
  "password",
  "file",
  "submit",
  "button",
  "image",
  "checkbox",
  "radio",
  "captcha",
  "otp",
]);

const APPLICATION_ID_STORAGE_KEY = "gfisActiveApplicationId";
const LAST_VOICE_PAYLOAD_STORAGE_KEY = "gfisLastVoicePayload";

function getExtensionApi() {
  try {
    return globalThis.chrome || null;
  } catch {
    return null;
  }
}

function getExtensionStorage() {
  try {
    return getExtensionApi()?.storage?.local || null;
  } catch {
    return null;
  }
}

function isContextInvalidatedError(error) {
  return String(error?.message || error || "").toLowerCase().includes("context invalidated");
}

function safeStorageSet(payload) {
  const storage = getExtensionStorage();
  if (!storage?.set) return false;

  try {
    storage.set(payload);
    return true;
  } catch (error) {
    if (!isContextInvalidatedError(error)) {
      console.warn("[GFIS content] storage.set skipped:", error);
    }
    return false;
  }
}

function isValidApplicationId(value) {
  if (!value) return false;
  const text = String(value).trim();
  return /^[a-f0-9-]{32,36}$/i.test(text) || /^APP-[A-Z0-9-]+$/i.test(text);
}

function getApplicationIdFromPage() {
  const domNode = document.getElementById("gfis-current-application-id");
  const domId = domNode?.getAttribute("data-gfis-application-id") || domNode?.textContent || "";
  if (isValidApplicationId(domId)) return String(domId).trim();

  try {
    const localId = window.localStorage.getItem("GFIS_ACTIVE_APPLICATION_ID");
    if (isValidApplicationId(localId)) return String(localId).trim();
  } catch {
    
  }

  return "";
}

function persistCapturedApplicationId(applicationId) {
  if (!applicationId || !isValidApplicationId(applicationId)) return;
  safeStorageSet({
    [APPLICATION_ID_STORAGE_KEY]: applicationId,
    gfisCapturedAt: Date.now(),
    gfisCapturedFrom: window.location.href,
  });
}

function captureAndPersistApplicationId() {
  const appId = getApplicationIdFromPage();
  if (appId) {
    persistCapturedApplicationId(appId);
  }
}

function captureLatestVoicePayloadFromPage() {
  try {
    const raw = window.localStorage.getItem("GFIS_LAST_VOICE_PAYLOAD");
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return;

    const extractedFields = parsed.extractedFields;
    if (!extractedFields || typeof extractedFields !== "object") return;

    const hasAnyField = Object.keys(extractedFields).length > 0;
    if (!hasAnyField) return;

    safeStorageSet({
      [LAST_VOICE_PAYLOAD_STORAGE_KEY]: parsed,
      gfisLastVoiceCapturedAt: Date.now(),
    });

    if (isValidApplicationId(parsed.applicationId)) {
      persistCapturedApplicationId(parsed.applicationId);
    }
  } catch {
    
  }
}

function getLatestPayloadFromPage() {
  try {
    const raw = window.localStorage.getItem("GFIS_LAST_VOICE_PAYLOAD");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getAssociatedLabelText(element) {
  if (!element) return "";

  if (element.id) {
    const label = element.ownerDocument.querySelector(`label[for="${element.id}"]`);
    if (label) return label.textContent || "";
  }

  const wrappingLabel = element.closest("label");
  if (wrappingLabel) return wrappingLabel.textContent || "";

  return "";
}

function getCandidateText(element) {
  const text = [
    element.name,
    element.id,
    element.getAttribute("placeholder"),
    element.getAttribute("aria-label"),
    getAssociatedLabelText(element),
  ]
    .filter(Boolean)
    .join(" ");

  return normalize(text);
}

function matchesAlias(candidate, alias) {
  const normalizedAlias = normalize(alias);
  if (!normalizedAlias) return false;

  const candidateTokens = ` ${candidate} `;
  const aliasTokens = ` ${normalizedAlias} `;
  return candidateTokens.includes(aliasTokens);
}

function splitKeyToWords(key) {
  return normalize(
    String(key || "")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " "),
  );
}

function getAliasesForKey(key) {
  const fromConfig = FIELD_CONFIG[key] || [];
  const aliases = new Set(fromConfig.map((item) => normalize(item)));
  return Array.from(aliases).filter(Boolean);
}

function shouldSkipKeyForCandidate(key, candidate) {
  if (key === "name") {
    if (
      candidate.includes("father") ||
      candidate.includes("guardian") ||
      candidate.includes("husband") ||
      candidate.includes("mother") ||
      candidate.includes("district") ||
      candidate.includes("scheme") ||
      candidate.includes("state") ||
      candidate.includes("pin") ||
      candidate.includes("address") ||
      candidate.includes("income") ||
      candidate.includes("occupation") ||
      candidate.includes("aadhaar") ||
      candidate.includes("aadhar") ||
      candidate.includes("dob") ||
      candidate.includes("date of birth") ||
      candidate.includes("mobile") ||
      candidate.includes("phone") ||
      candidate.includes("email") ||
      candidate.includes("gender") ||
      candidate.includes("marital") ||
      candidate.includes("age")
    ) {
      return true;
    }
  }

  if (key === "district" && candidate.includes("address")) {
    return true;
  }

  return false;
}

function isFillableElement(element) {
  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) {
    return false;
  }

  if (element instanceof HTMLInputElement && BLOCKED_INPUT_TYPES.has(normalize(element.type))) {
    return false;
  }

  if (element.disabled || element.readOnly) {
    return false;
  }

  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden" && element.offsetParent !== null;
}

function setNativeValue(element, value) {
  const newValue = String(value);

  if (element instanceof HTMLSelectElement) {
    const target = normalize(newValue);
    const options = Array.from(element.options || []);
    const exact = options.find((opt) => normalize(opt.value) === target || normalize(opt.textContent) === target);
    const partial = options.find((opt) => normalize(opt.value).includes(target) || normalize(opt.textContent).includes(target));
    const chosen = exact || partial;
    if (chosen) {
      element.value = chosen.value;
    }
  } else {
    const prototype = element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    if (descriptor && descriptor.set) {
      descriptor.set.call(element, newValue);
    } else {
      element.value = newValue;
    }
  }

  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  element.dispatchEvent(new Event("blur", { bubbles: true }));
  element.style.border = "2px solid #16a34a";
}

function getSearchDocuments() {
  const docs = [document];
  const iframes = document.querySelectorAll("iframe");
  iframes.forEach((frame) => {
    try {
      if (frame.contentDocument) {
        docs.push(frame.contentDocument);
      }
    } catch {
      
    }
  });
  return docs;
}

function fillPass(data, alreadyFilled) {
  let filledCount = 0;
  let matchedCount = 0;
  const foundKeys = [];

  const keysToFill = FILL_PRIORITY.filter(
    (key) => FIELD_CONFIG[key] && data[key] !== undefined && data[key] !== null && data[key] !== "",
  );
  const docs = getSearchDocuments();

  keysToFill.forEach((key) => {
    const aliases = getAliasesForKey(key);
    if (!aliases.length) return;

    let keyMatched = false;

    docs.forEach((doc) => {
      const elements = Array.from(doc.querySelectorAll("input, textarea, select"));
      elements.forEach((element) => {
        if (!isFillableElement(element)) return;
        const candidate = getCandidateText(element);
        if (shouldSkipKeyForCandidate(key, candidate)) return;

        const isMatch = aliases.some((alias) => matchesAlias(candidate, alias));
        if (!isMatch) return;

        keyMatched = true;
        matchedCount += 1;

        if (alreadyFilled.has(element)) return;
        setNativeValue(element, data[key]);
        alreadyFilled.add(element);
        filledCount += 1;
      });
    });

    if (keyMatched) {
      foundKeys.push(key);
    }
  });

  return { filledCount, matchedCount, foundKeys };
}

async function fillWithRetries(data) {
  const alreadyFilled = new WeakSet();
  let totalFilled = 0;
  let totalMatched = 0;
  let foundKeys = new Set();

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const pass = fillPass(data, alreadyFilled);
    totalFilled += pass.filledCount;
    totalMatched += pass.matchedCount;
    pass.foundKeys.forEach((k) => foundKeys.add(k));

    if (totalFilled > 0 || attempt === 3) break;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  return {
    filledCount: totalFilled,
    matchedCount: totalMatched,
    foundKeys: Array.from(foundKeys),
  };
}

try {
  const extensionApi = getExtensionApi();
  if (extensionApi?.runtime?.onMessage?.addListener) {
    extensionApi.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === "GET_GFIS_CONTEXT_APPLICATION_ID") {
        const applicationId = getApplicationIdFromPage();
        if (applicationId) {
          persistCapturedApplicationId(applicationId);
        }

        sendResponse({ applicationId: applicationId || null });
        return true;
      }

      if (message?.type === "GET_GFIS_CONTEXT_PAYLOAD") {
        sendResponse({ payload: getLatestPayloadFromPage() });
        return true;
      }

      if (!message || message.type !== "FILL_FORM") return;

      fillWithRetries(message.payload || {})
        .then((result) => {
          if (result.filledCount > 0) {
            alert(`GFIS: Filled ${result.filledCount} field(s). Please review and submit manually.`);
          } else {
            alert("GFIS could not find matching fields on this page.");
          }
          sendResponse(result);
        })
        .catch(() => {
          alert("GFIS could not complete autofill on this page.");
          sendResponse({ filledCount: 0, matchedCount: 0, foundKeys: [] });
        });

      return true;
    });
  }
} catch (error) {
  if (!isContextInvalidatedError(error)) {
    console.warn("[GFIS content] runtime listener skipped:", error);
  }
}

function safeCaptureSync() {
  try {
    captureAndPersistApplicationId();
    captureLatestVoicePayloadFromPage();
  } catch (error) {
    if (!isContextInvalidatedError(error)) {
      console.warn("[GFIS content] capture skipped:", error);
    }
  }
}

safeCaptureSync();

const observer = new MutationObserver(() => {
  safeCaptureSync();
});

try {
  observer.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
} catch (error) {
  if (!isContextInvalidatedError(error)) {
    console.warn("[GFIS content] observer skipped:", error);
  }
}

setInterval(() => {
  safeCaptureSync();
}, 3000);