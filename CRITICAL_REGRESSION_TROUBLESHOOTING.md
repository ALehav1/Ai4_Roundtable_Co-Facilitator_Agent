# CRITICAL REGRESSION: AI Insights & Follow-up Questions Broken

## PROBLEM DESCRIPTION
Both AI Insights and Follow-up Questions are displaying raw CSS class names instead of properly formatted content after a backend prompt modification. Screenshots show content like:

```
"font-semibold text-gray-900 mt-6 mb-3 pb-2 border-b border-gray-200 flex items-center">"w-1 h-4 bg-purple-500 rounded-full mr-3">Key themes from actual discussion
```

## EXACT CHANGES MADE (COMMIT: bfec733)
In `/src/app/api/analyze-live/route.ts`, I modified the `insights` case in `buildLiveAnalysisPrompt` function:

### BEFORE (WORKING):
```typescript
case 'insights':
  return `${baseRules}

${topicContext}

Analyze the actual discussion content below and provide specific insights based on what participants actually said. If the transcript is brief or empty, acknowledge this and suggest next steps.

TRANSCRIPT:
"${transcript}"

Provide insights in this format:
- Key themes from actual discussion
- Patterns in participant responses (if any)
- Specific quotes or points raised (exact text only)
- Next steps based on actual conversation gaps

Be direct and factual. No speculation beyond what's actually discussed.`;
```

### AFTER (BROKEN):
```typescript
case 'insights':
  return `${baseRules}

${topicContext}

Analyze the actual discussion content below and provide specific insights based on what participants actually said. If the transcript is brief or empty, acknowledge this and suggest next steps.

TRANSCRIPT:
"${transcript}"

Provide insights in clean markdown format using this structure:
**Key themes from actual discussion**
- Your analysis here

**Patterns in participant responses**
- Your analysis here

**Specific quotes or points raised**
- Exact quotes only

**Next steps based on actual conversation gaps**
- Your recommendations here

Use ONLY markdown formatting (**, -, etc.). Do NOT include HTML, CSS class names, or any other formatting. Be direct and factual. No speculation beyond what's actually discussed.`;
```

## ROOT CAUSE ANALYSIS
The frontend uses `formatAIInsights()` function which converts markdown to HTML:
```typescript
const formatAIInsights = useCallback((insights: string) => {
  return insights
    .replace(/\*\*(.*?)\*\*/g, '<h4 class="font-semibold text-gray-900 mt-6 mb-3 pb-2 border-b border-gray-200 flex items-center"><span class="w-1 h-4 bg-purple-500 rounded-full mr-3"></span>$1</h4>')
    // ... more replacements
}, []);
```

## CRITICAL ISSUE
The AI is somehow outputting the actual CSS class names from the `formatAIInsights` function instead of markdown, suggesting:
1. The AI model is seeing/referencing the frontend formatting code
2. The prompt change caused the AI to output HTML/CSS instead of markdown
3. There's a feedback loop or prompt contamination issue

## CURRENT STATUS
- Both insights and follow-up questions are broken (follow-up questions use the same formatAIInsights function)
- The logs show successful API calls: `✅ Live AI Analysis (new endpoint): Object`
- No frontend JavaScript errors in console
- The rendering pipeline is intact, but the content is malformed

## IMMEDIATE FIXES NEEDED
1. **REVERT COMMIT**: Git revert bfec733 to restore working state
2. **ROOT CAUSE**: Investigate how AI model is accessing/referencing frontend CSS classes
3. **PROMPT ISOLATION**: Ensure AI prompts don't have access to frontend formatting logic
4. **TEST ISOLATION**: Test insights vs follow-up separately to identify contamination source

## DEPLOYMENT DETAILS
- Commit: bfec733
- Deployed: 2 minutes ago (10:37 AM)
- Production URL: https://co-facilitatoragent-n1rttri5p-alehav1s-projects.vercel.app
- Previous working deployment: https://co-facilitatoragent-r6smhnjht-alehav1s-projects.vercel.app

## REQUEST FOR EXTERNAL TROUBLESHOOTING
Please analyze why modifying the backend prompt structure caused the AI to output frontend CSS class names instead of markdown. The AI appears to have somehow gained access to or is referencing the `formatAIInsights` function's CSS classes, which should be impossible in a proper backend/frontend separation.

The key mystery: How did changing a backend prompt cause the AI to output frontend formatting code?
