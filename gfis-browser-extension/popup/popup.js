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

fillFormBtn.addEventListener("click", async () => {
  fillFormBtn.disabled = true;
  setStatus("Fetching extracted data from GFIS...");

  try {
    const response = await fetch("http://localhost:5000/api/input/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rawText: "My name is Raju and I am 62 years old and I want pension"
      })
    });

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status}`);
    }

    const result = await response.json();
    const extractedData = result?.extractedData || {};

    const tab = await getActiveTab();
    if (!tab?.id) {
      throw new Error("No active tab found");
    }

    try {
      const reply = await sendFillMessage(tab.id, extractedData);
      if (reply?.filledCount > 0) {
        setStatus(`Filled ${reply.filledCount} field(s). Please review before submit.`);
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
        setStatus(`Filled ${reply.filledCount} field(s). Please review before submit.`);
      } else {
        setStatus("GFIS could not find matching fields on this page.");
      }
    }
  } catch (error) {
    console.error("GFIS popup error:", error);
    setStatus("Backend not reachable or request failed.");
  } finally {
    fillFormBtn.disabled = false;
  }
});
