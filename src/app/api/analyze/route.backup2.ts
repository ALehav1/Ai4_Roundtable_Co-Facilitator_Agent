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
 * Check if a client has exceeded rate limits
 * @param clientId - Unique identifier for the client
 * @returns true if request is allowed, false if rate limited
 */
function checkRateLimit(clientId: string = 'default'): boolean {
  const now = Date.now();
  const hourInMs = 60 * 60 * 1000;
  const limit = 100; // requests per hour
  
  const clientData = rateLimitStore.get(clientId);
  
  if (!clientData || now > clientData.resetTime) {
    rateLimitStore.set(clientId, {
      count: 1,
      resetTime: now + hourInMs
    });
    return true;
  }
  
  if (clientData.count >= limit) {
    return false;
  }
  
  clientData.count++;
  rateLimitStore.set(clientId, clientData);
  return true;
}

/**
 * Build STRICT prompt that prevents hallucination
 * The prompt explicitly instructs the AI to only reference actual transcript content
 * Incorporates the Three-Shift Framework: Assistance → Automation → Amplification
 */
function buildStrictPrompt(
  analysisType: string, 
  context: string, 
  transcript: string
): string {
  // Base instruction that prevents hallucination
  const baseInstruction = `
CRITICAL RULES:
1. You MUST ONLY reference content that appears in the TRANSCRIPT below
2. If the transcript is empty or minimal, acknowledge this honestly
3. NEVER invent participants, quotes, or details not in the transcript
4. Output MUST be valid JSON
5. Be specific when referencing the transcript - quote or paraphrase actual content

FRAMEWORK CONTEXT:
Analyze through the lens of the Three-Shift Framework:
- ASSISTANCE: AI as reactive helper, tools & copilots (limitation: shallow, no memory)
- AUTOMATION: AI handles full workflows, agents (limitation: efficient but brittle)
- AMPLIFICATION: AI that evolves, builds memory, creates compound intelligence

Context: "${context}"

TRANSCRIPT:
${transcript || "[No transcript content yet]"}

`;

  // Type-specific prompts with JSON structure enforcement
  switch (analysisType) {
    case 'insights':
      return baseInstruction + `
Based ONLY on the transcript above, provide insights in this exact JSON format:
{
  "insights": "Key patterns or themes from actual content (or 'No content to analyze yet' if empty)",
  "confidence": 0.0 to 1.0 based on amount of content,
  "type": "insights",
  "evidence": ["Quote or reference 1 from transcript", "Quote or reference 2"] or [],
  "frameworkAlignment": "Which shift (Assistance/Automation/Amplification) does the discussion align with?",
  "transformationGaps": "What gaps exist between current state and AI-native operations?"
}`;

    case 'synthesis':
      return baseInstruction + `
Synthesize ONLY what's in the transcript in this exact JSON format:
{
  "synthesis": "Summary of actual discussion points (or 'No discussion to synthesize yet' if empty)",
  "confidence": 0.0 to 1.0,
  "type": "synthesis",
  "keyPoints": ["Point 1 from transcript", "Point 2"] or [],
  "speakerCount": number of distinct speakers identified or 0,
  "transformationReadiness": "Based on discussion, where is the organization on the transformation journey?",
  "nextSteps": ["Concrete action 1", "Concrete action 2"] or []
}`;

    case 'questions':
      return baseInstruction + `
Generate follow-up questions based ONLY on the transcript in this exact JSON format:
{
  "questions": ["Question 1 based on actual content", "Question 2"] or ["What would you like to discuss?"],
  "confidence": 0.0 to 1.0,
  "type": "questions",
  "rationale": "Why these questions based on the transcript (or 'Waiting for discussion to begin' if empty)",
  "frameworkQuestions": ["How can you move from Assistance to Automation?", "What foundations enable Amplification?"],
  "pivotStrategy": "If discussion is stuck, how to redirect toward transformation?"
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

    default:
      return baseInstruction + `
Provide analysis in this exact JSON format:
{
  "result": "Analysis based on transcript",
  "confidence": 0.0 to 1.0,
  "type": "${analysisType}"
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
      
      return NextResponse.json(parsed);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback response if JSON parsing fails
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
