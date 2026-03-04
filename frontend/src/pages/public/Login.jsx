import React from 'react';
import { Link } from 'react-router-dom';

function Login() {
  return (
    <section className="page page--centered">
      <h2>Login</h2>
      <p>Select your role to proceed</p>
      <div className="page-links">
        <Link to="/citizen">Login as Citizen</Link>
      </div>
      <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '1rem' }}>
        Admin access is assigned by the backend based on your role and JWT token
      </p>
    </section>
  );
}

export default Login;
