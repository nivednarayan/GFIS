const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    applicationId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    schemeId: {
      type: String,
      required: true,
      index: true,
    },
    schemeName: {
      type: String,
      required: true,
    },
    userInputs: [
      {
        fieldName: String,
        fieldLabel: String,
        fieldType: String,
        answer: String,
        answeredAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    collectedAnswers: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    documents: [
      {
        documentName: String,
        fileUrl: String,
        uploadedAt: Date,
      },
    ],
    status: {
      type: String,
      enum: ["draft", "submitted", "under_review", "approved", "rejected"],
      default: "draft",
    },
    validationErrors: [
      {
        fieldName: String,
        error: String,
      },
    ],
    submittedAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Auto-update the updatedAt field
applicationSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Application", applicationSchema);
