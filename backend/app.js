// backend/app.js

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

// 🔥 IMPORT INPUT ROUTES (MISSING BEFORE)
const inputRoutes = require("./routes/input_routes");

// Existing routes
const validationRoutes = require("./routes/validation_routes");
const schemeRoutes = require("./routes/scheme_routes");
const applicationRoutes = require("./routes/application_routes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 🔥 REGISTER ROUTES
app.use("/api/input", inputRoutes);   // ✅ THIS LINE FIXES EVERYTHING
app.use("/api", validationRoutes);
app.use("/api", schemeRoutes);
app.use("/api", applicationRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("GFIS Backend Running 🚀");
});

// Start server after DB connect
const startServer = async () => {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/gfis");
    console.log("MongoDB Connected");

    app.listen(5000, () => {
      console.log("Server running on port 5000");
    });
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};

startServer();