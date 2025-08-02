/**
 * Enhanced Logging System for AI Roundtable Co-Facilitator
 * 
 * Provides structured logging with different levels and contexts
 * to help track errors, performance, and user interactions
 * for better troubleshooting and debugging.
 * 
 * Usage Examples:
 * - Logger.error('API call failed', { endpoint: '/api/analyze', error })
 * - Logger.info('Speech recognition started', { userId, sessionId })
 * - Logger.warn('API rate limit approaching', { remainingCalls: 5 })
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface LogContext {
  [key: string]: any;
  timestamp?: string;
  sessionId?: string;
  userId?: string;
  component?: string;
  action?: string;
  duration?: number;
  endpoint?: string;
  statusCode?: number;
  error?: Error | string;
}

class ApplicationLogger {
  private logLevel: LogLevel = LogLevel.INFO;
  private sessionId: string = '';

  constructor() {
    // Set log level based on environment
    if (typeof window !== 'undefined') {
      this.logLevel = process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.WARN;
    }
    
    // Generate session ID for tracking
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatLog(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const sessionInfo = this.sessionId ? ` [${this.sessionId}]` : '';
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${level}${sessionInfo}: ${message}${contextStr}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  /**
   * Log error messages - always displayed
   * Use for: API failures, critical errors, exceptions
   */
  error(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const logEntry = this.formatLog('ERROR', message, {
      ...context,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId
    });
    
    console.error(logEntry);
    
    // In production, you might want to send to external logging service
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      this.sendToLoggingService('error', message, context);
    }
  }

  /**
   * Log warning messages - for potential issues
   * Use for: API rate limits, fallback activations, validation warnings
   */
  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const logEntry = this.formatLog('WARN', message, {
      ...context,
      sessionId: this.sessionId
    });
    
    console.warn(logEntry);
  }

  /**
   * Log informational messages - general app flow
   * Use for: User actions, API successes, state changes
   */
  info(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const logEntry = this.formatLog('INFO', message, {
      ...context,
      sessionId: this.sessionId
    });
    
    console.log(logEntry);
  }

  /**
   * Log debug messages - detailed development info
   * Use for: Function calls, data transformations, detailed flow tracking
   */
  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const logEntry = this.formatLog('DEBUG', message, {
      ...context,
      sessionId: this.sessionId
    });
    
    console.debug(logEntry);
  }

  /**
   * Log performance metrics
   * Use for: API response times, component render times, user interaction latency
   */
  performance(action: string, duration: number, context?: LogContext): void {
    this.info(`Performance: ${action}`, {
      ...context,
      action,
      duration,
      metric: 'performance'
    });
  }

  /**
   * Log user interactions for analytics
   * Use for: Button clicks, form submissions, navigation
   */
  userAction(action: string, context?: LogContext): void {
    this.info(`User Action: ${action}`, {
      ...context,
      action,
      type: 'user_interaction'
    });
  }

  /**
   * Log API calls for monitoring
   * Use for: All external API calls, response times, status codes
   */
  apiCall(endpoint: string, method: string, statusCode?: number, duration?: number, context?: LogContext): void {
    const level = statusCode && statusCode >= 400 ? 'error' : 'info';
    const message = `API ${method} ${endpoint} - ${statusCode || 'pending'}`;
    
    if (level === 'error') {
      this.error(message, { ...context, endpoint, method, statusCode, duration });
    } else {
      this.info(message, { ...context, endpoint, method, statusCode, duration });
    }
  }

  /**
   * Log speech recognition events
   * Use for: Speech start/stop, recognition results, errors
   */
  speechEvent(event: string, context?: LogContext): void {
    this.info(`Speech: ${event}`, {
      ...context,
      component: 'speech_recognition',
      event
    });
  }

  /**
   * Log AI analysis events
   * Use for: AI API calls, response processing, insight generation
   */
  aiAnalysis(event: string, context?: LogContext): void {
    this.info(`AI Analysis: ${event}`, {
      ...context,
      component: 'ai_analysis',
      event
    });
  }

  /**
   * Send logs to external service (placeholder for production)
   */
  private sendToLoggingService(level: string, message: string, context?: LogContext): void {
    // Placeholder for external logging service integration
    // e.g., Sentry, LogRocket, DataDog, etc.
    // 
    // Example:
    // fetch('/api/logs', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ level, message, context, sessionId: this.sessionId })
    // });
  }

  /**
   * Get current session ID for correlation
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Set custom session ID (useful for user authentication)
   */
  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  /**
   * Set log level dynamically
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }
}

// Export singleton instance
export const Logger = new ApplicationLogger();

// Export utility functions for common patterns
export const logAPICall = (endpoint: string, method: string = 'GET') => {
  const startTime = Date.now();
  return {
    success: (statusCode: number, context?: LogContext) => {
      Logger.apiCall(endpoint, method, statusCode, Date.now() - startTime, context);
    },
    error: (error: Error | string, statusCode?: number, context?: LogContext) => {
      Logger.apiCall(endpoint, method, statusCode || 500, Date.now() - startTime, {
        ...context,
        error: error instanceof Error ? error.message : error
      });
    }
  };
};

export const logPerformance = (action: string) => {
  const startTime = Date.now();
  return {
    end: (context?: LogContext) => {
      Logger.performance(action, Date.now() - startTime, context);
    }
  };
};

// Common error patterns
export const logSpeechError = (error: string, context?: LogContext) => {
  Logger.error(`Speech Recognition Error: ${error}`, {
    ...context,
    component: 'speech_recognition',
    type: 'error'
  });
};

export const logAIError = (error: string, context?: LogContext) => {
  Logger.error(`AI Analysis Error: ${error}`, {
    ...context,
    component: 'ai_analysis',
    type: 'error'
  });
};

export default Logger;
