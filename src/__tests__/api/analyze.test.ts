import { POST } from '@/app/api/analyze/route';
import { NextRequest } from 'next/server';
import { roundtableQuestions, aiConfig, sessionConfig } from '@/config/roundtable-config';

// Mock the OpenAI client
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => {
    return {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: 'This is a mock AI response.',
                },
              },
            ],
          }),
        },
      },
    };
  });
});

// Mock the configuration to control the rate limit for the test
jest.mock('@/config/roundtable-config', () => ({
  ...jest.requireActual('@/config/roundtable-config'),
  sessionConfig: {
    ...jest.requireActual('@/config/roundtable-config').sessionConfig,
    rateLimitPerHour: 5, // Set a low rate limit for testing
  },
}));

describe('POST /api/analyze', () => {
  beforeEach(() => {
    // Reset timers before each test
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return 429 Too Many Requests if called too frequently', async () => {
    const firstQuestion = roundtableQuestions[0];
    const requestBody = {
      question: firstQuestion.id, // Corrected from questionId
      responses: [],
      context: `${firstQuestion.title}: ${firstQuestion.description}`,
      analysisType: 'insights',
      clientId: 'roundtable-session',
      allResponses: [],
      allInsights: [],
      sessionProgress: 0,
      participantNames: ['Test Participant'],
      aiConfig: aiConfig,
      sessionConfig: sessionConfig,
    };

    const limit = 5;

    // Make `limit` successful requests
    for (let i = 0; i < limit; i++) {
      const req = new NextRequest('http://localhost/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const response = await POST(req as any);
      expect(response.status).toBe(200);
    }

    // The next request should be rate-limited
    const finalReq = new NextRequest('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    const rateLimitedResponse = await POST(finalReq as any);
    expect(rateLimitedResponse.status).toBe(429);

    const responseJson = await rateLimitedResponse.json();
    expect(responseJson.error).toBe('Too Many Requests');
  });
});
