import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

const schemeConfigs = {
  ayushman: {
    title: 'Ayushman Bharat (Health Insurance)',
    universalFields: ['fullName', 'aadhaarNumber', 'mobileNumber', 'address', 'bankDetails'],
    schemeFields: [
      { section: 'Personal Information', fields: ['rationCardNumber', 'familyId'] },
      { section: 'Family Details', fields: ['familyMembersList', 'relationshipWithHead', 'ageOfMembers'] },
      { section: 'Socio-Economic Info', fields: ['bplStatus', 'occupation', 'incomeCategory'] },
    ],
    documents: ['Aadhaar Card', 'Ration Card', 'Income Certificate'],
  },
  'pm-kisan': {
    title: 'PM-KISAN (Agriculture)',
    universalFields: ['fullName', 'aadhaarNumber', 'mobileNumber', 'bankDetails'],
    schemeFields: [
      { section: 'Land Details', fields: ['landOwnership', 'landRecordNumber', 'areaOfLand', 'districtAndVillage'] },
    ],
    documents: ['Aadhaar Card', 'Land Ownership Proof', 'Bank Passbook copy'],
    aiUseCases: ['Duplicate land detection', 'Cross-district duplicate application check'],
  },
  'pmay-g': {
    title: 'Pradhan Mantri Awas Yojana (Housing)',
    universalFields: ['fullName', 'aadhaarNumber', 'mobileNumber', 'address', 'income', 'bankDetails'],
    schemeFields: [
      { section: 'Housing Details', fields: ['currentHouseOwnership', 'typeOfHouse', 'yearsOfResidence'] },
      { section: 'Income Details', fields: ['annualFamilyIncome', 'incomeCategory', 'employmentType'] },
      { section: 'Family Details', fields: ['numberOfFamilyMembers', 'dependents', 'disabledMember'] },
    ],
    documents: ['Aadhaar Card', 'Income Certificate', 'Address Proof', 'Bank Account Details'],
  },
  ignoaps: {
    title: 'Widow / Old Age Pension (NSAP)',
    universalFields: ['fullName', 'aadhaarNumber', 'dateOfBirth', 'address', 'income', 'bankDetails'],
    schemeFields: [
      { section: 'Age Validation', fields: ['age', 'deathCertificate'] },
      { section: 'Income Details', fields: ['monthlyHouseholdIncome', 'bplStatus'] },
    ],
    documents: ['Aadhaar', 'Death Certificate (widow case)', 'Income Certificate', 'Bank Passbook'],
    aiUseCases: ['Age mismatch detection', 'Duplicate pension detection', 'Invalid income threshold flagging'],
  },
  nnms: {
    title: 'Post-Matric Scholarship',
    universalFields: ['fullName', 'aadhaarNumber', 'mobileNumber', 'email', 'dateOfBirth', 'income', 'bankDetails'],
    schemeFields: [
      { section: 'Academic Details', fields: ['institutionName', 'courseName', 'yearOfStudy', 'previousExamPercentage', 'enrollmentNumber'] },
      { section: 'Category', fields: ['category'] },
    ],
    documents: ['Aadhaar', 'Income certificate', 'Caste certificate', 'Mark sheet', 'Admission proof'],
    aiUseCases: ['Income threshold validation', 'Duplicate scholarship detection', 'Fake mark sheet detection (OCR)'],
  },
};

const universalFieldLabels = {
  fullName: 'Full Name (as per Aadhaar)',
  aadhaarNumber: 'Aadhaar Number',
  mobileNumber: 'Mobile Number',
  email: 'Email ID',
  dateOfBirth: 'Date of Birth',
  address: 'Address (Village, District, State)',
  bankDetails: 'Bank Account Details (IFSC + Account Number)',
  income: 'Annual Family Income',
  rationCardNumber: 'Ration Card Number',
  familyId: 'Family ID (if available)',
  familyMembersList: 'Family members list',
  relationshipWithHead: 'Relationship with head of family',
  ageOfMembers: 'Age of each member',
  bplStatus: 'BPL status (Yes/No)',
  occupation: 'Occupation',
  incomeCategory: 'Income category',
  currentHouseOwnership: 'Current house ownership status (Yes/No)',
  typeOfHouse: 'Type of house (Kuccha / Pucca / Homeless)',
  yearsOfResidence: 'Years of residence',
  annualFamilyIncome: 'Annual family income',
  employmentType: 'Employment type',
  numberOfFamilyMembers: 'Number of family members',
  dependents: 'Names of dependents',
  disabledMember: 'Any disabled member? (Yes/No)',
  age: 'Age (60+ for old age)',
  deathCertificate: 'Death certificate (for widow pension)',
  monthlyHouseholdIncome: 'Monthly household income',
  landOwnership: 'Land ownership (Yes/No)',
  landRecordNumber: 'Land record number',
  areaOfLand: 'Area of land (in acres)',
  districtAndVillage: 'District & Village',
  institutionName: 'Institution Name',
  courseName: 'Course Name',
  yearOfStudy: 'Year of Study',
  previousExamPercentage: 'Previous exam percentage',
  enrollmentNumber: 'Enrollment number',
  category: 'Category (SC/ST/OBC/General)',
};

function SchemeAssist() {
  const { schemeId } = useParams();
  const config = schemeConfigs[schemeId];
  const schemeName = config?.title || 'Selected Scheme';
  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [isMicSupported, setIsMicSupported] = useState(true);
  const [voiceStatus, setVoiceStatus] = useState('Click mic to start speaking');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([]);

  // Initialize chatbot greeting
  useEffect(() => {
    if (!config) return;

    setMessages([{ role: 'bot', text: `Hi, I can help you complete the form for ${config.title}.` }]);
    setChatInput('');
  }, [schemeId, config]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsMicSupported(false);
      setVoiceStatus('Voice input is not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceStatus('Listening... speak now');
    };

    recognition.onresult = (event) => {
      let transcriptChunk = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcriptChunk += event.results[index][0].transcript;
      }

      setChatInput(transcriptChunk.trim());
    };

    recognition.onerror = () => {
      setVoiceStatus('Could not capture voice. Please try again');
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setVoiceStatus('Click mic to start speaking');
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  const handleMicClick = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      return;
    }

    recognitionRef.current.start();
  };

  const handleSend = () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setChatInput('');
  };

  const handleInputKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleSend();
    }
  };

  if (!config) {
    return (
      <section className="page">
        <h2>Scheme Not Found</h2>
        <p>Please select a valid scheme from the list.</p>
        <div className="page-links">
          <Link to="/citizen/apply">Back to Schemes</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="page page-chat-layout">
      <div className="voice-panel">
        <h2>{schemeName}</h2>
        <p>Use voice input to start filling the application quickly.</p>
        <button
          type="button"
          className={`mic-button ${isListening ? 'mic-button--active' : ''}`}
          onClick={handleMicClick}
          disabled={!isMicSupported}
        >
          {isListening ? '⏹ Stop Voice Input' : '🎤 Start Voice Input'}
        </button>
        <p className="voice-status">{voiceStatus}</p>

        <div className="page-links">
          <Link to="/citizen/apply">Back to Schemes</Link>
        </div>
      </div>

      <div className="chat-panel">
        <h3>Assistant Chat</h3>
        <div className="requirements-panel">
          <h4>Information Required</h4>
          <div className="requirements-block">
            <strong>Universal Applicant Profile</strong>
            <ul>
              {config.universalFields.map((fieldKey) => (
                <li key={fieldKey}>{universalFieldLabels[fieldKey]}</li>
              ))}
            </ul>
          </div>

          {config.schemeFields.map((section, idx) => (
            <div key={`read-only-section-${idx}`} className="requirements-block">
              <strong>{section.section}</strong>
              <ul>
                {section.fields.map((fieldKey) => (
                  <li key={fieldKey}>{universalFieldLabels[fieldKey]}</li>
                ))}
              </ul>
            </div>
          ))}

          <div className="requirements-block">
            <strong>Required Documents</strong>
            <ul>
              {config.documents.map((doc) => (
                <li key={doc}>{doc}</li>
              ))}
            </ul>
          </div>

          {config.aiUseCases?.length ? (
            <div className="requirements-block">
              <strong>AI Validation</strong>
              <ul>
                {config.aiUseCases.map((useCase) => (
                  <li key={useCase}>{useCase}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="chat-messages">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`chat-bubble ${message.role}`}>
              {message.text.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          ))}
        </div>
        <div className="chat-input-row">
          <input
            type="text"
            placeholder="Type your question..."
            className="chat-input"
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            onKeyDown={handleInputKeyDown}
          />
          <button type="button" className="chat-send-button" onClick={handleSend}>
            Send
          </button>
        </div>
      </div>
    </section>
  );
}

export default SchemeAssist;
