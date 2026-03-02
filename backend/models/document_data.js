const mongoose = require("mongoose");

const documentDataSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      index: true,
    },
    documentName: {
      type: String,
      required: true,
    },
    documentType: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: false,
    },
    fileName: {
      type: String,
      required: false,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    mimeType: {
      type: String,
      required: false,
    },
    uploadStatus: {
      type: String,
      enum: ["pending", "uploaded", "verified", "rejected"],
      default: "pending",
    },
    uploadedAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DocumentData", documentDataSchema);
