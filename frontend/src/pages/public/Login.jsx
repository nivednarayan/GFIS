import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/logo.png";
import "./Login.css";

function Login() {
  const [aadhaar, setAadhaar] = useState("");
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  // Aadhaar validation
  const validateAadhaar = (value) => /^\d{0,12}$/.test(value);

  // Mobile validation
  const validateMobile = (value) => /^\d{0,10}$/.test(value);

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

    try {
      const response = await login(aadhaar, fullName, mobileNumber);

      if (response.success) {
        navigate("/citizen");
      } else {
        setError(response.message || "Login failed. Please try again.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-logo">
            <img src={logo} alt="GFIS Logo" />
          </div>
          <h2>Citizen Login</h2>
          <p className="login-subtitle">Access GFIS Services with Aadhaar</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group aadhaar-field">
              <label htmlFor="aadhaar">Aadhaar Number *</label>
              <input
                id="aadhaar"
                type="text"
                placeholder="Enter 12-digit Aadhaar number"
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

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="login-footer">
            <p>Don't have an account? <Link to="/signup">Sign up here</Link></p>
          </div>

          <div className="login-info">
            <p>
              <strong>Secure Access:</strong> Your Aadhaar number is your unique
              identification. We use it to verify your identity and provide
              personalized government assistance.
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

export default Login;

