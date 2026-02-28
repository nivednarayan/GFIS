import React from 'react';
import { Link } from 'react-router-dom';

function Status() {
  return (
    <section className="page">
      <h2>Citizen - Application Status</h2>
      <p>Basic page to track submission and processing status.</p>
      <div className="page-links">
        <Link to="/citizen">Back to Dashboard</Link>
      </div>
    </section>
  );
}

export default Status;
