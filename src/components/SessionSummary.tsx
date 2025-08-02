'use client';

import React, { useState } from 'react';

// Types matching the backend API response
interface QuestionSummary {
  questionId: string;
  questionTitle: string;
  questionText: string;
  participantCount: number;
  keyThemes: string[];
  narrativeSummary: string;
  criticalInsights: string[];
  emergingConcerns: string[];
  strategicImplications: string[];
}

interface SessionSummary {
  sessionOverview: {
    totalParticipants: number;
    questionsCompleted: number;
    sessionDuration: string;
    overallEngagement: string;
  };
  questionSummaries: QuestionSummary[];
  executiveSummary: {
    keyFindings: string[];
    strategicRecommendations: string[];
    nextSteps: string[];
    riskFactors: string[];
  };
  fullNarrativeConclusion: string;
}

interface SessionSummaryProps {
  summary: SessionSummary;
  onClose: () => void;
}

export default function SessionSummary({ summary, onClose }: SessionSummaryProps) {
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv' | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'pdf' | 'csv') => {
    setIsExporting(true);
    setExportFormat(format);

    try {
      if (format === 'pdf') {
        await exportToPDF();
      } else {
        await exportToCSV();
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  const exportToPDF = async () => {
    // Create a printable version and trigger browser print dialog
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printHTML = generatePrintHTML(summary);
    printWindow.document.write(printHTML);
    printWindow.document.close();
    
    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  const exportToCSV = async () => {
    const csvData = generateCSVData(summary);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `AI_Roundtable_Summary_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-roundtable-primary text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">AI Roundtable Session Summary</h2>
              <p className="text-blue-100 mt-1">
                {summary.sessionOverview.questionsCompleted} sections completed • 
                {summary.sessionOverview.totalParticipants} participants • 
                {summary.sessionOverview.sessionDuration} duration
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
          {/* Executive Summary */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-roundtable-primary mb-4 border-b-2 border-roundtable-accent pb-2">
              📊 Executive Summary
            </h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">🎯 Key Findings</h4>
                  <ul className="space-y-1 text-gray-700">
                    {summary.executiveSummary.keyFindings.map((finding, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-roundtable-accent mr-2">•</span>
                        <span>{finding}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">⚠️ Risk Factors</h4>
                  <ul className="space-y-1 text-gray-700">
                    {summary.executiveSummary.riskFactors.map((risk, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-red-500 mr-2">•</span>
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">💡 Strategic Recommendations</h4>
                  <ul className="space-y-1 text-gray-700">
                    {summary.executiveSummary.strategicRecommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-green-600 mr-2">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">🚀 Next Steps</h4>
                  <ul className="space-y-1 text-gray-700">
                    {summary.executiveSummary.nextSteps.map((step, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Question-by-Question Summaries */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-roundtable-primary mb-4 border-b-2 border-roundtable-accent pb-2">
              📝 Section-by-Section Analysis
            </h3>
            
            <div className="space-y-6">
              {summary.questionSummaries.map((qSummary, idx) => (
                <div key={qSummary.questionId} className="bg-gray-50 rounded-lg p-6">
                  <div className="mb-4">
                    <h4 className="text-lg font-semibold text-roundtable-primary mb-2">
                      {idx + 1}. {qSummary.questionTitle}
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">{qSummary.questionText}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      <span>👥 {qSummary.participantCount} contributors</span>
                      <span>🏷️ {qSummary.keyThemes.length} key themes</span>
                    </div>
                  </div>

                  {/* Narrative Summary */}
                  <div className="mb-4">
                    <h5 className="font-medium text-gray-800 mb-2">Discussion Summary</h5>
                    <p className="text-gray-700 leading-relaxed">{qSummary.narrativeSummary}</p>
                  </div>

                  {/* Key Themes */}
                  {qSummary.keyThemes.length > 0 && (
                    <div className="mb-3">
                      <h5 className="font-medium text-gray-800 mb-2">Key Themes</h5>
                      <div className="flex flex-wrap gap-2">
                        {qSummary.keyThemes.map((theme, themeIdx) => (
                          <span key={themeIdx} className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full">
                            {theme}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Critical Insights */}
                  {qSummary.criticalInsights.length > 0 && (
                    <div className="mb-3">
                      <h5 className="font-medium text-gray-800 mb-2">💡 Critical Insights</h5>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {qSummary.criticalInsights.map((insight, insightIdx) => (
                          <li key={insightIdx} className="flex items-start">
                            <span className="text-yellow-500 mr-2">•</span>
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Strategic Implications */}
                  {qSummary.strategicImplications.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">🎯 Strategic Implications</h5>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {qSummary.strategicImplications.map((implication, impIdx) => (
                          <li key={impIdx} className="flex items-start">
                            <span className="text-green-600 mr-2">•</span>
                            <span>{implication}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Overall Conclusion */}
          <section className="mb-6">
            <h3 className="text-xl font-bold text-roundtable-primary mb-4 border-b-2 border-roundtable-accent pb-2">
              🎯 Overall Strategic Conclusion
            </h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <p className="text-gray-800 leading-relaxed whitespace-pre-line">
                {summary.fullNarrativeConclusion}
              </p>
            </div>
          </section>
        </div>

        {/* Footer with Export Options */}
        <div className="bg-gray-50 px-6 py-4 border-t">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Generated: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleExport('csv')}
                disabled={isExporting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {isExporting && exportFormat === 'csv' ? 'Exporting...' : '📊 Export CSV'}
              </button>
              <button
                onClick={() => handleExport('pdf')}
                disabled={isExporting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {isExporting && exportFormat === 'pdf' ? 'Exporting...' : '📄 Export PDF'}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions for export functionality
function generatePrintHTML(summary: SessionSummary): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>AI Roundtable Session Summary</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; color: #333; }
        h1 { color: #2563eb; border-bottom: 3px solid #10b981; padding-bottom: 10px; }
        h2 { color: #2563eb; margin-top: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; }
        h3 { color: #374151; margin-top: 20px; }
        .executive-summary { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .question-section { background: #f9fafb; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #10b981; }
        .themes { margin: 10px 0; }
        .theme-tag { background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 12px; font-size: 12px; margin-right: 8px; }
        ul { margin: 10px 0; padding-left: 20px; }
        li { margin: 5px 0; }
        .conclusion { background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bfdbfe; }
        .session-info { color: #6b7280; font-size: 14px; margin-bottom: 20px; }
        @media print { body { margin: 20px; } .no-print { display: none; } }
    </style>
</head>
<body>
    <h1>AI Roundtable Session Summary</h1>
    
    <div class="session-info">
        ${summary.sessionOverview.questionsCompleted} sections completed • 
        ${summary.sessionOverview.totalParticipants} participants • 
        ${summary.sessionOverview.sessionDuration} duration • 
        Generated: ${new Date().toLocaleDateString()}
    </div>

    <div class="executive-summary">
        <h2>Executive Summary</h2>
        
        <h3>Key Findings</h3>
        <ul>
            ${summary.executiveSummary.keyFindings.map(finding => `<li>${finding}</li>`).join('')}
        </ul>

        <h3>Strategic Recommendations</h3>
        <ul>
            ${summary.executiveSummary.strategicRecommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>

        <h3>Next Steps</h3>
        <ul>
            ${summary.executiveSummary.nextSteps.map(step => `<li>${step}</li>`).join('')}
        </ul>

        <h3>Risk Factors</h3>
        <ul>
            ${summary.executiveSummary.riskFactors.map(risk => `<li>${risk}</li>`).join('')}
        </ul>
    </div>

    <h2>Section-by-Section Analysis</h2>
    
    ${summary.questionSummaries.map((q, idx) => `
        <div class="question-section">
            <h3>${idx + 1}. ${q.questionTitle}</h3>
            <p><em>${q.questionText}</em></p>
            <p><strong>Contributors:</strong> ${q.participantCount} • <strong>Key Themes:</strong> ${q.keyThemes.length}</p>
            
            <h4>Discussion Summary</h4>
            <p>${q.narrativeSummary}</p>
            
            ${q.keyThemes.length > 0 ? `
                <h4>Key Themes</h4>
                <div class="themes">
                    ${q.keyThemes.map(theme => `<span class="theme-tag">${theme}</span>`).join('')}
                </div>
            ` : ''}
            
            ${q.criticalInsights.length > 0 ? `
                <h4>Critical Insights</h4>
                <ul>
                    ${q.criticalInsights.map(insight => `<li>${insight}</li>`).join('')}
                </ul>
            ` : ''}
            
            ${q.strategicImplications.length > 0 ? `
                <h4>Strategic Implications</h4>
                <ul>
                    ${q.strategicImplications.map(impl => `<li>${impl}</li>`).join('')}
                </ul>
            ` : ''}
        </div>
    `).join('')}

    <div class="conclusion">
        <h2>Overall Strategic Conclusion</h2>
        <p>${summary.fullNarrativeConclusion.replace(/\n/g, '</p><p>')}</p>
    </div>
</body>
</html>`;
}

function generateCSVData(summary: SessionSummary): string {
  const csvRows = [];
  
  // Header
  csvRows.push('Section,Type,Content');
  
  // Session Overview
  csvRows.push(`Session Overview,Total Participants,${summary.sessionOverview.totalParticipants}`);
  csvRows.push(`Session Overview,Questions Completed,${summary.sessionOverview.questionsCompleted}`);
  csvRows.push(`Session Overview,Duration,${summary.sessionOverview.sessionDuration}`);
  csvRows.push(`Session Overview,Engagement Level,${summary.sessionOverview.overallEngagement}`);
  
  // Executive Summary
  summary.executiveSummary.keyFindings.forEach(finding => {
    csvRows.push(`Executive Summary,Key Finding,"${finding.replace(/"/g, '""')}"`);
  });
  
  summary.executiveSummary.strategicRecommendations.forEach(rec => {
    csvRows.push(`Executive Summary,Strategic Recommendation,"${rec.replace(/"/g, '""')}"`);
  });
  
  summary.executiveSummary.nextSteps.forEach(step => {
    csvRows.push(`Executive Summary,Next Step,"${step.replace(/"/g, '""')}"`);
  });
  
  summary.executiveSummary.riskFactors.forEach(risk => {
    csvRows.push(`Executive Summary,Risk Factor,"${risk.replace(/"/g, '""')}"`);
  });
  
  // Question Summaries
  summary.questionSummaries.forEach((q, idx) => {
    csvRows.push(`Question ${idx + 1},Title,"${q.questionTitle.replace(/"/g, '""')}"`);
    csvRows.push(`Question ${idx + 1},Question Text,"${q.questionText.replace(/"/g, '""')}"`);
    csvRows.push(`Question ${idx + 1},Participant Count,${q.participantCount}`);
    csvRows.push(`Question ${idx + 1},Narrative Summary,"${q.narrativeSummary.replace(/"/g, '""')}"`);
    
    q.keyThemes.forEach(theme => {
      csvRows.push(`Question ${idx + 1},Key Theme,"${theme.replace(/"/g, '""')}"`);
    });
    
    q.criticalInsights.forEach(insight => {
      csvRows.push(`Question ${idx + 1},Critical Insight,"${insight.replace(/"/g, '""')}"`);
    });
    
    q.strategicImplications.forEach(impl => {
      csvRows.push(`Question ${idx + 1},Strategic Implication,"${impl.replace(/"/g, '""')}"`);
    });
  });
  
  // Overall Conclusion
  csvRows.push(`Overall Conclusion,Full Narrative,"${summary.fullNarrativeConclusion.replace(/"/g, '""')}"`);
  
  return csvRows.join('\n');
}
