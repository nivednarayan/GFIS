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

  // Helper functions for localStorage persistence
  const getStorageKey = (suffix) => `scheme_assist_${schemeId}_${suffix}`;

  const saveStateToLocalStorage = (stepIndex, answers, msgHistory) => {
    try {
      localStorage.setItem(getStorageKey('step'), JSON.stringify(stepIndex));
      localStorage.setItem(getStorageKey('answers'), JSON.stringify(answers));
      localStorage.setItem(getStorageKey('messages'), JSON.stringify(msgHistory));
    } catch (err) {
      console.error('Error saving to localStorage:', err);
    }
  };

  const getStateFromLocalStorage = () => {
    try {
      const savedStep = localStorage.getItem(getStorageKey('step'));
      const savedAnswers = localStorage.getItem(getStorageKey('answers'));
      const savedMessages = localStorage.getItem(getStorageKey('messages'));

      return {
        step: savedStep ? JSON.parse(savedStep) : null,
        answers: savedAnswers ? JSON.parse(savedAnswers) : null,
        messages: savedMessages ? JSON.parse(savedMessages) : null,
      };
    } catch (err) {
      console.error('Error reading from localStorage:', err);
      return { step: null, answers: null, messages: null };
    }
  };

  const clearStateFromLocalStorage = () => {
    try {
      localStorage.removeItem(getStorageKey('step'));
      localStorage.removeItem(getStorageKey('answers'));
      localStorage.removeItem(getStorageKey('messages'));
    } catch (err) {
      console.error('Error clearing localStorage:', err);
    }
  };

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

        // Check if there's existing state in localStorage
        const savedState = getStateFromLocalStorage();

        if (savedState.answers && savedState.step !== null && savedState.messages) {
          // Restore previous session
          setCollectedAnswers(savedState.answers);
          setCurrentStepIndex(savedState.step);
          setMessages(savedState.messages);
          setChatInput('');

          // Try to fetch existing applicationId from localStorage
          const savedAppId = localStorage.getItem(getStorageKey('appId'));
          if (savedAppId) {
            setApplicationId(savedAppId);
          } else {
            // If no appId in localStorage, create new application
            const appResponse = await fetch(`${API_BASE_URL}/applications`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ schemeId }),
            });

            if (!appResponse.ok) {
              throw new Error('Failed to create application');
            }

            const appData = await appResponse.json();
            const newAppId = appData.data.applicationId;
            setApplicationId(newAppId);
            localStorage.setItem(getStorageKey('appId'), newAppId);
          }
        } else {
          // Start fresh - create a new application draft
          const appResponse = await fetch(`${API_BASE_URL}/applications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schemeId }),
          });

          if (!appResponse.ok) {
            throw new Error('Failed to create application');
          }

          const appData = await appResponse.json();
          const newAppId = appData.data.applicationId;
          setApplicationId(newAppId);
          localStorage.setItem(getStorageKey('appId'), newAppId);
          setIsLoading(false);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Initialization error:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    initializeApplication();
  }, [schemeId]);

  // Initialize chatbot greeting when scheme data loads (only if no previous session)
  useEffect(() => {
    if (!schemeData || !guidedFields.length) return;

    const savedState = getStateFromLocalStorage();

    // Skip greeting if restoring previous session
    if (savedState.messages && savedState.messages.length > 0) {
      return;
    }

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

    // If conversation is completed, allow submit without requiring input
    if (conversationCompleted) {
      // Submit the application to backend with all collected answers
      try {
        console.log('Submitting application with data:', {
          applicationId,
          collectedAnswers,
          totalFields: Object.keys(collectedAnswers).length,
        });

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
        console.log('Application submitted successfully:', submitData);

        const successMessages = [
          ...messages,
          {
            role: 'bot',
            text: `✅ Application submitted successfully! Your Reference ID is: ${submitData.data.applicationId}. You can follow up on your application status later.`,
          },
        ];

        setMessages(successMessages);

        // Clear localStorage after successful submission
        clearStateFromLocalStorage();
        localStorage.removeItem(getStorageKey('appId'));
      } catch (err) {
        console.error('Submission error:', err);
        const errorMessages = [
          ...messages,
          {
            role: 'bot',
            text: `❌ Failed to submit application: ${err.message}. Your answers have been saved locally.`,
          },
        ];
        setMessages(errorMessages);
        // Save state on error so user doesn't lose data
        saveStateToLocalStorage(currentStepIndex, collectedAnswers, errorMessages);
      }

      setChatInput('');
      return;
    }

    // For regular answers, require input
    if (!trimmed) return;

    const nextMessages = [...messages, { role: 'user', text: trimmed }];

    if (!guidedFields.length) {
      setMessages(nextMessages);
      setChatInput('');
      return;
    }

    const currentField = guidedFields[currentStepIndex];
    const validationMessage = validateFieldInput(currentField, trimmed);

    if (validationMessage) {
      const errorMessages = [
        ...nextMessages,
        { role: 'bot', text: validationMessage },
        { role: 'bot', text: buildQuestion(currentField, currentStepIndex, guidedFields.length) },
      ];
      setMessages(errorMessages);
      // Save state even on validation error
      saveStateToLocalStorage(currentStepIndex, collectedAnswers, errorMessages);
      setChatInput('');
      return;
    }

    const updatedAnswers = {
      ...collectedAnswers,
      [currentField.name]: trimmed,
    };

    const nextStepIndex = currentStepIndex + 1;
    setCollectedAnswers(updatedAnswers);
    setCurrentStepIndex(nextStepIndex);

    let newMessages;
    if (nextStepIndex < guidedFields.length) {
      newMessages = [
        ...nextMessages,
        {
          role: 'bot',
          text: buildQuestion(guidedFields[nextStepIndex], nextStepIndex, guidedFields.length),
        },
      ];
    } else {
      const summaryLines = guidedFields.map(
        (field) => `• ${field.label}: ${updatedAnswers[field.name] || '-'}`,
      );

      newMessages = [
        ...nextMessages,
        {
          role: 'bot',
          text: `Great, I have collected all required inputs for ${schemeData.schemeName}.\n\nSummary:\n${summaryLines.join('\n')}\n\nClick Submit Application to finalize your application.`,
        },
      ];
    }

    setMessages(newMessages);
    // Save state after each successful answer (to localStorage only, not DB)
    saveStateToLocalStorage(nextStepIndex, updatedAnswers, newMessages);
    setChatInput('');
  };

  const handleInputKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleSend();
    }
  };

  const handleResetForm = () => {
    if (window.confirm('Are you sure you want to reset the form? All entered data will be lost.')) {
      // Clear state
      setCurrentStepIndex(0);
      setCollectedAnswers({});
      setChatInput('');
      
      // Clear localStorage
      clearStateFromLocalStorage();
      
      // Reset messages to initial greeting
      if (guidedFields.length > 0) {
        const firstQuestion = buildQuestion(guidedFields[0], 0, guidedFields.length);
        setMessages([
          {
            role: 'bot',
            text: `Hi, I will guide you step-by-step for ${schemeData.schemeName}. Please answer each question to complete your application profile.`,
          },
          { role: 'bot', text: firstQuestion },
        ]);
      }
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
              conversationCompleted ? 'Click Submit Application button to finalize' : 'Type your answer for the current step...'
            }
            className="chat-input"
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            onKeyDown={handleInputKeyDown}
                      disabled={conversationCompleted}
          />
          <button type="button" className="chat-send-button" onClick={handleSend}>
            {conversationCompleted ? 'Submit Application' : 'Send'}
          </button>
          <button 
            type="button" 
            className="chat-reset-button" 
            onClick={handleResetForm}
            title="Clear all entered data and start over"
          >
            Reset Form
          </button>
        </div>
      </div>
    </section>
  );
}

export default SchemeAssist;
