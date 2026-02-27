const express = require("express");
const router = express.Router();

const validateApplication = require("../services/validation_engine");
const calculateConfidence = require("../services/confidence_score");

router.post("/validate", (req, res) => {
  try {
    const validationResult = validateApplication(req.body);

    const confidence = calculateConfidence(
      validationResult.passedChecks,
      validationResult.totalChecks
    );

    res.json({
      ...validationResult,
      confidence
    });

  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;