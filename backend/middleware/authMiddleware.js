const jwt = require("jsonwebtoken");

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "gfis_secret_key_2026"
    );
    req.userId = decoded.userId;
    req.userType = decoded.userType;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

// Middleware to require citizen role
const requireCitizen = (req, res, next) => {
  if (req.userType !== "citizen") {
    return res.status(403).json({
      success: false,
      message: "Only citizens can access this resource",
    });
  }
  next();
};

module.exports = {
  verifyToken,
  requireCitizen,
};
