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
  analysisType: z.enum(['insights', 'synthesis', 'followup', 'cross_reference', 'facilitation', 'transition']), // ✅ ADD 'transition'
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
  transcript: string,
  currentQuestion: any
): string {
  // 🚨 ULTRA CLEAN PROMPTS - NO MENTION OF FORMATTING
  
  if (analysisType === 'insights') {
    return `PHASE-SPECIFIC INSIGHTS - Analyze only the NEW content in this transcript since the last insight generation:

TRANSCRIPT:
${transcript}

Based ONLY on what was actually discussed in the transcript above, provide:

1. **New Theme Identified**: [What new theme or topic emerged in this portion]
2. **Key Quote or Statement**: [Most important direct quote from the actual conversation]
3. **Participant Insight**: [What insight or perspective was actually shared by participants]
4. **Discussion Pattern**: [What pattern or dynamic you observe in how the conversation is developing]

IMPORTANT: Only analyze content that was ACTUALLY discussed in the transcript. Quote exactly from the conversation. If the transcript is empty or lacks substantive new content since the last analysis, state "No significant new content to analyze since last insights."

Respond with only plain text. Use the exact numbering shown above.`;
  }
  
  if (analysisType === 'followup') {
    return `Generate 4 strategic follow-up questions based on this transcript:

TRANSCRIPT:
${transcript}

RESPONSE FORMAT:
1. [question]
2. [question]
3. [question]
4. [question]

Respond with only plain text questions.`;
  }
  
  if (analysisType === 'cross_reference') {
    return `Identify connections in this business discussion:

TRANSCRIPT:
${transcript}

Provide 4 numbered connection points about themes, patterns, and strategic implications.`;
  }
  
  if (analysisType === 'synthesis') {
    return `CUMULATIVE DISCUSSION SYNTHESIS - Analyze the actual conversation below and summarize the key takeaways that were ACTUALLY discussed:

TRANSCRIPT:
${transcript}

Based ONLY on what was actually said in this conversation, provide:

1. **Main Topic Discussed**: [What topic was actually covered]
2. **Key Points Made**: [Actual points raised by participants]
3. **Decisions or Conclusions**: [Any decisions, agreements, or conclusions reached]
4. **Action Items or Next Steps**: [Any specific next steps mentioned]

IMPORTANT: Only summarize content that was ACTUALLY discussed in the transcript. Do not add generic advice or recommendations not mentioned by participants. If the transcript is empty or lacks substantive content, state that clearly.

Respond with only plain text. Use the exact numbering shown above.`;
  }
  
  if (analysisType === 'transition') { // ✅ ADD TRANSITION CASE
    return `Analyze the discussion transition and provide guidance for moving to the next phase:

TRANSCRIPT:
${transcript}

RESPONSE FORMAT:
1. Summary: [what was accomplished in this phase]
2. Key insights: [insights to carry forward]
3. Readiness assessment: [assessment for next phase]
4. Suggested transition: [transition points or questions]

Respond with only plain text. Use the exact numbering shown above.`;
  }
  
  if (analysisType === 'facilitation') { // ✅ ADD FACILITATION CASE
    return `As an expert facilitator, analyze this business discussion and provide facilitation guidance:

TRANSCRIPT:
${transcript}

RESPONSE FORMAT:
1. Group dynamics: [what you observe about participation and engagement]
2. Content insights: [key themes and strategic points emerging]
3. Process observation: [how the discussion is flowing, any challenges]
4. Facilitation suggestion: [specific guidance for steering the conversation]

Respond with only plain text. Use the exact numbering shown above.`;
  }
  
  return 'Invalid analysis type';
}

// POST /api/analyze-live
export async function POST(request: NextRequest) {
  // Prevent Next.js prebuilding
  noStore();

  try {
    const body = await request.json();
    
    // 🔍 CRITICAL DEBUG LOGGING
    console.log('🚨 DEBUG - Raw request body:', JSON.stringify(body, null, 2));
    
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

    // 🔍 CRITICAL DEBUG LOGGING
    console.log('🚨 DEBUG - Analysis type:', analysisType);
    
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

    // Build live transcript from entries
    const transcript = liveTranscript;
    
    // 🔍 CRITICAL DEBUG - Check if transcript contains HTML
    console.log('🚨 DEBUG - Final transcript being sent to AI:');
    console.log('---START TRANSCRIPT---');
    console.log(transcript);
    console.log('---END TRANSCRIPT---');
    
    // Check for HTML contamination
    if (transcript.includes('<div') || transcript.includes('class=')) {
      console.error('🚨 CONTAMINATION DETECTED: Transcript contains HTML!');
      console.error('Contaminated content:', transcript);
    }

    // Build strict prompt
    const userPrompt = buildLiveAnalysisPrompt(
      analysisType,
      transcript,
      { title: sessionTopic }
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
    
    // 🔍 DEBUG - Log AI response
    console.log('🚨 DEBUG - Raw AI response:');
    console.log('---START AI RESPONSE---');
    console.log(aiResponse);
    console.log('---END AI RESPONSE---');
    
    // Check if AI response contains CSS classes
    if (aiResponse && (aiResponse.includes('class=') || aiResponse.includes('font-semibold') || aiResponse.includes('bg-purple'))) {
      console.error('🚨 AI CONTAMINATION: AI returned CSS classes!');
      console.error('Contaminated AI response:', aiResponse);
    }
    
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
