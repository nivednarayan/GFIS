// backend/utils/textCleaner.js

function cleanText(text) {
  if (!text) return "";

  return text
    .toLowerCase()
    .replace(/[^\w\s]/gi, "") // remove punctuation
    .replace(/\s+/g, " ")     // remove extra spaces
    .trim();
}

module.exports = { cleanText };