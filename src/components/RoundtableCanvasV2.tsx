'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { sessionConfig, uiText } from '../config/roundtable-config';
import { useSpeechTranscription, TranscriptEvent } from '../hooks/useSpeechTranscription';
import { saveSession, loadSession, clearSession, SessionSnapshot } from '../utils/storage';
import { roundtableQuestions, getCurrentQuestion, getTotalQuestions } from '../config/roundtable-config';
import { generateSessionPDF, prepareSessionDataForExport } from '../utils/pdfExport';

// PHASE 2: Live Transcript Model Implementation
// Session Lifecycle: intro → discussion → summary
// Real-time conversation capture with automatic speaker detection
// Streamlined facilitator workflow with proactive AI facilitation

// Session state machine types
type SessionState = 'idle' | 'intro' | 'discussion' | 'summary' | 'completed';

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
  // Agenda navigation
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
    participantCount: 5, // Default value as requested
    currentTopic: "when ai becomes how the enterprise operates", // Default topic as requested
    liveTranscript: [],
    aiInsights: [],
    // Agenda navigation state
    currentQuestionIndex: 0,
    questionStartTime: undefined,
    agendaProgress: {}
  });

  // Live transcript state
  const [isRecording, setIsRecording] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<string>('Facilitator');
  const [interimTranscript, setInterimTranscript] = useState<string>('');

  // Enhanced manual entry modal state
  const [showManualModal, setShowManualModal] = useState(false);
  const [entryMode, setEntryMode] = useState<'single' | 'bulk' | 'upload'>('single');
  const [manualSpeakerName, setManualSpeakerName] = useState('Facilitator');
  const [customSpeakerName, setCustomSpeakerName] = useState('');
  const [manualEntryText, setManualEntryText] = useState('');
  const [bulkTranscriptText, setBulkTranscriptText] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // PDF export state
  const [isExporting, setIsExporting] = useState(false);

  // Modular speech transcription hook
  const speechTranscription = useSpeechTranscription();
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Setup speech transcription callbacks
  useEffect(() => {
    // Handle partial transcription (interim results)
    speechTranscription.onPartial((event: TranscriptEvent) => {
      setInterimTranscript(event.text);
    });

    // Handle final transcription results
    speechTranscription.onFinal((event: TranscriptEvent) => {
      if (event.text.trim()) {
        addTranscriptEntry({
          text: event.text.trim(),
          speaker: currentSpeaker || 'Participant',
          confidence: event.confidence,
          isAutoDetected: true,
        });
        setInterimTranscript(''); // Clear interim text
      }
    });

    // Handle speech recognition errors
    speechTranscription.onError((error: string) => {
      console.error('🎤 Speech Recognition Error:', error);
      setIsRecording(false);
      // Could show a toast notification here
    });
  }, [currentSpeaker, speechTranscription]);

  // Auto-save session state on key changes
  useEffect(() => {
    if (sessionContext.state !== 'idle') {
      const snapshot = sessionContextToSnapshot(sessionContext);
      saveSession(snapshot);
      console.log('💾 Auto-saved session state');
    }
  }, [
    sessionContext.liveTranscript,
    sessionContext.aiInsights,
    sessionContext.currentQuestionIndex,
    sessionContext.state
    // Note: sessionContextToSnapshot is stable, defined below
  ]);

  // Session recovery on component mount
  useEffect(() => {
    const savedSession = loadSession();
    if (savedSession && sessionContext.state === 'idle') {
      const recoveredContext = snapshotToSessionContext(savedSession);
      setSessionContext(recoveredContext);
      console.log('🔄 Session recovered from localStorage');
    }
  }, []); // Only run on mount

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
    
    // Start live recording with modular speech engine
    if (speechTranscription.isSupported) {
      setIsRecording(true);
      speechTranscription.start().catch(error => {
        console.error('🎤 Failed to start speech transcription:', error);
        setIsRecording(false);
      });
    } else {
      console.log('🎤 Speech transcription not supported, manual entry only');
    }
  }, [speechTranscription]);

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

  // AI analysis with live transcript context
  const callAIAnalysis = useCallback(async (analysisType: string = 'insights') => {
    try {
      // Build live transcript for AI context
      const transcriptText = sessionContext.liveTranscript
        .map(entry => `${entry.speaker}: ${entry.text}`)
        .join('\n');
      
      console.log('🔍 Starting AI Analysis:', {
        type: analysisType,
        transcriptLength: transcriptText.length,
        entryCount: sessionContext.liveTranscript.length,
        topic: sessionContext.currentTopic
      });

      // TRY NEW /api/analyze-live endpoint first (strict JSON)
      try {
        const liveResponse = await fetch('/api/analyze-live', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionTopic: sessionContext.currentTopic || 'Strategic Planning Session',
            liveTranscript: transcriptText || "No conversation content has been captured yet in this live session.",
            analysisType,
            participantCount: sessionContext.participantCount || 5,
            sessionDuration: Math.floor((Date.now() - sessionContext.startTime.getTime()) / 60000),
            clientId: 'live-session'
          }),
        });

        if (liveResponse.ok) {
          const liveData = await liveResponse.json();
          console.log('✅ Live AI Analysis (new endpoint):', liveData);
          
          if (liveData.success) {
            // Add AI insight to session context with enhanced metadata
            setSessionContext(prev => ({
              ...prev,
              aiInsights: [...prev.aiInsights, {
                id: `insight_${Date.now()}`,
                type: analysisType,
                content: liveData.content,
                timestamp: new Date(),
                confidence: liveData.confidence,
                suggestions: liveData.suggestions || [],
                metadata: liveData.metadata
              }],
            }));
            
            return liveData;
          }
        }
        
        console.log('⚠️ Live endpoint failed, falling back to legacy endpoint');
      } catch (liveError) {
        console.log('⚠️ Live endpoint error, using fallback:', liveError);
      }

      // FALLBACK to legacy /api/analyze endpoint
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
      console.log('✅ Legacy AI Analysis (fallback):', data);

      // Add AI insight to session context (legacy format)
      setSessionContext(prev => ({
        ...prev,
        aiInsights: [...prev.aiInsights, {
          id: `insight_${Date.now()}`,
          type: analysisType,
          content: data.insights || data.analysis || data.result,
          timestamp: new Date(),
          confidence: 0.8, // Default confidence for legacy endpoint
          isLegacy: true
        }],
      }));

      return data;
    } catch (error) {
      console.error('❌ AI Analysis Error (both endpoints failed):', error);
      
      // Add error insight to maintain UX
      setSessionContext(prev => ({
        ...prev,
        aiInsights: [...prev.aiInsights, {
          id: `error_${Date.now()}`,
          type: 'error',
          content: 'AI analysis temporarily unavailable. Please try again or continue with manual facilitation.',
          timestamp: new Date(),
          confidence: 0,
          isError: true
        }],
      }));
      
      throw error;
    }
  }, [sessionContext]);

  // Agenda Navigation Functions
  const goToNextQuestion = useCallback(() => {
    const totalQuestions = getTotalQuestions();
    if (sessionContext.currentQuestionIndex < totalQuestions - 1) {
      const currentQuestion = getCurrentQuestion(sessionContext.currentQuestionIndex);
      const timeSpent = sessionContext.questionStartTime 
        ? Math.floor((Date.now() - sessionContext.questionStartTime.getTime()) / 60000)
        : 0;

      setSessionContext(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
        questionStartTime: new Date(),
        agendaProgress: {
          ...prev.agendaProgress,
          [currentQuestion?.id || '']: {
            completed: true,
            timeSpent: timeSpent,
            insights: prev.aiInsights.length
          }
        }
      }));

      // Auto-trigger AI analysis for the transition
      setTimeout(() => {
        callAIAnalysis('transition');
      }, 1000);
    }
  }, [sessionContext, callAIAnalysis]);

  const goToPreviousQuestion = useCallback(() => {
    if (sessionContext.currentQuestionIndex > 0) {
      setSessionContext(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex - 1,
        questionStartTime: new Date()
      }));
    }
  }, [sessionContext]);

  const getCurrentQuestionData = useCallback(() => {
    return getCurrentQuestion(sessionContext.currentQuestionIndex);
  }, [sessionContext.currentQuestionIndex]);

  // Session persistence functions
  const sessionContextToSnapshot = useCallback((context: SessionContext): SessionSnapshot => {
    return {
      timestamp: Date.now(),
      sessionState: context.state,
      currentTopic: context.currentTopic,
      participantCount: context.participantCount,
      startTime: context.startTime.getTime(),
      liveTranscript: context.liveTranscript.map(entry => ({
        id: entry.id,
        speaker: entry.speaker,
        text: entry.text,
        timestamp: entry.timestamp.getTime(),
        isAutoDetected: entry.isAutoDetected,
        confidence: entry.confidence
      })),
      aiInsights: context.aiInsights.map(insight => ({
        id: insight.id,
        type: insight.type,
        content: insight.content,
        timestamp: insight.timestamp.getTime(),
        confidence: insight.confidence,
        suggestions: insight.suggestions,
        metadata: insight.metadata,
        isLegacy: insight.isLegacy,
        isError: insight.isError
      })),
      currentQuestionIndex: context.currentQuestionIndex,
      questionStartTime: context.questionStartTime?.getTime(),
      agendaProgress: context.agendaProgress
    };
  }, []);

  const snapshotToSessionContext = useCallback((snapshot: SessionSnapshot): SessionContext => {
    return {
      state: snapshot.sessionState as SessionState,
      startTime: new Date(snapshot.startTime),
      participantCount: snapshot.participantCount,
      currentTopic: snapshot.currentTopic,
      liveTranscript: snapshot.liveTranscript.map(entry => ({
        id: entry.id,
        speaker: entry.speaker,
        text: entry.text,
        timestamp: new Date(entry.timestamp),
        isAutoDetected: entry.isAutoDetected ?? false,
        confidence: entry.confidence ?? 0.8
      })),
      aiInsights: snapshot.aiInsights.map(insight => ({
        id: insight.id,
        type: insight.type,
        content: insight.content,
        timestamp: new Date(insight.timestamp),
        confidence: insight.confidence ?? 0.8,
        suggestions: insight.suggestions,
        metadata: insight.metadata,
        isLegacy: insight.isLegacy,
        isError: insight.isError
      })),
      currentQuestionIndex: snapshot.currentQuestionIndex,
      questionStartTime: snapshot.questionStartTime ? new Date(snapshot.questionStartTime) : undefined,
      agendaProgress: snapshot.agendaProgress
    };
  }, []);

  // Trigger dual analytics (Get Insights + Follow-on Questions simultaneously)
  const triggerDualAnalysis = useCallback(async () => {
    console.log('🚀 Triggering dual analytics: insights + follow-on questions');
    
    // Trigger both analyses in parallel
    await Promise.all([
      callAIAnalysis('insights'),
      callAIAnalysis('followup')
    ]);
  }, [callAIAnalysis]);
  
  // Enhanced formatting for AI insights content
  const formatInsightContent = useCallback((content: string) => {
    // Split content into lines and format as structured elements
    const lines = content.split('\n').filter(line => line.trim());
    
    return (
      <div className="space-y-2">
        {lines.map((line, index) => {
          const trimmedLine = line.trim();
          
          // Format bullet points with better styling
          if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•')) {
            return (
              <div key={index} className="flex items-start gap-2">
                <span className="text-blue-500 font-bold mt-1">•</span>
                <span className="flex-1">{trimmedLine.replace(/^[-•]\s*/, '')}</span>
              </div>
            );
          }
          
          // Format numbered items
          if (/^\d+\./.test(trimmedLine)) {
            const [, number, text] = trimmedLine.match(/^(\d+\.)\s*(.*)/) || [];
            return (
              <div key={index} className="flex items-start gap-2">
                <span className="text-purple-600 font-semibold mt-1 min-w-[1.5rem]">{number}</span>
                <span className="flex-1">{text}</span>
              </div>
            );
          }
          
          // Format section headers (lines ending with :)
          if (trimmedLine.endsWith(':')) {
            return (
              <div key={index} className="font-semibold text-gray-900 mt-3 mb-1 border-b border-gray-200 pb-1">
                {trimmedLine.replace(':', '')}
              </div>
            );
          }
          
          // Format quotes (lines starting with ")
          if (trimmedLine.startsWith('"') && trimmedLine.endsWith('"')) {
            return (
              <div key={index} className="bg-gray-50 border-l-4 border-gray-300 pl-4 py-2 italic text-gray-700">
                {trimmedLine}
              </div>
            );
          }
          
          // Regular paragraphs
          return (
            <p key={index} className="leading-relaxed">
              {trimmedLine}
            </p>
          );
        })}
      </div>
    );
  }, []);
  
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
      const finalSpeakerName = manualSpeakerName === 'Custom' 
        ? (customSpeakerName || 'Unknown Speaker') 
        : manualSpeakerName;
      
      addTranscriptEntry({
        text: manualEntryText.trim(),
        speaker: finalSpeakerName,
        isAutoDetected: false,
      });
      setShowManualModal(false);
      setManualEntryText('');
      setCustomSpeakerName('');
      setManualSpeakerName('');
      console.log('✅ Manual entry added successfully!');
    }
  }, [manualEntryText, manualSpeakerName, customSpeakerName, addTranscriptEntry]);
  
  // Enhanced file upload handler
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setBulkTranscriptText(content);
        console.log('📁 File uploaded and content loaded:', file.name);
      };
      reader.readAsText(file);
    }
  }, []);
  
  // Parse bulk transcript text into individual entries
  const parseBulkTranscript = useCallback((text: string) => {
    const entries: Array<{ speaker: string; text: string }> = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      // Try to match "Speaker Name: Text" format
      const match = line.match(/^([^:]+):\s*(.+)$/);
      if (match) {
        const speaker = match[1].trim();
        const text = match[2].trim();
        if (text) {
          entries.push({ speaker, text });
        }
      } else if (line.trim()) {
        // Fallback: treat as unknown speaker
        entries.push({ speaker: 'Unknown Speaker', text: line.trim() });
      }
    }
    
    return entries;
  }, []);
  
  // Enhanced submit handler for all entry modes
  const submitEnhancedManualEntry = useCallback(() => {
    console.log('📝 Submitting enhanced manual entry, mode:', entryMode);
    
    if (entryMode === 'single') {
      // Original single entry logic
      if (manualEntryText.trim()) {
        const finalSpeakerName = manualSpeakerName === 'Custom' 
          ? (customSpeakerName || 'Unknown Speaker') 
          : manualSpeakerName;
        
        addTranscriptEntry({
          text: manualEntryText.trim(),
          speaker: finalSpeakerName,
          isAutoDetected: false,
        });
        setManualEntryText('');
      }
    } else if (entryMode === 'bulk' || entryMode === 'upload') {
      // Bulk/upload entry logic
      const textToParse = entryMode === 'bulk' ? bulkTranscriptText : bulkTranscriptText;
      if (textToParse.trim()) {
        const entries = parseBulkTranscript(textToParse);
        console.log('📋 Parsed entries:', entries.length);
        
        // Add all entries to transcript
        entries.forEach(entry => {
          addTranscriptEntry({
            text: entry.text,
            speaker: entry.speaker,
            isAutoDetected: false,
          });
        });
        
        setBulkTranscriptText('');
        setUploadedFile(null);
      }
    }
    
    // Reset modal state
    setShowManualModal(false);
    setCustomSpeakerName('');
    setManualSpeakerName('Facilitator');
    setEntryMode('single');
    console.log('✅ Enhanced manual entry completed!');
  }, [entryMode, manualEntryText, manualSpeakerName, customSpeakerName, bulkTranscriptText, addTranscriptEntry, parseBulkTranscript]);

  // PDF Export Handler
  const handleExportPDF = useCallback(async () => {
    if (isExporting) return; // Prevent multiple exports
    
    try {
      setIsExporting(true);
      console.log('📄 Starting PDF export...');
      
      // Prepare session data for export
      const exportData = prepareSessionDataForExport(sessionContext);
      
      // Generate and download PDF
      await generateSessionPDF(exportData);
      
      console.log('✅ PDF export completed successfully!');
      
    } catch (error) {
      console.error('❌ PDF export failed:', error);
      // Could show a toast notification here
      alert('PDF export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [sessionContext, isExporting]);

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
  const renderDiscussionState = () => {
    const currentQuestion = getCurrentQuestionData();
    const totalQuestions = getTotalQuestions();
    const progressPercentage = ((sessionContext.currentQuestionIndex + 1) / totalQuestions) * 100;

    return (
    <div className="space-y-6">
      {/* Agenda Controls */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold">📋 Session Agenda</h2>
            <p className="text-gray-600">
              Question {sessionContext.currentQuestionIndex + 1} of {totalQuestions} • 
              {Math.round(progressPercentage)}% Complete
            </p>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={goToPreviousQuestion}
              disabled={sessionContext.currentQuestionIndex === 0}
              className={`px-3 py-2 rounded text-sm font-medium ${
                sessionContext.currentQuestionIndex === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              ← Previous
            </button>
            <button
              onClick={goToNextQuestion}
              disabled={sessionContext.currentQuestionIndex >= totalQuestions - 1}
              className={`px-3 py-2 rounded text-sm font-medium ${
                sessionContext.currentQuestionIndex >= totalQuestions - 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Next →
            </button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        
        {/* Current Question */}
        {currentQuestion && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-lg font-bold text-blue-900 mb-2">
              {currentQuestion.title}
            </h3>
            <p className="text-blue-800 text-sm leading-relaxed mb-3">
              {currentQuestion.description}
            </p>
            {currentQuestion.timeLimit && (
              <p className="text-xs text-blue-600">
                ⏰ Suggested time: {currentQuestion.timeLimit} minutes
              </p>
            )}
          </div>
        )}
      </div>
      
      {/* Session controls */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">🎙️ Live Discussion</h2>
            <p className="text-gray-600">
              {sessionContext.currentTopic || 'Strategic Planning Session'} • 
              {sessionContext.liveTranscript.length} entries captured
              {/* AI Analysis Controls - Dual Analytics Approach */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => triggerDualAnalysis()}
                    className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                  >
                    💡 Get Insights
                  </button>
                  <button
                    onClick={() => triggerDualAnalysis()}
                    className="px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm"
                  >
                    ❓ Follow-on Questions
                  </button>
                </div>
                <div className="text-xs text-gray-500 text-center">
                  Both analytics will run simultaneously
                </div>
              </div>
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

      {/* Session Utilities */}
      <div className="bg-gray-50 rounded-lg p-4 border-t mt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">📁 Session Utilities</span>
          <button
            onClick={handleExportPDF}
            disabled={sessionContext.liveTranscript.length === 0 || isExporting}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium text-sm"
          >
            {isExporting ? '📄 Exporting...' : '📄 Export PDF'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Export your session transcript and AI insights to PDF
        </p>
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
  };

  // Render AI Assistance Panel (RIGHT PANE)
  const renderAIAssistancePanel = () => (
    <div className="h-full">
      {/* AI Panel Header */}
      <div className="bg-white p-4 border-b border-gray-200 mb-4">
        <h2 className="text-lg font-bold text-gray-800 mb-2">
          🧠 AI Co-Facilitator
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => callAIAnalysis('insights')}
            disabled={sessionContext.liveTranscript.length === 0}
            className="text-xs px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            💡 Get Insights
          </button>
          <button
            onClick={() => callAIAnalysis('followup')}
            disabled={sessionContext.liveTranscript.length === 0}
            className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            ❓ Follow-up Questions
          </button>
          <button
            onClick={() => callAIAnalysis('synthesis')}
            disabled={sessionContext.liveTranscript.length === 0}
            className="text-xs px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            📊 Synthesize
          </button>

        </div>
      </div>

      {/* AI Insights Display */}
      {sessionContext.aiInsights.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-600 px-4">Live AI Insights</h3>
          <div className="space-y-3 px-4">
            {sessionContext.aiInsights.map((insight) => (
              <div key={insight.id} className={`bg-white p-3 rounded shadow-sm ${
                insight.isError 
                  ? 'border-l-4 border-red-500' 
                  : insight.isLegacy 
                    ? 'border-l-4 border-yellow-500' 
                    : 'border-l-4 border-purple-500'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold uppercase ${
                      insight.isError 
                        ? 'text-red-600' 
                        : insight.isLegacy 
                          ? 'text-yellow-600' 
                          : 'text-purple-600'
                    }`}>
                      {insight.type}
                    </span>
                    {insight.confidence !== undefined && (
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {Math.round(insight.confidence * 100)}% confidence
                      </span>
                    )}
                    {insight.isLegacy && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                        Legacy
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {insight.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                {/* Enhanced formatting for insights content */}
                <div className="text-sm text-gray-800 leading-relaxed mb-2">
                  {formatInsightContent(insight.content)}
                </div>
                
                {/* Display suggestions if available */}
                {insight.suggestions && insight.suggestions.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Suggestions:</p>
                    <ul className="text-xs text-gray-700 space-y-1">
                      {insight.suggestions.slice(0, 3).map((suggestion: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span className="text-purple-500 mt-0.5">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Display metadata for new endpoint */}
                {insight.metadata && (
                  <div className="mt-2 text-xs text-gray-500">
                    Tokens: {insight.metadata.tokensUsed} | Length: {insight.metadata.transcriptLength}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500 p-8">
          <div className="text-4xl mb-4">🤖</div>
          <p className="text-sm">AI insights will appear here</p>
          <p className="text-xs text-gray-400 mt-2">
            Start recording or add manual entries to enable AI analysis
          </p>
        </div>
      )}

      {/* Session Stats */}
      {sessionState === 'discussion' && (
        <div className="mt-6 bg-blue-50 p-4 rounded">
          <h4 className="text-sm font-semibold text-blue-800 mb-2">Session Stats</h4>
          <div className="text-xs text-blue-600 space-y-1">
            <p><strong>Entries:</strong> {sessionContext.liveTranscript.length}</p>
            <p><strong>Duration:</strong> {Math.floor((Date.now() - sessionContext.startTime.getTime()) / 60000)}min</p>
            <p><strong>AI Insights:</strong> {sessionContext.aiInsights.length}</p>
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
      <header className="bg-blue-600 text-white p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">
              🎙️ AI Roundtable Co-Facilitator
            </h1>
            <p className="text-blue-100 text-sm">
              MVP Split-Pane • State: {sessionState} • Topic: {sessionContext.currentTopic || 'No topic'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-blue-100 text-sm">
              {sessionContext.liveTranscript.length} entries captured
            </p>
          </div>
        </div>
      </header>

      <main className="h-screen-minus-header split-pane-container">
        {/* LEFT PANE: Discussion */}
        <div className="left-pane bg-white p-6">
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
                    participantCount: 5,
                    currentTopic: 'when ai becomes how the enterprise operates',
                    liveTranscript: [],
                    aiInsights: [],
                    currentQuestionIndex: 0,
                    agendaProgress: {},
                  });
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                🔄 Start New Session
              </button>
            </div>
          )}
        </div>

        {/* RIGHT PANE: AI Assistance Panel */}
        <div className="right-pane bg-gray-50 p-4">
          {renderAIAssistancePanel()}
        </div>
      </main>
      
      {/* Enhanced Manual Entry Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">📄 Add Transcript Entry</h3>
            
            {/* Entry Mode Tabs */}
            <div className="flex mb-6 border-b">
              <button
                onClick={() => setEntryMode('single')}
                className={`px-4 py-2 font-medium ${
                  entryMode === 'single'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                ✏️ Single Entry
              </button>
              <button
                onClick={() => setEntryMode('bulk')}
                className={`px-4 py-2 font-medium ml-4 ${
                  entryMode === 'bulk'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                📋 Bulk Copy-Paste
              </button>
              <button
                onClick={() => setEntryMode('upload')}
                className={`px-4 py-2 font-medium ml-4 ${
                  entryMode === 'upload'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                📁 Upload File
              </button>
            </div>
            
            {/* Conditional Content Based on Entry Mode */}
            {entryMode === 'single' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Speaker</label>
                  <select
                    value={manualSpeakerName}
                    onChange={(e) => setManualSpeakerName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                    title="Select speaker"
                  >
                    <option value="Facilitator">👨‍💼 Facilitator</option>
                    <option value="Speaker 1">🗣️ Speaker 1</option>
                    <option value="Speaker 2">🗣️ Speaker 2</option>
                    <option value="Speaker 3">🗣️ Speaker 3</option>
                    <option value="Speaker 4">🗣️ Speaker 4</option>
                    <option value="Speaker 5">🗣️ Speaker 5</option>
                    <option value="Custom">✏️ Custom Speaker</option>
                  </select>
                  {manualSpeakerName === 'Custom' && (
                    <input
                      type="text"
                      value={customSpeakerName}
                      onChange={(e) => setCustomSpeakerName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md mt-2"
                      placeholder="Enter custom speaker name"
                    />
                  )}
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
            )}
            
            {entryMode === 'bulk' && (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">📋 Bulk Copy-Paste Instructions</h4>
                  <p className="text-sm text-blue-600 mb-2">
                    Paste a full transcript from another application. Use this format:
                  </p>
                  <div className="bg-white p-2 rounded text-xs font-mono text-gray-600">
                    Speaker Name: What they said...<br/>
                    Another Speaker: Their response...<br/>
                    Facilitator: Question or comment...
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Full Transcript</label>
                  <textarea
                    value={bulkTranscriptText}
                    onChange={(e) => setBulkTranscriptText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md h-64 resize-none font-mono text-sm"
                    placeholder="Paste your full transcript here...\n\nExample:\nFacilitator: Welcome everyone to today's session.\nSpeaker 1: Thank you for having us.\nSpeaker 2: Looking forward to the discussion."
                    autoFocus
                  />
                </div>
                
                <div className="text-xs text-gray-500">
                  📝 The system will automatically parse speakers and create individual transcript entries.
                </div>
              </div>
            )}
            
            {entryMode === 'upload' && (
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">📁 File Upload Instructions</h4>
                  <p className="text-sm text-green-600">
                    Upload a text file (.txt) containing your transcript. Supported formats:
                  </p>
                  <ul className="text-xs text-green-600 mt-2 ml-4 space-y-1">
                    <li>• Plain text with speaker names</li>
                    <li>• Meeting transcripts from Zoom, Teams, etc.</li>
                    <li>• Custom formatted transcripts</li>
                  </ul>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Upload Transcript File</label>
                  <input
                    type="file"
                    accept=".txt,.md,.csv"
                    onChange={handleFileUpload}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  {uploadedFile && (
                    <div className="mt-2 text-sm text-gray-600">
                      ✅ File selected: {uploadedFile.name} ({Math.round(uploadedFile.size / 1024)}KB)
                    </div>
                  )}
                </div>
                
                <div className="text-xs text-gray-500">
                  🔒 Files are processed locally in your browser. No data is uploaded to external servers.
                </div>
              </div>
            )}
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowManualModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitEnhancedManualEntry}
                disabled={
                  (entryMode === 'single' && !manualEntryText.trim()) ||
                  (entryMode === 'bulk' && !bulkTranscriptText.trim()) ||
                  (entryMode === 'upload' && !bulkTranscriptText.trim())
                }
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {entryMode === 'single' ? 'Add Entry' : 
                 entryMode === 'bulk' ? 'Process Transcript' : 
                 'Upload & Process'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoundtableCanvasV2;
