/**
 * FacilitatorPanel Component
 * 
 * Displays real-time facilitator guidance during the roundtable session.
 * Shows opening lines, goals, framework details, key prompts, and pivot strategies
 * to help the facilitator guide the discussion effectively.
 * 
 * Features:
 * - Phase-aware guidance that updates with current question
 * - Framework visualization (Assistance → Automation → Amplification)
 * - Key prompts and pivot strategies for dynamic facilitation
 * - Transition lines to smoothly move between phases
 * 
 * Dependencies:
 * - React for component structure
 * - RoundtableQuestion type from config
 * - FacilitatorGuidance interface for content structure
 */

import React from 'react';
import { RoundtableQuestion, FacilitatorGuidance } from '../config/roundtable-config';

interface FacilitatorPanelProps {
  currentQuestion: RoundtableQuestion | null;
  questionIndex: number;
  totalQuestions: number;
}

/**
 * FacilitatorPanel - Displays contextual guidance for session facilitation
 * 
 * @param currentQuestion - The active question being discussed
 * @param questionIndex - Current position in the question sequence
 * @param totalQuestions - Total number of questions in the session
 */
export default function FacilitatorPanel({ 
  currentQuestion, 
  questionIndex, 
  totalQuestions 
}: FacilitatorPanelProps) {
  // If no question or no guidance, show placeholder
  if (!currentQuestion || !currentQuestion.facilitatorGuidance) {
    return (
      <div className="facilitator-panel bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-6 shadow-sm border border-purple-200">
        <h3 className="text-lg font-semibold text-purple-900 mb-3">
          🎯 Facilitator Guidance
        </h3>
        <p className="text-gray-600 italic">
          No specific guidance available for this phase. Follow the general discussion flow.
        </p>
      </div>
    );
  }

  const guidance: FacilitatorGuidance = currentQuestion.facilitatorGuidance;

  return (
    <div className="facilitator-panel bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-6 shadow-sm border border-purple-200 space-y-4">
      {/* Header with phase indicator */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-purple-900">
          🎯 Facilitator Guidance
        </h3>
        <span className="text-sm text-purple-600 font-medium">
          Phase {questionIndex + 1} of {totalQuestions}
        </span>
      </div>

      {/* Opening or Setup Line */}
      {(guidance.openingLine || guidance.setupLine) && (
        <div className="bg-white rounded-lg p-4 border-l-4 border-purple-400">
          <h4 className="text-sm font-semibold text-purple-700 mb-2">
            {guidance.openingLine ? '🎬 Opening Line' : '🎭 Setup Line'}
          </h4>
          <p className="text-gray-700 italic">
            "{guidance.openingLine || guidance.setupLine}"
          </p>
        </div>
      )}

      {/* Goal and Listen For */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4">
          <h4 className="text-sm font-semibold text-green-700 mb-2">
            🎯 Goal
          </h4>
          <p className="text-gray-700 text-sm">{guidance.goal}</p>
        </div>
        <div className="bg-white rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-700 mb-2">
            👂 Listen For
          </h4>
          <p className="text-gray-700 text-sm">{guidance.listenFor}</p>
        </div>
      </div>

      {/* Framework (if present) */}
      {guidance.framework && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-indigo-700 mb-3">
            📊 Three-Shift Framework
          </h4>
          <div className="space-y-3">
            {/* Assistance */}
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🤝</span>
              <div className="flex-1">
                <h5 className="font-medium text-gray-800">Assistance</h5>
                <p className="text-sm text-gray-600">{guidance.framework.assistance.definition}</p>
                <p className="text-xs text-red-600 mt-1">⚠️ {guidance.framework.assistance.limitation}</p>
              </div>
            </div>
            {/* Automation */}
            <div className="flex items-start space-x-3">
              <span className="text-2xl">⚙️</span>
              <div className="flex-1">
                <h5 className="font-medium text-gray-800">Automation</h5>
                <p className="text-sm text-gray-600">{guidance.framework.automation.definition}</p>
                <p className="text-xs text-red-600 mt-1">⚠️ {guidance.framework.automation.limitation}</p>
              </div>
            </div>
            {/* Amplification */}
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🚀</span>
              <div className="flex-1">
                <h5 className="font-medium text-gray-800">Amplification</h5>
                <p className="text-sm text-gray-600">{guidance.framework.amplification.definition}</p>
                <p className="text-xs text-red-600 mt-1">⚠️ {guidance.framework.amplification.requirement}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goal */}
      {guidance.goal && (
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <h4 className="text-sm font-semibold text-yellow-800 mb-2">
            🎯 Session Goal
          </h4>
          <p className="text-gray-700 font-medium">{guidance.goal}</p>
        </div>
      )}

      {/* SalesRecon Example */}
      {guidance.salesReconExample && (
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-700 mb-3">
            🎯 SalesRecon Example
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-white rounded p-2">
              <span className="font-medium text-gray-700">Prep:</span>
              <p className="text-gray-600 text-xs mt-1">{guidance.salesReconExample.prep}</p>
            </div>
            <div className="bg-white rounded p-2">
              <span className="font-medium text-gray-700">Pitch:</span>
              <p className="text-gray-600 text-xs mt-1">{guidance.salesReconExample.pitch}</p>
            </div>
            <div className="bg-white rounded p-2">
              <span className="font-medium text-gray-700">Insights:</span>
              <p className="text-gray-600 text-xs mt-1">{guidance.salesReconExample.insights}</p>
            </div>
            <div className="bg-white rounded p-2">
              <span className="font-medium text-gray-700">System:</span>
              <p className="text-gray-600 text-xs mt-1">{guidance.salesReconExample.system}</p>
            </div>
          </div>
        </div>
      )}

      {/* Key Prompts */}
      {guidance.keyPrompts && guidance.keyPrompts.length > 0 && (
        <div className="bg-white rounded-lg p-4">
          <h4 className="text-sm font-semibold text-indigo-700 mb-3">
            💬 Key Prompts
          </h4>
          <ul className="space-y-2">
            {guidance.keyPrompts?.map((prompt: string, index: number) => (
              <li key={index} className="flex items-start">
                <span className="text-indigo-500 mr-2">▸</span>
                <span className="text-gray-700 text-sm">{prompt}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Listen For */}
      {guidance.listenFor && (
        <div className="bg-orange-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-orange-700 mb-3">
            👂 Listen For
          </h4>
          <p className="text-sm text-gray-700">{guidance.listenFor}</p>
        </div>
      )}

      {/* Time Guide */}
      {guidance.timeGuide && (
        <div className="bg-gray-50 rounded-lg p-3 flex items-center space-x-2">
          <span className="text-lg">⏱️</span>
          <p className="text-sm text-gray-600">{guidance.timeGuide}</p>
        </div>
      )}

      {/* Transition Line */}
      {guidance.transitionLine && (
        <div className="bg-gradient-to-r from-purple-100 to-indigo-100 rounded-lg p-4 border-l-4 border-indigo-400">
          <h4 className="text-sm font-semibold text-indigo-700 mb-2">
            ➡️ Transition to Next Phase
          </h4>
          <p className="text-gray-700 italic">
            "{guidance.transitionLine}"
          </p>
        </div>
      )}
    </div>
  );
}
