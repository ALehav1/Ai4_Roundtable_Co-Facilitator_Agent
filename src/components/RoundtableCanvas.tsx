'use client';

/**
 * AI Roundtable Canvas Component
 * 
 * This is the main interactive interface for the AI-facilitated roundtable discussion.
 * It manages the discussion flow, participant responses, and AI insights integration.
 * 
 * Key Features:
 * - Configurable questions from roundtable-config.ts
 * - Real-time AI analysis and insights
 * - Test mode for rehearsals
 * - Offline fallback capability
 * - Export functionality for session results
 * 
 * Dependencies: Configuration system, AI API endpoint
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  roundtableQuestions, 
  sessionConfig, 
  uiText, 
  getCurrentQuestion,
  getTotalQuestions 
} from '@/config/roundtable-config';
import SessionSummary from './SessionSummary';

// Web Speech API type declarations
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

// TypeScript interfaces for component state
interface ParticipantResponse {
  id: string;
  text: string;
  timestamp: Date;
  participantName?: string;
}

interface AIInsight {
  content: string;
  type: 'insights' | 'synthesis' | 'followup' | 'cross_reference' | 'facilitation';
  timestamp: Date;
  questionId: string;
  facilitationType?: string;
  confidence?: number;
  connections?: string[];
}

interface SessionData {
  responses: ParticipantResponse[];
  aiInsights: AIInsight[];
  currentQuestionIndex: number;
  sessionStartTime: Date;
}

const RoundtableCanvas: React.FC = () => {
  // Core state management
  const [sessionData, setSessionData] = useState<SessionData>({
    responses: [],
    aiInsights: [],
    currentQuestionIndex: 0,
    sessionStartTime: new Date(0) // Will be updated on client hydration
  });
  
  const [isClient, setIsClient] = useState(false);
  
  // Initialize client-side only values after hydration
  useEffect(() => {
    setIsClient(true);
    // Reset session start time to actual current time on client
    setSessionData(prev => ({
      ...prev,
      sessionStartTime: new Date()
    }));
    
    // Initialize speech recognition on client
    initializeSpeechRecognition();
  }, []);
  
  /**
   * Initialize Web Speech API for real-time transcription
   * Provides facilitators with hands-free input capability
   */
  const initializeSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      setSpeechSupported(false);
      return;
    }
    
    setSpeechSupported(true);
    
    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'en-US';
    
    recognitionInstance.onstart = () => {
      setIsListening(true);
      setError(null);
    };
    
    recognitionInstance.onend = () => {
      setIsListening(false);
    };
    
    recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      
      // Update response with final transcript
      if (finalTranscript) {
        setCurrentResponse(prev => prev + finalTranscript);
      }
    };
    
    recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };
    
    setRecognition(recognitionInstance);
  }, []);

  // UI state
  const [currentResponse, setCurrentResponse] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [isTestMode, setIsTestMode] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Speech-to-text state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  // Summary generation state
  const [sessionSummary, setSessionSummary] = useState<any>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // Get current question data
  const currentQuestion = getCurrentQuestion(sessionData.currentQuestionIndex);
  const isLastQuestion = sessionData.currentQuestionIndex === getTotalQuestions() - 1;

  // Timer effect for question time limits
  useEffect(() => {
    if (!currentQuestion?.timeLimit) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 60000); // Update every minute

    // Initialize timer
    setTimeRemaining(currentQuestion.timeLimit);

    return () => clearInterval(timer);
  }, [currentQuestion, sessionData.currentQuestionIndex]);

  /**
   * Enhanced AI analysis call with full session memory
   * Now sends complete session context for co-facilitator behavior
   */
  const callAIAnalysis = useCallback(async (
    analysisType: 'insights' | 'synthesis' | 'followup' | 'cross_reference' = 'insights'
  ) => {
    if (!currentQuestion) return;

    setIsAIThinking(true);
    setError(null);

    // FIX: Honor test mode flag to prevent real API calls during testing
    if (isTestMode) {
      setTimeout(() => {
        const mockInsight: AIInsight = {
          content: `[TEST MODE] This is a mock AI insight for "${analysisType}". The analysis would normally appear here based on participant responses.`,
          type: analysisType,
          timestamp: isClient ? new Date() : new Date(0),
          questionId: currentQuestion.id
        };
        
        setSessionData(prev => ({
          ...prev,
          aiInsights: [...prev.aiInsights, mockInsight]
        }));
        
        setIsAIThinking(false);
      }, 1500); // Simulate network delay
      return;
    }

    try {

      // Enhanced API call with full session context
      const participantNames = Array.from(new Set(
        sessionData.responses.map(r => r.participantName).filter(Boolean)
      ));

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: currentQuestion.id,
          responses: sessionData.responses.filter(r => 
            r.id.startsWith(currentQuestion.id)
          ),
          context: `${currentQuestion.title}: ${currentQuestion.description}`,
          analysisType,
          clientId: 'roundtable-session',
          // Enhanced session context for co-facilitator memory
          allResponses: sessionData.responses, // Full session history
          allInsights: sessionData.aiInsights, // Previous AI insights
          sessionProgress: sessionData.currentQuestionIndex / getTotalQuestions(),
          participantNames: participantNames
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Add AI insight to session data
      const newInsight: AIInsight = {
        content: data.insights,
        type: analysisType,
        timestamp: isClient ? new Date() : new Date(0),
        questionId: currentQuestion.id
      };

      setSessionData(prev => ({
        ...prev,
        aiInsights: [...prev.aiInsights, newInsight]
      }));

    } catch (error: any) {
      console.error('AI Analysis Error:', error);
      setError(error.message || 'AI analysis failed');
      
      // Add fallback insight
      const fallbackInsight: AIInsight = {
        content: `⚠️ AI analysis temporarily unavailable. Discussion continues!\n\nCurrent responses: ${sessionData.responses.length} participants have shared insights on "${currentQuestion.title}".`,
        type: analysisType,
        timestamp: isClient ? new Date() : new Date(0),
        questionId: currentQuestion.id
      };

      setSessionData(prev => ({
        ...prev,
        aiInsights: [...prev.aiInsights, fallbackInsight]
      }));
    } finally {
      setIsAIThinking(false);
    }
  }, [currentQuestion, sessionData.responses, isTestMode]);

  /**
   * Submit participant response
   * Triggers AI analysis after submission
   */
  const submitResponse = useCallback(async () => {
    if (!currentResponse.trim() || !currentQuestion) return;

    const responseId = `${currentQuestion.id}-${Date.now()}`; // This is fine - only used internally
    const newResponse: ParticipantResponse = {
      id: responseId,
      text: currentResponse.trim(),
      timestamp: new Date(),
      participantName: participantName.trim() || undefined
    };

    // Add response to session data
    setSessionData(prev => ({
      ...prev,
      responses: [...prev.responses, newResponse]
    }));

    // Clear input
    setCurrentResponse('');

    // Trigger AI analysis after a brief delay (let others respond)
    setTimeout(() => {
      callAIAnalysis('insights');
    }, 3000);
  }, [currentResponse, currentQuestion, participantName, callAIAnalysis]);

  /**
   * Start speech recognition for hands-free input
   */
  const startListening = useCallback(() => {
    if (!recognition || !speechSupported) {
      setError('Speech recognition not available in this browser');
      return;
    }
    
    try {
      recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      setError('Failed to start speech recognition');
    }
  }, [recognition, speechSupported]);
  
  /**
   * Stop speech recognition
   */
  const stopListening = useCallback(() => {
    if (!recognition) return;
    
    try {
      recognition.stop();
    } catch (error) {
      console.error('Failed to stop speech recognition:', error);
    }
  }, [recognition]);
  
  /**
   * Toggle speech recognition on/off
   */
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  /**
   * Move to next question
   */
  const nextQuestion = useCallback(() => {
    if (sessionData.currentQuestionIndex < getTotalQuestions() - 1) {
      setSessionData(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1
      }));
      setCurrentResponse('');
      setError(null);
      // Stop listening when moving to next question
      stopListening();
    }
  }, [sessionData.currentQuestionIndex, stopListening]);

  /**
   * Export session results
   */
  const exportResults = useCallback(() => {
    const exportData = {
      session: {
        title: sessionConfig.title,
        date: sessionData.sessionStartTime.toISOString(),
        questions: roundtableQuestions.length,
        responses: sessionData.responses.length,
        insights: sessionData.aiInsights.length
      },
      questions: roundtableQuestions.map(q => ({
        id: q.id,
        title: q.title,
        description: q.description,
        responses: sessionData.responses.filter(r => r.id.startsWith(q.id)),
        insights: sessionData.aiInsights.filter(i => i.questionId === q.id)
      }))
    };

    // Create and download JSON file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AI_Roundtable_Session_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [sessionData]);

  /**
   * Generate comprehensive session summary
   * Calls backend API to create narrative summaries for each section and overall conclusion
   */
  const generateSummary = useCallback(async () => {
    if (sessionData.responses.length === 0) {
      setError('No responses captured yet. Complete at least one question to generate a summary.');
      return;
    }

    setIsGeneratingSummary(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionData,
          questions: roundtableQuestions
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const summaryData = await response.json();
      setSessionSummary(summaryData);
      setShowSummary(true);

      console.log('✅ Session summary generated successfully');
    } catch (error) {
      console.error('❌ Failed to generate session summary:', error);
      setError(
        error instanceof Error 
          ? `Failed to generate summary: ${error.message}` 
          : 'Failed to generate summary. Please try again.'
      );
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [sessionData]);

  const closeSummary = useCallback(() => {
    setShowSummary(false);
  }, []);

  // Don't render if no questions configured
  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-roundtable-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-roundtable-text mb-4">
            Configuration Error
          </h1>
          <p className="text-roundtable-muted">
            No questions found in roundtable-config.ts
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-roundtable-background">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {uiText.welcomeMessage}
              </h1>
              <p className="text-blue-100 text-lg">
                {sessionConfig.description}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right text-sm text-blue-100">
                <div className="font-medium">
                  {uiText.questionCounter.replace('{current}', String(sessionData.currentQuestionIndex + 1)).replace('{total}', String(getTotalQuestions()))}
                </div>
                {isClient && (
                  <div className="opacity-75">
                    Session: {Math.round((Date.now() - sessionData.sessionStartTime.getTime()) / 60000)} min
                  </div>
                )}
              </div>
              {isTestMode && (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                  {uiText.testModeIndicator}
                </span>
              )}
              <button
                onClick={exportResults}
                className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
              >
                {uiText.exportButtonText}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Facilitator Instructions */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-roundtable-text mb-3 flex items-center gap-2">
                📋 {uiText.instructionsTitle}
              </h3>
              <ul className="space-y-2 text-sm text-roundtable-muted">
                {uiText.instructions.map((instruction: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-roundtable-secondary mt-1 text-xs">▶</span>
                    <span dangerouslySetInnerHTML={{ __html: instruction.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-roundtable-text mb-3">{uiText.facilitatorInstructions.title}:</h4>
              <ol className="space-y-2 text-sm text-roundtable-muted">
                {uiText.facilitatorInstructions.steps.map((step: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="bg-roundtable-secondary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5 flex-shrink-0">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Discussion Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Question Progress */}
            <div className="bg-roundtable-surface rounded-lg p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-roundtable-text">
                  Question {sessionData.currentQuestionIndex + 1} of {getTotalQuestions()}
                </h2>
                {timeRemaining > 0 && (
                  <span className="text-sm text-roundtable-muted">
                    {timeRemaining} minutes remaining
                  </span>
                )}
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div
                  className="bg-roundtable-primary h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${((sessionData.currentQuestionIndex + 1) / getTotalQuestions()) * 100}%`
                  }}
                ></div>
              </div>
            </div>

            {/* Current Question */}
            <div className="bg-roundtable-surface rounded-lg p-6 shadow-sm">
              <h3 className="text-xl font-bold text-roundtable-text mb-3">
                {currentQuestion.title}
              </h3>
              <p className="text-roundtable-muted mb-6 question-text">
                {currentQuestion.description}
              </p>

              {/* Facilitator Response Input */}
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                  💡 <strong>Facilitator tip:</strong> As participants share insights, capture the key points here. The AI will analyze patterns and suggest follow-up questions.
                </div>
                
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-roundtable-text">
                    Speaker name (helps track contributions)
                  </label>
                  <input
                    type="text"
                    placeholder="Speaker name (helps track ideas)"
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-roundtable-primary focus:border-transparent"
                  />
                </div>
                
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-roundtable-text">
                    Capture key insights and discussion points
                  </label>
                  <div className="relative">
                    <textarea
                      placeholder="Capture key insights, concerns, or strategic points from the discussion..."
                      value={currentResponse}
                      onChange={(e) => setCurrentResponse(e.target.value)}
                      className="w-full h-32 px-4 py-3 pr-16 border border-gray-300 rounded-lg focus:ring-2 focus:ring-roundtable-primary focus:border-transparent resize-none"
                    />
                    
                    {/* Speech-to-Text Controls */}
                    {speechSupported && (
                      <div className="absolute top-3 right-3 flex flex-col gap-2">
                        <button
                          onClick={toggleListening}
                          disabled={!recognition}
                          className={`p-2 rounded-full transition-all duration-200 ${
                            isListening 
                              ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse' 
                              : 'bg-blue-500 text-white hover:bg-blue-600'
                          } disabled:bg-gray-300 disabled:cursor-not-allowed`}
                          title={isListening ? 'Stop speech recognition' : 'Start speech recognition'}
                        >
                          {isListening ? '🔴' : '🎤'}
                        </button>
                        
                        {isListening && (
                          <div className="text-xs text-center text-blue-600 font-medium">
                            Listening...
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Speech Not Supported Message */}
                    {!speechSupported && isClient && (
                      <div className="absolute bottom-3 right-3 text-xs text-gray-500">
                        Speech input not available
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Speech Status and Hints */}
                {speechSupported && (
                  <div className="text-sm text-roundtable-muted bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-blue-600">🎤</span>
                      <strong>Speech Input Available:</strong>
                    </div>
                    <ul className="text-xs space-y-1 ml-6">
                      <li>• Click the microphone to start/stop voice input</li>
                      <li>• Speak clearly and pause briefly between thoughts</li>
                      <li>• You can edit the transcribed text before capturing</li>
                      <li>• Speech input works best in quiet environments</li>
                    </ul>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-roundtable-muted">
                    📝 {sessionData.responses.filter(r => r.id.startsWith(currentQuestion.id)).length} contributions captured for this question
                  </span>
                  <div className="flex gap-3">
                    <button
                      onClick={submitResponse}
                      disabled={!currentResponse.trim()}
                      className="px-6 py-2 bg-roundtable-primary text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      📝 Capture Response
                    </button>
                    {!isLastQuestion && (
                      <button
                        onClick={nextQuestion}
                        className="px-6 py-2 bg-roundtable-accent text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                      >
                        Next Question →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Responses */}
            <div className="bg-roundtable-surface rounded-lg p-6 shadow-sm">
              <h4 className="text-lg font-semibold text-roundtable-text mb-4">
                Recent Responses
              </h4>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {sessionData.responses
                  .filter(r => r.id.startsWith(currentQuestion.id))
                  .slice(-5)
                  .map((response) => (
                    <div key={response.id} className="border-l-4 border-roundtable-primary pl-4 py-2">
                      <div className="flex justify-between items-start mb-1">
                        {response.participantName && (
                          <span className="text-sm font-medium text-roundtable-text">
                            {response.participantName}
                          </span>
                        )}
                        <span className="text-xs text-roundtable-muted">
                          {response.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-roundtable-muted">
                        {response.text}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* AI Strategic Insights Sidebar */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6 shadow-sm">
              <h4 className="text-lg font-semibold text-indigo-800 mb-2 flex items-center gap-2">
                {uiText.aiSectionTitle}
              </h4>
              <p className="text-sm text-indigo-700 mb-4">
                {uiText.coFacilitatorIntro}
              </p>

              {/* Facilitator AI Action Buttons */}
              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => callAIAnalysis('insights')}
                    disabled={isAIThinking}
                    className="px-4 py-3 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors font-medium text-left flex items-center gap-2"
                  >
                    <span className="text-lg">{uiText.getInsightsButton.split(' ')[0]}</span>
                    <span>Analyze Patterns & Strategic Insights</span>
                  </button>
                  <button
                    onClick={() => callAIAnalysis('followup')}
                    disabled={isAIThinking}
                    className="px-4 py-3 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition-colors font-medium text-left flex items-center gap-2"
                  >
                    <span className="text-lg">{uiText.followUpButton.split(' ')[0]}</span>
                    <span>Suggest Probing Questions</span>
                  </button>
                  <button
                    onClick={() => callAIAnalysis('cross_reference')}
                    disabled={isAIThinking}
                    className="px-4 py-3 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 transition-colors font-medium text-left flex items-center gap-2"
                  >
                    <span className="text-lg">{uiText.connectIdeasButton.split(' ')[0]}</span>
                    <span>Link to Earlier Discussion</span>
                  </button>
                  <button
                    onClick={() => callAIAnalysis('synthesis')}
                    disabled={isAIThinking}
                    className="px-4 py-3 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 transition-colors font-medium text-left flex items-center gap-2"
                  >
                    <span className="text-lg">{uiText.synthesizeButton.split(' ')[0]}</span>
                    <span>Synthesize Key Themes</span>
                  </button>
                </div>
              </div>

              {/* AI Thinking Animation */}
              {isAIThinking && (
                <div className="ai-thinking mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="animate-pulse-slow w-3 h-3 bg-roundtable-secondary rounded-full"></div>
                    <span className="text-sm text-roundtable-muted">
                      {uiText.aiThinkingMessage}
                    </span>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">
                    ⚠️ {error}
                  </p>
                </div>
              )}

              {/* AI Insights */}
              <div id="aiInsights" className="space-y-4 max-h-96 overflow-y-auto">
                {sessionData.aiInsights
                  .filter(insight => insight.questionId === currentQuestion.id)
                  .map((insight, index) => (
                    <div key={index} className="insight-item p-4 bg-gray-50 rounded-lg border-l-4 border-roundtable-secondary">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-medium text-roundtable-secondary uppercase tracking-wide">
                          {insight.type}
                        </span>
                        <span className="text-xs text-roundtable-muted">
                          {isClient ? insight.timestamp.toLocaleTimeString() : ''}
                        </span>
                      </div>
                      <div className="text-sm text-roundtable-text whitespace-pre-line">
                        {insight.content}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Session Statistics */}
            <div className="bg-roundtable-surface rounded-lg p-6 shadow-sm">
              <h4 className="text-lg font-semibold text-roundtable-text mb-4">
                Session Progress
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-roundtable-muted">Total Responses:</span>
                  <span className="font-medium">{sessionData.responses.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-roundtable-muted">AI Insights:</span>
                  <span className="font-medium">{sessionData.aiInsights.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-roundtable-muted">Duration:</span>
                  <span className="font-medium">
                    {Math.round((Date.now() - sessionData.sessionStartTime.getTime()) / 60000)} min
                  </span>
                </div>
              </div>
            </div>
            
            {/* Summary Generation */}
            {sessionData.responses.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 shadow-sm">
                <h4 className="text-lg font-semibold text-blue-800 mb-3">
                  📊 Session Summary
                </h4>
                <p className="text-sm text-blue-700 mb-4">
                  Generate a comprehensive summary with narrative analysis, strategic insights, and actionable recommendations.
                </p>
                <button
                  onClick={generateSummary}
                  disabled={isGeneratingSummary}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {isGeneratingSummary ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Generating Summary...
                    </>
                  ) : (
                    <>
                      📋 Generate Comprehensive Summary
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Session Summary Modal */}
      {showSummary && sessionSummary && (
        <SessionSummary 
          summary={sessionSummary} 
          onClose={closeSummary} 
        />
      )}
    </div>
  );
};

export default RoundtableCanvas;
