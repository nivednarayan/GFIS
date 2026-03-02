const express = require("express");
const router = express.Router();
const Application = require("../models/application");
const UserInput = require("../models/user_input");
const DocumentData = require("../models/document_data");
const { assessApplicationRisk } = require("../services/riskAssessmentService");
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

// POST /api/applications/:applicationId/submit - Submit complete application with risk assessment
// Workflow: Reads from UserInput collection → Runs risk analysis → Stores risk results in Application
router.post("/applications/:applicationId/submit", async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { collectedAnswers } = req.body;

    console.log(`[SUBMIT] Processing submission for application: ${applicationId}`);

    // Step 1: Find and validate the application
    const application = await findApplicationByIdentifier(applicationId);

    if (!application) {
      console.error(`[SUBMIT] Application not found: ${applicationId}`);
      return res.status(404).json({
        success: false,
        message: "Application not found",
        requestedId: applicationId,
      });
    }

    console.log(`[SUBMIT] Found application, current status: ${application.status}`);

    // Step 2: Fetch user input data from UserInput collection (source of truth for responses)
    const userInputDoc = await UserInput.findOne({ applicationId: application._id }).lean();
    const userResponses = userInputDoc?.responses || {};
    
    console.log(`[SUBMIT] Retrieved user input data with ${Object.keys(userResponses).length} responses`);

    // Step 3: Build comprehensive application data for risk assessment
    // Combine collectedAnswers from request with stored UserInput responses
    const mergedAnswers = {
      ...userResponses,
      ...collectedAnswers, // Request data takes precedence
    };

    // Update application with merged answers
    application.collectedAnswers = mergedAnswers;
    application.status = "submitted";
    application.submittedAt = new Date();

    // Step 4: Save application state before risk assessment
    await application.save();
    console.log(`[SUBMIT] Application marked as submitted`);

    // Step 5: Prepare data for risk assessment
    // Risk analysis should see complete user profile data
    const applicationForRiskAssessment = {
      ...application.toObject(),
      collectedAnswers: mergedAnswers, // Use merged responses
      userInputs: application.userInputs || [],
    };

    // Step 6: Run risk assessment on merged data
    console.log(`[SUBMIT] Running risk assessment with ${Object.keys(mergedAnswers).length} user responses`);
    const riskAssessmentResult = await assessApplicationRisk(applicationForRiskAssessment);

    if (riskAssessmentResult.success) {
      const { riskSignals, riskScore, riskLevel, aiAnalysis } = riskAssessmentResult.data;

      console.log(`[SUBMIT] Risk assessment completed:`, {
        riskScore,
        riskLevel,
        hasSignals: !!riskSignals,
      });

      // Step 7: Update ONLY risk fields in Application using $set
      // This ensures we don't overwrite other application data
      const updatedApplication = await Application.findByIdAndUpdate(
        application._id,
        {
          $set: {
            riskSignals,
            riskScore,
            riskLevel,
            aiAnalysis,
            updatedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!updatedApplication) {
        throw new Error("Failed to update application with risk assessment");
      }

      console.log(`[SUBMIT] Application successfully updated with risk assessment`);

      // Step 8: Ensure UserInput is also updated with submission metadata
      await UserInput.findOneAndUpdate(
        { applicationId: application._id },
        {
          $set: {
            applicationRefId: application.applicationId,
            schemeId: application.schemeId,
            responses: mergedAnswers,
            totalAnswers: Object.keys(mergedAnswers).length,
            lastAnsweredAt: new Date(),
            submittedAt: new Date(),
          },
        },
        { upsert: true }
      );

      // Step 9: Return complete response with risk assessment
      res.json({
        success: true,
        message: "Application submitted successfully with risk assessment",
        data: {
          applicationId: updatedApplication.applicationId,
          schemeId: updatedApplication.schemeId,
          schemeName: updatedApplication.schemeName,
          status: updatedApplication.status,
          submittedAt: updatedApplication.submittedAt,
          totalAnswers: Object.keys(mergedAnswers).length,
          riskAssessment: {
            riskScore: updatedApplication.riskScore,
            riskLevel: updatedApplication.riskLevel,
            riskSignals: updatedApplication.riskSignals,
            aiAnalysis: updatedApplication.aiAnalysis,
          },
        },
      });
    } else {
      // Risk assessment failed but submission succeeded
      console.warn(`[SUBMIT] Risk assessment incomplete: ${riskAssessmentResult.error}`);

      res.json({
        success: true,
        message: "Application submitted (risk assessment pending)",
        data: {
          applicationId: application.applicationId,
          schemeId: application.schemeId,
          schemeName: application.schemeName,
          status: application.status,
          submittedAt: application.submittedAt,
          totalAnswers: Object.keys(mergedAnswers).length,
          riskAssessment: {
            status: "pending",
            error: riskAssessmentResult.error,
          },
        },
      });
    }
  } catch (error) {
    console.error("[SUBMIT] Error submitting application:", error);
    console.error("[SUBMIT] Stack:", error.stack);
    
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

// DELETE /api/applications/cleanup/draft - Clean up abandoned draft applications
// Removes draft applications older than 24 hours (no user input data)
router.delete("/applications/cleanup/draft", async (req, res) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Find draft applications with no user inputs created more than 24 hours ago
    const abandonedDrafts = await Application.find({
      status: "draft",
      createdAt: { $lt: oneDayAgo },
      userInputs: { $size: 0 }, // No inputs saved
    });

    if (abandonedDrafts.length === 0) {
      return res.json({
        success: true,
        message: "No abandoned draft applications to clean up",
        deletedCount: 0,
      });
    }

    const draftIds = abandonedDrafts.map((app) => app._id);

    // Delete abandoned drafts and their associated UserInput records
    const deleteResult = await Application.deleteMany({
      _id: { $in: draftIds },
    });

    await UserInput.deleteMany({
      applicationId: { $in: draftIds },
    });

    console.log(
      `[CLEANUP] Removed ${deleteResult.deletedCount} abandoned draft applications`
    );

    res.json({
      success: true,
      message: "Cleanup completed",
      deletedCount: deleteResult.deletedCount,
      applicationIds: abandonedDrafts.map((app) => app.applicationId),
    });
  } catch (error) {
    console.error("Error cleaning up draft applications:", error);
    res.status(500).json({
      success: false,
      message: "Error cleaning up draft applications",
      error: error.message,
    });
  }
});

module.exports = router;
