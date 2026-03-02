const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

// Utility function to load scheme JSON
const loadScheme = (schemeId) => {
  try {
    const schemeFile = path.join(__dirname, `../schemas/${schemeId}.json`);
    const data = fs.readFileSync(schemeFile, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading scheme ${schemeId}:`, error);
    return null;
  }
};

// Utility function to load all schemes master list
const loadAllSchemes = () => {
  try {
    const masterFile = path.join(__dirname, "../schemas/masterScheme.json");
    const data = fs.readFileSync(masterFile, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading master schemes:", error);
    return [];
  }
};

// GET /api/schemes - Get all available schemes
router.get("/schemes", (req, res) => {
  try {
    const schemes = loadAllSchemes();
    res.json({
      success: true,
      data: schemes,
      count: schemes.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching schemes",
      error: error.message,
    });
  }
});

// GET /api/schemes/:schemeId - Get specific scheme with all fields
router.get("/schemes/:schemeId", (req, res) => {
  try {
    const { schemeId } = req.params;
    const scheme = loadScheme(schemeId);

    if (!scheme) {
      return res.status(404).json({
        success: false,
        message: `Scheme ${schemeId} not found`,
      });
    }

    res.json({
      success: true,
      data: scheme,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching scheme",
      error: error.message,
    });
  }
});

// GET /api/schemes/:schemeId/fields - Get only fields for a scheme
router.get("/schemes/:schemeId/fields", (req, res) => {
  try {
    const { schemeId } = req.params;
    const scheme = loadScheme(schemeId);

    if (!scheme) {
      return res.status(404).json({
        success: false,
        message: `Scheme ${schemeId} not found`,
      });
    }

    res.json({
      success: true,
      schemeId: scheme.schemeId,
      schemeName: scheme.schemeName,
      fields: scheme.fields || [],
      requiredDocuments: scheme.requiredDocuments || [],
      eligibilityRules: scheme.eligibilityRules || {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching scheme fields",
      error: error.message,
    });
  }
});

module.exports = router;
