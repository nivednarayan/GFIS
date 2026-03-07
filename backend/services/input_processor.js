// backend/services/inputProcessor.js

const { cleanText } = require("../utils/text_cleaner");
const {
  extractName,
  extractAge,
  extractScheme,
  extractIntent
} = require("../utils/field_mapper");

function interpretInput(rawText) {
  const cleanedText = cleanText(rawText);

  const name = extractName(cleanedText);
  const age = extractAge(cleanedText);
  const scheme = extractScheme(cleanedText);
  const intent = extractIntent(cleanedText);

  return {
    rawText,
    name,
    age,
    scheme,
    intent,
  };
}

module.exports = { interpretInput };