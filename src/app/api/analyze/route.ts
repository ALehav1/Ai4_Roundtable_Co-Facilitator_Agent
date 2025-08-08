/**
 * AI Analysis API Route - STRICT VERSION
 * Prevents hallucination by enforcing grounding in actual transcript
 * 
 * This route handles AI-powered analysis with strict controls to ensure
 * the AI only references content that actually appears in the transcript.
 * 
 * Features:
 * - STRICT prompt enforcement to prevent hallucination
 * - Multiple analysis types with grounded responses
 * - Rate limiting to prevent abuse
 * - JSON-structured responses for consistency
 * - Comprehensive error handling
 * 
 * @endpoint POST /api/analyze
 */

import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';

// Rate limiting store (in-memory for now, consider Redis for production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Check if a client has exceeded rate limits (Phase 2.1 - Fixed persistent increment bug)
 * @param clientId - Unique identifier for the client
 * @returns true if request is allowed, false if rate limited
 */
function checkRateLimit(clientId: string = 'default'): boolean {
  const now = Date.now();
  const hourInMs = 60 * 60 * 1000;
  const limit = 100; // requests per hour
  
  const clientData = rateLimitStore.get(clientId);
  
  if (!clientData || now > clientData.resetTime) {
    // Initialize new window but DON'T increment yet
    rateLimitStore.set(clientId, {
      count: 0,
      resetTime: now + hourInMs
    });
    return true;
  }
  
  // Check limit without incrementing
  return clientData.count < limit;
}

/**
 * Increment rate limit counter after successful API call (Phase 2.1 - Bug fix)
 * @param clientId - Unique identifier for the client
 */
function incrementRateLimit(clientId: string = 'default'): void {
  const clientData = rateLimitStore.get(clientId);
  if (clientData) {
    clientData.count++;
    rateLimitStore.set(clientId, clientData);
  }
}

/**
 * Build EXECUTIVE-FOCUSED prompt that prevents hallucination
 * Enhanced for C-suite and strategic discussions
 * Incorporates the Three-Shift Framework: Assistance → Automation → Amplification
 */
function buildStrictPrompt(
  analysisType: string, 
  context: string, 
  transcript: string
): string {
  // Executive-focused base instruction that prevents hallucination
  const baseInstruction = `
EXECUTIVE ANALYSIS PROTOCOL:
1. You are a senior strategic advisor analyzing C-level discussions
2. ONLY reference content from the TRANSCRIPT below - no fabrication
3. Frame insights in terms of business value, ROI, and strategic impact
4. Identify concrete decisions needed and ownership requirements
5. Output valid JSON with executive-appropriate language
6. If transcript is limited, provide honest assessment of discussion maturity

STRATEGIC FRAMEWORK:
Analyze through the Three-Shift Transformation Model:
- ASSISTANCE STAGE: AI tools augment individual productivity (Current ROI: 10-30%)
- AUTOMATION STAGE: AI agents handle complete workflows (Potential ROI: 40-70%)
- AMPLIFICATION STAGE: AI creates compound organizational intelligence (Target ROI: 100%+)

Executive Context: "${context}"

DISCUSSION TRANSCRIPT:
${transcript || "[Executive discussion not yet initiated]"}

`;

  // Type-specific prompts with JSON structure enforcement
  switch (analysisType) {
    case 'insights':
      return baseInstruction + `
Provide STRATEGIC INSIGHTS based solely on transcript content in this JSON format:
{
  "insights": "Strategic patterns and business implications from discussion (or 'Executive discussion requires more content for analysis' if minimal)",
  "confidence": 0.0 to 1.0 based on discussion depth,
  "type": "insights",
  "evidence": ["Direct quote or paraphrase from transcript", "Supporting reference"] or [],
  "businessValue": "Quantifiable impact on revenue, efficiency, or competitive advantage",
  "frameworkAlignment": "Current organizational position: Assistance/Automation/Amplification stage",
  "transformationGaps": "Critical gaps preventing advancement to next transformation stage",
  "executiveActions": ["Decision 1 requiring C-level approval", "Initiative 2 with clear ownership"] or [],
  "riskFactors": "Strategic risks if current trajectory continues",
  "timeHorizon": "Short-term (0-6 months), Medium-term (6-18 months), or Long-term (18+ months) impact"
}`;

    case 'synthesis':
      return baseInstruction + `
Synthesize discussion into EXECUTIVE SUMMARY format:
{
  "synthesis": "Strategic summary of key decisions and outcomes (or 'Insufficient content for executive synthesis' if minimal)",
  "confidence": 0.0 to 1.0,
  "type": "synthesis",
  "keyDecisions": ["Decision 1 with business impact", "Decision 2 with ownership"] or [],
  "speakerCount": number of distinct participants or 0,
  "transformationReadiness": "Organizational maturity assessment: Which transformation stage and readiness score (1-10)",
  "strategicOutcomes": ["Outcome 1 with measurable impact", "Outcome 2 with timeline"] or [],
  "investmentRequired": "Resource allocation needs: People, Technology, Process changes",
  "competitiveImplications": "How these decisions affect market position and competitive advantage",
  "nextActions": ["Action 1 (Owner: Role, Timeline: Date)", "Action 2 (Owner: Role, Timeline: Date)"] or []
}`;

    case 'followup':
      return baseInstruction + `
Generate STRATEGIC FOLLOW-UP QUESTIONS based on transcript content:
{
  "questions": ["Strategic question 1 based on actual content", "Decision-focused question 2"] or ["What strategic AI initiatives should we prioritize?"],
  "confidence": 0.0 to 1.0,
  "type": "followup",
  "rationale": "Strategic reasoning for these questions (or 'Awaiting executive input to generate targeted questions' if minimal)",
  "frameworkQuestions": ["What ROI do we need to justify moving from Assistance to Automation?", "Which capabilities must we build to achieve Amplification?", "What competitive risks do we face if we don't act?"],
  "pivotStrategy": "How to elevate discussion from tactical to strategic transformation focus",
  "decisionPoints": ["Budget allocation decision", "Technology platform choice", "Organizational structure change"] or [],
  "urgencyLevel": "High/Medium/Low based on competitive landscape and discussion urgency"
}`;

    case 'cross_reference':
      return baseInstruction + `
Identify connections ONLY within the provided transcript in this exact JSON format:
{
  "connections": "Relationships between actual points discussed (or 'No connections to identify yet')",
  "confidence": 0.0 to 1.0,
  "type": "cross_reference",
  "examples": ["Connection 1 with specific references", "Connection 2"] or []
}`;

    case 'executive':
      return baseInstruction + `
Generate EXECUTIVE SUMMARY with strategic recommendations:
{
  "executiveSummary": "High-level strategic summary for C-suite consumption (or 'Discussion requires more strategic depth for executive briefing' if insufficient)",
  "confidence": 0.0 to 1.0,
  "type": "executive",
  "strategicRecommendations": ["Recommendation 1 with business justification", "Recommendation 2 with ROI projection"] or [],
  "budgetImplications": "Investment requirements and expected returns",
  "timeToValue": "Expected timeline from decision to business impact",
  "competitiveAdvantage": "How these actions improve market position",
  "riskMitigation": "Key risks and proposed mitigation strategies",
  "successMetrics": ["KPI 1 with target", "KPI 2 with measurement method"] or [],
  "organizationalChange": "Required changes in structure, skills, or culture",
  "immediateActions": ["Action 1 (Owner: C-level role, By: Date)", "Action 2 (Owner: Department, By: Date)"] or []
}`;

    default:
      return baseInstruction + `
Provide strategic analysis in this JSON format:
{
  "result": "Executive-focused analysis based on transcript content",
  "confidence": 0.0 to 1.0,
  "type": "${analysisType}",
  "businessImplications": "Strategic impact and decision requirements"
}`;
  }
}

export async function POST(req: NextRequest) {
  // Prevent static optimization at build time
  noStore();
  
  try {
    // Parse request body
    const body = await req.json();
    const { 
      questionContext, 
      currentTranscript, 
      analysisType = 'insights',
      clientId 
    } = body;
    
    // Validate required fields
    if (!questionContext) {
      return NextResponse.json(
        { error: 'Question context is required' },
        { status: 400 }
      );
    }
    
    // Validate analysis type
    const validTypes = ['insights', 'synthesis', 'followup', 'cross_reference'];
    if (!validTypes.includes(analysisType)) {
      return NextResponse.json(
        { error: `Invalid analysis type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Check rate limit
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before making more requests.' },
        { status: 429 }
      );
    }
    
    // Check for API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OpenAI API key not configured');
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 503 }
      );
    }
    
    // Initialize OpenAI with API key
    const openai = new OpenAI({ apiKey });
    
    // Build strict prompt that prevents hallucination
    const prompt = buildStrictPrompt(
      analysisType,
      questionContext,
      currentTranscript
    );
    
    // Call OpenAI with JSON mode for structured output
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using mini for cost efficiency
      messages: [
        {
          role: 'system',
          content: 'You are a strict AI co-facilitator. Output only valid JSON. Never invent content not in the transcript. If there is no transcript, acknowledge this honestly.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 400,
      response_format: { type: "json_object" }
    });
    
    const result = completion.choices[0]?.message?.content;
    
    if (!result) {
      throw new Error('No response from AI');
    }
    
    // Parse and validate JSON response
    try {
      const parsed = JSON.parse(result);
      
      // Add metadata about transcript analysis
      parsed.metadata = {
        transcriptLength: currentTranscript?.length || 0,
        hasContent: (currentTranscript?.length || 0) > 50,
        timestamp: Date.now()
      };
      
      // Phase 2.1: Increment rate limit ONLY after successful API call
      incrementRateLimit(clientId);
      
      return NextResponse.json(parsed);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback response if JSON parsing fails
      // Still count this as a successful API call for rate limiting purposes
      incrementRateLimit(clientId);
      return NextResponse.json({
        result: result,
        type: analysisType,
        confidence: 0.5,
        error: 'Response parsing failed, returning raw content'
      });
    }
    
  } catch (error) {
    console.error('AI Analysis Error:', error);
    
    // Handle OpenAI specific errors
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        return NextResponse.json(
          { error: 'Invalid API key' },
          { status: 401 }
        );
      }
      if (error.message.includes('429')) {
        return NextResponse.json(
          { error: 'OpenAI rate limit exceeded' },
          { status: 429 }
        );
      }
    }
    
    // Generic error response
    return NextResponse.json(
      { error: 'Analysis failed. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint
 * GET /api/analyze
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'AI Analysis API',
    version: '2.0',
    features: ['strict-mode', 'rate-limiting', 'json-output', 'hallucination-prevention']
  });
}
