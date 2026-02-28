import React from 'react';
import { Link } from 'react-router-dom';

function Dashboard() {
  return (
    <section className="page">
      <h2>Citizen Dashboard</h2>
      <p>Track application, apply for schemes, and check risk prediction.</p>
      <div className="page-links">
        <Link to="/citizen/apply">Apply</Link>
        <Link to="/citizen/risk-prediction">Risk Prediction</Link>
        <Link to="/citizen/status">Application Status</Link>
      </div>
    </section>
  );
}

export default Dashboard;
