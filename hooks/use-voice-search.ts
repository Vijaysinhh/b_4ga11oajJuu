'use client';

import { useState, useEffect, useRef } from 'react';

interface UseVoiceSearchOptions {
  language?: 'en-US' | 'mr-IN';
}

export function useVoiceSearch(options: UseVoiceSearchOptions = {}) {
  const { language = 'en-US' } = options;
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const shouldKeepListeningRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          setTranscript((prev) => (prev ? prev + ' ' + transcript : transcript));
        } else {
          interimTranscript += transcript;
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error('[Dukan] Speech recognition error:', event.error);
    };

    recognition.onend = () => {
      if (shouldKeepListeningRef.current) {
        try {
          recognition.start();
        } catch {
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldKeepListeningRef.current = false;
      recognition.abort();
    };
  }, [language]);

  const startListening = () => {
    if (recognitionRef.current) {
      shouldKeepListeningRef.current = true;
      setTranscript('');
      try {
        recognitionRef.current.start();
      } catch {
        setIsListening(true);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      shouldKeepListeningRef.current = false;
      recognitionRef.current.stop();
    }
  };

  const resetTranscript = () => {
    setTranscript('');
  };

  return {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
}
