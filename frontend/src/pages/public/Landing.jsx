import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SplashScreen from '../../components/common/SplashScreen';

function Landing() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Hide splash screen after 2.5 seconds
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

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
