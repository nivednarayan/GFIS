// PDF Form Filling Routes
const express = require('express');
const router = express.Router();
const { fillPdfForm, fillInteractivePdfForm } = require('../services/pdfFormFiller');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads (PDF templates)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

/**
 * POST /api/pdf/fill
 * Fills a PDF form with provided user data
 * 
 * Request body:
 * {
 *   "userData": {
 *     "name": "Raju Kumar",
 *     "age": 62,
 *     "aadharNumber": "123412341234",
 *     ...
 *   },
 *   "scheme": "pension" // optional, defaults to "pension"
 * }
 * 
 * Can also accept a PDF template via multipart/form-data
 */
router.post('/fill', upload.single('template'), async (req, res) => {
  try {
    const userData = req.body.userData ? JSON.parse(req.body.userData) : req.body;
    const scheme = req.body.scheme || 'pension';
    const templateBuffer = req.file ? req.file.buffer : null;

    if (!userData || Object.keys(userData).length === 0) {
      return res.status(400).json({
        error: 'User data is required',
        example: {
          userData: {
            name: 'John Doe',
            age: 65,
            aadharNumber: '123456789012',
            phone: '9876543210',
            email: 'john@example.com',
            address: '123 Main St, City'
          },
          scheme: 'pension'
        }
      });
    }

    // Fill the PDF form
    const filledPdfBytes = await fillPdfForm(userData, scheme, templateBuffer);

    // Set response headers for PDF download
    const filename = `${scheme}_application_form_${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', filledPdfBytes.length);

    // Send the PDF
    res.send(Buffer.from(filledPdfBytes));
  } catch (error) {
    console.error('Error in PDF fill route:', error);
    res.status(500).json({
      error: 'Failed to fill PDF form',
      message: error.message
    });
  }
});

/**
 * POST /api/pdf/fill-interactive
 * Fills an interactive PDF form (with form fields) with provided user data
 * 
 * Request must be multipart/form-data with:
 * - template: PDF file with form fields
 * - userData: JSON string with user data
 * - fieldMapping: JSON string mapping user data keys to PDF field names
 */
router.post('/fill-interactive', upload.single('template'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'PDF template file is required for interactive form filling'
      });
    }

    const userData = req.body.userData ? JSON.parse(req.body.userData) : {};
    const fieldMapping = req.body.fieldMapping ? JSON.parse(req.body.fieldMapping) : {};

    if (Object.keys(userData).length === 0) {
      return res.status(400).json({
        error: 'User data is required'
      });
    }

    if (Object.keys(fieldMapping).length === 0) {
      return res.status(400).json({
        error: 'Field mapping is required (maps userData keys to PDF field names)'
      });
    }

    const filledPdfBytes = await fillInteractivePdfForm(
      req.file.buffer,
      fieldMapping,
      userData
    );

    // Set response headers for PDF download
    const filename = `filled_form_${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', filledPdfBytes.length);

    res.send(Buffer.from(filledPdfBytes));
  } catch (error) {
    console.error('Error in interactive PDF fill route:', error);
    res.status(500).json({
      error: 'Failed to fill interactive PDF form',
      message: error.message
    });
  }
});

/**
 * POST /api/pdf/preview
 * Same as /fill but returns the PDF for preview instead of download
 */
router.post('/preview', upload.single('template'), async (req, res) => {
  try {
    const userData = req.body.userData ? JSON.parse(req.body.userData) : req.body;
    const scheme = req.body.scheme || 'pension';
    const templateBuffer = req.file ? req.file.buffer : null;

    if (!userData || Object.keys(userData).length === 0) {
      return res.status(400).json({
        error: 'User data is required'
      });
    }

    const filledPdfBytes = await fillPdfForm(userData, scheme, templateBuffer);

    // Set response headers for inline display
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Content-Length', filledPdfBytes.length);

    res.send(Buffer.from(filledPdfBytes));
  } catch (error) {
    console.error('Error in PDF preview route:', error);
    res.status(500).json({
      error: 'Failed to preview PDF form',
      message: error.message
    });
  }
});

/**
 * GET /api/pdf/test
 * Test endpoint to download a blank pension form
 */
router.get('/test', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const templatePath = path.join(__dirname, '..', 'APPLICATION FORMAT.pdf');
    const pdfBytes = await fs.readFile(templatePath);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="APPLICATION_FORMAT_template.pdf"');
    res.setHeader('Content-Length', pdfBytes.length);

    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('Error in PDF test route:', error);
    res.status(500).json({
      error: 'Failed to create test PDF',
      message: error.message
    });
  }
});

module.exports = router;
