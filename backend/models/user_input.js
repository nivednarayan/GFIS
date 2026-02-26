// backend/models/userInput.js

class UserInput {
  constructor({ rawText, name, age, scheme, intent, address }) {
    this.rawText = rawText || "";
    this.name = name || null;
    this.age = age || null;
    this.scheme = scheme || null;
    this.intent = intent || "APPLY";
    this.address = address || null;
  }
}

module.exports = UserInput;