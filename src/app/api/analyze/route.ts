/**
 * AI Analysis API Route
 * 
 * This endpoint handles AI-powered analysis of roundtable discussions.
 * It uses the configuration system to maintain consistent AI behavior
 * and provides rate limiting and error handling for production use.
 * 
 * Dependencies: OpenAI API, configuration system
 * Security: API key in environment variables, rate limiting
 */

import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { aiConfig, sessionConfig, getAIPromptForContext } from '@/config/roundtable-config';

// OpenAI client will be initialized at runtime to avoid build-time env var issues
// IMPORTANT: Never expose API keys in client-side code!

// Simple rate limiting storage (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiting function
 * Prevents excessive API usage and manages costs
 */
function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const hourInMs = 60 * 60 * 1000;
  
  const clientData = rateLimitStore.get(clientId);
  
  if (!clientData || now > clientData.resetTime) {
    // Reset or initialize rate limit
    rateLimitStore.set(clientId, {
      count: 1,
      resetTime: now + hourInMs
    });
    return true;
  }
  
  if (clientData.count >= sessionConfig.rateLimitPerHour) {
    return false; // Rate limit exceeded
  }
  
  // Increment count and persist back to store
  clientData.count++;
  rateLimitStore.set(clientId, clientData);
  return true;
}

/**
 * POST /api/analyze
 * 
 * Analyzes discussion responses using AI
 * 
 * Request body:
 * - question: Current question ID
 * - responses: Array of participant responses
 * - context: Current question context
 * - analysisType: 'insights' | 'synthesis' | 'followup'
 * - clientId: Simple client identifier for rate limiting
 */
export async function POST(request: NextRequest) {
  // Prevent Next.js from prebuilding this route at build time
  noStore();
  
  try {
    // Parse request body with enhanced session context
    const { 
      question, 
      responses, 
      context, 
      analysisType = 'insights',
      clientId = 'default',
      allResponses = [], // Full session history
      allInsights = [],  // Previous AI insights
      sessionProgress = 0, // How far through the session (0-1)
      participantNames = [] // Active participant names
    } = await request.json();

    // Define valid analysis types
    const validAnalysisTypes = ['insights', 'followup', 'cross_reference', 'synthesis'] as const;
    
    // Validate required fields
    if (!question || !responses || !context) {
      return NextResponse.json(
        { error: 'Missing required fields: question, responses, context' }, 
        { status: 400 }
      );
    }

    // Validate analysisType
    if (!validAnalysisTypes.includes(analysisType as any)) {
      return NextResponse.json(
        { 
          error: `Invalid analysisType: ${analysisType}. Must be one of: ${validAnalysisTypes.join(', ')}` 
        }, 
        { status: 400 }
      );
    }

    // Check rate limiting
    if (!checkRateLimit(clientId)) {
      console.error(`Rate limit exceeded for client: ${clientId}`);
      return NextResponse.json(
        { 
          error: 'Too Many Requests',
          retryAfter: 3600 // 1 hour in seconds
        }, 
        { status: 429 }
      );
    }

    // Log analysis request for debugging
    console.log(`AI Analysis Request:`, {
      question,
      analysisType,
      responseCount: responses.length,
      timestamp: new Date().toISOString()
    });

    // Build enhanced session context for co-facilitator
    const sessionContext = {
      currentQuestion: { id: question, context },
      currentResponses: responses,
      fullSessionHistory: allResponses,
      previousInsights: allInsights,
      sessionProgress: Math.round(sessionProgress * 100),
      activeParticipants: participantNames.length,
      totalResponses: allResponses.length
    };

    // Determine the appropriate prompt with full session memory
    let userPrompt: string;
    
    switch (analysisType) {
      case 'synthesis':
        userPrompt = buildSynthesisPrompt(sessionContext);
        break;
      case 'followup':
        userPrompt = buildFollowUpPrompt(sessionContext);
        break;
      case 'cross_reference':
        userPrompt = buildCrossReferencePrompt(sessionContext);
        break;
      default: // 'insights'
        userPrompt = buildInsightsPrompt(sessionContext);
    }

    // Initialize OpenAI client at runtime to avoid build-time env var issues
    // Check multiple environment variable fallbacks for Vercel deployment
    const apiKey = process.env.OPENAI_API_KEY || 
                   process.env.NEXT_PUBLIC_OPENAI_API_KEY || 
                   process.env.OPENAI_KEY || 
                   process.env.NEXT_OPENAI_API_KEY || 
                   process.env.AI_API_KEY;
    
    console.log('🔑 DEBUG: API Key check for /api/analyze:', {
      hasOPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      hasNEXT_PUBLIC_OPENAI_API_KEY: !!process.env.NEXT_PUBLIC_OPENAI_API_KEY,
      hasAI_API_KEY: !!process.env.AI_API_KEY,
      finalApiKeyFound: !!apiKey
    });
    
    if (!apiKey) {
      console.error('❌ No OpenAI API key found in any environment variable');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }
    
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Call OpenAI API with configured parameters
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // SOTA model with reasoning capabilities
      messages: [
        {
          role: "system",
          content: aiConfig.systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: aiConfig.temperature,
      max_tokens: aiConfig.maxTokens,
      // Add response format for consistency
      response_format: { type: "text" }
    });

    // Extract and validate response
    const aiResponse = completion.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('No response from AI model');
    }

    // Log successful analysis for monitoring
    console.log(`AI Analysis Success:`, {
      question,
      analysisType,
      responseLength: aiResponse.length,
      tokensUsed: completion.usage?.total_tokens || 0
    });

    // Return structured response
    return NextResponse.json({ 
      insights: aiResponse,
      metadata: {
        analysisType,
        tokensUsed: completion.usage?.total_tokens || 0,
        timestamp: new Date().toISOString(),
        questionId: question
      }
    });

  } catch (error: any) {
    // Comprehensive error logging
    console.error('AI Analysis Error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      type: error.constructor.name
    });

    // Handle different types of errors
    if (error.code === 'insufficient_quota') {
      return NextResponse.json(
        { error: 'AI service quota exceeded. Please try again later.' }, 
        { status: 503 }
      );
    }
    
    if (error.code === 'invalid_api_key') {
      console.error('CRITICAL: Invalid OpenAI API key configured');
      return NextResponse.json(
        { error: 'AI service configuration error. Please contact support.' }, 
        { status: 503 }
      );
    }

    // Generic error response (don't expose internal details)
    return NextResponse.json(
      { 
        error: 'AI analysis temporarily unavailable. The session can continue without AI insights.'
      }, 
      { status: 500 }
    );
  }
}

/**
 * GET /api/analyze
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'AI Co-Facilitator API',
    timestamp: new Date().toISOString(),
    rateLimitPerHour: sessionConfig.rateLimitPerHour
  });
}

/**
 * Enhanced prompt builders for co-facilitator behavior with session memory
 */
function buildInsightsPrompt(sessionContext: any): string {
  const { currentQuestion, currentResponses, fullSessionHistory, previousInsights, sessionProgress, activeParticipants, totalResponses } = sessionContext;
  
  // Extract recent themes from session history
  const recentThemes = extractRecentThemes(fullSessionHistory);
  const participantNames = getParticipantNames(currentResponses);
  
  return `CRITICAL: You are a real-time co-facilitator analyzing ACTUAL roundtable responses. You must ONLY reference participants and content that actually exist in the data below.

CURRENT QUESTION: "${currentQuestion.context}"

ACTUAL RESPONSES RECEIVED (${currentResponses.length} total):
${currentResponses.map((r: any, i: number) => 
  `${i + 1}. ${r.participantName || 'Participant'}: "${r.text}"`
).join('\n')}

STRICT FACILITATION RULES:
• ONLY reference participants who actually responded above
• Do NOT invent participants, names, or quotes that don't exist
• If responses are minimal, acknowledge the limited input
• Base insights ONLY on the actual content provided
• Do NOT fabricate detailed conversations or engagement that didn't happen

As co-facilitator, provide insights based ONLY on the actual responses above:
• Identify patterns that actually appear in these specific responses
• Connect themes that genuinely emerge from the real content
• Suggest follow-up questions appropriate to the actual discussion level

Respond conversationally but factually - reference only real participants and real content.`;
}

function buildFollowUpPrompt(sessionContext: any): string {
  const { currentQuestion, currentResponses, fullSessionHistory, sessionProgress } = sessionContext;
  
  return `I've been listening carefully to our discussion on "${currentQuestion.context}" and I'm hearing some fascinating insights.

Based on the ${currentResponses.length} responses just shared, I want to pose some strategic follow-up questions that could help us go deeper:

What I'm noticing:
• [Reference specific points from the responses]
• [Identify a pattern or tension worth exploring]
• [Connect to earlier session themes]

Here are 2-3 probing questions I'd like to ask the group:
1. [Strategic question that builds on specific responses]
2. [Question that reveals assumptions or explores tensions]
3. [Question that connects to broader strategic implications]

I'm particularly curious about [specific insight or gap] - who wants to dive deeper into that?`;
}

function buildCrossReferencePrompt(sessionContext: any): string {
  const { currentQuestion, currentResponses, fullSessionHistory, previousInsights } = sessionContext;
  
  return `As your co-facilitator, I want to connect what we're discussing now to insights from earlier in our session.

CURRENT DISCUSSION: "${currentQuestion.context}"
CURRENT RESPONSES: ${currentResponses.length} new insights

CONNECTIONS I'M SEEING:
• Earlier, [participant/theme] mentioned [previous insight] - I'm seeing how that connects to [current insight]
• This builds on our discussion about [previous theme] and adds the dimension of [current theme]
• There's an interesting evolution in our thinking from [earlier concept] to [current concept]

Key connections I want to highlight:
1. [Specific connection between past and present insights]
2. [Evolution or contradiction in thinking]
3. [Strategic implication of these connections]

This makes me wonder: [Strategic question that bridges past and present discussion]`;
}

function buildSynthesisPrompt(sessionContext: any): string {
  const { currentQuestion, fullSessionHistory, previousInsights, sessionProgress, totalResponses, activeParticipants } = sessionContext;
  
  return `As your co-facilitator, I want to synthesize what we've discovered together in this ${sessionProgress}% complete session.

OUR JOURNEY SO FAR:
• ${totalResponses} total contributions from ${activeParticipants} active participants
• Rich discussion across multiple strategic questions
• ${previousInsights.length} key insights identified together

SYNTHESIS OF KEY THEMES:
[Weave together the strongest themes from fullSessionHistory]

STRATEGIC INSIGHTS EMERGING:
1. [Primary strategic insight connecting multiple discussion points]
2. [Secondary insight about tensions or opportunities]
3. [Actionable insight for moving forward]

WHAT I'M SEEING:
• Areas of strongest consensus: [themes with broad agreement]
• Productive tensions: [areas of disagreement worth exploring]
• Strategic implications: [business/organizational impact]

As we continue, I'm curious about: [Forward-looking strategic question]`;
}

/**
 * Helper functions for session memory and context building
 */
function extractRecentThemes(sessionHistory: any[]): string[] {
  // Simple theme extraction - could be enhanced with NLP
  if (!sessionHistory || sessionHistory.length === 0) return ['emerging themes'];
  
  const allText = sessionHistory.map(r => r.text || '').join(' ');
  const words = allText.toLowerCase().split(/\W+/);
  const significantWords = words.filter(w => w.length > 5);
  
  // Simple frequency analysis
  const frequency: Record<string, number> = {};
  significantWords.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });
  
  return Object.entries(frequency)
    .filter(([_, count]) => count > 1)
    .sort(([_, a], [__, b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);
}

function getParticipantNames(responses: any[]): string[] {
  const names = responses.map(r => r.participantName).filter(Boolean);
  return Array.from(new Set(names));
}
