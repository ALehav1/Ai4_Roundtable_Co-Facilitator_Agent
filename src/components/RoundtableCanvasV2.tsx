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

// Types now imported from centralized files
// SessionState, TranscriptEntry, SessionContext imported from @/types/session
// FACILITATOR_PATTERNS, MIN_WORDS_FOR_INSIGHTS imported from @/constants/speech

// Enhanced Recording Indicator Component
const RecordingIndicator = ({ isRecording, currentSpeaker }: { 
  isRecording: boolean; 
  currentSpeaker: string;
}) => {
  if (!isRecording) return null;
  
  return (
    <div className="fixed top-20 right-4 z-50 animate-slideIn">
      <div className="bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
        {/* Pulse animation */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-3 h-3 bg-white rounded-full animate-ping" />
          <div className="relative w-3 h-3 bg-white rounded-full animate-pulse" />
        </div>
        
        {/* Status text */}
        <div className="flex flex-col">
          <span className="font-medium">Recording Active</span>
          <span className="text-xs opacity-90">
            Detecting: {currentSpeaker}
          </span>
        </div>
      </div>
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
  const [showFacilitatorPanel, setShowFacilitatorPanel] = useState(true);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
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
  const speechTranscription = useSpeechTranscription();
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Setup speech transcription
  useEffect(() => {
    speechTranscription.onPartial((event: TranscriptEvent) => {
      setInterimTranscript(event.text);
    });

    speechTranscription.onFinal((event: TranscriptEvent) => {
      if (event.text.trim()) {
        // Apply smart speaker detection
        const detectedSpeaker = detectSpeaker(event.text.trim());
        
        addTranscriptEntry({
          text: event.text.trim(),
          speaker: detectedSpeaker,
          confidence: event.confidence,
          isAutoDetected: true,
        });
        
        // Update current speaker for UI display
        setCurrentSpeaker(detectedSpeaker);
        setInterimTranscript('');
        
        // Trigger AI analysis after sufficient content
        const recentWordCount = sessionContext.liveTranscript
          .slice(-5)
          .reduce((count, entry) => count + entry.text.split(/\s+/).length, 0);
          
        if (recentWordCount > 100) {
          setTimeout(() => {
            callAIAnalysis('insights');
          }, 1500);
        }
      }
    });

    speechTranscription.onError((error: string) => {
      console.error('Speech Recognition Error:', error);
      setIsRecording(false);
      
      // Show user-friendly error toast
      const errorMessages: Record<string, string> = {
        'not-allowed': 'Microphone access denied. Please allow microphone permissions in your browser.',
        'audio-capture': 'No microphone detected. Please check your audio devices and try again.',
        'no-speech': 'No speech detected. Please speak clearly into your microphone.',
        'network': 'Speech recognition requires HTTPS. Please use the deployed version for speech features.',
        'service-not-allowed': 'Speech recognition service unavailable. Please try manual entry instead.',
      };
      
      const userMessage = errorMessages[error] || `Speech recognition error: ${error}. Please try manual entry.`;
      
      showToast({
        type: 'error',
        title: 'Speech Recognition Error',
        message: userMessage,
        durationMs: 6000,
        action: {
          label: 'Try Manual Entry',
          onClick: () => setShowManualModal(true)
        }
      });
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

  // BUILD AI CONTEXT - Must be defined before callAIAnalysis uses it
  const buildAIContext = useCallback(() => {
    const currentQuestion = getCurrentQuestion(sessionContext.currentQuestionIndex);
    const questionProgress = `Question ${sessionContext.currentQuestionIndex + 1} of ${getTotalQuestions()}`;
    
    // Get previous insights for this question (if any)
    const previousInsights = sessionContext.aiInsights
      .filter(output => output.questionId === currentQuestion?.id)
      .map(output => `[${output.type}]: ${output.content}`)
      .join('\n');
    
    // Get transcript text
    const transcript = sessionContext.liveTranscript
      .map(entry => `${entry.speaker}: ${entry.text}`)
      .join('\n');
    
    return {
      sessionTopic: sessionContext.currentTopic || 'General Discussion',
      currentQuestion: currentQuestion?.title || 'Open Discussion',
      questionContext: currentQuestion?.description || '',
      questionProgress,
      facilitatorPrompt: currentQuestion?.facilitatorGuidance?.keyPrompt || '',
      previousInsights: previousInsights || 'None',
      transcript
    };
  }, [sessionContext.liveTranscript, sessionContext.currentQuestionIndex, sessionContext.currentTopic, sessionContext.aiInsights]);

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
      // Set analyzing state
      setIsAnalyzing(true);
      
      // Build rich context using the dedicated context builder
      const aiContext = buildAIContext();
      
      // Minimum content threshold check
      const MIN_WORDS_FOR_INSIGHTS = 50;
      const wordCount = aiContext.transcript.split(/\s+/).filter(word => word.length > 0).length;

      if (wordCount < MIN_WORDS_FOR_INSIGHTS && analysisType === 'insights') {
        const insufficientContentInsight = {
          id: `insight_${Date.now()}`,
          type: 'info',
          content: `📝 Please capture more discussion content before generating insights. The AI needs at least ${MIN_WORDS_FOR_INSIGHTS} words of meaningful conversation to provide quality analysis. Current: ${wordCount} words.`,
          timestamp: new Date(),
          confidence: 1.0
        };
        
        setSessionContext(prev => ({
          ...prev,
          aiInsights: [...prev.aiInsights, insufficientContentInsight]
        }));
        return;
      }

      // Get current question for additional context
      const currentQuestion = getCurrentQuestion(sessionContext.currentQuestionIndex);
      const timeInPhase = sessionContext.questionStartTime ? 
        Math.round((Date.now() - sessionContext.questionStartTime.getTime()) / 60000) : 0;

      // Enhanced transcript with rich context headers using buildAIContext
      const enhancedTranscriptText = `SESSION CONTEXT:
Title: ${aiContext.sessionTopic}
Current Question: ${aiContext.currentQuestion}
Question Context: ${aiContext.questionContext}
Progress: ${aiContext.questionProgress}
Facilitator Prompt: ${aiContext.facilitatorPrompt}
Time in Phase: ${timeInPhase} minutes
Total Participants: ${new Set(sessionContext.liveTranscript.map(e => e.speaker)).size}

PREVIOUS INSIGHTS FOR THIS QUESTION:
${aiContext.previousInsights}

RECENT TRANSCRIPT (Last 15 entries):
${sessionContext.liveTranscript
  .slice(-15) // Last 15 entries for focused context
  .map(entry => `${entry.speaker}: ${entry.text}`)
  .join('\n')}

FRAMEWORK CONTEXT:
This session follows the Assistance → Automation → Amplification progression for AI transformation strategy.`;

      const response = await fetch('/api/analyze-live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionTopic: aiContext.sessionTopic,
          liveTranscript: enhancedTranscriptText,
          analysisType: analysisType,
          participantCount: new Set(sessionContext.liveTranscript.map(e => e.speaker)).size,
          clientId: 'live-session',
          phaseContext: {
            currentPhase: aiContext.currentQuestion,
            phaseDescription: aiContext.questionContext,
            timeInPhase,
            totalPhases: getTotalQuestions(),
            questionProgress: aiContext.questionProgress,
            facilitatorPrompt: aiContext.facilitatorPrompt,
            previousInsights: aiContext.previousInsights
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        const insightContent = result.content || result.summary || '';
        
        // Skip empty or error responses
        if (!insightContent || insightContent.toLowerCase().includes('no significant new content')) {
          const waitingGuidance = {
            id: `insight_${Date.now()}`,
            type: 'guidance',
            content: '⏳ The discussion is developing. Try capturing a few more responses, then request insights for richer analysis.',
            timestamp: new Date(),
            confidence: 1.0
          };
          
          setSessionContext(prev => ({
            ...prev,
            aiInsights: [...prev.aiInsights, waitingGuidance]
          }));
          return;
        }
        
        // Deduplication check - compare first 100 characters
        const isDuplicate = sessionContext.aiInsights.some(
          existing => 
            existing.type === analysisType &&
            existing.content.substring(0, 100) === insightContent.substring(0, 100)
        );

        if (!isDuplicate) {
          const newInsight = {
            id: `insight_${Date.now()}`,
            type: analysisType,
            content: insightContent,
            timestamp: new Date(),
            confidence: result.confidence || 0.85,
            metadata: {
              transcriptLength: wordCount,
              phase: aiContext.currentQuestion,
              timeInPhase,
              participantCount: new Set(sessionContext.liveTranscript.map(e => e.speaker)).size
            }
          };
          
          setSessionContext(prev => ({
            ...prev,
            aiInsights: [...prev.aiInsights, newInsight]
          }));
        }
      } else {
        // Handle API errors gracefully + visible toast
        showToast({
          type: response.status === 429 ? 'warning' : 'error',
          title: response.status === 429 ? 'Rate limit reached' : 'AI analysis unavailable',
          message: response.status === 429
            ? 'Too many requests. Please wait a minute and try again.'
            : 'The AI analysis service is temporarily unavailable. Please try again shortly.',
          action: { label: 'Retry', onClick: () => callAIAnalysis(analysisType) }
        });

        const errorInsight = {
          id: `insight_${Date.now()}`,
          type: 'error',
          content: '🔧 AI analysis temporarily unavailable. The discussion content is being captured and you can try again in a moment.',
          timestamp: new Date(),
          confidence: 1.0
        };

        setSessionContext(prev => ({
          ...prev,
          aiInsights: [...prev.aiInsights, errorInsight]
        }));
      }
    } catch (error) {
      console.error('AI Analysis Error:', error);
      // Visible network error toast
      showToast({
        type: 'error',
        title: 'Network error',
        message: 'Unable to contact the AI service. Please check your connection and try again.',
        action: { label: 'Retry', onClick: () => callAIAnalysis(analysisType) }
      });

      // User-friendly error handling
      const technicalErrorInsight = {
        id: `insight_${Date.now()}`,
        type: 'error', 
        content: '⚠️ Unable to generate insights right now. Your discussion is being recorded safely. Please try again in a moment.',
        timestamp: new Date(),
        confidence: 1.0
      };
      
      setSessionContext(prev => ({
        ...prev,
        aiInsights: [...prev.aiInsights, technicalErrorInsight]
      }));
    } finally {
      // ALWAYS reset analyzing state
      setIsAnalyzing(false);
    }
  }, [sessionContext.liveTranscript, sessionContext.currentTopic, sessionContext.currentQuestionIndex, sessionContext.aiInsights, showToast]);



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
      const speakerName = manualSpeakerName === 'Custom' 
        ? customSpeakerName || 'Unknown Speaker'
        : manualSpeakerName;
      
      addTranscriptEntry({
        speaker: speakerName,
        text: manualEntryText.trim(),
        isAutoDetected: false,
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
          addTranscriptEntry({
            speaker: speaker.trim(),
            text: text.trim(),
            isAutoDetected: false,
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

  // Smart Speaker Detection Function
  const FACILITATOR_PATTERNS = [
    // Questions
    "what do you think",
    "how does that",
    "can you tell us",
    "would you share",
    "what's your experience",
    
    // Transitions
    "let's move on",
    "our next question",
    "moving to",
    "let's explore",
    "next topic",
    
    // Acknowledgments
    "thank you for sharing",
    "i appreciate that",
    "great point",
    "interesting perspective",
    "thanks for that",
    
    // Time management
    "we have about",
    "few more minutes",
    "time for one more",
    "let's spend",
    
    // Session management
    "welcome everyone",
    "before we close",
    "to summarize",
    "let me ask",
    
    // Clarifications
    "just to clarify",
    "what i'm hearing",
    "to build on that",
    "following up on"
  ];

  const detectSpeaker = useCallback((text: string): string => {
    const lowerText = text.toLowerCase();
    
    // Check if text matches facilitator patterns
    const matchesFacilitatorPattern = FACILITATOR_PATTERNS.some(pattern => 
      lowerText.includes(pattern.toLowerCase())
    );
    
    // Additional heuristics for facilitator detection
    const isQuestion = text.trim().endsWith('?') && text.length < 200; // Short questions often from facilitator
    const hasTransitionWords = /^(so|now|okay|alright|great|well|let's)/i.test(text);
    const hasSummaryLanguage = /summariz|wrap up|key takeaway|moving forward/i.test(text);
    
    if (matchesFacilitatorPattern || (isQuestion && hasTransitionWords) || hasSummaryLanguage) {
      return 'Facilitator';
    }
    
    // Default to participant
    return 'Participant';
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
                          
                          return (
                            <div key={entry.id || index} className="transcript-entry">
                              {/* Timeline Visual */}
                              <div className="timeline">
                                <div className={`timeline-dot ${speakerType}`}>
                                  {speakerType === 'facilitator' ? (
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                    </svg>
                                  ) : (
                                    <span className="text-xs font-bold">P</span>
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

              {/* Session Controls */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-900">Session Controls</h3>
                </div>
                
                <div className="flex space-x-3">
                  {/* Recording Control Button */}
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
                          // Could add toast notification here
                          alert('Recording failed. Please check microphone permissions.');
                        }
                      }
                    }}
                    className={`px-4 py-2 rounded flex items-center gap-2 font-medium transition-colors ${
                      isRecording 
                        ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse' 
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                    title={isRecording ? 'Stop recording' : 'Start recording'}
                  >
                    {isRecording ? (
                      <>
                        <span className="w-3 h-3 bg-white rounded-full animate-ping"></span>
                        🛑 Stop Recording
                      </>
                    ) : (
                      <>
                        🎤 Start Recording
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setShowManualModal(true)}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 font-medium"
                  >
                    ➕ Manual Entry
                  </button>
                  
                  <button
                    onClick={() => setSessionState('summary')}
                    disabled={true}
                    className="px-4 py-2 bg-gray-400 text-gray-600 rounded cursor-not-allowed font-medium"
                    title="Session end flow needs UX redesign - temporarily disabled"
                  >
                    ⏹️ End Session (Disabled)
                  </button>
                </div>
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
                <div className="ai-panel mt-6 pt-6 border-t">
                  <div className="ai-header">
                    <h2 className="ai-title">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      AI Co-Facilitator
                    </h2>
                    
                    {/* Executive AI Co-Facilitator Grid (2x2 Layout) */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {/* Strategic Insights */}
                      <button
                        onClick={() => {
                          setActiveAITab('insights');
                          callAIAnalysis('insights');
                        }}
                        disabled={isAnalyzing}
                        className={`p-4 border rounded-lg transition-all duration-200 hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed group ${
                          activeAITab === 'insights'
                            ? 'bg-gradient-to-br from-purple-100 to-purple-200 border-purple-300 shadow-md ring-2 ring-purple-200'
                            : 'bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border-purple-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          <h3 className="font-semibold text-purple-800">Strategic Insights</h3>
                          {activeAITab === 'insights' && (
                            <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
                          )}
                        </div>
                        <p className="text-sm text-purple-600 group-hover:text-purple-700">
                          AI-powered analysis of discussion themes
                        </p>
                      </button>

                      {/* Follow-up Questions */}
                      <button
                        onClick={() => {
                          setActiveAITab('followup');
                          callAIAnalysis('followup');
                        }}
                        disabled={isAnalyzing || sessionContext.liveTranscript.length === 0}
                        className={`p-4 border rounded-lg transition-all duration-200 hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed group ${
                          activeAITab === 'followup'
                            ? 'bg-gradient-to-br from-blue-100 to-blue-200 border-blue-300 shadow-md ring-2 ring-blue-200'
                            : 'bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border-blue-200'
                        }`}
                        title="Get AI-suggested follow-up questions"
                        aria-label="Generate AI follow-up questions"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center mb-1">
                              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="font-semibold text-blue-900">Follow-up Questions</span>
                              {activeAITab === 'followup' && (
                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse ml-2"></div>
                              )}
                            </div>
                            <p className="text-sm text-blue-700">Suggested questions to deepen discussion</p>
                          </div>
                        </div>
                      </button>

                      {/* Discussion Synthesis */}
                      <button
                        onClick={() => {
                          setActiveAITab('synthesis');
                          callAIAnalysis('synthesis');
                        }}
                        disabled={isAnalyzing || sessionContext.liveTranscript.length === 0}
                        className={`p-4 border rounded-lg transition-all duration-200 hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed group ${
                          activeAITab === 'synthesis'
                            ? 'bg-gradient-to-br from-green-100 to-green-200 border-green-300 shadow-md ring-2 ring-green-200'
                            : 'bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 border-green-200'
                        }`}
                        title="Synthesize key themes and outcomes"
                        aria-label="Generate AI discussion synthesis"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center mb-1">
                              <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                              <span className="font-semibold text-green-900">Synthesize Discussion</span>
                              {activeAITab === 'synthesis' && (
                                <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse ml-2"></div>
                              )}
                            </div>
                            <p className="text-sm text-green-700">Key themes and strategic outcomes</p>
                          </div>
                        </div>
                      </button>

                      {/* Executive Summary */}
                      <button
                        onClick={() => {
                          setActiveAITab('executive');
                          callAIAnalysis('executive');
                        }}
                        disabled={isAnalyzing || sessionContext.liveTranscript.length === 0}
                        className={`p-4 border rounded-lg transition-all duration-200 hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed group ${
                          activeAITab === 'executive'
                            ? 'bg-gradient-to-br from-amber-100 to-amber-200 border-amber-300 shadow-md ring-2 ring-amber-200'
                            : 'bg-gradient-to-br from-amber-50 to-amber-100 hover:from-amber-100 hover:to-amber-200 border-amber-200'
                        }`}
                        title="Generate executive summary and action items"
                        aria-label="Generate executive summary"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center mb-1">
                              <svg className="w-5 h-5 mr-2 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="font-semibold text-amber-900">Executive Summary</span>
                              {activeAITab === 'executive' && (
                                <div className="w-2 h-2 bg-amber-600 rounded-full animate-pulse ml-2"></div>
                              )}
                            </div>
                            <p className="text-sm text-amber-700">High-level summary and action items</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* AI Insights Container - Filtered by Analysis Button Clicks */}
                  <div className="insights-container">
                    {sessionContext.aiInsights.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <p className="text-gray-500 font-medium mb-2">AI Co-Facilitator Ready</p>
                        <p className="text-gray-400 text-sm max-w-xs">
                          Start the discussion to receive AI-powered insights, follow-up questions, and synthesis.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(() => {
                          // Filter insights based on active tab
                          let filteredInsights = sessionContext.aiInsights;
                          
                          if (activeAITab === 'insights') {
                            filteredInsights = sessionContext.aiInsights.filter(insight => insight.type === 'insights');
                          } else if (activeAITab === 'followup') {
                            filteredInsights = sessionContext.aiInsights.filter(insight => insight.type === 'followup');
                          } else if (activeAITab === 'synthesis') {
                            filteredInsights = sessionContext.aiInsights.filter(insight => insight.type === 'synthesis');
                          } else if (activeAITab === 'executive') {
                            filteredInsights = sessionContext.aiInsights.filter(insight => insight.type === 'executive');
                          }
                          // If activeAITab === 'all' or any other value, show all insights
                          
                          return filteredInsights.slice(-3);
                        })().map((insight, idx) => {
                          const insightType = insight.type || 'info';
                          const colorClass = insightType === 'insights' ? 'purple' : insightType === 'followup' ? 'blue' : insightType === 'synthesis' ? 'green' : 'info';
                          
                          return (
                            <div key={insight.id || idx} className={`insight-card ${colorClass}`}>
                              <div className="insight-header">
                                <span className="insight-icon">
                                  {insightType === 'insights' && '💡'}
                                  {insightType === 'followup' && '❓'}
                                  {insightType === 'synthesis' && '📊'}
                                  {!['insights', 'followup', 'synthesis'].includes(insightType) && '🤖'}
                                </span>
                                <span className="insight-label">
                                  {insight.type?.charAt(0).toUpperCase() + insight.type?.slice(1) || 'AI Insight'}
                                </span>
                                <span className="insight-time text-xs text-gray-400">
                                  {new Date(insight.timestamp || Date.now()).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                </span>
                              </div>
                              <div className="insight-content text-gray-700 leading-relaxed">
                                {insight.content}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
      <RecordingIndicator isRecording={isRecording} currentSpeaker={currentSpeaker} />
      
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
    </>
  );
};

export default RoundtableCanvasV2;
