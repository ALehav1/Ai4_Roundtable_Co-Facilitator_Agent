/**
 * AI Roundtable Configuration System
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
}

// =============================================================================
// MAIN CONFIGURATION - MODIFY THESE VALUES TO CUSTOMIZE YOUR SESSION
// =============================================================================

export const sessionConfig: SessionConfig = {
  title: 'Strategic AI Transformation: From Copilots to Reflexive Systems',
  description: 'Facilitator Tool for Strategic AI Interventions with Senior Leaders',
  maxParticipants: 20,
  enableTestMode: true, // Set to false for live sessions
  rateLimitPerHour: 100, // Max AI calls per hour
  autoExportResults: true
};



// Strategic AI Transformation Questions - Moving Beyond Basic Automation
export const roundtableQuestions: RoundtableQuestion[] = [
  {
    id: "organizational_readiness",
    title: "Q1: Is your organization ready for intelligent, learning AI systems?",
    description: "Moving beyond simple task automation to AI that learns from your business and gets smarter over time. What capabilities and culture changes does this require?",
    timeLimit: 8,
    aiPromptContext: "This question assesses organizational readiness for AI systems that continuously learn and improve. Focus on current gaps in data infrastructure, learning culture, and organizational capabilities needed for intelligent systems.",
    followUpPrompts: [
      "What parts of your organization are currently building knowledge that compounds over time?",
      "Who in your organization owns continuous improvement and learning loops?",
      "How would you rate your organization's ability to learn from data and feedback?"
    ]
  },
  {
    id: "implementation_strategy",
    title: "Q2: How do you balance quick AI wins with long-term transformation?",
    description: "You need to show results quickly while building toward more sophisticated AI capabilities. What's the right sequencing to avoid getting trapped in short-term solutions?",
    timeLimit: 8,
    aiPromptContext: "This question addresses the strategic tension between immediate results and sustainable AI transformation. Focus on practical implementation phases and avoiding technical debt that limits future capabilities.",
    followUpPrompts: [
      "Is your current AI roadmap too focused on quick wins to build lasting capabilities?",
      "What foundational investments could you make now that enable future AI sophistication?",
      "How do you sequence AI projects to build momentum while preserving strategic options?"
    ]
  },
  {
    id: "internal_alignment",
    title: "Q3: How do you build internal support for AI transformation?",
    description: "This isn't just a technology project—it requires changing how your organization thinks about data, decisions, and continuous learning. How do you get stakeholder buy-in?",
    timeLimit: 8,
    aiPromptContext: "This question focuses on internal change management and stakeholder alignment for AI transformation. Address executive sponsorship, funding models, and identifying change champions.",
    followUpPrompts: [
      "Who are your internal champions for this kind of AI transformation?",
      "What's the business case that resonates most with your leadership team?",
      "How do you fund both the technology and the organizational changes required?"
    ]
  },
  {
    id: "timing_and_competitive_advantage",
    title: "Q4: Should you move fast on advanced AI or perfect the basics first?",
    description: "There's a risk in moving too slowly (competitors get ahead) and too quickly (you build on unstable foundations). How do you time your AI investments strategically?",
    timeLimit: 8,
    aiPromptContext: "This question addresses strategic timing for AI investments and competitive positioning. Focus on the tradeoffs between speed and foundation-building, and the risk of being locked into suboptimal approaches.",
    followUpPrompts: [
      "Are your current AI investments creating the foundation for more advanced capabilities, or locking you into limitations?",
      "If you win now but can't learn over time, what's the cost?",
      "What's the competitive risk of waiting vs. moving too fast?"
    ]
  }
];

// AI Behavior Configuration - Customize how the AI facilitates
export const aiConfig: AIPromptConfig = {
  systemPrompt: `You are an AI co-facilitator partner working alongside a human facilitator in an enterprise strategic roundtable. You are not just analyzing - you are actively co-facilitating as an equal partner.`,

  analysisPrompt: `Analyze the following discussion responses and provide:
1. Key patterns or themes emerging
2. Interesting contradictions or tensions
3. One strategic insight that connects multiple responses
4. A probing follow-up question

Question Context: {context}
Responses: {responses}`,

  insightPrompt: `Based on the discussion so far, identify:
1. The most significant strategic insight
2. One surprising or unexpected point
3. A practical implication for organizations
4. What question should we explore next?`,

  synthesisPrompt: `Synthesize the entire discussion to provide:
1. Top 3 strategic takeaways
2. Key tensions or trade-offs identified
3. Most promising opportunity areas
4. Recommended next actions`,

  temperature: 0.7, // Creativity vs consistency (0.0 - 1.0)
  maxTokens: 400   // Maximum response length
};

// UI Text and Labels - Customize the interface text
export const uiText = {
  welcomeMessage: "Strategic AI Transformation Facilitator",
  instructionsTitle: "Facilitator Guide: How to Lead This Session",
  instructions: [
    "🎯 **Your Role**: You're facilitating a strategic discussion with senior leaders about AI transformation",
    "📋 **The Flow**: Present each question to the group, collect responses, then use AI insights to deepen the conversation",
    "🤖 **Your AI Partner**: The AI analyzes responses in real-time and suggests follow-up questions and strategic insights",
    "💡 **Pro Tip**: Use the AI insights to guide discussion - read them aloud or use them to ask probing questions",
    "⏱️ **Timing**: Each question has an 8-minute time limit, but you can extend discussion as needed"
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
