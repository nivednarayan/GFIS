import React, { useRef, useState } from 'react';
import api from '../services/api';

function AudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileKey, setFileKey] = useState('');
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);

  const stopStreamTracks = () => {
    if (!mediaStreamRef.current) return;

    mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  const startRecording = async () => {
    setError('');
    setFileKey('');

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

        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/wav',
        });

        const { fileKey: uploadedFileKey } = await api.uploadAudioFile(audioBlob);
        setFileKey(uploadedFileKey);
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
        <button type="button" onClick={startRecording} disabled={isUploading}>
          Start Recording
        </button>
      ) : (
        <button type="button" onClick={stopRecording}>
          Stop Recording
        </button>
      )}

      {isRecording && <p style={{ marginTop: '0.5rem' }}>Recording...</p>}
      {isUploading && <p style={{ marginTop: '0.5rem' }}>Uploading...</p>}

      {fileKey && (
        <p style={{ marginTop: '0.5rem' }}>
          Upload successful. File key: <strong>{fileKey}</strong>
        </p>
      )}

      {error && (
        <p style={{ marginTop: '0.5rem', color: '#d32f2f' }}>
          {error}
        </p>
      )}
    </div>
  );
}

export default AudioRecorder;
