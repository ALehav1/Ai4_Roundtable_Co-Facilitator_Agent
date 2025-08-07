'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { sessionConfig, uiText, roundtableQuestions, getCurrentQuestion, getTotalQuestions } from '../config/roundtable-config';
import { useSpeechTranscription, TranscriptEvent } from '../hooks/useSpeechTranscription';
import { saveSession, loadSession, SessionSnapshot, SessionTemplate } from '../utils/storage';
import { sessionPresets, getPresetById, presetToTranscriptEntries } from '../config/session-presets';
import { generateSessionPDF, prepareSessionDataForExport } from '../utils/pdfExport';
import { checkFeature } from '../config/feature-flags';
import { TemplateModal } from './TemplateModal';
import FacilitatorPanel from './FacilitatorPanel';

// Types
type SessionState = 'idle' | 'intro' | 'discussion' | 'summary' | 'completed';

interface TranscriptEntry {
  id: string;
  timestamp: Date;
  speaker?: string;
  text: string;
  confidence?: number;
  isAutoDetected: boolean;
}

interface SessionContext {
  facilitator: string;
  topic: string;
  state: SessionState;
  startTime: Date;
  currentTopic?: string;
  duration?: number;
  liveTranscript: TranscriptEntry[];
  keyThemes: string[];
  aiInsights: any[];
  followupQuestions: string[];
  crossReferences: string[];
  sessionSummary: string;
  currentQuestionIndex: number;
  questionStartTime?: Date;
  agendaProgress: {
    [questionId: string]: {
      completed: boolean;
      timeSpent: number;
      insights: number;
    };
  };
}

const RoundtableCanvasV2: React.FC = () => {
  // Core State
  const [sessionState, setSessionState] = useState<SessionState>('intro');
  const [sessionContext, setSessionContext] = useState<SessionContext>({
    state: 'intro',
    startTime: new Date(),
    facilitator: 'facilitator',
    topic: sessionConfig.title,
    currentTopic: sessionConfig.title,
    liveTranscript: [],
    aiInsights: [],
    keyThemes: [],
    followupQuestions: [],
    crossReferences: [],
    sessionSummary: '',
    currentQuestionIndex: 0,
    questionStartTime: undefined,
    agendaProgress: {}
  });

  // UI State
  const [showFacilitatorPanel, setShowFacilitatorPanel] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<string>('Facilitator');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualEntryText, setManualEntryText] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('blank_template');
  const [isExporting, setIsExporting] = useState(false);
  const [activeAITab, setActiveAITab] = useState<'insights' | 'questions' | 'synthesis'>('insights');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateModalMode, setTemplateModalMode] = useState<'save' | 'load' | 'manage' | 'create'>('save');

  // Refs and Hooks
  const speechTranscription = useSpeechTranscription();
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Setup speech transcription
  useEffect(() => {
    speechTranscription.onPartial((event: TranscriptEvent) => {
      setInterimTranscript(event.text);
    });

    speechTranscription.onFinal((event: TranscriptEvent) => {
      if (event.text.trim()) {
        addTranscriptEntry({
          text: event.text.trim(),
          confidence: event.confidence,
          isAutoDetected: true,
        });
        setInterimTranscript('');
      }
    });

    speechTranscription.onError((error: string) => {
      console.error('Speech Recognition Error:', error);
      setIsRecording(false);
    });
  }, [speechTranscription]);

  // Core Functions
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
  }, []);

  const startSession = useCallback(() => {
    setSessionState('discussion');
    setSessionContext(prev => ({
      ...prev,
      state: 'discussion',
      startTime: new Date(),
    }));
  }, []);

  const endSession = useCallback(async () => {
    setSessionState('summary');
    setIsRecording(false);
    
    if (speechTranscription.isListening) {
      await speechTranscription.stop();
    }

    setSessionContext(prev => ({
      ...prev,
      state: 'summary',
      duration: Math.round((Date.now() - prev.startTime.getTime()) / 1000),
    }));
  }, [speechTranscription]);

  const callAIAnalysis = useCallback(async (analysisType: string = 'insights') => {
    try {
      const transcriptText = sessionContext.liveTranscript
        .map(entry => entry.text)
        .join('\n');

      const response = await fetch('/api/analyze-live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionTopic: sessionContext.currentTopic || 'Strategic Planning Session',
          liveTranscript: transcriptText || 'No conversation content yet.',
          analysisType: analysisType,
          participantCount: 1,
          clientId: 'live-session'
        })
      });

      if (response.ok) {
        const result = await response.json();
        const newInsight = {
          id: `insight_${Date.now()}`,
          type: analysisType,
          content: result.content || result.summary || '',
          timestamp: new Date(),
          confidence: result.confidence || 0.85,
        };
        
        setSessionContext(prev => ({
          ...prev,
          aiInsights: [...prev.aiInsights, newInsight]
        }));
      }
    } catch (error) {
      console.error('AI Analysis Error:', error);
    }
  }, [sessionContext.liveTranscript, sessionContext.currentTopic]);

  const goToNextQuestion = useCallback(() => {
    const totalQuestions = getTotalQuestions();
    if (sessionContext.currentQuestionIndex < totalQuestions - 1) {
      setSessionContext(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
        questionStartTime: new Date()
      }));
    }
  }, [sessionContext.currentQuestionIndex]);

  const goToPreviousQuestion = useCallback(() => {
    if (sessionContext.currentQuestionIndex > 0) {
      setSessionContext(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex - 1,
        questionStartTime: new Date()
      }));
    }
  }, [sessionContext.currentQuestionIndex]);

  const handleExportPDF = useCallback(async () => {
    if (isExporting) return;
    
    try {
      setIsExporting(true);
      const exportData = prepareSessionDataForExport(sessionContext);
      await generateSessionPDF(exportData);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('PDF export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [sessionContext, isExporting]);

  const toggleRecording = useCallback(() => {
    if (speechTranscription.isListening) {
      speechTranscription.stop();
      setIsRecording(false);
    } else {
      speechTranscription.start();
      setIsRecording(true);
    }
  }, [speechTranscription]);

  const loadPreset = useCallback((presetId: string) => {
    const preset = getPresetById(presetId);
    if (!preset) return;
    
    setSessionContext(prev => ({
      ...prev,
      currentTopic: preset.sessionTopic || prev.currentTopic
    }));
    
    if (preset.facilitatorName) {
      setCurrentSpeaker(preset.facilitatorName);
    }
  }, []);

  // Render Functions
  const renderIntroState = () => (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-6">
            <h1 className="text-3xl font-bold mb-2">{sessionConfig.title}</h1>
            <p className="text-indigo-100">{sessionConfig.description}</p>
          </div>
          
          <div className="p-8">
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Session Template
                </label>
                <select
                  value={selectedPresetId}
                  onChange={(e) => setSelectedPresetId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="blank_template">Start with Blank Session</option>
                  {sessionPresets.map(preset => (
                    <option key={preset.id} value={preset.id}>{preset.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => loadPreset(selectedPresetId)}
                  disabled={!selectedPresetId || selectedPresetId === 'blank_template'}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                >
                  Load Template
                </button>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Session Topic
                </label>
                <input
                  type="text"
                  value={sessionContext.currentTopic || ''}
                  onChange={(e) => setSessionContext(prev => ({
                    ...prev,
                    currentTopic: e.target.value
                  }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter session topic"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Facilitator Name
                </label>
                <input
                  type="text"
                  value={currentSpeaker}
                  onChange={(e) => setCurrentSpeaker(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Your name"
                />
              </div>

              <button
                onClick={startSession}
                disabled={!currentSpeaker.trim()}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 font-medium"
              >
                Launch Session
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDiscussionState = () => {
    const currentQuestion = getCurrentQuestion(sessionContext.currentQuestionIndex);
    const totalQuestions = getTotalQuestions();
    
    return (
      <div className="h-screen flex flex-col">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-6">
          <h2 className="text-2xl font-bold mb-2">
            Phase {sessionContext.currentQuestionIndex + 1}: {currentQuestion?.title || 'Loading...'}
          </h2>
          <p className="text-indigo-100">{currentQuestion?.description || ''}</p>
        </div>
        
        <div className="flex-1 flex">
          <div className="flex-1 p-6 bg-gray-50">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="mb-4 flex gap-3">
                <button
                  onClick={toggleRecording}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    isRecording ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
                  }`}
                >
                  {isRecording ? 'Stop Recording' : 'Start Recording'}
                </button>
                
                <button
                  onClick={() => setShowManualModal(true)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg"
                >
                  Add Manual Entry
                </button>
                
                <button
                  onClick={endSession}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg"
                >
                  End Session
                </button>
              </div>
              
              <div ref={transcriptRef} className="max-h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                {sessionContext.liveTranscript.length === 0 ? (
                  <p className="text-gray-500 italic text-center py-8">
                    No conversation captured yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {sessionContext.liveTranscript.map((entry) => (
                      <div key={entry.id} className="bg-white p-3 rounded border">
                        <p className="text-gray-800">{entry.text}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                
                {interimTranscript && (
                  <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200">
                    <p className="text-gray-700 italic">{interimTranscript}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-4 flex justify-between">
              <button
                onClick={goToPreviousQuestion}
                disabled={sessionContext.currentQuestionIndex === 0}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg disabled:bg-gray-300"
              >
                Previous
              </button>
              
              <span className="text-sm text-gray-600">
                Phase {sessionContext.currentQuestionIndex + 1} of {totalQuestions}
              </span>
              
              <button
                onClick={goToNextQuestion}
                disabled={sessionContext.currentQuestionIndex >= totalQuestions - 1}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:bg-gray-300"
              >
                Next
              </button>
            </div>
          </div>
          
          <div className="w-96 bg-white border-l p-4">
            <h3 className="text-lg font-semibold mb-4">AI Analysis</h3>
            
            <div className="space-y-3 mb-4">
              <button
                onClick={() => callAIAnalysis('insights')}
                disabled={sessionContext.liveTranscript.length === 0}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300"
              >
                Generate Insights
              </button>
              
              <button
                onClick={handleExportPDF}
                disabled={isExporting || sessionContext.liveTranscript.length === 0}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg disabled:bg-gray-300"
              >
                {isExporting ? 'Exporting...' : 'Export PDF'}
              </button>
            </div>
            
            <div className="border-t pt-4">
              {sessionContext.aiInsights.length === 0 ? (
                <p className="text-center text-gray-500">
                  No insights yet
                </p>
              ) : (
                <div className="space-y-3">
                  {sessionContext.aiInsights.map((insight) => (
                    <div key={insight.id} className="bg-gray-50 p-3 rounded">
                      <p className="text-sm">{insight.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSummaryState = () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
        <h2 className="text-3xl font-bold mb-6 text-center">Session Summary</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded">
            <h3 className="font-semibold text-blue-800">Duration</h3>
            <p className="text-2xl text-blue-600">
              {Math.floor((sessionContext.duration || 0) / 60)} minutes
            </p>
          </div>
          
          <div className="bg-green-50 p-4 rounded">
            <h3 className="font-semibold text-green-800">Entries</h3>
            <p className="text-2xl text-green-600">
              {sessionContext.liveTranscript.length}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setSessionState('intro');
            setSessionContext({
              state: 'intro',
              startTime: new Date(),
              facilitator: 'facilitator',
              topic: sessionConfig.title,
              currentTopic: sessionConfig.title,
              liveTranscript: [],
              aiInsights: [],
              keyThemes: [],
              followupQuestions: [],
              crossReferences: [],
              sessionSummary: '',
              currentQuestionIndex: 0,
              agendaProgress: {},
            });
          }}
          className="w-full px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Start New Session
        </button>
      </div>
    </div>
  );

  // Main Render
  return (
    <>
      {sessionState === 'intro' && renderIntroState()}
      {sessionState === 'discussion' && renderDiscussionState()}
      {sessionState === 'summary' && renderSummaryState()}
      
      {/* Manual Entry Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Add Manual Entry</h3>
            
            <textarea
              value={manualEntryText}
              onChange={(e) => setManualEntryText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md h-24"
              placeholder="Enter text..."
            />
            
            <div className="flex space-x-3 mt-4">
              <button
                onClick={() => {
                  setShowManualModal(false);
                  setManualEntryText('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (manualEntryText.trim()) {
                    addTranscriptEntry({
                      text: manualEntryText.trim(),
                      speaker: currentSpeaker,
                      isAutoDetected: false,
                    });
                    setShowManualModal(false);
                    setManualEntryText('');
                  }
                }}
                disabled={!manualEntryText.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RoundtableCanvasV2;
