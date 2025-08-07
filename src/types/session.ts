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
  state: SessionState;
  startTime: Date;
  participantCount: number;
  currentTopic?: string;
  duration?: number;
  liveTranscript: TranscriptEntry[];
  aiInsights: any[]; // Define proper type later
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
