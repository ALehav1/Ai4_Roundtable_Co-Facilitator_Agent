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
  analysisType: z.enum(['insights', 'synthesis', 'followup', 'cross_reference', 'facilitation', 'transition', 'executive']), // ✅ ADD 'executive'
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

// Rate limiting (align with strict endpoint; increment only on success)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(clientId: string = 'anonymous'): boolean {
  const now = Date.now();
  const hourInMs = 60 * 60 * 1000;
  const maxRequests = 50; // live usage

  const clientData = rateLimitStore.get(clientId);

  if (!clientData || now > clientData.resetTime) {
    // Start a new window without incrementing
    rateLimitStore.set(clientId, { count: 0, resetTime: now + hourInMs });
    return true;
  }

  return clientData.count < maxRequests;
}

function incrementRateLimit(clientId: string = 'anonymous') {
  const clientData = rateLimitStore.get(clientId);
  if (clientData) {
    clientData.count += 1;
    rateLimitStore.set(clientId, clientData);
  }
}

/**
 * Build EXECUTIVE-FOCUSED prompts for live analysis
 * Enhanced for C-suite and strategic discussions
 */
function buildLiveAnalysisPrompt(
  analysisType: string,
  transcript: string,
  currentQuestion: any
): string {
  // Executive-focused prompts with strategic language
  
  if (analysisType === 'insights') {
    return `STRATEGIC INSIGHTS - Executive Analysis of Discussion Content:

EXECUTIVE TRANSCRIPT:
${transcript}

Based ONLY on actual discussion content, provide strategic analysis:

1. **Business Value Identified**: [Strategic patterns or competitive advantages emerging from discussion]
2. **Critical Quote or Decision Point**: [Most important statement affecting business strategy or operations]
3. **Executive Insight**: [Key strategic perspective shared that impacts organizational direction]
4. **Strategic Momentum**: [How the discussion is advancing toward actionable business decisions]

EXECUTIVE GUIDANCE: Reference only actual transcript content. If limited content available, provide strategic direction:
- Suggest high-impact questions to drive decision-making
- Identify strategic opportunities based on session objectives
- Recommend focus areas that maximize competitive advantage

Deliver concise executive briefing format with numbered points as shown.`;
  }
  
  if (analysisType === 'followup') {
    return `EXECUTIVE FOLLOW-UP QUESTIONS - Strategic Discussion Advancement:

EXECUTIVE TRANSCRIPT:
${transcript}

Generate 4 strategic questions that drive business decisions and competitive advantage:

1. [Strategic question focusing on ROI or competitive positioning]
2. [Decision-focused question requiring C-level input]
3. [Risk/opportunity question with business impact implications]
4. [Implementation question with ownership and timeline considerations]

Frame questions for executive decision-making with clear business implications.`;
  }
  
  if (analysisType === 'cross_reference') {
    return `STRATEGIC CONNECTIONS - Executive Pattern Analysis:

EXECUTIVE TRANSCRIPT:
${transcript}

Identify 4 strategic connections with business impact:

1. [Strategic theme connection with competitive implications]
2. [Decision pattern with organizational impact]
3. [Resource allocation connection affecting ROI]
4. [Risk/opportunity intersection requiring executive attention]

Focus on connections that inform strategic decision-making and business value creation.`;
  }
  
  if (analysisType === 'synthesis') {
    return `EXECUTIVE SUMMARY - Strategic Discussion Synthesis:

EXECUTIVE TRANSCRIPT:
${transcript}

Based ONLY on actual executive discussion, provide strategic summary:

1. **Strategic Objective Addressed**: [Primary business challenge or opportunity discussed]
2. **Key Decisions or Positions**: [Strategic decisions, agreements, or positions taken by leadership]
3. **Business Impact Identified**: [Quantifiable impacts on revenue, efficiency, or competitive position]
4. **Executive Actions Required**: [Specific next steps with C-level ownership and timelines]

CRITICAL: Reference only actual discussion content. Maintain executive briefing standards with clear business implications. If insufficient content, state assessment honestly.

Deliver in executive briefing format using numbered structure shown.`;
  }
  
  if (analysisType === 'transition') {
    return `STRATEGIC PHASE TRANSITION - Executive Session Advancement:

EXECUTIVE TRANSCRIPT:
${transcript}

Provide transition guidance for executive session progression:

1. **Strategic Accomplishments**: [Business value and decisions achieved in current phase]
2. **Critical Insights for Leadership**: [Key strategic insights to advance to next discussion phase]
3. **Executive Readiness Assessment**: [Leadership alignment and preparation for next strategic focus]
4. **Recommended Strategic Pivot**: [High-impact transition approach to maximize executive engagement]

Frame guidance for C-level strategic session management with clear business focus.`;
  }
  
  if (analysisType === 'facilitation') {
    return `EXECUTIVE FACILITATION GUIDANCE - Strategic Session Management:

EXECUTIVE TRANSCRIPT:
${transcript}

Provide facilitation guidance for executive strategic session:

1. **Leadership Engagement Dynamics**: [C-level participation patterns and strategic alignment]
2. **Strategic Content Emergence**: [Business-critical themes and competitive insights developing]
3. **Decision Process Flow**: [How strategic decisions are progressing, barriers to resolution]
4. **Executive Facilitation Strategy**: [Specific approach to maximize strategic outcomes and decision velocity]

Focus on facilitating high-impact strategic discussions with measurable business outcomes.`;
  }
  
  if (analysisType === 'executive') {
    return `EXECUTIVE BRIEFING - Strategic Session Analysis:

EXECUTIVE TRANSCRIPT:
${transcript}

Provide C-suite briefing on strategic discussion:

1. **Strategic Summary**: [High-level business implications and key strategic insights]
2. **Decision Requirements**: [Critical decisions requiring C-level approval with business justification]
3. **Resource Implications**: [Investment needs, ROI projections, and competitive advantage potential]
4. **Immediate Executive Actions**: [Urgent actions for C-level leaders with clear ownership and timelines]

Deliver in executive briefing format suitable for board presentation and strategic planning.`;
  }
  
  return 'Executive analysis type not recognized. Please specify: insights, synthesis, followup, cross_reference, facilitation, transition, or executive.';
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

    // Increment rate limit only after successful AI response
    incrementRateLimit(clientId);

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
