import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SplashScreen from '../../components/common/SplashScreen';
import './Landing.css';

function Landing() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Hide splash screen after 2.5 seconds
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <section className="landing-home">
      <div className="landing-hero">
        <div className="hero-card">
          <h2 className="hero-title">Grameen File Intelligence System</h2>
          <p className="hero-caption">
            A trusted digital gateway for rural citizens to discover, apply, and track
            government welfare schemes with clarity, speed, and confidence.
          </p>

          <div className="hero-cta">
            <Link to="/login" className="cta-primary">Login to Continue</Link>
            <Link to="/signup" className="cta-secondary">Create New Account</Link>
          </div>

          <p className="hero-scroll">
            Scroll for key information <a href="#about-gfis">↓ View Details</a>
          </p>
        </div>
      </div>

      <div className="landing-info" id="about-gfis">
        <div className="info-grid">
          <article className="info-card">
            <h3>Why GFIS</h3>
            <p>
              GFIS simplifies access to welfare schemes by guiding applicants step-by-step,
              reducing confusion and improving successful submissions.
            </p>
          </article>
          <article className="info-card">
            <h3>Citizen First</h3>
            <p>
              Built for real users with straightforward forms, clear language, and
              mobile-friendly design for villages and semi-urban regions.
            </p>
          </article>
          <article className="info-card">
            <h3>Secure and Reliable</h3>
            <p>
              Personal details are handled with care while status tracking and application
              insights help citizens stay informed at every step.
            </p>
          </article>
        </div>

        <section className="scheme-strip" aria-label="Popular schemes">
          <h4>Popular Schemes Supported</h4>
          <div className="scheme-pills">
            <span>PM-KISAN</span>
            <span>PMAY-G</span>
            <span>Ayushman Bharat</span>
            <span>IGNOAPS Pension</span>
            <span>Scholarship Schemes</span>
            <span>NNMS</span>
          </div>
        </section>

        <section className="process-section" aria-label="Application process overview">
          <h4>Application Journey in 4 Steps</h4>
          <div className="process-grid">
            <article className="process-step">
              <span className="step-index">01</span>
              <h5>Create Citizen Profile</h5>
              <p>
                Register once with verified mobile details and basic family information to
                build a reusable profile for future scheme applications.
              </p>
            </article>
            <article className="process-step">
              <span className="step-index">02</span>
              <h5>Upload and Validate Documents</h5>
              <p>
                Submit required documents digitally and receive clear prompts for missing or
                invalid records before final submission.
              </p>
            </article>
            <article className="process-step">
              <span className="step-index">03</span>
              <h5>Submit Application with Guidance</h5>
              <p>
                Use guided form support to reduce errors, improve eligibility matching, and
                complete applications with confidence.
              </p>
            </article>
            <article className="process-step">
              <span className="step-index">04</span>
              <h5>Track Status and Receive Updates</h5>
              <p>
                Follow each stage of review from submission to decision through a transparent,
                citizen-friendly status dashboard.
              </p>
            </article>
          </div>
        </section>

        <section className="standards-section" aria-label="Service standards">
          <h4>Public Service Standards</h4>
          <div className="standards-grid">
            <article className="standard-card">
              <h5>Transparent Processing</h5>
              <p>Application stages are clearly displayed to avoid uncertainty and repeated visits.</p>
            </article>
            <article className="standard-card">
              <h5>Inclusive Access</h5>
              <p>Mobile-first workflows and plain language support improve usability for rural users.</p>
            </article>
            <article className="standard-card">
              <h5>Data Responsibility</h5>
              <p>Submitted information is handled securely and used only for authorized verification.</p>
            </article>
            <article className="standard-card">
              <h5>Citizen Support</h5>
              <p>Users receive clear rejection reasons and actionable guidance for re-submission.</p>
            </article>
          </div>
        </section>

        <section className="help-section" aria-label="Help and support">
          <h4>Need Assistance?</h4>
          <p>
            For login or application issues, citizens may contact the local facilitation center
            or designated district support desk during working hours.
          </p>
          <div className="help-actions">
            <Link to="/signup" className="help-link">Start New Registration</Link>
            <Link to="/login" className="help-link secondary">Go to Citizen Login</Link>
          </div>
        </section>
      </div>
    </section>
  );
}

export default Landing;
