import React, { useRef, useState } from 'react';
import api from '../services/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function AudioRecorder({
  applicationId,
  districtId = "district-001",
  onTranscriptReady,
  onEnsureApplicationId,
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [isPolling, setIsPolling] = useState(false);
  const [processingStatus, setProcessingStatus] = useState(null);
  const [transcription, setTranscription] = useState(null);
  const [extractedFields, setExtractedFields] = useState(null);
  const pollingIntervalRef = useRef(null);

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);

  const stopStreamTracks = () => {
    if (!mediaStreamRef.current) return;

    mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  /**
   * Poll /api/audio-result every 2 seconds until Lambda writes an ANALYZED record.
   *
   * No fileKey or applicationId is needed — the backend queries the DynamoDB partition
   * for any ANALYZED record. The `uploadedAt` ISO timestamp is passed as `since` so
   * stale results from previous sessions are filtered out.
   */
  const startPollingAudioResult = (appId, uploadedAt) => {
    console.log(`[AUDIO-RECORDER] Starting to poll for ApplicationID: ${appId} since: ${uploadedAt}`);
    setIsPolling(true);
    setProcessingStatus('processing');
    setTranscription(null);
    setExtractedFields(null);

    const pollInterval = setInterval(async () => {
      try {
        // Primary: direct lookup by applicationId — backend does GetCommand(applicationId),
        // which always returns exactly this record and nothing else.
        // since is kept as a secondary guard for the legacy fallback path.
        const response = await fetch(
          `${API_BASE_URL}/audio-result?applicationId=${encodeURIComponent(appId)}&since=${encodeURIComponent(uploadedAt)}`,
        );

        const text = await response.text();
        let data;

        try {
          data = JSON.parse(text);
        } catch (jsonError) {
          console.error('[AUDIO-RECORDER] Response was not JSON:', text);
          return;
        }

        if (!response.ok) {
          console.error('[AUDIO-RECORDER] Polling request failed:', response.status, data);
          return;
        }

        if (!data.success) {
          console.warn(`[AUDIO-RECORDER] Polling result not successful:`, data.error);
          setProcessingStatus('processing');
          return;
        }

        const status = data.processingStatus;
        setProcessingStatus(status);

        console.log(`[AUDIO-RECORDER] Poll result - Status: ${status}`);

        // Check if processing is complete (Lambda sets ApplicationStatus to ANALYZED)
        if (status === 'ANALYZED') {
          console.log(`[AUDIO-RECORDER] Audio processing completed!`);
          console.log(`[AUDIO-RECORDER] Transcription:`, data.transcription);
          console.log(`[AUDIO-RECORDER] Extracted fields:`, data.extractedFields);

          setTranscription(data.transcription);
          setExtractedFields(data.extractedFields);

          // Emit transcript to parent component for chat integration
          if (onTranscriptReady) {
            console.log(`[AUDIO-RECORDER] Calling onTranscriptReady callback`);
            onTranscriptReady(data.transcription, data.extractedFields, data.applicationId);
          }

          // Stop polling
          clearInterval(pollInterval);
          setIsPolling(false);
        } else if (status === 'failed') {
          console.error(`[AUDIO-RECORDER] Audio processing failed:`, data.errorMessage);
          setError(`Transcription failed: ${data.errorMessage || 'Unknown error'}`);
          clearInterval(pollInterval);
          setIsPolling(false);
        } else {
          // Still processing - continue polling
          console.log(`[AUDIO-RECORDER] Still processing... will retry in 2 seconds`);
        }
      } catch (pollError) {
        console.error(`[AUDIO-RECORDER] Error during polling:`, pollError);
        // Continue polling on error - backend might be temporarily unavailable
      }
    }, 2000); // Poll every 2 seconds

    pollingIntervalRef.current = pollInterval;
  };

  const startRecording = async () => {
    setError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (recError) {
      setError('Microphone access denied or unavailable.');
      stopStreamTracks();
    }
  };

  const stopRecording = async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    recorder.onstop = async () => {
      try {
        setIsUploading(true);

        let finalApplicationId = applicationId;

        if (!finalApplicationId && typeof onEnsureApplicationId === 'function') {
          try {
            finalApplicationId = await onEnsureApplicationId();
          } catch (idError) {
            setError(idError?.message || 'Could not create application draft. Please try again.');
            return;
          }
        }

        if (!finalApplicationId) {
          setError('Application draft is not ready. Please wait and try recording again.');
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/wav',
        });

        await api.uploadAudioFile(audioBlob, finalApplicationId);

        /**
         * ============================================================
         * AFTER UPLOADING AUDIO:
         * ============================================================
         * Start polling backend endpoint /api/audio-result?applicationId={applicationId}
         * every 2 seconds.
         * 
         * Poll will continue until processingStatus === "completed".
         * 
         * When completed:
         * - Extract transcription from response
         * - Extract extractedFields from response
         * - Make available to chat UI for auto-population
         * ============================================================
         */
        console.log('[AUDIO-RECORDER] Audio uploaded successfully.');

        // Record upload time as a secondary guard for the legacy fallback path.
        const uploadedAt = new Date().toISOString();
        startPollingAudioResult(finalApplicationId, uploadedAt);
      } catch (uploadError) {
        setError(uploadError.message || 'Upload failed.');
      } finally {
        setIsUploading(false);
        audioChunksRef.current = [];
        mediaRecorderRef.current = null;
        stopStreamTracks();
      }
    };

    recorder.stop();
    setIsRecording(false);
  };

  return (
    <div style={{ marginTop: '1rem' }}>
      <h4 style={{ marginBottom: '0.5rem' }}>Audio Recorder</h4>

      {!isRecording ? (
        <button type="button" onClick={startRecording} disabled={isUploading || isPolling}>
          Start Recording
        </button>
      ) : (
        <button type="button" onClick={stopRecording}>
          Stop Recording
        </button>
      )}

      {isRecording && <p style={{ marginTop: '0.5rem' }}>Recording...</p>}
      {isUploading && <p style={{ marginTop: '0.5rem' }}>Uploading...</p>}

      {isPolling && (
        <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#e3f2fd', borderRadius: '4px' }}>
          <p style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold' }}>⏳ Processing Audio...</p>
          <p style={{ margin: '0', fontSize: '0.9rem' }}>
            Status: <strong>{processingStatus || 'waiting'}</strong>
          </p>
        </div>
      )}

      {transcription && (
        <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#f1f8e9', borderRadius: '4px' }}>
          <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>📝 Transcription</p>
          <p style={{ margin: '0', fontSize: '0.9rem', wordWrap: 'break-word' }}>
            {transcription}
          </p>
        </div>
      )}

      {extractedFields && Object.keys(extractedFields).length > 0 && (
        <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#f3e5f5', borderRadius: '4px' }}>
          <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>🎯 Extracted Fields</p>
          <ul style={{ margin: '0', paddingLeft: '1rem', fontSize: '0.9rem' }}>
            {Object.entries(extractedFields).map(([key, value]) => (
              <li key={key}>
                <strong>{key}:</strong> {String(value)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p style={{ marginTop: '0.5rem', color: '#d32f2f' }}>
          {error}
        </p>
      )}
    </div>
  );
}
