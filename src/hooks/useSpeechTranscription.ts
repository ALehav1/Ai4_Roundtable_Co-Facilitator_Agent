/**
 * Modular Speech Transcription Hook
 * 
 * Provides a unified API for different speech recognition engines:
 * - Layer A: Native Web Speech API (Chrome/Edge, low latency)
 * - Layer B: Whisper chunked serverless (universal fallback)
 * - Layer C: Deepgram streaming (premium/opt-in)
 * 
 * Auto-selects best available engine based on browser support and configuration.
 */

import { useState, useCallback, useRef } from 'react';

// Types
export interface TranscriptEvent {
  text: string;
  isPartial?: boolean;
  confidence?: number;
  timestamp: Date;
}

export interface SpeechEngine {
  start(): Promise<void>;
  stop(): Promise<void>;
  isSupported(): boolean;
  onPartial(callback: (event: TranscriptEvent) => void): void;
  onFinal(callback: (event: TranscriptEvent) => void): void;
  onError(callback: (error: string) => void): void;
}

export interface UseSpeechTranscriptionReturn {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  isSupported: boolean;
  isListening: boolean;
  currentEngine: string;
  onPartial: (callback: (event: TranscriptEvent) => void) => void;
  onFinal: (callback: (event: TranscriptEvent) => void) => void;
  onError: (callback: (error: string) => void) => void;
}

export function useSpeechTranscription(): UseSpeechTranscriptionReturn {
  const [isListening, setIsListening] = useState(false);
  const [currentEngine, setCurrentEngine] = useState<string>('none');
  const engineRef = useRef<SpeechEngine | null>(null);
  
  // Engine selection logic
  const selectEngine = useCallback((): SpeechEngine => {
    const canNative = typeof window !== 'undefined' && 
                     window.isSecureContext && 
                     'webkitSpeechRecognition' in window;
    
    const engineType = process.env.NEXT_PUBLIC_SPEECH_ENGINE ?? 'auto';
    
    console.log('🎤 Speech Engine Selection:', {
      engineType,
      canNative,
      isSecureContext: typeof window !== 'undefined' ? window.isSecureContext : false,
      hasWebkitSpeech: typeof window !== 'undefined' ? 'webkitSpeechRecognition' in window : false
    });

    // Explicit engine override
    if (engineType === 'deepgram') {
      setCurrentEngine('deepgram');
      return createDeepgramEngine();
    }
    
    if (engineType === 'whisper') {
      setCurrentEngine('whisper');
      return createWhisperEngine();
    }
    
    // Auto-selection
    if (canNative && engineType !== 'whisper') {
      setCurrentEngine('native');
      return createWebSpeechEngine();
    }
    
    // Fallback to Whisper
    setCurrentEngine('whisper');
    return createWhisperEngine();
  }, []);

  // Initialize engine
  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = selectEngine();
    }
    return engineRef.current;
  }, [selectEngine]);

  // Public API
  const start = useCallback(async () => {
    const engine = getEngine();
    await engine.start();
    setIsListening(true);
  }, [getEngine]);

  const stop = useCallback(async () => {
    const engine = getEngine();
    await engine.stop();
    setIsListening(false);
  }, [getEngine]);

  const isSupported = getEngine().isSupported();

  const onPartial = useCallback((callback: (event: TranscriptEvent) => void) => {
    getEngine().onPartial(callback);
  }, [getEngine]);

  const onFinal = useCallback((callback: (event: TranscriptEvent) => void) => {
    getEngine().onFinal(callback);
  }, [getEngine]);

  const onError = useCallback((callback: (error: string) => void) => {
    getEngine().onError(callback);
  }, [getEngine]);

  return {
    start,
    stop,
    isSupported,
    isListening,
    currentEngine,
    onPartial,
    onFinal,
    onError,
  };
}

// Engine Implementations
function createWebSpeechEngine(): SpeechEngine {
  let recognition: any = null;
  let restartTimer: NodeJS.Timeout | null = null;
  let partialCallback: ((event: TranscriptEvent) => void) | null = null;
  let finalCallback: ((event: TranscriptEvent) => void) | null = null;
  let errorCallback: ((error: string) => void) | null = null;
  let networkErrorCount = 0;
  const MAX_NETWORK_ERRORS = 3;

  const isSupported = () => {
    return typeof window !== 'undefined' && 
           window.isSecureContext && 
           'webkitSpeechRecognition' in window;
  };

  const start = async () => {
    if (!isSupported()) {
      throw new Error('Web Speech API not supported');
    }

    recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;

        const transcriptEvent: TranscriptEvent = {
          text: transcript,
          isPartial: !result.isFinal,
          confidence,
          timestamp: new Date(),
        };

        if (result.isFinal && finalCallback) {
          finalCallback(transcriptEvent);
        } else if (!result.isFinal && partialCallback) {
          partialCallback(transcriptEvent);
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error('🎤 Native Speech Recognition Error:', event.error);
      console.log('🔍 DEBUG - Error Event Details:', {
        error: event.error,
        type: typeof event.error,
        networkErrorCount: networkErrorCount,
        hasRestartTimer: !!restartTimer,
        restartTimerId: restartTimer
      });
      
      const errorMessages: Record<string, string> = {
        'not-allowed': 'Microphone permission denied. Please allow microphone access.',
        'audio-capture': 'No microphone found. Please check your audio devices.',
        'no-speech': 'No speech detected. Please speak clearly into your microphone.',
        'network': 'Network error. Speech recognition requires HTTPS connection.',
        'service-not-allowed': 'Speech recognition service not available.',
      };

      const errorMessage = errorMessages[event.error] || `Speech recognition error: ${event.error}`;
      
      // Track network errors and stop infinite restart loop
      if (event.error === 'network') {
        networkErrorCount++;
        console.warn(`🎤 Network error ${networkErrorCount}/${MAX_NETWORK_ERRORS}`);
        console.log('🔍 DEBUG - About to check if networkErrorCount >= MAX_NETWORK_ERRORS');
        
        if (networkErrorCount >= MAX_NETWORK_ERRORS) {
          console.error('🎤 Too many network errors, stopping speech recognition');
          console.log('🔍 DEBUG - Clearing restart timer, current timer:', restartTimer);
          // Stop the restart timer to prevent infinite loop
          if (restartTimer) {
            clearInterval(restartTimer);
            restartTimer = null;
            console.log('🔍 DEBUG - Restart timer cleared successfully');
          } else {
            console.log('🔍 DEBUG - No restart timer to clear');
          }
          if (errorCallback) {
            errorCallback('Speech recognition unavailable. Network errors detected. Please use manual entry or Whisper fallback.');
          }
          console.log('🔍 DEBUG - Returning early after max network errors');
          return;
        }
      } else {
        console.log(`🔍 DEBUG - Non-network error: ${event.error}, not incrementing counter`);
      }
      
      if (errorCallback) {
        errorCallback(errorMessage);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still supposed to be listening (avoid 60s timeout)
      if (restartTimer) {
        console.log('🔄 Auto-restarting speech recognition...');
        recognition.start();
      }
    };

    recognition.start();

    // Set up auto-restart timer (every 45 seconds to avoid 60s limit)
    restartTimer = setInterval(() => {
      if (recognition) {
        recognition.stop(); // Will trigger restart in onend
      }
    }, 45000);
  };

  const stop = async () => {
    if (restartTimer) {
      clearInterval(restartTimer);
      restartTimer = null;
    }
    if (recognition) {
      recognition.stop();
      recognition = null;
    }
  };

  const onPartial = (callback: (event: TranscriptEvent) => void) => {
    partialCallback = callback;
  };

  const onFinal = (callback: (event: TranscriptEvent) => void) => {
    finalCallback = callback;
  };

  const onError = (callback: (error: string) => void) => {
    errorCallback = callback;
  };

  return { start, stop, isSupported, onPartial, onFinal, onError };
}

function createWhisperEngine(): SpeechEngine {
  let mediaRecorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let chunkInterval: NodeJS.Timeout | null = null;
  let partialCallback: ((event: TranscriptEvent) => void) | null = null;
  let finalCallback: ((event: TranscriptEvent) => void) | null = null;
  let errorCallback: ((error: string) => void) | null = null;

  const isSupported = () => {
    return typeof window !== 'undefined' && 
           'MediaRecorder' in window && 
           navigator.mediaDevices && 
           typeof navigator.mediaDevices.getUserMedia === 'function';
  };

  const start = async () => {
    if (!isSupported()) {
      throw new Error('MediaRecorder not supported');
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const options = { 
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000 
      };
      
      mediaRecorder = new MediaRecorder(stream, options);
      
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          await processAudioChunk(event.data);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('🎤 MediaRecorder Error:', event);
        if (errorCallback) {
          errorCallback('Audio recording error occurred');
        }
      };

      mediaRecorder.start();
      
      // Request data every 4 seconds
      chunkInterval = setInterval(() => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.requestData();
        }
      }, 4000);

    } catch (error) {
      console.error('🎤 Failed to start Whisper engine:', error);
      if (errorCallback) {
        errorCallback('Failed to access microphone');
      }
    }
  };

  const processAudioChunk = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.text && data.text.trim()) {
        const transcriptEvent: TranscriptEvent = {
          text: data.text.trim(),
          isPartial: false,
          timestamp: new Date(),
        };

        if (finalCallback) {
          finalCallback(transcriptEvent);
        }
      }
    } catch (error) {
      console.error('🎤 Whisper transcription error:', error);
      if (errorCallback) {
        errorCallback('Transcription service error');
      }
    }
  };

  const stop = async () => {
    if (chunkInterval) {
      clearInterval(chunkInterval);
      chunkInterval = null;
    }
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
    mediaRecorder = null;
  };

  const onPartial = (callback: (event: TranscriptEvent) => void) => {
    partialCallback = callback;
  };

  const onFinal = (callback: (event: TranscriptEvent) => void) => {
    finalCallback = callback;
  };

  const onError = (callback: (error: string) => void) => {
    errorCallback = callback;
  };

  return { start, stop, isSupported, onPartial, onFinal, onError };
}

function createDeepgramEngine(): SpeechEngine {
  // TODO: Implement Deepgram WebSocket streaming
  // For now, return a stub that falls back to Whisper
  console.log('🎤 Deepgram engine not yet implemented, falling back to Whisper');
  return createWhisperEngine();
}
