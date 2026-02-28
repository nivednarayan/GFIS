import React from 'react';
import { Link, useParams } from 'react-router-dom';

const schemeTitles = {
  ayushman: 'Ayushman Bharat',
  'pm-kisan': 'PM Kisan',
  'pmay-g': 'PMAY-G',
  ignoaps: 'IGNOAPS',
  nnms: 'NNMS',
};

function SchemeAssist() {
  const { schemeId } = useParams();
  const schemeName = schemeTitles[schemeId] || 'Selected Scheme';

  return (
    <section className="page page-chat-layout">
      <div className="voice-panel">
        <h2>{schemeName}</h2>
        <p>Use voice input to start filling the application quickly.</p>
        <button type="button" className="mic-button">
          🎤 Start Voice Input
        </button>
        <div className="page-links">
          <Link to="/citizen/apply">Back to Schemes</Link>
        </div>
      </div>

      <div className="chat-panel">
        <h3>Assistant Chat</h3>
        <div className="chat-messages">
          <div className="chat-bubble bot">Hi, I can help you complete the form for {schemeName}.</div>
          <div className="chat-bubble user">What documents are required?</div>
        </div>
        <div className="chat-input-row">
          <input type="text" placeholder="Type your question..." className="chat-input" />
          <button type="button" className="chat-send-button">Send</button>
        </div>
      </div>
    </section>
  );
}

export default SchemeAssist;
