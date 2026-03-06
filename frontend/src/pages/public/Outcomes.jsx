import React from 'react';
import './Outcomes.css';

function Outcomes() {
  return (
    <section className="outcomes-page">
      <header className="outcomes-hero">
        <p className="outcomes-badge">Public Performance Dashboard</p>
        <h2>Scheme Application Outcomes</h2>
        <p>
          Transparent summary of application outcomes across users. These figures
          help citizens understand approval trends and improve submission quality.
        </p>
      </header>

      <section className="outcomes-metrics" aria-label="Overall rates">
        <article className="metric-card success">
          <h3>Overall Success Rate</h3>
          <p className="metric-value">74%</p>
          <p className="metric-note">Applications approved or successfully processed</p>
        </article>

        <article className="metric-card rejection">
          <h3>Overall Rejection Rate</h3>
          <p className="metric-value">18%</p>
          <p className="metric-note">Applications rejected due to ineligibility or errors</p>
        </article>

        <article className="metric-card pending">
          <h3>Pending / Under Review</h3>
          <p className="metric-value">8%</p>
          <p className="metric-note">Applications currently in verification workflow</p>
        </article>
      </section>

      <section className="outcomes-breakdown" aria-label="Breakdown by quality factors">
        <h3>Common Reasons Affecting Outcomes</h3>
        <div className="breakdown-grid">
          <article className="break-card">
            <h4>Top Success Factors</h4>
            <ul>
              <li>Complete and accurate identity details</li>
              <li>Valid supporting documents uploaded</li>
              <li>Scheme-specific eligibility correctly matched</li>
            </ul>
          </article>

          <article className="break-card">
            <h4>Top Rejection Factors</h4>
            <ul>
              <li>Missing required documents</li>
              <li>Incorrect personal information</li>
              <li>Eligibility mismatch with selected scheme</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="outcomes-note" aria-label="Data disclaimer">
        <p>
          Note: Rates are refreshed periodically from aggregated application records
          and are shown for citizen awareness. Individual outcomes may vary by scheme.
        </p>
      </section>
    </section>
  );
}

export default Outcomes;
