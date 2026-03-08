// backend/app.js

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// Existing routes
const validationRoutes = require("./routes/validation_routes");
const schemeRoutes = require("./routes/scheme_routes");
const applicationRoutes = require("./routes/application_routes");
const inputRoutes = require("./routes/input_routes");
const documentRoutes = require("./routes/document_routes");
const authRoutes = require("./routes/auth_routes");

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.error("FATAL: MONGO_URI is not set in .env");
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());

app.use("/api", authRoutes);
app.use("/api", validationRoutes);
app.use("/api", schemeRoutes);
app.use("/api", applicationRoutes);
app.use("/api/input", inputRoutes);
app.use("/api", documentRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("GFIS Backend Running 🚀");
});

// Start server after DB connect
const startServer = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB Connected");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};

startServer();
