const mongoose = require("mongoose");

const userInputSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },
    applicationRefId: {
      type: String,
      required: true,
      index: true,
    },
    schemeId: {
      type: String,
      required: true,
    },
    responses: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    responsesHistory: [
      {
        fieldName: String,
        fieldLabel: String,
        fieldType: String,
        answer: mongoose.Schema.Types.Mixed,
        answeredAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    totalAnswers: {
      type: Number,
      default: 0,
    },
    lastAnsweredAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

userInputSchema.index({ applicationId: 1 }, { unique: true });

module.exports = mongoose.model("UserInput", userInputSchema);