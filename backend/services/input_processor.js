// backend/services/inputProcessor.js

const UserInput = require("../models/user_input");
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

  return new UserInput({
    rawText,
    name,
    age,
    scheme,
    intent
  });
}

module.exports = { interpretInput };