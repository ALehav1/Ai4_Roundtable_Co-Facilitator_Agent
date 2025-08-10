// Semantic Pattern Categories for Flexible Facilitator Detection
export const FACILITATOR_SEMANTIC_PATTERNS = {
  // Greetings & Openings - Any welcoming/opening language
  GREETINGS: [
    /\b(hi|hello|good morning|good afternoon|welcome|greetings)\b/i,
    /\b(thank you for (joining|coming)|thanks for being here)\b/i,
    /\b(let's (begin|start|get started)|shall we begin)\b/i
  ],
  
  // Group Questions - Questions directed at participants
  GROUP_QUESTIONS: [
    /\b(what do you (think|feel|believe|see))\b/i,
    /\b(how do you (view|approach|handle|think about))\b/i,
    /\b(what's your (experience|perspective|view|take))\b/i,
    /\b(can you (tell us|share|explain))\b/i,
    /\b(would you (share|elaborate|expand))\b/i,
    /\b(any (thoughts|questions|reactions))\b/i,
    /\b(does anyone (have|want to))\b/i
  ],
  
  // Facilitation Language - Managing discussion flow
  FACILITATION: [
    /\b(what I'm hearing|let me summarize|to summarize)\b/i,
    /\b(can you say more|tell me more|elaborate on that)\b/i,
    /\b(how does that connect|building on that|following up)\b/i,
    /\b(that's (interesting|great|excellent))\b/i,
    /\b(just to clarify|to build on)\b/i,
    /\b(i appreciate|thanks for sharing)\b/i
  ],
  
  // Transitions - Moving between topics
  TRANSITIONS: [
    /\b(moving on|let's move|next (question|topic))\b/i,
    /\b(let's (shift|explore|turn to))\b/i,
    /\b(that brings us to|turning to)\b/i,
    /\b(with that in mind|speaking of)\b/i,
    /\b(our next|the next)\b/i
  ],
  
  // Time Management - Session timing
  TIME_MANAGEMENT: [
    /\b(we have about|few more minutes|time for one more)\b/i,
    /\b(let's spend|in the interest of time)\b/i,
    /\b(before we (close|wrap up|end))\b/i,
    /\b(final thoughts|one more question)\b/i
  ],
  
  // Organizational Context - Facilitator's org references
  ORG_CONTEXT: [
    /\b(we at moody'?s|here at moody'?s|at moody'?s we)\b/i,
    /\b(moody'?s (perspective|research|experience))\b/i,
    /\b(from moody'?s standpoint|our work at moody'?s)\b/i,
    /\b(i'm ari|this is ari|ari (lehavi|from moody'?s))\b/i
  ],
  
  // Framework Language - Session-specific concepts
  FRAMEWORK: [
    /\b(assistance.*(automation|amplification)|automation.*amplification)\b/i,
    /\b(tools to agents|outputs to feedback)\b/i,
    /\b(fast forward.*years|what does your org look like)\b/i,
    /\b(what scares you most|what's one takeaway)\b/i,
    /\b(institutional memory|time saved is fleeting)\b/i
  ]
};

// Legacy export for backward compatibility (now unused)
export const FACILITATOR_PATTERNS: string[] = [];

export const MIN_WORDS_FOR_INSIGHTS = 50;
export const MAX_NETWORK_ERRORS = 10;
export const MAX_TOTAL_RESTARTS = 20;
