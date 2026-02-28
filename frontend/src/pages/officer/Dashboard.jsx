import React from 'react';
import { Link } from 'react-router-dom';

function Dashboard() {
  return (
    <section className="page">
      <h2>Officer Dashboard</h2>
      <p>Review applications and perform decision workflows.</p>
      <div className="page-links">
        <Link to="/officer/review-application">Review Application</Link>
      </div>
    </section>
  );
}

export default Dashboard;
