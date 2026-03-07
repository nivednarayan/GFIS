const express = require("express");
const router = express.Router();
const User = require("../models/user");
const jwt = require("jsonwebtoken");

// Aadhaar validation regex (12 digits)
const validateAadhaar = (aadhaar) => {
  const aadhaarRegex = /^\d{12}$/;
  return aadhaarRegex.test(aadhaar);
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId, userType: "citizen" },
    process.env.JWT_SECRET || "gfis_secret_key_2026",
    { expiresIn: "7d" }
  );
};

// POST /api/auth/login - Login with Aadhaar
router.post("/auth/login", async (req, res) => {
  try {
    const { aadhaar, fullName, mobileNumber } = req.body;

    // Validate Aadhaar format
    if (!aadhaar || !validateAadhaar(aadhaar)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Aadhaar number. Please enter a 12-digit number.",
      });
    }

    if (!fullName || fullName.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Full name is required and must be at least 3 characters.",
      });
    }

    if (!mobileNumber || !/^\d{10}$/.test(mobileNumber)) {
      return res.status(400).json({
        success: false,
        message: "Invalid mobile number. Please enter a 10-digit number.",
      });
    }

    // Find or create user
    let user = await User.findOne({ aadhaar });

    if (!user) {
      // Create new user
      user = new User({
        aadhaar,
        fullName,
        mobileNumber,
        userType: "citizen",
        isVerified: true,
      });
      await user.save();
    } else {
      // Update existing user with latest info
      user.fullName = fullName;
      user.mobileNumber = mobileNumber;
      user.isVerified = true;
      await user.save();
    }

    // Generate token
    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        aadhaar: user.aadhaar,
        fullName: user.fullName,
        mobileNumber: user.mobileNumber,
        userType: user.userType,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during login",
      error: error.message,
    });
  }
});

// POST /api/auth/logout
router.post("/auth/logout", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

// GET /api/auth/verify - Verify token and get user
router.get("/auth/verify", async (req, res) => {
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
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        aadhaar: user.aadhaar,
        fullName: user.fullName,
        mobileNumber: user.mobileNumber,
        userType: user.userType,
      },
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
});

// GET /api/auth/user/:aadhaar - Get user details by Aadhaar (for verification)
router.get("/auth/user/:aadhaar", async (req, res) => {
  try {
    const { aadhaar } = req.params;

    if (!validateAadhaar(aadhaar)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Aadhaar number",
      });
    }

    const user = await User.findOne({ aadhaar });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        mobileNumber: user.mobileNumber,
        district: user.district,
        state: user.state,
      },
    });
  } catch (error) {
    console.error("Fetch user error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// POST /api/auth/signup - Register new user
router.post("/auth/signup", async (req, res) => {
  try {
    const { aadhaar, fullName, mobileNumber, email, district, state } = req.body;

    // Validate Aadhaar format
    if (!aadhaar || !validateAadhaar(aadhaar)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Aadhaar number. Please enter a 12-digit number.",
      });
    }

    if (!fullName || fullName.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Full name is required and must be at least 3 characters.",
      });
    }

    if (!mobileNumber || !/^\d{10}$/.test(mobileNumber)) {
      return res.status(400).json({
        success: false,
        message: "Invalid mobile number. Please enter a 10-digit number.",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ aadhaar });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already registered with this Aadhaar number. Please login instead.",
      });
    }

    // Email validation if provided
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format.",
        });
      }

      // Check if email is already used
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: "Email already registered. Please use a different email.",
        });
      }
    }

    // Create new user
    const user = new User({
      aadhaar,
      fullName,
      mobileNumber,
      email: email ? email.toLowerCase() : undefined,
      district: district || undefined,
      state: state || undefined,
      userType: "citizen",
      isVerified: true,
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message: "Sign up successful",
      token,
      user: {
        id: user._id,
        aadhaar: user.aadhaar,
        fullName: user.fullName,
        mobileNumber: user.mobileNumber,
        email: user.email,
        userType: user.userType,
      },
    });
  } catch (error) {
    console.error("Sign up error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during sign up",
      error: error.message,
    });
  }
});

module.exports = router;
