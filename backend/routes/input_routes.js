const express = require("express");
const router = express.Router();
const { extractIntroFailProof } = require("../services/intro_extractor_failproof");

router.post("/input/extract-intro", async (req, res) => {
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
