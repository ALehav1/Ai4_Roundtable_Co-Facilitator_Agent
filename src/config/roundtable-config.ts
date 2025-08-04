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

export interface RoundtableQuestion {
  id: string;
  title: string;
  description: string;
  timeLimit?: number; // in minutes
  aiPromptContext: string; // Context for AI to understand this question
  followUpPrompts?: string[]; // Suggested follow-up questions AI can ask
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
    id: "future_vision_2028",
    title: "Phase 1: Future Vision - Enterprise Operations in 2028",
    description: "Imagine your enterprise fully transformed by AI. Instead of people using AI tools, AI agents handle entire workflows. What does day-to-day operations look like when AI becomes how your enterprise actually works?",
    timeLimit: 12,
    aiPromptContext: "This is about envisioning AI-native enterprise operations by 2028. Focus on the three-shift framework: Tools→Agents, Outputs→Feedback Loops, Individual→Shared Intelligence. Help participants think beyond current AI tools to fully integrated AI operations. Reference SalesRecon as a concrete example when relevant.",
    followUpPrompts: [
      "What decisions would be made automatically by AI agents rather than people?",
      "How would customer interactions change when AI handles the full relationship lifecycle?",
      "What knowledge would your AI systems accumulate that humans currently can't?",
      "How would your competitive advantage shift when AI becomes your primary operating system?"
    ]
  },
  {
    id: "three_shift_framework",
    title: "Phase 2: The Three-Shift Framework - Your Transformation Thesis",
    description: "Three fundamental shifts define AI transformation: Tools→Agents (AI takes over entire workflows), Outputs→Feedback Loops (systems learn and improve continuously), Individual→Shared Intelligence (organizational knowledge becomes systemic). Which shift is most critical for your enterprise?",
    timeLimit: 15,
    aiPromptContext: "This phase introduces the core thesis: Tools→Agents, Outputs→Feedback Loops, Individual→Shared Intelligence. Help participants understand each shift deeply and identify which is most relevant to their context. Use SalesRecon as a concrete example: tools become agents that handle full sales processes, outputs become feedback loops that improve continuously, individual relationships become shared enterprise intelligence.",
    followUpPrompts: [
      "Which of your current AI 'tools' could become autonomous agents handling full workflows?",
      "Where do you see the biggest gap between individual knowledge and organizational intelligence?",
      "What feedback loops could you create that make your systems smarter over time?",
      "How would SalesRecon demonstrate this shift from tools to agents in your context?"
    ]
  },
  {
    id: "foundations_discussion",
    title: "Phase 3: Foundations Discussion - What's Needed Today",
    description: "To enable AI-native operations, you need foundational capabilities today: data architecture that supports learning, organizational culture that embraces AI agents, and systems designed for continuous feedback loops. What are your critical foundation gaps?",
    timeLimit: 12,
    aiPromptContext: "Focus on practical foundational requirements for the three-shift transformation. Address data infrastructure, organizational readiness, cultural changes, and system architecture needed to support AI agents, feedback loops, and shared intelligence. Connect to their specific industry and context.",
    followUpPrompts: [
      "What data foundation would your AI agents need to operate autonomously?",
      "How would you restructure decision-making to support AI-driven feedback loops?",
      "What cultural shifts are required when AI becomes how work gets done, not just a tool?",
      "Which foundational investments could you make now that enable future AI sophistication?"
    ]
  },
  {
    id: "meta_moment_demo",
    title: "Phase 4: Meta-Moment - The Co-Facilitator Itself",
    description: "🎭 LIVE DEMONSTRATION: This AI co-facilitator exemplifies reflexive systems - it learns from our conversation, builds institutional memory, and demonstrates how AI becomes the enterprise operating system. Let's examine how this session itself proves the transformation thesis.",
    timeLimit: 10,
    aiPromptContext: "This is the meta-moment! Demonstrate reflexive AI systems by analyzing how this conversation itself shows the three-shift framework in action. Show how the AI has learned from the session, built memory, and demonstrates shared intelligence. This is 'show don't tell' for the entire thesis. Reference specific moments from the session and show how AI transforms facilitation itself.",
    followUpPrompts: [
      "How has this AI system learned and adapted during our conversation?",
      "What patterns has it identified that no individual participant could see?",
      "How does this demonstrate AI as enterprise operating system, not just a tool?",
      "What would it mean if all your enterprise systems operated this way?"
    ]
  },
  {
    id: "closing_reflection",
    title: "Phase 5: Closing Reflection - Actionable Takeaways",
    description: "Synthesizing everything: What are your concrete next steps to begin this transformation? What will you do differently in the next 90 days? How will you measure progress toward AI-native operations?",
    timeLimit: 8,
    aiPromptContext: "Final synthesis phase. Help participants identify specific, actionable next steps based on the entire conversation. Reference insights from all previous phases and the meta-moment. Focus on 90-day actions that begin the three-shift transformation. Make it concrete and measurable.",
    followUpPrompts: [
      "What's the first workflow you'll transition from tools to autonomous agents?",
      "How will you measure progress toward each of the three shifts?",
      "What foundational investment will you prioritize in the next quarter?",
      "How will you know when AI has become how your enterprise works, not just what it uses?"
    ]
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
