/**
 * Storage utility for AI Roundtable session persistence
 * Handles localStorage auto-save and recovery with error boundaries
 */

export interface SessionSnapshot {
  timestamp: number;
  sessionState: string;
  currentTopic?: string;
  startTime: number; // Date.getTime()
  liveTranscript: Array<{
    id: string;
    speaker: string;
    text: string;
    timestamp: number; // Date.getTime()
    isAutoDetected?: boolean;
    confidence?: number;
  }>;
  aiInsights: Array<{
    id: string;
    type: string;
    content: string;
    timestamp: number; // Date.getTime()
    confidence?: number;
    suggestions?: string[];
    metadata?: any;
    isLegacy?: boolean;
    isError?: boolean;
  }>;
  // Agenda navigation state
  currentQuestionIndex: number;
  questionStartTime?: number; // Date.getTime()
  agendaProgress: {
    [questionId: string]: {
      completed: boolean;
      timeSpent: number;
      insights: number;
    };
  };
}

const STORAGE_KEY = 'ai-roundtable-session-v2';

/**
 * Save session snapshot to localStorage with error handling
 */
export function saveSession(snapshot: SessionSnapshot): void {
  try {
    const serialized = JSON.stringify(snapshot);
    localStorage.setItem(STORAGE_KEY, serialized);
    console.log('💾 Session auto-saved:', snapshot.timestamp);
  } catch (error: any) {
    console.warn('⚠️ Failed to save session:', error?.message);
    
    // Handle quota exceeded error by clearing old data
    if (error?.name === 'QuotaExceededError') {
      console.log('🧹 Clearing localStorage due to quota exceeded');
      localStorage.clear();
      
      // Try to save again after clearing
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
        console.log('✅ Session saved after clearing localStorage');
      } catch (retryError) {
        console.error('❌ Failed to save even after clearing:', retryError);
      }
    }
  }
}

/**
 * Load session snapshot from localStorage with error handling
 */
export function loadSession(): SessionSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      console.log('📂 No saved session found');
      return null;
    }
    
    const parsed = JSON.parse(raw) as SessionSnapshot;
    console.log('📂 Session loaded:', new Date(parsed.timestamp).toLocaleString());
    
    return parsed;
  } catch (error) {
    console.warn('⚠️ Failed to load session, corrupted data:', error);
    return null;
  }
}

/**
 * Clear saved session from localStorage
 */
export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑️ Session cleared from localStorage');
  } catch (error) {
    console.warn('⚠️ Failed to clear session:', error);
  }
}

/**
 * Check if localStorage is available and functional
 */
export function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}
