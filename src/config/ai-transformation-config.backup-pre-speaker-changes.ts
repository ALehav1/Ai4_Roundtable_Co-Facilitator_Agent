/**
 * Complete Configuration for "When AI Becomes How the Enterprise Works" Session
 * Executive roundtable on AI transformation from assistance to amplification
 */

// Define proper interfaces
export interface FacilitatorGuidance {
  openingLine?: string;
  setupLine?: string;
  objective: string;
  keyPrompt?: string;
  keyMessage?: string;
  facilitatorPrompt?: string;
  facilitatorPrompts?: string[];
  whatToListenFor?: string[];
  facilitationTips?: string[];
  presentationNotes?: string[];
  transitionLine?: string;
  approach?: string;
  closingMessage?: string;
  closing?: string;
  focus?: string;
  discussionPrompts?: string[];
  keyCapabilities?: string[];
  optionalActivity?: string;
  facilitation?: string[];
  framework?: {
    title: string;
    stages: {
      name: string;
      definition: string;
      limitation: string;
    }[];
  };
  keyFramework?: {
    title: string;
    systems: {
      name: string;
      rationale: string;
    }[];
  };
  exampleToShare?: {
    name: string;
    points: string[];
  };
}

export interface RoundtableQuestion {
  id: string;
  title: string;
  description: string;
  timeLimit: number;
  facilitatorGuidance: FacilitatorGuidance;
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

/**
 * YOUR ACTUAL SESSION CONTENT - "When AI Becomes How the Enterprise Works"
 */
export const AI_TRANSFORMATION_QUESTIONS: RoundtableQuestion[] = [
  {
    id: "phase-1-provocation",
    title: "Phase 1: Welcome & Strategic Provocation — Setting the Stakes",
    description: "Introductions and strategic framing",
    timeLimit: 8,
    facilitatorGuidance: {
      openingLine: "Welcome to our executive roundtable on AI transformation. Let's start with quick introductions — and begin surfacing what's really at stake for your organization.",
      objective: "Build context through introductions, then surface assumptions, fears, and levels of maturity — and note whether participants frame their priorities as one-off projects or as evolving feedback loops.",
      keyPrompt: "Please introduce yourself: Name, organization, role — and briefly, what's your biggest AI priority and your biggest challenge right now? Frame it in terms of what could compound value for your organization over time.",
      whatToListenFor: [
        "Range of AI maturity levels across participants",
        "Common challenges and priorities emerging",
        "Industry/functional diversity in the room",
        "Leadership vs. tactical perspectives",
        "Signs of loop-based thinking vs. tool/project thinking"
      ],
      facilitationTips: [
        "Keep introductions crisp (1-2 minutes each)",
        "Note AI maturity patterns for strategic framing",
        "Listen for common themes to reference later",
        "If someone gives a loop example ('this keeps getting better over time'), highlight it for the group as a different kind of thinking"
      ],
      transitionLine: "Thank you. Now that we know who's here, let's get provocative. Most enterprises say they're using AI. But very few have changed how they work, decide, or learn. Fast-forward 3–5 years: What's the best outcome—and the worst—for your organization because of AI? And what are you doing today to tilt toward the best?"
    },
    aiPromptContext: "This is the opening provocation. Look for patterns in how participants view AI's future impact - both positive and negative scenarios. Focus on their level of AI maturity and transformation readiness.",
    followUpPrompts: [
      "What specific fears are driving your worst-case scenario?",
      "What organizational changes would be needed for your best case?",
      "How are other companies in your industry approaching this?"
    ]
  },
  {
    id: "phase-2-reframing",
    title: "Phase 2: Reframing the Journey", 
    description: "Introduce the Assistance → Automation → Amplification framework",
    timeLimit: 15,
    facilitatorGuidance: {
      setupLine: "In our work, we've seen a clear progression — and where you sit on this curve determines the ceiling on your AI strategy. This progression is also a shift from AI as a one-way helper to AI as a bidirectional collaborator.",
      objective: "Help participants see beyond current AI use to systemic transformation — specifically, toward AI as a bidirectional collaborator embedded in reflexive systems.",
      framework: {
        title: "The Core Shift: Assistance → Automation → Amplification",
        stages: [
          {
            name: "Assistance",
            definition: "Copilots, chat interfaces, reactive helpers",
            limitation: "Shallow, one-off, no memory"
          },
          {
            name: "Automation",
            definition: "Workflow streamlining, faster execution", 
            limitation: "Efficient but brittle, no systemic intelligence"
          },
          {
            name: "Amplification",
            definition: "Bidirectional collaborators — agentic systems that learn from humans, ask clarifying questions, and teach back",
            limitation: "Requires architecture + culture"
          }
        ]
      },
      keyMessage: "Amplification is the goal. It's not about time saved. It's about intelligence retained and systems that improve with use.",
      exampleToShare: {
        name: "SalesRecon",
        points: [
          "Prep agent improves with seller interaction",
          "Pitch agent learns from win/loss data",
          "Insights flow across teams",
          "Every action strengthens the system"
        ]
      },
      facilitatorPrompt: "Where are you today on this spectrum—and what's keeping you from amplification?",
      presentationNotes: [
        "Draw the progression visually if possible",
        "Use SalesRecon as concrete example",
        "Emphasize: this isn't about better tools, it's about learning systems"
      ],
      whatToListenFor: [
        "Where organizations self-identify on the spectrum",
        "Barriers they identify to reaching amplification",
        "Understanding of feedback loops and learning systems",
        "Recognition of loops, not just tools, and awareness of cultural/architectural readiness"
      ]
    },
    aiPromptContext: "Participants are discussing the Assistance → Automation → Amplification framework. Focus on where they see themselves and what's blocking progress. Look for understanding of systemic transformation vs. tool adoption.",
    followUpPrompts: [
      "What would need to change culturally to reach amplification?",
      "Which of your current AI initiatives could evolve into learning systems?",
      "What's the cost of staying at the assistance level?"
    ]
  },
  {
    id: "phase-3-prioritization",
    title: "Phase 3: Where AI Creates Compounding Advantage",
    description: "Identify high-leverage systems for AI transformation",
    timeLimit: 15,
    facilitatorGuidance: {
      openingLine: "Not all systems are equally worth transforming. Focus where learning compounds — where today's insight makes tomorrow's decision better.",
      objective: "Help participants identify their highest-value AI transformation opportunities — and ensure those opportunities are framed as loops, not point solutions.",
      keyFramework: {
        title: "High-Leverage Systems for Compounding Advantage",
        systems: [
          {
            name: "Customer Intelligence",
            rationale: "Every interaction teaches the system"
          },
          {
            name: "Operational Decisions",
            rationale: "Patterns improve with each cycle"
          },
          {
            name: "Knowledge Work",
            rationale: "Expertise scales across teams"
          },
          {
            name: "Process Optimization",
            rationale: "Self-improving systems"
          }
        ]
      },
      facilitatorPrompts: [
        "Which system in your org would most benefit from learning and improving every time it's used?",
        "Where do you already have valuable learning exhaust that's going unused — and what would happen if it fed a feedback loop?"
      ],
      facilitation: [
        "Push beyond obvious use cases",
        "Look for systems that touch multiple functions",
        "Identify where learning compounds"
      ],
      optionalActivity: "Use AI co-facilitator to live-cluster responses or identify patterns"
    },
    aiPromptContext: "Participants are identifying which organizational systems would benefit most from AI transformation. Look for patterns in their choices and rationales. Focus on systems thinking and cross-functional impact.",
    followUpPrompts: [
      "What data exhaust are you currently wasting in that system?",
      "How would transforming that system impact adjacent functions?",
      "What's preventing you from starting there today?"
    ]
  },
  {
    id: "phase-4-backwards",
    title: "Phase 4: Walking Backwards from the Future",
    description: "Identify what needs to be true today to enable the AI-transformed future",
    timeLimit: 10,
    facilitatorGuidance: {
      setupLine: "If that future state is compelling — what needs to be true today? Let's walk it backwards, starting from the loops you want running in the future.",
      objective: "Connect long-term vision to near-term actions — focusing on making loops possible and visible.",
      discussionPrompts: [
        "Are your current systems designed to learn with use—or just execute faster?",
        "Where are your feedback loops incomplete or broken?",
        "Are your people in the loop to teach the system, or just monitor it? Do your systems ask for clarification when needed — and are loops visible to the people contributing to them?",
        "What signal are you collecting—but not structuring or reusing?"
      ],
      keyCapabilities: [
        "Event stores as institutional memory",
        "Semantic routing to enable scoped reasoning",
        "Bounded contexts that allow agents to specialize safely",
        "Human feedback as long-term signal—not just short-term guardrails"
      ],
      focus: "This is about foundations, not features",
      whatToListenFor: [
        "Recognition of architectural gaps",
        "Cultural barriers to AI adoption",
        "Understanding of feedback loops and learning systems"
      ]
    },
    aiPromptContext: "Participants are working backwards from their AI vision to identify what foundations need to be in place today. Focus on technical, cultural, and organizational prerequisites.",
    followUpPrompts: [
      "Which of these foundations is most missing in your organization?",
      "What would it take to implement event stores or semantic routing?",
      "How can you start building these capabilities incrementally?"
    ]
  },
  {
    id: "phase-5-commitment",
    title: "Phase 5: Commitment & Close",
    description: "Personal reflection and commitment to action",
    timeLimit: 5,
    facilitatorGuidance: {
      openingLine: "We've covered a lot of ground. Let's make it actionable — and identify one loop you can start or strengthen right away.",
      objective: "Anchor insights in personal commitment",
      facilitatorPrompts: [
        "What's one mindset shift you're taking back?",
        "What's one thing your org is underinvesting in?",
        "What's one system you want to make agentic over the next 12 months?",
        "What's one feedback loop in your org you now see differently?"
      ],
      approach: "Round-robin or popcorn style",
      closingMessage: "This is a systems transformation — from tools to reflexive systems that retain and compound intelligence. The measure of AI's impact isn't time saved. It's intelligence saved — and shared.",
      closing: "Loop back to the session title and core thesis"
    },
    aiPromptContext: "Final reflections and commitments. Look for themes in what participants are taking away. Focus on concrete actions and mindset shifts.",
    followUpPrompts: [
      "What's your first concrete step when you get back to the office?",
      "Who else in your organization needs to hear this message?",
      "How will you measure progress toward amplification?"
    ]
  }
];

/**
 * Session Configuration
 */
export const sessionConfig: SessionConfig = {
  title: "When AI Becomes How the Enterprise Works",
  description: "Executive roundtable on AI transformation from assistance to amplification",
  totalDuration: 50,
  enableTestMode: false,
  rateLimitPerHour: 100
};

/**
 * Export the questions array as the default for the app
 */
export const roundtableQuestions = AI_TRANSFORMATION_QUESTIONS;

export const getCurrentQuestion = (index: number): RoundtableQuestion | undefined => {
  return roundtableQuestions[index];
};

export const getTotalQuestions = (): number => {
  return roundtableQuestions.length;
};

/**
 * UI Text Configuration
 */
export const uiText = {
  appTitle: "AI Strategic Co-Facilitator",
  welcomeMessage: "Welcome to the AI Transformation Roundtable",
  sessionIntro: "This 50-minute executive session explores what it takes to move from AI experimentation to true transformation.",
  
  buttons: {
    startRecording: "Start Recording",
    stopRecording: "Stop Recording",
    addEntry: "Add Manual Entry",
    nextQuestion: "Next Phase",
    previousQuestion: "Previous Phase",
    generateSummary: "Generate Executive Summary",
    exportPDF: "Export PDF Report",
    exportCSV: "Export Data (CSV)",
    getInsights: "Generate Strategic Insights",
    getSynthesis: "Synthesize Discussion", 
    getFollowUp: "Suggest Follow-up Questions",
    getCrossReference: "Cross-Reference Insights"
  },
  
  labels: {
    participantName: "Speaker Name",
    questionNumber: "Phase",
    timeRemaining: "Time Remaining",
    sessionProgress: "Session Progress",
    transcriptSection: "Discussion Transcript",
    aiInsightsSection: "AI Strategic Analysis",
    summarySection: "Executive Summary"
  },
  
  placeholders: {
    participantNameInput: "Enter speaker name",
    responseInput: "Enter response or click microphone to record",
    manualEntryInput: "Type or paste response here"
  },
  
  messages: {
    noTranscript: "No responses captured yet. Start the discussion to see the transcript.",
    noInsights: "Click 'Generate Strategic Insights' to see AI analysis.",
    recordingInProgress: "Recording... Speak clearly into your microphone.",
    processingResponse: "Processing response...",
    generatingSummary: "Generating executive summary...",
    exportReady: "Your export is ready for download.",
    errorGeneric: "An error occurred. Please try again.",
    errorNoMicrophone: "No microphone detected. Please check your settings or use manual entry.",
    errorSpeechNotSupported: "Speech recognition is not supported in your browser. Please use Chrome or Edge.",
    sessionComplete: "Session complete! Generate your executive summary below."
  }
};
