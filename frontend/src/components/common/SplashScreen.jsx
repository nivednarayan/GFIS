import React from 'react';
import './SplashScreen.css';
import logoAnimated from '../../assets/logo-animated.mp4';

function SplashScreen() {
  return (
    <div className="splash-screen">
      <div className="splash-content">
        <video 
          autoPlay 
          muted 
          playsInline
          className="splash-video"
        >
          <source src={logoAnimated} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        
        <div className="splash-footer">
          <div>
            <span className="emblem">🇮🇳</span>
            <span className="splash-gov-text">Government of India</span>
          </div>
          <div className="splash-tagline">
            Grameen File Intelligence System
          </div>
        </div>
      </div>
    </div>
  );
}

export default SplashScreen;
