'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface TranscriptEvent {
  text: string;
  isFinal: boolean;
  confidence: number;
}

interface SpeechTranscriptionHook {
  isListening: boolean;
  isSupported: boolean;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  error: string | null;
}

export const useSpeechTranscription = (
  onPartial?: (text: string) => void,
  onFinal?: (event: TranscriptEvent) => void,
  onError?: (error: string) => void
): SpeechTranscriptionHook => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout>();
  const silenceTimeoutRef = useRef<NodeJS.Timeout>();
  const shouldBeListeningRef = useRef(false);

  useEffect(() => {
    const supported = typeof window !== 'undefined' && 
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    setIsSupported(supported);
  }, []);

  const initializeRecognition = useCallback(() => {
    if (!isSupported) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('Speech recognition started');
      setIsListening(true);
      setError(null);
      startSilenceTimeout();
    };

    recognition.onresult = (event: any) => {
      clearSilenceTimeout();
      
      const results = event.results;
      const currentResult = results[results.length - 1];
      
      if (currentResult.isFinal) {
        const finalText = currentResult[0].transcript;
        const confidence = currentResult[0].confidence;
        
        if (onFinal) {
          onFinal({
            text: finalText,
            isFinal: true,
            confidence: confidence || 0.9
          });
        }
        
        startSilenceTimeout();
      } else {
        const interimText = currentResult[0].transcript;
        if (onPartial) {
          onPartial(interimText);
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.log('Speech recognition error:', event.error);
      
      // DO NOT SHOW MODAL - Just handle gracefully
      switch (event.error) {
        case 'no-speech':
          // Just wait, don't show error
          setError('Listening...');
          scheduleRestart();
          break;
        case 'audio-capture':
          setError('Microphone not found');
          break;
        case 'not-allowed':
          setError('Microphone access denied');
          break;
        case 'network':
          setError('Connection issue');
          scheduleRestart();
          break;
        default:
          setError(null);
          scheduleRestart();
      }
      
      // DO NOT call onError for minor issues
      if (['not-allowed', 'audio-capture'].includes(event.error) && onError) {
        onError(event.error);
      }
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      setIsListening(false);
      
      // Auto-restart if we should still be listening
      if (shouldBeListeningRef.current) {
        scheduleRestart();
      }
    };

    recognitionRef.current = recognition;
  }, [isSupported, onPartial, onFinal, onError]);

  const scheduleRestart = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }
    
    restartTimeoutRef.current = setTimeout(() => {
      if (shouldBeListeningRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.log('Restart attempt failed, will retry...');
          scheduleRestart();
        }
      }
    }, 1000);
  }, []);

  const startSilenceTimeout = useCallback(() => {
    clearSilenceTimeout();
    
    // Restart before browser 60-second limit
    silenceTimeoutRef.current = setTimeout(() => {
      if (shouldBeListeningRef.current && recognitionRef.current) {
        console.log('Preventing browser timeout with restart...');
        recognitionRef.current.stop();
        // Will auto-restart via onend
      }
    }, 45000);
  }, []);

  const clearSilenceTimeout = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = undefined;
    }
  }, []);

  const start = useCallback(async () => {
    if (!isSupported) {
      setError('Speech recognition not supported');
      return;
    }

    shouldBeListeningRef.current = true;
    
    if (!recognitionRef.current) {
      initializeRecognition();
    }

    try {
      await recognitionRef.current?.start();
    } catch (error: any) {
      if (error.message?.includes('already started')) {
        // Already running, that's fine
        console.log('Recognition already running');
      } else {
        console.error('Failed to start recognition:', error);
        setError('Failed to start microphone');
      }
    }
  }, [isSupported, initializeRecognition]);

  const stop = useCallback(async () => {
    shouldBeListeningRef.current = false;
    
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }
    clearSilenceTimeout();
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.log('Stop error (non-critical):', error);
      }
    }
    
    setIsListening(false);
    setError(null);
  }, [clearSilenceTimeout]);

  useEffect(() => {
    return () => {
      shouldBeListeningRef.current = false;
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          // Cleanup error, ignore
        }
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    start,
    stop,
    error
  };
};
