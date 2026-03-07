const express = require("express");
const router = express.Router();
const { interpretInput } = require("../services/input_processor");
const { validate_application } = require("../services/validation_engine");
const { generate_explanations } = require("../services/rejection_explainer");
const { apply_confidence_score } = require("../services/confidence_score");
const { extractIntroFailProof } = require("../services/intro_extractor_failproof");

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

router.post("/extract-intro", async (req, res) => {
  try {
    const { introText, requiredFields } = req.body || {};

    if (!introText || typeof introText !== "string") {
      return res.status(400).json({
        success: false,
        message: "introText is required",
      });
    }

    const safeFields = Array.isArray(requiredFields)
      ? requiredFields.filter((field) => field && field.name)
      : [];

    const result = await extractIntroFailProof({
      introText,
      requiredFields: safeFields,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to extract intro",
      error: error.message,
    });
  }
});

module.exports = router;
