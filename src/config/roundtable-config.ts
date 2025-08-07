/**
 * Configuration for "When AI Becomes How the Enterprise Works" Session
 * DO NOT USE GENERIC PLACEHOLDERS - This is the ACTUAL session content
 */

export interface RoundtableQuestion {
  id: string;
  title: string;
  description: string;
  timeLimit: number;
  facilitatorGuidance: {
    openingLine?: string;
    setupLine?: string;
    goal: string;
    listenFor: string;
    timeGuide?: string;
    transitionLine?: string;
    keyPrompts: string[];
    framework?: {
      assistance: { definition: string; limitation: string };
      automation: { definition: string; limitation: string };
      amplification: { definition: string; requirement: string };
    };
    salesReconExample?: {
      prep: string;
      pitch: string;
      insights: string;
      system: string;
    };
  };
  aiPromptContext: string;
  followUpPrompts: string[];
}

export interface SessionConfig {
  title: string;
  description: string;
  totalDuration: number;
  enableTestMode: boolean;
  rateLimitPerHour: number;
}

// ACTUAL SESSION CONFIGURATION - NOT PLACEHOLDERS
export const sessionConfig: SessionConfig = {
  title: 'When AI Becomes How the Enterprise Works',
  description: 'Executive roundtable on AI transformation from assistance to amplification',
  totalDuration: 50, // minutes
  enableTestMode: false,
  rateLimitPerHour: 100
};

// THE ACTUAL 5 PHASES - MUST LOAD IN ORDER
export const roundtableQuestions: RoundtableQuestion[] = [
  {
    id: "strategic_provocation",
    title: "Welcome & Strategic Provocation",
    description: "Most enterprises say they're using AI. But very few have changed how they work, decide, or learn.",
    timeLimit: 5,
    facilitatorGuidance: {
      openingLine: "Most enterprises say they're using AI. But very few have changed how they work, decide, or learn.",
      goal: "Surface 2-3 perspectives to reveal mindset diversity",
      listenFor: "Surface-level vs. systemic thinking about AI",
      timeGuide: "Keep tight - this is provocation, not deep dive",
      transitionLine: "This session is about what it really takes to move from AI experimentation to transformation.",
      keyPrompts: [
        "Fast-forward 3-5 years: What's the best outcome—and the worst—for your org because of AI?",
        "What are you doing today to tilt toward the best?"
      ]
    },
    aiPromptContext: "Analyze for mindset diversity about AI transformation. Look for surface-level tool adoption vs. systemic transformation thinking.",
    followUpPrompts: [
      "Fast-forward 3-5 years: What's the best outcome—and the worst—for your org because of AI?",
      "What are you doing today to tilt toward the best outcome?"
    ]
  },
  {
    id: "reframing_journey",
    title: "Reframing the Journey",
    description: "In our work, we've seen a clear progression. Where you sit on this curve determines the ceiling on your AI strategy.",
    timeLimit: 15,
    facilitatorGuidance: {
      setupLine: "In our work, we've seen a clear progression. Where you sit on this curve determines the ceiling on your AI strategy.",
      goal: "Establish common framework for AI maturity",
      listenFor: "Where organizations actually sit vs. where they think they sit",
      framework: {
        assistance: {
          definition: "Copilots, chat interfaces, reactive helpers",
          limitation: "Shallow, one-off, no memory"
        },
        automation: {
          definition: "Workflow streamlining, faster execution",
          limitation: "Efficient but brittle, no systemic intelligence"
        },
        amplification: {
          definition: "Agentic systems that learn, adapt, and evolve",
          requirement: "Requires architectural and cultural readiness"
        }
      },
      salesReconExample: {
        prep: "Prep agent improves with seller interaction",
        pitch: "Pitch agent learns from win/loss data",
        insights: "Insights flow across teams",
        system: "Every action strengthens the system"
      },
      keyPrompts: [
        "Where are you today on this spectrum—and what's keeping you from amplification?"
      ]
    },
    aiPromptContext: "Assess where participants sit on the Assistance → Automation → Amplification progression. Reference SalesRecon as concrete example when relevant.",
    followUpPrompts: [
      "Where are you today on this spectrum—and what's keeping you from amplification?",
      "What would need to change to move from assistance to amplification?"
    ]
  },
  {
    id: "prioritization_systems",
    title: "Where AI Should Live First",
    description: "Not all systems are equally worth transforming. Some domains, when made agentic, unlock disproportionate advantage.",
    timeLimit: 15,
    facilitatorGuidance: {
      setupLine: "Not all systems are equally worth transforming. Some domains, when made agentic, unlock disproportionate advantage.",
      goal: "Identify high-leverage systems for transformation priority",
      listenFor: "Systems with natural feedback loops and learning potential",
      keyPrompts: [
        "Which system in your org could become your reflexive core—the place where intelligence compounds over time?",
        "Where are you already producing learning exhaust but not using it?"
      ]
    },
    aiPromptContext: "Identify which high-leverage systems participants are discussing: Customer Intelligence (all revenue functions), People & Talent, Risk & Controls, Decision-making. Focus on their 'reflexive core' opportunity.",
    followUpPrompts: [
      "Which system in your org could become your reflexive core—where intelligence compounds?",
      "Where are you already producing learning exhaust but not using it?"
    ]
  },
  {
    id: "walking_backwards",
    title: "Walking Backwards from the Future",
    description: "If that future of amplification is where you want to go—what needs to be true today to make it possible?",
    timeLimit: 10,
    facilitatorGuidance: {
      setupLine: "If that future of amplification is where you want to go—what needs to be true today to make it possible?",
      goal: "Connect future vision to present-day design choices",
      listenFor: "Specific gaps in current systems and architecture",
      keyPrompts: [
        "Are your current systems designed to learn with use—or just execute faster?",
        "Where are your feedback loops incomplete or broken?",
        "Are your people in the loop to teach the system, or just monitor it?",
        "What signal are you collecting—but not structuring or reusing?"
      ]
    },
    aiPromptContext: "Identify gaps between current state and amplification vision: missing feedback loops, lack of learning mechanisms, unstructured data exhaust, human-in-the-loop gaps.",
    followUpPrompts: [
      "Are your current systems designed to learn with use—or just execute faster?",
      "Where are your feedback loops incomplete or broken?"
    ]
  },
  {
    id: "commitment_close",
    title: "Commitment & Close",
    description: "This isn't about better dashboards or faster automation. It's about whether you're building a system that learns.",
    timeLimit: 5,
    facilitatorGuidance: {
      setupLine: "This isn't about better dashboards or faster automation. It's about whether you're building a system that learns.",
      goal: "Anchor insights in personal commitment",
      listenFor: "Specific commitments and next steps",
      timeGuide: "Brief round-robin, not deep discussion",
      keyPrompts: [
        "What's one mindset shift you're taking back?",
        "What's one thing your org is underinvesting in?",
        "What's one system you want to make agentic over the next 12 months?"
      ]
    },
    aiPromptContext: "Extract specific commitments and next steps. Focus on mindset shifts, investment gaps, and systems to make agentic.",
    followUpPrompts: [
      "What's one mindset shift you're taking back?",
      "What's one system you want to make agentic over the next 12 months?"
    ]
  }
];

// AI Configuration with FRAMEWORK understanding
export const aiConfig = {
  systemPrompt: `You are an AI co-facilitator for "When AI Becomes How the Enterprise Works" - an executive session about AI transformation.

CRITICAL FRAMEWORK - You MUST understand and reference this:
- ASSISTANCE: Copilots, reactive helpers (shallow, no memory)
- AUTOMATION: Workflow streamlining (efficient but brittle)
- AMPLIFICATION: Systems that learn and evolve (the goal)

Key principle: "It's not about time saved. It's about intelligence retained."

When analyzing responses, ALWAYS consider where participants sit on this progression and what's preventing them from reaching amplification.`,

  temperature: 0.7,
  maxTokens: 400
};

// UI Text - Keep minimal
export const uiText = {
  sessionTitle: sessionConfig.title,
  exportButtonText: "Export Session PDF",
  placeholderText: "Enter participant response..."
};

// Utility functions for backward compatibility
export const getCurrentQuestion = (questionIndex: number): RoundtableQuestion | null => {
  return roundtableQuestions[questionIndex] || null;
};

export const getTotalQuestions = (): number => {
  return roundtableQuestions.length;
};

// Export FacilitatorGuidance type for components
export interface FacilitatorGuidance {
  openingLine?: string;
  setupLine?: string;
  goal: string;
  listenFor: string;
  timeGuide?: string;
  transitionLine?: string;
  keyPrompts: string[];
  framework?: {
    assistance: { definition: string; limitation: string };
    automation: { definition: string; limitation: string };
    amplification: { definition: string; requirement: string };
  };
  salesReconExample?: {
    prep: string;
    pitch: string;
    insights: string;
    system: string;
  };
}
