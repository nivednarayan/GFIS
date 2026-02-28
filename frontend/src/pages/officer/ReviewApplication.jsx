import React from 'react';
import { Link } from 'react-router-dom';

function ReviewApplication() {
  return (
    <section className="page">
      <h2>Officer - Review Application</h2>
      <p>Basic page placeholder for review and approval/rejection actions.</p>
      <div className="page-links">
        <Link to="/officer">Back to Dashboard</Link>
      </div>
    </section>
  );
}

export default ReviewApplication;
