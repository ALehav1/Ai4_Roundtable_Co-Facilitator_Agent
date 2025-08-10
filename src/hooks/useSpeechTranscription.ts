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
      console.log('🚨 Speech recognition error:', event.error);
      
      // FIXED: Improved error handling to reduce fragmentation
      switch (event.error) {
        case 'no-speech':
          // FIXED: Don't restart immediately, just continue listening
          console.log('⏳ No speech detected, continuing to listen...');
          setError(null); // Don't show "Listening..." error
          // No restart - let natural flow continue
          break;
        case 'audio-capture':
          setError('Microphone not found - check device settings');
          shouldBeListeningRef.current = false; // Stop trying
          break;
        case 'not-allowed':
          setError('Microphone access denied - please allow and refresh');
          shouldBeListeningRef.current = false; // Stop trying
          break;
        case 'network':
          console.log('🌐 Network issue, will retry gracefully...');
          setError('Connection issue - retrying...');
          // FIXED: Delay restart longer to prevent rapid cycling
          setTimeout(() => {
            if (shouldBeListeningRef.current) {
              scheduleRestart();
            }
          }, 3000); // 3 second delay instead of immediate
          break;
        case 'aborted':
          // FIXED: Handle user-initiated stops gracefully
          console.log('🛑 Recognition aborted (user stop)');
          setError(null);
          // Don't restart if user stopped intentionally
          break;
        default:
          console.log('🔧 Minor error, continuing...');
          setError(null);
          // FIXED: Only restart for truly critical errors, not minor ones
          if (shouldBeListeningRef.current) {
            setTimeout(() => scheduleRestart(), 2000);
          }
      }
      
      // FIXED: Only trigger onError callback for critical access issues
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
    // FIXED: Clear any existing restart to prevent competing restarts
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }
    
    // FIXED: Only schedule restart if we should be listening and aren't already
    if (!shouldBeListeningRef.current || isListening) {
      console.log('🔄 Skipping restart - not needed');
      return;
    }
    
    restartTimeoutRef.current = setTimeout(() => {
      if (shouldBeListeningRef.current && recognitionRef.current && !isListening) {
        try {
          console.log('🔄 Attempting graceful restart...');
          recognitionRef.current.start();
        } catch (error) {
          console.log('⚠️ Restart attempt failed, will retry in 2s...');
          // FIXED: Longer delay on failed restart to prevent rapid cycling
          setTimeout(() => {
            if (shouldBeListeningRef.current) {
              scheduleRestart();
            }
          }, 2000);
        }
      }
    }, 1500); // Slightly longer delay for more stable restarts
  }, [isListening]);

  const startSilenceTimeout = useCallback(() => {
    clearSilenceTimeout();
    
    // FIXED: Extend timeout to reduce fragmentation (55 seconds instead of 45)
    // Only restart after true silence, not during active speech
    silenceTimeoutRef.current = setTimeout(() => {
      if (shouldBeListeningRef.current && recognitionRef.current) {
        console.log('🔄 Graceful restart after prolonged silence...');
        recognitionRef.current.stop();
        // Will auto-restart via onend - but only if truly needed
      }
    }, 55000); // Increased from 45s to 55s for less fragmentation
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
