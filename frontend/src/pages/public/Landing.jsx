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
      </div>
    </section>
  );
}

export default Landing;
