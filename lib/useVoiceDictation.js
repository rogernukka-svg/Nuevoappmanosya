'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

function getSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function joinDictationText(baseText, dictatedText) {
  const base = String(baseText || '').trim();
  const dictated = String(dictatedText || '').trim();
  if (!base) return dictated;
  if (!dictated) return base;
  return `${base} ${dictated}`.replace(/\s+/g, ' ').trim();
}

export function useVoiceDictation({ onTextChange, onInterimTextChange } = {}) {
  const recognitionRef = useRef(null);
  const baseTextRef = useRef('');
  const finalTextRef = useRef('');
  const onTextChangeRef = useRef(onTextChange);
  const onInterimTextChangeRef = useRef(onInterimTextChange);

  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    onTextChangeRef.current = onTextChange;
    onInterimTextChangeRef.current = onInterimTextChange;
  }, [onTextChange, onInterimTextChange]);

  useEffect(() => {
    setIsSupported(Boolean(getSpeechRecognition()));

    return () => {
      try {
        recognitionRef.current?.abort?.();
      } catch {}
      recognitionRef.current = null;
    };
  }, []);

  const stopDictation = useCallback(() => {
    try {
      recognitionRef.current?.stop?.();
    } catch {}
    setIsListening(false);
  }, []);

  const startDictation = useCallback(({ currentText = '' } = {}) => {
    const Recognition = getSpeechRecognition();

    if (!Recognition) {
      setSpeechError('Tu navegador no permite dictado por voz.');
      setIsSupported(false);
      return false;
    }

    try {
      recognitionRef.current?.abort?.();
    } catch {}

    setSpeechError('');
    setIsSupported(true);
    baseTextRef.current = String(currentText || '').trim();
    finalTextRef.current = '';

    const recognition = new Recognition();
    recognition.lang = 'es-PY';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index]?.[0]?.transcript || '';

        if (event.results[index]?.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript.trim()) {
        finalTextRef.current = joinDictationText(finalTextRef.current, finalTranscript);
      }

      const nextText = joinDictationText(
        baseTextRef.current,
        joinDictationText(finalTextRef.current, interimTranscript)
      );

      onTextChangeRef.current?.(nextText);
      onInterimTextChangeRef.current?.(nextText);
    };

    recognition.onerror = (event) => {
      const error = event?.error || '';
      const messages = {
        'not-allowed': 'Permiso de micrófono denegado.',
        'service-not-allowed': 'El navegador bloqueó el dictado por voz.',
        'no-speech': 'No escuché nada. Probá de nuevo.',
        aborted: 'Dictado cancelado.',
        network: 'No se pudo conectar el dictado por voz.',
      };

      setSpeechError(messages[error] || 'No se pudo usar el dictado por voz.');
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      return true;
    } catch {
      setSpeechError('No se pudo iniciar el dictado por voz.');
      setIsListening(false);
      recognitionRef.current = null;
      return false;
    }
  }, []);

  return {
    isListening,
    isSupported,
    speechError,
    startDictation,
    stopDictation,
    clearSpeechError: () => setSpeechError(''),
  };
}
