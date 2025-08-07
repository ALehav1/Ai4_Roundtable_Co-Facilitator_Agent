# AI Roundtable Co-Facilitator Agent

**🎯 Enterprise-Ready AI Co-Facilitation Platform for Strategic Leadership Discussions**

A sophisticated AI-powered co-facilitation system designed for strategic roundtable discussions and AI transformation planning. Features advanced multi-layer speech recognition, real-time AI analysis, session persistence, and professional export capabilities.

## 🌟 **What This Platform Does**

### Latest Updates (January 2025)
- 🎨 **Complete UI/UX Design System**: Professional visual transformation with timeline UI, speaker differentiation, and enhanced accessibility
- 🎙️ **Smart Detection Interface**: Real-time speaker detection with professional status bar and visual indicators
- 📝 **Timeline Transcript Display**: Visual timeline with speaker icons, color-coded badges, and connecting lines
- 🤖 **Enhanced AI Co-Facilitator Panel**: Color-coded insight cards, professional controls, and improved empty states
- ✅ **Unified Template Management**: Consolidated template/config systems into single, clear UX
- ✅ **Template Creation Mode**: New ability to create templates from scratch
- ✅ **Improved AI Panel**: Tabbed interface for insights, questions, and synthesis
- ✅ **Enhanced Error Handling**: Better user guidance when waiting for AI responses

Transform your strategic facilitation with AI-powered insights:

- **🎤 Intelligent Speech Capture**: Multi-layer speech recognition with automatic fallback (Web Speech API → Whisper → Deepgram)
- **🧠 Real-Time AI Co-Facilitation**: GPT-4o provides live insights, synthesis, and follow-up questions during discussions
- **📋 Structured Session Management**: Guided agenda workflow with progress tracking and session memory
- **💾 Auto-Save & Recovery**: Seamless session persistence with localStorage backup
- **📄 Professional Export**: Executive-ready PDF summaries and CSV data export
- **🔒 Enterprise Security**: Rate limiting, secure API key management, and comprehensive error handling
- **📋 Unified Template System**: Create, save, load, and manage session templates for recurring meetings (feature-flagged)

---

## 🚀 **Quick Start**

### Prerequisites
- **Node.js 18+** and npm
- **OpenAI API key** ([Get yours here](https://platform.openai.com/api-keys))
- **Modern web browser** (Chrome/Edge recommended for speech recognition)

### Installation

```bash
# Clone the repository
git clone https://github.com/ALehav1/Ai4_Roundtable_Co-Facilitator_Agent.git
cd ai-roundtable

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
# Edit .env.local and add your OpenAI API key:
echo "OPENAI_API_KEY=sk-your-actual-key-here" >> .env.local

# Start development server
npm run dev

# Open http://localhost:3000
```

### **First Session Test**

1. **🧪 Enable Test Mode**: Verify `enableTestMode: true` in `src/config/roundtable-config.ts`
2. **🎯 Select a Preset or Enter Details**: 
   - Choose from pre-configured session templates (Strategic Planning, Team Retrospective, etc.)
   - Or manually enter topic, facilitator name, and participants
3. **🎤 Start Recording**: Click "Start Recording" (or use Manual Entry)
4. **💬 Speak or Type**: Add discussion points
5. **🧠 Get AI Insights**: Click analysis buttons for real-time facilitation
6. **📄 Export Results**: Generate PDF summary when complete

### **📋 Session Presets**

Pre-configured session templates for quick setup:

**Available Presets:**
- **🎯 Strategic Planning**: AI transformation discussion framework
- **🔄 Team Retrospective**: Quarterly review template
- **💡 Blank Session**: Start from scratch

**Using Presets:**
1. Select a preset from the dropdown in Session Configuration
2. Click "Load" to populate session details
3. Preset includes topic, facilitator, and initial discussion prompts
4. Modify loaded content as needed before starting

**Custom Presets:**
Edit `src/config/session-presets.ts` to add your own templates:
```typescript
{
  id: 'custom_template',
  name: 'Your Template Name',
  category: 'template',
  sessionTopic: 'Your Topic',
  facilitatorName: 'Facilitator',
  initialTranscript: [
    { speaker: 'Facilitator', text: 'Opening prompt...', isAutoDetected: false }
  ]
}

---

## 🎨 **Design System Architecture**

### **Professional UI/UX Implementation**

The AI Roundtable Co-Facilitator uses a comprehensive design system built on Tailwind CSS with custom design tokens, ensuring consistency, accessibility, and maintainability across all components.

#### **Design Tokens & Variables**

```css
/* Core Design Tokens */
:root {
  /* Spacing Scale */
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  
  /* Color System */
  --primary-50: #f0f9ff;
  --primary-500: #3b82f6;
  --primary-600: #2563eb;
  --success-500: #10b981;
  --warning-500: #f59e0b;
  --error-500: #ef4444;
  
  /* Component-Specific Colors */
  --insights-primary: #8b5cf6;    /* Purple for insights */
  --questions-primary: #3b82f6;   /* Blue for questions */
  --synthesis-primary: #10b981;   /* Green for synthesis */
  --facilitator-primary: #6366f1; /* Indigo for facilitator */
}
```

#### **Component Architecture**

**1. Layout Components**
```css
.app-container     /* Main application wrapper */
.header           /* Top navigation and status */
.main-content     /* Primary content area */
.sidebar          /* Collapsible facilitator panel */
```

**2. Transcript System**
```css
.transcript-container  /* Scrollable transcript area */
.transcript-entry     /* Individual transcript item */
.timeline            /* Visual timeline structure */
.timeline-dot        /* Speaker indicator dots */
.speaker-badge      /* Color-coded speaker labels */
```

**3. AI Panel Components**
```css
.ai-panel           /* Main AI assistant container */
.insight-card       /* Color-coded insight items */
.ai-button-group    /* Button collections */
.empty-state        /* Placeholder content */
```

#### **Speaker Differentiation System**

The design system includes automatic speaker differentiation with visual cues:

```tsx
// Facilitator Styling (Blue theme)
<div className="timeline-dot bg-blue-500">
  <span className="speaker-badge bg-blue-100 text-blue-800">F</span>
</div>

// Participant Styling (Green theme)  
<div className="timeline-dot bg-green-500">
  <span className="speaker-badge bg-green-100 text-green-800">P1</span>
</div>
```

#### **Accessibility Features**

- **High Contrast**: 4.5:1+ color contrast ratios
- **Focus Management**: Visible focus rings and keyboard navigation
- **ARIA Labels**: Comprehensive screen reader support
- **Semantic HTML**: Proper heading hierarchy and landmarks

```css
.focus-ring {
  @apply focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2;
}
```

#### **Responsive Design Breakpoints**

```css
/* Mobile First Approach */
@media (min-width: 640px)  { /* sm: Small tablets */ }
@media (min-width: 768px)  { /* md: Large tablets */ }
@media (min-width: 1024px) { /* lg: Small desktops */ }
@media (min-width: 1280px) { /* xl: Large desktops */ }
```

#### **Animation & Micro-interactions**

Smooth transitions enhance the user experience:

```css
.transcript-entry {
  animation: fadeIn 0.3s ease-out;
}

.insight-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.insight-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
```

#### **Usage Examples**

**Creating a New Component:**
```tsx
interface MyComponentProps {
  variant: 'primary' | 'secondary';
  children: React.ReactNode;
}

export function MyComponent({ variant, children }: MyComponentProps) {
  return (
    <div className={`
      rounded-lg p-4 transition-colors
      ${variant === 'primary' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}
      focus-ring
    `}>
      {children}
    </div>
  );
}
```

**Extending the Design System:**
```css
/* Add new component variants to globals.css */
@layer components {
  .my-new-component {
    @apply rounded-lg p-4 bg-white shadow-sm border;
    transition: all 0.2s ease;
  }
  
  .my-new-component:hover {
    @apply shadow-md transform -translate-y-0.5;
  }
}
```

---

## 🏗️ **Architecture Overview**

### **Tech Stack**
- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **AI**: OpenAI GPT-4o for strategic reasoning and co-facilitation
- **Speech**: Multi-layer system (Web Speech API + Whisper + Deepgram)
- **Storage**: localStorage for session persistence
- **Export**: jsPDF + html2canvas for professional documents
- **Deployment**: Vercel-optimized with edge functions

### **Project Structure**
```
src/
├── app/
│   ├── api/
│   │   ├── analyze/route.ts         # Legacy AI analysis endpoint
│   │   ├── analyze-live/route.ts    # Enhanced AI analysis with strict JSON
│   │   ├── generate-summary/route.ts # Comprehensive session summaries
│   │   └── transcribe/route.ts      # Whisper speech fallback
│   ├── globals.css                  # Professional styling and animations
│   ├── layout.tsx                   # Root layout with metadata
│   └── page.tsx                     # Main application entry point
├── components/
│   ├── RoundtableCanvasV2.tsx       # 🎯 Main facilitator interface
│   └── SessionSummary.tsx           # Summary display and export
├── config/
│   └── roundtable-config.ts         # ⭐ MAIN CONFIGURATION FILE
├── hooks/
│   └── useSpeechTranscription.ts    # Modular speech recognition system
├── utils/
│   ├── storage.ts                   # Session persistence and recovery
│   ├── pdfExport.ts                 # Professional PDF generation
│   └── logger.ts                    # Enhanced error tracking
└── __tests__/                       # Comprehensive testing infrastructure
```

---

## 🎤 **Advanced Speech Recognition System**

### **3-Layer Fallback Architecture**

```
Layer 1: Native Web Speech API (HTTPS Required)
   ↓ (automatic fallback on errors)
Layer 2: OpenAI Whisper Chunked (Always Available)
   ↓ (optional premium upgrade)
Layer 3: Deepgram Streaming (Enterprise Option)
```

### **Browser Compatibility**

| Browser | Native Speech | Whisper Fallback | Notes |
|---------|---------------|-------------------|-------|
| Chrome  | ✅ Full Support | ✅ | Best experience |
| Edge    | ✅ Full Support | ✅ | Full compatibility |
| Safari  | ⚠️ Limited | ✅ | Whisper recommended |
| Firefox | ❌ Not Supported | ✅ | Auto-fallback to Whisper |

### **HTTPS Requirements**

**⚠️ Important**: Native speech recognition requires HTTPS in production

- **Development**: `http://localhost:3000` - Speech disabled, manual entry available
- **Production**: HTTPS required - Full speech functionality enabled
- **Testing**: Use ngrok for HTTPS testing: `ngrok http 3000`

---

## 🤖 **AI Co-Facilitation Features**

### **Real-Time Analysis Types**

- **🧠 Insights**: Strategic patterns and themes from actual discussion
- **🔄 Synthesis**: Connect ideas across participants and questions
- **❓ Follow-ups**: Intelligent follow-up questions based on conversation gaps
- **🔗 Cross-Reference**: Link insights across different discussion topics
- **🎯 Facilitation**: Live guidance for facilitators based on session flow

### **Anti-Hallucination Measures**

- **Strict Prompting**: AI explicitly instructed to only reference actual content
- **JSON Response Format**: Structured responses prevent fabricated details
- **Content Validation**: Server-side validation of AI responses
- **Error Boundaries**: Graceful fallbacks when AI analysis fails

### **Session Memory**

- Cross-question context preservation
- Participant tracking across multiple responses
- Strategic theme development throughout session
- Cumulative insight building

---

## ⚙️ **Configuration**

### **Environment Variables**

```env
# Required
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional Speech Engine Selection
NEXT_PUBLIC_SPEECH_ENGINE=auto          # auto|webspeech|whisper|deepgram

# Optional Development
NEXT_PUBLIC_APP_ENV=development
```

### **Main Configuration File**

Edit `src/config/roundtable-config.ts` to customize:

```typescript
// Session Settings
export const sessionConfig = {
  title: 'Your Roundtable Title',
  maxParticipants: 20,
  enableTestMode: true,         // Set false for live sessions
  rateLimitPerHour: 100,        // API rate limiting
  autoExportResults: true
};

// Strategic Questions
export const roundtableQuestions = [
  {
    id: "question_1",
    title: "Your Strategic Question",
    description: "Detailed context for facilitators",
    aiPromptContext: "AI analysis guidance",
    followUpPrompts: ["Follow-up question 1?", "Follow-up question 2?"]
  }
  // Add more questions...
];

// AI Behavior
export const aiConfig = {
  systemPrompt: "Your AI facilitator personality...",
  temperature: 0.7,             // 0.0 = focused, 1.0 = creative
  maxTokens: 400               // Response length control
};
```

---

## 💰 **Cost Management**

### **Expected Costs (GPT-4o)**

- **Small Session** (5-8 participants, 4-5 questions): ~$8-15
- **Medium Session** (8-12 participants, 5-7 questions): ~$15-25  
- **Large Session** (12+ participants, 7+ questions): ~$25-40

### **Cost Controls**

- **🧪 Test Mode**: Complete workflow testing with zero API costs
- **⏱️ Rate Limiting**: Configurable API call limits (default: 100/hour)
- **📊 Usage Tracking**: Enhanced logging for cost monitoring
- **🚨 Error Prevention**: Smart retry logic prevents unnecessary API calls
- **🎤 Speech-to-Text**: Uses browser Web Speech API - **NO additional cost**

### **Monitoring**

1. **OpenAI Dashboard**: Monitor usage at [platform.openai.com/usage](https://platform.openai.com/usage)
2. **Application Logs**: Track API calls and token usage in browser console
3. **Cost Alerts**: Set up alerts in OpenAI dashboard

---

## 🔧 **Development & Testing**

### **Test Mode**

Enable `enableTestMode: true` in config for:
- Mock AI responses (no API costs)
- Rapid question flow testing
- UI/UX validation
- Export functionality testing

### **Local Development**

```bash
# Development server
npm run dev

# Production build test
npm run build && npm run start

# Run tests
npm test

# Linting
npm run lint
```

### **HTTPS Testing for Speech Recognition**

```bash
# Option 1: ngrok tunnel (recommended)
npm install -g ngrok
npm run dev
ngrok http 3000
# Use the https://xxx.ngrok.io URL

# Option 2: Vercel deployment
vercel deploy
# Test on live HTTPS URL
```

---

## 📱 **Session Workflow**

### **1. Session Setup (2 minutes)**
- Configure session topic and facilitator role
- Review strategic questions and AI guidance
- Test speech recognition (if using)
- Set participant expectations

### **2. Live Discussion (20-45 minutes)**
- **Real-time transcription** of participant responses
- **Live AI analysis** with insights, synthesis, and follow-ups
- **Session memory** maintains context across questions
- **Progress tracking** with agenda navigation

### **3. Session Conclusion (5 minutes)**
- **Generate comprehensive summary** with executive formatting
- **Review key findings** and strategic recommendations
- **Export results** as PDF (professional) or CSV (analysis)
- **Save session** for later reference

---

## 📋 **Template Creation System** (Feature-Flagged)

### **Overview**
The Template Creation System allows you to save and reuse session configurations for recurring meetings. This feature is currently behind a feature flag and can be enabled in `src/config/feature-flags.ts`.

### **Features**
- **Save Templates**: Capture current session configuration including topic, facilitator, and questions
- **Load Templates**: Quickly start new sessions with pre-configured settings
- **Manage Templates**: View, load, and delete saved templates through a modal interface
- **Persistent Storage**: Templates are saved in browser localStorage for easy access

### **How to Enable**
1. Open `src/config/feature-flags.ts`
2. Set `TEMPLATE_CREATION: true`
3. Restart the development server
4. Template buttons will appear in the session interface

### **Using Templates**

#### **Saving a Template**
1. Configure your session with desired settings
2. Click "Save as Template" button
3. Enter a descriptive template name
4. Template is saved to localStorage

#### **Loading a Template**
1. Click "Load Template" button
2. Select from available templates in the modal
3. Session configuration is automatically populated
4. Modify as needed before starting the session

#### **Managing Templates**
- View all saved templates in the Template Modal
- Delete unwanted templates with the delete button
- Templates persist across browser sessions

### **Template Structure**
Templates save the following information:
- Session topic and description
- Facilitator name and role
- Complete question set (if customized)
- Creation timestamp
- Template metadata

### **Technical Details**
- Templates stored in localStorage under `roundtable_templates` key
- Maximum 50 templates can be saved
- Each template includes version information for compatibility
- Feature flag ensures safe rollout without affecting existing functionality

---

## 🛡️ **Troubleshooting**

### **Speech Recognition Issues**

**Problem**: Microphone not working
**Solutions**:
1. Check browser permissions for microphone access
2. Ensure HTTPS connection (required for Web Speech API)
3. Try different browser (Chrome/Edge recommended)
4. Use Whisper fallback: Set `NEXT_PUBLIC_SPEECH_ENGINE=whisper`

### **AI Analysis Errors**

**Problem**: AI responses fail or seem fabricated
**Solutions**:
1. Verify OpenAI API key in `.env.local`
2. Check API usage limits at OpenAI dashboard
3. Enable test mode for debugging
4. Review browser console for detailed error messages

### **Session Recovery**

**Problem**: Lost session data
**Solutions**:
1. Refresh page - auto-recovery from localStorage
2. Check browser localStorage is enabled
3. Clear localStorage if corrupted: `localStorage.clear()`

### **PDF Export Issues**

**Problem**: PDF export fails
**Solutions**:
1. Ensure session has content before exporting
2. Try exporting smaller sessions first
3. Check browser supports PDF generation
4. Refresh page and retry

---

## 🚀 **Deployment to Vercel**

### **1. Prepare for Deployment**

```bash
# Test production build locally
npm run build

# Verify no TypeScript errors
npm run lint
```

### **2. Deploy to Vercel**

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from project root
vercel

# Configure environment variables in Vercel dashboard:
# OPENAI_API_KEY=your-key-here
```

### **3. Production Verification**

- Test speech recognition on HTTPS
- Verify AI analysis works correctly
- Test session persistence and recovery
- Validate PDF/CSV export functionality

---

## 🤝 **Contributing**

### **Development Guidelines**

1. **Configuration First**: Make changes in `roundtable-config.ts` when possible
2. **Test Mode**: Always test new features in test mode first
3. **TypeScript**: Maintain strict type safety
4. **Error Handling**: Add comprehensive error boundaries
5. **Logging**: Include structured logging for debugging

### **Key Files for Customization**

| File | Purpose | Edit Difficulty |
|------|---------|----------------|
| `src/config/roundtable-config.ts` | ⭐ Main configuration | Easy |
| `src/components/RoundtableCanvasV2.tsx` | Main interface | Advanced |
| `src/app/api/analyze-live/route.ts` | AI analysis logic | Advanced |
| `src/app/api/generate-summary/route.ts` | Summary generation | Advanced |

---

## 📚 **Additional Resources**

- **OpenAI API Documentation**: [platform.openai.com/docs](https://platform.openai.com/docs)
- **Next.js Documentation**: [nextjs.org/docs](https://nextjs.org/docs)
- **Vercel Deployment**: [vercel.com/docs](https://vercel.com/docs)
- **Web Speech API**: [developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🎯 **Support**

For questions, issues, or feature requests:

1. **Configuration Issues**: Check `src/config/roundtable-config.ts`
2. **Technical Issues**: Review browser console logs
3. **API Issues**: Verify OpenAI API key and usage limits
4. **Speech Issues**: Test with different browsers or use Whisper fallback

**Built for Strategic Facilitators by Strategic Facilitators** 🚀  
- ✅ **Production-optimized** for HTTPS environments
- ✅ **Smart fallbacks** when speech recognition unavailable
- ✅ **Manual entry modes** including bulk paste and file upload
- ✅ **Enhanced error handling** with graceful degradation

### **🤖 AI Co-Facilitation Engine (GPT-4o Powered)**

- ✅ **Executive-ready insights** focused on AI transformation patterns
- ✅ **Strategic follow-up questions** that deepen discussion
- ✅ **Session memory** that builds context across conversation phases
- ✅ **Professional formatting** with confidence levels and timestamps
- ✅ **Dual analysis interface** with insights and questions side-by-side
- ✅ **Six analysis types**: insights, synthesis, followup, cross_reference, facilitation, transition
- ✅ **Dual API architecture**: Primary (/api/analyze-live) + Legacy fallback (/api/analyze)
- ✅ **Infinite loop prevention**: Loading states prevent simultaneous calls
- ✅ **Robust error handling**: Graceful degradation with user-friendly error messages
- ✅ **Real-time state management**: Optimized React state updates with proper dependencies

### **👔 Executive-Grade Interface**

- ✅ **Professional design system** with sophisticated styling
- ✅ **Strategic progress tracking** with visual phase indicators
- ✅ **Business-focused language** throughout
- ✅ **Enhanced loading states** with contextual messaging
- ✅ **Fully responsive** for various devices and screen sizes

### **📊 Complete Session Management**

- ✅ **Auto-save functionality** with seamless session recovery
- ✅ **Professional PDF export** for stakeholder distribution
- ✅ **Executive summary generation** with strategic recommendations
- ✅ **Cost management** with transparent usage tracking
- ✅ **Session analytics** with participation and insight metrics

---

## 🔧 **Recent Critical Fixes & Improvements (January 2025)**

### **🚨 API Error Resolution**

- **✅ Fixed 400 Bad Request errors**: Resolved schema mismatches between frontend and backend API requests
- **✅ Added missing `participantCount` field**: Critical payload field that was causing `/api/analyze-live` failures
- **✅ Schema validation alignment**: Frontend and backend request schemas now perfectly match
- **✅ Comprehensive error logging**: Enhanced debugging with detailed API request/response logging

### **🔄 Infinite Loop Prevention**

- **✅ Loading state management**: Added `isLoading` flags to prevent multiple simultaneous AI analysis calls
- **✅ React state optimization**: Fixed `useCallback` dependencies to prevent unnecessary re-renders
- **✅ Request deduplication**: Smart logic prevents duplicate API calls during active analysis
- **✅ Memory leak prevention**: Proper cleanup of loading states and cancelled requests

### **🎯 New 'Transition' Analysis Type**

- **✅ Backend enum support**: Added `'transition'` to both `/api/analyze-live` and `/api/analyze` endpoints
- **✅ Specialized prompts**: Custom AI prompts for phase transition analysis and readiness assessment
- **✅ Frontend integration**: Complete TypeScript interface updates and UI support
- **✅ Legacy compatibility**: Automatic mapping to compatible types for older API endpoints

### **🛡️ Robust Error Handling**

- **✅ Graceful degradation**: All AI analysis failures now display user-friendly error messages
- **✅ No unhandled promises**: Complete error catching prevents console warnings and crashes
- **✅ Dual API fallback**: Primary endpoint failure automatically falls back to legacy API
- **✅ User feedback**: Clear error states with actionable guidance for users

### **🏧 Technical Architecture**

- **✅ Dual API design**: Modern `/api/analyze-live` (JSON) + Legacy `/api/analyze` (text) endpoints
- **✅ State management**: Optimized React context updates with proper dependency arrays
- **✅ TypeScript compliance**: Full type safety across all API interactions
- **✅ Performance optimization**: Reduced unnecessary re-renders and improved response times

---

## 🎭 **The Strategic Session Experience**

### **Phase 1: Future Vision (10 min)**
*"Fast forward to 2028. What does your organization look like if AI efforts go really well?"*

### **Phase 2: Three-Shift Framework (10 min)**
*Present the Tools→Agents, Outputs→Feedback Loops, Individual→Shared Intelligence thesis*

### **Phase 3: Foundations Discussion (15 min)**
*"What needs to be true today to enable that 2028 vision?"*

### **Phase 4: Meta-Moment Demo (10 min)**
*🎯 **The Highlight**: Demonstrate the co-facilitator itself as reflexive AI in action*

### **Phase 5: Closing Reflection (10 min)**
*"What's one takeaway you're bringing back to your team?"*

---

## 💼 **Professional Use Cases**

### **🎯 Strategic Facilitation**
- AI transformation planning sessions with senior leadership
- Digital strategy roundtables for executive teams
- Innovation strategy workshops and capability assessments
- Cross-functional strategic alignment discussions

### **🏢 Organizational Development**
- Change management conversations for AI adoption
- Future visioning exercises with C-suite executives
- Leadership team development on AI strategy
- Strategic thinking enhancement for transformation initiatives

---

## 🔧 **Technical Excellence**

### **Production Architecture**
- **Frontend**: Next.js 15 with TypeScript and professional UI components
- **AI Integration**: OpenAI GPT-4o for superior strategic reasoning
- **Voice Processing**: Web Speech API with intelligent fallback systems
- **Deployment**: Vercel with automatic scaling and global CDN
- **Security**: Secure environment management and API key protection

### **Quality Assurance**
- **✅ Zero TypeScript errors** in production build
- **✅ Comprehensive error handling** with graceful degradation
- **✅ Enhanced logging** with session correlation for debugging  
- **✅ Rate limiting** and cost controls for enterprise use
- **✅ Professional testing** with Jest-based validation

---

## 🚀 **Immediate Setup (For New Deployments)**

### **Prerequisites**
- Node.js 18+
- OpenAI API key ([Get one here](https://platform.openai.com))
- Modern web browser (Chrome recommended for speech features)

### **Quick Setup**
```bash
# Clone and configure
git clone https://github.com/ALehav1/Ai4_Roundtable_Co-Facilitator_Agent.git
cd ai-roundtable
npm install

# Configure API key
echo "OPENAI_API_KEY=sk-your-key-here" > .env.local

# Run locally (for customization)
npm run dev

# Deploy to production
vercel --prod
```

---

## ⚙️ **Professional Customization**

### **Strategic Content Configuration**
All session content easily customizable in `src/config/roundtable-config.ts`:

```typescript
export const sessionConfig = {
  title: 'When AI Becomes How the Enterprise Works',
  description: 'Strategic AI transformation roundtable',
  // Fully customizable session parameters
};

export const roundtableQuestions = [
  {
    id: "future_vision_2028",
    title: "The 3-5 Year Future: Your Organization in 2028",
    description: "Strategic provocation about AI transformation...",
    timeLimit: 10, // Flexible timing
    // AI analysis context and follow-up prompts
  }
  // Additional strategic phases easily configured
];
```

### **AI Behavior Customization**
```typescript
export const aiConfig = {
  systemPrompt: `Expert co-facilitator for AI transformation discussions...`,
  temperature: 0.7, // Balance of creativity and consistency
  maxTokens: 500   // Response depth control
};
```

---

## 💰 **Enterprise Cost Management**

### **Transparent Pricing (Per Session)**
- **Small executive teams** (5-8 leaders): ~$8-15
- **Medium strategic sessions** (8-12 executives): ~$15-25  
- **Large transformation discussions** (12+ participants): ~$25-40

### **Built-in Controls**
- **Rate limiting**: Configurable API call limits
- **Usage tracking**: Real-time cost monitoring
- **Test mode**: Complete rehearsal capability with zero costs
- **Token optimization**: Intelligent context management

---

## 🔒 **Enterprise Security & Requirements**

### **Speech Recognition**
- **HTTPS mandatory**: Secure connections required for voice features
- **Browser optimized**: Chrome/Edge recommended for best experience
- **Production ready**: Fully tested in deployed environments
- **Fallback systems**: Manual entry when voice unavailable

### **Data Security**
- **No client-side API keys**: Secure environment variable management
- **Session isolation**: Each session independently managed
- **Auto-cleanup**: Automatic session data management
- **Privacy focused**: No permanent storage of sensitive discussions

---

## 📊 **Executive Analytics**

### **Session Intelligence**
- **Participation tracking**: Engagement levels and contribution patterns
- **AI performance metrics**: Analysis quality and strategic relevance
- **Strategic outcomes**: Key decisions and action items captured
- **Transformation indicators**: Organizational readiness insights

---

## 🎯 **Strategic Impact**

### **For Facilitators**
- **Enhanced credibility** through sophisticated tooling
- **Deeper strategic insights** via AI-powered analysis
- **Professional documentation** for stakeholder communication
- **Scalable facilitation** of complex transformation discussions

### **For Organizations**
- **Accelerated AI transformation** planning and execution
- **Executive alignment** on strategic AI initiatives  
- **Actionable insights** that drive real transformation
- **Institutional memory** of strategic discussions and decisions

---

## 📞 **Professional Support**

### **Platform Status**
- **✅ Production stable**: All features tested and operational
- **✅ Zero known issues**: Platform ready for executive use
- **✅ Comprehensive logging**: Built-in diagnostics and monitoring
- **✅ Professional documentation**: Complete setup and usage guides

### **Getting Started**
1. **Visit the live platform**: https://co-facilitatoragent.vercel.app/
2. **Configure your session**: Customize questions and AI behavior as needed
3. **Test in rehearsal mode**: Practice with the complete workflow
4. **Deploy for executives**: Lead strategic AI transformation discussions

---

## 🚀 **Transform Your Next Executive AI Discussion**

This co-facilitator transforms standard executive meetings into sophisticated strategic interventions that demonstrate the future of enterprise AI in action.

**The result**: More engaged executives, breakthrough strategic insights, and concrete next steps that actually advance AI transformation initiatives.

---

## 📂 **Repository & Resources**

**🌐 Live Platform**: https://co-facilitatoragent.vercel.app/  
**📂 Source Code**: https://github.com/ALehav1/Ai4_Roundtable_Co-Facilitator_Agent  
**📋 Full Documentation**: Complete setup, customization, and troubleshooting guides included

---

*Built for strategic facilitators who understand that the future belongs to organizations that don't just use AI tools—they build AI systems that learn, adapt, and compound intelligence over time.*

**Ready to lead the AI transformation conversation? The platform is live and waiting.** 🚀



---

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ 
- OpenAI API key ([Get one here](https://platform.openai.com))
- Modern web browser (Chrome recommended for speech features)

### **Installation**
```bash
# Clone and setup
git clone https://github.com/ALehav1/Ai4_Roundtable_Co-Facilitator_Agent.git
cd ai-roundtable
npm install

# Configure your API key
echo "OPENAI_API_KEY=sk-your-actual-key-here" > .env.local

# Start development server
npm run dev
```

### **🌐 Live Production Demo**
**Current URL**: https://co-facilitatoragent.vercel.app/

*Ready for executive-level strategic AI transformation discussions*

---

## 🎭 **The Strategic Session Workflow**

### **📋 Setup Phase**
*Professional welcome screen with session configuration and feature overview*

### **Phase 1: Future Vision (10 min)**
*"Fast forward to 2028. What does your organization look like if AI efforts go really well?"*

### **Phase 2: Three-Shift Framework (10 min)**  
*Present your thesis about Tools→Agents, Outputs→Feedback Loops, Individual→Shared Intelligence*

### **Phase 3: Foundations Discussion (15 min)**
*"What needs to be true today to enable that 2028 vision?"*

### **Phase 4: Meta-Moment Demo (10 min)**
*🎯 **THE HIGHLIGHT**: Demonstrate the co-facilitator tool itself as an example of reflexive systems in action*

#### 🎤 Enhanced Voice Recognition (Production-Optimized)
- **HTTPS Required**: Speech recognition only works on HTTPS domains (production environments)
- **Improved Reliability**: Increased error tolerance (10 network errors, 20 total restarts)
- **Smart Error Handling**: Tracks consecutive vs total errors for better recovery from intermittent issues
- **Graceful Degradation**: Automatically falls back to manual entry when speech recognition fails

#### 📝 Multi-Modal Manual Entry (Robust Fallback System)
- **Single Entry Mode**: Traditional speaker dropdown + text input for individual entries
- **Bulk Copy-Paste Mode**: Paste entire transcripts with automatic "Speaker: Text" format parsing
- **File Upload Mode**: Upload .txt, .md, or .csv transcript files with local processing
- **Smart Parsing**: Automatically creates multiple transcript entries from bulk input
- **Multi-Speaker Support**: Facilitator, Speaker 1-5, plus custom speaker names

#### 🧠 Enhanced AI Analysis
- **Dual Analytics UI**: Side-by-side "Get Insights" and "Follow-up Questions" buttons
- **Enhanced Formatting**: Bullet points, numbered lists, quotes, and section headers for readability
- **Session Memory**: AI maintains context across all questions and responses with cross-question linking
- **Dual Endpoints**: Primary `/api/analyze-live` with automatic legacy fallback
- **No Hallucination**: Strict prompts prevent AI from fabricating participants or content

#### 💾 Session Persistence & Export
- **Auto-Save**: Session state automatically saved to localStorage every change
- **Recovery**: Reload page to restore previous session with full state preservation
- **PDF Export**: Professional session summaries in dedicated utilities section
- **Shareable Output**: Clean, formatted PDF files for distribution

## ⚙️ Configuration

### Environment Variables

```env
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional
NEXT_PUBLIC_APP_ENV=production
```

### Roundtable Configuration

Edit `src/config/roundtable-config.ts` to customize:

- **Questions**: Modify discussion topics and prompts
- **AI Settings**: Adjust analysis types and prompt templates
- **UI Text**: Customize interface copy and instructions
- **Session Defaults**: Set default facilitator, topic, participant count
- **🧪 Test Mode**: Rehearsal mode with mock AI responses for preparation
- **🔍 Enhanced Logging**: Comprehensive error tracking and performance monitoring
- **🔒 Enterprise Security**: Rate limiting, environment variables, no client-side API keys
- **📱 Responsive Design**: Professional interface optimized for facilitator workflow

## 🛠️ Technical Architecture

### Tech Stack
- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, OpenAI GPT-4o
- **Speech**: Web Speech API + Whisper fallback
- **Storage**: localStorage (session persistence)
- **Export**: jsPDF + html2canvas
- **Deployment**: Vercel (recommended)

### Project Structure
```
src/
├── app/
│   ├── api/
│   │   ├── analyze/route.ts         # Legacy AI analysis
│   │   ├── analyze-live/route.ts    # New strict JSON AI analysis  
│   │   └── transcribe/route.ts      # Whisper speech fallback
│   └── page.tsx                 # Main application page
├── components/
│   └── RoundtableCanvasV2.tsx   # Main application component
├── config/
│   └── roundtable-config.ts     # Questions, prompts, settings
├── hooks/
│   └── useSpeechTranscription.ts # Modular speech recognition
└── utils/
    ├── storage.ts              # Session persistence
    └── pdfExport.ts            # PDF generation
```

## 🛡️ Troubleshooting

### Speech Recognition Issues

**Problem**: Speech recognition not working
**Solutions**:
1. **HTTPS Required**: Speech recognition only works on HTTPS (not localhost)
2. **Browser Support**: Use Chrome/Edge for best compatibility
3. **Microphone Permissions**: Check browser permissions
4. **Fallback**: Use "Manual Entry" button when speech fails

**Problem**: Infinite restart loop (fixed in MVP)
**Solution**: Nuclear restart fix limits attempts to 5, then gracefully fails to manual entry

### AI Analysis Issues

**Problem**: "AI analysis temporarily unavailable"
**Solutions**:
1. Check OpenAI API key in environment variables
2. Verify API key has sufficient credits
3. Check network connectivity
4. Try refreshing the page

### Session Persistence Issues

**Problem**: Session not restoring after page reload
**Solutions**:
1. Check browser localStorage is enabled
2. Clear localStorage if corrupted: `localStorage.clear()`
3. Restart session from intro screen

### PDF Export Issues

**Problem**: PDF export fails
**Solutions**:
1. Ensure session has transcript content
2. Check browser supports PDF generation
3. Try exporting smaller sessions
4. Refresh page and try again

## 📁 Project Structure

```
ai-roundtable/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── analyze-live/
│   │   │   │   └── route.ts          # 🎯 Main AI co-facilitation API endpoint
│   │   │   ├── env-test/
│   │   │   │   └── route.ts          # Environment variable testing utility
│   │   │   └── generate-summary/
│   │   │       └── route.ts          # Session summary generation
│   │   ├── globals.css               # Global styles with Tailwind CSS
│   │   ├── layout.tsx                # Root layout with metadata
│   │   └── page.tsx                  # Main application entry point
│   ├── components/
│   │   ├── RoundtableCanvasV2.tsx    # 🎯 Main UI component (current version)
│   │   └── SessionSummary.tsx        # PDF export and session summary display
│   ├── config/
│   │   └── roundtable-config.ts      # ⭐ MAIN CONFIGURATION FILE
│   ├── hooks/
│   │   └── useSpeechTranscription.ts # 🎤 Multi-engine speech recognition hook
│   └── utils/
│       ├── logger.ts                 # Enhanced logging and error tracking
│       ├── pdfExport.ts              # PDF generation utilities
│       └── storage.ts                # Session persistence and localStorage management
├── .env.local                        # Environment variables (API keys)
├── .gitignore                        # Git ignore rules
├── package.json                      # Dependencies and scripts
├── tailwind.config.ts                # Tailwind CSS configuration
├── tsconfig.json                     # TypeScript configuration
├── next.config.js                    # Next.js configuration
├── postcss.config.js                 # PostCSS configuration
├── vercel.json                       # Vercel deployment configuration
└── README.md                         # This comprehensive documentation
```

## 📂 Key File Reference

| File | Purpose | Features | Easy to Edit? |
|------|---------|----------|---------------|
| `src/config/roundtable-config.ts` | **Main Configuration** - Strategic questions, AI prompts, UI text | Session settings, AI behavior, facilitator guidance | ✅ **YES** |
| `src/components/RoundtableCanvasV2.tsx` | **Main UI Component** - Complete facilitator interface | Multi-speaker voice transcription, AI insights, session management | ⚠️ Code changes |
| `src/components/SessionSummary.tsx` | **PDF Export & Summary** - Professional summary display | Executive summaries, PDF generation, session reports | ⚠️ Code changes |
| `src/app/api/analyze-live/route.ts` | **AI Co-Facilitation** - Real-time strategic analysis | OpenAI GPT insights, follow-up questions, session context | ⚠️ Code changes |
| `src/app/api/generate-summary/route.ts` | **Summary Generation** - Comprehensive session summaries | Executive reports, strategic recommendations, export data | ⚠️ Code changes |
| `src/hooks/useSpeechTranscription.ts` | **Speech Recognition** - Multi-engine voice transcription | Web Speech API, Whisper fallback, error handling | ⚠️ Code changes |
| `src/utils/storage.ts` | **Session Persistence** - localStorage management | Auto-save, session recovery, data persistence | ⚠️ Code changes |
| `src/utils/pdfExport.ts` | **PDF Generation** - Professional document export | jsPDF integration, formatting, session reports | ⚠️ Code changes |
| `src/utils/logger.ts` | **Error Tracking** - Enhanced logging system | Structured logging, performance metrics, debugging | ⚠️ Code changes |
| `.env.local` | **API Keys & Secrets** - Environment variables | OpenAI API key, secure configuration | ✅ **YES** |
| `src/app/globals.css` | **Styling** - Tailwind CSS and custom styles | Responsive design, animations, professional theme | 🎨 Design changes |

## 🎯 **AI FACILITATOR PROMPT LOCATIONS** (Easy Editing Guide)

**CRITICAL FOR CUSTOMIZATION**: Here's exactly where to find and edit AI prompts for easy modification:

### ✅ **EASY TO EDIT** - Configuration File
**File**: `src/config/roundtable-config.ts`
- **Main AI Config**: Lines 44-54 (`aiConfig` object)
- **Questions & Context**: Lines 78-158 (`roundtableQuestions` array)
- **System Behavior**: Lines 160-194 (`uiText` and session settings)

### ⚠️ **REQUIRES CODE CHANGES** - API Route Files
**File**: `src/app/api/analyze/route.ts`
- **Insights Prompt**: Lines 130-200 (`buildInsightsPrompt` function)
- **Synthesis Prompt**: Lines 220-270 (`buildSynthesisPrompt` function) 
- **Follow-up Prompt**: Lines 290-340 (`buildFollowupPrompt` function)
- **Cross-reference Prompt**: Lines 360-400 (`buildCrossReferencePrompt` function)

**File**: `src/app/api/generate-summary/route.ts`
- **Question Summary**: Lines 140-200 (`generateQuestionSummary` function)
- **Executive Summary**: Lines 260-320 (`generateExecutiveSummary` function)
- **Overall Conclusion**: Lines 355-380 (`generateOverallConclusion` function)

### 🚨 **CURRENT PROMPT ISSUES** (Need Fixing)
1. **Collapsible Instructions Bug**: Both facilitator instructions and notes accordions in RoundtableCanvas.tsx
2. **AI Hallucination**: Despite fixes, AI may still fabricate participants or content
3. **Speed Optimization**: Summary generation is slow for longer transcripts
4. **Context Propagation**: Data flow bug may prevent AI from using real session data

## 🧠 Logic Flow Diagrams

### 🎆 Complete Facilitator Workflow

```text
Facilitator Opens App
       ↓
Load Configuration (questions, AI settings, logging initialized)
       ↓
Display Strategic Question with Facilitator Guidance
       ↓
┌───────── SPEECH-TO-TEXT ENABLED ─────────┐
│  Facilitator clicks microphone → Web Speech API starts   │
│  Real-time transcription → Text appears in input field    │
│  Facilitator can edit transcribed text before submission    │
└───────────────────────────────────────────────────┘
       ↓
Capture Response (with participant name)
       ↓
Store in Session Memory + Log User Action
       ↓
Trigger AI Co-Facilitation Analysis
        ↓
┌───────── ENHANCED AI ANALYSIS (2025) ─────────┐
│  ✅ CHECK: No analysis already in progress     │
│  ✅ ADD: Loading state to prevent loops        │
│  ✅ TRY: /api/analyze-live (primary endpoint)  │
│  ✅ FALLBACK: /api/analyze (legacy endpoint)   │
│  ✅ TYPES: insights, synthesis, followup,      │
│           cross_reference, facilitation,       │
│           transition (NEW!)                     │
│  ✅ ERROR: Graceful handling with user feedback│
└───────────────────────────────────────────────┘
        ↓
AI provides: Strategic insights with loading states
        ↓
[Repeat for multiple participants/responses]
       ↓
Next Question or Generate Comprehensive Summary
       ↓
┌───────── SUMMARY GENERATION ──────────┐
│  GPT-4o analyzes entire session context           │
│  Generates narrative summaries for each section  │
│  Creates executive summary with recommendations   │
│  Provides PDF/CSV export for stakeholder sharing │
└───────────────────────────────────────────────────┘
```

### 🎤 Modular Speech Transcription Architecture

The application features a robust, layered speech transcription system with automatic fallback capabilities:

#### Architecture Overview

```text
Speech Input Request
       ↓
┌─────────────────────────────────────────┐
│        useSpeechTranscription Hook      │
│    (Unified API for all engines)       │
└─────────────────────────────────────────┘
       ↓
Engine Selection Logic (NEXT_PUBLIC_SPEECH_ENGINE)
       ↓
┌────────────────┬────────────────┬──────────────────┐
│   Layer A:     │   Layer B:     │   Layer C:       │
│ Native Web     │ Whisper        │ Deepgram        │
│ Speech API     │ Chunked        │ Streaming        │
│ (Browser)      │ (Serverless)   │ (Premium)        │
└────────────────┴────────────────┴──────────────────┘
       ↓              ↓                ↓
HTTPS Required    Always Available   WebSocket Required
Auto-restart      MediaRecorder      Real-time stream
Error mapping     /api/transcribe    Premium accuracy
```

#### Engine Details

**Layer A: Native Web Speech API**
- **Requirements**: HTTPS environment only
- **Features**: Real-time transcription, auto-restart every 45s, detailed error mapping
- **Fallback**: Automatic fallback to Whisper on network errors or HTTP

**Layer B: Whisper Chunked Fallback**  
- **Requirements**: OpenAI API key, works on HTTP/HTTPS
- **Features**: MediaRecorder chunking, serverless Edge API, high accuracy
- **Use Case**: Primary fallback when native speech unavailable

**Layer C: Deepgram Streaming (Optional)**
- **Requirements**: Deepgram API key, WebSocket connection
- **Features**: Premium real-time streaming, enterprise accuracy
- **Use Case**: Opt-in premium upgrade for production environments

#### Local Development Setup

**⚠️ IMPORTANT**: Native Web Speech API requires HTTPS. For local testing:

1. **HTTP Development** (localhost:3000):
   - Speech recognition disabled (expected behavior)
   - Manual entry and Whisper fallback available
   - Console shows graceful fallback messages

2. **HTTPS Development** (recommended for speech testing):
   ```bash
   # Option 1: Use ngrok for HTTPS tunnel
   npm install -g ngrok
   npm run dev
   # In separate terminal:
   ngrok http 3000
   # Use the https://xxx.ngrok.io URL
   
   # Option 2: Production deployment testing
   vercel deploy
   # Test on live Vercel HTTPS URL
   ```

### 🤖 AI Co-Facilitation Analysis Flow

```text
Response Submitted + Performance Logging Started
       ↓
Rate Limit Check + API Call Logged
       ↓
Test Mode? ──YES──→ Return Mock Insights + Log
       ↓
      NO
       ↓
Prepare AI Context:
├── Current question + facilitator guidance
├── Session memory (all previous responses)
├── Cross-question context for linking
└── Analysis type (insights/synthesis/followup/cross_reference)
       ↓
GPT-4o API Call + Request Logged
       ↓
AI Processing:
├── Strategic pattern recognition
├── Cross-question insight linking
├── Facilitation style adaptation
└── Proactive intervention suggestions
       ↓
Response Processing + Success/Error Logging
       ↓
Return Structured Insights to Frontend
       ↓
Update UI + Log Performance Metrics
```

### 📋 Comprehensive Summary Generation Flow

```text
Facilitator Clicks "Generate Summary"
       ↓
Validation: Session has responses? + Log Action
       ↓
Prepare Summary Context:
├── All session responses by question
├── All AI insights and cross-references
├── Session metadata (duration, participants)
└── Question configuration and context
       ↓
Call /api/generate-summary + Log API Request
       ↓
GPT-4o Analysis for Each Question:
├── Identify key themes and patterns
├── Generate narrative summary (not bullets)
├── Extract critical insights
├── Identify strategic implications
└── Note emerging concerns
       ↓
Generate Executive Summary:
├── Strategic findings across all sections
├── Actionable recommendations
├── Immediate next steps
└── Risk factors to monitor
       ↓
Create Overall Narrative Conclusion + Log Success
       ↓
Display Professional Summary Modal
       ↓
Export Options:
├── PDF: Generate printable HTML → Browser print dialog
└── CSV: Structured data download
```

### 🔍 Enhanced Logging & Error Tracking Flow

```text
Application Event Occurs
       ↓
Logger.info/warn/error/debug called
       ↓
Structured Log Entry Created:
├── Timestamp + Session ID
├── Component context (speech/ai/ui)
├── Performance metrics (if applicable)
├── Error details (if error)
└── User action context
       ↓
Log Level Check (Error/Warn/Info/Debug)
       ↓
Development: Console output
Production: External service (placeholder)
       ↓
Correlation via Session ID for debugging
```

## ⚙️ Easy Customization Guide

### 1. Modify Questions (EASY)

Edit `src/config/roundtable-config.ts`:

```typescript
export const roundtableQuestions: RoundtableQuestion[] = [
  {
    id: "your-question-id",
    title: "Your Question Title",
    description: "Your detailed question description",
    timeLimit: 20, // minutes (optional)
    aiPromptContext: "Context for AI to understand this question",
    followUpPrompts: [
      "Follow-up question 1?",
      "Follow-up question 2?"
    ]
  },
  // Add more questions...
];
```

### 2. Customize AI Behavior (EASY)

In the same config file:

```typescript
export const aiConfig: AIPromptConfig = {
  systemPrompt: `Your custom AI facilitator personality and instructions...`,
  temperature: 0.7, // 0.0 = focused, 1.0 = creative
  maxTokens: 400,   // Response length limit
  // ... other prompts
};
```

### 3. Session Settings (EASY)

```typescript
export const sessionConfig: SessionConfig = {
  title: "Your Roundtable Title",
  description: "Your session description",
  maxParticipants: 20,
  enableTestMode: true, // Set to false for live sessions
  rateLimitPerHour: 100,
  autoExportResults: true
};
```

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** - [Download from nodejs.org](https://nodejs.org)
- **OpenAI API Key** - [Get from platform.openai.com](https://platform.openai.com)
- **Modern Web Browser** - Chrome, Firefox, Safari, or Edge (for speech-to-text support)

### Installation

```bash
# 1. Navigate to project directory
cd ai-roundtable

# 2. Dependencies are already installed, but if needed:
npm install

# 3. Configure your OpenAI API key
# Create/edit .env.local file:
echo "OPENAI_API_KEY=sk-your-actual-key-here" > .env.local

# 4. Start development server
npm run dev

# 5. Open http://localhost:3000
```

### 🎆 First Complete Test Run

1. **⚙️ Set Test Mode**: Ensure `enableTestMode: true` in `src/config/roundtable-config.ts`
2. **🌐 Open Browser**: Navigate to `http://localhost:3000`
3. **🎤 Test Speech Input**: Click microphone button, speak a response, see real-time transcription
4. **🤖 Try AI Analysis**: Submit responses, trigger different AI analysis types (insights, synthesis, follow-ups)
5. **📋 Generate Summary**: Click "Generate Summary" after multiple responses, test narrative summaries
6. **📄 Test Export**: Export summary as PDF (print) and CSV download

## 🧪 Testing & Development

### Test Mode Features

- **Mock AI Responses**: No API calls or costs
- **Fast Iteration**: Test question flow quickly
- **UI Testing**: Verify all components work
- **Export Testing**: Validate data structure

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Test local build first (CRITICAL)
npm run build
```

#### Step 2: Deploy
```bash
# Deploy from project root
vercel

# Follow prompts:
# - Link to existing project: No (for first deployment)
# - Project name: ai-facilitator-agent
# - Directory: ./ (default)
```

#### Step 3: Configure Environment Variables
**In Vercel Dashboard:**
1. Go to Project Settings → Environment Variables
2. Add for **Production** environment:
   - Name: `OPENAI_API_KEY`
   - Value: `your_actual_openai_api_key`
3. **Redeploy after adding environment variables**

#### Step 4: Verify Deployment
- Check build logs in Vercel dashboard
- Test AI features in production
- Verify speech recognition works (HTTPS only)

**Production URL**: https://ai-facilitator-agent.vercel.app

### Production Checklist

- [ ] Set `enableTestMode: false` in config
- [ ] Add OpenAI API key to Vercel environment variables
- [ ] Test live deployment with small group first
- [ ] Monitor API usage and costs
- [ ] Verify rate limiting works correctly

## 💡 Professional Facilitator Workflow

### 📋 Pre-Session Setup (10 minutes)

1. **⚙️ Configure Strategic Questions**: Edit `src/config/roundtable-config.ts` for your specific AI transformation topic
2. **🧪 Test Complete Workflow**: Run in test mode to verify speech-to-text, AI insights, and summary generation
3. **🔒 Switch to Live Mode**: Set `enableTestMode: false` and verify OpenAI API key
4. **🌐 Prepare Environment**: Test microphone permissions, check browser compatibility
5. **📊 Monitor Dashboard**: Verify logging is active, rate limits configured

### 🎯 During Strategic Session

#### **Opening (5 minutes)**
- **Introduce the Co-Facilitator Approach**: Explain AI will provide real-time strategic insights
- **Demonstrate Speech Input**: Show microphone button for hands-free facilitation
- **Set Expectations**: Clarify this is a strategic intervention, not just discussion

#### **Question Flow (Per Strategic Question)**
1. **🎤 Capture Responses**: Use speech-to-text for natural conversation flow
   - Click microphone → speak naturally → edit transcription if needed
   - Add participant names for better tracking
2. **🤖 Trigger AI Co-Facilitation**: 
   - **Insights**: Strategic patterns and themes
   - **Synthesis**: Cross-response connections 
   - **Follow-ups**: Probing questions to deepen discussion
   - **Cross-references**: Links to previous strategic points
3. **🎯 Strategic Facilitation**: Build on AI insights with human judgment and experience
4. **📝 Session Memory**: AI maintains context across all questions for sophisticated analysis

#### **Session Conclusion (10 minutes)**
1. **📋 Generate Comprehensive Summary**: Click "Generate Summary" for executive-ready output
2. **📊 Review Strategic Findings**: 
   - Narrative summaries for each discussion section
   - Executive summary with strategic recommendations
   - Key findings, next steps, and risk factors
3. **📄 Professional Export**: 
   - **PDF**: Print-ready document for stakeholder distribution
   - **CSV**: Structured data for further analysis

### 🔍 Enhanced Error Monitoring

- **Real-time Logging**: All speech events, AI calls, and user actions tracked
- **Performance Metrics**: API response times and success rates monitored
- **Error Recovery**: Graceful fallbacks for speech recognition and AI analysis failures
- **Session Correlation**: All logs tied to session ID for easy troubleshooting

### Post-Session

1. **Export Results**: JSON file with all responses and insights
2. **Follow-up**: Use insights for action planning
3. **Cost Review**: Check OpenAI API usage costs
4. **Session Notes**: Document what worked well for next time

## 📊 Cost Management

### 💰 Expected Costs (GPT-4o Model)

**Per Session Estimates:**
- **Small Strategic Session (5-8 executives, 4-5 questions)**: ~$8-15
  - Real-time insights: ~$5-8
  - Comprehensive summary generation: ~$3-7
- **Medium Strategic Session (8-12 executives, 5-7 questions)**: ~$15-25
  - Real-time insights: ~$8-15
  - Comprehensive summary generation: ~$7-10
- **Large Strategic Session (12+ executives, 7+ questions)**: ~$25-40
  - Real-time insights: ~$15-25
  - Comprehensive summary generation: ~$10-15

**Cost Factors:**
- 🤖 **GPT-4o Premium Model**: Higher cost but superior strategic reasoning
- 📋 **Summary Generation**: Additional cost for comprehensive end-of-session summaries
- 📝 **Session Memory**: Cross-question context increases token usage but improves insights
- 🎤 **Speech-to-Text**: Uses browser Web Speech API - **NO additional cost**

### 🔒 Enterprise Cost Controls

- **⏱️ Rate Limiting**: Max 100 API calls per hour (configurable)
- **📁 Token Management**: Intelligent chunking for large sessions
- **🧪 Test Mode**: Complete workflow testing with **zero API costs**
- **⚡ Error Fallbacks**: Graceful degradation prevents unnecessary retry costs
- **📊 Usage Tracking**: Enhanced logging for cost monitoring and optimization

### 🔍 Cost Monitoring & Control

1. **📈 OpenAI Dashboard**: Monitor usage at [platform.openai.com](https://platform.openai.com/usage)
2. **📊 Enhanced Application Logs**: Track API calls, token usage, and cost estimates
3. **⚙️ Configurable Limits**: Adjust rate limits and token caps in config file
4. **🚨 Cost Alerts**: Set up usage alerts in OpenAI dashboard
5. **📊 ROI Tracking**: Professional summaries justify strategic session investment

## 🔧 Advanced Configuration

### 🤖 AI Model Configuration

**Current Setup: GPT-4o for Superior Strategic Reasoning**

```typescript
// In src/app/api/analyze/route.ts and src/app/api/generate-summary/route.ts
const completion = await openai.chat.completions.create({
  model: "gpt-4o", // Current: Premium strategic reasoning
  // Alternative options:
  // model: "gpt-4o-mini", // Cost-effective option
  // model: "gpt-4-turbo", // Previous generation
  temperature: 0.7, // Balance creativity vs consistency
  max_tokens: 500,  // Configurable response length
});
```

### 🎤 Speech-to-Text Configuration

**Web Speech API Settings (Browser-based, No API Key Required)**

```typescript
// In src/components/RoundtableCanvas.tsx
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = true;        // Keep listening
recognition.interimResults = true;    // Show real-time transcription
recognition.lang = 'en-US';          // Language setting
recognition.maxAlternatives = 1;     // Single best result
```

**Browser Compatibility:**
- ✅ **Chrome/Edge**: Full support with excellent accuracy
- ✅ **Safari**: Good support (may require user permission)
- ⚠️ **Firefox**: Limited support (fallback to manual input)

### 📋 Summary Generation Configuration

**Customize Summary Structure:**

```typescript
// In src/app/api/generate-summary/route.ts
const summaryConfig = {
  sectionsInclude: {
    executiveSummary: true,     // Strategic overview
    sectionSummaries: true,     // Per-question narratives
    keyFindings: true,          // Critical insights
    recommendations: true,      // Action items
    riskFactors: true,         // Concerns to monitor
    nextSteps: true            // Immediate actions
  },
  narrativeStyle: "executive", // vs "detailed" or "bullet"
  confidenceThreshold: 0.7     // Filter low-confidence insights
};
```

### 🔍 Enhanced Logging Configuration

**Customize Logging Behavior:**

```typescript
// In src/utils/logger.ts
const logConfig = {
  level: 'info',              // 'error' | 'warn' | 'info' | 'debug'
  enableConsoleOutput: true,   // Development logging
  enableExternalService: false, // Production logging service
  sessionTracking: true,       // Correlate logs by session
  performanceMetrics: true,    // Track API response times
  speechEventLogging: true     // Speech recognition events
};
```

### ⚙️ Strategic Question Templates

**Add Custom Question Types:**

```typescript
// In src/config/roundtable-config.ts
{
  id: "digital-transformation",
  title: "Digital Transformation Readiness",
  description: "Assess organizational readiness for digital transformation initiatives",
  facilitatorGuidance: "Focus on capability gaps and change management challenges",
  aiPromptContext: "Analyze responses for digital maturity, change resistance, and strategic alignment",
  followUpPrompts: [
    "What specific digital capabilities are missing?",
    "How might we address change management concerns?",
    "What quick wins could build transformation momentum?"
  ]
},
{
  id: "risk-assessment",
  title: "Strategic Risk Evaluation", 
  description: "Identify and prioritize strategic risks facing the organization",
  facilitatorGuidance: "Encourage discussion of both internal and external risk factors",
  aiPromptContext: "Categorize risks by impact/probability and suggest mitigation strategies",
  timeLimit: 15 // Optional time constraint
}
```

### 🎨 UI/UX Customization

**Professional Theme Configuration:**

```typescript
// In tailwind.config.ts
theme: {
  colors: {
    primary: {
      50: '#f0f9ff',   // Light blue backgrounds
      500: '#3b82f6',  // Primary buttons
      600: '#2563eb',  // Hover states
      900: '#1e3a8a'   // Dark text
    },
    // Customize for your organization's brand
  },
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'], // Professional font
  }
}
```

**Custom Animations and Components:**
- `src/app/globals.css` - Modify animations, spacing, professional styling
- Responsive design tokens for various screen sizes
- Accessibility-compliant color contrast ratios

## 🆘 Troubleshooting

### 🚑 Common Issues & Solutions

#### **🤖 AI Analysis Issues**

**"AI analysis failed" / "Summary generation failed"**
- ✅ Check OpenAI API key in `.env.local` (must start with `sk-`)
- ✅ Verify internet connection and OpenAI service status
- ✅ Check OpenAI account has sufficient credits/quota
- ✅ Review enhanced logs in browser console for detailed error context
- ✅ Try test mode first to isolate API vs application issues

**"Rate limit exceeded" / "Too many requests"**
- ⏱️ Wait 1 hour for automatic reset (default: 100 calls/hour)
- ⚙️ Reduce `rateLimitPerHour` in `roundtable-config.ts`
- 🧪 Use test mode for rehearsals and practice sessions
- 📊 Monitor usage in OpenAI dashboard to set appropriate limits

#### **🎤 Speech-to-Text Issues**

**"Network error" / "Speech recognition fails immediately"**
- 🔒 **HTTPS Requirement**: Web Speech API requires HTTPS to function in modern browsers (Chrome 47+)
- 🌐 **Local Development**: Speech recognition will NOT work on `http://localhost` - this is a browser security limitation
- ✅ **Production Environment**: Feature works perfectly on deployed sites with HTTPS (Vercel, Netlify, etc.)
- 🧪 **During Development**: Use keyboard input for testing; speech recognition is production-only
- ℹ️ **Not a Bug**: This is standard browser security policy affecting all Web Speech API implementations

**"Microphone not working" / "Speech recognition unavailable"**
- 🌐 **Browser Compatibility**: Use Chrome/Edge for best results, Safari secondary
- 🎤 **Permissions**: Allow microphone access when prompted
- 🔊 **Audio Setup**: Test microphone in browser settings first
- 📱 **Mobile Devices**: Speech recognition may be limited on mobile browsers
- ⚠️ **Firefox**: Limited support - manual typing recommended

**"Transcription is inaccurate"**
- 🗣️ Speak clearly and at moderate pace
- 🎤 Ensure quiet environment with minimal background noise
- ✏️ Edit transcribed text before submitting responses
- ⚙️ Adjust language settings in speech recognition configuration

#### **📋 Summary Generation Issues**

**"Generate Summary button not appearing"**
- ✅ Ensure session has at least one submitted response
- 🔄 Refresh page if button doesn't appear after responses
- 📊 Check browser console for any JavaScript errors

**"Summary export not working"**
- 📄 **PDF Export**: Uses browser print dialog - check popup blockers
- 🗜️ **CSV Export**: Check browser download permissions
- 📊 Verify summary generation completed successfully first

#### **🚀 Application Issues**

**Page won't load / "500 Internal Server Error"**
- 💻 Check if development server is running: `npm run dev`
- 🔌 Try different port: `npm run dev -- -p 3001`
- 🧹 Clear browser cache and cookies
- 📁 Check for missing dependencies: `npm install`
- 📅 Review server logs in terminal for specific error messages

**"Hydration mismatch" warnings**
- ℹ️ These are often caused by browser extensions (especially Windsurf browser extension)
- ✅ App functionality should work normally despite warnings
- 🔄 Try in incognito/private browsing mode to isolate extension issues

#### **🌐 Deployment Issues**

**Vercel deployment failing**
- ⚙️ Verify `OPENAI_API_KEY` in Vercel environment variables
- 📊 Check build logs for specific error messages
- 📁 Ensure all dependencies are in `package.json`
- 🚫 Set `enableTestMode: false` in config for production
- 📄 Verify all new files are committed to git

### 🔍 Enhanced Debugging with Logging

**Using the Enhanced Logging System:**

1. **📊 Check Browser Console**: 
   - Open Developer Tools (F12 → Console)
   - Look for structured log entries with session IDs
   - Performance metrics show API response times

2. **📊 Server-Side Logs**:
   - Terminal output shows API calls and errors
   - Speech events are logged with timestamps
   - Session correlation helps track issues

3. **⚙️ Configuration Debugging**:
   - Verify `roundtable-config.ts` syntax is valid TypeScript
   - Check for missing commas, quotes, or brackets
   - Use test mode to validate configuration before live sessions

### 🚑 Getting Help

**Systematic Troubleshooting Process:**

1. **🧪 Test Mode First**: Always verify functionality in test mode
2. **📊 Check Enhanced Logs**: Browser console + server terminal output
3. **⚙️ Verify Configuration**: Double-check all config files and environment variables
4. **🌐 Test Browser Compatibility**: Try different browsers for speech/compatibility issues
5. **📁 Check Dependencies**: Ensure all packages installed and up to date

## 🛠️ **Recent Critical Fixes (v1.0.0)**

### 🎯 **CSS Class Contamination Fix**
**Issue**: AI was outputting raw CSS class names instead of clean content
**Root Cause**: Session contamination where formatted HTML was being stored in transcript entries and sent back to the AI
**Solution**: Systematic debugging approach with:
- Comprehensive debug logging (frontend + backend)
- Data sanitization (strip HTML from transcript entries)
- Ultra-clean prompts (no formatting references)
- Contamination detection (block responses with CSS classes)
- Simplified formatting function (minimal HTML generation)

### 🔧 **Insights Analysis Parameter Bug Fix**
**Issue**: Follow-up questions worked perfectly, but insights analysis failed
**Root Cause**: Function parameter order bug in `buildLiveAnalysisPrompt` call
**Solution**: Fixed parameter order from `(analysisType, sessionTopic, transcript)` to `(analysisType, transcript, { title: sessionTopic })`

### 🧪 **Debugging Methodology**
When troubleshooting AI output issues:
1. **Add debug logging** to track data flow from frontend → API → AI → response
2. **Check for contamination** in transcript storage and API requests
3. **Sanitize data** before sending to AI (strip HTML, validate format)
4. **Use simple prompts** with clear examples instead of complex instructions
5. **Validate responses** before storing to prevent cascading issues

## 🔄 ChatGPT Unstuck Prompt

If you need additional help, copy this comprehensive prompt to ChatGPT:

```text
I'm working on an Enterprise AI Roundtable Co-Facilitator Agent built with Next.js, TypeScript, and OpenAI GPT-4o. Here's the current setup:

PROJECT STRUCTURE:
- Next.js 15 with TypeScript and Tailwind CSS
- GPT-4o model for strategic reasoning and co-facilitation
- Speech-to-text integration using Web Speech API
- Comprehensive summary generation with PDF/CSV export
- Enhanced logging system for error tracking
- Configuration system in src/config/roundtable-config.ts

KEY COMPONENTS:
- Frontend: src/components/RoundtableCanvas.tsx (main interface with speech-to-text)
- Summary: src/components/SessionSummary.tsx (summary display and export)
- AI Analysis API: src/app/api/analyze/route.ts (real-time insights)
- Summary API: src/app/api/generate-summary/route.ts (comprehensive summaries)
- Logging: src/utils/logger.ts (enhanced error tracking)

FEATURES:
- Real-time speech-to-text transcription
- AI co-facilitation with session memory
- Cross-question insight linking
- Narrative summary generation (not just bullet points)
- Professional PDF/CSV export
- Rate limiting, test mode, error handling

CURRENT ISSUE:
[Describe your specific problem here - include which feature/component]

CONFIGURATION:
- Questions: [Copy relevant parts of roundtable-config.ts]
- AI Settings: [Copy aiConfig section if relevant]
- Error Messages: [Copy browser console errors and server logs]
- Speech/Summary Issues: [Include browser compatibility info]

STEPS ALREADY TRIED:
[List troubleshooting steps you've already attempted]

GOAL:
[Describe what you're trying to achieve - be specific about feature]

Please provide specific code changes, configuration updates, and step-by-step instructions to resolve this issue. Consider speech-to-text browser compatibility, summary generation workflow, and enhanced logging context.
```

---

## 📝 Development Notes

**Last Updated**: August 2024  
**Version**: 2.0.0 (Major Feature Release)  
**Dependencies**: Next.js 15, OpenAI 4.67.3, TypeScript 5, Tailwind CSS 3  
**Browser Support**: Chrome, Firefox, Safari, Edge - **Speech-to-text requires Chrome/Edge for optimal experience**  
**Repository**: [GitHub - Enterprise AI Roundtable Co-Facilitator Agent](https://github.com/ALehav1/Ai4_Roundtable_Co-Facilitator_Agent)  

### 🎆 Feature Completion Status

#### **✅ Core Features (Complete & Tested)**
- **Configuration System**: Easy question and AI prompt editing via centralized config
- **GPT-4o Integration**: Premium AI model for superior strategic reasoning
- **Test Mode**: Complete mock workflow for rehearsal and training (honors test mode flag)
- **Rate Limiting**: Enterprise-grade cost protection with proper increment logic and validation
- **API Key Validation**: Explicit OpenAI API key checks with clear error messages
- **Error Handling**: Comprehensive graceful fallbacks with detailed logging
- **Testing Infrastructure**: Jest-based testing with centralized mocks and safety-first protocols
- **Deployment Ready**: Production-ready Vercel deployment with environment variables

#### **✅ Advanced Features (Complete & Tested)**
- **🎤 Speech-to-Text Integration**: Real-time transcription using Web Speech API
- **📋 Comprehensive Summary Generation**: Narrative summaries with executive formatting and proper JSON parsing
- **📄 Professional Export**: PDF (print dialog) and CSV download functionality
- **🔍 Enhanced Logging**: Structured error tracking with session correlation
- **🧠 Session Memory**: Cross-question context for sophisticated AI co-facilitation
- **📊 Cost Management**: Transparent pricing with usage monitoring
- **🧪 Quality Assurance**: All critical bugs from code review addressed and verified

#### **✅ Professional UI/UX (Complete)**
- **Strategic Facilitator Interface**: Optimized for executive session leadership
- **Accessible Language**: Business-friendly terminology replacing technical jargon
- **Professional Styling**: Enterprise-grade design with responsive layout
- **Real-time Feedback**: Live transcription, AI thinking indicators, progress tracking

### 🛠️ Technical Architecture

- **Frontend**: React/Next.js with TypeScript for type safety
- **AI Integration**: OpenAI GPT-4o for strategic reasoning and narrative generation
- **Speech Processing**: Browser-native Web Speech API (no additional costs)
- **State Management**: React hooks with persistent session memory
- **Styling**: Tailwind CSS with professional theme and animations
- **Logging**: Structured logging with contextual error tracking
- **Export**: Client-side PDF generation and CSV formatting
- **Testing**: Jest-based testing with Node environment, centralized mocks, and API validation
- **Quality Assurance**: Rate limiting validation, API key checks, error handling verification

### 🚀 Deployment & Production

- **Platform**: Vercel (recommended) with automatic deployments
- **Environment**: Secure API key management via environment variables
- **Monitoring**: Enhanced logging with session correlation for troubleshooting
- **Scalability**: Rate limiting and cost controls for enterprise usage
- **Security**: No client-side API key exposure, secure environment variable handling

### 📈 Performance & Cost

- **API Efficiency**: Intelligent token usage with session context optimization
- **Cost Transparency**: Per-session cost estimates with usage tracking
- **Browser Performance**: Optimized speech recognition with graceful fallbacks
- **Export Performance**: Client-side processing for summary generation

### 🔄 Version History

- **v2.1.0 (January 2025)**: 🎆 **CRITICAL FIXES RELEASE** - API error resolution, infinite loop prevention, 'transition' analysis type, robust error handling
- **v2.0.0**: Major feature release with speech-to-text, summary generation, enhanced logging
- **v1.0.0**: Initial stable release with core AI co-facilitation features
- **v1.0-stable-speech**: Baseline release tagged for rollback safety

### ✅ **Current Status (January 2025)**

**🎆 ALL CRITICAL ISSUES RESOLVED!**

- ✅ **API 400 errors**: Fixed schema mismatches, added missing fields
- ✅ **Infinite loops**: Implemented loading state management  
- ✅ **Error handling**: Graceful degradation with user-friendly messages
- ✅ **'Transition' analysis**: Full backend and frontend support
- ✅ **State management**: Optimized React context and dependencies
- ✅ **Documentation**: Comprehensive README with logic flows and architecture

**📊 Platform Stability**: Production-ready with robust error handling and dual API architecture.

### 🕰️ Next Development Priorities

1. **✅ COMPLETED**: Critical API fixes and infinite loop prevention
2. **✅ COMPLETED**: Enhanced error handling and loading states
3. **✅ COMPLETED**: Full 'transition' analysis type support
4. **Future**: Advanced analytics and facilitator performance metrics
5. **Future**: Accessibility refinements (ARIA compliance, keyboard navigation)
