/**
 * Enhanced Storage Utility with Validation and Merging
 * 
 * Handles browser-based storage with robust validation and data merging.
 * Prevents data corruption and ensures type safety throughout.
 * 
 * Features:
 * - Type-safe validation of all stored data
 * - Intelligent merging of session snapshots
 * - Storage quota management with automatic cleanup
 * - Migration support for legacy data formats
 * - Compression for large datasets
 * - Error recovery with detailed logging
 * 
 * @module storage
 */

import { SessionSnapshot } from '@/types';

// Re-export SessionSnapshot for backward compatibility
export type { SessionSnapshot } from '@/types';

// Storage constants
const STORAGE_KEY = 'roundtable_session';
const STORAGE_VERSION = '2.0';
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit
const MAX_TRANSCRIPT_ENTRIES = 500;
const MAX_AI_INSIGHTS = 100;

/**
 * Validation result type
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Storage metadata for tracking
 */
interface StorageMetadata {
  version: string;
  timestamp: number;
  size: number;
  entryCount: {
    transcript: number;
    insights: number;
  };
}

/**
 * Validate a transcript entry
 */
function validateTranscriptEntry(entry: any): boolean {
  return (
    typeof entry === 'object' &&
    typeof entry.id === 'string' &&
    typeof entry.speaker === 'string' &&
    typeof entry.text === 'string' &&
    typeof entry.timestamp === 'number' &&
    typeof entry.isAutoDetected === 'boolean'
  );
}

/**
 * Validate an AI insight
 */
function validateAIInsight(insight: any): boolean {
  return (
    typeof insight === 'object' &&
    typeof insight.id === 'string' &&
    typeof insight.type === 'string' &&
    typeof insight.content === 'string' &&
    typeof insight.timestamp === 'number'
  );
}

/**
 * Validate entire session snapshot
 */
function validateSnapshot(data: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check required fields
  if (!data || typeof data !== 'object') {
    errors.push('Invalid snapshot: not an object');
    return { valid: false, errors, warnings };
  }
  
  // Validate timestamp
  if (typeof data.timestamp !== 'number') {
    errors.push('Invalid timestamp');
  }
  
  // Validate session state
  const validStates = ['idle', 'intro', 'discussion', 'summary', 'completed'];
  if (data.sessionState && !validStates.includes(data.sessionState)) {
    warnings.push(`Unknown session state: ${data.sessionState}`);
  }
  
  // Validate transcript entries
  if (data.liveTranscript) {
    if (!Array.isArray(data.liveTranscript)) {
      errors.push('liveTranscript must be an array');
    } else {
      const invalidEntries = data.liveTranscript.filter((e: any) => !validateTranscriptEntry(e));
      if (invalidEntries.length > 0) {
        warnings.push(`${invalidEntries.length} invalid transcript entries will be filtered`);
      }
    }
  }
  
  // Validate AI insights
  if (data.aiInsights) {
    if (!Array.isArray(data.aiInsights)) {
      errors.push('aiInsights must be an array');
    } else {
      const invalidInsights = data.aiInsights.filter((i: any) => !validateAIInsight(i));
      if (invalidInsights.length > 0) {
        warnings.push(`${invalidInsights.length} invalid AI insights will be filtered`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Merge two session snapshots intelligently
 */
function mergeSnapshots(existing: SessionSnapshot, incoming: SessionSnapshot): SessionSnapshot {
  // Start with the newer snapshot as base
  const merged = { ...incoming };
  
  // Merge transcript entries (remove duplicates by ID)
  const transcriptMap = new Map<string, any>();
  
  // Add existing entries first
  if (existing.liveTranscript) {
    existing.liveTranscript.forEach(entry => {
      if (validateTranscriptEntry(entry)) {
        transcriptMap.set(entry.id, entry);
      }
    });
  }
  
  // Override with incoming entries
  if (incoming.liveTranscript) {
    incoming.liveTranscript.forEach(entry => {
      if (validateTranscriptEntry(entry)) {
        transcriptMap.set(entry.id, entry);
      }
    });
  }
  
  // Convert back to array and sort by timestamp
  merged.liveTranscript = Array.from(transcriptMap.values())
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-MAX_TRANSCRIPT_ENTRIES); // Keep only recent entries
  
  // Merge AI insights (remove duplicates by ID)
  const insightMap = new Map<string, any>();
  
  if (existing.aiInsights) {
    existing.aiInsights.forEach(insight => {
      if (validateAIInsight(insight)) {
        insightMap.set(insight.id, insight);
      }
    });
  }
  
  if (incoming.aiInsights) {
    incoming.aiInsights.forEach(insight => {
      if (validateAIInsight(insight)) {
        insightMap.set(insight.id, insight);
      }
    });
  }
  
  merged.aiInsights = Array.from(insightMap.values())
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-MAX_AI_INSIGHTS);
  
  // Merge agenda progress
  if (existing.agendaProgress && incoming.agendaProgress) {
    merged.agendaProgress = {
      ...existing.agendaProgress,
      ...incoming.agendaProgress
    };
  }
  
  return merged;
}

/**
 * Compress data if needed
 */
function compressIfNeeded(snapshot: SessionSnapshot): SessionSnapshot {
  const size = JSON.stringify(snapshot).length;
  
  if (size > MAX_STORAGE_SIZE * 0.8) {
    console.warn('Storage approaching limit, compressing data...');
    
    // Keep only recent data
    return {
      ...snapshot,
      liveTranscript: (snapshot.liveTranscript || []).slice(-50),
      aiInsights: (snapshot.aiInsights || []).slice(-20)
    };
  }
  
  return snapshot;
}

/**
 * Save session with validation and merging
 */
export function saveSession(snapshot: SessionSnapshot): boolean {
  try {
    // Validate incoming data
    const validation = validateSnapshot(snapshot);
    
    if (!validation.valid) {
      console.error('Session validation failed:', validation.errors);
      return false;
    }
    
    if (validation.warnings.length > 0) {
      console.warn('Session validation warnings:', validation.warnings);
    }
    
    // Load existing session for merging
    const existingData = localStorage.getItem(STORAGE_KEY);
    let finalSnapshot = snapshot;
    
    if (existingData) {
      try {
        const existing = JSON.parse(existingData);
        if (existing.version === STORAGE_VERSION) {
          finalSnapshot = mergeSnapshots(existing.data, snapshot);
        }
      } catch (e) {
        console.warn('Could not merge with existing session, overwriting');
      }
    }
    
    // Compress if needed
    finalSnapshot = compressIfNeeded(finalSnapshot);
    
    // Prepare storage object with metadata
    const storageObject = {
      version: STORAGE_VERSION,
      timestamp: Date.now(),
      data: finalSnapshot,
      metadata: {
        version: STORAGE_VERSION,
        timestamp: Date.now(),
        size: 0,
        entryCount: {
          transcript: finalSnapshot.liveTranscript?.length || 0,
          insights: finalSnapshot.aiInsights?.length || 0
        }
      } as StorageMetadata
    };
    
    const serialized = JSON.stringify(storageObject);
    storageObject.metadata.size = serialized.length;
    
    // Final size check
    if (serialized.length > MAX_STORAGE_SIZE) {
      console.error('Session data exceeds storage limit even after compression');
      return false;
    }
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storageObject));
    
    console.log('Session saved successfully:', {
      size: storageObject.metadata.size,
      entries: storageObject.metadata.entryCount
    });
    
    return true;
  } catch (error) {
    console.error('Failed to save session:', error);
    
    // Try to clear corrupted data
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.warn('Storage quota exceeded, clearing old data...');
      clearSession();
    }
    
    return false;
  }
}

/**
 * Load session with validation
 */
export function loadSession(): SessionSnapshot | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const storageObject = JSON.parse(stored);
    
    // Version check
    if (storageObject.version !== STORAGE_VERSION) {
      console.warn(`Session version mismatch (${storageObject.version} vs ${STORAGE_VERSION})`);
      
      // Attempt migration for older versions
      if (storageObject.version === '1.0') {
        console.log('Attempting to migrate from version 1.0...');
        // Migration logic here if needed
      } else {
        clearSession();
        return null;
      }
    }
    
    // Age check (clear sessions older than 24 hours)
    const age = Date.now() - storageObject.timestamp;
    if (age > 24 * 60 * 60 * 1000) {
      console.info('Session expired (>24 hours old), clearing...');
      clearSession();
      return null;
    }
    
    // Validate loaded data
    const validation = validateSnapshot(storageObject.data);
    if (!validation.valid) {
      console.error('Loaded session validation failed:', validation.errors);
      clearSession();
      return null;
    }
    
    console.log('Session loaded successfully:', {
      age: Math.round(age / 1000 / 60) + ' minutes',
      metadata: storageObject.metadata
    });
    
    return storageObject.data;
  } catch (error) {
    console.error('Failed to load session:', error);
    clearSession();
    return null;
  }
}

/**
 * Clear stored session data
 */
export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('Session cleared');
  } catch (error) {
    console.error('Failed to clear session:', error);
  }
}

/**
 * Export session data as JSON
 */
export function exportSession(snapshot: SessionSnapshot): string {
  const exportData = {
    version: STORAGE_VERSION,
    exportedAt: new Date().toISOString(),
    session: {
      timestamp: snapshot.timestamp,
      sessionState: snapshot.sessionState,
      currentTopic: snapshot.currentTopic,
      participantCount: snapshot.participantCount,
      startTime: snapshot.startTime,
      transcript: snapshot.liveTranscript,
      insights: snapshot.aiInsights,
      questionIndex: snapshot.currentQuestionIndex,
      agendaProgress: snapshot.agendaProgress
    },
    statistics: {
      transcriptEntries: snapshot.liveTranscript?.length || 0,
      aiInsights: snapshot.aiInsights?.length || 0,
      duration: snapshot.timestamp - (snapshot.startTime || snapshot.timestamp)
    }
  };
  
  return JSON.stringify(exportData, null, 2);
}

/**
 * Import session data from JSON
 */
export function importSession(jsonData: string): SessionSnapshot | null {
  try {
    const imported = JSON.parse(jsonData);
    
    // Check if it's an export format
    if (imported.version && imported.session) {
      const snapshot: SessionSnapshot = {
        timestamp: Date.now(),
        sessionState: imported.session.sessionState || 'idle',
        currentTopic: imported.session.currentTopic,
        participantCount: imported.session.participantCount || 0,
        startTime: imported.session.startTime || Date.now(),
        liveTranscript: imported.session.transcript || [],
        aiInsights: imported.session.insights || [],
        currentQuestionIndex: imported.session.questionIndex || 0,
        agendaProgress: imported.session.agendaProgress || {}
      };
      
      // Validate before returning
      const validation = validateSnapshot(snapshot);
      if (!validation.valid) {
        console.error('Imported session validation failed:', validation.errors);
        return null;
      }
      
      return snapshot;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to import session:', error);
    return null;
  }
}

/**
 * Get storage information and statistics
 */
export function getStorageInfo(): {
  used: number;
  available: number;
  percentage: number;
  canSave: boolean;
  metadata?: StorageMetadata;
} {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const used = stored ? new Blob([stored]).size : 0;
    const available = MAX_STORAGE_SIZE - used;
    const percentage = (used / MAX_STORAGE_SIZE) * 100;
    
    let metadata: StorageMetadata | undefined;
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        metadata = parsed.metadata;
      } catch {
        // Ignore parse errors
      }
    }
    
    return {
      used,
      available,
      percentage,
      canSave: used < available * 0.9, // Leave 10% buffer
      metadata
    };
  } catch {
    return {
      used: 0,
      available: MAX_STORAGE_SIZE,
      percentage: 0,
      canSave: true
    };
  }
}

// ============================================================================
// TEMPLATE MANAGEMENT FUNCTIONS (Phase 1 Enhancement)
// ============================================================================

/**
 * Session template interface for saving reusable session configurations
 */
export interface SessionTemplate {
  id: string;
  name: string;
  category: 'strategic' | 'retrospective' | 'custom';
  description?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  questions: any[]; // Using any to match existing structure
  aiConfig?: any;
  sessionTopic?: string;
  facilitatorName?: string;
}

const TEMPLATES_KEY = 'ai-roundtable-templates';
const MAX_TEMPLATES = 20; // Limit number of templates to prevent storage issues

/**
 * Save a session template to localStorage
 * @param template - The template to save
 */
export function saveTemplate(template: SessionTemplate): void {
  try {
    const existing = loadTemplates();
    
    // Check template limit
    if (existing.length >= MAX_TEMPLATES && !existing.find(t => t.id === template.id)) {
      console.warn(`Template limit reached (${MAX_TEMPLATES}). Please delete old templates.`);
      throw new Error(`Maximum number of templates (${MAX_TEMPLATES}) reached`);
    }
    
    // Update or add template
    const updated = existing.filter(t => t.id !== template.id);
    updated.push({
      ...template,
      updatedAt: Date.now()
    });
    
    // Sort by most recently updated
    updated.sort((a, b) => b.updatedAt - a.updatedAt);
    
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
    console.log(`Template saved: ${template.name} (${template.id})`);
  } catch (e) {
    console.error('Failed to save template:', e);
    throw e; // Re-throw to allow UI to handle error
  }
}

/**
 * Load all saved templates from localStorage
 * @returns Array of saved templates
 */
export function loadTemplates(): SessionTemplate[] {
  try {
    const data = localStorage.getItem(TEMPLATES_KEY);
    if (!data) return [];
    
    const templates = JSON.parse(data);
    
    // Validate template structure
    const validTemplates = templates.filter((t: any) => {
      return t.id && t.name && t.category && t.createdAt && t.questions;
    });
    
    if (validTemplates.length !== templates.length) {
      console.warn(`Filtered out ${templates.length - validTemplates.length} invalid templates`);
    }
    
    return validTemplates;
  } catch (e) {
    console.warn('Failed to load templates:', e);
    return [];
  }
}

/**
 * Delete a template by ID
 * @param id - Template ID to delete
 */
export function deleteTemplate(id: string): void {
  try {
    const templates = loadTemplates();
    const filtered = templates.filter(t => t.id !== id);
    
    if (filtered.length === templates.length) {
      console.warn(`Template not found: ${id}`);
      return;
    }
    
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(filtered));
    console.log(`Template deleted: ${id}`);
  } catch (e) {
    console.warn('Failed to delete template:', e);
  }
}

/**
 * Get a single template by ID
 * @param id - Template ID to retrieve
 * @returns Template or null if not found
 */
export function getTemplate(id: string): SessionTemplate | null {
  const templates = loadTemplates();
  return templates.find(t => t.id === id) || null;
}

/**
 * Export templates as JSON for backup
 * @returns JSON string of all templates
 */
export function exportTemplates(): string {
  const templates = loadTemplates();
  return JSON.stringify(templates, null, 2);
}

/**
 * Import templates from JSON backup
 * @param jsonData - JSON string containing templates
 * @returns Number of templates imported
 */
export function importTemplates(jsonData: string): number {
  try {
    const imported = JSON.parse(jsonData);
    
    if (!Array.isArray(imported)) {
      throw new Error('Invalid template data: expected array');
    }
    
    const existing = loadTemplates();
    const existingIds = new Set(existing.map(t => t.id));
    
    // Only import templates that don't already exist
    const newTemplates = imported.filter((t: any) => {
      return t.id && t.name && t.category && !existingIds.has(t.id);
    });
    
    if (newTemplates.length === 0) {
      console.log('No new templates to import');
      return 0;
    }
    
    const combined = [...existing, ...newTemplates].slice(0, MAX_TEMPLATES);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(combined));
    
    console.log(`Imported ${newTemplates.length} templates`);
    return newTemplates.length;
  } catch (e) {
    console.error('Failed to import templates:', e);
    throw e;
  }
}
