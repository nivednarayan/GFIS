function fillVisibleField(selectors, value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  let count = 0;
  const nodes = document.querySelectorAll(selectors.join(","));

  nodes.forEach((field) => {
    if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) {
      return;
    }

    const style = window.getComputedStyle(field);
    const isVisible = style.display !== "none" && style.visibility !== "hidden" && field.offsetParent !== null;
    const isEditable = !field.disabled && !field.readOnly;

    if (!isVisible || !isEditable) {
      return;
    }

    field.value = String(value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
    field.style.border = "2px solid #16a34a";
    count += 1;
  });

  return count;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "FILL_FORM_USING_GFIS") {
    return;
  }

  const data = message.payload || {};
  let filledCount = 0;

  filledCount += fillVisibleField(["input[name='name']", "input[id*='name' i]", "textarea[name='name']"], data.name);
  filledCount += fillVisibleField(["input[name='age']", "input[id*='age' i]"], data.age);
  filledCount += fillVisibleField(["input[name='address']", "input[id*='address' i]", "textarea[name='address']", "textarea[id*='address' i]"], data.address);

  if (filledCount > 0) {
    alert(`GFIS filled ${filledCount} field(s). Please review and submit manually.`);
  } else {
    alert("GFIS could not find matching fields on this page.");
  }

  sendResponse({ filledCount });
  return true;
});
