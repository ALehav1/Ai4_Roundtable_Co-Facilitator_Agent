'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { sessionConfig, uiText, AI_TRANSFORMATION_QUESTIONS, getCurrentQuestion, getTotalQuestions } from '../config/ai-transformation-config';
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
  const [sessionState, setSessionState] = useState<SessionState>('discussion');
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
  const [isRecording, setIsRecording] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualText, setManualText] = useState('');
  const [currentSpeaker, setCurrentSpeaker] = useState('Facilitator');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showFacilitatorPanel, setShowFacilitatorPanel] = useState(true);
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
        {/* Clean header with session title and facilitator toggle */}
        <div className="bg-white shadow-sm border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-3">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {sessionConfig.title || "When AI Becomes How the Enterprise Works"}
                </h1>
                <p className="text-sm text-gray-600">
                  {sessionConfig.description || "Executive roundtable on AI transformation"}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {/* Show current phase name, not "Question 3 of 5" */}
                <div className="text-sm text-gray-600 font-medium">
                  {AI_TRANSFORMATION_QUESTIONS[sessionContext.currentQuestionIndex]?.title || "Phase 1"}
                </div>
                <button
                  onClick={() => setShowFacilitatorPanel(!showFacilitatorPanel)}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {showFacilitatorPanel ? 'Hide' : 'Show'} Facilitator Guide
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main content area with flex layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main content area - what audience sees */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto p-6">
              {/* Phase header with timing */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {currentQuestion?.title || "Loading..."}
                  </h2>
                  {currentQuestion?.timeLimit && (
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {currentQuestion.timeLimit} minutes
                    </span>
                  )}
                </div>
                <p className="text-gray-600">{currentQuestion?.description || ''}</p>
              </div>

              {/* Display facilitator content properly */}
              {currentQuestion?.facilitatorGuidance && (
                <div className="space-y-4 mb-6">
                  {/* Opening line - prominent for audience */}
                  {currentQuestion.facilitatorGuidance.openingLine && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                      <p className="text-lg italic text-blue-900">
                        "{currentQuestion.facilitatorGuidance.openingLine}"
                      </p>
                    </div>
                  )}

                  {/* Setup line (for Phase 2) */}
                  {currentQuestion.facilitatorGuidance.setupLine && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-700">
                        {currentQuestion.facilitatorGuidance.setupLine}
                      </p>
                    </div>
                  )}

                  {/* Key prompt/question */}
                  {currentQuestion.facilitatorGuidance.keyPrompt && (
                    <div className="bg-white rounded-lg shadow-sm border p-6">
                      <h3 className="font-semibold text-gray-900 mb-2">Key Question:</h3>
                      <p className="text-lg text-gray-800">
                        {currentQuestion.facilitatorGuidance.keyPrompt}
                      </p>
                    </div>
                  )}

                  {/* Framework display (for Phase 2) */}
                  {currentQuestion.facilitatorGuidance.framework && (
                    <div className="bg-white rounded-lg shadow-sm border p-6">
                      <h3 className="font-semibold text-lg text-gray-900 mb-4">
                        {currentQuestion.facilitatorGuidance.framework.title}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {currentQuestion.facilitatorGuidance.framework.stages?.map((stage, idx) => (
                          <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                            <h4 className="font-semibold text-gray-900 mb-1">{stage.name}</h4>
                            <p className="text-sm text-gray-600 mb-2">{stage.definition}</p>
                            <p className="text-xs text-red-600 font-medium">
                              Limitation: {stage.limitation}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* High-leverage systems (for Phase 3) */}
                  {currentQuestion.facilitatorGuidance.keyFramework && (
                    <div className="bg-white rounded-lg shadow-sm border p-6">
                      <h3 className="font-semibold text-lg text-gray-900 mb-4">
                        {currentQuestion.facilitatorGuidance.keyFramework.title}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentQuestion.facilitatorGuidance.keyFramework.systems?.map((system, idx) => (
                          <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                            <h4 className="font-semibold text-gray-900">{system.name}</h4>
                            <p className="text-sm text-gray-600">{system.rationale}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Example (SalesRecon for Phase 2) */}
                  {currentQuestion.facilitatorGuidance.exampleToShare && (
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <h4 className="font-semibold text-green-900 mb-2">
                        Example: {currentQuestion.facilitatorGuidance.exampleToShare.name}
                      </h4>
                      <ul className="list-disc list-inside text-sm text-green-800 space-y-1">
                        {currentQuestion.facilitatorGuidance.exampleToShare.points?.map((point, idx) => (
                          <li key={idx}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Key message */}
                  {currentQuestion.facilitatorGuidance.keyMessage && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-yellow-900 font-medium">
                        {currentQuestion.facilitatorGuidance.keyMessage}
                      </p>
                    </div>
                  )}

                  {/* Discussion prompts */}
                  {currentQuestion.facilitatorGuidance.discussionPrompts && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Discussion Points:</h4>
                      <ul className="space-y-2">
                        {currentQuestion.facilitatorGuidance.discussionPrompts.map((prompt, idx) => (
                          <li key={idx} className="flex items-start">
                            <span className="text-blue-500 mr-2">•</span>
                            <span className="text-gray-700">{prompt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Facilitator prompts */}
                  {(currentQuestion.facilitatorGuidance.facilitatorPrompt || 
                    currentQuestion.facilitatorGuidance.facilitatorPrompts) && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Questions for the Group:</h4>
                      {currentQuestion.facilitatorGuidance.facilitatorPrompt && (
                        <p className="text-gray-700">• {currentQuestion.facilitatorGuidance.facilitatorPrompt}</p>
                      )}
                      {currentQuestion.facilitatorGuidance.facilitatorPrompts?.map((prompt, idx) => (
                        <p key={idx} className="text-gray-700">• {prompt}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Transcript section - keep existing transcript display code */}
              <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">Discussion Transcript</h3>
                {sessionContext.liveTranscript.length === 0 ? (
                  <p className="text-gray-500 italic text-center py-8">
                    No responses captured yet. Click "Start Recording" or "Add Manual Entry" to begin.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {sessionContext.liveTranscript.map((entry, index) => (
                      <div key={entry.id || index} className="border-l-4 border-gray-200 pl-4 py-2">
                        <div className="font-medium text-gray-900">{entry.speaker || 'Speaker'}</div>
                        <div className="text-gray-700 mt-1">{entry.text}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </div>
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

              {/* Action buttons - keep existing buttons */}
              <div className="flex flex-wrap gap-3 mb-6">
                <button
                  onClick={() => setIsRecording(!isRecording)}
                  className={`inline-flex items-center px-4 py-2 border rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    isRecording
                      ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                      : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <svg className="w-4 h-4 mr-2 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                      </svg>
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      Start Recording
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => setShowManualModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Add Manual Entry
                </button>
              </div>

              {/* Phase navigation */}
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setSessionContext(prev => ({
                    ...prev,
                    currentQuestionIndex: Math.max(0, prev.currentQuestionIndex - 1)
                  }))}
                  disabled={sessionContext.currentQuestionIndex === 0}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous Phase
                </button>
                
                <div className="text-sm text-gray-600">
                  Phase {sessionContext.currentQuestionIndex + 1} of {AI_TRANSFORMATION_QUESTIONS.length}
                </div>
                
                <button
                  onClick={() => {
                    if (sessionContext.currentQuestionIndex < AI_TRANSFORMATION_QUESTIONS.length - 1) {
                      setSessionContext(prev => ({
                        ...prev,
                        currentQuestionIndex: prev.currentQuestionIndex + 1
                      }));
                    } else {
                      setSessionState('summary');
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {sessionContext.currentQuestionIndex < AI_TRANSFORMATION_QUESTIONS.length - 1 ? (
                    <>
                      Next Phase
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  ) : (
                    <>
                      Complete Session
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Collapsible facilitator panel */}
          {showFacilitatorPanel && (
            <div className="w-96 bg-gray-50 border-l overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Facilitator Guide</h3>
                  <button
                    onClick={() => setShowFacilitatorPanel(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {currentQuestion?.facilitatorGuidance && (
                  <div className="space-y-4">
                    {/* Objective */}
                    {currentQuestion.facilitatorGuidance.objective && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Objective</h4>
                        <p className="text-sm text-gray-600">
                          {currentQuestion.facilitatorGuidance.objective}
                        </p>
                      </div>
                    )}

                    {/* What to listen for */}
                    {currentQuestion.facilitatorGuidance.whatToListenFor && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">What to Listen For</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {currentQuestion.facilitatorGuidance.whatToListenFor.map((item, idx) => (
                            <li key={idx} className="flex items-start">
                              <span className="text-blue-500 mr-2">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Facilitation tips */}
                    {currentQuestion.facilitatorGuidance.facilitationTips && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Facilitation Tips</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {currentQuestion.facilitatorGuidance.facilitationTips.map((tip, idx) => (
                            <li key={idx} className="flex items-start">
                              <span className="text-green-500 mr-2">✓</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Presentation notes */}
                    {currentQuestion.facilitatorGuidance.presentationNotes && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Presentation Notes</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {currentQuestion.facilitatorGuidance.presentationNotes.map((note, idx) => (
                            <li key={idx} className="flex items-start">
                              <span className="text-yellow-500 mr-2">★</span>
                              <span>{note}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Transition line */}
                    {currentQuestion.facilitatorGuidance.transitionLine && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Transition to Next</h4>
                        <p className="text-sm text-gray-600 italic">
                          "{currentQuestion.facilitatorGuidance.transitionLine}"
                        </p>
                      </div>
                    )}

                    {/* Closing message (for Phase 5) */}
                    {currentQuestion.facilitatorGuidance.closingMessage && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Closing Message</h4>
                        <p className="text-sm text-gray-600">
                          {currentQuestion.facilitatorGuidance.closingMessage}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* AI Analysis Tools */}
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-medium text-gray-900 mb-3">AI Analysis Tools</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => callAIAnalysis('insights')}
                      disabled={isAnalyzing || sessionContext.liveTranscript.length === 0}
                      className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      Generate Strategic Insights
                    </button>
                    
                    <button
                      onClick={() => callAIAnalysis('followup')}
                      disabled={isAnalyzing || sessionContext.liveTranscript.length === 0}
                      className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      Suggest Follow-up Questions
                    </button>
                    
                    <button
                      onClick={() => callAIAnalysis('synthesis')}
                      disabled={isAnalyzing || sessionContext.liveTranscript.length === 0}
                      className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      Synthesize Discussion
                    </button>
                  </div>

                  {/* AI Insights Display */}
                  {sessionContext.aiInsights.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <h4 className="font-medium text-gray-900">Recent Insights</h4>
                      {sessionContext.aiInsights.slice(-3).map((insight, idx) => (
                        <div key={insight.id || idx} className="bg-white rounded-lg p-3 text-sm">
                          <div className="font-medium text-gray-700 mb-1">
                            {insight.type?.charAt(0).toUpperCase() + insight.type?.slice(1) || 'Insight'}
                          </div>
                          <div className="text-gray-600">{insight.content}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
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
