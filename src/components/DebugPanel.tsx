import React from 'react';

interface DebugPanelProps {
  sessionContext: any;
  setSessionContext: any;
  callAIAnalysis: (type: string) => Promise<void>;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ 
  sessionContext, 
  setSessionContext, 
  callAIAnalysis 
}) => {
  // Mock AI generation to test if UI updates work
  const mockAIGeneration = () => {
    const mockInsight = {
      id: Date.now().toString(),
      type: 'insight',
      content: 'TEST: This is a mock insight to verify UI updates are working correctly.',
      timestamp: new Date(),
      confidence: 1.0
    };
    
    setSessionContext((prev: any) => ({
      ...prev,
      aiInsights: [...(prev.aiInsights || []), mockInsight]
    }));
    
    console.log('✅ Mock insight added:', mockInsight);
  };

  // Test if AI request function exists and works
  const debugAIRequest = async () => {
    console.log('🔍 Checking AI setup:');
    console.log('- callAIAnalysis exists?', typeof callAIAnalysis === 'function');
    console.log('- sessionContext exists?', !!sessionContext);
    console.log('- liveTranscript exists?', !!sessionContext?.liveTranscript);
    console.log('- liveTranscript length:', sessionContext?.liveTranscript?.length || 0);
    console.log('- aiInsights array exists?', Array.isArray(sessionContext?.aiInsights));
    console.log('- aiInsights count:', sessionContext?.aiInsights?.length || 0);

    if (typeof callAIAnalysis !== 'function') {
      console.error('❌ callAIAnalysis is not available!');
      return;
    }

    try {
      console.log('📤 Attempting AI request...');
      await callAIAnalysis('insights');
      console.log('📥 AI Request completed');
    } catch (error) {
      console.error('❌ AI Request failed:', error);
    }
  };

  // Add sample transcript for testing
  const addSampleTranscript = () => {
    const sampleTranscriptEntries = [
      { id: '1', speaker: 'John', text: 'Hello everyone, welcome to today\'s meeting. Let\'s discuss our Q3 results.', timestamp: new Date() },
      { id: '2', speaker: 'Sarah', text: 'Thanks for having us, John.', timestamp: new Date() },
      { id: '3', speaker: 'John', text: 'Let\'s start with the sales figures. Sarah, can you share your insights?', timestamp: new Date() },
      { id: '4', speaker: 'Sarah', text: 'I think we performed well overall. Revenue is up 15%.', timestamp: new Date() },
      { id: '5', speaker: 'Mike', text: 'I agree with Sarah. The new product line really helped.', timestamp: new Date() },
      { id: '6', speaker: 'John', text: 'Excellent points. What about challenges?', timestamp: new Date() },
      { id: '7', speaker: 'Mike', text: 'Supply chain issues were our biggest hurdle.', timestamp: new Date() },
      { id: '8', speaker: 'John', text: 'Good to note. Let\'s create an action plan to address that.', timestamp: new Date() }
    ];

    setSessionContext((prev: any) => ({
      ...prev,
      liveTranscript: [...(prev.liveTranscript || []), ...sampleTranscriptEntries]
    }));
    
    console.log('✅ Sample transcript added:', sampleTranscriptEntries.length, 'entries');
  };

  // Force set facilitator role for testing
  const forceSetFacilitator = () => {
    setSessionContext((prev: any) => ({
      ...prev,
      facilitator: 'John',
      currentUser: {
        id: 'user-1',
        name: 'John',
        role: 'facilitator',
        isFacilitator: true
      }
    }));
    console.log('✅ Forced facilitator role set to John');
  };

  // Log current context state
  const logFullContext = () => {
    console.log('📊 Full Session Context:', {
      liveTranscriptCount: sessionContext?.liveTranscript?.length || 0,
      aiInsightsCount: sessionContext?.aiInsights?.length || 0,
      facilitator: sessionContext?.facilitator,
      topic: sessionContext?.topic,
      currentQuestionIndex: sessionContext?.currentQuestionIndex,
      state: sessionContext?.state,
      startTime: sessionContext?.startTime
    });
    console.log('📊 Raw Context Object:', sessionContext);
  };

  return (
    <div className="fixed bottom-4 left-4 bg-gray-900 text-white p-3 rounded-lg space-y-2 text-xs z-50 max-w-xs">
      <h3 className="font-bold text-yellow-400">🔧 Debug Tools</h3>
      
      <button
        onClick={mockAIGeneration}
        className="block w-full bg-blue-500 px-3 py-1 rounded hover:bg-blue-600 text-left"
      >
        1. Add Mock Insight
      </button>
      
      <button
        onClick={addSampleTranscript}
        className="block w-full bg-green-500 px-3 py-1 rounded hover:bg-green-600 text-left"
      >
        2. Add Sample Transcript
      </button>
      
      <button
        onClick={debugAIRequest}
        className="block w-full bg-yellow-500 px-3 py-1 rounded hover:bg-yellow-600 text-left"
      >
        3. Test AI Request
      </button>
      
      <button
        onClick={forceSetFacilitator}
        className="block w-full bg-purple-500 px-3 py-1 rounded hover:bg-purple-600 text-left"
      >
        4. Force Facilitator Role
      </button>
      
      <button
        onClick={logFullContext}
        className="block w-full bg-red-500 px-3 py-1 rounded hover:bg-red-600 text-left"
      >
        5. Log Full Context
      </button>
    </div>
  );
};
