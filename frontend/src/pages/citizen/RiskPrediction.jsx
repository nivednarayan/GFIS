import React from 'react';
import { Link } from 'react-router-dom';

function RiskPrediction() {
  return (
    <section className="page">
      <h2>Citizen - Risk Prediction</h2>
      <p>Basic risk prediction placeholder before application submission.</p>
      <div className="page-links">
        <Link to="/citizen">Back to Dashboard</Link>
      </div>
    </section>
  );
}

export default RiskPrediction;
