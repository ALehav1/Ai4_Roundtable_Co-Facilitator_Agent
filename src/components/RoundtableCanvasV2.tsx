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
import { FACILITATOR_SEMANTIC_PATTERNS, MIN_WORDS_FOR_INSIGHTS } from '../constants/speech';
import { useToast } from '@/components/ToastProvider';
import { DebugPanel } from '@/components/DebugPanel';

// Types now imported from centralized files
// SessionState, TranscriptEntry, SessionContext imported from @/types/session
// FACILITATOR_PATTERNS, MIN_WORDS_FOR_INSIGHTS imported from @/constants/speech

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
  // REMOVED: Duplicate manual entry state - using showManualModal instead
  const [manualText, setManualText] = useState('');
  const [currentSpeaker, setCurrentSpeaker] = useState('Participant'); // DEFAULT TO PARTICIPANT per new guide
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingType, setAnalyzingType] = useState<string | null>(null);

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
  
  // Add this new state for right panel tab navigation
  const [rightPanelTab, setRightPanelTab] = useState<'guide' | 'insights' | 'synthesis' | 'followup' | 'executive'>('guide');
  

  
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
      
      // Use smart speaker detection for speech transcription too
      const detectedSpeaker = detectSpeaker(finalEvent.text);
      addTranscriptEntry({
        text: finalEvent.text,
        speaker: detectedSpeaker,
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
      
      // Build transcript with minimum context check
      const transcriptText = sessionContext.liveTranscript
        .map(entry => `${entry.speaker}: ${entry.text}`)
        .join('\n');
      
      // Require minimum content before analysis (CRITICAL FIX)
      if (transcriptText.length < 200 && analysisType !== 'summary') {
        console.log('⚠️ Insufficient content for AI analysis:', {
          transcriptLength: transcriptText.length,
          required: 200,
          analysisType
        });
        
        showToast({
          type: 'warning',
          title: 'More Discussion Needed',
          message: 'Please continue the conversation before requesting AI analysis.'
        });
        
        return;
      }
      
      // Get current context
      const currentQuestion = getCurrentQuestion(sessionContext.currentQuestionIndex);
      const totalQuestions = getTotalQuestions();
      
      // Enhanced context builder with proper schema (CRITICAL FIX)
      const requestPayload = {
        // CORRECTED: Match API schema exactly
        sessionTopic: sessionContext.currentTopic || 'AI Transformation Strategy',
        liveTranscript: transcriptText,  // ✅ FIXED: Use correct API schema key
        analysisType: analysisType,
        
        // Enhanced context for better analysis
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
          }))
        }
      };

      console.log('🔍 AI Analysis Request:', {
        type: analysisType,
        transcriptLength: transcriptText.length,
        entryCount: sessionContext.liveTranscript.length,
        payloadSize: JSON.stringify(requestPayload).length
      });

      // Primary endpoint: /api/analyze-live (CORRECTED PAYLOAD)
      try {
        const response = await fetch('/api/analyze-live', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(requestPayload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ API Error Response:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
          throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('✅ AI Analysis Success:', {
          type: analysisType,
          hasContent: !!data.content,
          contentLength: data.content?.length
        });
        
        if (data.success && data.content) {
          // Validate content quality
          const validation = validateInsightContent(data.content, analysisType, sessionContext.aiInsights);
          
          if (!validation.isValid) {
            showToast({
              type: 'warning',
              title: 'Analysis Needs Refinement',
              message: validation.message || 'Generated analysis needs more context'
            });
            return;
          }
          
          // Add insight with enhanced metadata
          setSessionContext(prev => ({
            ...prev,
            aiInsights: analysisType === 'synthesis' 
              ? [
                  // Replace previous synthesis
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
                  // Append for other types
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
        
      } catch (primaryError) {
        console.warn('⚠️ Primary endpoint failed, trying fallback:', primaryError);
        
        // Fallback endpoint: /api/analyze (LEGACY COMPATIBILITY)
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
          });

          if (!fallbackResponse.ok) {
            throw new Error(`Fallback API Error ${fallbackResponse.status}`);
          }

          const fallbackData = await fallbackResponse.json();
          const content = fallbackData.insights || fallbackData.analysis || fallbackData.result || '';
          
          if (!content) {
            throw new Error('No content in fallback response');
          }
          
          // Add fallback insight
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
          
        } catch (fallbackError) {
          const primaryMsg = primaryError instanceof Error ? primaryError.message : String(primaryError);
          const fallbackMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
          throw new Error(`All endpoints failed: ${primaryMsg} | ${fallbackMsg}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Complete AI Analysis Failure:', error);
      
      // Add helpful error insight
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
  }, [sessionContext, isAnalyzing, showToast]);

  // Smart Insight Triggering System
  useEffect(() => {
    const entryCount = sessionContext.liveTranscript.length;
    
    // Skip if insufficient content
    if (entryCount < 5) return;
    
    // Auto-trigger with throttling
    const lastInsightTime = sessionContext.aiInsights.length > 0 ? 
      sessionContext.aiInsights[sessionContext.aiInsights.length - 1].timestamp.getTime() : 0;
    const timeSinceLastInsight = Date.now() - lastInsightTime;
    const MIN_TIME_BETWEEN_AUTO_INSIGHTS = 3 * 60 * 1000; // 3 minutes
    
    // Auto-insights every 7 meaningful entries
    if (entryCount > 0 && entryCount % 7 === 0 && timeSinceLastInsight > MIN_TIME_BETWEEN_AUTO_INSIGHTS) {
      setTimeout(() => {
        callAIAnalysis('insights');
      }, 2000);
    }
    
  }, [sessionContext.liveTranscript.length, sessionContext.aiInsights, callAIAnalysis]);
  

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
    
    // 1. Check semantic facilitator patterns - much more flexible detection
    const matchesFacilitatorPattern = Object.values(FACILITATOR_SEMANTIC_PATTERNS)
      .flat()
      .some(regex => {
        const matches = regex.test(text);
        console.log(`🔍 DEBUG: Pattern ${regex} matches "${text}": ${matches}`);
        return matches;
      });
    
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
    const isVeryStrongFacilitator = matchesFacilitatorPattern || // SEMANTIC PATTERNS NOW VERY STRONG
                                   isSelfIntroduction || 
                                   isOrgReference || 
                                   isTopicIntroduction || 
                                   isFacilitatorGuideQuestion;
    
    if (isVeryStrongFacilitator) {
      const result = 'Facilitator';
      setLastSpeakerDetection({ speaker: result, timestamp: now, confidence: 'high' });
      console.log(`✅ Strong Facilitator: "${text.substring(0, 30)}..." → ${result} (semantic pattern match)`);
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
    const isWeakFacilitator = isFacilitatorAskingAboutOthers ||
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
  }, [lastSpeakerDetection]);

  // Helper function to extract discussion patterns
  const detectDiscussionPatterns = useCallback((transcript: TranscriptEntry[]) => {
    return {
      facilitatorQuestionCount: transcript.filter(e => 
        e.speaker === 'Facilitator' && e.text.includes('?')
      ).length,
      
      participantResponseTypes: {
        challenges: transcript.filter(e => 
          e.speaker === 'Participant' && 
          /challenge|difficult|struggle|problem|issue/i.test(e.text)
        ).length,
        
        opportunities: transcript.filter(e => 
          e.speaker === 'Participant' && 
          /opportunity|potential|could|transform|improve/i.test(e.text)
        ).length,
        
        examples: transcript.filter(e => 
          e.speaker === 'Participant' && 
          /for example|in our company|we do|at our org/i.test(e.text)
        ).length
      },
      
      recentTopics: transcript.slice(-5).map(e => e.text.substring(0, 50))
    };
  }, []);

  // Helper function to get previous follow-up questions for deduplication
  const getPreviousFollowupQuestions = useCallback(() => {
    return sessionContext.aiInsights
      .filter(insight => insight.type === 'followup')
      .map(insight => insight.content)
      .slice(-10); // Last 10 follow-up questions
  }, [sessionContext.aiInsights]);

  // Helper function to validate insight content before adding
  const validateInsightContent = useCallback((content: string, analysisType: string, existingInsights: any[]) => {
    // Check for empty or very short content
    const cleanContent = content?.trim() || '';
    if (!cleanContent || cleanContent.length < 10) {
      return {
        isValid: false,
        reason: 'Content too short or empty',
        message: 'AI analysis returned insufficient content. Please try again.'
      };
    }

    // Check for duplicate content (case-insensitive, first 100 chars)
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

  // Helper function to get phase-specific context
  const getPhaseSpecificContext = useCallback((
    analysisType: string, 
    currentQuestion: any,
    phase: number
  ) => {
    const guidance = currentQuestion?.facilitatorGuidance;
    
    switch(analysisType) {
      case 'insight':
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
          instruction: `Create a final session summary for "${sessionContext.currentTopic}" facilitated by ${sessionContext.facilitator || 'Facilitator'}. 
      
      Structure the summary with these sections:
      1. Session Overview - Brief context and purpose
      2. Key Discussion Points - Major topics covered across all phases
      3. Opportunities Identified - Positive possibilities and innovations discussed
      4. Challenges & Concerns - Obstacles and risks acknowledged
      5. Areas of Agreement - Where consensus emerged
      6. Diverse Perspectives - Different viewpoints that enriched the discussion
      7. Key Decisions & Next Steps - Action items or conclusions reached
      
      Do NOT mention participant names or count. Focus entirely on the content of ideas discussed.
      Session Duration: ${Math.floor((Date.now() - sessionContext.startTime.getTime()) / 60000)} minutes`,
          sessionMetadata: {
            title: sessionContext.currentTopic,
            facilitator: sessionContext.facilitator || 'Facilitator',
            phases: AI_TRANSFORMATION_QUESTIONS.map(q => q.title)
          }
        };
        
      default:
        return { instruction: 'Provide analysis based on the discussion' };
    }
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
        title: 'Template loaded',
        message: `Template "${templateSessionContext.sessionTopic}" loaded successfully`
      });
    }
  }, [showToast]);

  // Helper function to get insights for a specific type
  const getInsightsForType = (type: string) => {
    return sessionContext.aiInsights.filter(i => i.type === type);
  };

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
        <header className="header bg-white border-b shadow-sm">
          <div className="header-content max-w-full px-6 py-4">
            <div className="header-left">
              <h1 className="app-title">
                🎙️ AI Roundtable Co-Facilitator
              </h1>
              <div className="session-status">
                {/* PROMINENT Phase Navigation - Enhanced for User Orientation */}
                <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
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

            </div>
          </div>
        </header>

        {/* Main Content - 2 Column Professional Layout */}
        <main className="main-content">
          {/* Main content area - what audience sees */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            <div className="max-w-3xl mx-auto p-6">
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
                    <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-6">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <p className="text-lg italic text-gray-800 font-medium">
                          "{currentQuestion.facilitatorGuidance.openingLine}"
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Setup line (for Phase 2) */}
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

                  {/* Key prompt/question */}
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
                    <div className="bg-white rounded-lg shadow-sm border border-green-200 p-6">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">
                            Example: {currentQuestion.facilitatorGuidance.exampleToShare.name}
                          </h4>
                          <ul className="space-y-2">
                            {currentQuestion.facilitatorGuidance.exampleToShare.points?.map((point, idx) => (
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

                  {/* Key message */}
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

                  {/* Discussion prompts */}
                  {currentQuestion.facilitatorGuidance.discussionPrompts && (
                    <div className="bg-white rounded-lg shadow-sm border border-purple-200 p-6">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Discussion Points:</h4>
                          <ul className="space-y-2">
                            {currentQuestion.facilitatorGuidance.discussionPrompts.map((prompt, idx) => (
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
                            {currentQuestion.facilitatorGuidance.facilitatorPrompts?.map((prompt, idx) => (
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
                </div>
              )}

              {/* Transcript section - keep existing transcript display code */}
              <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-900">Discussion Transcript</h3>
                  <span className="text-xs text-gray-500">Speakers auto-detected</span>
                </div>
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
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
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



              {/* AI Speaker Review - Only show after meaningful content */}
              {sessionContext.liveTranscript.length > 10 && !isRecording && (
                <div className="mt-4">
                  <button
                    onClick={runSpeakerAttribution}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Run AI Speaker Identification
                  </button>
                </div>
              )}
              
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

          {/* Right Panel - Combined Facilitator Guide and AI Tools */}
          <div className="facilitator-panel w-full lg:w-[32rem] bg-white border-l lg:border-l border-t lg:border-t-0 flex flex-col h-full shadow-lg">
            {/* Tab Navigation Bar */}
            <div className="border-b bg-gray-50 px-4 py-3 flex-shrink-0">
              <div className="flex gap-2">
                <button 
                  onClick={() => setRightPanelTab('guide')} 
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    rightPanelTab === 'guide' 
                      ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
                  title="Facilitator Guide"
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
                  title="Strategic Insights"
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
                  title="Discussion Synthesis"
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
                  title="Follow-up Questions"
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
                  title={sessionContext.currentQuestionIndex < getTotalQuestions() - 1 
                    ? "Final Session Summary (Available in last phase only)" 
                    : "Final Session Summary"}
                >
                  📊 Final Summary
                </button>
              </div>
            </div>

            {/* Tab Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Facilitator Guide Tab - Comprehensive Panel */}
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

              {/* Strategic Insights Tab */}
              {rightPanelTab === 'insights' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Strategic Insights</h3>
                    <button
                      onClick={() => callAIAnalysis('insight')}
                      disabled={isAnalyzing || sessionContext.liveTranscript.length === 0}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                    >
                      {isAnalyzing && analyzingType === 'insight' ? (
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
                    {getInsightsForType('insight').length === 0 ? (
                      <p className="text-center py-8 text-gray-500">
                        No insights generated yet. Start recording or add transcript entries, then click "Generate New" to analyze.
                      </p>
                    ) : (
                      getInsightsForType('insight').slice(-5).reverse().map((insight, idx) => (
                        <div key={insight.id || idx} className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                          <p className="text-sm text-gray-800">{insight.content}</p>
                          <span className="text-xs text-gray-500 mt-2 block">
                            {new Date(insight.timestamp).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                        </div>
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
                        <div key={insight.id || idx} className="bg-white rounded-lg p-4 border border-green-100 shadow-sm hover:shadow-md transition-shadow">
                          <p className="text-sm text-gray-800">{insight.content}</p>
                          <span className="text-xs text-gray-500 mt-2 block">
                            {new Date(insight.timestamp).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Follow-up Questions Tab */}
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
                        <div key={insight.id || idx} className="bg-white rounded-lg p-4 border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
                          <p className="text-sm text-gray-800">{insight.content}</p>
                          <span className="text-xs text-gray-500 mt-2 block">
                            {new Date(insight.timestamp).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Final Session Summary Tab */}
              {rightPanelTab === 'executive' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Final Session Summary</h3>
                    <button
                      onClick={() => callAIAnalysis('executive')}
                      className="flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      disabled={isAnalyzing || sessionContext.currentQuestionIndex < AI_TRANSFORMATION_QUESTIONS.length - 1}
                    >
                      {isAnalyzing && analyzingType === 'executive' ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Generating...</span>
                        </>
                      ) : sessionContext.currentQuestionIndex < AI_TRANSFORMATION_QUESTIONS.length - 1 ? (
                        <>
                          <span>⏳</span>
                          <span>Available in Final Phase</span>
                        </>
                      ) : (
                        <>
                          <span>📋</span>
                          <span>Generate Summary</span>
                        </>
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
                        <div key={insight.id || idx} className="bg-white rounded-lg p-4 border border-indigo-100 shadow-sm hover:shadow-md transition-shadow">
                          <p className="text-sm text-gray-800">{insight.content}</p>
                          <span className="text-xs text-gray-500 mt-2 block">
                            {new Date(insight.timestamp).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
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
      {/* REMOVED: Duplicate manual entry modal - using the complete version above instead */}
      
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
    </>
  );
};

export default RoundtableCanvasV2;