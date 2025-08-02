# AI Roundtable Canvas

An AI-facilitated strategic roundtable discussion platform that enables real-time AI analysis and insights during group discussions.

## 🎯 Project Overview

This application creates an interactive canvas for conducting strategic roundtables with AI-powered facilitation. The AI analyzes participant responses in real-time, identifies patterns, and provides probing questions to deepen the conversation.

### Key Features

- **🤖 Real-time AI Analysis**: OpenAI GPT-4 powered insights and pattern recognition
- **⚙️ Easy Configuration**: Modify questions, AI prompts, and session settings via config files
- **🧪 Test Mode**: Rehearsal mode with mock AI responses
- **📊 Session Export**: Download results as JSON for further analysis
- **⏱️ Timed Questions**: Optional time limits for focused discussions
- **🔒 Security**: Rate limiting, environment variables, no client-side API keys
- **📱 Responsive**: Works on desktop, tablet, and mobile devices

## 📁 Project Structure

```
ai-roundtable/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── analyze/
│   │   │       └── route.ts          # AI analysis API endpoint
│   │   ├── globals.css               # Global styles and animations
│   │   ├── layout.tsx                # Root layout with metadata
│   │   └── page.tsx                  # Main page component
│   ├── components/
│   │   └── RoundtableCanvas.tsx      # Main interactive component
│   └── config/
│       └── roundtable-config.ts      # ⭐ MAIN CONFIGURATION FILE
├── .env.local                        # Environment variables (API keys)
├── package.json                      # Dependencies and scripts
├── tailwind.config.ts                # Tailwind CSS configuration
├── tsconfig.json                     # TypeScript configuration
└── README.md                         # This file
```

### File Purposes

| File | Purpose | Easy to Edit? |
|------|---------|---------------|
| `src/config/roundtable-config.ts` | **Main config** - questions, AI prompts, settings | ✅ **YES** |
| `src/components/RoundtableCanvas.tsx` | Frontend UI and logic | ⚠️ Code changes needed |
| `src/app/api/analyze/route.ts` | Backend AI processing | ⚠️ Code changes needed |
| `.env.local` | API keys and secrets | ✅ **YES** |
| `src/app/globals.css` | Styling and animations | 🎨 Design changes |

## 🧠 Logic Flow Diagrams

### Overall Application Flow

```
User Opens App
       ↓
Load Configuration (questions, AI settings)
       ↓
Display Question 1
       ↓
User Submits Response
       ↓
Store Response → Call AI Analysis API
       ↓                    ↓
Display Response    AI Processes & Returns Insights
       ↓                    ↓
Update UI ←─────────────────┘
       ↓
[Repeat for all responses]
       ↓
Next Question or End Session
       ↓
Export Results (Optional)
```

### AI Analysis Flow

```
Response Submitted
       ↓
Rate Limit Check
       ↓
Test Mode? ──YES──→ Return Mock Insights
       ↓
      NO
       ↓
OpenAI API Call
├── System Prompt (facilitator behavior)
├── User Prompt (question context + responses)
└── Config (temperature, max tokens)
       ↓
AI Response Processing
       ↓
Error Handling & Fallbacks
       ↓
Return Insights to Frontend
       ↓
Update UI with Insights
```

### Configuration System Flow

```
App Startup
       ↓
Load roundtable-config.ts
├── Session Config (title, description, limits)
├── Questions Array (id, title, description, AI context)
├── AI Config (prompts, temperature, tokens)
└── UI Text (labels, messages)
       ↓
Initialize App State
       ↓
Render UI with Config Data
       ↓
[User modifies config file]
       ↓
Restart App → New Config Loaded
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

### Installation

```bash
# 1. Navigate to project directory
cd ai-roundtable

# 2. Dependencies are already installed, but if needed:
npm install

# 3. Configure your API key
# Edit .env.local and add your OpenAI API key
# OPENAI_API_KEY=sk-your-key-here

# 4. Start development server
npm run dev

# 5. Open http://localhost:3000
```

### First Test Run

1. **Set Test Mode**: Ensure `enableTestMode: true` in config
2. **Open Browser**: Go to `http://localhost:3000`
3. **Try the Flow**: Submit responses, see mock AI insights
4. **Export Results**: Test the download functionality

## 🧪 Testing & Development

### Test Mode Features

- **Mock AI Responses**: No API calls or costs
- **Fast Iteration**: Test question flow quickly
- **UI Testing**: Verify all components work
- **Export Testing**: Validate data structure

### Switching to Live Mode

1. Edit `src/config/roundtable-config.ts`
2. Change `enableTestMode: false`
3. Add your OpenAI API key to `.env.local`
4. Restart the application

### Development Workflow

```bash
# Development server (hot reload)
npm run dev

# Build for production
npm run build

# Start production server locally
npm start

# Lint code
npm run lint
```

## 🌐 Deployment to Vercel

### One-Time Setup

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login
```

### Deploy

```bash
# Deploy from project directory
vercel

# Follow prompts:
# - Link to existing project or create new
# - Set production domain
```

### Configure Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Find your project → Settings → Environment Variables
3. Add: `OPENAI_API_KEY` = `your-actual-api-key`
4. Redeploy: `vercel --prod`

### Production Checklist

- [ ] Set `enableTestMode: false` in config
- [ ] Add OpenAI API key to Vercel environment variables
- [ ] Test live deployment with small group first
- [ ] Monitor API usage and costs
- [ ] Verify rate limiting works correctly

## 💡 Usage During Live Sessions

### Pre-Session (5 minutes)

1. **Configure Questions**: Edit config file for your specific topic
2. **Test Setup**: Run in test mode to verify flow
3. **Share URL**: Send deployment URL to participants
4. **Monitor Setup**: Check API key, rate limits, test mode OFF

### During Session

1. **Introduction**: Explain the process to participants
2. **Question Flow**: Progress through questions at your pace
3. **AI Insights**: Use "Get Insights" button for analysis
4. **Facilitate**: Build on AI insights with human facilitation
5. **Export**: Download results at end of session

### Post-Session

1. **Export Results**: JSON file with all responses and insights
2. **Follow-up**: Use insights for action planning
3. **Cost Review**: Check OpenAI API usage costs
4. **Session Notes**: Document what worked well for next time

## 📊 Cost Management

### Expected Costs

- **Small Group (5-10 people)**: ~$2-5 per session
- **Medium Group (10-20 people)**: ~$5-10 per session
- **Large Group (20+ people)**: ~$10-20 per session

### Cost Controls Built-in

- **Rate Limiting**: Max 100 API calls per hour by default
- **Token Limits**: Responses capped at 400 tokens
- **Test Mode**: No costs during testing/rehearsal
- **Error Fallbacks**: Graceful degradation if API fails

### Monitoring Usage

1. **OpenAI Dashboard**: Check usage at [platform.openai.com](https://platform.openai.com)
2. **Application Logs**: Monitor API calls in browser console
3. **Rate Limiting**: Built-in protection against excessive usage

## 🔧 Advanced Configuration

### Custom AI Models

Edit API route to use different models:

```typescript
// In src/app/api/analyze/route.ts
const completion = await openai.chat.completions.create({
  model: "gpt-3.5-turbo", // Cheaper option
  // or "gpt-4-turbo-preview", // Higher quality
  // ... other settings
});
```

### Additional Question Types

Add new question types in config:

```typescript
{
  id: "brainstorm",
  title: "Rapid Ideation",
  description: "Generate as many ideas as possible in 5 minutes",
  timeLimit: 5,
  aiPromptContext: "This is a brainstorming session focused on quantity over quality",
  followUpPrompts: [
    "Which ideas seem most promising?",
    "What patterns do you see across the ideas?"
  ]
}
```

### Custom Styling

Modify colors and styling in:
- `tailwind.config.ts` - Color scheme and design tokens
- `src/app/globals.css` - Custom animations and components

## 🆘 Troubleshooting

### Common Issues

**"AI analysis failed"**
- Check API key in `.env.local`
- Verify internet connection
- Check OpenAI account has credits
- Try refreshing the page

**"Rate limit exceeded"**
- Wait 1 hour for reset
- Reduce `rateLimitPerHour` in config
- Use test mode for rehearsals

**Page won't load**
- Check if development server is running (`npm run dev`)
- Try different port: `npm run dev -- -p 3001`
- Clear browser cache

**Deployment issues**
- Verify environment variables in Vercel dashboard
- Check build logs for errors
- Ensure all dependencies are in `package.json`

### Getting Help

If you encounter issues:

1. **Check Browser Console**: Look for error messages (F12 → Console)
2. **Check Server Logs**: Look at terminal output where `npm run dev` is running
3. **Review Configuration**: Double-check `roundtable-config.ts` syntax
4. **Test Mode First**: Always test in test mode before going live

## 🔄 ChatGPT Unstuck Prompt

If you need additional help, copy this prompt to ChatGPT:

```
I'm working on an AI Roundtable Canvas built with Next.js, TypeScript, and OpenAI API. Here's the current setup:

PROJECT STRUCTURE:
- Next.js 15 with TypeScript and Tailwind CSS
- Configuration system in src/config/roundtable-config.ts for easy question/prompt editing
- AI backend API at src/app/api/analyze/route.ts using OpenAI GPT-4
- Frontend component at src/components/RoundtableCanvas.tsx
- Rate limiting, test mode, error handling built-in

CURRENT ISSUE:
[Describe your specific problem here]

CONFIGURATION:
- Questions: [Copy relevant parts of roundtable-config.ts]
- AI Settings: [Copy aiConfig section]
- Error Messages: [Copy any error messages you're seeing]

GOAL:
[Describe what you're trying to achieve]

Please provide specific code changes and step-by-step instructions to resolve this issue.
```

---

## 📝 Development Notes

**Last Updated**: January 2024  
**Version**: 1.0.0  
**Dependencies**: Next.js 15, OpenAI 4.67.3, TypeScript 5, Tailwind CSS 3  
**Browser Support**: Chrome, Firefox, Safari, Edge (latest 2 versions)  

**Configuration System**: ✅ Complete - Easy question and AI prompt editing  
**Test Mode**: ✅ Complete - Mock responses for rehearsal  
**Rate Limiting**: ✅ Complete - Cost protection built-in  
**Export Functionality**: ✅ Complete - JSON download of session results  
**Error Handling**: ✅ Complete - Graceful fallbacks for API failures  
**Deployment Ready**: ✅ Complete - Vercel deployment configured
