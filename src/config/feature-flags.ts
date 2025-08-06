// Feature flags for safe rollout of new enhancements
// Each feature can be toggled independently for testing
// Set to false initially, enable one at a time after testing

export const FEATURES = {
  // Phase 1: Template Creation System
  // Allows users to save current session configuration as reusable templates
  TEMPLATE_CREATION: true,  // Turn on after Phase 1 testing
  
  // Phase 2: Mobile Responsive Design
  // Adds mobile-optimized layout with tab navigation
  MOBILE_RESPONSIVE: false,  // Turn on after Phase 2 testing
  
  // Phase 3: Enhanced AI Context
  // Adds phase-aware AI analysis (introduction, exploration, synthesis, action)
  ENHANCED_AI: false,        // Turn on after Phase 3 testing
  
  // Phase 4: Three-Pane Analysis UI
  // Combines insights, themes, and questions into single analysis view
  THREE_PANE_UI: false,      // Turn on after Phase 4 testing
};

// Helper function to check if a feature is enabled
export function isFeatureEnabled(feature: keyof typeof FEATURES): boolean {
  return FEATURES[feature] === true;
}

// Development mode override - allows testing all features in development
// WARNING: Only use this for development testing, not production
export const DEV_MODE_ALL_FEATURES = false;

// Export feature check that respects dev mode
export function checkFeature(feature: keyof typeof FEATURES): boolean {
  if (DEV_MODE_ALL_FEATURES && process.env.NODE_ENV === 'development') {
    return true;
  }
  return FEATURES[feature];
}
