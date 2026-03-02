const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    aadhaar: {
      type: String,
      required: false,
      index: true,
    },
    fullName: {
      type: String,
      required: false,
    },
    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      lowercase: true,
    },
    mobileNumber: {
      type: String,
      required: false,
    },
    userType: {
      type: String,
      enum: ["citizen", "officer", "admin"],
      default: "citizen",
    },
    address: {
      type: String,
      required: false,
    },
    district: {
      type: String,
      required: false,
    },
    state: {
      type: String,
      required: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
