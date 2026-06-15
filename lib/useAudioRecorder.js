import { useRef, useState } from 'react';
import { getSupportedAudioMimeType } from '@/lib/chatAudio';

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartedAt, setRecordingStartedAt] = useState(0);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  async function startRecording() {
    if (isRecording) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Tu navegador no permite grabar audio');
    }
    if (typeof MediaRecorder === 'undefined') {
      throw new Error('Tu navegador no soporta grabacion de audio');
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = getSupportedAudioMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

    chunksRef.current = [];
    streamRef.current = stream;
    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data?.size) chunksRef.current.push(event.data);
    };

    recorder.start();
    setRecordingStartedAt(Date.now());
    setIsRecording(true);
  }

  async function stopRecording() {
    const recorder = recorderRef.current;
    if (!recorder) return null;

    const startedAt = recordingStartedAt || Date.now();

    const result = await new Promise((resolve, reject) => {
      recorder.onstop = () => {
        const type = recorder.mimeType || getSupportedAudioMimeType() || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        resolve({
          blob,
          durationMs: Date.now() - startedAt,
          mimeType: type,
        });
      };

      recorder.onerror = () => reject(new Error('No se pudo grabar el audio'));
      recorder.stop();
    });

    streamRef.current?.getTracks?.().forEach((track) => track.stop());
    recorderRef.current = null;
    streamRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    setRecordingStartedAt(0);

    return result;
  }

  function cancelRecording() {
    try {
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    } catch {}

    streamRef.current?.getTracks?.().forEach((track) => track.stop());
    recorderRef.current = null;
    streamRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    setRecordingStartedAt(0);
  }

  return {
    isRecording,
    recordingStartedAt,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
