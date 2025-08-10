'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { sessionConfig, uiText, AI_TRANSFORMATION_QUESTIONS, getCurrentQuestion, getTotalQuestions } from '../config/ai-transformation-config';
import { useSpeechTranscription, TranscriptEvent } from '../hooks/useSpeechTranscription';
import { saveSession, loadSession, clearSession, SessionSnapshot } from '../utils/storage';
import { generateSessionPDF, prepareSessionDataForExport } from '../utils/pdfExport';
import FacilitatorPanel from './FacilitatorPanel';
import { SessionState, TranscriptEntry, SessionContext } from '@/types/session';
import { MIN_WORDS_FOR_INSIGHTS } from '../constants/speech';
import { useToast } from '@/components/ToastProvider';

// ==========================================
// TYPES AND INTERFACES
// ==========================================

type RightPanelTab = 'guide' | 'insights' | 'synthesis' | 'followup' | 'executive';
type EntryMode = 'single' | 'bulk';

interface AIInsight {
  id: string;
  type: string;
  content: string;
  timestamp: Date;
  confidence?: number;
  suggestions?: string[];
  metadata?: any;
  isLegacy?: boolean;
  isError?: boolean;
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const formatAIContent = (content: string): string => {
  return content
    .replace(/(\d+\.)\s+/g, '\n$1 ')
    .replace(/(\*\*[^*]+\*\*:)/g, '\n\n$1')
    .replace(/(\n-\s+)/g, '\n\n- ')
    .replace(/(\*\*[^*]+\*\*)\s*([^:])/g, '$1\n\n$2')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

// ==========================================
// SUB-COMPONENTS
// ==========================================

const RecordingIndicator: React.FC<{ isRecording: boolean }> = ({ isRecording }) => {
  if (!isRecording) return null;
  
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 rounded-full text-sm shadow-lg">
      <div className="relative">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        <div className="absolute inset-0 w-2 h-2 bg-white rounded-full animate-ping" />
      </div>
      <span className="font-medium">Recording</span>
    </div>
  );
};

const AIInsightCard: React.FC<{ insight: AIInsight; type: string }> = ({ insight, type }) => {
  const bgColors = {
    insights: 'bg-blue-50 border-blue-200',
    synthesis: 'bg-green-50 border-green-200',
    followup: 'bg-purple-50 border-purple-200',
    executive: 'bg-indigo-50 border-indigo-200'
  };
  
  const bgColor = bgColors[type as keyof typeof bgColors] || 'bg-gray-50 border-gray-200';
  
  return (
    <div className={`rounded-lg p-4 border ${bgColor} shadow-sm hover:shadow-md transition-shadow`}>
      <div className="prose prose-sm max-w-none">
        {type === 'followup' ? (
          <ol className="space-y-3 list-decimal list-inside">
            {insight.content.split(/\d+\./).filter((q: string) => q.trim()).map((question: string, idx: number) => (
              <li key={idx} className="text-gray-800 leading-relaxed">
                {question.trim()}
              </li>
            ))}
          </ol>
        ) : (
          <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
            {formatAIContent(insight.content)}
          </div>
        )}
      </div>
      <div className="mt-3 pt-3 border-t border-gray-200">
        <span className="text-xs text-gray-500">
          {new Date(insight.timestamp).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })}
        </span>
      </div>
    </div>
  );
};

// ==========================================
// MAIN COMPONENT
// ==========================================

const RoundtableCanvasV2: React.FC = () => {
  const { showToast } = useToast();
  
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  
  // Core Session State
  const [sessionState, setSessionState] = useState<SessionState>('intro');
  const [sessionContext, setSessionContext] = useState<SessionContext>({
    state: 'intro',
    startTime: new Date(),
    facilitator: 'Ari Lehavi',
    topic: 'AI Transformation Strategy',
    currentTopic: 'AI Transformation Strategy',
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingType, setAnalyzingType] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [currentUtterance, setCurrentUtterance] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('guide');
  const [presentationMode, setPresentationMode] = useState(false);
  
  // Manual Entry Modal State
  const [showManualModal, setShowManualModal] = useState(false);
  const [entryMode, setEntryMode] = useState<EntryMode>('single');
  const [manualEntryText, setManualEntryText] = useState('');
  const [bulkTranscriptText, setBulkTranscriptText] = useState('');
  
  // Refs
  const utteranceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // ==========================================
  // HOOKS AND EFFECTS
  // ==========================================

  // Initialize speech transcription
  const speechTranscription = useSpeechTranscription(
    (partialText: string) => {
      setInterimTranscript(partialText);
      handleTranscriptionUpdate(partialText, false);
    },
    (finalEvent: TranscriptEvent) => {
      setInterimTranscript('');
      handleTranscriptionUpdate(finalEvent.text, true);
    },
    (error: string) => {
      if (error === 'not-allowed' || error === 'audio-capture') {
        setSpeechError('Microphone access required');
      } else {
        setSpeechError(null);
      }
    }
  );

  // Memoized values
  const currentQuestion = useMemo(
    () => getCurrentQuestion(sessionContext.currentQuestionIndex),
    [sessionContext.currentQuestionIndex]
  );

  const totalQuestions = useMemo(() => getTotalQuestions(), []);

  // Update speech error from hook
  useEffect(() => {
    setSpeechError(speechTranscription.error);
  }, [speechTranscription.error]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (utteranceTimeoutRef.current) {
        clearTimeout(utteranceTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Keyboard shortcut for presentation mode
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setPresentationMode(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Session recovery on mount
  useEffect(() => {
    const savedSession = loadSession();
    if (savedSession && sessionState === 'intro') {
      const recoveredContext = snapshotToSessionContext(savedSession);
      setSessionContext(recoveredContext);
      setSessionState(recoveredContext.state);
      
      showToast({
        type: 'info',
        title: 'Session Restored',
        message: 'Your previous session has been restored.'
      });
    }
  }, []); // Only run on mount

  // Auto-save session
  useEffect(() => {
    if (sessionState !== 'intro' || sessionContext.liveTranscript.length > 0) {
      const snapshot = sessionContextToSnapshot(sessionContext);
      saveSession(snapshot);
    }
  }, [
    sessionContext.liveTranscript,
    sessionContext.aiInsights,
    sessionContext.currentQuestionIndex,
    sessionState
  ]);

  // Auto-trigger AI insights
  useEffect(() => {
    const entryCount = sessionContext.liveTranscript.length;
    if (entryCount < 5) return;
    
    const lastInsightTime = sessionContext.aiInsights.length > 0 ? 
      sessionContext.aiInsights[sessionContext.aiInsights.length - 1].timestamp.getTime() : 0;
    const timeSinceLastInsight = Date.now() - lastInsightTime;
    const MIN_TIME_BETWEEN_AUTO_INSIGHTS = 3 * 60 * 1000; // 3 minutes
    
    if (entryCount > 0 && entryCount % 7 === 0 && timeSinceLastInsight > MIN_TIME_BETWEEN_AUTO_INSIGHTS) {
      setTimeout(() => {
        callAIAnalysis('insights');
      }, 2000);
    }
  }, [sessionContext.liveTranscript.length, sessionContext.aiInsights]);

  // ==========================================
  // HELPER FUNCTIONS
  // ==========================================

  const sessionContextToSnapshot = useCallback((context: SessionContext): SessionSnapshot => {
    return {
      timestamp: Date.now(),
      sessionState: context.state,
      currentTopic: context.currentTopic,
      facilitator: context.facilitator,
      participantCount: new Set(context.liveTranscript.map(e => e.speaker)).size,
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
      facilitator: snapshot.facilitator || 'Ari Lehavi',
      topic: snapshot.currentTopic || 'AI Transformation Strategy',
      currentTopic: snapshot.currentTopic || 'AI Transformation Strategy',
      liveTranscript: snapshot.liveTranscript.map(entry => ({
        id: entry.id,
        speaker: entry.speaker,
        text: entry.text,
        timestamp: new Date(entry.timestamp),
        isAutoDetected: entry.isAutoDetected || false,
        confidence: entry.confidence || 1.0
      })),
      aiInsights: snapshot.aiInsights.map(insight => ({
        id: insight.id,
        type: insight.type,
        content: insight.content,
        timestamp: new Date(insight.timestamp),
        confidence: insight.confidence || 0.85,
        suggestions: insight.suggestions || [],
        metadata: insight.metadata || {},
        isLegacy: insight.isLegacy || false,
        isError: insight.isError || false
      })),
      keyThemes: [],
      followupQuestions: [],
      crossReferences: [],
      sessionSummary: '',
      currentQuestionIndex: snapshot.currentQuestionIndex,
      questionStartTime: snapshot.questionStartTime ? new Date(snapshot.questionStartTime) : undefined,
      agendaProgress: snapshot.agendaProgress || {}
    };
  }, []);

  const getInsightsForType = (type: string) => {
    return sessionContext.aiInsights.filter(i => i.type === type);
  };

  // ==========================================
  // CORE FUNCTIONS
  // ==========================================

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
    // Confirm before ending session
    const confirmEnd = window.confirm(
      'Are you sure you want to end this session? This will stop recording and take you to the summary page.'
    );
    
    if (!confirmEnd) return;
    
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

  const goToNextQuestion = useCallback(() => {
    if (sessionContext.currentQuestionIndex < totalQuestions - 1) {
      setSessionContext(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
        questionStartTime: new Date()
      }));
    }
  }, [sessionContext.currentQuestionIndex, totalQuestions]);

  const goToPreviousQuestion = useCallback(() => {
    if (sessionContext.currentQuestionIndex > 0) {
      setSessionContext(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex - 1,
        questionStartTime: new Date()
      }));
    }
  }, [sessionContext.currentQuestionIndex]);

  const handleExportFullPDF = useCallback(async () => {
    if (isExporting) return;
    
    try {
      setIsExporting(true);
      const exportData = prepareSessionDataForExport(sessionContext);
      await generateSessionPDF(exportData);
      
      showToast({
        type: 'success',
        title: 'Full Export Ready',
        message: 'Your complete session PDF with transcript has been generated.'
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      showToast({
        type: 'error',
        title: 'Export failed',
        message: 'PDF export failed. Please try again.',
        action: { label: 'Retry', onClick: () => handleExportFullPDF() }
      });
    } finally {
      setIsExporting(false);
    }
  }, [sessionContext, isExporting, showToast]);

  const handleExportPDF = useCallback(async () => {
    if (isExporting) return;
    
    try {
      setIsExporting(true);
      const exportData = prepareSessionDataForExport(sessionContext);
      
      // Calculate session metrics from context
      const sessionDuration = exportData.sessionContext.startTime 
        ? Math.round((Date.now() - exportData.sessionContext.startTime.getTime()) / (1000 * 60))
        : 0;
      const totalQuestions = sessionContext.currentQuestionIndex !== undefined ? sessionContext.currentQuestionIndex + 1 : 0;
      
      // Create executive summary version
      const executiveSummaryData = {
        ...exportData,
        sessionContext: {
          ...exportData.sessionContext,
          // No transcript - just metadata
          liveTranscript: [],
          // Organize insights by type for better executive reading
          aiInsights: [
            // Session Overview (metadata only)
            {
              id: 'session-overview',
              type: 'overview',
              content: `Session Duration: ${sessionDuration} minutes
Total Discussion Points: ${exportData.sessionContext.liveTranscript.length}
Phases Completed: ${exportData.sessionContext.currentQuestionIndex + 1} of ${totalQuestions}`,
              timestamp: new Date(),
              confidence: 1.0,
              suggestions: [],
              metadata: {},
              isLegacy: false,
              isError: false
            },
            // Executive Summary (if exists)
            ...exportData.sessionContext.aiInsights.filter(i => i.type === 'executive'),
            // Key Synthesis
            ...exportData.sessionContext.aiInsights.filter(i => i.type === 'synthesis'),
            // Strategic Insights
            ...exportData.sessionContext.aiInsights.filter(i => i.type === 'insights'),
            // Follow-up Questions
            ...exportData.sessionContext.aiInsights.filter(i => i.type === 'followup'),
          ].filter(Boolean)
        }
      };
      
      // Modify the session topic for the filename
      const modifiedExportData = {
        ...executiveSummaryData,
        sessionContext: {
          ...executiveSummaryData.sessionContext,
          topic: `${executiveSummaryData.sessionContext.topic} - Executive Summary`
        }
      };
      
      await generateSessionPDF(modifiedExportData);
      
      showToast({
        type: 'success',
        title: 'Executive Summary Ready',
        message: 'Your executive summary PDF has been generated (AI insights only).'
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      showToast({
        type: 'error',
        title: 'Export failed',
        message: 'PDF export failed. Please try again.',
        action: { label: 'Retry', onClick: () => handleExportPDF() }
      });
    } finally {
      setIsExporting(false);
    }
  }, [sessionContext, isExporting, showToast]);

  const toggleRecording = useCallback(() => {
    if (speechTranscription.isListening) {
      speechTranscription.stop();
      setIsRecording(false);
    } else {
      speechTranscription.start();
      setIsRecording(true);
    }
  }, [speechTranscription]);

  const handleTranscriptionUpdate = useCallback((text: string, isFinal: boolean) => {
    if (utteranceTimeoutRef.current) {
      clearTimeout(utteranceTimeoutRef.current);
      utteranceTimeoutRef.current = null;
    }
    
    if (isFinal) {
      const completeText = (currentUtterance + ' ' + text).trim();
      
      if (completeText.length > 5) {
        addTranscriptEntry({
          text: completeText,
          speaker: 'Speaker',
          isAutoDetected: false,
          confidence: 1.0
        });
        setCurrentUtterance('');
      }
    } else {
      setCurrentUtterance(prev => (prev + ' ' + text).trim());
      
      utteranceTimeoutRef.current = setTimeout(() => {
        if (currentUtterance.length > 5) {
          addTranscriptEntry({
            text: currentUtterance,
            speaker: 'Speaker',
            isAutoDetected: false,
            confidence: 1.0
          });
          setCurrentUtterance('');
        }
      }, 1500);
    }
  }, [currentUtterance, addTranscriptEntry]);

  const submitManualEntry = useCallback(() => {
    if (entryMode === 'single' && manualEntryText.trim()) {
      addTranscriptEntry({
        speaker: 'Speaker',
        text: manualEntryText.trim(),
        isAutoDetected: true,
        confidence: 1.0
      });
      
      setManualEntryText('');
      setShowManualModal(false);
    } else if (entryMode === 'bulk' && bulkTranscriptText.trim()) {
      const lines = bulkTranscriptText.split('\n').filter(line => line.trim());
      let entriesAdded = 0;
      
      lines.forEach(line => {
        const match = line.match(/^([^:]+):\s*(.+)$/);
        if (match) {
          const [, speaker, text] = match;
          const finalSpeaker = speaker.trim().toLowerCase() === 'auto' ? 'Speaker' : speaker.trim();
          
          addTranscriptEntry({
            speaker: finalSpeaker,
            text: text.trim(),
            isAutoDetected: speaker.trim().toLowerCase() === 'auto',
            confidence: 1.0
          });
          entriesAdded++;
        }
      });
      
      setBulkTranscriptText('');
      setShowManualModal(false);
      showToast({
        type: 'success',
        title: 'Entries Added',
        message: `Added ${entriesAdded} entries from bulk paste`
      });
    }
  }, [entryMode, manualEntryText, bulkTranscriptText, addTranscriptEntry, showToast]);

  // ==========================================
  // AI ANALYSIS
  // ==========================================

  const validateInsightContent = useCallback((content: string, analysisType: string, existingInsights: any[]) => {
    const cleanContent = content?.trim() || '';
    if (!cleanContent || cleanContent.length < 10) {
      return {
        isValid: false,
        reason: 'Content too short or empty',
        message: 'AI analysis returned insufficient content. Please try again.'
      };
    }

    const contentPrefix = cleanContent.toLowerCase().substring(0, 100);
    const isDuplicate = existingInsights
      .filter(insight => insight.type === analysisType && !insight.isError)
      .some(insight => {
        const existingPrefix = (insight.content || '').toLowerCase().substring(0, 100);
        return existingPrefix === contentPrefix;
      });

    if (isDuplicate) {
      return {
        isValid: false,
        reason: 'Duplicate content detected',
        message: `This ${analysisType} analysis appears to be a duplicate. Please try generating a new one.`
      };
    }

    return { isValid: true };
  }, []);

  const getPreviousFollowupQuestions = useCallback(() => {
    return sessionContext.aiInsights
      .filter(insight => insight.type === 'followup')
      .map(insight => insight.content)
      .slice(-10);
  }, [sessionContext.aiInsights]);

  const getPhaseSpecificContext = useCallback((
    analysisType: string, 
    currentQuestion: any,
    phase: number
  ) => {
    const guidance = currentQuestion?.facilitatorGuidance;
    
    switch(analysisType) {
      case 'insights':
        return {
          instruction: `Based on the "${currentQuestion?.title}" discussion, identify strategic insights specifically related to: ${guidance?.whatToListenFor?.join(', ') || 'key themes'}`,
          currentPhaseObjective: guidance?.objective || '',
          keyThemesToExtract: guidance?.whatToListenFor || []
        };
        
      case 'synthesis':
        return {
          instruction: `Create a comprehensive synthesis of the ENTIRE session discussion so far. Structure your response with these sections:
      1. Key Themes Discussed - Major topics and patterns
      2. Opportunities Identified - Positive possibilities and potential benefits
      3. Challenges Acknowledged - Concerns, obstacles, and risks raised
      4. Areas of Consensus - Where participants seemed to agree
      5. Diverse Perspectives - Different viewpoints and approaches mentioned
      
      Focus on ideas and themes, not individual speakers. This synthesis should be comprehensive and get richer with each update.`,
          includeAllPhases: true,
          sessionTopic: sessionContext.currentTopic
        };
        
      case 'followup':
        const previousQuestions = getPreviousFollowupQuestions();
        return {
          instruction: `Generate follow-up questions based on gaps in the "${currentQuestion?.title}" discussion. Avoid duplicating previous questions and consider unused prompts from the guide.`,
          suggestedPrompts: guidance?.discussionPrompts || [],
          facilitatorQuestions: guidance?.facilitatorPrompts || [],
          previousQuestions: previousQuestions,
          deduplicationNote: previousQuestions.length > 0 ? `Ensure new questions don't repeat these ${previousQuestions.length} previous follow-up questions.` : null
        };
        
      case 'executive':
        return {
          instruction: `Create a final session summary for "${sessionContext.currentTopic}" session at Ai4 Conference in Las Vegas on August 12, 2025. Facilitated by ${sessionContext.facilitator || 'Ari Lehavi'}, Head of Applied AI at Moody's. 
      
      Structure the summary with these sections:
      1. Session Overview - Brief context, purpose, and key participants
      2. Key Discussion Points - Major topics covered across all phases
      3. Opportunities Identified - Positive possibilities and innovations discussed
      4. Challenges & Concerns - Obstacles and risks acknowledged
      5. Areas of Agreement - Where consensus emerged
      6. Diverse Perspectives - Different viewpoints that enriched the discussion
      7. Key Decisions & Next Steps - Action items or conclusions reached
      
      Include session metadata but do NOT mention participant names or count. Focus entirely on the content of ideas discussed.`,
          sessionMetadata: {
            title: sessionContext.currentTopic,
            event: 'Ai4 Conference, Las Vegas',
            date: 'August 12, 2025',
            facilitator: 'Ari Lehavi, Head of Applied AI, Moody\'s',
            phases: AI_TRANSFORMATION_QUESTIONS.map(q => q.title)
          }
        };
        
      default:
        return { instruction: 'Provide analysis based on the discussion' };
    }
  }, [sessionContext, getPreviousFollowupQuestions]);

  const callAIAnalysis = useCallback(async (analysisType: string = 'insights') => {
    if (isAnalyzing) return;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    try {
      setIsAnalyzing(true);
      setAnalyzingType(analysisType);
      
      const transcriptText = sessionContext.liveTranscript
        .map(entry => `${entry.speaker}: ${entry.text}`)
        .join('\n');
      
      if (transcriptText.length < 200 && analysisType !== 'summary') {
        showToast({
          type: 'warning',
          title: 'More Discussion Needed',
          message: 'Please continue the conversation before requesting AI analysis.'
        });
        return;
      }
      
      const currentQuestion = getCurrentQuestion(sessionContext.currentQuestionIndex);
      const totalQuestions = getTotalQuestions();
      const phaseContext = getPhaseSpecificContext(analysisType, currentQuestion, sessionContext.currentQuestionIndex);
      
      const requestPayload = {
        sessionTopic: sessionContext.currentTopic || 'AI Transformation Strategy',
        liveTranscript: transcriptText,
        analysisType: analysisType,
        sessionContext: {
          topic: sessionContext.currentTopic || 'AI Transformation Strategy',
          currentPhase: sessionContext.currentQuestionIndex + 1,
          totalPhases: totalQuestions,
          currentQuestion: currentQuestion ? {
            title: currentQuestion.title,
            description: currentQuestion.description,
            guidance: currentQuestion.facilitatorGuidance
          } : null,
          participantCount: new Set(sessionContext.liveTranscript.map(e => e.speaker)).size,
          sessionDuration: Math.floor((Date.now() - sessionContext.startTime.getTime()) / 60000),
          lastTranscriptEntries: sessionContext.liveTranscript.slice(-10),
          recentInsights: sessionContext.aiInsights.slice(-3).map(insight => ({
            type: insight.type,
            content: insight.content.substring(0, 200),
            timestamp: insight.timestamp
          })),
          phaseSpecificContext: phaseContext
        }
      };

      try {
        const response = await fetch('/api/analyze-live', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(requestPayload),
          signal: abortControllerRef.current.signal
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        
        if (data.success && data.content) {
          const validation = validateInsightContent(data.content, analysisType, sessionContext.aiInsights);
          
          if (!validation.isValid) {
            showToast({
              type: 'warning',
              title: 'Analysis Needs Refinement',
              message: validation.message || 'Generated analysis needs more context'
            });
            return;
          }
          
          setSessionContext(prev => ({
            ...prev,
            aiInsights: analysisType === 'synthesis' 
              ? [
                  ...prev.aiInsights.filter(insight => insight.type !== 'synthesis'),
                  {
                    id: `insight_${Date.now()}`,
                    type: analysisType,
                    content: data.content,
                    timestamp: new Date(),
                    confidence: data.confidence || 0.85,
                    suggestions: data.suggestions || [],
                    metadata: data.metadata || {}
                  }
                ]
              : [
                  ...prev.aiInsights, 
                  {
                    id: `insight_${Date.now()}`,
                    type: analysisType,
                    content: data.content,
                    timestamp: new Date(),
                    confidence: data.confidence || 0.85,
                    suggestions: data.suggestions || [],
                    metadata: data.metadata || {}
                  }
                ],
          }));
          
          showToast({
            type: 'success',
            title: 'Analysis Complete',
            message: `${analysisType} analysis generated successfully`
          });
          
          return data;
        } else {
          throw new Error('Invalid API response format');
        }
        
      } catch (primaryError: any) {
        if (primaryError.name === 'AbortError') return;
        
        console.warn('Primary endpoint failed, trying fallback:', primaryError);
        
        try {
          const fallbackResponse = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              questionContext: `${sessionContext.currentTopic || 'AI Strategy Session'} - Phase ${sessionContext.currentQuestionIndex + 1}`,
              currentTranscript: transcriptText,
              analysisType: analysisType
            }),
            signal: abortControllerRef.current.signal
          });

          if (!fallbackResponse.ok) {
            throw new Error(`Fallback API Error ${fallbackResponse.status}`);
          }

          const fallbackData = await fallbackResponse.json();
          const content = fallbackData.insights || fallbackData.analysis || fallbackData.result || '';
          
          if (!content) {
            throw new Error('No content in fallback response');
          }
          
          setSessionContext(prev => ({
            ...prev,
            aiInsights: [...prev.aiInsights, {
              id: `insight_${Date.now()}`,
              type: analysisType,
              content: content,
              timestamp: new Date(),
              confidence: 0.75,
              isLegacy: true
            }],
          }));
          
          showToast({
            type: 'success',
            title: 'Analysis Complete',
            message: 'Analysis generated (legacy mode)'
          });
          
          return fallbackData;
          
        } catch (fallbackError: any) {
          if (fallbackError.name === 'AbortError') return;
          
          const primaryMsg = primaryError instanceof Error ? primaryError.message : String(primaryError);
          const fallbackMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
          throw new Error(`All endpoints failed: ${primaryMsg} | ${fallbackMsg}`);
        }
      }
      
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      
      console.error('Complete AI Analysis Failure:', error);
      
      setSessionContext(prev => ({
        ...prev,
        aiInsights: [...prev.aiInsights, {
          id: `error_${Date.now()}`,
          type: 'error',
          content: 'AI analysis temporarily unavailable. You can continue facilitating manually or try again in a moment.',
          timestamp: new Date(),
          confidence: 0,
          isError: true
        }],
      }));
      
      showToast({
        type: 'error',
        title: 'Analysis Failed',
        message: 'Unable to connect to AI services. Please continue manually.',
        action: { 
          label: 'Retry Analysis', 
          onClick: () => callAIAnalysis(analysisType) 
        }
      });
      
      throw error;
    } finally {
      setIsAnalyzing(false);
      setAnalyzingType(null);
    }
  }, [sessionContext, isAnalyzing, showToast, validateInsightContent, getPhaseSpecificContext]);

  // ==========================================
  // RENDER FUNCTIONS
  // ==========================================

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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Session Details</h3>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li>📅 <strong>Date:</strong> August 12, 2025</li>
                  <li>📍 <strong>Event:</strong> Ai4 Conference, Las Vegas</li>
                  <li>👤 <strong>Facilitator:</strong> Ari Lehavi, Head of Applied AI, Moody's</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Session Topic
                </label>
                <input
                  type="text"
                  value={sessionContext.currentTopic || 'AI Transformation Strategy'}
                  onChange={(e) => setSessionContext(prev => ({
                    ...prev,
                    currentTopic: e.target.value
                  }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="AI Transformation Strategy"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Default: AI Transformation Strategy
                </p>
              </div>

              <button
                onClick={startSession}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
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
    return (
      <div className="min-h-screen flex flex-col">
        {/* Header - Fixed to prevent content overlap */}
        <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
          <div className="px-4 md:px-6 py-3 md:py-4">
            <div className="flex items-center justify-between">
              {/* Title */}
              <h1 className="text-sm md:text-base font-semibold text-gray-900 flex-shrink-0">
                <span className="hidden md:inline">🎙️ AI Roundtable Co-Facilitator</span>
                <span className="md:hidden">🎙️ AI Roundtable</span>
              </h1>
              
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-4">
                <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-2">
                  <span className="inline-flex items-center px-3 py-1.5 bg-blue-500 text-white text-sm font-semibold rounded-full shadow-sm">
                    Phase {sessionContext.currentQuestionIndex + 1} of {totalQuestions}
                  </span>
                  
                  <button
                    onClick={goToPreviousQuestion}
                    disabled={sessionContext.currentQuestionIndex === 0}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      sessionContext.currentQuestionIndex === 0
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    ← Previous
                  </button>
                  
                  <button
                    onClick={goToNextQuestion}
                    disabled={sessionContext.currentQuestionIndex >= totalQuestions - 1}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      sessionContext.currentQuestionIndex >= totalQuestions - 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    Next Phase →
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPresentationMode(!presentationMode)}
                    className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors"
                    title="Hide facilitator panel for presentation (Cmd+P)"
                  >
                    {presentationMode ? '👁️ Exit Presentation' : '📊 Presentation Mode'}
                  </button>
                  
                  <button
                    onClick={handleExportPDF}
                    disabled={isExporting || sessionContext.liveTranscript.length === 0}
                    className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:bg-gray-300"
                    title="Export executive summary as PDF"
                  >
                    {isExporting ? '⏳ Exporting...' : '📋 Export Summary'}
                  </button>

                  <button
                    onClick={endSession}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                    title="End the session and view summary"
                  >
                    🏁 End Session
                  </button>
                </div>
              </div>
              
              {/* Mobile Navigation */}
              <div className="flex md:hidden items-center gap-2">
                <button
                  onClick={goToPreviousQuestion}
                  disabled={sessionContext.currentQuestionIndex === 0}
                  className={`p-2 rounded-lg transition-colors ${
                    sessionContext.currentQuestionIndex === 0
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <span className="text-sm font-medium text-gray-600 px-2">
                  {sessionContext.currentQuestionIndex + 1}/{totalQuestions}
                </span>
                
                <button
                  onClick={goToNextQuestion}
                  disabled={sessionContext.currentQuestionIndex >= totalQuestions - 1}
                  className={`p-2 rounded-lg transition-colors ${
                    sessionContext.currentQuestionIndex >= totalQuestions - 1
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                
                <button
                  onClick={() => setPresentationMode(!presentationMode)}
                  className="p-2 rounded-lg bg-gray-200"
                  title="Presentation Mode"
                >
                  {presentationMode ? '👁️' : '📊'}
                </button>
                
                <button
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  className="p-2 rounded-lg bg-green-600 text-white disabled:bg-gray-300"
                  title="Export Summary"
                >
                  📋
                </button>
                
                <button
                  onClick={endSession}
                  className="p-2 rounded-lg bg-red-600 text-white"
                  title="End Session"
                >
                  🏁
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Panel - Main Content */}
          <div className="flex-1 overflow-y-auto bg-gray-50 pb-64 md:pb-6">
            <div className="max-w-3xl mx-auto p-6">
              {/* Phase Header */}
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

              {/* Facilitator Guidance Display */}
              {currentQuestion?.facilitatorGuidance && (
                <div className="space-y-4 mb-6">
                  {/* Opening line - prominent for audience */}
                  {currentQuestion.facilitatorGuidance.openingLine && (
                    <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-6">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <p className="text-lg italic text-gray-800 font-medium">
                          "{currentQuestion.facilitatorGuidance.openingLine}"
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Setup line */}
                  {currentQuestion.facilitatorGuidance.setupLine && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-2 h-2 bg-gray-500 rounded-full mt-2"></div>
                        <p className="text-gray-800">
                          {currentQuestion.facilitatorGuidance.setupLine}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Objective */}
                  {currentQuestion.facilitatorGuidance.objective && (
                    <div className="bg-white rounded-lg shadow-sm border p-6">
                      <h4 className="font-semibold text-gray-900 mb-2">Objective:</h4>
                      <p className="text-gray-700">{currentQuestion.facilitatorGuidance.objective}</p>
                    </div>
                  )}

                  {/* Framework display (for Phase 2) */}
                  {currentQuestion.facilitatorGuidance.framework && (
                    <div className="bg-white rounded-lg shadow-sm border p-6">
                      <h3 className="font-semibold text-lg text-gray-900 mb-4">
                        {currentQuestion.facilitatorGuidance.framework.title}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {currentQuestion.facilitatorGuidance.framework.stages?.map((stage: any, idx: number) => (
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

                  {/* Key Framework (for Phase 3) */}
                  {currentQuestion.facilitatorGuidance.keyFramework && (
                    <div className="bg-white rounded-lg shadow-sm border p-6">
                      <h3 className="font-semibold text-lg text-gray-900 mb-4">
                        {currentQuestion.facilitatorGuidance.keyFramework.title}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentQuestion.facilitatorGuidance.keyFramework.systems?.map((system: any, idx: number) => (
                          <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                            <h4 className="font-semibold text-gray-900">{system.name}</h4>
                            <p className="text-sm text-gray-600">{system.rationale}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key Message */}
                  {currentQuestion.facilitatorGuidance.keyMessage && (
                    <div className="bg-white rounded-lg shadow-sm border border-yellow-200 p-6">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                        <p className="text-gray-800 font-medium">
                          {currentQuestion.facilitatorGuidance.keyMessage}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Example (SalesRecon) */}
                  {currentQuestion.facilitatorGuidance.exampleToShare && (
                    <div className="bg-white rounded-lg shadow-sm border border-green-200 p-6">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">
                            Example: {currentQuestion.facilitatorGuidance.exampleToShare.name}
                          </h4>
                          <ul className="space-y-2">
                            {currentQuestion.facilitatorGuidance.exampleToShare.points?.map((point: string, idx: number) => (
                              <li key={idx} className="flex items-start space-x-2">
                                <span className="text-green-500 mr-1 font-bold">•</span>
                                <span className="text-gray-700">{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Key Prompt/Question */}
                  {currentQuestion.facilitatorGuidance.keyPrompt && (
                    <div className="bg-white rounded-lg shadow-sm border border-indigo-200 p-6">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-2 h-2 bg-indigo-500 rounded-full mt-2"></div>
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2">Key Question:</h3>
                          <p className="text-lg text-gray-800">
                            {currentQuestion.facilitatorGuidance.keyPrompt}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Discussion prompts */}
                  {currentQuestion.facilitatorGuidance.discussionPrompts && (
                    <div className="bg-white rounded-lg shadow-sm border border-purple-200 p-6">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Discussion Points:</h4>
                          <ul className="space-y-2">
                            {currentQuestion.facilitatorGuidance.discussionPrompts.map((prompt: string, idx: number) => (
                              <li key={idx} className="flex items-start space-x-2">
                                <span className="text-purple-500 mr-1 font-bold">•</span>
                                <span className="text-gray-700">{prompt}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Facilitator prompts */}
                  {(currentQuestion.facilitatorGuidance.facilitatorPrompt || 
                    currentQuestion.facilitatorGuidance.facilitatorPrompts) && (
                    <div className="bg-white rounded-lg shadow-sm border border-orange-200 p-6">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Questions for the Group:</h4>
                          <div className="space-y-2">
                            {currentQuestion.facilitatorGuidance.facilitatorPrompt && (
                              <p className="flex items-start space-x-2">
                                <span className="text-orange-500 mr-1 font-bold">•</span>
                                <span className="text-gray-700">{currentQuestion.facilitatorGuidance.facilitatorPrompt}</span>
                              </p>
                            )}
                            {currentQuestion.facilitatorGuidance.facilitatorPrompts?.map((prompt: string, idx: number) => (
                              <p key={idx} className="flex items-start space-x-2">
                                <span className="text-orange-500 mr-1 font-bold">•</span>
                                <span className="text-gray-700">{prompt}</span>
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* What to Listen For */}
                  {currentQuestion.facilitatorGuidance.whatToListenFor && (
                    <div className="bg-white rounded-lg shadow-sm border border-cyan-200 p-6">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-2 h-2 bg-cyan-500 rounded-full mt-2"></div>
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">What to Listen For:</h4>
                          <ul className="space-y-2">
                            {currentQuestion.facilitatorGuidance.whatToListenFor.map((item: string, idx: number) => (
                              <li key={idx} className="flex items-start space-x-2">
                                <span className="text-cyan-500 mr-1 font-bold">•</span>
                                <span className="text-gray-700">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Transcript Section */}
              <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-900">Discussion Transcript</h3>
                  <span className="text-xs text-gray-500">All entries labeled as "Speaker"</span>
                </div>
                <div className="transcript-section" ref={transcriptRef}>
                  <div className="transcript-container">
                    {sessionContext.liveTranscript.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m10 0v10a2 2 0 01-2 2H9a2 2 0 01-2-2V8m10 0H7" />
                        </svg>
                        <p className="text-gray-500 text-lg font-medium mb-2">No Discussion Yet</p>
                        <p className="text-gray-400 text-sm max-w-sm">
                          Start recording or add manual entries to begin capturing the roundtable discussion.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {sessionContext.liveTranscript.map((entry, index) => (
                          <div key={entry.id || index} className="flex items-start space-x-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-white">S</span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-gray-700">Speaker</span>
                                <span className="text-xs text-gray-500">
                                  {new Date(entry.timestamp).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                </span>
                                {entry.isAutoDetected && (
                                  <span className="text-xs text-gray-400">🎤 Auto-detected</span>
                                )}
                              </div>
                              <p className="text-gray-800">{entry.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {interimTranscript && (
                  <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200">
                    <p className="text-gray-700 italic">{interimTranscript}</p>
                  </div>
                )}
              </div>

              {/* Recording Controls */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">🎙️ Live Capture</h3>
                  
                  {isRecording && (
                    <div className="flex items-center gap-3 text-sm">
                      {speechTranscription.isListening && (
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                            <div className="absolute inset-0 w-3 h-3 bg-red-400 rounded-full animate-ping" />
                          </div>
                          <span className="text-gray-600">Recording</span>
                        </div>
                      )}
                      
                      {speechError && speechError !== 'Listening...' && (
                        <span className="text-amber-600">{speechError}</span>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={toggleRecording}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                      isRecording 
                        ? 'bg-red-500 hover:bg-red-600 text-white' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    {isRecording ? '⏹️ Stop Recording' : '🎤 Start Recording'}
                  </button>
                  
                  <button
                    onClick={() => setShowManualModal(true)}
                    className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    ✏️ Manual Entry
                  </button>
                </div>
                
                {isRecording && (
                  <p className="text-xs text-gray-500 mt-2">
                    Speak naturally - recording continues until you stop it. No timeouts.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - AI Tools (Hidden in presentation mode) */}
          {!presentationMode && (
            <div className="hidden md:flex facilitator-panel w-full lg:w-[32rem] bg-white border-l flex-col h-full shadow-lg">
              {/* Tab Navigation */}
              <div className="border-b bg-gray-50 px-4 py-3 flex-shrink-0">
                <div className="flex gap-2">
                  <button 
                    onClick={() => setRightPanelTab('guide')} 
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                      rightPanelTab === 'guide' 
                        ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                    }`}
                  >
                    📋 Guide
                  </button>
                  <button 
                    onClick={() => setRightPanelTab('insights')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                      rightPanelTab === 'insights' 
                        ? 'bg-white text-blue-700 shadow-sm border border-blue-200' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                    }`}
                  >
                    💡 Insights
                  </button>
                  <button 
                    onClick={() => setRightPanelTab('synthesis')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                      rightPanelTab === 'synthesis' 
                        ? 'bg-white text-green-700 shadow-sm border border-green-200' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                    }`}
                  >
                    🔄 Synthesis
                  </button>
                  <button 
                    onClick={() => setRightPanelTab('followup')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                      rightPanelTab === 'followup' 
                        ? 'bg-white text-purple-700 shadow-sm border border-purple-200' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                    }`}
                  >
                    ❓ Follow-up
                  </button>
                  <button 
                    onClick={() => setRightPanelTab('executive')}
                    disabled={sessionContext.currentQuestionIndex < getTotalQuestions() - 1}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      sessionContext.currentQuestionIndex < getTotalQuestions() - 1
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                        : rightPanelTab === 'executive' 
                          ? 'bg-purple-100 text-purple-800 shadow-sm' 
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    📊 Summary
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Guide Tab */}
                {rightPanelTab === 'guide' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Facilitator Guide</h3>
                    <div className="max-h-[600px] overflow-y-auto pr-2">
                      <FacilitatorPanel 
                        currentQuestion={currentQuestion || null} 
                        isVisible={true} 
                      />
                    </div>
                  </div>
                )}

                {/* Insights Tab */}
                {rightPanelTab === 'insights' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Strategic Insights</h3>
                      <button
                        onClick={() => callAIAnalysis('insights')}
                        disabled={isAnalyzing || sessionContext.liveTranscript.length === 0}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                      >
                        {isAnalyzing && analyzingType === 'insights' ? (
                          <span className="flex items-center gap-2">
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Generating...
                          </span>
                        ) : (
                          'Generate New'
                        )}
                      </button>
                    </div>
                    
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                      {getInsightsForType('insights').length === 0 ? (
                        <p className="text-center py-8 text-gray-500">
                          No insights generated yet. Start recording or add transcript entries, then click "Generate New" to analyze.
                        </p>
                      ) : (
                        getInsightsForType('insights').slice(-5).reverse().map((insight, idx) => (
                          <AIInsightCard key={insight.id || idx} insight={insight} type="insights" />
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Synthesis Tab */}
                {rightPanelTab === 'synthesis' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Discussion Synthesis</h3>
                      <button
                        onClick={() => callAIAnalysis('synthesis')}
                        disabled={isAnalyzing || sessionContext.liveTranscript.length === 0}
                        className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-medium rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                      >
                        {isAnalyzing && analyzingType === 'synthesis' ? (
                          <span className="flex items-center gap-2">
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Synthesizing...
                          </span>
                        ) : (
                          'Generate New'
                        )}
                      </button>
                    </div>
                    
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                      {getInsightsForType('synthesis').length === 0 ? (
                        <p className="text-center py-8 text-gray-500">
                          No synthesis generated yet. Click "Generate New" to summarize key themes.
                        </p>
                      ) : (
                        getInsightsForType('synthesis').slice(-1).map((insight, idx) => (
                          <AIInsightCard key={insight.id || idx} insight={insight} type="synthesis" />
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Follow-up Tab */}
                {rightPanelTab === 'followup' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Follow-up Questions</h3>
                      <button
                        onClick={() => callAIAnalysis('followup')}
                        disabled={isAnalyzing || sessionContext.liveTranscript.length === 0}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                      >
                        {isAnalyzing && analyzingType === 'followup' ? (
                          <span className="flex items-center gap-2">
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Generating...
                          </span>
                        ) : (
                          'Generate New'
                        )}
                      </button>
                    </div>
                    
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                      {getInsightsForType('followup').length === 0 ? (
                        <p className="text-center py-8 text-gray-500">
                          No follow-up questions yet. Click "Generate New" to get AI-suggested questions.
                        </p>
                      ) : (
                        getInsightsForType('followup').slice(-5).reverse().map((insight, idx) => (
                          <AIInsightCard key={insight.id || idx} insight={insight} type="followup" />
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Executive Summary Tab */}
                {rightPanelTab === 'executive' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Final Session Summary</h3>
                      <button
                        onClick={() => callAIAnalysis('executive')}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                        disabled={isAnalyzing || sessionContext.currentQuestionIndex < AI_TRANSFORMATION_QUESTIONS.length - 1}
                      >
                        {isAnalyzing && analyzingType === 'executive' ? (
                          <span className="flex items-center gap-2">
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Generating...
                          </span>
                        ) : sessionContext.currentQuestionIndex < AI_TRANSFORMATION_QUESTIONS.length - 1 ? (
                          '⏳ Available in Final Phase'
                        ) : (
                          '📋 Generate Summary'
                        )}
                      </button>
                    </div>
                    
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                      {getInsightsForType('executive').length === 0 ? (
                        <p className="text-center py-8 text-gray-500">
                          {sessionContext.currentQuestionIndex < AI_TRANSFORMATION_QUESTIONS.length - 1 
                            ? "Final session summary will be available in the last phase." 
                            : "No final summary yet. Click \"Generate Summary\" for a comprehensive session overview."}
                        </p>
                      ) : (
                        getInsightsForType('executive').slice(-5).reverse().map((insight, idx) => (
                          <AIInsightCard key={insight.id || idx} insight={insight} type="executive" />
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Mobile Tab Navigation - Fixed at bottom */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40">
          <div className="flex justify-around p-2 border-b">
            <button 
              onClick={() => setRightPanelTab('guide')} 
              className={`flex-1 py-2 text-xs ${rightPanelTab === 'guide' ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}
            >
              📋 Guide
            </button>
            <button 
              onClick={() => setRightPanelTab('insights')} 
              className={`flex-1 py-2 text-xs ${rightPanelTab === 'insights' ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}
            >
              💡 Insights
            </button>
            <button 
              onClick={() => setRightPanelTab('synthesis')} 
              className={`flex-1 py-2 text-xs ${rightPanelTab === 'synthesis' ? 'text-green-600 font-semibold' : 'text-gray-600'}`}
            >
              🔄 Synthesis
            </button>
            <button 
              onClick={() => setRightPanelTab('followup')} 
              className={`flex-1 py-2 text-xs ${rightPanelTab === 'followup' ? 'text-purple-600 font-semibold' : 'text-gray-600'}`}
            >
              ❓ Follow-up
            </button>
            <button 
              onClick={() => setRightPanelTab('executive')} 
              className={`flex-1 py-2 text-xs ${rightPanelTab === 'executive' ? 'text-orange-600 font-semibold' : 'text-gray-600'}`}
            >
              📊 Summary
            </button>
          </div>
          
          {/* Tab content - Simplified for mobile */}
          <div className="h-48 overflow-y-auto p-4">
            {rightPanelTab === 'guide' && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Facilitator Guide</h3>
                <FacilitatorPanel currentQuestion={currentQuestion || null} isVisible={true} />
              </div>
            )}
            {rightPanelTab === 'insights' && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Strategic Insights</h3>
                <div className="space-y-2 text-sm">
                  {getInsightsForType('insights').length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No insights yet</p>
                  ) : (
                    getInsightsForType('insights').slice(-2).reverse().map((insight, idx) => (
                      <div key={insight.id || idx} className="bg-blue-50 p-2 rounded text-xs">
                        {formatAIContent(insight.content).substring(0, 150)}...
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            {/* Add other tabs similarly */}
          </div>
        </div>

        {/* Manual Entry Modal */}
        {showManualModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Add Manual Entry</h3>
                <button
                  onClick={() => setShowManualModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                  aria-label="Close modal"
                >
                  ×
                </button>
              </div>
              
              {/* Entry Mode Tabs */}
              <div className="border-b mb-4">
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
              </div>
              
              {/* Single Entry Mode */}
              {entryMode === 'single' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Speaker</label>
                    <input
                      type="text"
                      value="Speaker"
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">All entries use unified speaker labels</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Entry Text</label>
                    <textarea
                      value={manualEntryText}
                      onChange={(e) => setManualEntryText(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md h-32 resize-none"
                      placeholder="Enter the transcript text..."
                      autoFocus
                    />
                  </div>
                </div>
              )}
              
              {/* Bulk Entry Mode */}
              {entryMode === 'bulk' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="text-sm text-blue-800">
                      Paste transcript in format: <code>Speaker Name: Text content</code>
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Each speaker entry should be on a new line. All entries will be labeled as "Speaker".
                    </p>
                  </div>
                  <textarea
                    value={bulkTranscriptText}
                    onChange={(e) => setBulkTranscriptText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md h-64 resize-none font-mono text-sm"
                    placeholder="Speaker: I think we should focus on AI training first.&#10;Speaker: Good point. What about data preparation?&#10;Speaker: That's essential too..."
                    autoFocus
                  />
                </div>
              )}
              
              {/* Modal Actions */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={submitManualEntry}
                  disabled={
                    (entryMode === 'single' && !manualEntryText.trim()) ||
                    (entryMode === 'bulk' && !bulkTranscriptText.trim())
                  }
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
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

  const renderSummaryState = () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
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

        <div className="space-y-4 mb-6">
          <button
            onClick={handleExportPDF}
            disabled={isExporting || sessionContext.liveTranscript.length === 0}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
          >
            {isExporting ? '⏳ Exporting...' : '📋 Export Executive Summary'}
          </button>

          <button
            onClick={handleExportFullPDF}
            disabled={isExporting || sessionContext.liveTranscript.length === 0}
            className="w-full px-6 py-3 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300"
          >
            {isExporting ? '⏳ Exporting...' : '📄 Export Full Transcript'}
          </button>

          <button
            onClick={() => {
              clearSession();
              
              setSessionState('intro');
              setSessionContext({
                state: 'intro',
                startTime: new Date(),
                facilitator: 'Ari Lehavi',
                topic: 'AI Transformation Strategy',
                currentTopic: 'AI Transformation Strategy',
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
    </div>
  );

  // ==========================================
  // MAIN RENDER
  // ==========================================

  return (
    <>
      <RecordingIndicator isRecording={isRecording} />
      
      {sessionState === 'intro' && renderIntroState()}
      {sessionState === 'discussion' && renderDiscussionState()}
      {sessionState === 'summary' && renderSummaryState()}
    </>
  );
};

export default RoundtableCanvasV2;