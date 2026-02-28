import React from 'react';
import { Link } from 'react-router-dom';

function Apply() {
  return (
    <section className="page">
      <h2>Citizen - Apply</h2>
      <p>Basic application submission page placeholder.</p>
      <div className="page-links">
        <Link to="/citizen">Back to Dashboard</Link>
      </div>
    </section>
  );
}

export default Apply;
