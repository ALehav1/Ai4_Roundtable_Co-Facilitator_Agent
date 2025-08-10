# AI Roundtable Co-Facilitator Agent

🎯 **Enterprise-Ready AI Co-Facilitation Platform for Strategic Leadership Discussions**

A sophisticated AI-powered platform designed for facilitating strategic roundtable discussions on AI transformation. Features real-time speech recognition, multi-modal input, live AI analysis, and professional export capabilities.

## 📑 Table of Contents
- [Key Features](#-key-features)
- [Quick Start](#-quick-start)
- [Application Architecture](#-application-architecture)
- [UX/UI Flow](#-uxui-flow)
- [File Structure Guide](#-file-structure-guide)
- [Configuration](#-configuration)
- [Component Documentation](#-component-documentation)
- [API Endpoints](#-api-endpoints)
- [Data Flow](#-data-flow)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)

## 🌟 Key Features

### Core Functionality
- **🎤 Multi-Layer Speech Recognition**: Web Speech API with automatic Whisper fallback
- **📝 Multi-Modal Manual Entry**: Single entry, bulk copy-paste, and file upload options
- **🤖 Real-Time AI Analysis**: Live insights, synthesis, and follow-up questions powered by GPT-4o
- **📊 Session Management**: Structured agenda workflow with progress tracking
- **💾 Auto-Save & Recovery**: Seamless session persistence with localStorage
- **📄 Professional Export**: Executive-ready PDF summaries and CSV data export

### Latest Updates (January 2025)

#### Critical Speech & AI Fixes (August 2025)
- ✅ **AI Analysis Type Fix**: Corrected `analysisType` typo from `'insight'` to `'insights'` in all AI analysis calls for proper API integration
- ✅ **Transcript Fragmentation Prevention**: Implemented intelligent buffering system to prevent word-by-word fragmentation:
  - **Smart Accumulation**: Interim speech results accumulate in buffer instead of immediate transcript entry
  - **Natural Pause Detection**: 1.5-second timeout triggers complete transcript entry after speech pauses
  - **Length Filtering**: Only substantial text (>5 characters) added to transcript for quality
  - **Enhanced Integration**: Buffered entries use smart speaker detection and maintain confidence scoring
- ✅ **Build Stability**: Resolved duplicate state declarations and TypeScript errors for reliable compilation
- ✅ **Speech Quality**: Whisper integration now produces complete thoughts instead of fragmented words

#### AI Features Enhancement (January 2025)
- ✅ **Enhanced AI Panel UX**: All content tabs now feature scrollable containers with max-height for better navigation
- ✅ **Intelligent Content Management**: Synthesis discussions now overwrite previous entries instead of appending for cleaner output
- ✅ **Smart Content Validation**: Real-time validation prevents empty/duplicate insights with user-friendly toast notifications
- ✅ **Structured AI Instructions**: Comprehensive 5-section synthesis format and 7-section executive summary with strategic focus
- ✅ **Auto-Generation Intelligence**: Smart triggers for insights every 5 entries and follow-up questions every 8 entries with throttling
- ✅ **Advanced Deduplication**: Context-aware functions prevent repeated content and enhance AI analysis quality
- ✅ **Final Session Summary**: Executive summary renamed and restricted to last phase only with comprehensive structured output
- ✅ **Consistency Improvements**: Unified question counting and phase detection across all components

#### Previous Enhancements
- ✅ Enhanced error handling with user-friendly toast notifications
- ✅ Fixed API rate limiting bugs
- ✅ Executive-focused AI prompts and templates
- ✅ Comprehensive error recovery mechanisms
- ✅ Professional PDF reports with strategic insights

## 🎨 UI Design System (August 2025)

### Modern Executive Interface
The application features a comprehensive **modern design system** optimized for executive use:

**🎯 Key Design Principles:**
- **Clean & Professional**: White backgrounds, subtle shadows, consistent spacing
- **Executive Polish**: Gradient effects, refined typography, professional color scheme  
- **Optimal Readability**: High contrast, proper hierarchy, generous white space
- **Interactive Feedback**: Smooth hover states, loading indicators, clear action states

**🖼️ Visual Components:**

#### Right Panel Design (`w-[32rem]` / 512px)
- **Width**: Optimized for executive tab readability and content display
- **Background**: Clean white with subtle border and shadow
- **Tab Navigation**: Color-coded tabs with rounded corners, shadows, and smooth transitions
- **Content Cards**: Consistent white background with subtle borders and hover effects

#### Tab System
```css
Strategic Insights    → Blue theme (blue-500 active, blue-100 border)
Follow-up Questions   → Purple theme (purple-500 active, purple-100 border) 
Synthesize Discussion → Green theme (green-500 active, green-100 border)
Executive Summary     → Indigo theme (indigo-500 active, indigo-100 border)
```

#### Generate Buttons
- **Style**: Modern gradient backgrounds (`bg-gradient-to-r`)
- **States**: Clear hover, active, loading, and disabled states
- **Feedback**: Shadow effects and smooth transitions

#### Content Cards  
- **Background**: Clean white (`bg-white`)
- **Borders**: Subtle colored borders (`border-blue-100`, etc.)
- **Effects**: Drop shadows (`shadow-sm`) with hover enhancement (`hover:shadow-md`)
- **Typography**: Professional text hierarchy with proper contrast

#### Header & Navigation
- **Header**: White background with border and shadow
- **Phase Navigation**: Clean containers with professional styling
- **Main Content**: Balanced layout with `max-w-3xl` and `bg-gray-50`

**📱 Layout Architecture:**
```
┌─────────────────────────────────────────────┐
│ Header (White, Shadow, Professional)        │
├─────────────────────────────────────────────┤
│ Main Content (3xl width) │ Right Panel (32rem) │
│ - Phase Navigation      │ - Tabbed Interface   │
│ - Discussion Content    │ - AI Analysis        │  
│ - Transcript Timeline   │ - Action Items       │
└─────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- OpenAI API key ([Get one here](https://platform.openai.com))
- Modern web browser (Chrome/Edge recommended for speech recognition)

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

## 🏗️ Application Architecture

### Overview
The application follows a modular architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
├─────────────────────────────────────────────────────────┤
│  RoundtableCanvasV2 (Main Component)                    │
│  ├── Session Management (State & Context)               │
│  ├── Speech Recognition (Hook)                          │
│  ├── UI Panels (Discussion & AI)                        │
│  └── Export System (PDF/CSV)                           │
├─────────────────────────────────────────────────────────┤
│                  API Routes (Backend)                    │
│  ├── /api/analyze - AI Analysis                        │
│  ├── /api/generate-summary - Summary Generation        │
│  └── /api/transcribe - Whisper Fallback               │
├─────────────────────────────────────────────────────────┤
│              External Services                           │
│  └── OpenAI GPT-4o API                                 │
└─────────────────────────────────────────────────────────┘
```

## 🎨 UX/UI Flow

### Session Lifecycle

```
1. INTRO STATE
   ├── Welcome screen with session configuration
   ├── Enter facilitator name and topic
   └── Click "Start Session" → DISCUSSION STATE

2. DISCUSSION STATE
   ├── Split-pane interface
   │   ├── Left: Discussion Panel
   │   │   ├── Current question display
   │   │   ├── Facilitator guide (collapsible)
   │   │   ├── Live transcript
   │   │   └── Recording controls
   │   └── Right: AI Co-Facilitator Panel
   │       ├── AI analysis buttons (2x2 grid)
   │       ├── Insights display
   │       └── Session utilities
   ├── Navigate through questions (Previous/Next)
   └── Click "End Session" → SUMMARY STATE

3. SUMMARY STATE
   ├── Display session summary
   ├── Executive findings
   └── Export options (PDF/CSV)
```

### User Interaction Flow

```
User Action → Component Handler → State Update → UI Update
     ↓                                  ↓
API Call (if needed)           localStorage (auto-save)
     ↓
Response → State Update → UI Update
```

## 📁 File Structure Guide

### Root Structure
```
ai-roundtable/
├── src/                    # Source code
├── public/                 # Static assets
├── .env.local             # Environment variables (create this)
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── next.config.js         # Next.js config
└── README.md              # This file
```

### Detailed `/src` Structure

#### `/src/app` - Next.js App Directory
```
src/app/
├── api/                   # Backend API routes
│   ├── analyze/
│   │   └── route.ts      # AI analysis endpoint
│   │                     # Handles real-time insights generation
│   │                     # Input: transcript + context
│   │                     # Output: strategic insights
│   │
│   ├── generate-summary/
│   │   └── route.ts      # Summary generation endpoint
│   │                     # Creates comprehensive session summaries
│   │                     # Generates executive summaries
│   │                     # Handles PDF export data
│   │
│   └── transcribe/
│       └── route.ts      # Whisper speech-to-text fallback
│                         # Used when Web Speech API fails
│                         # Processes audio chunks
│
├── globals.css           # Global styles, Tailwind imports
├── layout.tsx            # Root layout with metadata
└── page.tsx              # Home page that renders the app
```

#### `/src/components` - React Components
```
src/components/
├── RoundtableCanvasV2.tsx    # Main application component (1500+ lines)
│                             # - Session state management
│                             # - UI rendering logic
│                             # - Speech integration
│                             # - AI analysis triggers
│                             # - Export functionality
│
├── SessionSummary.tsx        # Summary display component
│                             # - Renders session results
│                             # - Handles PDF generation
│                             # - Formats executive summary
│
└── ToastProvider.tsx         # Global toast notifications
                              # - Error messages
                              # - Success confirmations
                              # - Rate limit warnings
```

#### `/src/config` - Configuration
```
src/config/
└── roundtable-config.ts      # ⭐ MAIN CONFIGURATION FILE
                              # - Session questions
                              # - AI prompts
                              # - UI text/labels
                              # - Feature flags
                              # - System settings
```

#### `/src/hooks` - Custom React Hooks
```
src/hooks/
└── useSpeechTranscription.ts # Speech recognition hook
                              # - Web Speech API integration
                              # - Whisper fallback logic
                              # - Error handling
                              # - Browser compatibility
```

#### `/src/utils` - Utility Functions
```
src/utils/
├── storage.ts                # localStorage management
│                             # - Session save/load
│                             # - Auto-recovery
│                             # - Data persistence
│
├── pdfExport.ts             # PDF generation utilities
│                             # - Document formatting
│                             # - Executive summary layout
│                             # - Export triggers
│
└── logger.ts                 # Enhanced logging system
                              # - Structured logs
                              # - Error tracking
                              # - Performance metrics
```

## ⚙️ Configuration

### Main Configuration File
`src/config/roundtable-config.ts` controls everything:

```typescript
// Session Configuration
export const sessionConfig = {
  title: 'Your Session Title',
  maxParticipants: 20,
  enableTestMode: true,      // Mock AI responses
  rateLimitPerHour: 100,     // API call limits
  autoExportResults: true
};

// Question Configuration
export const roundtableQuestions = [
  {
    id: 'q1',
    title: 'Question Title',
    description: 'Detailed description',
    aiPromptContext: 'Context for AI',
    followUpPrompts: ['Follow-up 1', 'Follow-up 2']
  }
];

// AI Behavior
export const aiConfig = {
  systemPrompt: 'AI personality and instructions',
  temperature: 0.7,          // Creativity level
  maxTokens: 500            // Response length
};
```

## 🧩 Component Documentation

### RoundtableCanvasV2.tsx - Main Component

**Purpose**: Orchestrates the entire application

**Key State Variables**:
```typescript
- sessionState: 'intro' | 'discussion' | 'summary'
- sessionContext: Complete session data
- isRecording: Speech recognition status
- showManualModal: Manual entry modal visibility
- activeAnalyticsTab: Selected AI output type
```

**Key Functions**:
```typescript
- startSession(): Initialize discussion
- addTranscriptEntry(): Add to transcript
- callAIAnalysis(): Trigger AI analysis
- generateSessionSummary(): Create summary
- exportToPDF(): Generate PDF export
```

**Render Sections**:
- `renderIntroState()`: Welcome screen
- `renderDiscussionState()`: Main interface
- `renderSummaryState()`: Summary display

### SessionSummary.tsx - Summary Component

**Purpose**: Display and export session results

**Props**:
```typescript
interface SessionSummaryProps {
  sessionData: SessionData;
  onClose: () => void;
  onExport: (format: 'pdf' | 'csv') => void;
}
```

**Features**:
- Executive summary display
- Question-by-question breakdown
- Export triggers
- Professional formatting

## 🔌 API Endpoints

### POST `/api/analyze`
**Purpose**: Generate AI insights from discussion

**Request**:
```json
{
  "type": "insight" | "synthesis" | "followup",
  "transcript": "Current discussion text",
  "context": {
    "currentQuestion": "Question being discussed",
    "sessionTopic": "Overall topic",
    "participantCount": 5
  }
}
```

**Response**:
```json
{
  "insights": ["Insight 1", "Insight 2"],
  "suggestions": ["Follow-up question 1"],
  "confidence": 0.85
}
```

### POST `/api/generate-summary`
**Purpose**: Create comprehensive session summary

**Request**:
```json
{
  "sessionData": {
    "responses": [...],
    "insights": [...],
    "topic": "Session topic",
    "duration": "45 minutes"
  }
}
```

**Response**:
```json
{
  "executiveSummary": {...},
  "questionSummaries": [...],
  "recommendations": [...],
  "nextSteps": [...]
}
```

## 📊 Data Flow

### Transcript Entry Flow
```
1. User speaks / types
   ↓
2. Speech recognition / Manual entry
   ↓
3. addTranscriptEntry() called
   ↓
4. Update sessionContext.liveTranscript
   ↓
5. Trigger auto-save to localStorage
   ↓
6. Update UI display
```

### AI Analysis Flow

#### Manual Analysis Trigger
```
1. User clicks AI button (Insights/Follow-up/Synthesis/Final Summary)
   ↓
2. callAIAnalysis(type) called with enhanced context
   ↓
3. Content validation (length, duplicates) with toast notifications
   ↓
4. Prepare structured context + transcript + phase-specific instructions
   ↓
5. POST to /api/analyze with comprehensive context
   ↓
6. OpenAI GPT-4o processing with structured prompts
   ↓
7. Format and return structured insights
   ↓
8. Update sessionContext.aiInsights (overwrite for synthesis, append for others)
   ↓
9. Display in AI panel with appropriate filtering/display logic
```

#### Auto-Generation Intelligence
```
Insights: Auto-triggered every 5 transcript entries (2-minute throttling)
Follow-up Questions: Auto-triggered every 8 transcript entries (2-minute throttling)
Synthesis: Manual only (overwrites previous synthesis)
Final Summary: Manual only, restricted to last phase
```

#### Structured AI Instructions
- **Synthesis (5 sections)**: Key Themes → Opportunities → Challenges → Consensus → Diverse Perspectives
- **Final Summary (7 sections)**: Session Overview → Discussion Points → Opportunities → Challenges → Agreement → Perspectives → Next Steps
- **Content Validation**: Prevents empty content (<10 chars) and duplicate insights
- **Deduplication**: Context-aware functions track previous questions and insights

## 🚀 Deployment

### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Add OPENAI_API_KEY in project settings
```

### Environment Variables
Required in production:
- `OPENAI_API_KEY`: Your OpenAI API key

Optional:
- `NEXT_PUBLIC_SPEECH_ENGINE`: 'auto' | 'webspeech' | 'whisper'
- `NEXT_PUBLIC_APP_ENV`: 'development' | 'production'

## 🛡️ Troubleshooting

### Common Issues

**Speech Recognition Not Working**
- Check HTTPS (required for Web Speech API)
- Verify microphone permissions
- Try Chrome/Edge browsers
- Fall back to manual entry

**AI Analysis Errors**
- Verify OpenAI API key
- Check rate limits (100/hour default)
- Review browser console
- Enable test mode for debugging

**Session Recovery Failed**
- Check localStorage enabled
- Clear cache: `localStorage.clear()`
- Verify data integrity
- Check browser storage limits

---

Built for strategic facilitators by strategic facilitators 🚀

**Live Demo**: [https://co-facilitatoragent.vercel.app/](https://co-facilitatoragent.vercel.app/)