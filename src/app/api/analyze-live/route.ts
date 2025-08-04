/**
 * AI Live Analysis API Route - Enhanced for MVP Split-Pane
 * 
 * This endpoint provides real-time AI analysis with strict JSON responses
 * for the split-pane UI. It builds on the existing analyze endpoint but
 * enforces structured output and enhanced error handling.
 * 
 * Key improvements:
 * - Strict JSON response format (no fabricated content)
 * - Enhanced prompt engineering for live sessions
 * - Better error boundaries and fallback responses
 * - Optimized for split-pane AI assistance panel
 */

import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { z } from 'zod';

// CRITICAL: Force dynamic rendering to fix Vercel deployment pipeline
// These exports prevent Next.js 14 from caching this API route as static
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Flexible schema for live analysis requests (allow empty transcripts)
const LiveAnalyzeRequestSchema = z.object({
  sessionTopic: z.string().min(1),
  liveTranscript: z.string().default('No conversation content captured yet.'),
  analysisType: z.enum(['insights', 'synthesis', 'followup', 'cross_reference', 'facilitation']),
  sessionDuration: z.number().optional(),
  clientId: z.string().optional().default('anonymous')
});

// Strict JSON response schema
const LiveAnalyzeResponseSchema = z.object({
  success: z.boolean(),
  analysisType: z.string(),
  content: z.string(),
  suggestions: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1),
  metadata: z.object({
    tokensUsed: z.number(),
    timestamp: z.string(),
    sessionTopic: z.string(),
    transcriptLength: z.number()
  })
});

type LiveAnalyzeResponse = z.infer<typeof LiveAnalyzeResponseSchema>;

// Rate limiting (same as existing endpoint)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const hourInMs = 60 * 60 * 1000;
  const maxRequests = 50; // Increased for live usage
  
  const clientData = rateLimitStore.get(clientId);
  
  if (!clientData || now > clientData.resetTime) {
    rateLimitStore.set(clientId, {
      count: 1,
      resetTime: now + hourInMs
    });
    return true;
  }
  
  if (clientData.count >= maxRequests) {
    return false;
  }
  
  clientData.count++;
  return true;
}

/**
 * Build strict JSON prompts for live analysis
 * Focus on factual analysis without fabrication
 */
function buildLiveAnalysisPrompt(
  analysisType: string,
  sessionTopic: string,
  transcript: string
): string {
  const baseRules = `
CRITICAL RULES:
- ONLY reference content actually present in the transcript
- NEVER fabricate participant names, quotes, or details
- If transcript is minimal, acknowledge this explicitly
- Focus on what WAS discussed, not what COULD be discussed
- Provide specific, actionable insights based on actual content
`;

  const topicContext = `Session Topic: "${sessionTopic}"`;

  switch (analysisType) {
    case 'insights':
      return `${baseRules}

${topicContext}

Analyze the actual discussion content below and provide specific insights based on what participants actually said. If the transcript is brief or empty, acknowledge this and suggest next steps.

TRANSCRIPT:
"${transcript}"

Provide insights in this format:
- Key themes from actual discussion
- Patterns in participant responses (if any)
- Specific quotes or points raised (exact text only)
- Next steps based on actual conversation gaps

Be direct and factual. No speculation beyond what's actually discussed.`;

    case 'synthesis':
      return `${baseRules}

${topicContext}

Synthesize the actual discussion content below. Connect themes and identify concrete outcomes based on what was actually said.

TRANSCRIPT:
"${transcript}"

Provide synthesis in this format:
- Main conclusions from actual discussion
- Areas of agreement/disagreement (if evident)
- Concrete next steps based on conversation
- Key decisions or insights that emerged

Only reference actual conversation content.`;

    case 'followup':
      return `${baseRules}

${topicContext}

Based on the actual discussion content below, suggest specific follow-up questions that build on what was actually discussed.

TRANSCRIPT:
"${transcript}"

Provide 3-5 follow-up questions that:
- Build directly on points actually raised
- Address gaps in the actual conversation
- Help deepen discussion of topics already mentioned
- Are specific to this session's actual content

No generic questions - tailor to actual discussion.`;

    case 'facilitation':
      return `${baseRules}

${topicContext}

As a co-facilitator, analyze the actual discussion flow and provide specific facilitation suggestions based on what actually happened.

TRANSCRIPT:
"${transcript}"

Provide facilitation guidance:
- Assessment of current discussion quality
- Suggestions based on actual participation patterns
- Next facilitation moves based on conversation state
- Ways to build on what was actually discussed

Focus on concrete, actionable facilitation based on actual content.`;

    default:
      return `${baseRules}

${topicContext}

Analyze the discussion content: "${transcript}"

Provide factual analysis based only on actual content discussed.`;
  }
}

// POST /api/analyze-live
export async function POST(request: NextRequest) {
  // Prevent Next.js prebuilding
  noStore();

  try {
    const body = await request.json();
    
    // Validate request with strict schema
    const parseResult = LiveAnalyzeRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid request format',
          details: parseResult.error.issues 
        },
        { status: 400 }
      );
    }

    const { sessionTopic, liveTranscript, analysisType, clientId = 'anonymous' } = parseResult.data;

    // Rate limiting
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Rate limit exceeded. Please wait before making another request.' 
        },
        { status: 429 }
      );
    }

    // Log request for debugging
    console.log(`Live AI Analysis Request:`, {
      sessionTopic,
      analysisType,
      transcriptLength: liveTranscript?.length || 0,
      timestamp: new Date().toISOString()
    });

    // Build strict prompt
    const userPrompt = buildLiveAnalysisPrompt(
      analysisType,
      sessionTopic,
      liveTranscript
    );

    // Initialize OpenAI client (check all possible env var names)
    const apiKey = process.env.OPENAI_API_KEY || 
                   process.env.NEXT_PUBLIC_OPENAI_API_KEY || 
                   process.env.OPENAI_KEY ||
                   process.env.OpenAI_Key ||
                   process.env.AI_API_KEY;
    
    if (!apiKey) {
      console.error('❌ No OpenAI API key found for /api/analyze-live');
      return NextResponse.json(
        { 
          success: false,
          error: 'AI service not configured' 
        },
        { status: 500 }
      );
    }
    
    const openai = new OpenAI({ apiKey });

    // Call OpenAI with structured response requirements
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert facilitator providing real-time analysis. Always respond with factual, actionable insights based strictly on provided content. Never fabricate details."
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent, factual responses
      max_tokens: 800,   // Optimized for split-pane display
      response_format: { type: "text" }
    });

    const aiResponse = completion.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('No response from AI model');
    }

    // Build strict JSON response
    const response: LiveAnalyzeResponse = {
      success: true,
      analysisType,
      content: aiResponse.trim(),
      confidence: 0.85, // Static for now, could be dynamic based on transcript quality
      metadata: {
        tokensUsed: completion.usage?.total_tokens || 0,
        timestamp: new Date().toISOString(),
        sessionTopic,
        transcriptLength: liveTranscript.length
      }
    };

    // Add suggestions for certain analysis types
    if (analysisType === 'followup' || analysisType === 'facilitation') {
      // Extract suggestions from AI response (simple implementation)
      const lines = aiResponse.split('\n').filter(line => line.trim().startsWith('-'));
      response.suggestions = lines.slice(0, 5).map(line => line.replace(/^-\s*/, '').trim());
    }

    console.log(`Live AI Analysis Success:`, {
      analysisType,
      responseLength: aiResponse.length,
      tokensUsed: completion.usage?.total_tokens || 0
    });

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Live AI Analysis Error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Return structured error response
    return NextResponse.json(
      {
        success: false,
        error: 'AI analysis failed',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        metadata: {
          timestamp: new Date().toISOString(),
          tokensUsed: 0,
          sessionTopic: '',
          transcriptLength: 0
        }
      },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ 
    status: 'healthy',
    endpoint: '/api/analyze-live',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
}
