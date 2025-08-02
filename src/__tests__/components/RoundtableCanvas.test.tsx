import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RoundtableCanvas from '../../components/RoundtableCanvas';

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock speech recognition
Object.defineProperty(window, 'SpeechRecognition', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })),
});

Object.defineProperty(window, 'webkitSpeechRecognition', {
  writable: true,
  value: window.SpeechRecognition,
});

describe('RoundtableCanvas Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ insights: 'Mock AI response' }),
    });
  });

  describe('Session Lifecycle', () => {
    it('should start in introduction stage by default', () => {
      render(<RoundtableCanvas />);
      
      // Should show introduction view
      expect(screen.getByText(/Strategic AI Transformation Facilitator/i)).toBeInTheDocument();
      expect(screen.getByText(/Facilitator Tool for Strategic AI Interventions/i)).toBeInTheDocument();
      expect(screen.getByTestId('start-discussion-button')).toBeInTheDocument();
      
      // Should not show discussion elements yet
      expect(screen.queryByTestId('question-progress')).not.toBeInTheDocument();
    });

    it('should transition from intro to discussion stage', async () => {
      render(<RoundtableCanvas />);
      
      // Click start discussion button
      const startButton = screen.getByTestId('start-discussion-button');
      fireEvent.click(startButton);
      
      // Should now show discussion view
      await waitFor(() => {
        expect(screen.getByTestId('question-progress')).toBeInTheDocument();
        expect(screen.getByText(/Question 1 of/)).toBeInTheDocument();
      });
      
      // Should no longer show intro elements
      expect(screen.queryByTestId('start-discussion-button')).not.toBeInTheDocument();
    });

    it('should show session progress correctly', async () => {
      render(<RoundtableCanvas />);
      
      // Start discussion
      fireEvent.click(screen.getByTestId('start-discussion-button'));
      
      await waitFor(() => {
        // Should show progress indicator
        const progressText = screen.getByText(/1\/\d+/);
        expect(progressText).toBeInTheDocument();
        
        // Should show progress bar
        expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
      });
    });
  });

  describe('UI Features', () => {
    beforeEach(async () => {
      render(<RoundtableCanvas />);
      // Start discussion to access main UI
      fireEvent.click(screen.getByTestId('start-discussion-button'));
      await waitFor(() => {
        expect(screen.getByTestId('question-progress')).toBeInTheDocument();
      });
    });

    it('should have collapsible facilitator instructions', async () => {
      // Instructions should be collapsed by default (element not rendered)
      expect(screen.queryByTestId('facilitator-instructions-content')).not.toBeInTheDocument();
      
      // Click to expand instructions
      const instructionsToggle = screen.getByTestId('facilitator-instructions-toggle');
      fireEvent.click(instructionsToggle);
      
      await waitFor(() => {
        expect(screen.getByTestId('facilitator-instructions-content')).toBeInTheDocument();
      });
      
      // Click to collapse again
      fireEvent.click(instructionsToggle);
      
      await waitFor(() => {
        expect(screen.queryByTestId('facilitator-instructions-content')).not.toBeInTheDocument();
      });
    });

    it('should have collapsible AI notes section', async () => {
      // AI notes should be collapsed by default (element not rendered)
      expect(screen.queryByTestId('ai-notes-content')).not.toBeInTheDocument();
      
      // Click to expand AI notes
      const notesToggle = screen.getByTestId('ai-notes-toggle');
      fireEvent.click(notesToggle);
      
      await waitFor(() => {
        expect(screen.getByTestId('ai-notes-content')).toBeInTheDocument();
      });
    });

    it('should display simplified AI action buttons with icons', async () => {
      // Should show all four simplified AI buttons
      expect(screen.getByTestId('ai-button-insights')).toBeInTheDocument();
      expect(screen.getByTestId('ai-button-followup')).toBeInTheDocument();
      expect(screen.getByTestId('ai-button-connect')).toBeInTheDocument();
      expect(screen.getByTestId('ai-button-synthesize')).toBeInTheDocument();
      
      // Buttons should have icons and short text
      const insightsButton = screen.getByTestId('ai-button-insights');
      expect(insightsButton).toHaveTextContent('💡');
      expect(insightsButton).toHaveTextContent('Insights');
    });

    it('should display focused question layout with prominent styling', async () => {
      // Should show focused question container
      expect(screen.getByTestId('focused-question-container')).toBeInTheDocument();
      
      // Should have gradient styling classes
      const questionContainer = screen.getByTestId('focused-question-container');
      expect(questionContainer).toHaveClass('bg-gradient-to-br', 'from-blue-50', 'to-indigo-50');
    });
  });

  describe('AI Analysis Functionality', () => {
    beforeEach(async () => {
      render(<RoundtableCanvas />);
      fireEvent.click(screen.getByTestId('start-discussion-button'));
      await waitFor(() => {
        expect(screen.getByTestId('question-progress')).toBeInTheDocument();
      });
    });

    it('should handle AI insights analysis', async () => {
      const insightsButton = screen.getByTestId('ai-button-insights');
      fireEvent.click(insightsButton);
      
      // Should show thinking animation
      await waitFor(() => {
        expect(screen.getByTestId('ai-thinking-indicator')).toBeInTheDocument();
      });
      
      // Should add mock AI insight in test mode (component prevents real API calls)
      await waitFor(() => {
        expect(screen.getByTestId('ai-insights-list')).toBeInTheDocument();
        expect(screen.getByText(/TEST MODE.*mock AI insight.*insights/i)).toBeInTheDocument();
      }, { timeout: 3000 }); // Allow time for mock delay
    });

    it('should disable AI buttons when thinking', async () => {
      const insightsButton = screen.getByTestId('ai-button-insights');
      fireEvent.click(insightsButton);
      
      await waitFor(() => {
        // All AI buttons should be disabled during thinking
        expect(screen.getByTestId('ai-button-insights')).toBeDisabled();
        expect(screen.getByTestId('ai-button-followup')).toBeDisabled();
        expect(screen.getByTestId('ai-button-connect')).toBeDisabled();
        expect(screen.getByTestId('ai-button-synthesize')).toBeDisabled();
      });
    });

    it('should handle AI analysis in test mode', async () => {
      const insightsButton = screen.getByTestId('ai-button-insights');
      fireEvent.click(insightsButton);
      
      // Should show thinking animation
      await waitFor(() => {
        expect(screen.getByTestId('ai-thinking-indicator')).toBeInTheDocument();
      });
      
      // In test mode, should add mock insight (no real API call or error)
      await waitFor(() => {
        expect(screen.getByTestId('ai-insights-list')).toBeInTheDocument();
        expect(screen.getByText(/TEST MODE.*mock AI insight/i)).toBeInTheDocument();
      }, { timeout: 3000 }); // Allow time for mock delay
    });
  });

  describe('Response Input', () => {
    beforeEach(async () => {
      render(<RoundtableCanvas />);
      fireEvent.click(screen.getByTestId('start-discussion-button'));
      await waitFor(() => {
        expect(screen.getByTestId('question-progress')).toBeInTheDocument();
      });
    });

    it('should allow participant name and response input', async () => {
      const nameInput = screen.getByTestId('participant-name-input');
      const responseInput = screen.getByTestId('response-textarea');
      
      // Enter participant data
      fireEvent.change(nameInput, { target: { value: 'Test Participant' } });
      fireEvent.change(responseInput, { target: { value: 'Test response content' } });
      
      expect(nameInput).toHaveValue('Test Participant');
      expect(responseInput).toHaveValue('Test response content');
    });

    it('should submit responses and trigger AI analysis', async () => {
      const nameInput = screen.getByTestId('participant-name-input');
      const responseInput = screen.getByTestId('response-textarea');
      const submitButton = screen.getByTestId('submit-response-button');
      
      // Enter and submit response
      fireEvent.change(nameInput, { target: { value: 'Test Participant' } });
      fireEvent.change(responseInput, { target: { value: 'Test response' } });
      fireEvent.click(submitButton);
      
      // Response should be cleared after submit
      await waitFor(() => {
        expect(responseInput).toHaveValue('');
      });
      
      // Should add response to session data
      expect(screen.getByText('Test response')).toBeInTheDocument();
    });

    it('should not submit empty responses', () => {
      const submitButton = screen.getByTestId('submit-response-button');
      
      // Submit without entering anything
      fireEvent.click(submitButton);
      
      // Should not make any API calls
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    beforeEach(async () => {
      render(<RoundtableCanvas />);
      fireEvent.click(screen.getByTestId('start-discussion-button'));
      await waitFor(() => {
        expect(screen.getByTestId('question-progress')).toBeInTheDocument();
      });
    });

    it('should navigate between questions', async () => {
      // Should show first question initially
      expect(screen.getByText(/Question 1 of/)).toBeInTheDocument();
      
      // Navigate to next question
      const nextButton = screen.getByTestId('next-question-button');
      if (nextButton) {
        fireEvent.click(nextButton);
        
        await waitFor(() => {
          expect(screen.getByText(/Question 2 of/)).toBeInTheDocument();
        });
      }
    });

    it('should clear response input when navigating', async () => {
      const responseInput = screen.getByTestId('response-textarea');
      
      // Enter some text
      fireEvent.change(responseInput, { target: { value: 'Test input' } });
      expect(responseInput).toHaveValue('Test input');
      
      // Navigate to next question
      const nextButton = screen.getByTestId('next-question-button');
      if (nextButton) {
        fireEvent.click(nextButton);
        
        await waitFor(() => {
          expect(responseInput).toHaveValue('');
        });
      }
    });
  });

  describe('Speech Recognition', () => {
    beforeEach(async () => {
      render(<RoundtableCanvas />);
      fireEvent.click(screen.getByTestId('start-discussion-button'));
      await waitFor(() => {
        expect(screen.getByTestId('question-progress')).toBeInTheDocument();
      });
    });

    it('should show speech recognition controls when supported', () => {
      expect(screen.getByTestId('speech-recognition-button')).toBeInTheDocument();
    });

    it('should handle speech recognition start/stop', () => {
      const startButton = screen.getByTestId('speech-recognition-button');
      fireEvent.click(startButton);
      
      // Mock speech recognition should have been called
      expect(window.SpeechRecognition).toHaveBeenCalled();
    });
  });
});
