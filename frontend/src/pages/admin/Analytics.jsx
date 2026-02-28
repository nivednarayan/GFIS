import React from 'react';
import { Link } from 'react-router-dom';

function Analytics() {
  return (
    <section className="page">
      <h2>Admin - Analytics</h2>
      <p>Basic governance analytics and performance insights page.</p>
      <div className="page-links">
        <Link to="/admin/district-heatmap">District Heatmap</Link>
      </div>
    </section>
  );
}

export default Analytics;
