const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const validationRoutes = require("./routes/validation_routes");
const schemeRoutes = require("./routes/scheme_routes");
const applicationRoutes = require("./routes/application_routes");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api", validationRoutes);
app.use("/api", schemeRoutes);
app.use("/api", applicationRoutes);

// Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/gfis")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

app.get("/", (req, res) => {
  res.send("GFIS Backend Running 🚀");
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});