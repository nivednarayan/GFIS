import React from 'react';
import { Link } from 'react-router-dom';
import './Dashboard.css';

function Dashboard() {
  return (
    <section className="dashboard-page">
      <header className="dashboard-hero">
        <p className="hero-badge">Citizen Services Portal</p>
        <h2>Citizen Dashboard</h2>
        <p className="hero-subtitle">
          Welcome to GFIS. Access welfare schemes, track applications, and receive guidance
          through one trusted government platform.
        </p>

        <div className="hero-metrics" aria-label="Dashboard highlights">
          <div className="metric-item">
            <strong>24x7</strong>
            <span>Digital Access</span>
          </div>
          <div className="metric-item">
            <strong>Secure</strong>
            <span>Citizen Data</span>
          </div>
          <div className="metric-item">
            <strong>AI Assisted</strong>
            <span>Scheme Guidance</span>
          </div>
        </div>
      </header>

      <section className="dashboard-services" aria-label="Primary citizen actions">
        <div className="dashboard-card primary-card">
          <div className="card-head">
            <span className="card-tag">Recommended</span>
          </div>
          <h3>Apply for Schemes</h3>
          <p>Discover eligible schemes and submit your application in guided steps.</p>
          <ul className="card-points">
            <li>Personalized scheme matching</li>
            <li>Simple document checklist</li>
          </ul>
          <Link to="/citizen/apply" className="card-button">
            Start Application
          </Link>
        </div>

        <div className="dashboard-card">
          <div className="card-head">
            <span className="card-tag">Track</span>
          </div>
          <h3>Application Status</h3>
          <p>Monitor each stage of your submitted requests in one consolidated view.</p>
          <ul className="card-points">
            <li>Real-time status visibility</li>
            <li>Clear pending action alerts</li>
          </ul>
          <Link to="/citizen/status" className="card-button">
            View Status
          </Link>
        </div>
      </section>

      <section className="dashboard-notice" aria-label="Important information">
        <article className="notice-card">
          <h4>About GFIS</h4>
          <p>
            Grameen File Intelligence System supports rural citizens with voice and text enabled
            workflows to make government services more accessible and easier to complete.
          </p>
        </article>

        <article className="notice-card">
          <h4>Security and Privacy</h4>
          <p>
            Your personal data is encrypted and managed under secure standards aligned with
            Government of India digital service practices.
          </p>
        </article>
      </section>
    </section>
  );
}

export default Dashboard;
