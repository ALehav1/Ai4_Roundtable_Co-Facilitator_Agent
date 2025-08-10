// Move these interfaces from RoundtableCanvasV2.tsx
export type SessionState = 'idle' | 'intro' | 'discussion' | 'summary' | 'completed';

export interface TranscriptEntry {
  id: string;
  timestamp: Date;
  speaker: string;
  text: string;
  confidence?: number;
  isAutoDetected: boolean;
}

export interface SessionContext {
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
