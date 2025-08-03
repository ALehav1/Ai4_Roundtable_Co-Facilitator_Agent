import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import OpenAI from 'openai';

// OpenAI client will be initialized at runtime to avoid build-time env var issues

// Types matching the frontend session data structure
interface ParticipantResponse {
  id: string;
  text: string;
  timestamp: Date;
  participantName?: string;
}

interface AIInsight {
  content: string;
  type: 'insights' | 'synthesis' | 'followup' | 'cross_reference' | 'facilitation';
  timestamp: Date;
  questionId: string;
  facilitationType?: string;
  confidence?: number;
  connections?: string[];
}

interface SessionData {
  responses: ParticipantResponse[];
  aiInsights: AIInsight[];
  currentQuestionIndex: number;
  sessionStartTime: Date;
}

interface QuestionSummary {
  questionId: string;
  questionTitle: string;
  questionText: string;
  participantCount: number;
  keyThemes: string[];
  narrativeSummary: string;
  criticalInsights: string[];
  emergingConcerns: string[];
  strategicImplications: string[];
}

interface SessionSummary {
  sessionOverview: {
    totalParticipants: number;
    questionsCompleted: number;
    sessionDuration: string;
    overallEngagement: string;
  };
  questionSummaries: QuestionSummary[];
  executiveSummary: {
    keyFindings: string[];
    strategicRecommendations: string[];
    nextSteps: string[];
    riskFactors: string[];
  };
  fullNarrativeConclusion: string;
}

export async function POST(request: NextRequest) {
  // Prevent Next.js from prebuilding this route at build time
  noStore();
  
  try {
    const { sessionData, questions } = await request.json();

    if (!sessionData || !questions) {
      return NextResponse.json(
        { error: 'Session data and questions are required' },
        { status: 400 }
      );
    }

    // Get environment variable with multiple fallback patterns for Vercel
    const openaiApiKey = process.env.OPENAI_API_KEY || 
                         process.env.NEXT_PUBLIC_OPENAI_API_KEY ||
                         process.env.OPENAI_KEY ||
                         process.env.NEXT_OPENAI_API_KEY ||  
                         process.env.AI_API_KEY;
    
    // Debug: Log environment variable status for ALL fallbacks
    console.log('DEBUG: OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
    console.log('DEBUG: NEXT_PUBLIC_OPENAI_API_KEY exists:', !!process.env.NEXT_PUBLIC_OPENAI_API_KEY);
    console.log('DEBUG: OPENAI_KEY exists:', !!process.env.OPENAI_KEY);
    console.log('DEBUG: NEXT_OPENAI_API_KEY exists:', !!process.env.NEXT_OPENAI_API_KEY);
    console.log('DEBUG: AI_API_KEY exists:', !!process.env.AI_API_KEY); // <-- This is what we set via CLI!
    console.log('DEBUG: Final resolved key exists:', !!openaiApiKey);
    console.log('DEBUG: Final resolved key length:', openaiApiKey?.length || 0);
    
    // Validate OpenAI API key
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    console.log('🎯 Generating comprehensive session summary...');
    
    // Generate summary for each question
    const questionSummaries: QuestionSummary[] = await Promise.all(
      questions.map(async (question: any, index: number) => {
        const questionResponses = sessionData.responses.filter((r: ParticipantResponse) => 
          r.id.startsWith(question.id)
        );
        
        const questionInsights = sessionData.aiInsights.filter((insight: AIInsight) => 
          insight.questionId === question.id
        );

        if (questionResponses.length === 0) {
          return {
            questionId: question.id,
            questionTitle: question.title,
            questionText: question.question,
            participantCount: 0,
            keyThemes: [],
            narrativeSummary: "No responses were captured for this question during the session.",
            criticalInsights: [],
            emergingConcerns: [],
            strategicImplications: []
          };
        }

        return await generateQuestionSummary(question, questionResponses, questionInsights, openaiApiKey);
      })
    );

    // Generate executive summary and overall conclusion
    const executiveSummary = await generateExecutiveSummary(sessionData, questionSummaries, openaiApiKey);
    const fullNarrativeConclusion = await generateOverallConclusion(sessionData, questionSummaries, executiveSummary, openaiApiKey);

    // Calculate session overview metrics
    const sessionOverview = calculateSessionOverview(sessionData, questions);

    const summary: SessionSummary = {
      sessionOverview,
      questionSummaries,
      executiveSummary,
      fullNarrativeConclusion
    };

    console.log('✅ Session summary generated successfully');
    
    return NextResponse.json(summary);

  } catch (error) {
    console.error('❌ Error generating session summary:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate session summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function generateQuestionSummary(
  question: any, 
  responses: ParticipantResponse[], 
  insights: AIInsight[],
  apiKey: string
): Promise<QuestionSummary> {
  // Initialize OpenAI client at runtime to avoid build-time env var issues
  const openai = new OpenAI({
    apiKey: apiKey,
  });
  
  const responseTexts = responses.map(r => 
    `${r.participantName || 'Participant'}: ${r.text}`
  ).join('\n\n');
  
  const aiInsightTexts = insights.map(i => i.content).join('\n\n');

  const prompt = `As an expert strategic facilitator, analyze this discussion section and create a comprehensive narrative summary.

QUESTION ANALYZED:
Title: ${question.title}
Question: ${question.question}
Facilitator Context: ${question.facilitatorGuidance || 'N/A'}

PARTICIPANT RESPONSES:
${responseTexts}

AI INSIGHTS GENERATED:
${aiInsightTexts}

Please provide a detailed analysis in the following structure:

1. KEY THEMES (3-5 main themes that emerged):
List the core themes discussed.

2. NARRATIVE SUMMARY (2-3 paragraphs):
Write a flowing narrative that captures the nature of the conversation, the depth of discussion, participant engagement, and the evolution of ideas. Avoid bullet points - tell the story of what happened in this discussion.

3. CRITICAL INSIGHTS (3-5 insights):
The most important strategic insights that emerged from this discussion.

4. EMERGING CONCERNS (2-4 concerns):
Any risks, challenges, or concerns that participants raised or became apparent.

5. STRATEGIC IMPLICATIONS (2-4 implications):
What this discussion means for the organization's AI transformation strategy.

Format your response as JSON with the exact structure:
{
  "keyThemes": ["theme1", "theme2", ...],
  "narrativeSummary": "flowing narrative text here...",
  "criticalInsights": ["insight1", "insight2", ...],
  "emergingConcerns": ["concern1", "concern2", ...],
  "strategicImplications": ["implication1", "implication2", ...]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert strategic facilitator who creates comprehensive, narrative-driven summaries of executive discussions. Focus on strategic insights, organizational implications, and the flow of conversation rather than just listing points.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1500
    });

    const content = response.choices[0]?.message?.content;
    if (!content || content.trim() === '') {
      console.warn(`Empty AI response for question ${question.id}, using fallback`);
      throw new Error('Empty response from OpenAI');
    }

    // Enhanced JSON parsing with fallback - handle markdown-wrapped JSON
    let parsedResponse;
    try {
      // Strip markdown code block formatting if present
      let jsonContent = content.trim();
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      parsedResponse = JSON.parse(jsonContent);
      
      // Validate required fields exist
      if (!parsedResponse || typeof parsedResponse !== 'object') {
        throw new Error('Invalid JSON structure from AI response');
      }
    } catch (parseError) {
      console.warn(`JSON parsing failed for question ${question.id}:`, parseError);
      throw new Error('Invalid JSON format in AI response');
    }
    
    return {
      questionId: question.id,
      questionTitle: question.title,
      questionText: question.question,
      participantCount: new Set(responses.map(r => r.participantName || 'Anonymous')).size,
      keyThemes: parsedResponse.keyThemes || [],
      narrativeSummary: parsedResponse.narrativeSummary || '',
      criticalInsights: parsedResponse.criticalInsights || [],
      emergingConcerns: parsedResponse.emergingConcerns || [],
      strategicImplications: parsedResponse.strategicImplications || []
    };

  } catch (error) {
    console.error(`Error generating summary for question ${question.id}:`, error);
    
    // Fallback summary if AI generation fails
    return {
      questionId: question.id,
      questionTitle: question.title,
      questionText: question.question,
      participantCount: new Set(responses.map(r => r.participantName || 'Anonymous')).size,
      keyThemes: ['Discussion captured'],
      narrativeSummary: `This section focused on ${question.title.toLowerCase()}. ${responses.length} contributions were captured from participants, covering various perspectives and insights relevant to the organization's AI transformation journey.`,
      criticalInsights: ['Multiple perspectives shared'],
      emergingConcerns: ['Further analysis needed'],
      strategicImplications: ['Continued discussion recommended']
    };
  }
}

async function generateExecutiveSummary(
  sessionData: SessionData,
  questionSummaries: QuestionSummary[],
  apiKey: string
) {
  // Initialize OpenAI client at runtime to avoid build-time env var issues
  const openai = new OpenAI({
    apiKey: apiKey,
  });
  
  const allInsights = questionSummaries.flatMap(q => q.criticalInsights);
  const allConcerns = questionSummaries.flatMap(q => q.emergingConcerns);
  const allImplications = questionSummaries.flatMap(q => q.strategicImplications);

  const prompt = `As an executive strategy consultant, create a high-level executive summary based on this AI transformation roundtable session.

SESSION DATA:
- Total Questions Addressed: ${questionSummaries.length}
- Total Responses Captured: ${sessionData.responses.length}
- Key Insights Across All Sections: ${allInsights.join('; ')}
- Concerns Raised: ${allConcerns.join('; ')}
- Strategic Implications: ${allImplications.join('; ')}

QUESTION SUMMARIES:
${questionSummaries.map(q => `
${q.questionTitle}: ${q.narrativeSummary}
Key Themes: ${q.keyThemes.join(', ')}
`).join('\n')}

Create an executive summary with:

1. KEY FINDINGS (4-6 strategic findings)
2. STRATEGIC RECOMMENDATIONS (4-6 actionable recommendations)
3. NEXT STEPS (3-5 immediate next steps)
4. RISK FACTORS (3-4 risks to monitor)

Format as JSON:
{
  "keyFindings": ["finding1", "finding2", ...],
  "strategicRecommendations": ["rec1", "rec2", ...],
  "nextSteps": ["step1", "step2", ...],
  "riskFactors": ["risk1", "risk2", ...]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a senior executive strategy consultant specializing in AI transformation. Create executive-level summaries that focus on strategic impact, organizational readiness, and actionable next steps.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(content);

  } catch (error) {
    console.error('Error generating executive summary:', error);
    
    // Fallback executive summary
    return {
      keyFindings: [
        'Leadership engagement in AI transformation discussion',
        'Multiple perspectives on organizational readiness',
        'Strategic priorities identified for AI implementation'
      ],
      strategicRecommendations: [
        'Continue structured AI transformation planning',
        'Address identified organizational readiness gaps',
        'Develop comprehensive change management strategy'
      ],
      nextSteps: [
        'Review and validate session insights with stakeholders',
        'Prioritize identified strategic initiatives',
        'Schedule follow-up planning sessions'
      ],
      riskFactors: [
        'Organizational change resistance',
        'Resource allocation challenges',
        'Technology implementation complexity'
      ]
    };
  }
}

async function generateOverallConclusion(
  sessionData: SessionData,
  questionSummaries: QuestionSummary[], 
  executiveSummary: string,
  apiKey: string
): Promise<string> {
  // Initialize OpenAI client at runtime to avoid build-time env var issues
  const openai = new OpenAI({
    apiKey: apiKey,
  });
  
  const prompt = `As an expert strategic facilitator, write a comprehensive narrative conclusion for this AI transformation roundtable session.

SESSION CONTEXT:
- Duration: ${calculateSessionDuration(sessionData.sessionStartTime)}
- Questions Explored: ${questionSummaries.length}
- Total Contributions: ${sessionData.responses.length}

SECTION SUMMARIES:
${questionSummaries.map(q => `
${q.questionTitle}:
${q.narrativeSummary}

Key Themes: ${q.keyThemes.join(', ')}
Critical Insights: ${q.criticalInsights.join('; ')}
Strategic Implications: ${q.strategicImplications.join('; ')}
`).join('\n---\n')}

Write a comprehensive 3-4 paragraph narrative conclusion that:
1. Captures the overall nature and quality of the strategic conversation
2. Highlights the most significant insights and themes that emerged across all sections
3. Discusses the readiness and mindset of the leadership team for AI transformation
4. Provides a forward-looking perspective on next steps and organizational readiness

Write this as a flowing narrative suitable for sharing with senior leadership and stakeholders. Focus on the strategic story and organizational implications rather than just summarizing points.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert strategic facilitator and executive coach who writes compelling narrative conclusions that capture both the content and the strategic implications of leadership discussions.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.4,
      max_tokens: 800
    });

    return response.choices[0]?.message?.content || 'This AI transformation roundtable session provided valuable insights into organizational readiness and strategic priorities. The discussion revealed both opportunities and challenges that will inform the path forward for AI implementation.';

  } catch (error) {
    console.error('Error generating overall conclusion:', error);
    return 'This AI transformation roundtable session provided valuable insights into organizational readiness and strategic priorities. The discussion revealed both opportunities and challenges that will inform the path forward for AI implementation.';
  }
}

function calculateSessionOverview(sessionData: SessionData, questions: any[]) {
  const uniqueParticipants = new Set(
    sessionData.responses.map(r => r.participantName || 'Anonymous')
  ).size;

  const duration = calculateSessionDuration(sessionData.sessionStartTime);
  
  const engagementLevel = sessionData.responses.length > questions.length * 2 
    ? 'High' 
    : sessionData.responses.length > questions.length 
    ? 'Moderate' 
    : 'Light';

  return {
    totalParticipants: uniqueParticipants,
    questionsCompleted: sessionData.currentQuestionIndex + 1,
    sessionDuration: duration,
    overallEngagement: engagementLevel
  };
}

function calculateSessionDuration(startTime: Date): string {
  const duration = Math.floor((Date.now() - new Date(startTime).getTime()) / (1000 * 60));
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
