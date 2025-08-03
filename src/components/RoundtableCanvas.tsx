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
  summary?: {
    executiveSummary?: {
      keyFindings?: string[];
      riskFactors?: string[];
      strategicRecommendations?: string[];
      nextSteps?: string[];
    };
  };
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
  
  // Speech-to-text state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);

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
    
    // Check if already initialized to prevent multiple attempts
    if (recognition) return;
    
    // Check for HTTPS requirement (except localhost)
    const isSecureContext = window.location.protocol === 'https:' || 
                           window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1';
    
    if (!isSecureContext) {
      console.warn('Speech recognition requires HTTPS in production');
      setSpeechSupported(false);
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      setSpeechSupported(false);
      return;
    }
    
    try {
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false; // Changed to false to prevent network issues
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';
      // maxAlternatives property removed due to TypeScript compatibility
      
      recognitionInstance.onstart = () => {
        // Speech recognition started
        setIsListening(true);
        setError(null);
      };
      
      recognitionInstance.onend = () => {
        // Speech recognition ended
        setIsListening(false);
      };
      
      recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
        // Processing speech recognition result
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
        
        // Final transcript processed
        
        // Update response with final transcript
        if (finalTranscript) {
          setCurrentResponse(prev => prev + finalTranscript);
        }
      };
      
      recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
        // Speech recognition error occurred
        const errorMessage = event.error;
        
        // Handle different error types
        switch (errorMessage) {
          case 'no-speech':
            // No speech detected - normal behavior
            setIsListening(false);
            break;
          case 'network':
            console.warn('Speech recognition network issue - retrying may help');
            setError('Network issue with speech recognition. Please try again.');
            setIsListening(false);
            break;
          case 'not-allowed':
            console.warn('Speech recognition permission denied');
            setError('Microphone permission required for speech recognition');
            setSpeechSupported(false);
            setIsListening(false);
            break;
          case 'aborted':
            // Speech recognition aborted
            setIsListening(false);
            break;
          default:
            console.warn('Speech recognition error:', errorMessage);
            setError(`Speech recognition error: ${errorMessage}`);
            setIsListening(false);
        }
      };
      
      setRecognition(recognitionInstance);
      setSpeechSupported(true);
      // Speech recognition initialized successfully
      
    } catch (error) {
      console.error('Failed to initialize speech recognition:', error);
      setSpeechSupported(false);
    }
  }, [recognition]);

  // UI state
  const [currentResponse, setCurrentResponse] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  
  // Test mode initialization (cleaned up debug logging)
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Summary and export state
  const [sessionSummary, setSessionSummary] = useState<any>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  
  // Session lifecycle state management
  const [sessionStage, setSessionStage] = useState<'intro' | 'discussion' | 'summary'>('intro');
  
  // UI state for collapsible sections (default closed for decluttered experience)
  const [isInstructionsExpanded, setIsInstructionsExpanded] = useState(false);
  const [isFacilitatorNotesExpanded, setIsFacilitatorNotesExpanded] = useState(false);

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

    // AI analysis execution (debug logging cleaned up)
    
    // FIX: Honor test mode flag to prevent real API calls during testing
    if (isTestMode) {
      // Test mode active - using mock data
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
          // DEBUG: Add response count logging
          debugInfo: {
            totalResponses: sessionData.responses.length,
            filteredResponses: sessionData.responses.filter(r => r.id.startsWith(currentQuestion.id)).length,
            currentQuestionId: currentQuestion.id,
            allResponseIds: sessionData.responses.map(r => ({ id: r.id, questionMatch: r.id.startsWith(currentQuestion.id) }))
          },
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
   * Start the discussion phase from introduction
   * Transitions session from intro -> discussion stage
   */
  const startDiscussion = useCallback(() => {
    setSessionStage('discussion');
    // Reset to first question when starting discussion
    setSessionData(prev => ({
      ...prev,
      currentQuestionIndex: 0
    }));
    setCurrentResponse('');
    setError(null);
  }, []);

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
  const exportResults = useCallback(async () => {
    try {
      // Dynamic import to avoid SSR issues
      const jsPDF = (await import('jspdf')).default;
      
      // Use existing session summary if available, otherwise generate it inline
      let summaryData = sessionData.summary;
      if (!summaryData && sessionData.responses.length > 0) {
        summaryData = undefined;
      }

      // Create HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>AI Roundtable Session Report</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
            .session-info { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
            .question-section { margin-bottom: 40px; page-break-inside: avoid; }
            .question-title { color: #1e40af; font-size: 18px; font-weight: bold; margin-bottom: 10px; }
            .responses { background: #f1f5f9; padding: 15px; border-left: 4px solid #3b82f6; margin: 15px 0; }
            .insights { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 15px 0; }
            .summary-section { background: #e0f2fe; padding: 20px; border-radius: 8px; margin-top: 30px; }
            h1, h2, h3 { color: #1e40af; }
            ul { padding-left: 20px; }
            li { margin-bottom: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${sessionConfig.title}</h1>
            <p>AI Roundtable Session Report</p>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div class="session-info">
            <h2>Session Overview</h2>
            <p><strong>Session Duration:</strong> ${Math.round((Date.now() - sessionData.sessionStartTime.getTime()) / 60000)} minutes</p>
            <p><strong>Total Questions:</strong> ${roundtableQuestions.length}</p>
            <p><strong>Total Responses:</strong> ${sessionData.responses.length}</p>
            <p><strong>AI Insights Generated:</strong> ${sessionData.aiInsights.length}</p>
            <p><strong>Participants:</strong> ${Array.from(new Set(sessionData.responses.map(r => r.participantName || 'Anonymous'))).join(', ')}</p>
          </div>

          ${roundtableQuestions.map(q => {
            const questionResponses = sessionData.responses.filter(r => r.id.startsWith(q.id));
            const questionInsights = sessionData.aiInsights.filter(i => i.questionId === q.id);
            return `
              <div class="question-section">
                <h2 class="question-title">${q.title}</h2>
                <p><em>${q.description}</em></p>
                
                ${questionResponses.length > 0 ? `
                  <div class="responses">
                    <h3>Participant Responses (${questionResponses.length})</h3>
                    ${questionResponses.map(r => `
                      <div style="margin-bottom: 15px;">
                        <strong>${r.participantName || 'Anonymous'}:</strong>
                        <p>${r.text}</p>
                        <small style="color: #666;">Submitted: ${r.timestamp.toLocaleString()}</small>
                      </div>
                    `).join('')}
                  </div>
                ` : '<p><em>No responses collected for this question.</em></p>'}
                
                ${questionInsights.length > 0 ? `
                  <div class="insights">
                    <h3>AI Insights & Analysis</h3>
                    ${questionInsights.map(insight => `
                      <div style="margin-bottom: 15px;">
                        <strong>${insight.type.charAt(0).toUpperCase() + insight.type.slice(1)}:</strong>
                        <p>${insight.content}</p>
                        <small style="color: #666;">Generated: ${insight.timestamp.toLocaleString()}</small>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}

          ${summaryData ? `
            <div class="summary-section">
              <h2>📊 Executive Summary</h2>
              
              <h3>🎯 Key Findings</h3>
              <ul>
                ${summaryData.executiveSummary?.keyFindings?.map((finding: string) => `<li>${finding}</li>`).join('') || '<li>Summary not available</li>'}
              </ul>
              
              <h3>⚠️ Risk Factors</h3>
              <ul>
                ${summaryData.executiveSummary?.riskFactors?.map((risk: string) => `<li>${risk}</li>`).join('') || '<li>No risk factors identified</li>'}
              </ul>
              
              <h3>💡 Strategic Recommendations</h3>
              <ul>
                ${summaryData.executiveSummary?.strategicRecommendations?.map((rec: string) => `<li>${rec}</li>`).join('') || '<li>No recommendations available</li>'}
              </ul>
              
              <h3>🚀 Next Steps</h3>
              <ul>
                ${summaryData.executiveSummary?.nextSteps?.map((step: string) => `<li>${step}</li>`).join('') || '<li>No next steps defined</li>'}
              </ul>
            </div>
          ` : ''}
          
          <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ccc; text-align: center; color: #666; font-size: 12px;">
            <p>Generated by AI Roundtable Facilitator Agent | ${new Date().toISOString()}</p>
          </div>
        </body>
        </html>
      `;

      // Create PDF using jsPDF
      const pdf = new jsPDF();
      
      // Add title
      pdf.setFontSize(20);
      pdf.text(sessionConfig.title, 20, 30);
      
      pdf.setFontSize(14);
      pdf.text('AI Roundtable Session Report', 20, 45);
      pdf.text(`Generated on ${new Date().toLocaleDateString()}`, 20, 55);
      
      let yPosition = 70;
      
      // Add session overview
      pdf.setFontSize(16);
      pdf.text('Session Overview', 20, yPosition);
      yPosition += 10;
      
      pdf.setFontSize(12);
      const sessionDuration = Math.round((Date.now() - sessionData.sessionStartTime.getTime()) / 60000);
      pdf.text(`Duration: ${sessionDuration} minutes`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Total Responses: ${sessionData.responses.length}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`AI Insights: ${sessionData.aiInsights.length}`, 20, yPosition);
      yPosition += 15;
      
      // Add responses by question
      for (const question of roundtableQuestions) {
        const questionResponses = sessionData.responses.filter(r => r.id.startsWith(question.id));
        const questionInsights = sessionData.aiInsights.filter(i => i.questionId === question.id);
        
        if (questionResponses.length > 0 || questionInsights.length > 0) {
          // Check if we need a new page
          if (yPosition > 250) {
            pdf.addPage();
            yPosition = 20;
          }
          
          pdf.setFontSize(14);
          pdf.text(question.title, 20, yPosition);
          yPosition += 10;
          
          // Add responses
          if (questionResponses.length > 0) {
            pdf.setFontSize(12);
            pdf.text('Participant Responses:', 20, yPosition);
            yPosition += 8;
            
            for (const response of questionResponses) {
              pdf.setFontSize(10);
              const participantName = response.participantName || 'Anonymous';
              pdf.text(`${participantName}: ${response.text.substring(0, 80)}...`, 25, yPosition);
              yPosition += 6;
              
              if (yPosition > 270) {
                pdf.addPage();
                yPosition = 20;
              }
            }
            yPosition += 5;
          }
          
          // Add AI insights
          if (questionInsights.length > 0) {
            pdf.setFontSize(12);
            pdf.text('AI Insights:', 20, yPosition);
            yPosition += 8;
            
            for (const insight of questionInsights) {
              pdf.setFontSize(10);
              const insightText = insight.content.substring(0, 100) + '...';
              pdf.text(`${insight.type}: ${insightText}`, 25, yPosition);
              yPosition += 6;
              
              if (yPosition > 270) {
                pdf.addPage();
                yPosition = 20;
              }
            }
            yPosition += 10;
          }
        }
      }
      
      // Add executive summary if available
      if (summaryData?.executiveSummary) {
        if (yPosition > 200) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.setFontSize(16);
        pdf.text('Executive Summary', 20, yPosition);
        yPosition += 15;
        
        pdf.setFontSize(12);
        if (summaryData.executiveSummary.keyFindings && summaryData.executiveSummary.keyFindings.length > 0) {
          pdf.text('Key Findings:', 20, yPosition);
          yPosition += 8;
          
          summaryData.executiveSummary.keyFindings.forEach((finding: string) => {
            pdf.setFontSize(10);
            pdf.text(`• ${finding.substring(0, 80)}...`, 25, yPosition);
            yPosition += 6;
          });
          yPosition += 5;
        }
        
        if (summaryData.executiveSummary.strategicRecommendations && summaryData.executiveSummary.strategicRecommendations.length > 0) {
          if (yPosition > 250) {
            pdf.addPage();
            yPosition = 20;
          }
          
          pdf.setFontSize(12);
          pdf.text('Strategic Recommendations:', 20, yPosition);
          yPosition += 8;
          
          summaryData.executiveSummary.strategicRecommendations.forEach((rec: string) => {
            pdf.setFontSize(10);
            pdf.text(`• ${rec.substring(0, 80)}...`, 25, yPosition);
            yPosition += 6;
          });
        }
      }
      
      // Save the PDF
      const fileName = `AI_Roundtable_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      // Clear any previous errors
      setError(null);
    } catch (error: unknown) {
      console.error('❌ Error generating session report:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ Full error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: errorMessage,
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      setError(`Failed to generate session report: ${errorMessage}. Please try again.`);
    }
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

      // Session summary generated successfully
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

      {/* Introduction View - Session Lifecycle Stage: intro */}
      {sessionStage === 'intro' && (
        <div className="animate-fade-in">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
            <div className="max-w-4xl mx-auto px-4 py-12 text-center">
              <div className="mb-8">
                <h2 className="text-4xl font-bold text-roundtable-text mb-4">
                  {sessionConfig.introSection.title}
                </h2>
                <p className="text-xl text-roundtable-muted max-w-3xl mx-auto">
                  {sessionConfig.introSection.description}
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8 mb-12">
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="text-xl font-semibold text-roundtable-text mb-4 flex items-center gap-2">
                    🎯 Session Objectives
                  </h3>
                  <ul className="space-y-3 text-left">
                    {sessionConfig.introSection.objectives.map((objective: string, index: number) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="bg-roundtable-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mt-0.5 flex-shrink-0">
                          {index + 1}
                        </span>
                        <span className="text-roundtable-text">{objective}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="text-xl font-semibold text-roundtable-text mb-4 flex items-center gap-2">
                    📋 Facilitator Notes
                  </h3>
                  <ul className="space-y-3 text-left">
                    {sessionConfig.introSection.facilitatorNotes.map((note: string, index: number) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="text-roundtable-secondary mt-1 text-sm">▶</span>
                        <span className="text-roundtable-muted text-sm">{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <button
                onClick={startDiscussion}
                className="btn-primary text-lg px-8 py-4 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                data-testid="start-discussion-button"
              >
                🚀 Start Discussion
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Discussion View - Session Lifecycle Stage: discussion */}
      {sessionStage === 'discussion' && (
        <div className="animate-fade-in">
          {/* Collapsible Facilitator Instructions */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
            <div className="max-w-6xl mx-auto px-4 py-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Session Instructions Accordion */}
                <div className="bg-white rounded-lg shadow-sm border border-blue-100">
                  <button
                    onClick={() => setIsInstructionsExpanded(!isInstructionsExpanded)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-blue-50 transition-colors rounded-lg"
                    data-testid="facilitator-instructions-toggle"
                  >
                    <span className="flex items-center gap-2 font-medium text-roundtable-text">
                      📋 {uiText.instructionsTitle}
                    </span>
                    <span className={`transition-transform duration-200 ${isInstructionsExpanded ? 'rotate-180' : ''}`}>
                      ⬇️
                    </span>
                  </button>
                  {isInstructionsExpanded && (
                    <div className="px-4 pb-4 animate-fade-in" data-testid="facilitator-instructions-content">
                      <ul className="space-y-2 text-sm text-roundtable-muted">
                        {uiText.instructions.map((instruction: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-roundtable-secondary mt-1 text-xs">▶</span>
                            <span dangerouslySetInnerHTML={{ __html: instruction.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                {/* Facilitator Notes Accordion */}
                <div className="bg-white rounded-lg shadow-sm border border-blue-100">
                  <button
                    onClick={() => setIsFacilitatorNotesExpanded(!isFacilitatorNotesExpanded)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-blue-50 transition-colors rounded-lg"
                    data-testid="ai-notes-toggle"
                  >
                    <span className="flex items-center gap-2 font-medium text-roundtable-text">
                      👥 {uiText.facilitatorInstructions.title}
                    </span>
                    <span className={`transition-transform duration-200 ${isFacilitatorNotesExpanded ? 'rotate-180' : ''}`}>
                      ⬇️
                    </span>
                  </button>
                  {isFacilitatorNotesExpanded && (
                    <div className="px-4 pb-4 animate-fade-in" data-testid="ai-notes-content">
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
                  )}
                </div>
              </div>
            </div>
          </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Discussion Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* FOCUSED: Current Question & Progress */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8 shadow-lg border-2 border-blue-200" data-testid="focused-question-container">
              {/* Compact Progress Header */}
              <div className="flex justify-between items-center mb-6" data-testid="question-progress">
                <div className="flex items-center gap-3">
                  <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                    {sessionData.currentQuestionIndex + 1}/{getTotalQuestions()}
                  </span>
                  <div className="w-32 bg-gray-200 rounded-full h-2" data-testid="progress-bar">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${((sessionData.currentQuestionIndex + 1) / getTotalQuestions()) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
                {timeRemaining > 0 && (
                  <span className="text-sm text-blue-700 font-medium">
                    ⏱️ {timeRemaining}m left
                  </span>
                )}
              </div>
              
              {/* Prominent Question Display */}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-blue-100 mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
                  {currentQuestion.title}
                </h3>
                <p className="text-gray-700 text-lg leading-relaxed question-text">
                  {currentQuestion.description}
                </p>
              </div>

              {/* Enhanced Conversation Capture - Automatic Flow */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    💬 Live Discussion Transcript
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Capture the natural flow of conversation. Add each comment as it happens - no need to wait or organize.
                  </p>
                </div>
                
                {/* Quick Add Comment Section */}
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={participantName}
                        onChange={(e) => setParticipantName(e.target.value)}
                        placeholder="Who's speaking? (e.g., Sarah, Mike, CEO)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  </div>
                  
                  <textarea
                    value={currentResponse}
                    onChange={(e) => setCurrentResponse(e.target.value)}
                    placeholder="What did they just say? Capture their comment, concern, or insight as they speak..."
                    className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-none text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        submitResponse();
                      }
                    }}
                  />

                  {/* Quick Capture Controls */}
                  <div className="flex items-center gap-3 mt-3">
                    {speechSupported && (
                      <button
                        onClick={isListening ? stopListening : startListening}
                        disabled={speechError !== null}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          isListening 
                            ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={isListening ? 'Stop listening' : 'Start voice input'}
                      >
                        🎤 {isListening ? 'Stop' : 'Voice'}
                      </button>
                    )}
                    
                    <button
                      onClick={submitResponse}
                      disabled={!currentResponse.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      ➕ Add to Transcript
                      <span className="text-xs opacity-75">(⌘+Enter)</span>
                    </button>
                  </div>
                  
                  {speechError && (
                    <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                      Voice input error: {speechError}
                    </div>
                  )}
                </div>
              </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-roundtable-muted">
                    📝 {sessionData.responses.filter(r => r.id.startsWith(currentQuestion.id)).length} contributions captured for this question
                  </span>
                  <div className="flex gap-3">
                    <button
                      onClick={submitResponse}
                      disabled={!currentResponse.trim()}
                      className="px-6 py-2 bg-roundtable-primary text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                      data-testid="submit-response-button"
                    >
                      📝 Capture Response
                    </button>
                    {!isLastQuestion && (
                      <button
                        onClick={nextQuestion}
                        className="px-6 py-2 bg-roundtable-accent text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                        data-testid="next-question-button"
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

              {/* Simplified AI Action Buttons */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  onClick={() => callAIAnalysis('insights')}
                  disabled={isAIThinking}
                  className="px-3 py-2 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 transition-colors font-medium flex items-center justify-center gap-1"
                  title="Analyze patterns and strategic insights"
                  data-testid="ai-button-insights"
                >
                  💡 <span>Insights</span>
                </button>
                <button
                  onClick={() => callAIAnalysis('followup')}
                  disabled={isAIThinking}
                  className="px-3 py-2 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 transition-colors font-medium flex items-center justify-center gap-1"
                  title="Suggest probing questions"
                  data-testid="ai-button-followup"
                >
                  ❓ <span>Follow-up</span>
                </button>
                <button
                  onClick={() => callAIAnalysis('cross_reference')}
                  disabled={isAIThinking}
                  className="px-3 py-2 text-xs bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 transition-colors font-medium flex items-center justify-center gap-1"
                  title="Link to earlier discussion points"
                  data-testid="ai-button-connect"
                >
                  🔗 <span>Connect</span>
                </button>
                <button
                  onClick={() => callAIAnalysis('synthesis')}
                  disabled={isAIThinking}
                  className="px-3 py-2 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-300 transition-colors font-medium flex items-center justify-center gap-1"
                  title="Synthesize key themes"
                  data-testid="ai-button-synthesize"
                >
                  🧠 <span>Synthesize</span>
                </button>
              </div>

              {/* AI Thinking Animation */}
              {isAIThinking && (
                <div className="ai-thinking mb-4 p-4 bg-gray-50 rounded-lg" data-testid="ai-thinking-indicator">
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
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg" data-testid="error-message">
                  <p className="text-sm text-red-600">
                    ⚠️ {error}
                  </p>
                </div>
              )}

              {/* AI Insights */}
              <div id="aiInsights" className="space-y-4 max-h-96 overflow-y-auto" data-testid="ai-insights-list">
                {sessionData.aiInsights
                  .filter(insight => insight.questionId === currentQuestion.id)
                  .map((insight, index) => (
                    <div key={index} className="insight-item p-4 bg-gray-50 rounded-lg border-l-4 border-roundtable-secondary" data-testid="ai-insight-item">
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
    </div>
  );
};

export default RoundtableCanvas;
