/**
 * Executive Session Templates
 * Pre-configured discussion templates for common strategic scenarios
 * 
 * Each template includes:
 * - Executive-focused questions and prompts
 * - Strategic context and objectives
 * - Success metrics and outcomes
 * - Estimated duration and participant requirements
 */

export interface SessionTemplate {
  id: string;
  title: string;
  description: string;
  category: 'transformation' | 'strategy' | 'operations' | 'innovation';
  duration: number; // minutes
  participantRoles: string[];
  objectives: string[];
  phases: SessionPhase[];
  successMetrics: string[];
  competitiveContext: string;
  businessValue: string;
}

export interface SessionPhase {
  id: string;
  title: string;
  duration: number; // minutes
  objective: string;
  keyQuestions: string[];
  facilitationTips: string[];
  expectedOutcomes: string[];
  transitionCriteria: string;
}

/**
 * Executive Session Templates Library
 */
export const SESSION_TEMPLATES: SessionTemplate[] = [
  {
    id: 'ai-transformation-strategy',
    title: 'AI Transformation Strategy Session',
    description: 'C-level strategic planning for enterprise AI transformation initiatives',
    category: 'transformation',
    duration: 90,
    participantRoles: ['CEO', 'CTO', 'COO', 'CFO', 'Head of Strategy', 'Head of Digital'],
    objectives: [
      'Define AI transformation roadmap with clear ROI targets',
      'Identify competitive advantages through AI implementation',
      'Allocate budget and resources for maximum strategic impact',
      'Establish governance and risk management framework'
    ],
    phases: [
      {
        id: 'strategic-vision',
        title: 'Strategic Vision & Market Positioning',
        duration: 20,
        objective: 'Establish AI transformation vision aligned with business strategy',
        keyQuestions: [
          'How will AI fundamentally change our competitive position in the next 3 years?',
          'What specific business outcomes justify a $X million AI investment?',
          'Which competitors are gaining AI-driven advantages we must counter?',
          'What customer value propositions become possible with AI transformation?'
        ],
        facilitationTips: [
          'Focus on quantifiable business outcomes and competitive threats',
          'Challenge generic AI discussions with specific use cases',
          'Document resistance patterns for change management planning'
        ],
        expectedOutcomes: [
          'Clear AI transformation vision statement',
          'Competitive analysis of AI adoption threats/opportunities',
          'Preliminary ROI targets and success metrics'
        ],
        transitionCriteria: 'Executive alignment on strategic AI vision and competitive urgency'
      },
      {
        id: 'capability-assessment',
        title: 'Organizational Readiness & Capability Gaps',
        duration: 25,
        objective: 'Assess current capabilities and identify critical transformation gaps',
        keyQuestions: [
          'What AI capabilities do we need to build vs. buy vs. partner for?',
          'How do our current data assets and infrastructure limit AI potential?',
          'What organizational changes are required for AI-native operations?',
          'Which talent gaps represent the highest risk to transformation success?'
        ],
        facilitationTips: [
          'Demand specific examples and current state assessments',
          'Identify dependencies and sequencing requirements',
          'Surface cultural and political barriers to change'
        ],
        expectedOutcomes: [
          'Capability gap analysis with priority rankings',
          'Infrastructure and data readiness assessment',
          'Organizational change requirements identification'
        ],
        transitionCriteria: 'Honest assessment of capabilities and change requirements completed'
      },
      {
        id: 'implementation-roadmap',
        title: 'Implementation Roadmap & Resource Allocation',
        duration: 30,
        objective: 'Define concrete implementation plan with ownership and timelines',
        keyQuestions: [
          'What are our highest-ROI AI initiatives for the next 6/12/18 months?',
          'How do we sequence initiatives to build momentum and minimize risk?',
          'What budget allocation maximizes competitive advantage and time-to-value?',
          'Who owns each transformation workstream and what are their success metrics?'
        ],
        facilitationTips: [
          'Push for specific timelines, budgets, and accountability',
          'Address integration challenges between initiatives',
          'Establish governance and decision-making processes'
        ],
        expectedOutcomes: [
          'Prioritized roadmap with 6/12/18-month milestones',
          'Budget allocation across transformation initiatives',
          'Clear ownership and accountability structure'
        ],
        transitionCriteria: 'Executive commitment to specific roadmap and resource allocation'
      },
      {
        id: 'risk-governance',
        title: 'Risk Management & Success Metrics',
        duration: 15,
        objective: 'Establish risk framework and success measurement systems',
        keyQuestions: [
          'What are the top 3 risks that could derail our AI transformation?',
          'How do we measure and report transformation progress to the board?',
          'What governance structures ensure AI initiatives align with business strategy?',
          'How do we pivot quickly if market conditions or technology changes?'
        ],
        facilitationTips: [
          'Focus on measurable KPIs and governance processes',
          'Address ethical AI and regulatory compliance requirements',
          'Establish regular review and adjustment mechanisms'
        ],
        expectedOutcomes: [
          'Risk mitigation strategies for top transformation threats',
          'KPIs and measurement framework for board reporting',
          'Governance structure for ongoing transformation management'
        ],
        transitionCriteria: 'Agreement on risk management and measurement frameworks'
      }
    ],
    successMetrics: [
      'Executive alignment score on AI transformation vision (target: 9/10)',
      'Concrete roadmap with specific milestones and budgets',
      'Clear ownership assignments with success metrics',
      'Risk mitigation strategies for top 3 identified threats'
    ],
    competitiveContext: 'Critical for maintaining competitive position as AI reshapes industry dynamics',
    businessValue: 'Potential 25-40% efficiency gains and new revenue streams through AI-native operations'
  },
  
  {
    id: 'quarterly-digital-review',
    title: 'Quarterly Digital Strategy Review',
    description: 'Executive review of digital initiatives with strategic course corrections',
    category: 'strategy',
    duration: 60,
    participantRoles: ['CEO', 'CTO', 'CMO', 'Head of Digital', 'Head of Operations'],
    objectives: [
      'Review digital initiative performance against strategic goals',
      'Identify market shifts requiring strategic adjustments',
      'Reallocate resources to maximize competitive advantage',
      'Address digital transformation roadblocks'
    ],
    phases: [
      {
        id: 'performance-review',
        title: 'Digital Performance Analysis',
        duration: 20,
        objective: 'Assess current digital initiatives against KPIs and market evolution',
        keyQuestions: [
          'Which digital initiatives exceeded/missed ROI targets and why?',
          'How have customer behaviors shifted our digital strategy priorities?',
          'What competitive digital moves threaten our market position?',
          'Where are we gaining/losing digital competitive advantages?'
        ],
        facilitationTips: [
          'Demand specific metrics and customer impact data',
          'Compare performance to industry benchmarks',
          'Identify patterns across successful/failed initiatives'
        ],
        expectedOutcomes: [
          'Performance scorecard for all digital initiatives',
          'Market shift analysis affecting digital strategy',
          'Competitive threat assessment and opportunity identification'
        ],
        transitionCriteria: 'Clear understanding of digital performance vs. strategic goals'
      },
      {
        id: 'strategic-adjustments',
        title: 'Strategic Course Corrections',
        duration: 25,
        objective: 'Make strategic adjustments based on performance and market data',
        keyQuestions: [
          'What digital investments should we accelerate, maintain, or discontinue?',
          'How do we reallocate resources to capture emerging opportunities?',
          'What new digital capabilities must we build to stay competitive?',
          'Which partnerships or acquisitions could accelerate our digital advantage?'
        ],
        facilitationTips: [
          'Force decisions on underperforming initiatives',
          'Identify resource reallocation opportunities',
          'Address organizational barriers to digital execution'
        ],
        expectedOutcomes: [
          'Resource reallocation decisions with business justification',
          'New capability requirements and development plans',
          'Partnership or acquisition opportunities for evaluation'
        ],
        transitionCriteria: 'Executive decisions on digital portfolio optimization'
      },
      {
        id: 'execution-planning',
        title: 'Next Quarter Execution Plan',
        duration: 15,
        objective: 'Define concrete execution plan for next quarter with clear accountability',
        keyQuestions: [
          'What are our top 3 digital priorities for the next quarter?',
          'How do we accelerate time-to-market for high-priority initiatives?',
          'What organizational changes will improve digital execution velocity?',
          'Who owns each major digital outcome and how do we measure success?'
        ],
        facilitationTips: [
          'Establish clear ownership and decision rights',
          'Set aggressive but achievable quarterly targets',
          'Address cross-functional coordination challenges'
        ],
        expectedOutcomes: [
          'Top 3 digital priorities with specific quarterly targets',
          'Execution acceleration strategies and process improvements',
          'Clear accountability structure and success metrics'
        ],
        transitionCriteria: 'Commitment to quarterly digital execution plan'
      }
    ],
    successMetrics: [
      'Digital ROI improvement quarter-over-quarter',
      'Competitive position maintenance or improvement',
      'Resource reallocation to high-performing initiatives',
      'Acceleration of time-to-market for strategic digital projects'
    ],
    competitiveContext: 'Essential for maintaining competitive velocity in rapidly evolving digital landscape',
    businessValue: 'Optimized digital portfolio driving 15-25% improvement in digital ROI'
  },

  {
    id: 'innovation-portfolio-review',
    title: 'Innovation Portfolio Strategic Review',
    description: 'Executive assessment of innovation investments with strategic realignment',
    category: 'innovation',
    duration: 75,
    participantRoles: ['CEO', 'CTO', 'Head of Innovation', 'Head of Strategy', 'Head of R&D'],
    objectives: [
      'Evaluate innovation portfolio performance and strategic alignment',
      'Identify breakthrough opportunities requiring executive support',
      'Optimize innovation resource allocation for maximum competitive impact',
      'Establish innovation governance and risk management framework'
    ],
    phases: [
      {
        id: 'portfolio-assessment',
        title: 'Innovation Portfolio Performance',
        duration: 25,
        objective: 'Assess innovation investments against strategic objectives and market potential',
        keyQuestions: [
          'Which innovation bets are showing breakthrough potential vs. strategic dead ends?',
          'How do our innovation investments compare to competitive innovation threats?',
          'What market timing factors affect our innovation-to-commercialization strategy?',
          'Which innovations could fundamentally disrupt our industry or create new markets?'
        ],
        facilitationTips: [
          'Distinguish between incremental and breakthrough innovations',
          'Assess market timing and competitive innovation landscape',
          'Challenge innovation teams on commercial viability timelines'
        ],
        expectedOutcomes: [
          'Innovation portfolio performance scorecard with strategic impact assessment',
          'Breakthrough vs. incremental innovation categorization',
          'Competitive innovation threat and opportunity analysis'
        ],
        transitionCriteria: 'Clear view of innovation portfolio performance and strategic potential'
      },
      {
        id: 'strategic-bets',
        title: 'Strategic Innovation Bets',
        duration: 30,
        objective: 'Identify and commit to high-impact innovation investments',
        keyQuestions: [
          'What breakthrough innovations justify significant strategic investment?',
          'How do we balance innovation risk with competitive necessity?',
          'Which innovations require ecosystem partnerships or acquisition strategies?',
          'What innovations could create defensible competitive moats?'
        ],
        facilitationTips: [
          'Focus on innovations with potential for category creation or disruption',
          'Address resource allocation between core and breakthrough innovation',
          'Evaluate build vs. buy vs. partner strategies for strategic innovations'
        ],
        expectedOutcomes: [
          'Strategic innovation investment decisions with budget allocation',
          'Partnership or acquisition targets for innovation acceleration',
          'Risk tolerance and governance framework for breakthrough innovations'
        ],
        transitionCriteria: 'Executive commitment to strategic innovation bets and resource allocation'
      },
      {
        id: 'execution-acceleration',
        title: 'Innovation Execution & Time-to-Market',
        duration: 20,
        objective: 'Optimize innovation execution velocity and market introduction strategies',
        keyQuestions: [
          'How do we accelerate promising innovations from lab to market?',
          'What organizational barriers slow innovation execution velocity?',
          'How do we create innovation-friendly governance without compromising oversight?',
          'What market introduction strategies maximize adoption and competitive advantage?'
        ],
        facilitationTips: [
          'Address bureaucratic barriers to innovation velocity',
          'Establish fast-track processes for strategic innovations',
          'Balance innovation freedom with strategic alignment'
        ],
        expectedOutcomes: [
          'Innovation acceleration strategies and process improvements',
          'Governance framework balancing oversight with innovation velocity',
          'Market introduction strategies for strategic innovations'
        ],
        transitionCriteria: 'Agreement on innovation execution optimization plan'
      }
    ],
    successMetrics: [
      'Innovation pipeline value and strategic alignment improvement',
      'Time-to-market acceleration for strategic innovations',
      'Innovation ROI and commercialization success rate',
      'Competitive innovation advantage maintenance or improvement'
    ],
    competitiveContext: 'Critical for creating sustainable competitive advantages through breakthrough innovation',
    businessValue: 'Potential new revenue streams and market category creation through strategic innovation'
  },

  {
    id: 'operational-excellence-review',
    title: 'Operational Excellence Strategy Session',
    description: 'Executive session on operational transformation for competitive advantage',
    category: 'operations',
    duration: 60,
    participantRoles: ['CEO', 'COO', 'CFO', 'Head of Operations', 'Head of Technology'],
    objectives: [
      'Identify operational improvements with highest strategic impact',
      'Optimize resource allocation for operational competitive advantage',
      'Establish operational excellence metrics and governance',
      'Address operational barriers to strategic growth'
    ],
    phases: [
      {
        id: 'operational-performance',
        title: 'Operational Performance Analysis',
        duration: 20,
        objective: 'Assess operational performance against strategic requirements and competitive benchmarks',
        keyQuestions: [
          'Which operational inefficiencies limit our strategic growth potential?',
          'How do our operational costs and cycle times compare to competitive benchmarks?',
          'What operational capabilities enable or constrain our strategic initiatives?',
          'Where can operational excellence create sustainable competitive advantages?'
        ],
        facilitationTips: [
          'Focus on operations that directly impact customer value and competitive position',
          'Compare performance to best-in-class benchmarks across industries',
          'Identify operational constraints limiting strategic execution'
        ],
        expectedOutcomes: [
          'Operational performance assessment vs. strategic requirements',
          'Competitive benchmark analysis and performance gaps',
          'Operational constraint identification affecting strategic growth'
        ],
        transitionCriteria: 'Clear understanding of operational performance vs. strategic needs'
      },
      {
        id: 'transformation-priorities',
        title: 'Operational Transformation Priorities',
        duration: 25,
        objective: 'Prioritize operational improvements for maximum strategic and competitive impact',
        keyQuestions: [
          'Which operational transformations offer the highest ROI and strategic value?',
          'How do we sequence operational improvements to build capability and momentum?',
          'What technology investments accelerate operational competitive advantage?',
          'Which operational changes require significant organizational transformation?'
        ],
        facilitationTips: [
          'Prioritize improvements with both cost savings and strategic value',
          'Address interdependencies between operational improvements',
          'Consider customer impact and competitive differentiation potential'
        ],
        expectedOutcomes: [
          'Prioritized operational transformation roadmap with ROI projections',
          'Technology investment requirements and business cases',
          'Organizational change requirements for operational excellence'
        ],
        transitionCriteria: 'Executive alignment on operational transformation priorities'
      },
      {
        id: 'execution-governance',
        title: 'Execution Plan & Governance',
        duration: 15,
        objective: 'Establish execution plan with governance for operational excellence initiatives',
        keyQuestions: [
          'Who owns each operational transformation workstream and success metrics?',
          'How do we measure and report operational excellence progress?',
          'What governance ensures operational improvements align with strategic objectives?',
          'How do we maintain operational performance during transformation?'
        ],
        facilitationTips: [
          'Establish clear ownership and accountability for operational outcomes',
          'Balance transformation goals with operational stability requirements',
          'Create governance that drives performance without bureaucracy'
        ],
        expectedOutcomes: [
          'Operational transformation execution plan with clear ownership',
          'Performance measurement and governance framework',
          'Risk mitigation strategies for operational transformation'
        ],
        transitionCriteria: 'Commitment to operational excellence execution plan and governance'
      }
    ],
    successMetrics: [
      'Operational efficiency improvement with cost savings realization',
      'Operational capability enhancement supporting strategic growth',
      'Customer satisfaction improvement through operational excellence',
      'Competitive operational advantage creation or maintenance'
    ],
    competitiveContext: 'Operational excellence as foundation for strategic execution and competitive advantage',
    businessValue: 'Cost optimization and operational capability enabling strategic growth and competitive positioning'
  }
];

/**
 * Get template by ID
 */
export function getSessionTemplate(id: string): SessionTemplate | undefined {
  return SESSION_TEMPLATES.find(template => template.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: SessionTemplate['category']): SessionTemplate[] {
  return SESSION_TEMPLATES.filter(template => template.category === category);
}

/**
 * Get all template categories
 */
export function getTemplateCategories(): SessionTemplate['category'][] {
  return ['transformation', 'strategy', 'operations', 'innovation'];
}

/**
 * Convert template to session context
 */
export function templateToSessionContext(template: SessionTemplate) {
  return {
    sessionTopic: template.title,
    sessionDescription: template.description,
    duration: template.duration,
    objectives: template.objectives,
    phases: template.phases.map(phase => ({
      id: phase.id,
      title: phase.title,
      description: phase.objective,
      duration: phase.duration,
      questions: phase.keyQuestions,
      facilitationTips: phase.facilitationTips,
      expectedOutcomes: phase.expectedOutcomes
    })),
    successMetrics: template.successMetrics,
    participantRoles: template.participantRoles,
    businessValue: template.businessValue,
    competitiveContext: template.competitiveContext
  };
}
