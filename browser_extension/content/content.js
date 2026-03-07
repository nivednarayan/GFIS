// content/content.js

const FIELD_CONFIG = {
  name: ["name", "full name", "fullname", "applicant name", "beneficiary name"],
  age: ["age", "applicant age", "years"],
  address: ["address", "residential address", "home address", "addr"],
  email: ["email", "email address", "mail"],
  mobile: ["mobile", "phone", "contact", "mobile number", "phone number"]
};

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
  "otp"
]);

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
    getAssociatedLabelText(element)
  ]
    .filter(Boolean)
    .join(" ");

  return normalize(text);
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
      // Cross-origin iframe access is intentionally skipped.
    }
  });
  return docs;
}

function fillPass(data, alreadyFilled) {
  let filledCount = 0;
  let matchedCount = 0;
  const foundKeys = [];

  const keysToFill = Object.keys(FIELD_CONFIG).filter((key) => data[key] !== undefined && data[key] !== null && data[key] !== "");
  const docs = getSearchDocuments();

  keysToFill.forEach((key) => {
    const aliases = FIELD_CONFIG[key];
    let keyMatched = false;

    docs.forEach((doc) => {
      const elements = Array.from(doc.querySelectorAll("input, textarea, select"));
      elements.forEach((element) => {
        if (!isFillableElement(element)) return;
        const candidate = getCandidateText(element);
        const isMatch = aliases.some((alias) => candidate.includes(normalize(alias)));

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
    foundKeys: Array.from(foundKeys)
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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