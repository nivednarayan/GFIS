// popup/popup.js
const fillFormBtn = document.getElementById("fillFormBtn");
const statusEl = document.getElementById("status");

function setStatus(message) {
  statusEl.textContent = message;
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

function sendFillMessage(tabId, payload) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { type: "FILL_FORM", payload }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response || { filledCount: 0, matchedCount: 0, foundKeys: [] });
    });
  });
}

fillFormBtn.addEventListener("click", async () => {
  fillFormBtn.disabled = true;
  setStatus("Fetching data from GFIS...");

  try {
    const res = await fetch("http://localhost:5000/api/input/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText: "my name is ramesh age 65 old age pension apply" })
    });

    if (!res.ok) {
      throw new Error(`Backend error: ${res.status}`);
    }

    const data = await res.json();
    const payload = data?.extractedData || {};

    const tab = await getActiveTab();
    if (!tab?.id) {
      throw new Error("No active tab found");
    }

    let result;
    try {
      result = await sendFillMessage(tab.id, payload);
    } catch {
      if (!tab.url || /^chrome:\/\//.test(tab.url) || /^chrome-extension:\/\//.test(tab.url)) {
        setStatus("Open a normal website form tab and try again.");
        return;
      }

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content/content.js"]
      });
      result = await sendFillMessage(tab.id, payload);
    }

    if (result.filledCount > 0) {
      setStatus(`Filled ${result.filledCount} fields (matched ${result.matchedCount}).`);
    } else {
      setStatus("GFIS could not find matching fields on this page.");
    }
  } catch (err) {
    console.error(err);
    setStatus("Backend not reachable or request failed.");
  } finally {
    fillFormBtn.disabled = false;
  }
});