const express = require('express');
const router = express.Router();
const geminiExtractor = require('../services/geminiExtractor');
const patternExtractor = require('../services/patternExtractor');
const validateFields = require('../validation/validateFields');
const findMissingFields = require('../utils/findMissingFields');

/**
 * POST /api/extract/:scheme
 * Extract user data from free text for a specific government scheme
 */
router.post('/:scheme', async (req, res) => {
  try {
    const { scheme } = req.params;
    const { introText } = req.body;

    // Validate input
    if (!introText || typeof introText !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid introText in request body'
      });
    }

    // Load scheme schema dynamically
    let schemaModule;
    try {
      schemaModule = require(`../schemas/${scheme}Schema`);
    } catch (err) {
      return res.status(404).json({
        error: `Scheme "${scheme}" not found`,
        availableSchemes: ['ayushman', 'pmkisan', 'pension']
      });
    }

    const requiredFields = schemaModule.requiredFields || [];
    let extractedData = {};
    let extractionSource = 'none';

    // Step 1: Try Gemini extraction
    try {
      console.log(`Attempting Gemini extraction for scheme: ${scheme}`);
      extractedData = await geminiExtractor.extract(introText, requiredFields);
      
      if (Object.keys(extractedData).length > 0) {
        extractionSource = 'gemini';
        console.log(`✅ Gemini extracted ${Object.keys(extractedData).length} fields`);
      }
    } catch (geminiError) {
      console.warn(`⚠️ Gemini extraction failed:`, geminiError.message);
      
      // Step 2: Fallback to pattern extraction
      console.log('Falling back to pattern-based extraction...');
      extractedData = patternExtractor.extract(introText, requiredFields);
      
      if (Object.keys(extractedData).length > 0) {
        extractionSource = 'pattern-fallback';
        console.log(`✅ Pattern extractor found ${Object.keys(extractedData).length} fields`);
      }
    }

    // Step 3: Validate extracted fields
    const validatedData = validateFields(extractedData, requiredFields);
    
    // Step 4: Find missing required fields
    const missingFields = findMissingFields(validatedData, requiredFields);

    // Step 5: Return response
    res.json({
      scheme,
      source: extractionSource,
      extracted: validatedData,
      missingFields,
      totalRequired: requiredFields.length,
      extractedCount: Object.keys(validatedData).length,
      completeness: `${Math.round((Object.keys(validatedData).length / requiredFields.length) * 100)}%`
    });

  } catch (error) {
    console.error('Extraction route error:', error);
    res.status(500).json({
      error: 'Extraction failed',
      message: error.message
    });
  }
});

module.exports = router;
