const fillFormBtn = document.getElementById("fillFormBtn");
const statusEl = document.getElementById("status");
const API_BASE_URL = "http://localhost:5000/api";
const APPLICATION_ID_STORAGE_KEY = "gfisActiveApplicationId";
const LAST_VOICE_PAYLOAD_STORAGE_KEY = "gfisLastVoicePayload";
const MAX_VOICE_PAYLOAD_AGE_MS = 15 * 60 * 1000;

function setStatus(message) {
  if (!statusEl) {
    console.warn("[GFIS popup] status element not found:", message);
    return;
  }
  statusEl.textContent = message;
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

function sendFillMessage(tabId, payload) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(
      tabId,
      { type: "FILL_FORM_USING_GFIS", payload },
      (reply) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(reply || { filledCount: 0 });
      }
    );
  });
}

function sendContextMessage(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(
      tabId,
      { type: "GET_GFIS_CONTEXT_APPLICATION_ID" },
      (reply) => {
        if (chrome.runtime.lastError) {
          resolve({ applicationId: null });
          return;
        }
        resolve(reply || { applicationId: null });
      },
    );
  });
}

function sendContextPayloadMessage(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(
      tabId,
      { type: "GET_GFIS_CONTEXT_PAYLOAD" },
      (reply) => {
        if (chrome.runtime.lastError) {
          resolve({ payload: null });
          return;
        }
        resolve(reply || { payload: null });
      },
    );
  });
}

function getCapturedAtMs(payload) {
  const capturedAt = payload?.capturedAt;
  if (!capturedAt) return 0;
  const parsed = new Date(capturedAt).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

async function getMostRecentContextPayloadFromTabs() {
  let tabs = [];
  try {
    tabs = await chrome.tabs.query({ currentWindow: true });
  } catch {
    return null;
  }

  let bestPayload = null;
  let bestTime = 0;

  for (const tab of tabs) {
    if (!tab?.id) continue;

    const reply = await sendContextPayloadMessage(tab.id);
    const payload = reply?.payload;
    if (!payload || typeof payload !== "object") continue;

    const normalized = normalizeVoicePayload(payload);
    if (Object.keys(normalized).length === 0) continue;

    const capturedAtMs = getCapturedAtMs(payload);
    if (!bestPayload || capturedAtMs >= bestTime) {
      bestPayload = payload;
      bestTime = capturedAtMs;
    }
  }

  return bestPayload;
}

function toText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function firstDefined(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && toText(value) !== "") {
      return value;
    }
  }
  return undefined;
}

function normalizeVoicePayload(rawPayload) {
  const extracted =
    rawPayload?.extractedFields ||
    rawPayload?.data?.extractedFields ||
    rawPayload?.extractedData ||
    rawPayload?.data?.extractedData ||
    rawPayload?.payload?.extractedFields ||
    rawPayload ||
    {};

  const normalized = {
    name: firstDefined(extracted, ["name", "fullName", "applicantName", "beneficiaryName"]),
    age: firstDefined(extracted, ["age", "applicantAge"]),
    gender: firstDefined(extracted, ["gender", "sex"]),
    address: firstDefined(extracted, ["address", "fullAddress", "residentialAddress", "currentAddress"]),
    email: firstDefined(extracted, ["email", "emailId", "mail"]),
    mobile: firstDefined(extracted, ["mobile", "mobileNumber", "phone", "phoneNumber", "contactNumber"]),
    aadhaar: firstDefined(extracted, ["aadhaar", "aadhaarNumber", "aadhar", "aadharNumber", "uid"]),
    dateOfBirth: firstDefined(extracted, ["dateOfBirth", "dob", "birthDate"]),
    fatherName: firstDefined(extracted, ["fatherName", "guardianName", "husbandName"]),
    maritalStatus: firstDefined(extracted, ["maritalStatus"]),
    income: firstDefined(extracted, ["income", "annualIncome"]),
    occupation: firstDefined(extracted, ["occupation"]),
    pinCode: firstDefined(extracted, ["pinCode", "pincode", "postalCode"]),
    state: firstDefined(extracted, ["state", "stateUT"]),
    district: firstDefined(extracted, ["district"]),
    rationCardNumber: firstDefined(extracted, ["rationCardNumber", "rationCard", "rationNumber", "ration_card_number"]),
    familyMembers: firstDefined(extracted, ["familyMembers", "numberOfFamilyMembers", "familyMemberCount", "membersInFamily"]),
  };

  return Object.fromEntries(
    Object.entries(normalized).filter(([, value]) => value !== undefined && value !== null && toText(value) !== ""),
  );
}

async function getStoredLatestVoicePayload() {
  const stored = await chrome.storage.local.get([LAST_VOICE_PAYLOAD_STORAGE_KEY]);
  const payload = stored?.[LAST_VOICE_PAYLOAD_STORAGE_KEY];
  if (!payload || typeof payload !== "object") return null;

  const capturedAtMs = payload?.capturedAt ? new Date(payload.capturedAt).getTime() : NaN;
  if (!Number.isNaN(capturedAtMs) && Date.now() - capturedAtMs > MAX_VOICE_PAYLOAD_AGE_MS) {
    return null;
  }

  return payload;
}

async function getStoredApplicationId() {
  const stored = await chrome.storage.local.get([APPLICATION_ID_STORAGE_KEY]);
  const applicationId = toText(stored?.[APPLICATION_ID_STORAGE_KEY]);
  return applicationId || "";
}

async function saveApplicationId(applicationId) {
  const text = toText(applicationId);
  if (!text) return;
  await chrome.storage.local.set({ [APPLICATION_ID_STORAGE_KEY]: text });
}

async function fetchVoiceJsonByApplicationId(applicationId) {
  if (!applicationId) {
    throw new Error("applicationId not available yet");
  }

  const response = await fetch(
    `${API_BASE_URL}/audio-result?applicationId=${encodeURIComponent(applicationId)}&districtId=district-001`,
  );

  if (!response.ok) {
    throw new Error(`Voice result request failed: ${response.status}`);
  }

  const data = await response.json();
  if (!data?.success) {
    throw new Error(data?.message || data?.error || "Voice result fetch failed");
  }

  if (data.processingStatus !== "ANALYZED") {
    throw new Error("Voice JSON not ready yet. Record audio and wait for analysis to complete.");
  }

  return normalizeVoicePayload(data);
}

async function resolveVoicePayload() {
  const tab = await getActiveTab();

  const storedPayload = await getStoredLatestVoicePayload();
  if (storedPayload) {
    const normalizedStored = normalizeVoicePayload(storedPayload);
    if (Object.keys(normalizedStored).length > 0) {
      if (storedPayload?.applicationId) {
        await saveApplicationId(storedPayload.applicationId);
      }
      return normalizedStored;
    }
  }

  if (tab?.id) {
    const contextReply = await sendContextPayloadMessage(tab.id);
    const normalizedContext = normalizeVoicePayload(contextReply?.payload || {});
    if (Object.keys(normalizedContext).length > 0) {
      if (contextReply?.payload?.applicationId) {
        await saveApplicationId(contextReply.payload.applicationId);
      }
      return normalizedContext;
    }
  }

  const recentTabPayload = await getMostRecentContextPayloadFromTabs();
  const normalizedRecentTabPayload = normalizeVoicePayload(recentTabPayload || {});
  if (Object.keys(normalizedRecentTabPayload).length > 0) {
    if (recentTabPayload?.applicationId) {
      await saveApplicationId(recentTabPayload.applicationId);
    }
    return normalizedRecentTabPayload;
  }

  let applicationId = await getStoredApplicationId();

  if (!applicationId) {
    if (tab?.id) {
      const reply = await sendContextMessage(tab.id);
      applicationId = toText(reply?.applicationId);
      if (applicationId) {
        await saveApplicationId(applicationId);
      }
    }
  }

  if (applicationId) {
    try {
      const byId = await fetchVoiceJsonByApplicationId(applicationId);
      if (Object.keys(byId).length > 0) {
        return byId;
      }
    } catch (error) {
      const message = String(error?.message || "").toLowerCase();
      if (!message.includes("not ready")) {
        throw error;
      }
    }
  }

  throw new Error("No latest text/voice payload available yet");
}

if (!fillFormBtn) {
  console.error("[GFIS popup] fillFormBtn not found in popup DOM");
} else {
fillFormBtn.addEventListener("click", async () => {
  fillFormBtn.disabled = true;
  setStatus("Fetching latest text/voice data automatically...");

  try {
    const extractedData = await resolveVoicePayload();

    if (!extractedData || Object.keys(extractedData).length === 0) {
      throw new Error("No usable text/voice fields available yet");
    }

    const tab = await getActiveTab();
    if (!tab?.id) {
      throw new Error("No active tab found");
    }

    try {
      const reply = await sendFillMessage(tab.id, extractedData);
      if (reply?.filledCount > 0) {
        const keys = Array.isArray(reply?.foundKeys) && reply.foundKeys.length
          ? ` Keys: ${reply.foundKeys.join(", ")}.`
          : "";
        setStatus(`Filled ${reply.filledCount} field(s), matched ${reply?.matchedCount || 0}.${keys}`);
      } else {
        setStatus("GFIS could not find matching fields on this page.");
      }
    } catch {
      if (!tab.url || /^chrome:\/\//.test(tab.url) || /^chrome-extension:\/\//.test(tab.url)) {
        setStatus("Open a regular website form tab, then try again.");
        return;
      }

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content/content.js"]
      });

      const reply = await sendFillMessage(tab.id, extractedData);
      if (reply?.filledCount > 0) {
        const keys = Array.isArray(reply?.foundKeys) && reply.foundKeys.length
          ? ` Keys: ${reply.foundKeys.join(", ")}.`
          : "";
        setStatus(`Filled ${reply.filledCount} field(s), matched ${reply?.matchedCount || 0}.${keys}`);
      } else {
        setStatus("GFIS could not find matching fields on this page.");
      }
    }
  } catch (error) {
    console.error("GFIS popup error:", error);
    setStatus("No latest text/voice data ready yet. Enter text or record voice in Scheme Assist, then try again.");
  } finally {
    fillFormBtn.disabled = false;
  }
});
}
