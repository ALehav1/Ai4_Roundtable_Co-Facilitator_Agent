# COMPREHENSIVE CHATGPT PROMPT - AI ROUNDTABLE FACILITATOR AGENT

## PROJECT OVERVIEW

I'm working on an **Enterprise AI Roundtable Co-Facilitator Agent** - a sophisticated Next.js application that serves as an intelligent co-facilitator for strategic leadership discussions and AI transformation planning. The app is designed for single facilitators leading senior executive teams through structured strategic conversations with real-time AI insights, speech-to-text transcription, and comprehensive narrative summaries.

**GitHub Repository**: https://github.com/ALehav1/Ai4_Roundtable_Co-Facilitator_Agent
**Production Deployment**: Vercel (currently working with known issues)
**Last Updated**: August 2025 (v2.0.0)

---

## CURRENT TECHNICAL STACK & ARCHITECTURE

### **Core Technologies**
- **Frontend**: Next.js 15 with React 18, TypeScript 5, Tailwind CSS 3
- **AI Integration**: OpenAI GPT-4o for strategic reasoning and narrative generation
- **Speech Processing**: Browser-native Web Speech API (HTTPS required, Chrome/Edge optimal)
- **State Management**: React hooks with persistent session memory
- **Testing**: Jest with centralized mocks and Node environment
- **Deployment**: Vercel with serverless functions and environment variables
- **Styling**: Professional Tailwind theme with responsive design

### **Project Structure (Verified 2025-08-03)**
```
ai-roundtable/
├── src/
│   ├── __tests__/                    # Testing infrastructure
│   │   ├── api/analyze.test.ts       # API route tests (rate limiting, etc.)
│   │   ├── components/SearchDebug.test.tsx # Component tests
│   │   └── test-utils/mocks/         # Centralized test mocks
│   ├── app/
│   │   ├── api/
│   │   │   ├── analyze/route.ts      # AI co-facilitation API endpoint
│   │   │   └── generate-summary/route.ts # Summary generation API endpoint
│   │   ├── globals.css               # Global styles and animations
│   │   ├── layout.tsx                # Root layout with metadata
│   │   └── page.tsx                  # Main page component
│   ├── components/
│   │   ├── RoundtableCanvas.tsx      # Main interactive component with speech-to-text
│   │   └── SessionSummary.tsx        # Summary display and export component
│   ├── config/
│   │   └── roundtable-config.ts      # ⭐ MAIN CONFIGURATION FILE
│   └── utils/
│       └── logger.ts                 # Enhanced logging system
├── .env.local                        # Environment variables (OPENAI_API_KEY)
├── package.json                      # Dependencies and scripts
└── README.md                         # Comprehensive documentation (recently updated)
```

---

## CURRENT WORKING FEATURES ✅

### **Core Functionality (Confirmed Working)**
1. **GPT-4o AI Co-Facilitation**: Real-time strategic insights, synthesis, follow-up questions, cross-question linking
2. **Speech-to-Text Integration**: Web Speech API with real-time transcription (HTTPS production only)
3. **Session Memory**: Persistent context across questions for sophisticated AI analysis
4. **Configuration System**: Easy editing via `src/config/roundtable-config.ts`
5. **Rate Limiting**: Enterprise-grade protection (100 calls/hour configurable)
6. **Test Mode**: Complete mock workflow for rehearsal (honors `enableTestMode` flag)
7. **Enhanced Logging**: Structured error tracking with session correlation
8. **Professional UI/UX**: Executive-grade interface optimized for facilitators
9. **Vercel Deployment**: Working production deployment with environment variables

### **Advanced Features (Confirmed Working)**
1. **Comprehensive Summary Generation**: Narrative summaries for each section + executive summary
2. **Professional Export**: PDF (browser print dialog) and CSV download
3. **Cross-Question Context**: AI maintains strategic context across all questions
4. **Multiple Analysis Types**: Insights, synthesis, follow-ups, cross-references
5. **Participant Tracking**: Session manages participant names and responses
6. **Error Handling**: Graceful fallbacks with detailed logging

---

## CRITICAL BUGS & ISSUES REQUIRING FIXES 🚨

### **1. DATA FLOW/CONTEXT PROPAGATION BUG (HIGHEST PRIORITY)**
- **Issue**: AI summaries and insights do not reflect actual participant dialogue
- **Symptoms**: AI fabricates participants (e.g., "Michael", "Sarah", "Jamal") and generates verbose, generic content even when given minimal or specific input
- **Impact**: Core functionality broken - AI not using real session transcript data
- **Evidence**: Despite prompt fixes to prevent hallucination, production testing shows AI still not grounded in actual responses
- **Location**: Likely in data flow between frontend (`RoundtableCanvas.tsx`) and backend API routes
- **Debug Status**: Server-side debug logging deployed to `/api/analyze` but needs analysis

### **2. COLLAPSIBLE INSTRUCTIONS BUG**
- **Issue**: Both facilitator instructions and notes accordions in RoundtableCanvas.tsx
- **Symptoms**: Both accordions scroll/unscroll but only one populates content correctly
- **Requirement**: Either open/close independently OR jointly, but both must populate content
- **Location**: `src/components/RoundtableCanvas.tsx` accordion UI components

### **3. PDF EXPORT LIMITATION**
- **Current**: HTML blob download using browser print dialog
- **Required**: Real, shareable PDF generation using library like jsPDF
- **Attempts**: Previous implementation attempts caused JSX syntax errors and deployment failures
- **Approach**: Must implement incrementally and test thoroughly to avoid breaking builds

### **4. CONVERSATION CAPTURE WORKFLOW**
- **Current**: Manual name/comment capture for each participant response
- **Required**: Automatic transcript capture reflecting natural roundtable flow
- **Vision**: Live discussion transcript input with quick add comment section and speech-to-text integration
- **Dependencies**: Must chain section summaries and insights to feed context into subsequent sections

### **5. SPEED OPTIMIZATION**
- **Issue**: Summary generation and insights are slow for longer transcripts
- **Impact**: Poor user experience during facilitation
- **Requirement**: Optimize for speed and efficiency, potentially with incremental processing

---

## USER REQUIREMENTS & OBJECTIVES

### **Strategic Vision**
- **Primary Goal**: Comprehensive overhaul focusing on fixing broken functionality and improving workflow
- **Timeline**: One week for high-impact, feasible enhancements
- **Approach**: Careful, incremental changes to avoid breaking working patterns

### **Specific Requirements**

#### **Session Flow Redesign**
1. **Intro Phase**: Session should start with introduction/objectives and participant introductions, not Q1
2. **Section Chaining**: Each section should conclude with summary and insights that feed into next section
3. **Context Building**: Next section should reflect on previous learnings and set up topic with that context

#### **Time Management**
1. **Session Duration**: Input for total session length
2. **Section Allocation**: Time allocation per section for facilitator management
3. **Progress Tracking**: Visual indicators of time elapsed and remaining

#### **Configurability**
1. **Section Setup**: Titles and objectives should be configurable via setup mechanism
2. **Future Programs**: Current hardcoded sections can become grayed examples
3. **Easy Editing**: Questions and prompts must be easily reviewable and editable

#### **Technical Requirements**
1. **Prompt Refactoring**: AI prompts should not be buried in code, easily accessible
2. **Repository Accuracy**: README and GitHub must reflect current working version
3. **Deployment Documentation**: Detailed Vercel deployment instructions with troubleshooting
4. **Stable Development**: Avoid breaking existing working patterns

---

## AI PROMPT LOCATIONS (CRITICAL FOR EDITING)

### **Easy to Edit (Configuration File)**
**File**: `src/config/roundtable-config.ts`
- **Main AI Config**: Lines 44-54 (`aiConfig` object)
- **Questions & Context**: Lines 78-158 (`roundtableQuestions` array)  
- **System Behavior**: Lines 160-194 (`uiText` and session settings)

### **Requires Code Changes (API Routes)**
**File**: `src/app/api/analyze/route.ts`
- **Insights Prompt**: Lines 130-200 (`buildInsightsPrompt` function)
- **Synthesis Prompt**: Lines 220-270 (`buildSynthesisPrompt` function)
- **Follow-up Prompt**: Lines 290-340 (`buildFollowupPrompt` function)
- **Cross-reference Prompt**: Lines 360-400 (`buildCrossReferencePrompt` function)

**File**: `src/app/api/generate-summary/route.ts`
- **Question Summary**: Lines 140-200 (`generateQuestionSummary` function)
- **Executive Summary**: Lines 260-320 (`generateExecutiveSummary` function)
- **Overall Conclusion**: Lines 355-380 (`generateOverallConclusion` function)

---

## WORKING PATTERNS & WHAT TO PRESERVE

### **Successful Patterns (DO NOT BREAK)**
1. **Configuration System**: Easy editing via `roundtable-config.ts` works well
2. **Test Mode**: Seamless switching between mock and real AI responses
3. **Rate Limiting**: Enterprise-grade protection with proper validation
4. **Environment Variables**: Secure API key handling via Vercel
5. **Enhanced Logging**: Structured logging with session correlation
6. **Speech Recognition**: Works perfectly in production (HTTPS), fails locally (expected)
7. **Deployment Process**: Vercel deployment with `unstable_noStore()` for runtime env vars

### **Code Patterns That Work**
1. **OpenAI Client Initialization**: Runtime initialization to avoid build-time env var issues
2. **Error Handling**: Graceful fallbacks with detailed logging
3. **TypeScript Interfaces**: Well-defined types for session data and AI responses
4. **React Hooks**: Proper state management with useCallback and useEffect
5. **Next.js API Routes**: Serverless functions with proper validation

---

## DEPLOYMENT & ENVIRONMENT DETAILS

### **Current Vercel Deployment**
- **Status**: Working with known issues
- **Environment Variables**: `OPENAI_API_KEY` properly configured
- **Build Process**: Uses `npm run build` with TypeScript compilation
- **Speech Recognition**: Works perfectly (HTTPS), fails on localhost (expected browser security)
- **API Routes**: Serverless functions with rate limiting and error handling

### **Known Deployment Issues & Solutions**
1. **JSX Syntax Errors**: Previous attempts at workflow changes caused build failures
2. **Environment Variables**: Must be set in Vercel dashboard for production
3. **Speech Recognition**: Requires HTTPS, shows "network errors" on local development
4. **API Key Validation**: Explicit checks prevent runtime failures

---

## USER PREFERENCES & DEVELOPMENT STYLE

### **Communication & Documentation**
- **Explanation Required**: Always explain what you're doing and why for learning
- **Detailed README**: Keep comprehensive documentation updated after every major change
- **Annotated Code**: Heavy annotation for ease of audit, especially dependencies
- **File Tracking**: README should include all files and their purposes
- **Logic Flow Diagrams**: Keep UX and functionality diagrams updated

### **Development Approach**
- **Error Logging**: Lots of error logs to track issues directly to cause
- **Plan Before Execute**: List plan and check implications/dependencies before changes
- **Incremental Changes**: Avoid large sweeping changes that break builds
- **Ask for Confirmation**: Always ask if user wants to accept all changes until task complete
- **Progress Updates**: Regular updates on progress against objectives with detailed explanations
- **Recommendations**: When asking for decisions, always recommend next steps

### **Quality Standards**
- **No Duplicate Files**: Avoid creating new files with different names for same purpose
- **Dependency Check**: Always check codebase for existing functionality before creating new
- **Working Patterns**: Study codebase for patterns, bugs, UX issues before making changes
- **Test Thoroughly**: Each change must be tested step-by-step before proceeding

---

## SPECIFIC TECHNICAL CONTEXTS

### **Memory Context (Critical for Understanding)**
1. **Speech Recognition**: NOT a code bug - Web Speech API requires HTTPS and has browser limitations
2. **Git Deployment Issues**: Multiple commits with fixes not reaching Vercel production
3. **Build Failures**: JSX syntax errors in RoundtableCanvas.tsx prevented previous deployment attempts
4. **AI Hallucination**: Despite prompt fixes, AI still fabricates participants and content

### **Code Interaction History**
**RoundtableCanvas.tsx**:
- Lines 500-550, 511-545, 1040-1090: PDF export implementation attempts
- Lines 245-250, 295-320, 390-420: Speech recognition state and functions
- Lines 330-370, 346-357: Collapsible accordion structure and behavior
- Multiple JSX syntax errors fixed in previous sessions

**API Routes**:
- `/api/analyze/route.ts`: Debug logging added, hallucination prompts fixed
- `/api/generate-summary/route.ts`: JSON parsing errors fixed, runtime OpenAI client

---

## IMMEDIATE NEXT STEPS (PRIORITY ORDER)

### **1. DEBUG DATA FLOW BUG (CRITICAL)**
- Analyze server-side debug logs in `/api/analyze` to trace AI input data
- Verify frontend is sending correct session transcript to backend
- Ensure AI prompts are receiving and using real participant responses
- Test with minimal input to confirm AI grounds responses in actual data

### **2. FIX COLLAPSIBLE INSTRUCTIONS**
- Investigate accordion components in RoundtableCanvas.tsx
- Ensure both facilitator instructions and notes populate content correctly
- Implement independent or joint open/close behavior

### **3. IMPLEMENT REAL PDF EXPORT**
- Use jsPDF library for actual PDF generation (not HTML print)
- Include session overview, participant responses, AI insights, executive summary
- Implement incrementally to avoid breaking builds
- Test thoroughly before deployment

### **4. REDESIGN CONVERSATION WORKFLOW**
- Move from manual capture to automatic transcript flow
- Implement section summary chaining for contextual facilitation
- Add session introduction and participant intro phases before Q1

### **5. OPTIMIZE PERFORMANCE**
- Speed up summary generation for longer transcripts
- Implement time management features for facilitators
- Add configurability for section titles and objectives

---

## SUCCESS CRITERIA

### **Core Functionality Fixed**
- [ ] AI summaries accurately reflect actual participant dialogue (no fabrication)
- [ ] Both instruction accordions work correctly and independently
- [ ] Real PDF export generates shareable documents
- [ ] Conversation workflow captures full transcript automatically

### **Enhanced User Experience**
- [ ] Session starts with introductions before Q1
- [ ] Time management input for session/section duration
- [ ] Section summaries chain to provide context for next sections
- [ ] Summary generation is fast and efficient

### **Development Quality**
- [ ] README accurately reflects all current functionality and deployment
- [ ] AI prompts easily accessible for editing and review
- [ ] All changes tested incrementally without breaking working features
- [ ] Comprehensive documentation for future development

---

## CRITICAL WARNINGS & WATCHOUTS

### **DO NOT BREAK**
1. **Working Speech Recognition**: Currently works perfectly in production
2. **Configuration System**: Easy editing via roundtable-config.ts
3. **Vercel Deployment**: Current deployment process with environment variables
4. **Test Mode**: Seamless switching between mock and real responses
5. **Rate Limiting**: Enterprise protection that prevents cost overruns

### **AVOID THESE PATTERNS**
1. **Large Multi-File Changes**: Previous attempts caused build failures
2. **JSX Syntax Errors**: Multiple syntax errors broke deployment in past
3. **Client-Side API Keys**: Never expose OpenAI keys in frontend code
4. **Build-Time Environment Variables**: Use runtime initialization with unstable_noStore()
5. **Duplicate File Creation**: Don't create new files when existing ones serve same purpose

### **TESTING REQUIREMENTS**
1. **Incremental Testing**: Test each change before proceeding to next
2. **Build Verification**: Always run `npm run build` before deployment
3. **Production Testing**: Verify features work in HTTPS production environment
4. **Speech Recognition**: Test in production only (fails locally due to browser security)

---

## CURRENT DEPLOYMENT STATUS
- **Repository**: Up-to-date with comprehensive README (commit a18ae82)
- **Vercel**: Working deployment with known issues documented
- **Environment**: OPENAI_API_KEY configured and working
- **Features**: Core functionality working, critical bugs identified and ready for fixes

---

## REQUEST FOR ASSISTANCE

Please help me systematically address these issues with careful, incremental development that:

1. **Preserves all working functionality** while fixing critical bugs
2. **Implements user requirements** for improved workflow and UX  
3. **Maintains deployment stability** and avoids breaking builds
4. **Provides clear explanations** for learning and documentation
5. **Tests thoroughly** at each step before proceeding

Focus on the **data flow/context propagation bug first** as it's blocking the core AI functionality, then proceed through the other priorities based on impact and feasibility.

Thank you for your detailed guidance on improving this enterprise-grade AI facilitation platform!
