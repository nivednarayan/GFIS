import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5000/api';

const universalFieldLabels = {
  fullName: 'Full Name (as per Aadhaar)',
  aadhaarNumber: 'Aadhaar Number',
  mobileNumber: 'Mobile Number',
  email: 'Email ID',
  dateOfBirth: 'Date of Birth',
  address: 'Address (Village, District, State)',
  bankDetails: 'Bank Account Details (IFSC + Account Number)',
  income: 'Annual Family Income',
};

const fieldMeta = {
  aadhaarNumber: {
    type: 'text',
    validation: {
      pattern: '^[0-9]{12}$',
      message: 'Please enter a valid 12-digit Aadhaar number.',
    },
  },
  mobileNumber: {
    type: 'text',
    validation: {
      pattern: '^[0-9]{10}$',
      message: 'Please enter a valid 10-digit mobile number.',
    },
  },
};

const buildGuidedFields = (schemeData) => {
  if (!schemeData || !schemeData.fields) return [];
  return schemeData.fields.map((field) => ({
    name: field.name,
    label: field.label,
    type: field.type || 'text',
    section: 'Scheme Fields',
    required: field.required !== false,
    validation: field.validation,
    options: field.options,
  }));
};

const buildQuestion = (field, index, total) => {
  const optionsText = field.options?.length ? ` Options: ${field.options.join(' / ')}` : '';
  return `Step ${index + 1}/${total} (${field.section})\n${field.label}${optionsText}`;
};

const validateFieldInput = (field, value) => {
  if (!field.required) return null;
  if (!value.trim()) return `${field.label} is required. Please enter a value.`;

  if (field.type === 'number' && Number.isNaN(Number(value))) {
    return `Please enter a valid number for ${field.label}.`;
  }

  if (field.options?.length) {
    const isValidOption = field.options.some(
      (option) => option.toLowerCase() === value.trim().toLowerCase(),
    );

    if (!isValidOption) {
      return `Please enter one of: ${field.options.join(', ')}.`;
    }
  }

  if (field.validation?.pattern) {
    const regex = new RegExp(field.validation.pattern);
    if (!regex.test(value.trim())) {
      return field.validation.message || `Invalid value for ${field.label}.`;
    }
  }

  return null;
};

function SchemeAssist() {
  const { schemeId } = useParams();
  const recognitionRef = useRef(null);
  const [schemeData, setSchemeData] = useState(null);
  const [applicationId, setApplicationId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isMicSupported, setIsMicSupported] = useState(true);
  const [voiceStatus, setVoiceStatus] = useState('Click mic to start speaking');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [collectedAnswers, setCollectedAnswers] = useState({});
  const guidedFields = useMemo(() => (schemeData ? buildGuidedFields(schemeData) : []), [schemeData]);
  const conversationCompleted = currentStepIndex >= guidedFields.length;

  // Fetch scheme data and create application on mount
  useEffect(() => {
    const initializeApplication = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch scheme fields from backend
        const schemeResponse = await fetch(`${API_BASE_URL}/schemes/${schemeId}/fields`);
        if (!schemeResponse.ok) {
          throw new Error('Failed to load scheme data');
        }
        const schemeInfo = await schemeResponse.json();
        setSchemeData(schemeInfo);

        // Create a new application draft
        const appResponse = await fetch(`${API_BASE_URL}/applications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schemeId }),
        });

        if (!appResponse.ok) {
          throw new Error('Failed to create application');
        }

        const appData = await appResponse.json();
        setApplicationId(appData.data.applicationId);
        setIsLoading(false);
      } catch (err) {
        console.error('Initialization error:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    initializeApplication();
  }, [schemeId]);

  // Initialize chatbot greeting when scheme data loads
  useEffect(() => {
    if (!schemeData || !guidedFields.length) return;

    const firstQuestion = buildQuestion(guidedFields[0], 0, guidedFields.length);

    setMessages([
      {
        role: 'bot',
        text: `Hi, I will guide you step-by-step for ${schemeData.schemeName}. Please answer each question to complete your application profile.`,
      },
      { role: 'bot', text: firstQuestion },
    ]);
    setChatInput('');
    setCurrentStepIndex(0);
    setCollectedAnswers({});
  }, [schemeData, guidedFields]);

  // Initialize speech recognition
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

  const handleSend = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    const nextMessages = [...messages, { role: 'user', text: trimmed }];

    if (!guidedFields.length) {
      setMessages(nextMessages);
      setChatInput('');
      return;
    }

    if (conversationCompleted) {
      // Submit the application to backend
      try {
        const submitResponse = await fetch(
          `${API_BASE_URL}/applications/${applicationId}/submit`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ collectedAnswers }),
          },
        );

        if (!submitResponse.ok) {
          throw new Error('Failed to submit application');
        }

        const submitData = await submitResponse.json();

        setMessages([
          ...nextMessages,
          {
            role: 'bot',
            text: `✅ Application submitted successfully! Your Reference ID is: ${submitData.data.applicationId}. You can follow up on your application status later.`,
          },
        ]);
      } catch (err) {
        console.error('Submission error:', err);
        setMessages([
          ...nextMessages,
          {
            role: 'bot',
            text: `❌ Failed to submit application: ${err.message}. Your answers have been saved to the draft.`,
          },
        ]);
      }

      setChatInput('');
      return;
    }

    const currentField = guidedFields[currentStepIndex];
    const validationMessage = validateFieldInput(currentField, trimmed);

    if (validationMessage) {
      setMessages([
        ...nextMessages,
        { role: 'bot', text: validationMessage },
        { role: 'bot', text: buildQuestion(currentField, currentStepIndex, guidedFields.length) },
      ]);
      setChatInput('');
      return;
    }

    // Save answer to backend
    try {
      await fetch(`${API_BASE_URL}/applications/${applicationId}/save-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldName: currentField.name,
          fieldLabel: currentField.label,
          fieldType: currentField.type,
          answer: trimmed,
        }),
      });
    } catch (err) {
      console.error('Error saving answer:', err);
    }

    const updatedAnswers = {
      ...collectedAnswers,
      [currentField.name]: trimmed,
    };

    const nextStepIndex = currentStepIndex + 1;
    setCollectedAnswers(updatedAnswers);
    setCurrentStepIndex(nextStepIndex);

    if (nextStepIndex < guidedFields.length) {
      setMessages([
        ...nextMessages,
        {
          role: 'bot',
          text: buildQuestion(guidedFields[nextStepIndex], nextStepIndex, guidedFields.length),
        },
      ]);
    } else {
      const summaryLines = guidedFields.map(
        (field) => `• ${field.label}: ${updatedAnswers[field.name] || '-'}`,
      );

      setMessages([
        ...nextMessages,
        {
          role: 'bot',
          text: `Great, I have collected all required inputs for ${schemeData.schemeName}.\n\nSummary:\n${summaryLines.join('\n')}\n\nClick Send to submit your application.`,
        },
      ]);
    }

    setChatInput('');
  };

  const handleInputKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <section className="page">
        <h2>Loading Scheme...</h2>
        <p>Please wait, fetching scheme details from server.</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page">
        <h2>Error Loading Scheme</h2>
        <p>{error}</p>
        <div className="page-links">
          <Link to="/citizen/apply">Back to Schemes</Link>
        </div>
      </section>
    );
  }

  if (!schemeData) {
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
        <h2>{schemeData.schemeName}</h2>
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
            <strong>Scheme Fields</strong>
            <ul>
              {schemeData.fields?.map((field) => (
                <li key={field.name}>{field.label}</li>
              ))}
            </ul>
          </div>

          {schemeData.requiredDocuments?.length > 0 && (
            <div className="requirements-block">
              <strong>Required Documents</strong>
              <ul>
                {schemeData.requiredDocuments.map((doc) => (
                  <li key={doc}>{doc}</li>
                ))}
              </ul>
            </div>
          )}
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
            placeholder={
              conversationCompleted ? 'Click Send to finalize submission...' : 'Type your answer for the current step...'
            }
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
