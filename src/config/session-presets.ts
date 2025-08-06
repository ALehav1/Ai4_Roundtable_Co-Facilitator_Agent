/**
 * Session Presets Configuration
 * Pre-defined session templates for quick session initialization
 * Allows facilitators to start with common scenarios and example content
 */

import { TranscriptEntry } from '@/types';

/**
 * Session preset template structure
 */
export interface SessionPreset {
  id: string;
  name: string;
  description: string;
  category: 'demo' | 'template' | 'example' | 'custom';
  sessionTopic: string;
  facilitatorName: string;
  participants: string[];
  initialTranscript: Omit<TranscriptEntry, 'id' | 'timestamp'>[];
  tags: string[];
  estimatedDuration: number; // in minutes
}

/**
 * Pre-defined session presets for different use cases
 */
export const sessionPresets: SessionPreset[] = [
  {
    id: 'ai_transformation_demo',
    name: 'AI Transformation Demo',
    description: 'A sample discussion about enterprise AI transformation with example insights',
    category: 'demo',
    sessionTopic: 'Enterprise AI Transformation Strategy',
    facilitatorName: 'Demo Facilitator',
    participants: ['Sarah (CTO)', 'Mike (Product Lead)', 'Lisa (AI Strategist)', 'John (Operations)'],
    initialTranscript: [
      {
        speaker: 'Demo Facilitator',
        text: 'Welcome everyone to our AI transformation roundtable. Let\'s start by envisioning what your enterprise operations will look like in 2028 when AI becomes the primary way work gets done.',
        isAutoDetected: false
      },
      {
        speaker: 'Sarah (CTO)',
        text: 'I see AI agents handling most of our routine development tasks. Instead of developers writing boilerplate code, they\'ll be orchestrating AI agents that understand our entire codebase and can make changes autonomously.',
        isAutoDetected: false
      },
      {
        speaker: 'Mike (Product Lead)',
        text: 'From a product perspective, I imagine AI will be having direct conversations with customers, understanding their needs, and even proposing new features based on usage patterns we can\'t even detect today.',
        isAutoDetected: false
      },
      {
        speaker: 'Lisa (AI Strategist)',
        text: 'The key shift I see is from individual AI tools to a shared organizational intelligence. Every interaction, decision, and outcome will feed into a collective AI brain that gets smarter over time.',
        isAutoDetected: false
      },
      {
        speaker: 'John (Operations)',
        text: 'In operations, I envision AI agents managing our entire supply chain, predicting disruptions before they happen, and automatically adjusting our processes. Human oversight will shift from execution to strategy.',
        isAutoDetected: false
      }
    ],
    tags: ['ai-transformation', 'demo', 'enterprise', 'strategy'],
    estimatedDuration: 60
  },
  {
    id: 'blank_template',
    name: 'Blank Session',
    description: 'Start with a clean slate - no pre-populated content',
    category: 'template',
    sessionTopic: '',
    facilitatorName: '',
    participants: [],
    initialTranscript: [],
    tags: ['blank', 'template'],
    estimatedDuration: 45
  },
  {
    id: 'team_retrospective',
    name: 'Team Retrospective',
    description: 'Quarterly team retrospective discussion template',
    category: 'template',
    sessionTopic: 'Q4 Team Retrospective',
    facilitatorName: 'Team Lead',
    participants: ['Team Member 1', 'Team Member 2', 'Team Member 3'],
    initialTranscript: [
      {
        speaker: 'Team Lead',
        text: 'Welcome to our quarterly retrospective. Let\'s start by reflecting on what went well this quarter.',
        isAutoDetected: false
      }
    ],
    tags: ['retrospective', 'team', 'quarterly'],
    estimatedDuration: 30
  },
  {
    id: 'product_planning',
    name: 'Product Planning Session',
    description: 'Product roadmap and feature planning discussion',
    category: 'template',
    sessionTopic: '2025 Product Roadmap Planning',
    facilitatorName: 'Product Manager',
    participants: ['Engineering Lead', 'Design Lead', 'Sales Rep', 'Customer Success'],
    initialTranscript: [
      {
        speaker: 'Product Manager',
        text: 'Today we\'re aligning on our 2025 product roadmap. Let\'s start with the key customer pain points we\'ve identified.',
        isAutoDetected: false
      },
      {
        speaker: 'Customer Success',
        text: 'Based on our support tickets, the top three pain points are: integration complexity, reporting limitations, and mobile experience.',
        isAutoDetected: false
      }
    ],
    tags: ['product', 'planning', 'roadmap', '2025'],
    estimatedDuration: 90
  },
  {
    id: 'ai_implementation',
    name: 'AI Implementation Workshop',
    description: 'Hands-on workshop for implementing AI in specific business processes',
    category: 'example',
    sessionTopic: 'AI Implementation in Customer Service',
    facilitatorName: 'AI Consultant',
    participants: ['Customer Service Manager', 'IT Director', 'Data Scientist', 'Finance Controller'],
    initialTranscript: [
      {
        speaker: 'AI Consultant',
        text: 'Let\'s explore how AI can transform your customer service operations. What are your current biggest challenges?',
        isAutoDetected: false
      },
      {
        speaker: 'Customer Service Manager',
        text: 'Our main challenges are response time during peak hours and maintaining consistency across different support agents.',
        isAutoDetected: false
      },
      {
        speaker: 'Data Scientist',
        text: 'We have years of support ticket data that could train an AI to handle common queries automatically.',
        isAutoDetected: false
      },
      {
        speaker: 'IT Director',
        text: 'Integration with our existing CRM and ticketing system will be crucial. We need to ensure seamless handoffs between AI and human agents.',
        isAutoDetected: false
      }
    ],
    tags: ['ai', 'customer-service', 'implementation', 'workshop'],
    estimatedDuration: 120
  },
  {
    id: 'innovation_brainstorm',
    name: 'Innovation Brainstorming',
    description: 'Creative session for generating new ideas and solutions',
    category: 'example',
    sessionTopic: 'Next-Gen Product Innovation',
    facilitatorName: 'Innovation Lead',
    participants: ['Designer', 'Engineer', 'Marketing', 'Research'],
    initialTranscript: [
      {
        speaker: 'Innovation Lead',
        text: 'No idea is too wild today. Let\'s think about how emerging technologies could create entirely new product categories.',
        isAutoDetected: false
      },
      {
        speaker: 'Designer',
        text: 'What if we used AR to let customers visualize products in their actual environment before purchasing?',
        isAutoDetected: false
      },
      {
        speaker: 'Engineer',
        text: 'We could leverage edge computing to process that AR in real-time without latency issues.',
        isAutoDetected: false
      }
    ],
    tags: ['innovation', 'brainstorming', 'creative', 'future'],
    estimatedDuration: 60
  }
];

/**
 * Get preset by ID
 */
export function getPresetById(id: string): SessionPreset | undefined {
  return sessionPresets.find(preset => preset.id === id);
}

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: SessionPreset['category']): SessionPreset[] {
  return sessionPresets.filter(preset => preset.category === category);
}

/**
 * Search presets by tags
 */
export function searchPresetsByTags(tags: string[]): SessionPreset[] {
  return sessionPresets.filter(preset => 
    tags.some(tag => preset.tags.includes(tag.toLowerCase()))
  );
}

/**
 * Convert preset to initial transcript entries with proper IDs and timestamps
 */
export function presetToTranscriptEntries(preset: SessionPreset): TranscriptEntry[] {
  const now = new Date();
  return preset.initialTranscript.map((entry, index) => ({
    ...entry,
    id: `preset-${preset.id}-${index}`,
    timestamp: new Date(now.getTime() + index * 1000) // Stagger timestamps by 1 second
  }));
}
