/**
 * TemplateSelector Component
 * Executive session template selection with category filtering
 */

'use client';

import React, { useState } from 'react';
import { SESSION_TEMPLATES, SessionTemplate, getTemplatesByCategory, getTemplateCategories, templateToSessionContext } from '@/config/session-templates';

interface TemplateSelectorProps {
  onTemplateSelect: (sessionContext: any) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function TemplateSelector({ onTemplateSelect, onClose, isOpen }: TemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<SessionTemplate | null>(null);

  if (!isOpen) return null;

  const categories = getTemplateCategories();
  const filteredTemplates = selectedCategory === 'all' 
    ? SESSION_TEMPLATES 
    : getTemplatesByCategory(selectedCategory as SessionTemplate['category']);

  const handleTemplateSelection = (template: SessionTemplate) => {
    const sessionContext = templateToSessionContext(template);
    onTemplateSelect(sessionContext);
    onClose();
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      'transformation': 'Digital Transformation',
      'strategy': 'Strategic Planning',
      'operations': 'Operational Excellence',
      'innovation': 'Innovation Strategy',
      'all': 'All Templates'
    };
    return labels[category as keyof typeof labels] || category;
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      'transformation': '🚀',
      'strategy': '🎯',
      'operations': '⚙️',
      'innovation': '💡',
      'all': '📋'
    };
    return icons[category as keyof typeof icons] || '📋';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Executive Session Templates</h2>
              <p className="text-blue-100 mt-1">Pre-configured strategic discussion frameworks</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Category Sidebar */}
          <div className="w-1/4 bg-gray-50 border-r border-gray-200 p-4">
            <h3 className="font-semibold text-gray-700 mb-4">Categories</h3>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center space-x-3 transition-colors ${
                  selectedCategory === 'all' 
                    ? 'bg-blue-100 text-blue-700 font-medium' 
                    : 'hover:bg-gray-200 text-gray-600'
                }`}
              >
                <span className="text-lg">📋</span>
                <span>All Templates</span>
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center space-x-3 transition-colors ${
                    selectedCategory === category 
                      ? 'bg-blue-100 text-blue-700 font-medium' 
                      : 'hover:bg-gray-200 text-gray-600'
                  }`}
                >
                  <span className="text-lg">{getCategoryIcon(category)}</span>
                  <span>{getCategoryLabel(category)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Template List */}
          <div className="w-3/4 p-6 overflow-y-auto">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {getCategoryLabel(selectedCategory)} 
                <span className="ml-2 text-sm text-gray-500">({filteredTemplates.length} templates)</span>
              </h3>
            </div>

            <div className="grid gap-4">
              {filteredTemplates.map(template => (
                <div 
                  key={template.id}
                  className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getCategoryIcon(template.category)}</span>
                      <div>
                        <h4 className="font-semibold text-gray-800 text-lg">{template.title}</h4>
                        <p className="text-gray-600 text-sm">{template.description}</p>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <div>{template.duration} min</div>
                      <div>{template.phases.length} phases</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {template.participantRoles.slice(0, 3).map(role => (
                        <span key={role} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          {role}
                        </span>
                      ))}
                      {template.participantRoles.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          +{template.participantRoles.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <h5 className="font-medium text-gray-700 mb-2">Key Objectives:</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {template.objectives.slice(0, 2).map((objective, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-blue-500 mr-2">•</span>
                          {objective}
                        </li>
                      ))}
                      {template.objectives.length > 2 && (
                        <li className="text-gray-500 italic">+{template.objectives.length - 2} more objectives</li>
                      )}
                    </ul>
                  </div>

                  <div className="mb-4">
                    <h5 className="font-medium text-gray-700 mb-2">Business Value:</h5>
                    <p className="text-sm text-gray-600 italic">{template.businessValue}</p>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                    <div className="text-sm text-gray-500">
                      <span className="font-medium">Competitive Context:</span> {template.competitiveContext}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTemplateSelection(template);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Use This Template
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Template Detail Modal */}
        {selectedTemplate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold">{selectedTemplate.title}</h3>
                    <p className="text-indigo-100">{selectedTemplate.description}</p>
                  </div>
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="text-white hover:text-gray-200 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Session Details</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li><strong>Duration:</strong> {selectedTemplate.duration} minutes</li>
                      <li><strong>Phases:</strong> {selectedTemplate.phases.length}</li>
                      <li><strong>Category:</strong> {getCategoryLabel(selectedTemplate.category)}</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Participants</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedTemplate.participantRoles.map(role => (
                        <span key={role} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="font-semibold text-gray-800 mb-3">Strategic Objectives</h4>
                  <ul className="space-y-2">
                    {selectedTemplate.objectives.map((objective, index) => (
                      <li key={index} className="flex items-start text-sm text-gray-600">
                        <span className="text-blue-500 mr-2 mt-1">•</span>
                        {objective}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mb-6">
                  <h4 className="font-semibold text-gray-800 mb-3">Session Phases</h4>
                  <div className="space-y-4">
                    {selectedTemplate.phases.map((phase, index) => (
                      <div key={phase.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-medium text-gray-800">
                            Phase {index + 1}: {phase.title}
                          </h5>
                          <span className="text-sm text-gray-500">{phase.duration} min</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{phase.objective}</p>
                        <div className="text-sm">
                          <strong className="text-gray-700">Key Questions:</strong>
                          <ul className="mt-1 space-y-1 ml-4">
                            {phase.keyQuestions.slice(0, 2).map((question, qIndex) => (
                              <li key={qIndex} className="text-gray-600">• {question}</li>
                            ))}
                            {phase.keyQuestions.length > 2 && (
                              <li className="text-gray-500 italic">+{phase.keyQuestions.length - 2} more questions</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Success Metrics</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {selectedTemplate.successMetrics.map((metric, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-green-500 mr-2">✓</span>
                          {metric}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Business Value</h4>
                    <p className="text-sm text-gray-600 italic mb-3">{selectedTemplate.businessValue}</p>
                    <h4 className="font-semibold text-gray-800 mb-2">Competitive Context</h4>
                    <p className="text-sm text-gray-600">{selectedTemplate.competitiveContext}</p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back to Templates
                  </button>
                  <button
                    onClick={() => handleTemplateSelection(selectedTemplate)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Use This Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
