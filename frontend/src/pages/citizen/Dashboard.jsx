import React from 'react';
import { Link } from 'react-router-dom';
import './Dashboard.css';

function Dashboard() {
  return (
    <section className="dashboard-page">
      <div className="dashboard-header">
        <h2>Citizen Dashboard</h2>
        <p>Welcome to GFIS - Your Gateway to Government Schemes</p>
      </div>

      <div className="dashboard-cards">
        <div className="dashboard-card primary-card">
          <div className="card-icon">📝</div>
          <h3>Apply for Schemes</h3>
          <p>Discover and apply for government schemes that match your eligibility</p>
          <Link to="/citizen/apply" className="card-button">
            Start Application
          </Link>
        </div>

        <div className="dashboard-card">
          <div className="card-icon">📊</div>
          <h3>Application Status</h3>
          <p>Track the progress of your submitted applications</p>
          <Link to="/citizen/status" className="card-button">
            View Status
          </Link>
        </div>

        <div className="dashboard-card">
          <div className="card-icon">🎯</div>
          <h3>Risk Prediction</h3>
          <p>Get insights on application success probability</p>
          <Link to="/citizen/risk-prediction" className="card-button">
            Check Risk
          </Link>
        </div>
      </div>

      <div className="dashboard-info">
        <div className="info-card">
          <h4>🌾 Grameen File Intelligence System</h4>
          <p>
            GFIS helps rural citizens access government schemes through voice and text input.
            Our AI-powered system simplifies the application process and provides personalized assistance.
          </p>
        </div>

        <div className="info-card">
          <h4>🔒 Your Data is Secure</h4>
          <p>
            All your information is encrypted and stored securely. We comply with Government of India
            data protection standards.
          </p>
        </div>
      </div>
    </section>
  );
}

export default Dashboard;
