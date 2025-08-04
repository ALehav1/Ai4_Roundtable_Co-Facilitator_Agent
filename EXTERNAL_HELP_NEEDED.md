# AI INSIGHTS FORMATTING BUG - HELP NEEDED

## THE PROBLEM
AI Insights and Follow-up Questions are displaying raw CSS class names instead of clean formatted text.

### What we see (broken output):
```
"mb-4">
"font-semibold text-gray-900 mb-2 flex items-center">"w-6 h-6 bg-purple-600 text-white rounded-full">1Key theme
"text-gray-700 ml-8 leading-relaxed"> The focus is on establishing AI capabilities...
```

### What we should see:
```
1. Key theme: The focus is on establishing AI capabilities...
2. Pattern observed: Emphasis on both short-term benefits...
3. Important quote: "setting up your organization for AI capabilities"
4. Recommended next step: Conduct an assessment of current AI capabilities...
```

## ROOT CAUSE
The AI model is somehow outputting the CSS class names from our frontend formatting function instead of returning clean text. This should be impossible.

## FAILED ATTEMPTS
1. Modified backend prompts - FAILED
2. Removed negative instructions - PARTIAL (fixed follow-up, insights still broken)  
3. Simplified prompts completely - FAILED
4. Updated frontend formatting function - MADE IT WORSE
5. Fixed duplicate entries - PARTIAL (duplicates fixed, formatting still broken)

## CURRENT CODE

### Backend Prompt (src/app/api/analyze-live/route.ts):
```typescript
case 'insights':
  return `Analyze this transcript and provide strategic insights using simple numbered format.

TRANSCRIPT:
${transcript}

OUTPUT FORMAT:
1. Key theme: [Your analysis]
2. Pattern observed: [Your observation]
3. Important quote: "[Exact quote]"  
4. Recommended next step: [Your recommendation]

Use simple numbered format only.`;
```

### Frontend Formatting (src/components/RoundtableCanvasV2.tsx):
```typescript
const formatAIInsights = useCallback((insights: string) => {
  if (!insights) return '';
  
  return insights
    .replace(/^(\d+)\. (.+?):/gm, '<div class="mb-4"><h5 class="font-semibold text-gray-900 mb-2 flex items-center"><span class="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm mr-2">$1</span>$2</h5>')
    .replace(/(<h5.*?<\/h5>)([\s\S]*?)(?=<div|$)/g, '$1<p class="text-gray-700 ml-8 leading-relaxed">$2</p></div>')
    .replace(/"([^"]+)"/g, '<span class="bg-blue-50 px-2 py-1 rounded text-blue-800 font-medium italic">"$1"</span>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, ' ');
}, []);
```

## THE MYSTERY
How is the AI accessing these exact CSS class names from the frontend when it should only see the backend prompt?

## WHAT WE NEED
1. Stop the AI from outputting CSS class names
2. Get clean numbered format from the backend  
3. Format it properly on the frontend
4. Make it work for both insights and follow-up questions

## TECHNICAL DETAILS
- Next.js 15 with TypeScript
- OpenAI GPT-4o API
- Deployed on Vercel
- Production URL: https://co-facilitatoragent-okqk9iwic-alehav1s-projects.vercel.app

## THE ASK
Please help us understand why the AI is outputting frontend CSS classes and provide a working solution that prevents this contamination and properly formats the content.
