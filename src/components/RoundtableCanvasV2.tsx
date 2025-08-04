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
    facilitator: "facilitator", // Default value as requested
    topic: sessionConfig.title, // Use session title from config
    currentTopic: sessionConfig.title, // Use session title from config
    liveTranscript: [],
    aiInsights: [],
    keyThemes: [],
    followupQuestions: [],
    crossReferences: [],
    sessionSummary: "",
    currentQuestionIndex: 0,
    questionStartTime: undefined,
    agendaProgress: {}
  });

  // Live transcript state
  const [isRecording, setIsRecording] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<string>('Speaker');
  const [interimTranscript, setInterimTranscript] = useState<string>('');

  // Enhanced manual entry modal state
  const [showManualModal, setShowManualModal] = useState(false);
  const [entryMode, setEntryMode] = useState<'single' | 'bulk' | 'upload'>('single');
  const [manualSpeakerName, setManualSpeakerName] = useState('Speaker');
  const [customSpeakerName, setCustomSpeakerName] = useState('');
  const [manualEntryText, setManualEntryText] = useState('');
  const [bulkTranscriptText, setBulkTranscriptText] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // PDF export state
  const [isExporting, setIsExporting] = useState(false);

  // Analytics tab state
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<'insights' | 'followup'>('insights');

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
                content: liveData.insights || liveData.content || liveData.analysis,
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
      facilitator: (snapshot as any).facilitator || 'facilitator',
      topic: (snapshot as any).topic || sessionConfig.title,
      state: snapshot.sessionState as SessionState,
      startTime: new Date(snapshot.startTime),
      currentTopic: snapshot.currentTopic,
      duration: (snapshot as any).duration,
      liveTranscript: snapshot.liveTranscript.map(entry => ({
        id: entry.id,
        speaker: entry.speaker,
        text: entry.text,
        timestamp: new Date(entry.timestamp),
        isAutoDetected: entry.isAutoDetected ?? false,
        confidence: entry.confidence ?? 0.8
      })),
      keyThemes: (snapshot as any).keyThemes || [],
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
      followupQuestions: (snapshot as any).followupQuestions || [],
      crossReferences: (snapshot as any).crossReferences || [],
      sessionSummary: (snapshot as any).sessionSummary || '',
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
  
  // Enhanced formatting for AI insights content (Priority 4: Helper Functions)
  const formatAIInsights = useCallback((insights: string) => {
    if (!insights) return '';
    
    return insights
      // Format bold headers
      .replace(/\*\*(.*?)\*\*/g, '<h4 class="font-semibold text-gray-900 mt-6 mb-3 pb-2 border-b border-gray-200 flex items-center"><span class="w-1 h-4 bg-purple-500 rounded-full mr-3"></span>$1</h4>')
      // Format bullet points
      .replace(/• (.*?)(?:\n|$)/g, '<li class="text-gray-700 mb-2 leading-relaxed pl-6 relative">$1</li>')
      // Wrap consecutive list items in ul tags
      .replace(/(<li.*?<\/li>\s*)+/g, '<ul class="space-y-3 mb-6 ml-0">$&</ul>')
      // Format quotes
      .replace(/"([^"]+)"/g, '<span class="bg-blue-50 px-2 py-1 rounded text-blue-800 font-medium italic">"$1"</span>')
      // Add proper paragraph spacing
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/^/, '<p class="mb-4">')
      .replace(/$/, '</p>')
      // Clean up empty paragraphs
      .replace(/<p class="mb-4"><\/p>/g, '');
  }, []);

  // Enhanced content validation (Priority 4: Helper Functions)
  const hasTranscriptContent = useCallback((transcriptEntries: any[]) => {
    return transcriptEntries && 
      transcriptEntries.length > 0 && 
      transcriptEntries.some(entry => 
        entry.content && 
        entry.content.trim().length > 0
      );
  }, []);

  // Legacy formatting for AI insights content (keeping for compatibility)
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
    setManualSpeakerName(currentSpeaker || 'Speaker');
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
    setManualSpeakerName('Speaker');
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
            </p>
          </div>
          
          <div className="flex space-x-2">
            {/* Voice Recording Toggle Button */}
            <button
              onClick={() => {
                if (speechTranscription.isListening) {
                  speechTranscription.stop();
                  setIsRecording(false);
                } else {
                  speechTranscription.start();
                  setIsRecording(true);
                }
              }}
              className={`px-3 py-1.5 text-white text-sm rounded font-medium ${
                speechTranscription.isListening 
                  ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {speechTranscription.isListening ? '⏹️ Stop Voice' : '🎤 Start Voice'}
            </button>
            
            <button
              onClick={addManualEntry}
              className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 font-medium"
            >
              ➕ Manual Entry
            </button>
            
            <button
              onClick={endSession}
              className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 font-medium"
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

      {/* Enhanced Professional Live Transcript Display */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Professional Header */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd"/>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Live Discussion Transcript</h3>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                    {sessionContext.liveTranscript.length} {sessionContext.liveTranscript.length === 1 ? 'entry' : 'entries'} captured
                  </span>
                  <span className="text-xs text-gray-500">Real-time capture active</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transcript Content */}
        <div className="p-6">
          {sessionContext.liveTranscript.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                </svg>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Ready to Capture Discussion</h4>
              <p className="text-sm text-gray-500 mb-6">
                Use voice recording or manual entry to capture participant insights as the strategic conversation unfolds
              </p>
              <div className="flex justify-center space-x-3">
                <button 
                  onClick={() => speechTranscription.isListening ? speechTranscription.stop() : speechTranscription.start()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 shadow-sm hover:shadow-md transition-all"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd"/>
                  </svg>
                  <span>{speechTranscription.isListening ? 'Stop Recording' : 'Start Recording'}</span>
                </button>
                <button 
                  onClick={addManualEntry}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 shadow-sm hover:shadow-md transition-all"
                >
                  Manual Entry
                </button>
              </div>
            </div>
          ) : (
            <div 
              ref={transcriptRef}
              className="space-y-4 max-h-96 overflow-y-auto"
            >
              {sessionContext.liveTranscript.map((entry, index) => (
                <div key={entry.id} className="bg-gray-50/80 rounded-xl p-4 border border-gray-200 hover:bg-gray-50 transition-colors fade-in-up">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">
                          {entry.speaker.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <span className="text-blue-600 font-medium text-sm">
                          {entry.speaker}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          {entry.timestamp.toLocaleTimeString()}
                          {entry.isAutoDetected && <span className="ml-1">🎤</span>}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
                        title="Edit entry"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                      </button>
                      <button 
                        className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                        title="Delete entry"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-800 leading-relaxed pl-11">
                    {entry.text}
                  </p>
                </div>
              ))}
              
              {/* Show interim results with professional styling */}
              {interimTranscript && (
                <div className="bg-yellow-50/80 rounded-xl p-4 border border-yellow-200 animate-pulse">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                        <span className="text-yellow-600 font-semibold text-sm">
                          {currentSpeaker.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <span className="text-yellow-600 font-medium text-sm">{currentSpeaker}</span>
                        <span className="text-xs text-yellow-500 ml-2">Speaking...</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-700 italic pl-11">{interimTranscript}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>




    </div>
    );
  };

  // Render AI Assistance Panel (RIGHT PANE)
  const renderAIAssistancePanel = () => (
    <div className="h-full">
      {/* AI Panel Header with PDF Export */}
      <div className="bg-white p-4 border-b border-gray-200 mb-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-gray-800">
            🧠 AI Co-Facilitator
          </h2>
          {/* Summarize Entire Session Button */}
          <button
            onClick={handleExportPDF}
            disabled={sessionContext.liveTranscript.length === 0}
            className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center gap-2"
          >
            📊 Summarize Entire Session
          </button>
        </div>
        
        {/* Enhanced Professional AI Analysis Controls */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => {
              if (sessionContext.liveTranscript.length > 0) {
                callAIAnalysis('insights');
                setActiveAnalyticsTab('insights');
              }
            }}
            disabled={sessionContext.liveTranscript.length === 0}
            className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:from-purple-700 hover:to-purple-800 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            <span>Get Insights</span>
          </button>
          <button
            onClick={() => {
              if (sessionContext.liveTranscript.length > 0) {
                callAIAnalysis('followup');
                setActiveAnalyticsTab('followup');
              }
            }}
            disabled={sessionContext.liveTranscript.length === 0}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:from-blue-700 hover:to-blue-800 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>Follow-up Questions</span>
          </button>
        </div>
        
        {/* Tab Navigation */}
        {sessionContext.aiInsights.length > 0 && (
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveAnalyticsTab('insights')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeAnalyticsTab === 'insights'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-gray-600 hover:text-purple-600'
              }`}
            >
              💡 Insights ({sessionContext.aiInsights.filter(i => i.type !== 'followup').length})
            </button>
            <button
              onClick={() => setActiveAnalyticsTab('followup')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeAnalyticsTab === 'followup'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              ❓ Questions ({sessionContext.aiInsights.filter(i => i.type === 'followup').length})
            </button>
          </div>
        )}
      </div>

      {/* Professional AI Insights & Follow-up Questions Display */}
      <div className="flex-1 overflow-y-auto px-4">
        {sessionContext.aiInsights.length === 0 ? (
          // Professional Empty State
          activeAnalyticsTab === 'insights' ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-6 py-4 border-b border-purple-200">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">AI Strategic Analysis</h3>
                    <p className="text-xs text-gray-600">Ready to analyze discussion patterns</p>
                  </div>
                </div>
              </div>
              <div className="p-12">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Strategic Analysis Ready</h4>
                  <p className="text-sm text-gray-600 mb-6">
                    Capture discussion points to receive strategic insights and transformation patterns
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Strategic Follow-up Questions</h3>
                    <p className="text-xs text-gray-600">Ready to generate strategic follow-ups</p>
                  </div>
                </div>
              </div>
              <div className="p-12">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Strategic Questions Ready</h4>
                  <p className="text-sm text-gray-600 mb-6">
                    Generate follow-up questions to guide deeper strategic discussion
                  </p>
                </div>
              </div>
            </div>
          )
        ) : (
          // Professional Content Display with Enhanced Containers
          activeAnalyticsTab === 'insights' ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-6 py-4 border-b border-purple-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">AI Strategic Insights</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                          {sessionContext.aiInsights.filter(i => i.type !== 'followup').length} insights
                        </span>
                        <span className="text-xs text-gray-500">{new Date().toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                {sessionContext.aiInsights
                  .filter(insight => insight.type !== 'followup')
                  .map((insight) => (
                    <div key={insight.id} className="bg-gradient-to-r from-purple-50 to-white rounded-lg border border-purple-200 p-4 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                            </svg>
                          </div>
                          <span className="text-sm font-semibold text-gray-900">Strategic Insight</span>
                          {insight.confidence && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                              {Math.round(insight.confidence * 100)}% confidence
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">{insight.timestamp.toLocaleTimeString()}</span>
                      </div>
                      <div className="text-sm text-gray-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatAIInsights(insight.content) }} />
                      {insight.suggestions && insight.suggestions.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-purple-200">
                          <p className="text-xs font-semibold text-purple-700 mb-2">Recommendations:</p>
                          <ul className="text-xs text-gray-700 space-y-1">
                            {insight.suggestions.slice(0, 3).map((suggestion: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-purple-500 mt-0.5">•</span>
                                <span>{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                  
                {sessionContext.aiInsights.filter(i => i.type !== 'followup').length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600">Generate insights to see strategic analysis here</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Follow-up Questions Container
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Strategic Follow-up Questions</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                          {sessionContext.aiInsights.filter(i => i.type === 'followup').length} questions
                        </span>
                        <span className="text-xs text-gray-500">{new Date().toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4 p-6">
                {sessionContext.aiInsights
                  .filter(insight => insight.type === 'followup')
                  .map((insight) => (
                    <div key={insight.id} className="bg-gradient-to-r from-blue-50 to-white rounded-lg border border-blue-200 p-4 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                          </div>
                          <span className="text-sm font-semibold text-gray-900">Strategic Question</span>
                          {insight.confidence && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                              {Math.round(insight.confidence * 100)}% confidence
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">{insight.timestamp.toLocaleTimeString()}</span>
                      </div>
                      <div className="text-sm text-gray-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatAIInsights(insight.content) }} />
                    </div>
                  ))}
                  
                {sessionContext.aiInsights.filter(i => i.type === 'followup').length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600">Generate questions to see strategic follow-ups here</p>
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>

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
      {/* Professional Executive Header */}
      <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white shadow-lg">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Session Branding */}
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">
                  AI Strategic Co-Facilitator
                </h1>
                <p className="text-blue-200 text-sm font-medium">
                  {sessionContext.currentTopic || sessionConfig.title}
                </p>
              </div>
            </div>

            {/* Right: Session Status */}
            <div className="flex items-center space-x-6">
              {/* Phase Progress */}
              {getCurrentQuestion(sessionContext.currentQuestionIndex) && (
                <div className="text-right">
                  <div className="text-sm font-medium text-white">
                    Phase {sessionContext.currentQuestionIndex + 1} of {getTotalQuestions()}
                  </div>
                  <div className="text-xs text-blue-200">
                    {Math.round(((sessionContext.currentQuestionIndex + 1) / getTotalQuestions()) * 100)}% Complete
                  </div>
                </div>
              )}
              
              {/* Live Status */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${sessionState === 'discussion' ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                <div className="text-right">
                  <div className="text-sm font-medium text-white">
                    {sessionContext.liveTranscript.length} insights captured
                  </div>
                  <div className="text-xs text-blue-200">
                    {sessionState === 'discussion' ? 'Session Active' : sessionState === 'intro' ? 'Ready to Begin' : 'Session Paused'}
                  </div>
                </div>
              </div>
            </div>
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
                    facilitator: "facilitator",
                    topic: sessionConfig.title,
                    currentTopic: sessionConfig.title,
                    liveTranscript: [],
                    aiInsights: [],
                    keyThemes: [],
                    followupQuestions: [],
                    crossReferences: [],
                    sessionSummary: "",
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
                    <option value="Speaker">🗣️ Speaker</option>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md h-24 resize-none text-left"
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
                    Speaker: Question or comment...
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Full Transcript</label>
                  <textarea
                    value={bulkTranscriptText}
                    onChange={(e) => setBulkTranscriptText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md h-64 resize-none font-mono text-sm"
                    placeholder="Paste your full transcript here...\n\nExample:\nSpeaker: Welcome everyone to today's session.\nSpeaker 1: Thank you for having us.\nSpeaker 2: Looking forward to the discussion."
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
