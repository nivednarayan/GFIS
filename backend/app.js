const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const validationRoutes = require("./routes/validation_routes");
const schemeRoutes = require("./routes/scheme_routes");
const applicationRoutes = require("./routes/application_routes");
const inputRoutes = require("./routes/input_routes");

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/gfis";

app.use(cors());
app.use(express.json());
app.use("/api", validationRoutes);
app.use("/api", schemeRoutes);
app.use("/api", applicationRoutes);
app.use("/api", inputRoutes);

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

app.get("/", (req, res) => {
  res.send("GFIS Backend Running 🚀");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});