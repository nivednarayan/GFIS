import React from 'react';
import { Link } from 'react-router-dom';

function DistrictHeatmap() {
  return (
    <section className="page">
      <h2>Admin - District Heatmap</h2>
      <p>Basic district-wise performance and rejection concentration view.</p>
      <div className="page-links">
        <Link to="/admin">Back to Analytics</Link>
      </div>
    </section>
  );
}

export default DistrictHeatmap;
