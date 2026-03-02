const express = require("express");
const router = express.Router();
const Application = require("../models/application");
const UserInput = require("../models/user_input");
const DocumentData = require("../models/document_data");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const findApplicationByIdentifier = async (identifier) => {
  const orFilters = [{ applicationId: identifier }];

  if (mongoose.Types.ObjectId.isValid(identifier)) {
    orFilters.push({ _id: identifier });
  }

  return Application.findOne({ $or: orFilters });
};

// Utility function to generate unique application ID
const generateApplicationId = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `APP-${timestamp}-${random}`;
};

// Utility function to load scheme
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

// POST /api/applications - Create a new application draft
router.post("/applications", async (req, res) => {
  try {
    const { schemeId } = req.body;

    if (!schemeId) {
      return res.status(400).json({
        success: false,
        message: "schemeId is required",
      });
    }

    const scheme = loadScheme(schemeId);
    if (!scheme) {
      return res.status(404).json({
        success: false,
        message: `Scheme ${schemeId} not found`,
      });
    }

    const applicationId = generateApplicationId();

    const application = new Application({
      applicationId,
      schemeId,
      schemeName: scheme.schemeName,
      status: "draft",
      collectedAnswers: {},
      userInputs: [],
    });

    await application.save();

    res.status(201).json({
      success: true,
      message: "Application created successfully",
      data: {
        applicationId: application.applicationId,
        mongoId: application._id,
        applicationRefId: application.applicationId,
        schemeId: application.schemeId,
        schemeName: application.schemeName,
        status: application.status,
      },
    });
  } catch (error) {
    console.error("Error creating application:", error);
    res.status(500).json({
      success: false,
      message: "Error creating application",
      error: error.message,
    });
  }
});

// POST /api/applications/:applicationId/save-answer - Save individual answer
router.post("/applications/:applicationId/save-answer", async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { fieldName, fieldLabel, fieldType, answer } = req.body;

    if (!fieldName || !answer) {
      return res.status(400).json({
        success: false,
        message: "fieldName and answer are required",
      });
    }

    const application = await findApplicationByIdentifier(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    // Save to collectedAnswers (for quick retrieval)
    application.collectedAnswers[fieldName] = answer;

    // Save to userInputs (for audit trail)
    application.userInputs.push({
      fieldName,
      fieldLabel,
      fieldType,
      answer,
      answeredAt: new Date(),
    });

    await application.save();

    const now = new Date();
    const responsePath = `responses.${fieldName}`;

    await UserInput.findOneAndUpdate(
      { applicationId: application._id },
      {
        $set: {
          applicationRefId: application.applicationId,
          schemeId: application.schemeId,
          [responsePath]: answer,
          lastAnsweredAt: now,
        },
        $push: {
          responsesHistory: {
            fieldName,
            fieldLabel,
            fieldType,
            answer,
            answeredAt: now,
          },
        },
        $setOnInsert: {
          applicationId: application._id,
        },
      },
      { upsert: true, new: true }
    );

    const aggregatedInput = await UserInput.findOne({ applicationId: application._id }).lean();
    const answerCount = Object.keys(aggregatedInput?.responses || {}).length;

    await UserInput.updateOne(
      { applicationId: application._id },
      { $set: { totalAnswers: answerCount } }
    );

    res.json({
      success: true,
      message: "Answer saved successfully",
      data: {
        applicationId: application.applicationId,
        fieldName,
        answer,
      },
    });
  } catch (error) {
    console.error("Error saving answer:", error);
    res.status(500).json({
      success: false,
      message: "Error saving answer",
      error: error.message,
    });
  }
});

// POST /api/applications/:applicationId/submit - Submit complete application
router.post("/applications/:applicationId/submit", async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { collectedAnswers } = req.body;

    console.log(`[SUBMIT] Received submission for application: ${applicationId}`);
    console.log(`[SUBMIT] Collected answers:`, collectedAnswers);

    const application = await findApplicationByIdentifier(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    // Update with final answers if provided
    if (collectedAnswers) {
      application.collectedAnswers = {
        ...application.collectedAnswers,
        ...collectedAnswers,
      };

      const now = new Date();
      const responseEntries = Object.entries(collectedAnswers);

      if (responseEntries.length > 0) {
        const historyEntries = responseEntries.map(([fieldName, answer]) => ({
          fieldName,
          fieldLabel: fieldName,
          fieldType: typeof answer,
          answer,
          answeredAt: now,
        }));

        const existingUserInput = await UserInput.findOne({ applicationId: application._id }).lean();
        const mergedResponses = {
          ...(existingUserInput?.responses || {}),
          ...collectedAnswers,
        };

        await UserInput.findOneAndUpdate(
          { applicationId: application._id },
          {
            $set: {
              applicationRefId: application.applicationId,
              schemeId: application.schemeId,
              responses: mergedResponses,
              totalAnswers: Object.keys(mergedResponses).length,
              lastAnsweredAt: now,
            },
            $push: {
              responsesHistory: { $each: historyEntries },
            },
            $setOnInsert: {
              applicationId: application._id,
            },
          },
          { upsert: true, new: true }
        );

        const existingInputMap = new Map(
          (application.userInputs || []).map((item) => [item.fieldName, item])
        );

        responseEntries.forEach(([fieldName, answer]) => {
          existingInputMap.set(fieldName, {
            fieldName,
            fieldLabel: existingInputMap.get(fieldName)?.fieldLabel || fieldName,
            fieldType: typeof answer,
            answer,
            answeredAt: now,
          });
        });

        application.userInputs = Array.from(existingInputMap.values());
      }
    }

    // Mark as submitted
    application.status = "submitted";
    application.submittedAt = new Date();

    await application.save();

    console.log(`[SUBMIT] Application saved to MongoDB successfully`);
    console.log(`[SUBMIT] Application ID: ${application.applicationId}, Status: ${application.status}`);
    console.log(`[SUBMIT] Total answers saved: ${Object.keys(application.collectedAnswers).length}`);

    res.json({
      success: true,
      message: "Application submitted successfully",
      data: {
        applicationId: application.applicationId,
        schemeId: application.schemeId,
        status: application.status,
        submittedAt: application.submittedAt,
        totalAnswers: Object.keys(application.collectedAnswers).length,
      },
    });
  } catch (error) {
    console.error("Error submitting application:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting application",
      error: error.message,
    });
  }
});

// GET /api/applications/:applicationId - Retrieve application
router.get("/applications/:applicationId", async (req, res) => {
  try {
    const { applicationId } = req.params;

    const application = await findApplicationByIdentifier(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    res.json({
      success: true,
      data: {
        _id: application._id,
        applicationId: application.applicationId,
        schemeId: application.schemeId,
        schemeName: application.schemeName,
        status: application.status,
        collectedAnswers: application.collectedAnswers,
        userInputs: application.userInputs,
        groupedUserInputs: await UserInput.findOne({ applicationId: application._id }).lean(),
        submittedAt: application.submittedAt,
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error retrieving application:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving application",
      error: error.message,
    });
  }
});

// GET /api/applications - List all applications (with optional filters)
router.get("/applications", async (req, res) => {
  try {
    const { schemeId, status } = req.query;
    const filter = {};

    if (schemeId) filter.schemeId = schemeId;
    if (status) filter.status = status;

    const applications = await Application.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: applications,
      count: applications.length,
    });
  } catch (error) {
    console.error("Error listing applications:", error);
    res.status(500).json({
      success: false,
      message: "Error listing applications",
      error: error.message,
    });
  }
});

module.exports = router;
