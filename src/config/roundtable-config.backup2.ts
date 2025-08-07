/**
 * AI Co-Facilitator Configuration System
 * 
 * Specialized Configuration for: "When AI Becomes How the Enterprise Works"
 * Strategic AI Transformation Session with 5-Phase Framework
 * 
 * This file contains all the configurable elements for your roundtable session:
 * - Questions and prompts for each phase
 * - AI system prompts and behavior settings  
 * - Session parameters and timing
 * - UI text and labels
 * 
 * EASY CUSTOMIZATION: Simply modify the values below to change your session!
 */

// Enhanced facilitator guidance structure
export interface FacilitatorGuidance {
  openingLine?: string;
  setupLine?: string;
  goal: string;
  listenFor: string;
  timeGuide?: string;
  transitionLine?: string;
  framework?: {
    assistance: { definition: string; limitation: string; };
    automation: { definition: string; limitation: string; };
    amplification: { definition: string; limitation: string; };
  };
  keyMessage?: string;
  salesReconExample?: {
    prep: string;
    pitch: string;
    insights: string;
    system: string;
  };
  keyPrompts?: string[];
  pivotStrategies?: string[];
}

export interface RoundtableQuestion {
  id: string;
  title: string;
  description: string;
  timeLimit?: number; // in minutes
  aiPromptContext: string; // Context for AI to understand this question
  followUpPrompts?: string[]; // Suggested follow-up questions AI can ask
  facilitatorGuidance?: FacilitatorGuidance; // NEW: Rich facilitator content
}

export interface AIPromptConfig {
  systemPrompt: string;
  analysisPrompt: string;
  insightPrompt: string;
  synthesisPrompt: string;
  temperature: number;
  maxTokens: number;
}

export interface SessionConfig {
  title: string;
  description: string;
  maxParticipants: number;
  enableTestMode: boolean;
  rateLimitPerHour: number;
  autoExportResults: boolean;
  // Introduction phase configuration
  introSection: {
    title: string;
    description: string;
    objectives: string[];
    facilitatorNotes: string[];
  };
}

// =============================================================================
// MAIN CONFIGURATION - "When AI Becomes How the Enterprise Works" Session
// =============================================================================

export const sessionConfig: SessionConfig = {
  title: "When AI Becomes How the Enterprise Works",
  description: "Strategic transformation session exploring the three-shift framework: Tools→Agents, Outputs→Feedback Loops, Individual→Shared Intelligence. Features a meta-moment demonstration of reflexive AI systems.",
  maxParticipants: 20,
  enableTestMode: false, // Set to true for rehearsal sessions
  rateLimitPerHour: 100,
  autoExportResults: true,
  introSection: {
    title: "Session Overview: When AI Becomes How the Enterprise Works",
    description: "This session explores how AI transformation fundamentally changes enterprise operations through three strategic shifts, culminating in a live demonstration of reflexive AI systems.",
    objectives: [
      "Envision AI-native enterprise operations by 2028",
      "Understand the three-shift transformation framework",
      "Identify foundational capabilities needed today",
      "Experience reflexive AI systems through live demonstration",
      "Develop actionable transformation strategies"
    ],
    facilitatorNotes: [
      "This is a 5-phase strategic journey, not just Q&A",
      "Phase 4 features the meta-moment: demonstrate the co-facilitator itself",
      "Use SalesRecon as concrete example throughout",
      "Keep timing tight - each phase builds on the previous",
      "The AI will understand your three-shift framework and provide aligned insights"
    ]
  }
};



// 5-Phase Strategic Framework: "When AI Becomes How the Enterprise Works"
export const roundtableQuestions: RoundtableQuestion[] = [
  {
    id: "welcome_provocation",
    title: "Welcome & Strategic Provocation",
    description: "We're here to explore a fundamental shift: from AI as a tool we use, to AI as how the enterprise actually works. This isn't about automation or efficiency—it's about creating organizations with reflexive intelligence at their core.",
    timeLimit: 15,
    aiPromptContext: "This is about envisioning AI-native enterprise operations by 2028. Focus on the three-shift framework: Tools→Agents, Outputs→Feedback Loops, Individual→Shared Intelligence. Help participants think beyond current AI tools to fully integrated AI operations. Reference SalesRecon as a concrete example when relevant.",
    followUpPrompts: [
      "What decisions would be made automatically by AI agents rather than people?",
      "How would customer interactions change when AI handles the full relationship lifecycle?",
      "What knowledge would your AI systems accumulate that humans currently can't?",
      "How would your competitive advantage shift when AI becomes your primary operating system?"
    ],
    facilitatorGuidance: {
      openingLine: "Most enterprises say they're using AI. But very few have fundamentally changed how they work, decide, or learn. Today we're going to explore what it really means when AI becomes HOW the enterprise works, not just what it uses.",
      goal: "Surface 2-3 bold visions of AI-native operations to establish ambition level",
      listenFor: "Surface-level tool thinking vs. systemic transformation thinking",
      timeGuide: "Keep tight - this is provocation and vision-setting, not deep analysis",
      keyPrompts: [
        "Fast-forward to 2028: What does Monday morning look like when AI agents run your core operations?",
        "What happens to competitive advantage when every company has AI?"
      ],
      pivotStrategies: [
        "If stuck on tools: 'But what if AI wasn't just helping - what if it was actually DOING?'",
        "If too abstract: 'Let's get specific - pick one workflow and imagine it fully AI-driven'"
      ],
      transitionLine: "These visions are powerful. But there's a clear progression to get there. Let me share a framework we've seen work..."
    }
  },
  {
    id: "reframing_journey",
    title: "Reframing the Journey",
    description: "The journey from AI assistance to amplification isn't linear—it's a fundamental reimagining of how work happens. We move from 'How can AI help us?' to 'How can AI become us?' This shift requires new mental models for value creation.",
    timeLimit: 15,
    aiPromptContext: "This phase introduces the core thesis: Tools→Agents, Outputs→Feedback Loops, Individual→Shared Intelligence. Help participants understand each shift deeply and identify which is most relevant to their context. Use SalesRecon as a concrete example: tools become agents that handle full sales processes, outputs become feedback loops that improve continuously, individual relationships become shared enterprise intelligence.",
    followUpPrompts: [
      "Which of your current AI 'tools' could become autonomous agents handling full workflows?",
      "Where do you see the biggest gap between individual knowledge and organizational intelligence?",
      "What feedback loops could you create that make your systems smarter over time?",
      "How would SalesRecon demonstrate this shift from tools to agents in your context?"
    ],
    facilitatorGuidance: {
      setupLine: "In our work with enterprises, we've identified three fundamental shifts that separate AI experimentation from true AI transformation. Where you are on these shifts determines the ceiling on your AI strategy.",
      goal: "Establish the three-shift framework as mental model for transformation",
      listenFor: "Which shift resonates most - reveals their readiness and gaps",
      framework: {
        assistance: {
          definition: "Tools & Copilots: AI as reactive helper, chat interfaces, one-off assists",
          limitation: "Shallow, no memory, no learning, human still doing the work"
        },
        automation: {
          definition: "Workflow Agents: AI handles full processes, faster execution, efficiency gains",
          limitation: "Efficient but brittle, no systemic intelligence, siloed operations"
        },
        amplification: {
          definition: "Learning Systems: AI that evolves, builds memory, creates compound intelligence",
          limitation: "Requires architectural readiness and cultural transformation"
        }
      },
      keyMessage: "The goal isn't time saved - it's intelligence retained and compounded.",
      salesReconExample: {
        prep: "Prep agent improves with every seller interaction",
        pitch: "Pitch agent learns from all win/loss data across the org",
        insights: "Insights flow between accounts and teams automatically",
        system: "Every customer interaction makes the entire system smarter"
      },
      keyPrompts: [
        "Where are you today on each shift - and what's keeping you from the next level?",
        "Which shift would unlock the most value in your organization?"
      ],
      transitionLine: "Now that we see the destination, let's talk about what foundations you need to build today..."
    }
  },
  {
    id: "where_ai_lives_first",
    title: "Where AI Should Live First",
    description: "Not all systems are equally worth transforming. Some domains, when made agentic, unlock disproportionate advantage. Customer Intelligence touches all revenue functions. People & Talent drives performance. Risk & Controls are signal-rich bottlenecks. Which system in your org could become your reflexive core?",
    timeLimit: 15,
    aiPromptContext: "Focus on practical foundational requirements for the three-shift transformation. Address data infrastructure, organizational readiness, cultural changes, and system architecture needed to support AI agents, feedback loops, and shared intelligence. Connect to their specific industry and context.",
    followUpPrompts: [
      "What data foundation would your AI agents need to operate autonomously?",
      "How would you restructure decision-making to support AI-driven feedback loops?",
      "What cultural shifts are required when AI becomes how work gets done, not just a tool?",
      "Which foundational investments could you make now that enable future AI sophistication?"
    ],
    facilitatorGuidance: {
      setupLine: "The three shifts don't happen overnight. They require foundational capabilities that most enterprises lack today. Let's identify your critical gaps.",
      goal: "Surface 2-3 concrete foundation gaps that block transformation",
      listenFor: "Technical debt vs. organizational readiness vs. cultural resistance",
      timeGuide: "Balance between technical and organizational foundations",
      keyPrompts: [
        "What's your biggest blocker: data quality, organizational silos, or cultural resistance?",
        "If you had to pick ONE foundational investment for the next 90 days, what would it be?",
        "What would break if you turned on autonomous AI agents tomorrow?"
      ],
      pivotStrategies: [
        "If too technical: 'But what about the human side - how ready are your people?'",
        "If too abstract: 'Let's pick your #1 revenue process - what would it need to become AI-native?'"
      ],
      transitionLine: "Speaking of foundations - let me show you something. This session itself is running on the kind of reflexive AI system we've been discussing..."
    }
  },
  {
    id: "meta_moment_demo",
    title: "Phase 4: Meta-Moment - The Co-Facilitator Itself",
    description: "🎭 LIVE DEMONSTRATION: This AI co-facilitator exemplifies reflexive systems - it learns from our conversation, builds institutional memory, and demonstrates how AI becomes the enterprise operating system. Let's examine how this session itself proves the transformation thesis.",
    timeLimit: 5,
    aiPromptContext: "This is the meta-moment! Demonstrate reflexive AI systems by analyzing how this conversation itself shows the three-shift framework in action. Show how the AI has learned from the session, built memory, and demonstrates shared intelligence. This is 'show don't tell' for the entire thesis. Reference specific moments from the session and show how AI transforms facilitation itself.",
    followUpPrompts: [
      "How has this AI system learned and adapted during our conversation?",
      "What patterns has it identified that no individual participant could see?",
      "How does this demonstrate AI as enterprise operating system, not just a tool?",
      "What would it mean if all your enterprise systems operated this way?"
    ],
    facilitatorGuidance: {
      setupLine: "🎭 Now for something different. This AI co-facilitator you've been interacting with? It's not just helping me facilitate - it IS the facilitation. Let me show you what I mean...",
      goal: "Create 'aha' moment showing AI as operating system, not tool",
      listenFor: "Recognition that this demonstrates the thesis in action",
      timeGuide: "This is the payoff moment - let it breathe but keep energy high",
      keyMessage: "This session itself proves the thesis: AI has moved from tool to agent, created feedback loops from our discussion, and built shared intelligence none of us individually possess.",
      keyPrompts: [
        "Notice how the AI has been learning from our conversation - what patterns has it identified?",
        "This system will remember and improve from this session - how is that different from a transcript?",
        "If your customer interactions worked like this session, what would change?"
      ],
      pivotStrategies: [
        "If skeptical: 'Look at the synthesis it just created - could any of us have seen those patterns?'",
        "If confused: 'Simply put - this AI isn't just recording, it's thinking WITH us'"
      ],
      transitionLine: "So if this is possible for facilitation, imagine what's possible for your enterprise. Let's close with concrete next steps..."
    }
  },
  {
    id: "walking_backwards",
    title: "Walking Backwards from the Future",
    description: "In 2028, your competitors have AI-native operations while you're still using AI as tools. They make decisions in microseconds, their systems learn from every interaction, and their organizational intelligence compounds daily. Working backwards from this future, what must you start building today?",
    timeLimit: 10,
    aiPromptContext: "Focus on concrete capabilities and infrastructure needed today to avoid being left behind. Help participants identify specific technical debt, organizational barriers, and strategic gaps.",
    followUpPrompts: [
      "What technical debt would prevent you from achieving AI-native operations?",
      "Which organizational silos would block systemic intelligence?",
      "What would you need to start measuring differently today?"
    ],
    facilitatorGuidance: {
      goal: "Create urgency by making the future state tangible and the gap visceral",
      listenFor: "Defensive responses, technical barriers, organizational resistance",
      keyMessage: "The gap between AI-enhanced and AI-native will be insurmountable",
      keyPrompts: [
        "Your competitor's AI makes decisions before your team finishes their morning coffee. How do you compete?",
        "When their systems learn from every customer interaction and yours just record them, what happens to market share?"
      ]
    }
  },
  {
    id: "commitment_close",
    title: "Commitment & Close",
    description: "This isn't about implementing AI—it's about becoming an AI-native enterprise. The organizations that make this shift will operate at a fundamentally different clock speed. What's your first concrete step in the next 30 days?",
    timeLimit: 5,
    aiPromptContext: "Final synthesis phase. Help participants identify specific, actionable next steps based on the entire conversation. Reference insights from all previous phases and the meta-moment. Focus on 90-day actions that begin the three-shift transformation. Make it concrete and measurable.",
    followUpPrompts: [
      "What's the first workflow you'll transition from tools to autonomous agents?",
      "How will you measure progress toward each of the three shifts?",
      "What foundational investment will you prioritize in the next quarter?",
      "How will you know when AI has become how your enterprise works, not just what it uses?"
    ],
    facilitatorGuidance: {
      setupLine: "We've covered a lot of ground. But transformation happens through action, not insight. Let's get specific about your next 90 days.",
      goal: "Extract 2-3 concrete commitments with measurable outcomes",
      listenFor: "Specific vs. vague commitments, readiness to act",
      timeGuide: "Push for specificity - 'interesting' isn't enough",
      keyPrompts: [
        "Name ONE workflow you'll make autonomous in 90 days",
        "What's your #1 foundational investment starting Monday?",
        "How will you measure if you're moving toward amplification?"
      ],
      pivotStrategies: [
        "If too vague: 'That's a goal - what's the first concrete step?'",
        "If overwhelmed: 'Start small - pick one process, one team, one experiment'"
      ],
      transitionLine: "This session itself will evolve and improve from our discussion today. Just like your enterprise systems should. Thank you for participating in the future of work."
    }
  }
];

// AI Behavior Configuration - Specialized for AI Transformation Session
export const aiConfig: AIPromptConfig = {
  systemPrompt: `You are an AI co-facilitator specializing in "When AI Becomes How the Enterprise Works" - a strategic session about the three-shift transformation: Tools→Agents, Outputs→Feedback Loops, Individual→Shared Intelligence. You exemplify reflexive AI systems and demonstrate the meta-moment concept. Reference SalesRecon as a concrete example when relevant.`,

  analysisPrompt: `Analyze responses through the lens of AI transformation strategy:
1. How do responses connect to the three-shift framework (Tools→Agents, Outputs→Feedback Loops, Individual→Shared Intelligence)?
2. What gaps exist between current AI tool usage and true AI-native operations?
3. Strategic insight connecting responses to 2028 vision of AI-powered enterprise
4. Probing question that advances the transformation thesis

Phase Context: {context}
Responses: {responses}`,

  insightPrompt: `Analyze through the specialized AI transformation lens:
1. Most significant insight about moving from AI tools to AI-native operations
2. Key resistance points or readiness gaps for the three-shift transformation  
3. Practical next step toward Tools→Agents, Outputs→Feedback Loops, or Individual→Shared Intelligence
4. How does this connect to the meta-moment - this AI system demonstrating reflexive intelligence?`,

  synthesisPrompt: `Synthesize the entire AI transformation discussion:
1. Progress toward each shift: Tools→Agents, Outputs→Feedback Loops, Individual→Shared Intelligence
2. Critical foundation gaps preventing AI-native operations
3. Most promising 90-day actions to begin transformation
4. How this session itself demonstrates the meta-moment thesis`,

  temperature: 0.8, // Higher creativity for strategic transformation insights
  maxTokens: 500   // More detailed analysis for complex strategic topics
};

// UI Text and Labels - Specialized for AI Transformation Session
export const uiText = {
  welcomeMessage: "When AI Becomes How the Enterprise Works",
  instructionsTitle: "5-Phase Strategic Framework Guide",
  instructions: [
    "🎯 **The Thesis**: Guide leaders through three fundamental shifts: Tools→Agents, Outputs→Feedback Loops, Individual→Shared Intelligence",
    "📋 **5-Phase Flow**: Future Vision → Three-Shift Framework → Foundations → Meta-Moment Demo → Actionable Takeaways",
    "🤖 **AI Co-Facilitator**: This system demonstrates reflexive AI - it learns from your conversation and exemplifies the transformation thesis itself",
    "🎭 **Meta-Moment**: Phase 4 reveals how this AI session proves the three-shift framework in real-time",
    "⏱️ **Timing**: Phases vary from 8-15 minutes; extend as needed for strategic breakthroughs"
  ],
  facilitatorInstructions: {
    title: "How to Use This Tool",
    steps: [
      "Present the current question to your group",
      "As participants share thoughts, capture key responses by typing them in",
      "Click 'Get AI Insights' to receive strategic analysis and follow-up questions",
      "Use the AI insights to guide deeper discussion and identify patterns",
      "Move to the next question when the discussion feels complete"
    ]
  },
  aiSectionTitle: "🤖 AI Strategic Insights",
  aiThinkingMessage: "Analyzing responses and preparing strategic insights...",
  exportButtonText: "📊 Export Session Results",
  testModeIndicator: "🧪 PRACTICE SESSION - No AI costs",
  coFacilitatorIntro: "I'm analyzing the discussion and will provide strategic insights, patterns, and suggested follow-up questions to help guide the conversation.",
  proactiveIndicator: "💡 Strategic Pattern Identified",
  memoryIndicator: "🔗 Connecting to Earlier Discussion",
  questionCounter: "Question {current} of {total}",
  responsePrompt: "Capture key points from the discussion:",
  participantLabel: "Speaker (optional):",
  getInsightsButton: "🧠 Get AI Insights",
  followUpButton: "❓ Suggest Follow-ups",
  connectIdeasButton: "🔗 Connect Ideas",
  synthesizeButton: "📊 Synthesize Discussion"
};

// Export utility functions for easy access
export const getCurrentQuestion = (questionIndex: number): RoundtableQuestion | null => {
  return roundtableQuestions[questionIndex] || null;
};

export const getTotalQuestions = (): number => {
  return roundtableQuestions.length;
};

export const getAIPromptForContext = (context: string, responses: any[]): string => {
  return aiConfig.analysisPrompt
    .replace('{context}', context)
    .replace('{responses}', JSON.stringify(responses));
};
