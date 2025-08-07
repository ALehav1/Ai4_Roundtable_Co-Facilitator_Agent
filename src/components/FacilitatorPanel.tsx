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
import { RoundtableQuestion, FacilitatorGuidance } from '../config/ai-transformation-config';

interface FacilitatorPanelProps {
  currentQuestion: RoundtableQuestion | null;
  isVisible?: boolean;
}

/**
 * FacilitatorPanel - Displays contextual guidance for session facilitation
 * 
 * @param currentQuestion - The active question being discussed
 * @param isVisible - Whether the panel is visible
 */
export default function FacilitatorPanel({ currentQuestion, isVisible }: FacilitatorPanelProps) {
  if (!isVisible || !currentQuestion || !currentQuestion.facilitatorGuidance) {
    return null;
  }

  const guidance = currentQuestion.facilitatorGuidance;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
        <div className="flex items-center space-x-2 mb-3">
          <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
          <h3 className="font-semibold text-purple-900">
            {currentQuestion.title}
          </h3>
        </div>
        
        <p className="text-gray-700 text-sm mb-3">
          {currentQuestion.description}
        </p>
        
        <div className="text-xs text-purple-600 font-medium">
          Time Limit: {currentQuestion.timeLimit} minutes
        </div>
      </div>

      {/* Opening/Setup Line */}
      {(guidance.openingLine || guidance.setupLine) && (
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center">
            <span className="mr-2">🎬</span>
            Opening Line
          </h4>
          <p className="text-gray-700 font-medium italic">
            "{guidance.openingLine || guidance.setupLine}"
          </p>
        </div>
      )}

      {/* Main Objective */}
      {guidance.objective && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center">
            <span className="mr-2">🎯</span>
            Session Objective
          </h4>
          <p className="text-gray-700 font-medium">{guidance.objective}</p>
        </div>
      )}

      {/* What to Listen For */}
      {guidance.whatToListenFor && guidance.whatToListenFor.length > 0 && (
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <h4 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center">
            <span className="mr-2">👂</span>
            What to Listen For
          </h4>
          <ul className="space-y-1">
            {guidance.whatToListenFor.map((item, index) => (
              <li key={index} className="text-sm text-gray-700 flex items-start">
                <span className="text-yellow-500 mr-2">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Framework Display - Assistance → Automation → Amplification */}
      {guidance.framework && (
        <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
          <h4 className="text-sm font-semibold text-indigo-800 mb-3 flex items-center">
            <span className="mr-2">🔄</span>
            {guidance.framework.title}
          </h4>
          <div className="space-y-3">
            {guidance.framework.stages.map((stage, index) => (
              <div key={stage.name} className="bg-white rounded-md p-3 border border-indigo-100">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="h-2 w-2 bg-indigo-400 rounded-full"></div>
                  <h5 className="font-semibold text-indigo-900">{stage.name}</h5>
                </div>
                <p className="text-sm text-gray-700 mb-1">
                  <strong>Definition:</strong> {stage.definition}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Limitation:</strong> {stage.limitation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Example to Share (SalesRecon) */}
      {guidance.exampleToShare && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center">
            <span className="mr-2">💡</span>
            {guidance.exampleToShare.name} Example
          </h4>
          <ul className="space-y-2">
            {guidance.exampleToShare.points.map((point, index) => (
              <li key={index} className="flex items-start text-sm text-gray-700">
                <span className="text-blue-500 mr-2 mt-0.5">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Facilitator Prompts */}
      {guidance.facilitatorPrompts && guidance.facilitatorPrompts.length > 0 && (
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <h4 className="text-sm font-semibold text-orange-800 mb-3 flex items-center">
            <span className="mr-2">❓</span>
            Facilitator Prompts
          </h4>
          <ul className="space-y-2">
            {guidance.facilitatorPrompts.map((prompt, index) => (
              <li key={index} className="text-sm text-gray-700 font-medium">
                <span className="text-orange-500 mr-2">Q{index + 1}:</span>
                {prompt}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Single Key Prompt */}
      {guidance.keyPrompt && (
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <h4 className="text-sm font-semibold text-orange-800 mb-2 flex items-center">
            <span className="mr-2">❓</span>
            Key Prompt
          </h4>
          <p className="text-gray-700 font-medium italic">
            "{guidance.keyPrompt}"
          </p>
        </div>
      )}

      {/* Facilitator Prompt (for current question) */}
      {guidance.facilitatorPrompt && (
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <h4 className="text-sm font-semibold text-orange-800 mb-2 flex items-center">
            <span className="mr-2">❓</span>
            Main Question
          </h4>
          <p className="text-gray-700 font-medium italic">
            "{guidance.facilitatorPrompt}"
          </p>
        </div>
      )}

      {/* Key Message */}
      {guidance.keyMessage && (
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <h4 className="text-sm font-semibold text-purple-800 mb-2 flex items-center">
            <span className="mr-2">💬</span>
            Key Message
          </h4>
          <p className="text-gray-700 font-medium">
            {guidance.keyMessage}
          </p>
        </div>
      )}

      {/* Facilitation Tips */}
      {guidance.facilitationTips && guidance.facilitationTips.length > 0 && (
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center">
            <span className="mr-2">💡</span>
            Facilitation Tips
          </h4>
          <ul className="space-y-1">
            {guidance.facilitationTips.map((tip, index) => (
              <li key={index} className="text-sm text-gray-700 flex items-start">
                <span className="text-green-500 mr-2">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Presentation Notes */}
      {guidance.presentationNotes && guidance.presentationNotes.length > 0 && (
        <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
          <h4 className="text-sm font-semibold text-cyan-800 mb-2 flex items-center">
            <span className="mr-2">📋</span>
            Presentation Notes
          </h4>
          <ul className="space-y-1">
            {guidance.presentationNotes.map((note, index) => (
              <li key={index} className="text-sm text-gray-700 flex items-start">
                <span className="text-cyan-500 mr-2">•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Transition Line */}
      {guidance.transitionLine && (
        <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-gray-400">
          <h4 className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Transition</h4>
          <p className="text-sm text-gray-700 font-medium italic">
            "{guidance.transitionLine}"
          </p>
        </div>
      )}
    </div>
  );
}
