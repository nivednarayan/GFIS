import React from 'react';
import { Link } from 'react-router-dom';

function Landing() {
  return (
    <section className="page">
      <h2>Welcome to GFIS</h2>
      <p>Grameen File Intelligence System baseline public landing page.</p>
      <div className="page-links">
        <Link to="/login">Go to Login</Link>
      </div>
    </section>
  );
}

export default Landing;
