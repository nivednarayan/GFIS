// backend/app.js

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// Routes
const validationRoutes = require("./routes/validation_routes");
const schemeRoutes = require("./routes/scheme_routes");
const applicationRoutes = require("./routes/application_routes");
const inputRoutes = require("./routes/input_routes");
const documentRoutes = require("./routes/document_routes");
const authRoutes = require("./routes/auth_routes");

const app = express();

// Render assigns its own port
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGO_URI;

// Validate environment variable
if (!MONGODB_URI) {
  console.error("❌ FATAL ERROR: MONGO_URI is not set in environment variables");
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", authRoutes);
app.use("/api", validationRoutes);
app.use("/api", schemeRoutes);
app.use("/api", applicationRoutes);
app.use("/api/input", inputRoutes);
app.use("/api", documentRoutes);

// Health check route
app.get("/", (req, res) => {
  res.send("GFIS Backend Running 🚀");
});

// Start server
const startServer = async () => {
  try {
    console.log("Connecting to MongoDB...");

    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ MongoDB Connected");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

startServer();
