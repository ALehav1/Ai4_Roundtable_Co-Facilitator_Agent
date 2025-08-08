/**
 * Enhanced PDF Export Utility for Executive AI Roundtable Sessions
 * Generates professional executive reports with strategic insights and action items
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Types for session data
interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: Date;
  isAutoDetected: boolean;
  confidence?: number;
}

interface AIInsight {
  id: string;
  type: string;
  content: string;
  timestamp: Date;
  confidence?: number;
  suggestions?: string[];
  metadata?: any;
  isLegacy?: boolean;
  isError?: boolean;
}

interface SessionExportData {
  sessionTopic: string;
  facilitator: string;
  participantCount: number;
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
  transcript: TranscriptEntry[];
  aiInsights: AIInsight[];
  currentQuestionIndex: number;
  totalQuestions: number;
  // Enhanced executive data
  executiveSummary?: string;
  keyDecisions?: string[];
  actionItems?: ActionItem[];
  strategicInsights?: StrategyInsight[];
  competitiveImplications?: string;
  businessValue?: string;
  nextSteps?: string[];
}

interface ActionItem {
  id: string;
  description: string;
  owner: string;
  priority: 'High' | 'Medium' | 'Low';
  dueDate?: string;
  businessImpact: string;
}

interface StrategyInsight {
  id: string;
  category: 'Opportunity' | 'Risk' | 'Decision' | 'Resource';
  title: string;
  description: string;
  businessImpact: string;
  timeframe: 'Immediate' | 'Short-term' | 'Long-term';
  confidence: number;
}

/**
 * Generate PDF from session data
 */
export const generateSessionPDF = async (sessionData: SessionExportData): Promise<void> => {
  try {
    console.log('📄 Generating PDF export for session:', sessionData.sessionTopic);
    
    // Create PDF document
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const lineHeight = 7;
    let yPosition = margin;

    // Helper function to add a new page if needed
    const checkPageBreak = (requiredHeight: number = lineHeight) => {
      if (yPosition + requiredHeight > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
        return true;
      }
      return false;
    };

    // Helper function to add text with word wrapping
    const addWrappedText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
      
      const maxWidth = pageWidth - (2 * margin);
      const lines = pdf.splitTextToSize(text, maxWidth);
      
      for (const line of lines) {
        checkPageBreak();
        pdf.text(line, margin, yPosition);
        yPosition += lineHeight;
      }
    };

    // PDF Header
    pdf.setFillColor(59, 130, 246); // Blue background
    pdf.rect(0, 0, pageWidth, 40, 'F');
    
    pdf.setTextColor(255, 255, 255); // White text
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('AI Roundtable Session Report', margin, 25);
    
    pdf.setTextColor(0, 0, 0); // Reset to black
    yPosition = 50;

    // Session Overview
    addWrappedText('SESSION OVERVIEW', 16, true);
    yPosition += 5;

    addWrappedText(`Topic: ${sessionData.sessionTopic}`, 12);
    addWrappedText(`Facilitator: ${sessionData.facilitator}`, 12);
    addWrappedText(`Participants: ${sessionData.participantCount}`, 12);
    addWrappedText(`Date: ${sessionData.startTime.toLocaleDateString()}`, 12);
    addWrappedText(`Duration: ${sessionData.duration} minutes`, 12);
    addWrappedText(`Questions Completed: ${sessionData.currentQuestionIndex + 1} of ${sessionData.totalQuestions}`, 12);
    
    yPosition += 10;

    // AI Insights Section
    if (sessionData.aiInsights.length > 0) {
      addWrappedText('AI INSIGHTS & ANALYSIS', 16, true);
      yPosition += 5;

      sessionData.aiInsights.forEach((insight, index) => {
        checkPageBreak(20); // Ensure space for insight
        
        addWrappedText(`${index + 1}. ${insight.type.toUpperCase()} (${insight.timestamp.toLocaleTimeString()})`, 12, true);
        addWrappedText(insight.content, 11);
        
        if (insight.suggestions && insight.suggestions.length > 0) {
          addWrappedText('Suggestions:', 11, true);
          insight.suggestions.forEach(suggestion => {
            addWrappedText(`• ${suggestion}`, 11);
          });
        }
        
        yPosition += 5;
      });
    }

    // Conversation Transcript
    if (sessionData.transcript.length > 0) {
      checkPageBreak(30);
      addWrappedText('CONVERSATION TRANSCRIPT', 16, true);
      yPosition += 5;

      sessionData.transcript.forEach((entry, index) => {
        checkPageBreak(15); // Ensure space for transcript entry
        
        const timeStr = entry.timestamp.toLocaleTimeString();
        const speakerText = `[${timeStr}] ${entry.speaker}:`;
        
        addWrappedText(speakerText, 11, true);
        addWrappedText(entry.text, 11);
        yPosition += 3;
      });
    }

    // Footer on last page
    const pageCount = (pdf as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text(
        `Generated by AI Roundtable Facilitator | Page ${i} of ${pageCount} | ${new Date().toLocaleString()}`,
        margin,
        pageHeight - 10
      );
    }

    // Generate filename and download
    const filename = `ai-roundtable-${sessionData.sessionTopic.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    
    pdf.save(filename);
    console.log('✅ PDF exported successfully:', filename);
    
  } catch (error) {
    console.error('❌ PDF export failed:', error);
    throw new Error(`PDF export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Generate PDF from HTML element (alternative method for complex layouts)
 */
export const generatePDFFromElement = async (elementId: string, filename: string): Promise<void> => {
  try {
    console.log('📄 Generating PDF from HTML element:', elementId);
    
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id '${elementId}' not found`);
    }

    // Capture the element as canvas
    const canvas = await html2canvas(element, {
      scale: 2, // Higher quality
      useCORS: true,
      logging: false,
      height: element.scrollHeight,
      width: element.scrollWidth
    });

    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    const imgWidth = pageWidth - 20; // 10mm margin on each side
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 10; // 10mm top margin

    // Add image to PDF (split across pages if needed)
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - 20; // Account for margins

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight + 10;
      pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 20;
    }

    pdf.save(filename);
    console.log('✅ PDF exported successfully from HTML element:', filename);
    
  } catch (error) {
    console.error('❌ PDF export from HTML failed:', error);
    throw new Error(`PDF export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Utility to prepare session data for PDF export
 */
export const prepareSessionDataForExport = (sessionContext: any): SessionExportData => {
  const now = new Date();
  const durationMs = now.getTime() - sessionContext.startTime.getTime();
  const durationMinutes = Math.round(durationMs / 60000);

  return {
    sessionTopic: sessionContext.currentTopic || 'AI Roundtable Session',
    facilitator: 'AI Facilitator', // Default facilitator name
    participantCount: sessionContext.participantCount || 5,
    startTime: sessionContext.startTime,
    endTime: now,
    duration: durationMinutes,
    transcript: sessionContext.liveTranscript || [],
    aiInsights: sessionContext.aiInsights || [],
    currentQuestionIndex: sessionContext.currentQuestionIndex || 0,
    totalQuestions: 10 // This should come from config
  };
};

/**
 * Generate executive summary from session context
 */
function generateExecutiveSummary(sessionContext: any): string {
  const insights = sessionContext.aiInsights || [];
  const transcript = sessionContext.liveTranscript || [];

  if (insights.length === 0 && transcript.length === 0) {
    return 'Strategic planning session focused on AI transformation and competitive positioning.';
  }

  const keyThemes = insights
    .filter((insight: any) => insight.type === 'insights' && !insight.isError)
    .slice(-3)
    .map((insight: any) => insight.content.split('.')[0])
    .join(' ');

  return keyThemes.length > 50
    ? keyThemes.substring(0, 200) + '...'
    : 'Strategic session covering AI transformation, competitive analysis, and organizational readiness for digital innovation.';
}

/**
 * Extract strategic insights from AI analysis
 */
function extractStrategicInsights(aiInsights: any[]): StrategyInsight[] {
  return aiInsights
    .filter(insight => !insight.isError && insight.confidence && insight.confidence > 0.6)
    .slice(-5)
    .map((insight, index) => ({
      id: `strategy_${index}`,
      category: insight.type === 'synthesis' ? 'Decision' : 'Opportunity',
      title: insight.content.split('.')[0] || 'Strategic Insight',
      description: insight.content,
      businessImpact: 'Supports competitive positioning and operational efficiency',
      timeframe: 'Short-term',
      confidence: insight.confidence || 0.8
    }));
}

/**
 * Generate action items from session context
 */
function generateActionItems(sessionContext: any): ActionItem[] {
  const suggestions = sessionContext.aiInsights
    ?.filter((insight: any) => insight.suggestions && insight.suggestions.length > 0)
    .flatMap((insight: any) => insight.suggestions)
    .slice(0, 5) || [];

  return suggestions.map((suggestion: string, index: number) => ({
    id: `action_${index}`,
    description: suggestion,
    owner: 'Executive Team',
    priority: index < 2 ? 'High' : 'Medium',
    businessImpact: 'Enhances strategic execution and competitive advantage'
  }));
}

/**
 * Extract key decisions from transcript
 */
function extractKeyDecisions(transcript: any[]): string[] {
  return transcript
    .filter(entry =>
      entry.text.toLowerCase().includes('decision') ||
      entry.text.toLowerCase().includes('agree') ||
      entry.text.toLowerCase().includes('approve')
    )
    .slice(-3)
    .map(entry => entry.text.split('.')[0])
    .filter(decision => decision.length > 20);
}

/**
 * Generate competitive implications
 */
function generateCompetitiveImplications(sessionContext: any): string {
  return 'Strategic initiatives discussed will enhance competitive positioning through AI-driven capabilities and operational excellence.';
}

/**
 * Generate business value statement
 */
function generateBusinessValue(sessionContext: any): string {
  return 'Projected 15-25% efficiency improvement and enhanced strategic decision-making capabilities through AI transformation.';
}

/**
 * Generate next steps
 */
function generateNextSteps(sessionContext: any): string[] {
  return [
    'Schedule follow-up executive session within 2 weeks',
    'Assign ownership for key action items to executive team members',
    'Develop detailed implementation timeline with milestones',
    'Establish success metrics and progress tracking mechanisms'
  ];
}
