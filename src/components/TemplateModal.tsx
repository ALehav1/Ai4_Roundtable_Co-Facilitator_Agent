/**
 * Template Modal Component
 * 
 * Feature-flagged modal for saving and managing session templates.
 * Part of Phase 1 enhancement - Template Creation System.
 * 
 * This component is only rendered when FEATURES.TEMPLATE_CREATION is enabled.
 */

import React, { useState, useEffect } from 'react';
import { 
  SessionTemplate, 
  saveTemplate, 
  loadTemplates, 
  deleteTemplate,
  getTemplate 
} from '../utils/storage';
import { RoundtableQuestion } from '../config/roundtable-config';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (template: SessionTemplate) => void;
  onLoad?: (template: SessionTemplate) => void;
  currentSession?: {
    sessionTopic: string;
    facilitatorName: string;
    questions: RoundtableQuestion[];
  };
  mode: 'save' | 'load' | 'manage';
}

export const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onLoad,
  currentSession,
  mode
}) => {
  const [templates, setTemplates] = useState<SessionTemplate[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState<'strategic' | 'retrospective' | 'custom'>('custom');
  const [templateTags, setTemplateTags] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load templates when modal opens
  useEffect(() => {
    if (isOpen) {
      const loaded = loadTemplates();
      setTemplates(loaded);
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  // Handle saving a new template
  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      setError('Please enter a template name');
      return;
    }

    if (!currentSession) {
      setError('No active session to save as template');
      return;
    }

    try {
      const newTemplate: SessionTemplate = {
        id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: templateName.trim(),
        category: templateCategory,
        description: templateDescription.trim(),
        tags: templateTags.split(',').map(t => t.trim()).filter(t => t),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        questions: currentSession.questions,
        sessionTopic: currentSession.sessionTopic,
        facilitatorName: currentSession.facilitatorName
      };

      saveTemplate(newTemplate);
      setTemplates(loadTemplates());
      setSuccessMessage(`Template "${templateName}" saved successfully!`);
      
      // Clear form
      setTemplateName('');
      setTemplateDescription('');
      setTemplateCategory('custom');
      setTemplateTags('');

      // Call onSave callback if provided
      if (onSave) {
        onSave(newTemplate);
      }

      // Close modal after short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save template');
    }
  };

  // Handle loading a template
  const handleLoadTemplate = () => {
    if (!selectedTemplateId) {
      setError('Please select a template to load');
      return;
    }

    const template = getTemplate(selectedTemplateId);
    if (!template) {
      setError('Template not found');
      return;
    }

    if (onLoad) {
      onLoad(template);
      setSuccessMessage(`Template "${template.name}" loaded!`);
      setTimeout(() => {
        onClose();
      }, 1000);
    }
  };

  // Handle deleting a template
  const handleDeleteTemplate = (id: string) => {
    const template = templates.find(t => t.id === id);
    if (!template) return;

    if (confirm(`Are you sure you want to delete the template "${template.name}"?`)) {
      deleteTemplate(id);
      setTemplates(loadTemplates());
      setSuccessMessage(`Template "${template.name}" deleted`);
      setSelectedTemplateId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {mode === 'save' && 'Save Session as Template'}
            {mode === 'load' && 'Load Template'}
            {mode === 'manage' && 'Manage Templates'}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              {successMessage}
            </div>
          )}

          {/* Save Template Form */}
          {mode === 'save' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Q4 Planning Session"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={templateCategory}
                  onChange={(e) => setTemplateCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="strategic">Strategic Planning</option>
                  <option value="retrospective">Team Retrospective</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Brief description of this template..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={templateTags}
                  onChange={(e) => setTemplateTags(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., planning, quarterly, strategy"
                />
              </div>

              {currentSession && (
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-medium text-gray-700 mb-2">Current Session Info</h3>
                  <p className="text-sm text-gray-600">Topic: {currentSession.sessionTopic || 'Not set'}</p>
                  <p className="text-sm text-gray-600">Facilitator: {currentSession.facilitatorName || 'Not set'}</p>
                  <p className="text-sm text-gray-600">Questions: {currentSession.questions.length}</p>
                </div>
              )}
            </div>
          )}

          {/* Load/Manage Templates List */}
          {(mode === 'load' || mode === 'manage') && (
            <div className="space-y-4">
              {templates.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No templates saved yet</p>
              ) : (
                <div className="space-y-2">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedTemplateId === template.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onClick={() => setSelectedTemplateId(template.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{template.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Category: {template.category} | Questions: {template.questions?.length || 0}
                          </p>
                          {template.description && (
                            <p className="text-sm text-gray-500 mt-2">{template.description}</p>
                          )}
                          {template.tags && template.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {template.tags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            Created: {new Date(template.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {mode === 'manage' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTemplate(template.id);
                            }}
                            className="ml-4 text-red-600 hover:text-red-800"
                            aria-label="Delete template"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          {mode === 'save' && (
            <button
              onClick={handleSaveTemplate}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Save Template
            </button>
          )}
          {mode === 'load' && (
            <button
              onClick={handleLoadTemplate}
              disabled={!selectedTemplateId}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Load Selected
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
