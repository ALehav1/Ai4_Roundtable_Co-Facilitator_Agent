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
import TemplateSelector from './TemplateSelector';
// Centralized types and constants
import { SessionState, TranscriptEntry, SessionContext } from '@/types/session';
import { FACILITATOR_PATTERNS, MIN_WORDS_FOR_INSIGHTS } from '@/constants/speech';
import { useToast } from '@/components/ToastProvider';
import { DebugPanel } from '@/components/DebugPanel';

// Types now imported from centralized files
// SessionState, TranscriptEntry, SessionContext imported from @/types/session
// FACILITATOR_PATTERNS, MIN_WORDS_FOR_INSIGHTS imported from @/constants/speech

// Temporary Speaker Detection Tester Component


// Enhanced Recording Indicator Component
const RecordingIndicator = ({ isRecording }: { isRecording: boolean }) => {
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

// Simplified Speaker Indicator Component
const SpeakerIndicator = ({ currentSpeaker, isVisible }: {
  currentSpeaker: string;
  isVisible: boolean;
}) => {
  if (!isVisible) return null;
  
  const isFacilitator = currentSpeaker === 'Facilitator';
  
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <div className={`w-2 h-2 rounded-full ${
        isFacilitator ? 'bg-blue-500' : 'bg-green-500'
      }`} />
      <span className="font-medium">
        Current Speaker: {currentSpeaker}
      </span>
      <span className="text-xs opacity-75">
        (Auto-detected)
      </span>
    </div>
  );
};

// Enhanced TopNavigation Component for better UX
const TopNavigation = ({ 
  sessionContext, 
  goToPreviousQuestion, 
  goToNextQuestion, 
  totalQuestions,
  presentationMode,
  setPresentationMode,
  showParticipantDetection,
  setShowParticipantDetection,
  setShowTemplateSelector
}: {
  sessionContext: SessionContext;
  goToPreviousQuestion: () => void;
  goToNextQuestion: () => void;
  totalQuestions: number;
  presentationMode: boolean;
  setPresentationMode: (mode: boolean) => void;
  showParticipantDetection: boolean;
  setShowParticipantDetection: (show: boolean) => void;
  setShowTemplateSelector: (show: boolean) => void;
}) => (
  <div className="sticky top-0 z-50 bg-white border-b shadow-sm p-4">
    <div className="flex justify-between items-center max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
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
        
        <span className="text-sm text-gray-600">
          Phase {sessionContext.currentQuestionIndex + 1} of {totalQuestions}
        </span>
        
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
      
      <div className="flex items-center gap-3">
        {/* Template Selection Button */}
        <button
          onClick={() => setShowTemplateSelector(true)}
          className="px-3 py-2 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors font-medium"
          title="Choose executive session template"
        >
          📋 Templates
        </button>
        
        {/* Phase 1.3: Participant Detection Toggle */}
        <button
          onClick={() => setShowParticipantDetection(!showParticipantDetection)}
          className={`px-3 py-2 rounded-lg font-medium transition-colors ${
            showParticipantDetection 
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title="Toggle speaker detection controls"
        >
          {showParticipantDetection ? '🎯 Hide Detection' : '🎯 Show Detection'}
        </button>
        
        {/* Presentation Mode Toggle */}
        <button
          onClick={() => setPresentationMode(!presentationMode)}
          className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors"
          title="Toggle Presentation Mode (Cmd+P)"
        >
          {presentationMode ? '👁️ Exit Presentation' : '📊 Presentation Mode'}
        </button>
      </div>
    </div>
  </div>
);

const RoundtableCanvasV2: React.FC = () => {
  const { showToast } = useToast();
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
  const [currentSpeaker, setCurrentSpeaker] = useState('Participant'); // DEFAULT TO PARTICIPANT per new guide
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingType, setAnalyzingType] = useState<string | null>(null);
  const [showFacilitatorPanel, setShowFacilitatorPanel] = useState(true);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualEntryText, setManualEntryText] = useState('');
  const [entryMode, setEntryMode] = useState<'single' | 'bulk'>('single');
  const [manualSpeakerName, setManualSpeakerName] = useState('Speaker');
  const [customSpeakerName, setCustomSpeakerName] = useState('');
  const [bulkTranscriptText, setBulkTranscriptText] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('blank_template');
  const [isExporting, setIsExporting] = useState(false);
  const [activeAITab, setActiveAITab] = useState<'all' | 'insights' | 'followup' | 'synthesis' | 'executive'>('all');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateModalMode, setTemplateModalMode] = useState<'save' | 'load' | 'manage' | 'create'>('save');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  
  // Enhanced Speaker Mode State
  const [speakerMode, setSpeakerMode] = useState<'facilitator' | 'participant'>('facilitator');
  
  // Presentation Mode State (Phase 1.1 - Critical UI Fix)
  const [presentationMode, setPresentationMode] = useState(false);
  
  // Participant Detection UI Toggle (Phase 1.3 - Critical UX Fix)
  const [showParticipantDetection, setShowParticipantDetection] = useState(false); // HIDDEN BY DEFAULT per executive UX guide
  const [participantCounter, setParticipantCounter] = useState(1);
  
  // Speaker Attribution UI State
  const [showSpeakerAttribution, setShowSpeakerAttribution] = useState(false);
  const [attributionResults, setAttributionResults] = useState<any>(null);

  // Keyboard Shortcut for Presentation Mode (Cmd+P)
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

  // Refs and Hooks
  const speechTranscription = useSpeechTranscription(
    (partialText: string) => setInterimTranscript(partialText),
    (finalEvent: TranscriptEvent) => {
      console.log('🎯 Final transcript received:', finalEvent.text);
      setInterimTranscript('');
      
      addTranscriptEntry({
        text: finalEvent.text,
        speaker: currentSpeaker || 'Speaker',
        isAutoDetected: true,
        confidence: finalEvent.confidence
      });
    },
    (error: string) => {
      // Only set error for critical issues, not for no-speech
      if (error === 'not-allowed' || error === 'audio-capture') {
        setSpeechError('Microphone access required');
      } else {
        setSpeechError(null);
      }
    }
  );
  
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Update speech error from hook
  useEffect(() => {
    setSpeechError(speechTranscription.error);
  }, [speechTranscription.error]);

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

  // BUILD AI CONTEXT - Must be defined before callAIAnalysis uses it
  const buildAIContext = useCallback(() => {
    const currentTopic = sessionContext.currentTopic;
    const questionIndex = sessionContext.currentQuestionIndex;
    const questions = AI_TRANSFORMATION_QUESTIONS; // from config
    const totalQuestions = questions.length;
    
    // Helper function to get session duration
    const getSessionDuration = () => {
      if (!sessionContext.startTime) return 'Not started';
      const now = new Date();
      const start = new Date(sessionContext.startTime);
      const durationMs = now.getTime() - start.getTime();
      const minutes = Math.floor(durationMs / 60000);
      const seconds = Math.floor((durationMs % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    };

    // Helper function to format transcript with speakers
    const formatTranscriptWithSpeakers = (transcriptEntries: any[]) => {
      return transcriptEntries
        .map(entry => `${entry.speaker}: ${entry.text}`)
        .join('\n');
    };
    
    return {
      sessionInfo: {
        topic: currentTopic,
        currentQuestion: getCurrentQuestion(questionIndex),
        questionProgress: `${questionIndex + 1} of ${totalQuestions}`,
        participantCount: new Set(sessionContext.liveTranscript.map(e => e.speaker)).size,
        sessionDuration: getSessionDuration()
      },
      recentTranscript: formatTranscriptWithSpeakers(
        sessionContext.liveTranscript.slice(-10) // Last 10 entries
      ),
      previousInsights: sessionContext.aiInsights
        .filter(i => i.type === 'insights')
        .slice(-3)
        .map(i => i.content)
    };
  }, [sessionContext.liveTranscript, sessionContext.currentQuestionIndex, sessionContext.currentTopic, sessionContext.aiInsights, sessionContext.startTime]);

  // Progressive Tab System Configuration
  type TabType = 'insights' | 'followup' | 'synthesis' | 'executive' | 'advanced';
  type AnalysisType = 'strategic' | 'followup' | 'synthesis' | 'executive';

  interface TabConfig {
    id: TabType;
    label: string;
    icon: string;
    analysisTypes: string[];  // Map which analysis types belong to each tab
  }

  const TAB_CONFIGURATION: TabConfig[] = [
    {
      id: 'insights',
      label: 'Strategic Insights',
      icon: '💡',
      analysisTypes: ['insights', 'insight']
    },
    {
      id: 'followup',
      label: 'Follow-up Questions',
      icon: '❓',
      analysisTypes: ['followup', 'questions']
    },
    {
      id: 'synthesis', 
      label: 'Synthesize Discussion',
      icon: '🔄',
      analysisTypes: ['synthesis']
    },
    {
      id: 'executive',
      label: 'Executive Summary',
      icon: '📋',
      analysisTypes: ['executive', 'summary']
    }
  ];

  const ADVANCED_TAB: TabConfig = {
    id: 'advanced',
    label: 'Advanced',
    icon: '🚀',
    analysisTypes: [] // Custom filtering logic
  };

  // Progressive disclosure state
  const [showAdvancedTab, setShowAdvancedTab] = useState(false);

  // Show advanced tab after 3+ analyses
  useEffect(() => {
    const analysisCount = sessionContext.aiInsights?.length || 0;
    if (analysisCount >= 3 && !showAdvancedTab) {
      setShowAdvancedTab(true);
    }
  }, [sessionContext.aiInsights, showAdvancedTab]);

  // Get current tab configuration
  const availableTabs = showAdvancedTab 
    ? [...TAB_CONFIGURATION, ADVANCED_TAB]
    : TAB_CONFIGURATION;

  // Filter insights based on active tab with new progressive system
  const getFilteredInsights = () => {
    if (!sessionContext.aiInsights) return [];
    
    const activeConfig = availableTabs.find(tab => tab.id === activeAITab);
    if (!activeConfig) return sessionContext.aiInsights;
    
    return sessionContext.aiInsights.filter(insight => {
      return activeConfig.analysisTypes.includes(insight.type || 'insight');
    });
  };

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
    // Prevent spam clicking
    if (isAnalyzing) {
      console.log('⏳ Analysis already in progress, skipping...');
      return;
    }
    
    try {
      setIsAnalyzing(true);
      setAnalyzingType(analysisType);
      
      // Build live transcript for AI context
      const transcriptText = sessionContext.liveTranscript
        .map(entry => `${entry.speaker}: ${entry.text}`)
        .join('\n');
      
      // Get current question context
      const currentQuestion = getCurrentQuestion(sessionContext.currentQuestionIndex);
      const totalQuestions = getTotalQuestions();
      
      console.log('🔍 Starting AI Analysis:', {
        type: analysisType,
        transcriptLength: transcriptText.length,
        entryCount: sessionContext.liveTranscript.length,
        topic: sessionContext.currentTopic,
        currentQuestion: currentQuestion?.title,
        questionProgress: `${sessionContext.currentQuestionIndex + 1} of ${totalQuestions}`
      });

      // Build enhanced context
      const enhancedContext = {
        sessionTopic: sessionContext.currentTopic || 'Strategic Planning Session',
        liveTranscript: transcriptText || "No conversation content has been captured yet in this live session.",
        analysisType,
        participantCount: new Set(sessionContext.liveTranscript.map(e => e.speaker)).size || 5,
        sessionDuration: Math.floor((Date.now() - sessionContext.startTime.getTime()) / 60000),
        clientId: 'live-session',
        // Add question context
        questionContext: {
          index: sessionContext.currentQuestionIndex,
          total: totalQuestions,
          question: currentQuestion ? {
            title: currentQuestion.title,
            content: currentQuestion.description,
            guidance: currentQuestion.facilitatorGuidance
          } : null
        },
        // Add previous insights for context
        previousInsights: sessionContext.aiInsights
          .filter(i => i.type === 'insight' && !i.isError)
          .slice(-3)
          .map(i => ({ type: i.type, content: i.content.substring(0, 200) }))
      };

      // TRY NEW /api/analyze-live endpoint first (strict JSON)
      try {
        const liveResponse = await fetch('/api/analyze-live', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(enhancedContext),
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
          // Include question context for legacy endpoint too
          currentQuestion: currentQuestion,
          questionProgress: enhancedContext.questionContext
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
    } finally {
      setIsAnalyzing(false);
      setAnalyzingType(null);
    }
  }, [sessionContext, isAnalyzing]);



  // Smart Insight Triggering System - positioned after callAIAnalysis declaration
  useEffect(() => {
    const entryCount = sessionContext.liveTranscript.length;
    
    // Skip if no meaningful content yet
    if (entryCount < 3) return;
    
    // Auto-trigger insights every 5 entries (but not too frequently)
    const lastInsightTime = sessionContext.aiInsights.length > 0 ? 
      sessionContext.aiInsights[sessionContext.aiInsights.length - 1].timestamp.getTime() : 0;
    const timeSinceLastInsight = Date.now() - lastInsightTime;
    const MIN_TIME_BETWEEN_AUTO_INSIGHTS = 2 * 60 * 1000; // 2 minutes
    
    if (entryCount > 0 && entryCount % 5 === 0 && timeSinceLastInsight > MIN_TIME_BETWEEN_AUTO_INSIGHTS) {
      // Add a small delay to avoid overwhelming the UI
      setTimeout(() => {
        callAIAnalysis('insights');
      }, 1500);
    }
    
    // Auto-generate follow-up questions every 8 entries
    if (entryCount > 0 && entryCount % 8 === 0 && timeSinceLastInsight > MIN_TIME_BETWEEN_AUTO_INSIGHTS) {
      setTimeout(() => {
        callAIAnalysis('followup');
      }, 3000);
    }
    
  }, [sessionContext.liveTranscript.length, sessionContext.aiInsights, callAIAnalysis]);
  
  // Phase Transition Insight Triggers
  useEffect(() => {
    // Trigger synthesis when moving between phases (with small delay for smooth UX)
    const currentPhase = sessionContext.currentQuestionIndex;
    
    // Only trigger if we have content and are not on the first phase
    if (currentPhase > 0 && sessionContext.liveTranscript.length >= 3) {
      setTimeout(() => {
        callAIAnalysis('synthesis');
      }, 2000);
    }
  }, [sessionContext.currentQuestionIndex, callAIAnalysis, sessionContext.liveTranscript.length]);

  // Keyboard shortcuts for speaker switching and presentation mode
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only work when not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      // Phase 1.2: Cmd+P for presentation mode toggle
      if ((e.metaKey || e.ctrlKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault(); // Prevent browser print dialog
        setPresentationMode(prev => !prev);
        return;
      }
      
      if (e.key === 'f' || e.key === 'F') {
        setSpeakerMode('facilitator');
        setCurrentSpeaker('Facilitator');
      } else if (e.key === 'p' || e.key === 'P') {
        setSpeakerMode('participant');
        if (!currentSpeaker.startsWith('Participant')) {
          setCurrentSpeaker(`Participant ${participantCounter}`);
          setParticipantCounter(prev => prev + 1);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentSpeaker, participantCounter, setPresentationMode]);

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
      // Toast: success export
      showToast({
        type: 'success',
        title: 'Export ready',
        message: 'Your session PDF has been generated.'
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      // Toast: export failed
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

  // Manual entry modal handler
  const addManualEntry = useCallback(() => {
    setShowManualModal(true);
    setEntryMode('single'); // Default to single entry mode
    setManualEntryText(''); // Clear any previous text
    setManualSpeakerName('Speaker'); // Reset to default speaker
    console.log('📝 Opening manual entry modal');
  }, []);

  // Process manual entry submission
  const submitManualEntry = useCallback(() => {
    if (entryMode === 'single' && manualEntryText.trim()) {
      // Auto-detect speaker type based on content
      const detectedSpeaker = detectSpeaker(manualEntryText.trim());
      
      // Use manual override if explicitly set to Custom with a name
      const speakerName = manualSpeakerName === 'Custom' && customSpeakerName.trim()
        ? customSpeakerName.trim()
        : detectedSpeaker;
      
      addTranscriptEntry({
        speaker: speakerName,
        text: manualEntryText.trim(),
        isAutoDetected: manualSpeakerName !== 'Custom' || !customSpeakerName.trim(),
        confidence: 1.0 // Manual entries have full confidence
      });
      
      // Clear form and close modal
      setManualEntryText('');
      setShowManualModal(false);
      console.log('✅ Manual entry added');
    } else if (entryMode === 'bulk' && bulkTranscriptText.trim()) {
      // Process bulk transcript
      const lines = bulkTranscriptText.split('\n').filter(line => line.trim());
      let entriesAdded = 0;
      
      lines.forEach(line => {
        const match = line.match(/^([^:]+):\s*(.+)$/);
        if (match) {
          const [, speaker, text] = match;
          // Use auto-detection for bulk entries too, but allow manual speaker override
          const detectedSpeaker = detectSpeaker(text.trim());
          const finalSpeaker = speaker.trim().toLowerCase() === 'auto' ? detectedSpeaker : speaker.trim();
          
          addTranscriptEntry({
            speaker: finalSpeaker,
            text: text.trim(),
            isAutoDetected: speaker.trim().toLowerCase() === 'auto',
            confidence: 1.0
          });
          entriesAdded++;
        }
      });
      
      // Clear form and close modal
      setBulkTranscriptText('');
      setShowManualModal(false);
      console.log(`✅ Added ${entriesAdded} entries from bulk paste`);
    }
  }, [entryMode, manualEntryText, manualSpeakerName, customSpeakerName, 
      bulkTranscriptText, addTranscriptEntry]);

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

  const runSpeakerAttribution = useCallback(async () => {
    try {
      const response = await fetch('/api/identify-speakers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: sessionContext.liveTranscript.map(entry => ({
            id: entry.id,
            text: entry.text,
            speaker: entry.speaker,
            timestamp: entry.timestamp.toISOString()
          }))
        })
      });

      if (!response.ok) {
        // Toast: API error
        showToast({
          type: response.status === 429 ? 'warning' : 'error',
          title: response.status === 429 ? 'Rate limit reached' : 'Speaker identification failed',
          message: response.status === 429
            ? 'Too many requests. Please wait a minute and try again.'
            : 'Unable to identify speakers. Please try again shortly.'
        });
        return;
      }

      const data = await response.json();
      if (data.success) {
        setAttributionResults(data);
        setShowSpeakerAttribution(true);
      } else {
        console.error('Speaker attribution failed:', data.error);
        showToast({
          type: 'error',
          title: 'Speaker identification failed',
          message: data.error || 'Please try again.'
        });
      }
    } catch (error) {
      console.error('Failed to run speaker attribution:', error);
      showToast({
        type: 'error',
        title: 'Network error',
        message: 'Unable to identify speakers. Please check your connection and try again.'
      });
    }
  }, [sessionContext.liveTranscript, showToast]);

  // Session-level speaker continuity tracking
  const [lastSpeakerDetection, setLastSpeakerDetection] = useState<{
    speaker: string;
    timestamp: number;
    confidence: 'high' | 'medium' | 'low';
  } | null>(null);

  const CONTINUITY_WINDOW_MS = 30000; // 30 seconds for speaker continuity

  // Smart Speaker Detection Function using imported patterns + context-sensitive logic + proximity
  const detectSpeaker = useCallback((text: string): string => {
    const lowerText = text.toLowerCase();
    const now = Date.now();
    
    // 1. Check generic facilitator patterns first
    const matchesFacilitatorPattern = FACILITATOR_PATTERNS.some(pattern => 
      lowerText.includes(pattern.toLowerCase())
    );
    
    // 2. Context-sensitive facilitator detection for Ari from Moody's
    
    // Self-introduction patterns (facilitator introducing themselves)
    const isSelfIntroduction = /\b(my name is|i'm|i am).*(ari|ari lehavi)\b/i.test(text) ||
                              /\b(ari|ari lehavi).*(here|facilitator|leading|moderating)\b/i.test(text);
    
    // Organization context (facilitator referencing their org, not participants asking about it)
    const isOrgReference = /\b(at moody'?s|from moody'?s|we at moody'?s)\b/i.test(text) &&
                          !/\b(how do you|how does|what does).*(moody'?s|you)\b/i.test(text); // Exclude participant questions
    
    // Topic introduction (facilitator introducing agenda items or guide questions)
    const isTopicIntroduction = /\b(let's talk about|our next topic|turning to|moving to).*(ai|artificial intelligence|transformation|automation)\b/i.test(text) ||
                               /\b(today we'll|we're going to|our agenda|our focus)\b/i.test(text);
    
    // Facilitator guide questions (from your session framework)
    const isFacilitatorGuideQuestion = /\b(what does your org look like|what scares you most|what's one takeaway|how does that connect|can you say more)\b/i.test(text) ||
                                      /\b(fast forward.*years|the darker version|what needs to be true)\b/i.test(text);
    
    // Advanced context patterns for company/org references
    
    // PARTICIPANT indicators (first-hand experience, speaking about their own org)
    const isParticipantFirstHand = /\b(the way we do it at|at our company|our experience at|we handle it by|at \w+, we)\b/i.test(text) ||
                                  /\b(in our organization|our approach at|we've found that|our team at)\b/i.test(text);
    
    // PARTICIPANT self-introductions (any name/org other than Ari/Ari Lehavi/Moody's)
    const isParticipantSelfIntro = /\b(my name is|i'm|i am)\s+(?!ari\b|ari\s+lehavi\b)\w+/i.test(text) ||
                                  /\b(from|at|with)\s+(?!moody'?s\b)\w+[\s\w]*(?:company|corp|inc|llc|ltd|organization|org|group|team)\b/i.test(text) ||
                                  /\b(i work at|i'm with|i'm from)\s+(?!moody'?s\b)\w+/i.test(text);
    
    // FACILITATOR indicators (asking about others' experiences)
    const isFacilitatorAskingAboutOthers = /\b(how does \w+ do it|how do you at \w+|what's your experience at|how does your company)\b/i.test(text) ||
                                          /\b(how do they handle it at|what's the approach at \w+|how does \w+ think about)\b/i.test(text);
    
    // 3. Additional heuristics for facilitator detection
    const isQuestion = text.trim().endsWith('?') && text.length < 200; // Short questions often from facilitator
    const hasTransitionWords = /^(so|now|okay|alright|great|well|let's)/i.test(text);
    const hasSummaryLanguage = /summariz|wrap up|key takeaway|moving forward/i.test(text);
    
    // 4. Check for continuity breaks (questions that break speaker flow)
    
    // Facilitator asking audience questions (breaks facilitator continuity)
    const isFacilitatorAskingAudience = /\b(what do you think|what's your view|how do you see|tell me|share with us|thoughts on)\b/i.test(text) ||
                                       /\b(any questions|what questions|does anyone)\b/i.test(text);
    
    // Speaker asking facilitator for clarification (breaks participant continuity) 
    const isAskingFacilitatorClarification = /\b(ari|ari lehavi|moody's).*(what|how|why|can you|could you)\b/i.test(text) ||
                                            /\b(can you clarify|what did you mean|how do you|what's your take)\b/i.test(text);
    
    // 5. Apply proximity/continuity logic
    const isWithinContinuityWindow = lastSpeakerDetection && (now - lastSpeakerDetection.timestamp) < CONTINUITY_WINDOW_MS;
    
    // VERY Strong participant indicators (override continuity) - only self-introductions
    if (isParticipantSelfIntro) {
      const result = 'Participant';
      setLastSpeakerDetection({ speaker: result, timestamp: now, confidence: 'high' });
      return result;
    }
    
    // VERY Strong facilitator indicators (override continuity)
    const isVeryStrongFacilitator = isSelfIntroduction || 
                                   isOrgReference || 
                                   isTopicIntroduction || 
                                   isFacilitatorGuideQuestion;
    
    if (isVeryStrongFacilitator) {
      const result = 'Facilitator';
      setLastSpeakerDetection({ speaker: result, timestamp: now, confidence: 'high' });
      return result;
    }
    
    // 6. Apply continuity logic BEFORE weaker patterns
    if (isWithinContinuityWindow && lastSpeakerDetection) {
      // Check for continuity breaks
      if (lastSpeakerDetection.speaker === 'Facilitator' && isFacilitatorAskingAudience) {
        // Facilitator asking audience breaks facilitator continuity
        const result = 'Facilitator'; // Still facilitator, but reset continuity
        setLastSpeakerDetection({ speaker: result, timestamp: now, confidence: 'medium' });
        return result;
      }
      
      if (lastSpeakerDetection.speaker === 'Participant' && isAskingFacilitatorClarification) {
        // Participant asking facilitator breaks participant continuity
        const result = 'Participant'; // Still participant, but reset continuity  
        setLastSpeakerDetection({ speaker: result, timestamp: now, confidence: 'medium' });
        return result;
      }
      
      // No continuity break - continue with last speaker (HIGH PRIORITY)
      if (!isFacilitatorAskingAudience && !isAskingFacilitatorClarification) {
        console.log(`🔄 Continuity: "${text.substring(0, 30)}..." → ${lastSpeakerDetection.speaker} (within ${Math.round((now - lastSpeakerDetection.timestamp) / 1000)}s)`);
        return lastSpeakerDetection.speaker;
      }
    }
    
    // 7. Weaker pattern matching (only if no continuity)
    const isWeakFacilitator = matchesFacilitatorPattern || 
                             isFacilitatorAskingAboutOthers ||
                             (isQuestion && hasTransitionWords) || 
                             hasSummaryLanguage;
    
    if (isWeakFacilitator) {
      const result = 'Facilitator';
      setLastSpeakerDetection({ speaker: result, timestamp: now, confidence: 'medium' });
      return result;
    }
    
    // Weaker participant indicators (only if no continuity)
    if (isParticipantFirstHand) {
      const result = 'Participant';
      setLastSpeakerDetection({ speaker: result, timestamp: now, confidence: 'medium' });
      return result;
    }
    
    // 7. Default fallback
    const result = 'Participant';
    setLastSpeakerDetection({ speaker: result, timestamp: now, confidence: 'low' });
    return result;
  }, []);

  // Template Selection Handler
  const handleTemplateSelection = useCallback((templateSessionContext: any) => {
    setSessionContext(prev => ({
      ...prev,
      topic: templateSessionContext.sessionTopic,
      currentTopic: templateSessionContext.sessionTopic,
      // Reset session state for new template
      liveTranscript: [],
      aiInsights: [],
      keyThemes: [],
      followupQuestions: [],
      crossReferences: [],
      currentQuestionIndex: 0,
      questionStartTime: undefined,
      agendaProgress: {}
    }));
    
    // Show success message
    if (templateSessionContext.sessionTopic) {
      showToast({
        type: 'success',
        message: `Template "${templateSessionContext.sessionTopic}" loaded successfully`,
        durationMs: 3000
      });
    }
  }, [showToast]);

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
                  title="Choose a session template"
                  aria-label="Session template selector"
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
                  placeholder="What's the focus of today's discussion?"
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
                  placeholder="Facilitator name"
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
      <div className="app-container">
        {/* Professional Header - Minimal & Informative */}
        <header className="header">
          <div className="header-content">
            <div className="header-left">
              <h1 className="app-title">
                🎙️ AI Roundtable Co-Facilitator
              </h1>
              <div className="session-status">
                {/* PROMINENT Phase Navigation - Enhanced for User Orientation */}
                <div className="flex items-center gap-4 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center px-3 py-1.5 bg-blue-500 text-white text-sm font-semibold rounded-full shadow-sm">
                      Phase {sessionContext.currentQuestionIndex + 1} of {AI_TRANSFORMATION_QUESTIONS.length}
                    </span>
                    
                    {/* Progress Bar */}
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-blue-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ 
                            width: `${((sessionContext.currentQuestionIndex + 1) / AI_TRANSFORMATION_QUESTIONS.length) * 100}%` 
                          }}
                        />
                      </div>
                      <span className="text-xs text-blue-600 font-medium">
                        {Math.round(((sessionContext.currentQuestionIndex + 1) / AI_TRANSFORMATION_QUESTIONS.length) * 100)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Enhanced Navigation Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (sessionContext.currentQuestionIndex > 0) {
                          setSessionContext(prev => ({
                            ...prev,
                            currentQuestionIndex: prev.currentQuestionIndex - 1
                          }));
                        }
                      }}
                      disabled={sessionContext.currentQuestionIndex === 0}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium bg-white border border-blue-300 text-blue-700 rounded-md hover:bg-blue-50 hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all duration-200"
                      title="Previous phase"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Previous
                    </button>
                    
                    <button
                      onClick={() => {
                        if (sessionContext.currentQuestionIndex < AI_TRANSFORMATION_QUESTIONS.length - 1) {
                          setSessionContext(prev => ({
                            ...prev,
                            currentQuestionIndex: prev.currentQuestionIndex + 1
                          }));
                        }
                      }}
                      disabled={sessionContext.currentQuestionIndex >= AI_TRANSFORMATION_QUESTIONS.length - 1}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium bg-white border border-blue-300 text-blue-700 rounded-md hover:bg-blue-50 hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all duration-200"
                      title="Next phase"
                    >
                      Next
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="header-right">
              {sessionContext.startTime && (
                <span className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {Math.round((Date.now() - sessionContext.startTime.getTime()) / 60000)}m
                </span>
              )}
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
        </header>

        {/* Main Content - 2 Column Professional Layout */}
        <main className="main-content">
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
                <div className="transcript-section">
                  <div className="transcript-container">
                    {sessionContext.liveTranscript.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m10 0v10a2 2 0 01-2 2H9a2 2 0 01-2-2V8m10 0H7" />
                        </svg>
                        <p className="text-gray-500 text-lg font-medium mb-2">No Discussion Yet</p>
                        <p className="text-gray-400 text-sm max-w-sm">
                          Start smart recording or add manual entries to begin capturing the roundtable discussion.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-0">
                         {sessionContext.liveTranscript.map((entry, index) => {
                          const isLast = index === sessionContext.liveTranscript.length - 1;
                          const speakerType = (entry.speaker === 'Facilitator') ? 'facilitator' : 'participant';
                          
                          // DEBUG: Log what's actually in entry.speaker
                          console.log(` Entry ${index}: speaker="${entry.speaker}", text="${entry.text?.substring(0, 30)}..."`);
                          
                          return (
                            <div key={entry.id || index} className="transcript-entry">
                              {/* Timeline Visual */}
                              <div className="timeline">
                                <div className={`timeline-dot ${speakerType}`}>
                                  {speakerType === 'facilitator' ? (
                                    <span className="text-xs font-bold text-white bg-blue-500 rounded-full w-6 h-6 flex items-center justify-center ring-2 ring-blue-200">F</span>
                                  ) : (
                                    <span className="text-xs font-bold text-white bg-green-500 rounded-full w-6 h-6 flex items-center justify-center ring-2 ring-green-200">P</span>
                                  )}
                                </div>
                                {!isLast && <div className="timeline-line" />}
                              </div>
                              
                              {/* Entry Content */}
                              <div className="entry-content">
                                <div className="entry-header">
                                  <span className={`speaker-name ${speakerType}`}>
                                    {entry.speaker || 'Participant'}
                                  </span>
                                  <span className="timestamp">
                                    {new Date(entry.timestamp).toLocaleTimeString('en-US', {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                  </span>
                                </div>
                                <p className="entry-text">{entry.text}</p>
                                
                                {/* Auto-detection indicators */}
                                <div className="flex gap-3 mt-1">
                                  {entry.isAutoDetected && (
                                    <span className="text-xs text-gray-400">
                                      🎤 Auto-detected
                                    </span>
                                  )}
                                  {entry.confidence && entry.confidence < 0.8 && (
                                    <span className="text-xs text-orange-500">
                                      ⚠️ Low confidence
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
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

              {/* Recording Controls with Status */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">🎙️ Live Capture</h3>
                  
                  {/* Speech Status Indicator */}
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
                      
                      {interimTranscript && (
                        <span className="text-gray-400 italic truncate max-w-xs">
                          "{interimTranscript}"
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      if (isRecording) {
                        setIsRecording(false);
                        await speechTranscription.stop();
                        console.log('🛑 Stopped recording');
                      } else {
                        try {
                          setIsRecording(true);
                          await speechTranscription.start();
                          console.log('🎤 Started recording');
                        } catch (error) {
                          console.error('Failed to start recording:', error);
                          setIsRecording(false);
                        }
                      }
                    }}
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

              {/* Simplified Speaker Indicator - Read Only During Recording */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Current Speaker (Auto-Detected)
                  </label>
                  <span className="text-xs text-gray-500">
                    AI detects speakers automatically
                  </span>
                </div>
                
                {/* Just show who's currently being recorded */}
                <div className="flex items-center gap-2">
                  <div className={`px-3 py-2 rounded-md font-medium ${
                    currentSpeaker === 'Facilitator' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {currentSpeaker === 'Facilitator' ? (
                      <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    )}
                    {currentSpeaker}
                  </div>
                </div>
                
                {/* Optional: Post-session speaker review */}
                {sessionContext.liveTranscript.length > 10 && !isRecording && (
                  <button
                    onClick={runSpeakerAttribution}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-700"
                  >
                    🤖 Run AI Speaker Identification
                  </button>
                )}
              </div>
              
              {/* Smart Detection Status Bar - Hidden by default for executive UX */}
              {showParticipantDetection && (
                <div className="smart-detection-status">
                  <div className="detection-info">
                    <div className="detection-mode">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span>Smart Detection: {isRecording ? 'Active' : 'Standby'}</span>
                    </div>
                    <div className="current-speaker">
                      Current: <span className="speaker-name">{currentSpeaker || 'Waiting...'}</span>
                    </div>
                  </div>
                  
                  <div className="recording-controls">
                    <button
                      onClick={() => {
                        if (isRecording) {
                          setIsRecording(false);
                          speechTranscription.stop();
                          setInterimTranscript('');
                        } else {
                          setIsRecording(true);
                          speechTranscription.start();
                        }
                      }}
                      className={`recording-button ${
                        isRecording ? 'recording-button--active' : 'recording-button--inactive'
                      }`}
                      title={isRecording ? 'Stop recording' : 'Start voice recording with smart speaker detection'}
                    >
                      {isRecording ? (
                        <>
                          <div className="recording-indicator animate-pulse" />
                          Stop Recording
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                          Start Smart Recording
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => setShowManualModal(true)}
                      className="btn btn--secondary"
                      title="Add discussion point manually"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Manual Entry
                    </button>
                    
                    <button
                      onClick={runSpeakerAttribution}
                      disabled={sessionContext.liveTranscript.length < 3}
                      className="btn btn--secondary"
                      title="Use AI to identify and organize speakers"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      AI Speaker ID
                    </button>
                  </div>
                </div>
              )}
              
              {/* Speaker Indicator - Phase 1.3: Hidden by default for executive UX */}
              {showParticipantDetection && (
                <SpeakerIndicator 
                  currentSpeaker={currentSpeaker} 
                  isVisible={sessionContext.liveTranscript.length > 0 || isRecording} 
                />
              )}


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
                    title="Close facilitator guide panel"
                    aria-label="Close facilitator guide"
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

                {/* AI Co-Facilitator Panel */}
                <div className="ai-panel mt-6 pt-6 border-t p-6 bg-white rounded-lg shadow-sm">
                  <div className="ai-header">
                    <h2 className="ai-title">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      AI Co-Facilitator
                    </h2>
                    
                    {/* Progressive Tab Navigation - Clean and Accessible */}
                    <nav 
                      className="flex gap-2 mb-6 border-b border-gray-200 pb-4"
                      role="tablist"
                      aria-label="AI Analysis Navigation"
                    >
                      {availableTabs.map((tab) => {
                        const isActive = activeAITab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveAITab(tab.id as any)}
                            className={`
                              px-4 py-2 rounded-lg font-medium transition-all duration-200
                              flex items-center gap-2 relative
                              ${
                                isActive 
                                  ? 'bg-blue-500 text-white shadow-md transform scale-105' 
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                              }
                              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                            `}
                            role="tab"
                            aria-selected={isActive}
                            aria-controls={`${tab.label.toLowerCase()}-panel`}
                          >
                            <span className="text-lg" aria-hidden="true">{tab.icon}</span>
                            <span>{tab.label}</span>
                            {tab.id === 'advanced' && showAdvancedTab && (
                              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            )}
                          </button>
                        );
                      })}
                    </nav>
                    
                    {/* Quick Action Button */}
                    <div className="mb-4">
                      <button
                        onClick={() => {
                          const currentTab = availableTabs.find(t => t.id === activeAITab);
                          if (currentTab?.id === 'insights') {
                            callAIAnalysis('insights');
                          } else if (currentTab?.id === 'synthesis') {
                            callAIAnalysis('synthesis');
                          } else {
                            callAIAnalysis('insights'); // Default fallback
                          }
                        }}
                        disabled={isAnalyzing}
                        className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                                   transition-colors duration-200 font-medium shadow-sm
                                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                                   disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={`Generate new ${availableTabs.find(t => t.id === activeAITab)?.label || 'analysis'}`}
                      >
                        {isAnalyzing ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Generating...
                          </span>
                        ) : (
                          `Generate New ${availableTabs.find(t => t.id === activeAITab)?.label || 'Analysis'}`
                        )}
                      </button>
                    </div>
                    
                    {/* Executive Summary Button - Appears after 1+ insights */}
                    {sessionContext.aiInsights && sessionContext.aiInsights.length >= 1 && (
                      <div className="mb-4">
                        <button
                          onClick={() => callAIAnalysis('executive')}
                          disabled={isAnalyzing}
                          className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white 
                                     rounded-lg hover:from-purple-600 hover:to-indigo-600 
                                     transition-all duration-200 font-medium shadow-md
                                     focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
                                     disabled:opacity-50 disabled:cursor-not-allowed
                                     transform hover:scale-105"
                          aria-label="Generate Executive Summary"
                        >
                          {isAnalyzing ? (
                            <span className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Generating Executive Summary...
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-2">
                              📋 Executive Summary
                              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                                {sessionContext.aiInsights.length} insights ready
                              </span>
                            </span>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* AI Insights Container - Modern Component-Based Rendering */}
                  <div className="tab-content p-4 bg-gray-50 rounded-lg transition-opacity duration-300">
                    {(() => {
                      const filteredInsights = getFilteredInsights();
                      
                      if (filteredInsights.length === 0) {
                        // Empty State Component
                        return (
                          <div className="text-center py-12">
                            <div className="text-4xl mb-4">
                              {activeAITab === 'insights' ? '💭' : 
                               activeAITab === 'synthesis' ? '🔄' :
                               activeAITab === 'followup' ? '❓' : 
                               activeAITab === 'executive' ? '📋' : '🤖'}
                            </div>
                            <p className="text-gray-500">
                              No {activeAITab === 'all' ? 'insights' : activeAITab} available yet. Start your session to see AI-generated content here.
                            </p>
                          </div>
                        );
                      }
                      
                      // Show latest 3 insights with modern card design
                      return (
                        <div className="space-y-4">
                          {filteredInsights.slice(-3).map((insight, idx) => {
                            // Modern Insight Card Component
                            const getInsightIcon = (type: string) => {
                              switch (type) {
                                case 'synthesis': return '🔄';
                                case 'followup': return '❓';
                                case 'executive': return '📋';
                                case 'cross_reference': return '🔗';
                                case 'facilitation': return '🎯';
                                case 'transition': return '➡️';
                                case 'strategic': return '🎯';
                                case 'insight':
                                case 'insights':
                                default: return '💡';
                              }
                            };
                            
                            return (
                              <div key={insight.id || idx} className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-200 transition-all duration-200">
                                <div className="flex items-start gap-3">
                                  <span className="text-2xl">
                                    {getInsightIcon(insight.type || 'insight')}
                                  </span>
                                  <div className="flex-1">
                                    <p className="text-gray-800">{insight.content}</p>
                                    <span className="text-xs text-gray-500 mt-2 block">
                                      {new Date(insight.timestamp || Date.now()).toLocaleTimeString('en-US', {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true
                                      })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}
         </main>

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
                     <select
                       value={manualSpeakerName}
                       onChange={(e) => setManualSpeakerName(e.target.value)}
                       className="w-full px-3 py-2 border border-gray-300 rounded-md"
                     >
                       <option value="Facilitator">Facilitator</option>
                       <option value="Speaker">Speaker</option>
                       <option value="Custom">Custom Name...</option>
                     </select>
                     {manualSpeakerName === 'Custom' && (
                       <input
                         type="text"
                         value={customSpeakerName}
                         onChange={(e) => setCustomSpeakerName(e.target.value)}
                         className="w-full px-3 py-2 border border-gray-300 rounded-md mt-2"
                         placeholder="Enter speaker name"
                         autoFocus
                       />
                     )}
                   </div>
                   <div>
                     <label className="block text-sm font-medium mb-2">Entry Text</label>
                     <textarea
                       value={manualEntryText}
                       onChange={(e) => setManualEntryText(e.target.value)}
                       className="w-full px-3 py-2 border border-gray-300 rounded-md h-32 resize-none"
                       placeholder="Enter the transcript text..."
                       autoFocus={manualSpeakerName !== 'Custom'}
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
                       Each speaker entry should be on a new line
                     </p>
                   </div>
                   <textarea
                     value={bulkTranscriptText}
                     onChange={(e) => setBulkTranscriptText(e.target.value)}
                     className="w-full px-3 py-2 border border-gray-300 rounded-md h-64 resize-none font-mono text-sm"
                     placeholder="John: I think we should focus on AI training first.&#10;Sarah: Good point. What about data preparation?&#10;John: That's essential too..."
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
      {/* Phase 1.1: Top Navigation for Critical UX Fix */}
      <TopNavigation 
        sessionContext={sessionContext}
        goToPreviousQuestion={goToPreviousQuestion}
        goToNextQuestion={goToNextQuestion}
        totalQuestions={AI_TRANSFORMATION_QUESTIONS.length}
        presentationMode={presentationMode}
        setPresentationMode={setPresentationMode}
        showParticipantDetection={showParticipantDetection}
        setShowParticipantDetection={setShowParticipantDetection}
        setShowTemplateSelector={setShowTemplateSelector}
      />
      
      {/* Enhanced Recording Indicator */}
      <RecordingIndicator isRecording={isRecording} />
      
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
              placeholder="What was discussed? (e.g., 'We agreed that AI should focus on decision support rather than replacement')"
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
      
      {/* Speaker Attribution Review Modal */}
      {showSpeakerAttribution && attributionResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                🤖 AI Speaker Identification Results
              </h3>
              <button
                onClick={() => {
                  setShowSpeakerAttribution(false);
                  setAttributionResults(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* AI Summary */}
            {attributionResults.summary && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-blue-900 mb-2">Analysis Summary:</h4>
                <p className="text-blue-800 text-sm">{attributionResults.summary}</p>
              </div>
            )}
            
            {/* Suggested Speaker Assignments */}
            {attributionResults.suggestedSpeakers && attributionResults.suggestedSpeakers.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Suggested Speaker Identifications:</h4>
                <div className="space-y-2">
                  {attributionResults.suggestedSpeakers.map((suggestion: any, index: number) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-gray-900">
                            {suggestion.currentLabel} → {suggestion.suggestedLabel}
                          </span>
                          {suggestion.confidence && (
                            <span className={`ml-2 px-2 py-1 rounded text-xs ${
                              suggestion.confidence > 0.8 
                                ? 'bg-green-100 text-green-700' 
                                : suggestion.confidence > 0.6
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                            }`}>
                              {Math.round(suggestion.confidence * 100)}% confident
                            </span>
                          )}
                        </div>
                      </div>
                      {suggestion.reasoning && (
                        <p className="text-sm text-gray-600 mt-1">{suggestion.reasoning}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Transcript Review with Suggested Changes */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Transcript Review:</h4>
              <div className="max-h-64 overflow-y-auto border rounded-lg">
                {sessionContext.liveTranscript.map((entry, index) => {
                  const suggestion = attributionResults.suggestions?.find(
                    (s: any) => s.entryId === entry.id
                  );
                  
                  return (
                    <div 
                      key={entry.id}
                      className={`p-3 border-b last:border-b-0 ${
                        suggestion ? 'bg-yellow-50' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              entry.speaker === 'Facilitator' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {entry.speaker}
                            </span>
                            {suggestion && (
                              <>
                                <span className="text-gray-400">→</span>
                                <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700">
                                  {suggestion.suggestedSpeaker}
                                </span>
                              </>
                            )}
                          </div>
                          <p className="text-gray-700 text-sm">{entry.text}</p>
                          {suggestion?.reasoning && (
                            <p className="text-xs text-gray-500 mt-1 italic">
                              AI: {suggestion.reasoning}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 ml-2">
                          {entry.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                💡 Review the AI suggestions above and apply changes as needed.
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowSpeakerAttribution(false);
                    setAttributionResults(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Apply AI suggestions to transcript
                    if (attributionResults.suggestions) {
                      const updatedTranscript = sessionContext.liveTranscript.map(entry => {
                        const suggestion = attributionResults.suggestions.find(
                          (s: any) => s.entryId === entry.id
                        );
                        return suggestion ? { ...entry, speaker: suggestion.suggestedSpeaker } : entry;
                      });
                      
                      setSessionContext(prev => ({
                        ...prev,
                        liveTranscript: updatedTranscript
                      }));
                    }
                    
                    setShowSpeakerAttribution(false);
                    setAttributionResults(null);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Apply AI Suggestions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Selector Modal */}
      <TemplateSelector
        isOpen={showTemplateSelector}
        onTemplateSelect={handleTemplateSelection}
        onClose={() => setShowTemplateSelector(false)}
      />

      {/* Temporary Speaker Detection Tester */}


    </>
  );
};

export default RoundtableCanvasV2;
