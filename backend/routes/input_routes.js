const express = require("express");
const router = express.Router();
const { interpretInput } = require("../services/input_processor");
const { validate_application } = require("../services/validation_engine");
const { generate_explanations } = require("../services/rejection_explainer");
const { apply_confidence_score } = require("../services/confidence_score");

router.post("/text", (req, res) => {
  const { rawText } = req.body;

  const userInput = interpretInput(rawText);
  let validation = validate_application(userInput);
  validation = generate_explanations(validation);
  validation = apply_confidence_score(validation);

  res.json({
    transcript: rawText,
    extractedData: userInput,
    validation
  });
});

module.exports = router;