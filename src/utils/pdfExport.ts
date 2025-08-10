// utils/pdfExport.ts
import { jsPDF } from 'jspdf';
import { SessionContext } from '@/types/session';

interface ExportData {
  sessionContext: SessionContext;
  executiveSummary?: string;
  timestamp: Date;
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
export const generateSessionPDF = async (exportData: ExportData): Promise<void> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = margin;
  
  // Helper function to add text with word wrap
  const addWrappedText = (text: string, fontSize: number, isBold: boolean = false, color: [number, number, number] = [0, 0, 0]) => {
    pdf.setFontSize(fontSize);
    pdf.setTextColor(...color);
    if (isBold) {
      pdf.setFont('helvetica', 'bold');
    } else {
      pdf.setFont('helvetica', 'normal');
    }
    
    const lines = pdf.splitTextToSize(text, contentWidth);
    
    lines.forEach((line: string) => {
      if (yPosition + 10 > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
      pdf.text(line, margin, yPosition);
      yPosition += fontSize * 0.4;
    });
    
    yPosition += 5; // Add spacing after paragraph
  };
  
  // Title Page
  pdf.setFillColor(59, 130, 246); // Blue background
  pdf.rect(0, 0, pageWidth, 60, 'F');
  
  // White text on blue background
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('AI Transformation Roundtable', pageWidth / 2, 25, { align: 'center' });
  
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Session Summary Report', pageWidth / 2, 40, { align: 'center' });
  
  // Reset text color
  pdf.setTextColor(0, 0, 0);
  yPosition = 80;
  
  // Session Information Box
  pdf.setDrawColor(200, 200, 200);
  pdf.setFillColor(249, 250, 251);
  pdf.roundedRect(margin, yPosition - 10, contentWidth, 50, 3, 3, 'FD');
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Session Details', margin + 5, yPosition);
  yPosition += 10;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  const sessionDate = new Date(exportData.sessionContext.startTime);
  const details = [
    `Event: Ai4 Conference, Las Vegas`,
    `Date: ${sessionDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
    `Facilitator: Ari Lehavi, Head of Applied AI, Moody's`,
    `Topic: ${exportData.sessionContext.currentTopic || 'AI Transformation Strategy'}`,
    `Duration: ${Math.floor((exportData.timestamp.getTime() - sessionDate.getTime()) / 60000)} minutes`
  ];
  
  details.forEach(detail => {
    pdf.text(detail, margin + 5, yPosition);
    yPosition += 6;
  });
  
  yPosition += 15;
  
  // Executive Summary Section
  pdf.addPage();
  yPosition = margin;
  
  addWrappedText('EXECUTIVE SUMMARY', 18, true, [59, 130, 246]);
  yPosition += 5;
  
  if (exportData.executiveSummary && exportData.executiveSummary !== 'No executive summary generated yet.') {
    // Parse and format the executive summary content
    const summaryLines = exportData.executiveSummary.split('\n');
    
    summaryLines.forEach(line => {
      const trimmedLine = line.trim();
      
      // Check if it's a section header (contains ** or numbers followed by period)
      if (trimmedLine.includes('**') || /^\d+\./.test(trimmedLine)) {
        // Extract header text
        const headerText = trimmedLine.replace(/\*\*/g, '').replace(/^\d+\.\s*/, '');
        if (headerText) {
          yPosition += 5; // Extra space before headers
          addWrappedText(headerText, 12, true, [31, 41, 55]);
        }
      } else if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•')) {
        // Bullet points
        const bulletText = trimmedLine.replace(/^[-•]\s*/, '• ');
        addWrappedText(bulletText, 10, false, [55, 65, 81]);
      } else if (trimmedLine) {
        // Regular paragraph text
        addWrappedText(trimmedLine, 10, false, [55, 65, 81]);
      }
    });
  } else {
    addWrappedText('No executive summary has been generated for this session yet. Generate an executive summary in the final phase to include it in the PDF export.', 10, false, [107, 114, 128]);
  }
  
  // Key Insights Section (if any)
  const insights = exportData.sessionContext.aiInsights.filter(i => i.type === 'insights');
  if (insights.length > 0) {
    pdf.addPage();
    yPosition = margin;
    
    addWrappedText('KEY INSIGHTS', 18, true, [59, 130, 246]);
    yPosition += 5;
    
    insights.slice(-5).forEach((insight, index) => {
      addWrappedText(`Insight ${index + 1}:`, 11, true);
      addWrappedText(insight.content, 10);
      yPosition += 5;
    });
  }
  
  // Session Transcript Summary
  if (exportData.sessionContext.liveTranscript.length > 0) {
    pdf.addPage();
    yPosition = margin;
    
    addWrappedText('DISCUSSION HIGHLIGHTS', 18, true, [59, 130, 246]);
    yPosition += 5;
    
    addWrappedText(`Total Contributions: ${exportData.sessionContext.liveTranscript.length}`, 10);
    addWrappedText(`Participants: ${new Set(exportData.sessionContext.liveTranscript.map(e => e.speaker)).size}`, 10);
    yPosition += 10;
    
    // Show last few transcript entries as examples
    addWrappedText('Recent Discussion Points:', 12, true);
    yPosition += 3;
    
    exportData.sessionContext.liveTranscript.slice(-5).forEach(entry => {
      const timeStr = new Date(entry.timestamp).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      
      addWrappedText(`[${timeStr}] ${entry.speaker}:`, 9, true, [75, 85, 99]);
      addWrappedText(entry.text, 9, false, [55, 65, 81]);
      yPosition += 3;
    });
  }
  
  // Footer on last page
  pdf.setFontSize(8);
  pdf.setTextColor(128, 128, 128);
  pdf.text(
    `Generated on ${exportData.timestamp.toLocaleDateString()} at ${exportData.timestamp.toLocaleTimeString()}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );
  
  // Save the PDF
  const fileName = `AI_Transformation_Session_${sessionDate.toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
};

/**
 * Utility to prepare session data for PDF export
 */
export const prepareSessionDataForExport = (sessionContext: SessionContext): ExportData => {
  // Find the executive summary from AI insights
  const executiveSummary = sessionContext.aiInsights
    .filter(insight => insight.type === 'executive')
    .map(insight => insight.content)
    .join('\n\n');

  return {
    sessionContext,
    executiveSummary: executiveSummary || 'No executive summary generated yet.',
    timestamp: new Date()
  };
};

/**
 * Generate executive summary from session context
 */
function generateExecutiveSummary(sessionContext: SessionContext): string {
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
function generateActionItems(sessionContext: SessionContext): ActionItem[] {
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
function generateCompetitiveImplications(sessionContext: SessionContext): string {
  return 'Strategic initiatives discussed will enhance competitive positioning through AI-driven capabilities and operational excellence.';
}

/**
 * Generate business value statement
 */
function generateBusinessValue(sessionContext: SessionContext): string {
  return 'Projected 15-25% efficiency improvement and enhanced strategic decision-making capabilities through AI transformation.';
}

/**
 * Generate next steps
 */
function generateNextSteps(sessionContext: SessionContext): string[] {
  return [
    'Schedule follow-up executive session within 2 weeks',
    'Assign ownership for key action items to executive team members',
    'Develop detailed implementation timeline with milestones',
    'Establish success metrics and progress tracking mechanisms'
  ];
}


