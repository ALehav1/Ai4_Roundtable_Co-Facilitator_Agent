/**
 * Centralized Type Definitions for AI Roundtable Application
 * 
 * This file contains all shared type definitions used across the application.
 * Centralizing types ensures consistency and makes maintenance easier.
 * 
 * @module types
 */

/**
 * Session state represents the current phase of the roundtable discussion
 */
export type SessionState = 'idle' | 'intro' | 'discussion' | 'summary' | 'completed';

/**
 * Represents a single transcript entry from a participant
 * Each entry captures what was said, who said it, and metadata about confidence
 */
export interface TranscriptEntry {
  /** Unique identifier for the transcript entry */
  id: string;
  
  /** When this was said */
  timestamp: Date;
  
  /** Who said it (participant name or identifier) */
  speaker: string;
  
  /** The actual text content of what was said */
  text: string;
  
  /** Confidence score from speech recognition (0-1) */
  confidence?: number;
  
  /** Whether the speaker was automatically detected vs manually specified */
  isAutoDetected: boolean;
}

/**
 * AI-generated insights and analysis during the discussion
 * Different types represent different analytical approaches
 */
export interface AIInsight {
  /** Unique identifier for the insight */
  id: string;
  
  /** Type of analysis performed */
  type: 'insights' | 'synthesis' | 'followup' | 'cross_reference' | 'error' | 'waiting';
  
  /** The actual insight content */
  content: string;
  
  /** When this insight was generated */
  timestamp: Date;
  
  /** Confidence score for the insight (0-1) */
  confidence?: number;
  
  /** Suggested follow-up questions or actions */
  suggestions?: string[];
  
  /** Additional metadata about the insight generation */
  metadata?: {
    /** Number of tokens used in generation */
    tokensUsed?: number;
    /** Length of transcript analyzed */
    transcriptLength?: number;
    /** Time taken to process */
    processingTime?: number;
  };
  
  /** Whether this is from an older format (for migration) */
  isLegacy?: boolean;
  
  /** Whether this represents an error state */
  isError?: boolean;
}

/**
 * Complete session context containing all state and data
 * This is the main data structure for the active session
 */
export interface SessionContext {
  /** Current phase of the session */
  state: SessionState;
  
  /** When the session started */
  startTime: Date;
  
  /** Number of active participants */
  participantCount: number;
  
  /** Current discussion topic or question */
  currentTopic?: string;
  
  /** Total session duration in milliseconds */
  duration?: number;
  
  /** All transcript entries from the session */
  liveTranscript: TranscriptEntry[];
  
  /** All AI-generated insights from the session */
  aiInsights: AIInsight[];
  
  /** Index of current question in the agenda */
  currentQuestionIndex: number;
  
  /** When the current question started */
  questionStartTime?: Date;
  
  /** Progress tracking for each agenda item */
  agendaProgress: {
    [questionId: string]: {
      /** Whether this question has been completed */
      completed: boolean;
      /** Time spent on this question in milliseconds */
      timeSpent: number;
      /** Number of insights generated for this question */
      insights: number;
    };
  };
}

/**
 * Serializable snapshot of session state for storage
 * Uses timestamps instead of Date objects for JSON compatibility
 */
export interface SessionSnapshot {
  /** When this snapshot was taken */
  timestamp: number;
  
  /** Session state at time of snapshot */
  sessionState: string;
  
  /** Current topic at time of snapshot */
  currentTopic?: string;
  
  /** Facilitator name */
  facilitator?: string;
  
  /** Number of participants */
  participantCount: number;
  
  /** Session start time as timestamp */
  startTime: number;
  
  /** Serialized transcript entries */
  liveTranscript: Array<{
    id: string;
    speaker: string;
    text: string;
    timestamp: number;
    isAutoDetected?: boolean;
    confidence?: number;
  }>;
  
  /** Serialized AI insights */
  aiInsights: Array<{
    id: string;
    type: string;
    content: string;
    timestamp: number;
    confidence?: number;
    suggestions?: string[];
    metadata?: any;
    isLegacy?: boolean;
    isError?: boolean;
  }>;
  
  /** Current question index */
  currentQuestionIndex: number;
  
  /** Question start time as timestamp */
  questionStartTime?: number;
  
  /** Progress tracking snapshot */
  agendaProgress: {
    [questionId: string]: {
      completed: boolean;
      timeSpent: number;
      insights: number;
    };
  };
}

/**
 * Type guards for runtime type checking
 */
export const isTranscriptEntry = (obj: any): obj is TranscriptEntry => {
  return obj &&
    typeof obj.id === 'string' &&
    obj.timestamp instanceof Date &&
    typeof obj.speaker === 'string' &&
    typeof obj.text === 'string' &&
    typeof obj.isAutoDetected === 'boolean';
};

export const isAIInsight = (obj: any): obj is AIInsight => {
  return obj &&
    typeof obj.id === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.content === 'string' &&
    obj.timestamp instanceof Date;
};
