/**
 * AI Content Formatting Utilities
 * Provides enhanced formatting for AI-generated content in the roundtable system
 */

export interface FormattedAIContent {
  title: string;
  content: string;
  type: 'insight' | 'question' | 'synthesis' | 'summary';
  priority: 'high' | 'medium' | 'low';
  htmlContent: string;
  timestamp: Date;
}

/**
 * Enhanced formatting for AI-generated content
 * Converts raw AI text into structured, readable format with proper styling
 */
export function formatAIContent(
  rawContent: string, 
  type: FormattedAIContent['type'] = 'insight'
): FormattedAIContent {
  // Clean and normalize the content
  const cleanContent = rawContent.trim();
  
  // Extract title from content (first line or sentence)
  const titleMatch = cleanContent.match(/^([^.\n]+)[.\n]/);
  const title = titleMatch ? titleMatch[1].trim() : generateDefaultTitle(type);
  
  // Determine priority based on content keywords
  const priority = determinePriority(cleanContent);
  
  // Create HTML formatted content
  const htmlContent = convertToHTML(cleanContent, type);
  
  return {
    title,
    content: cleanContent,
    type,
    priority,
    htmlContent,
    timestamp: new Date()
  };
}

/**
 * Convert plain text to HTML with enhanced formatting
 */
function convertToHTML(content: string, type: FormattedAIContent['type']): string {
  let html = content;
  
  // Convert bullet points
  html = html.replace(/^[\s]*[-•]\s*/gm, '<li>');
  html = html.replace(/(<li>[\s\S]*?)(?=\n(?!<li>)|$)/gm, '<ul>$1</ul>');
  html = html.replace(/<\/ul>\s*<ul>/g, '');
  
  // Convert numbered lists
  html = html.replace(/^[\s]*\d+\.\s*/gm, '<li>');
  if (html.includes('<li>') && !html.includes('<ul>')) {
    html = html.replace(/(<li>[\s\S]*?)(?=\n(?!<li>)|$)/gm, '<ol>$1</ol>');
    html = html.replace(/<\/ol>\s*<ol>/g, '');
  }
  
  // Convert bold text
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
  
  // Convert italic text
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');
  
  // Convert paragraphs
  html = html.replace(/\n\s*\n/g, '</p><p>');
  html = `<p>${html}</p>`;
  
  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>\s*<\/p>/g, '');
  
  // Add type-specific styling classes
  html = `<div class="ai-content ai-content-${type}">${html}</div>`;
  
  return html;
}

/**
 * Determine content priority based on keywords and length
 */
function determinePriority(content: string): FormattedAIContent['priority'] {
  const highPriorityKeywords = [
    'critical', 'urgent', 'important', 'significant', 'major', 'key', 'essential',
    'recommendation', 'action required', 'next steps', 'decision needed'
  ];
  
  const mediumPriorityKeywords = [
    'consider', 'explore', 'opportunity', 'potential', 'suggest', 'might',
    'worth noting', 'interesting', 'relevant'
  ];
  
  const lowerContent = content.toLowerCase();
  
  if (highPriorityKeywords.some(keyword => lowerContent.includes(keyword))) {
    return 'high';
  }
  
  if (mediumPriorityKeywords.some(keyword => lowerContent.includes(keyword))) {
    return 'medium';
  }
  
  // Long content is generally lower priority unless it contains keywords
  if (content.length > 500) {
    return 'low';
  }
  
  return 'medium';
}

/**
 * Generate default titles based on content type
 */
function generateDefaultTitle(type: FormattedAIContent['type']): string {
  const defaults = {
    insight: 'Strategic Insight',
    question: 'Follow-up Question',
    synthesis: 'Discussion Synthesis',
    summary: 'Executive Summary'
  };
  
  return defaults[type];
}

/**
 * Format multiple AI insights for display
 */
export function formatAIInsights(insights: any[]): FormattedAIContent[] {
  return insights.map(insight => {
    if (typeof insight === 'string') {
      return formatAIContent(insight, 'insight');
    }
    
    if (insight.type && insight.content) {
      return formatAIContent(insight.content, insight.type);
    }
    
    // Handle legacy format
    const content = insight.insight || insight.question || insight.synthesis || insight.summary || 'No content available';
    const type = insight.insight ? 'insight' : 
                 insight.question ? 'question' : 
                 insight.synthesis ? 'synthesis' : 
                 insight.summary ? 'summary' : 'insight';
    
    return formatAIContent(content, type as FormattedAIContent['type']);
  });
}

/**
 * Get CSS classes for AI content display
 */
export function getAIContentClasses(content: FormattedAIContent): string {
  const baseClasses = 'ai-insight-card border-l-4 p-4 mb-3 rounded-r-lg';
  
  const typeClasses = {
    insight: 'border-blue-400 bg-blue-50',
    question: 'border-green-400 bg-green-50', 
    synthesis: 'border-purple-400 bg-purple-50',
    summary: 'border-orange-400 bg-orange-50'
  };
  
  const priorityClasses = {
    high: 'ring-2 ring-red-200',
    medium: 'ring-1 ring-gray-200',
    low: 'opacity-90'
  };
  
  return `${baseClasses} ${typeClasses[content.type]} ${priorityClasses[content.priority]}`;
}
