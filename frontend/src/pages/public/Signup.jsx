import React, { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import SplashScreen from "../../components/common/SplashScreen";
import logo from "../../assets/logo.png";
import "./Signup.css";

function Signup() {
  const [aadhaar, setAadhaar] = useState("");
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccessSplash, setShowSuccessSplash] = useState(false);
  const redirectTimerRef = useRef(null);
  const navigate = useNavigate();
  const { signup } = useAuth();

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  // Aadhaar validation
  const validateAadhaar = (value) => /^\d{0,12}$/.test(value);

  // Mobile validation
  const validateMobile = (value) => /^\d{0,10}$/.test(value);

  // Email validation
  const validateEmail = (email) => {
    if (!email) return true; // Optional field
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleAadhaarChange = (e) => {
    const value = e.target.value;
    if (validateAadhaar(value)) {
      setAadhaar(value);
      setError("");
    }
  };

  const handleMobileChange = (e) => {
    const value = e.target.value;
    if (validateMobile(value)) {
      setMobileNumber(value);
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validation
    if (!aadhaar || aadhaar.length !== 12) {
      setError("Please enter a valid 12-digit Aadhaar number");
      setLoading(false);
      return;
    }

    if (!fullName || fullName.trim().length < 3) {
      setError("Please enter a valid full name (minimum 3 characters)");
      setLoading(false);
      return;
    }

    if (!mobileNumber || mobileNumber.length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      setLoading(false);
      return;
    }

    if (email && !validateEmail(email)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    try {
      const response = await signup(
        aadhaar,
        fullName,
        mobileNumber,
        email,
        district,
        state
      );

      if (response.success) {
        setShowSuccessSplash(true);
        redirectTimerRef.current = setTimeout(() => {
          navigate("/citizen", { replace: true });
        }, 2200);
      } else {
        setError(response.message || "Sign up failed. Please try again.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Sign up error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (showSuccessSplash) {
    return <SplashScreen />;
  }

  return (
    <section className="signup-page">
      <div className="signup-container">
        <div className="signup-card">
          <div className="signup-logo">
            <img src={logo} alt="GFIS Logo" />
          </div>
          <h2>Create Account</h2>
          <p className="signup-subtitle">Register with Aadhaar for GFIS Services</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit} className="signup-form">
            <div className="form-group aadhaar-field">
              <label htmlFor="aadhaar">Aadhaar Number *</label>
              <input
                id="aadhaar"
                type="text"
                placeholder="Enter 12-digit Aadhaar"
                value={aadhaar}
                onChange={handleAadhaarChange}
                maxLength="12"
                disabled={loading}
                required
                autoComplete="off"
                aria-describedby="aadhaar-help"
              />
              <span className="char-count">{aadhaar.length}/12</span>
            </div>

            <div className="form-group name-field">
              <label htmlFor="fullName">Full Name *</label>
              <input
                id="fullName"
                type="text"
                placeholder="Enter your full name as per Aadhaar"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                required
                autoComplete="name"
              />
            </div>

            <div className="form-group mobile-field">
              <label htmlFor="mobile">Mobile Number *</label>
              <input
                id="mobile"
                type="tel"
                placeholder="Enter 10-digit mobile number"
                value={mobileNumber}
                onChange={handleMobileChange}
                maxLength="10"
                disabled={loading}
                required
                autoComplete="tel"
                aria-describedby="mobile-help"
              />
              <span className="char-count">{mobileNumber.length}/10</span>
            </div>

            <div className="form-group email-field">
              <label htmlFor="email">Email Address (Optional)</label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={handleEmailChange}
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div className="form-row">
              <div className="form-group location-field">
                <label htmlFor="district">District</label>
                <input
                  id="district"
                  type="text"
                  placeholder="Your district"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  disabled={loading}
                  autoComplete="address-level2"
                />
              </div>

              <div className="form-group location-field">
                <label htmlFor="state">State</label>
                <input
                  id="state"
                  type="text"
                  placeholder="Your state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  disabled={loading}
                  autoComplete="address-level1"
                />
              </div>
            </div>

            <button
              type="submit"
              className="signup-button"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Sign Up"}
            </button>
          </form>

          <div className="signup-footer">
            <p>Already have an account? <Link to="/login">Login here</Link></p>
          </div>

          <div className="signup-info">
            <p>
              <strong>Secure Registration:</strong> Your information is encrypted
              and protected. Aadhaar is used as your unique identification for accessing government schemes.
            </p>
          </div>

          <div className="gov-badge">
            <p>
              <span>Government of India Portal</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Signup;

