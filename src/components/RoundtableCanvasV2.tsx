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
  speaker?: string; // Optional - only used for legacy entries
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
  const [currentSpeaker, setCurrentSpeaker] = useState<string>('Ari Lehavi, Head of Applied AI at Moody\'s');
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
  // ✅ CLAUDE'S FIX #2: Comprehensive callAIAnalysis with loading states and error handling
  const callAIAnalysis = useCallback(async (analysisType: string = 'insights') => {
    // ✅ PREVENT MULTIPLE SIMULTANEOUS CALLS
    if (sessionContext.aiInsights.some(insight => insight.isLoading)) {
      console.log('🚫 AI analysis already in progress, skipping...');
      return;
    }

    try {
      // Build appropriate transcript based on analysis type
      let transcriptText: string;
      let transcriptEntries = sessionContext.liveTranscript;
      
      if (analysisType === 'insights') {
        // For insights: Find the last insight and only include transcript entries after that point
        const lastInsightIndex = sessionContext.aiInsights
          .map(insight => insight.type === 'insights' ? insight.timestamp : null)
          .filter(timestamp => timestamp !== null)
          .length;
        
        // Get entries since the last insight (track by entry index rather than timestamp for accuracy)
        const lastAnalyzedEntryCount = sessionContext.aiInsights
          .filter(insight => insight.type === 'insights' && !insight.isError)
          .reduce((maxCount, insight) => {
            const entryCountAtInsight = insight.transcriptEntryCount || 0;
            return Math.max(maxCount, entryCountAtInsight);
          }, 0);
        
        transcriptEntries = sessionContext.liveTranscript.slice(lastAnalyzedEntryCount);
        
        if (transcriptEntries.length === 0) {
          // No new content since last insights
          transcriptText = "No new conversation content has been added since the last insight generation.";
        } else {
          transcriptText = transcriptEntries
            .map(entry => entry.text) // Remove speaker labels as per user requirements
            .join('\n');
        }
        
        console.log(`🔍 Insights Analysis: Analyzing ${transcriptEntries.length} new entries (from entry ${lastAnalyzedEntryCount} onwards)`);
      } else {
        // For synthesis and other types: Use cumulative transcript up to current point
        transcriptText = sessionContext.liveTranscript
          .map(entry => entry.text) // Remove speaker labels as per user requirements
          .join('\n');
        console.log(`📊 ${analysisType} Analysis: Analyzing full cumulative transcript (${sessionContext.liveTranscript.length} entries)`);
      }
      
      console.log('🔍 Starting AI Analysis:', {
        type: analysisType,
        transcriptLength: transcriptText.length,
        entryCount: sessionContext.liveTranscript.length,
        topic: sessionContext.currentTopic
      });

      // ✅ ADD LOADING STATE TO PREVENT LOOPS
      const loadingInsightId = `loading_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionContext(prev => ({
        ...prev,
        aiInsights: [...prev.aiInsights, {
          id: loadingInsightId,
          type: analysisType,
          content: '',
          timestamp: new Date(),
          confidence: 0,
          isLoading: true // ✅ ADD THIS FLAG
        }]
      }));

      // TRY NEW /api/analyze-live endpoint first (strict JSON)
      try {
        const liveResponse = await fetch('/api/analyze-live', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionTopic: sessionContext.currentTopic || 'Strategic Planning Session',
            liveTranscript: transcriptText || "No conversation content has been captured yet in this live session.",
            analysisType: analysisType, // ✅ NOW INCLUDES 'transition'
            participantCount: Math.max(1, sessionContext.liveTranscript.length > 0 ? 1 : 1), // Single conversation flow without speaker differentiation
            clientId: 'live-session'
          })
        });

        if (liveResponse.ok) {
          const result = await liveResponse.json();
          console.log('✅ Live AI Analysis (new endpoint):', result);
          
          if (result.success && result.content) {
            // ✅ REPLACE LOADING INSIGHT WITH REAL RESULT
            setSessionContext(prev => ({
              ...prev,
              aiInsights: prev.aiInsights.map(insight => 
                insight.id === loadingInsightId 
                  ? {
                      id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                      type: analysisType,
                      content: result.content,
                      timestamp: new Date(),
                      confidence: result.confidence || 0.85,
                      suggestions: result.suggestions || [],
                      metadata: result.metadata || {},
                      transcriptEntryCount: prev.liveTranscript.length, // ✅ TRACK TRANSCRIPT POSITION FOR INCREMENTAL INSIGHTS
                      isLoading: false // ✅ CLEAR LOADING STATE
                    }
                  : insight
              )
            }));
            return; // ✅ SUCCESS - don't fall back to legacy endpoint
          }
        }

        // ✅ REMOVE LOADING INSIGHT IF FAILED
        setSessionContext(prev => ({
          ...prev,
          aiInsights: prev.aiInsights.filter(insight => insight.id !== loadingInsightId)
        }));

      } catch (liveError) {
        console.log('⚠️ Live endpoint failed, falling back to legacy endpoint');
        
        // ✅ REMOVE LOADING INSIGHT
        setSessionContext(prev => ({
          ...prev,
          aiInsights: prev.aiInsights.filter(insight => insight.id !== loadingInsightId)
        }));
      }

      // FALLBACK: Try legacy /api/analyze endpoint  
      try {
        const legacyResponse = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionContext: sessionContext.currentTopic || 'Strategic Planning Session',
            currentTranscript: transcriptText || "No comments have been added yet.",
            analysisType: analysisType === 'transition' ? 'insights' : analysisType // ✅ MAP 'transition' to 'insights' for legacy
          })
        });
        
        if (legacyResponse.ok) {
          const legacyResult = await legacyResponse.text();
          console.log('✅ Legacy AI Analysis:', legacyResult);
          
          // ✅ ADD LEGACY RESULT
          setSessionContext(prev => ({
            ...prev,
            aiInsights: [...prev.aiInsights, {
              id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: analysisType,
              content: legacyResult,
              timestamp: new Date(),
              confidence: 0.8,
              transcriptEntryCount: prev.liveTranscript.length, // ✅ TRACK TRANSCRIPT POSITION FOR INCREMENTAL INSIGHTS
              isLegacy: true,
              isLoading: false
            }]
          }));
          return;
        }

        throw new Error(`Legacy API failed with status: ${legacyResponse.status}`);

      } catch (legacyError) {
        console.error('❌ Both AI endpoints failed:', legacyError);
        
        // ✅ ADD ERROR INSIGHT INSTEAD OF THROWING
        setSessionContext(prev => ({
          ...prev,
          aiInsights: [...prev.aiInsights, {
            id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: analysisType,
            content: 'AI analysis temporarily unavailable. Please try again or continue with manual facilitation.',
            timestamp: new Date(),
            confidence: 0,
            isError: true,
            isLoading: false
          }]
        }));
      }

    } catch (error) {
      console.error('❌ AI Analysis Error:', error);
      
      // ✅ HANDLE ALL ERRORS GRACEFULLY - NO UNHANDLED PROMISES
      setSessionContext(prev => ({
        ...prev,
        aiInsights: [...prev.aiInsights.filter(insight => !insight.isLoading), {
          id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: analysisType,
          content: 'AI analysis temporarily unavailable. Please try again or continue with manual facilitation.',
          timestamp: new Date(),
          confidence: 0,
          isError: true,
          isLoading: false
        }]
      }));
    }
  }, [sessionContext.liveTranscript, sessionContext.currentTopic]); // ✅ PROPER DEPENDENCIES

  // Agenda Navigation Functions
  const goToNextQuestion = useCallback(() => {
    const totalQuestions = getTotalQuestions();
    if (sessionContext.currentQuestionIndex < totalQuestions - 1) {
      const currentQuestion = getCurrentQuestion(sessionContext.currentQuestionIndex);
      const timeSpent = sessionContext.questionStartTime 
        ? Math.floor((Date.now() - sessionContext.questionStartTime.getTime()) / (60 * 1000))
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
        callAIAnalysis('facilitation'); // ✅ FIXED: Use valid enum value instead of 'transition'
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
        speaker: entry.speaker || 'Unknown Speaker',
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
  // 🚨 SIMPLIFIED FORMATTING ONLY - NO COMPLEX CSS REFERENCES
  // ✅ REMOVED formatAIInsights - was causing infinite loop with console.log side effects

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

  // Render executive-ready session setup
  const renderIntroState = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Executive Header */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white py-12">
        <div className="max-w-4xl mx-auto px-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white bg-opacity-20 rounded-full mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <h1 className="text-4xl font-bold mb-4">AI Strategic Co-Facilitator</h1>
            <p className="text-xl text-blue-100 mb-2">Enterprise AI Transformation Roundtable</p>
            <div className="flex items-center justify-center space-x-6 text-sm text-blue-200">
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                Live AI Analysis
              </span>
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                Real-Time Transcription
              </span>
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                Executive Reporting
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Setup Content */}
      <div className="max-w-5xl mx-auto px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Setup Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                <svg className="w-6 h-6 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                Session Configuration
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Session Topic</label>
                  <input
                    type="text"
                    value={sessionContext.currentTopic || 'When AI Becomes How the Enterprise Works'}
                    onChange={(e) => setSessionContext(prev => ({
                      ...prev,
                      currentTopic: e.target.value
                    }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="When AI Becomes How the Enterprise Works"
                  />
                  <p className="text-xs text-gray-500 mt-1">This will appear in your session header and reports</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Facilitator</label>
                  <input
                    type="text"
                    value={currentSpeaker || 'Ari Lehavi, Head of Applied AI at Moody\'s'}
                    onChange={(e) => setCurrentSpeaker(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Ari Lehavi, Head of Applied AI at Moody's"
                  />
                  <p className="text-xs text-gray-500 mt-1">This identifies your contributions in transcripts and analysis</p>
                </div>

                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-6">
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-emerald-900 mb-2">Ready for Enterprise Deployment</h3>
                      <p className="text-sm text-emerald-800 mb-3">Your AI co-facilitator is configured and ready to enhance your strategic discussions with real-time insights and comprehensive documentation.</p>
                      <div className="text-xs text-emerald-700">
                        <span className="font-medium">Next:</span> Click "Launch Strategic Session" to begin AI-powered facilitation
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={startSession}
                  disabled={!currentSpeaker.trim()}
                  className="btn-primary btn-large w-full flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                  <span>Launch Strategic Session</span>
                </button>
              </div>
            </div>
          </div>

          {/* Feature Showcase */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                AI Co-Facilitation Features
              </h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Live Strategic Insights</p>
                    <p className="text-xs text-gray-600">Real-time AI analysis of discussion themes and strategic implications</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Dynamic Follow-up Questions</p>
                    <p className="text-xs text-gray-600">Context-aware questions to deepen strategic exploration</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-emerald-600 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Intelligent Transcription</p>
                    <p className="text-xs text-gray-600">Speech-to-text with speaker detection and conversation flow</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-orange-600 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Executive Summary Export</p>
                    <p className="text-xs text-gray-600">Professional PDF reports with key insights and action items</p>
                  </div>
                </div>
              </div>
            </div>


          </div>
        </div>
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
      {/* Executive-Grade Session Progress */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
              </svg>
              Strategic Session Progress
            </h3>
            <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              {Math.round(progressPercentage)}% Complete
            </span>
          </div>
          
          {/* Enhanced Progress Bar */}
          <div className="relative">
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            
            {/* Phase Indicators */}
            <div className="flex justify-between text-xs text-gray-600">
              {roundtableQuestions.map((question, index) => (
                <div 
                  key={index}
                  className={`text-center flex-1 ${
                    index <= sessionContext.currentQuestionIndex ? 'text-blue-600 font-medium' : 'text-gray-400'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${
                    index <= sessionContext.currentQuestionIndex ? 'bg-blue-600' : 'bg-gray-300'
                  }`}></div>
                  <div className="truncate px-1">
                    Phase {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Navigation Controls */}
          <div className="flex justify-between items-center mt-6">
            <button
              onClick={goToPreviousQuestion}
              disabled={sessionContext.currentQuestionIndex === 0}
              className={`btn-nav btn-compact ${
                sessionContext.currentQuestionIndex === 0 ? 'btn-disabled' : ''
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
              </svg>
              <span>Previous Phase</span>
            </button>
            
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900">
                Question {sessionContext.currentQuestionIndex + 1} of {totalQuestions}
              </div>
              <div className="text-xs text-gray-500">
                Strategic Discussion Phase
              </div>
            </div>
            
            <button
              onClick={goToNextQuestion}
              disabled={sessionContext.currentQuestionIndex >= totalQuestions - 1}
              className={`btn-primary btn-compact ${
                sessionContext.currentQuestionIndex >= totalQuestions - 1 ? 'btn-disabled' : ''
              }`}
            >
              <span>Next Phase</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Current Question Display */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Current Discussion Focus</h3>
              <p className="text-xs text-gray-600">Phase {sessionContext.currentQuestionIndex + 1} Strategic Question</p>
            </div>
          </div>
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
      
      {/* Executive-Grade Unified Live Discussion Capture */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Professional Header with Live Status */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-5 6.93V21a1 1 0 11-2 0v-2.07A7 7 0 015 11h2m5.1 11a7 7 0 003.9 0"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6M9 8h6"/>
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold">Strategic Discussion Capture</h2>
                <div className="flex items-center space-x-4 text-sm text-blue-100">
                  <span>{sessionContext.currentTopic || 'Enterprise AI Transformation'}</span>
                </div>
              </div>
            </div>
            
            {/* Live Status Indicator */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${speechTranscription.isListening ? 'bg-red-400 animate-pulse' : 'bg-green-400'}`}></div>
              <span className="text-sm font-medium">
                {speechTranscription.isListening ? 'Live Recording' : 'Ready to Capture'}
              </span>
            </div>
          </div>
        </div>

        {/* Executive Control Panel */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-5 border-b border-gray-200">
          <div className="flex items-center justify-between">

            
            {/* Professional Action Controls */}
            <div className="flex items-center space-x-3">
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
                className={`btn-compact flex items-center space-x-2 ${
                  speechTranscription.isListening 
                    ? 'btn-danger animate-pulse' 
                    : 'btn-success'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {speechTranscription.isListening ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-5 6.93V21a1 1 0 11-2 0v-2.07A7 7 0 015 11h2m5.1 11a7 7 0 003.9 0"/>
                  )}
                </svg>
                <span>{speechTranscription.isListening ? 'Stop Recording' : 'Start Recording'}</span>
              </button>
              
              <button
                onClick={addManualEntry}
                className="btn-secondary btn-compact flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
                <span>Manual Entry</span>
              </button>
              
              <button
                onClick={endSession}
                className="btn-danger btn-compact flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10l6 6M15 10l-6 6"/>
                </svg>
                <span>End Session</span>
              </button>
            </div>
          </div>
          
          {/* Enhanced Recording Status */}
          {speechTranscription.isListening && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-red-900">Live Recording Active</span>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">AI Transcription Enabled</span>
                  </div>
                  <p className="text-xs text-red-700 mt-1">Strategic insights are being captured and processed in real-time for immediate analysis</p>
                </div>
              </div>
            </div>
          )}
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
            <div className="space-y-4">
              <div 
                ref={transcriptRef}
                className="bg-white rounded-xl p-6 border border-gray-200 max-h-96 overflow-y-auto"
              >
                <div className="prose prose-sm max-w-none">
                  {sessionContext.liveTranscript.length === 0 ? (
                    <p className="text-gray-500 italic text-center py-8">
                      No conversation captured yet. Start speaking or click "Add Manual Entry" to begin.
                    </p>
                  ) : (
                    <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {formatTranscriptText(sessionContext.liveTranscript)}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Show interim results with professional styling */}
              {interimTranscript && (
                <div className="bg-yellow-50/80 rounded-xl p-4 border border-yellow-200 animate-pulse">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-yellow-600 font-medium text-sm">Speaking...</span>
                  </div>
                  <p className="text-gray-700 italic">{interimTranscript}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>




    </div>
    );
  };

  // Format transcript text with punctuation and paragraph breaks
  const formatTranscriptText = (transcript: TranscriptEntry[]): string => {
    if (transcript.length === 0) return '';
    
    let formattedText = '';
    let previousTimestamp: Date | null = null;
    
    transcript.forEach((entry, index) => {
      const currentText = entry.text.trim();
      if (!currentText) return;
      
      // Detect pause (more than 3 seconds between entries)
      const isPause = previousTimestamp && 
        (entry.timestamp.getTime() - previousTimestamp.getTime()) > 3000;
      
      // Add paragraph break after significant pause
      if (isPause && formattedText.length > 0) {
        formattedText += '\n\n';
      } else if (formattedText.length > 0) {
        formattedText += ' ';
      }
      
      // Process the text for natural punctuation
      let processedText = currentText;
      
      // Add commas after common speech patterns
      processedText = processedText.replace(/\b(and|but|so|well|now|then|also|actually|basically)\b/gi, (match, word) => {
        const prevChar = processedText[processedText.indexOf(match) - 1];
        return (prevChar && prevChar !== ',' && prevChar !== ' ') ? ', ' + word : word;
      });
      
      // Add periods before introducing new topics or speakers
      processedText = processedText.replace(/\b(I am|my name is|this is|hi I'm|hello I'm|I work|I run)\b/gi, (match, phrase) => {
        const isStart = processedText.indexOf(match) < 10;
        return isStart ? match : '. ' + phrase;
      });
      
      // Capitalize first letter if needed
      if (formattedText.length === 0 || formattedText.endsWith('\n\n')) {
        processedText = processedText.charAt(0).toUpperCase() + processedText.slice(1);
      }
      
      formattedText += processedText;
      previousTimestamp = entry.timestamp;
    });
    
    // Add final period if text doesn't end with punctuation
    if (formattedText && !formattedText.match(/[.!?]$/)) {
      formattedText += '.';
    }
    
    return formattedText;
  };

  // Render AI Assistance Panel (RIGHT PANE)
  const renderAIAssistancePanel = () => {
    // ✅ GET ONLY THE LATEST NON-LOADING INSIGHT (no function call in render)
    const latestInsight = sessionContext.aiInsights
      .filter(insight => !insight.isLoading)
      .slice(-1)[0];

    return (
      <div className="h-full overflow-y-auto">
        {/* AI Panel Header */}
        <div className="bg-white p-4 border-b border-gray-200 mb-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">🧠 AI Co-Facilitator</h3>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => callAIAnalysis('insights')}
              disabled={sessionContext.aiInsights.some(insight => insight.isLoading)}
              className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ⭐ Get Insights
            </button>
            <button
              onClick={() => callAIAnalysis('followup')}
              disabled={sessionContext.aiInsights.some(insight => insight.isLoading)}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ❓ Follow-up Questions
            </button>
            <button
              onClick={() => callAIAnalysis('synthesis')}
              disabled={sessionContext.aiInsights.some(insight => insight.isLoading)}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📊 Synthesize
            </button>
            <button
              onClick={handleExportPDF}
              disabled={isExporting || sessionContext.liveTranscript.length === 0}
              className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
              title="Export session summary as PDF"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <span>{isExporting ? 'Exporting...' : '📄 Export PDF'}</span>
            </button>
          </div>
        </div>

        {/* AI Insights Display */}
        <div className="p-4">
          {sessionContext.aiInsights.some(insight => insight.isLoading) ? (
            <div className="flex items-center space-x-2 text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>AI analyzing...</span>
            </div>
          ) : latestInsight ? (
            <div className={`p-4 rounded-lg ${latestInsight.isError ? 'bg-yellow-50 border border-yellow-200' : 'bg-blue-50 border border-blue-200'}`}>
              <div className="text-sm text-gray-600 mb-2">
                {latestInsight.isError ? '⚠️ Error' : '🤖'} AI Analysis ({latestInsight.type})
                {latestInsight.isLegacy && ' - Legacy'}
                <span className="float-right">{latestInsight.timestamp.toLocaleTimeString()}</span>
              </div>
              <div className="text-gray-800 whitespace-pre-line">
                {/* ✅ DIRECT DISPLAY - NO FUNCTION CALL */}
                {latestInsight.content}
              </div>
              {latestInsight.confidence > 0 && (
                <div className="text-xs text-gray-500 mt-2">
                  Confidence: {Math.round(latestInsight.confidence * 100)}%
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500 italic">
              Start recording or add manual entries, then use the analysis buttons above
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render summary state
  const renderSummaryState = () => (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-3xl font-bold mb-6 text-center">📊 Session Summary</h2>
      
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded">
            <h3 className="font-semibold text-blue-800">Duration</h3>
            <p className="text-2xl text-blue-600">{Math.floor((sessionContext.duration || 0) / (60))}:{String((sessionContext.duration || 0) % 60).padStart(2, '0')}</p>
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
