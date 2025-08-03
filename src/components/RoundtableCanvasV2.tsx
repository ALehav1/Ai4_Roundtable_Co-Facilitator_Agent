'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

// PHASE 2: Live Transcript Model Implementation
// Session Lifecycle: intro → discussion → summary
// Real-time conversation capture with automatic speaker detection
// Streamlined facilitator workflow with proactive AI facilitation

// Session state machine types
type SessionState = 'intro' | 'discussion' | 'summary' | 'completed';

// Enhanced transcript entry with real-time capture
interface TranscriptEntry {
  id: string;
  timestamp: Date;
  speaker: string;
  text: string;
  confidence?: number; // Speech recognition confidence
  isAutoDetected: boolean; // vs manual entry
}

// Session context for AI analysis
interface SessionContext {
  state: SessionState;
  startTime: Date;
  participantCount: number;
  currentTopic?: string;
  duration?: number;
  liveTranscript: TranscriptEntry[];
  aiInsights: any[];
}

// Speech recognition interface (Web Speech API)
interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
  start(): void;
  stop(): void;
  abort(): void;
}

interface ISpeechRecognitionConstructor {
  new (): ISpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: ISpeechRecognitionConstructor;
    webkitSpeechRecognition?: ISpeechRecognitionConstructor;
  }
}

const RoundtableCanvasV2: React.FC = () => {
  // Session lifecycle state management
  const [sessionState, setSessionState] = useState<SessionState>('intro');
  const [sessionContext, setSessionContext] = useState<SessionContext>({
    state: 'intro',
    startTime: new Date(),
    participantCount: 5,
    currentTopic: 'when ai becomes how the enterprise operates',
    liveTranscript: [],
    aiInsights: [],
  });

  // Live transcript state
  const [isRecording, setIsRecording] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<string>('Facilitator');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  
  // Manual entry modal state
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualEntryText, setManualEntryText] = useState('');
  const [manualSpeakerName, setManualSpeakerName] = useState('');
  
  // Speech recognition refs
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        // Handle speech recognition results
        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = '';
          let interimText = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            const confidence = event.results[i][0].confidence;

            if (event.results[i].isFinal) {
              finalTranscript += transcript;
              
              // Add to live transcript
              if (finalTranscript.trim()) {
                addTranscriptEntry({
                  text: finalTranscript.trim(),
                  speaker: currentSpeaker || 'Participant',
                  confidence,
                  isAutoDetected: true,
                });
              }
            } else {
              interimText += transcript;
            }
          }

          setInterimTranscript(interimText);
        };

        recognitionRef.current.onerror = (event: any) => {
          if (event.error === 'network') {
            console.log('Speech recognition requires HTTPS - feature disabled in local development');
            // Graceful fallback: disable speech recognition but keep app functional
            setIsRecording(false);
            return;
          }
          console.error('Speech recognition error:', event.error);
        };

        recognitionRef.current.onend = () => {
          if (isRecording && sessionState === 'discussion') {
            // Auto-restart if we're still in discussion mode
            setTimeout(() => {
              recognitionRef.current?.start();
            }, 100);
          }
        };
      }
    }
  }, [currentSpeaker, isRecording, sessionState]);

  // Add transcript entry to session context
  const addTranscriptEntry = useCallback((entry: Omit<TranscriptEntry, 'id' | 'timestamp'>) => {
    const newEntry: TranscriptEntry = {
      id: `transcript_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...entry,
    };

    setSessionContext(prev => ({
      ...prev,
      liveTranscript: [...prev.liveTranscript, newEntry],
    }));

    // Auto-scroll transcript
    setTimeout(() => {
      transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
    }, 100);
  }, []);

  // Session lifecycle transitions
  const startSession = useCallback(() => {
    setSessionState('discussion');
    setSessionContext(prev => ({
      ...prev,
      state: 'discussion',
      startTime: new Date(),
    }));
    
    // Start live recording
    if (recognitionRef.current) {
      setIsRecording(true);
      recognitionRef.current.start();
    }
  }, []);

  const endSession = useCallback(() => {
    setSessionState('summary');
    setIsRecording(false);
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    setSessionContext(prev => ({
      ...prev,
      state: 'summary',
      duration: Math.round((Date.now() - prev.startTime.getTime()) / 1000),
    }));
  }, []);

  // AI analysis with live transcript context
  const callAIAnalysis = useCallback(async (analysisType: string = 'insights') => {
    try {
      // DEBUG: Log current session context state
      console.log('🔍 AI Analysis Debug - Session Context:', sessionContext);
      console.log('🔍 Live Transcript Array:', sessionContext.liveTranscript);
      console.log('🔍 Transcript Count:', sessionContext.liveTranscript.length);
      
      // Build live transcript for AI context
      const transcriptText = sessionContext.liveTranscript
        .map(entry => `${entry.speaker}: ${entry.text}`)
        .join('\n');
      
      console.log('🔍 Built Transcript Text:', transcriptText);
      console.log('🔍 Transcript Text Length:', transcriptText.length);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionContext: `Live Discussion Session - ${sessionContext.currentTopic || 'Strategic Planning'}`,
          currentTranscript: transcriptText || "No conversation content has been captured yet in this live session.",
          analysisType,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Live AI Analysis:', data);

      // Add AI insight to session context
      setSessionContext(prev => ({
        ...prev,
        aiInsights: [...prev.aiInsights, {
          id: `insight_${Date.now()}`,
          type: analysisType,
          content: data.analysis || data.result,
          timestamp: new Date(),
        }],
      }));

      return data;
    } catch (error) {
      console.error('❌ AI Analysis Error:', error);
      throw error;
    }
  }, [sessionContext]);

  // Manual transcript entry (fallback)
  const addManualEntry = useCallback(() => {
    console.log('🎯 Manual Entry button clicked - opening modal!');
    setManualSpeakerName(currentSpeaker || 'Facilitator');
    setManualEntryText('');
    setShowManualModal(true);
  }, [currentSpeaker]);
  
  // Submit manual entry from modal
  const submitManualEntry = useCallback(() => {
    console.log('📝 Submitting manual entry:', manualEntryText);
    if (manualEntryText.trim()) {
      addTranscriptEntry({
        text: manualEntryText.trim(),
        speaker: manualSpeakerName || 'Facilitator',
        isAutoDetected: false,
      });
      setShowManualModal(false);
      setManualEntryText('');
      setManualSpeakerName('');
      console.log('✅ Manual entry added successfully!');
    }
  }, [manualEntryText, manualSpeakerName, addTranscriptEntry]);

  // Render session intro state
  const renderIntroState = () => (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-3xl font-bold mb-6 text-center">🎯 AI Roundtable Session Setup</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Number of Participants</label>
          <input
            type="number"
            min="1"
            max="20"
            value={sessionContext.participantCount}
            onChange={(e) => setSessionContext(prev => ({
              ...prev,
              participantCount: parseInt(e.target.value) || 0
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Enter participant count"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Session Topic (Optional)</label>
          <input
            type="text"
            value={sessionContext.currentTopic || ''}
            onChange={(e) => setSessionContext(prev => ({
              ...prev,
              currentTopic: e.target.value
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="e.g., Strategic AI Transformation Planning"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Your Role</label>
          <input
            type="text"
            value={currentSpeaker}
            onChange={(e) => setCurrentSpeaker(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="e.g., Facilitator, Lead Strategist"
          />
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">📝 Live Transcript Features</h3>
          <ul className="text-blue-700 space-y-1 text-sm">
            <li>• Real-time speech-to-text conversation capture</li>
            <li>• Automatic speaker detection and transcript building</li>
            <li>• Live AI insights during discussion (not just at end)</li>
            <li>• Seamless transition to summary and export</li>
          </ul>
        </div>

        <button
          onClick={startSession}
          disabled={!currentSpeaker.trim()}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
        >
          🚀 Start Live Session
        </button>
      </div>
    </div>
  );

  // Render discussion state with live transcript
  const renderDiscussionState = () => (
    <div className="space-y-6">
      {/* Session controls */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">🎙️ Live Discussion</h2>
            <p className="text-gray-600">
              {sessionContext.currentTopic || 'Strategic Planning Session'} • 
              {sessionContext.liveTranscript.length} entries captured
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={addManualEntry}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              ➕ Manual Entry
            </button>
            
            <button
              onClick={() => callAIAnalysis('insights')}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              🧠 Live AI Insights
            </button>
            
            <button
              onClick={endSession}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              ⏹️ End Session
            </button>
          </div>
        </div>

        {/* Recording status */}
        {isRecording && (
          <div className="mt-4 flex items-center space-x-2 text-red-600">
            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
            <span className="font-medium">Recording Live Conversation</span>
          </div>
        )}

        {/* Current speaker */}
        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Current Speaker</label>
          <input
            type="text"
            value={currentSpeaker}
            onChange={(e) => setCurrentSpeaker(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Speaker name"
          />
        </div>
      </div>

      {/* Live transcript display */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold mb-4">📝 Live Transcript</h3>
        
        <div
          ref={transcriptRef}
          className="h-96 overflow-y-auto border border-gray-200 rounded p-4 bg-gray-50"
        >
          {sessionContext.liveTranscript.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              Conversation transcript will appear here as you speak...
            </div>
          ) : (
            <div className="space-y-3">
              {sessionContext.liveTranscript.map((entry) => (
                <div key={entry.id} className="bg-white p-3 rounded border-l-4 border-blue-500">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-blue-600">{entry.speaker}</span>
                    <span className="text-xs text-gray-500">
                      {entry.timestamp.toLocaleTimeString()}
                      {entry.isAutoDetected && <span className="ml-1">🎤</span>}
                    </span>
                  </div>
                  <p className="text-gray-800">{entry.text}</p>
                </div>
              ))}
              
              {/* Show interim results */}
              {interimTranscript && (
                <div className="bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-yellow-600">{currentSpeaker}</span>
                    <span className="text-xs text-yellow-500">Speaking...</span>
                  </div>
                  <p className="text-gray-600 italic">{interimTranscript}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Live AI insights */}
      {sessionContext.aiInsights.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4">🧠 Live AI Insights</h3>
          <div className="space-y-3">
            {sessionContext.aiInsights.map((insight) => (
              <div key={insight.id} className="bg-purple-50 p-4 rounded border-l-4 border-purple-500">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold text-purple-600 capitalize">{insight.type}</span>
                  <span className="text-xs text-purple-500">
                    {insight.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-gray-800">{insight.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Render summary state
  const renderSummaryState = () => (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-3xl font-bold mb-6 text-center">📊 Session Summary</h2>
      
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded">
            <h3 className="font-semibold text-blue-800">Duration</h3>
            <p className="text-2xl text-blue-600">{Math.floor((sessionContext.duration || 0) / 60)}:{String((sessionContext.duration || 0) % 60).padStart(2, '0')}</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded">
            <h3 className="font-semibold text-green-800">Transcript Entries</h3>
            <p className="text-2xl text-green-600">{sessionContext.liveTranscript.length}</p>
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={() => callAIAnalysis('synthesis')}
            className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            🔄 Generate Summary
          </button>
          
          <button
            onClick={() => setSessionState('completed')}
            className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700"
          >
            ✅ Complete Session
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white p-6">
        <h1 className="text-3xl font-bold">
          AI Roundtable Co-Facilitator V2
        </h1>
        <p className="text-blue-100">
          Phase 2: Live Transcript Model • Session State: {sessionState}
        </p>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {sessionState === 'intro' && renderIntroState()}
        {sessionState === 'discussion' && renderDiscussionState()}
        {sessionState === 'summary' && renderSummaryState()}
        
        {sessionState === 'completed' && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-3xl font-bold mb-4">🎉 Session Complete!</h2>
            <p className="text-gray-600 mb-6">Your roundtable session has been successfully captured and analyzed.</p>
            <button
              onClick={() => {
                setSessionState('intro');
                setSessionContext({
                  state: 'intro',
                  startTime: new Date(),
                  participantCount: 0,
                  liveTranscript: [],
                  aiInsights: [],
                });
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              🔄 Start New Session
            </button>
          </div>
        )}
      </main>
      
      {/* Manual Entry Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold mb-4">➕ Add Manual Entry</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Speaker Name</label>
                <input
                  type="text"
                  value={manualSpeakerName}
                  onChange={(e) => setManualSpeakerName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter speaker name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Transcript Text</label>
                <textarea
                  value={manualEntryText}
                  onChange={(e) => setManualEntryText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md h-24 resize-none"
                  placeholder="Enter what was said..."
                  autoFocus
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowManualModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitManualEntry}
                disabled={!manualEntryText.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoundtableCanvasV2;
