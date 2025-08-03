# 🛠️ AI Roundtable Facilitator - Troubleshooting Guide

**Last Updated:** 2025-08-03  
**Version:** V2 - Modular Speech Architecture

## 📋 Table of Contents

1. [🚀 Git Workflow & Deployment Issues](#git-workflow--deployment-issues)
2. [🎤 Speech Recognition Issues](#speech-recognition-issues)
3. [🔧 Browser Compatibility](#browser-compatibility)
4. [🌐 HTTPS Requirements](#https-requirements)
5. [🐛 Common Error Patterns](#common-error-patterns)
6. [💡 Quick Diagnostic Commands](#quick-diagnostic-commands)
7. [📞 External Help Prompt](#external-help-prompt)

---

## 🚀 Git Workflow & Deployment Issues

### ❌ CRITICAL LESSON: Do NOT assume git workflow problems!

**The git workflow has been working perfectly throughout the entire project.**

### 🔍 Before Assuming Git Issues, Always Check:

```bash
# 1. Verify actual git status
git status

# 2. Check recent commits
git log --oneline -5

# 3. Verify remote connection
git remote -v

# 4. Check Vercel deployment status
vercel ls

# 5. Test production URL
curl -I https://your-app.vercel.app
```

### ✅ Expected Healthy Outputs:

**Git Status:**
```
On branch main
Your branch is up to date with 'origin/main'.
nothing to commit, working tree clean
```

**Vercel Deployments:**
```
Age     Deployment                     Status    Environment
5m      https://app-xyz.vercel.app     ● Ready   Production
```

### 🚨 Common False Assumptions:

- **"Git push failed"** → Actually succeeded, check `git log`
- **"Vercel not deploying"** → Actually deployed, check `vercel ls`
- **"Need to redeploy"** → Current deployment is working, test the URL first

### 🛡️ Prevention Protocol:

1. **Always verify with commands** before assuming issues
2. **Test production URL** before redeployment
3. **Check deployment logs** via Vercel dashboard
4. **Only deploy if confirmed broken**

---

## 🎤 Speech Recognition Issues

### 🔴 Critical Issue: Infinite Restart Loop

**Symptoms:**
- Console spam: `🔄 Auto-restarting speech recognition...`
- Orange microphone icon flashing in macOS menu bar
- Repeated network error messages
- System-level microphone access requests

**Root Cause:**
- Native Web Speech API `onend` event always restarts if `restartTimer` exists
- `onerror` event doesn't stop the timer on network failures
- Creates infinite loop even on HTTPS production environments

**Solution (Implemented in Local Fix):**
```typescript
// In src/hooks/useSpeechTranscription.ts
let networkErrorCount = 0;
const MAX_NETWORK_ERRORS = 3;

// Modified error handler
if (event.error === 'network') {
  networkErrorCount++;
  if (networkErrorCount >= MAX_NETWORK_ERRORS) {
    // Stop restart timer to prevent infinite loop
    if (restartTimer) {
      clearInterval(restartTimer);
      restartTimer = null;
    }
    // Provide fallback message
    errorCallback('Speech recognition unavailable. Use manual entry or Whisper fallback.');
    return;
  }
}
```

### 🌐 HTTPS Requirements

**Web Speech API Requirements:**
- ✅ **HTTPS only** - Will not work on `http://localhost`
- ✅ **Secure context** required for `webkitSpeechRecognition`
- ✅ **User permission** for microphone access

**Testing Environments:**

| Environment | Speech Recognition | Expected Behavior |
|-------------|-------------------|-------------------|
| `http://localhost:3000` | ❌ Disabled | Graceful fallback to manual entry |
| `https://ngrok-url.io` | ✅ Enabled | Full speech functionality |
| `https://app.vercel.app` | ✅ Enabled | Full speech functionality |

### 🎯 Speech Engine Architecture

**3-Layer Fallback System:**

```text
Layer A: Native Web Speech API (HTTPS only)
   ↓ (on network errors)
Layer B: Whisper Chunked Fallback (Always available)
   ↓ (premium upgrade)  
Layer C: Deepgram Streaming (Optional)
```

**Engine Selection Logic:**
- `NEXT_PUBLIC_SPEECH_ENGINE=auto` → Smart fallback
- `NEXT_PUBLIC_SPEECH_ENGINE=whisper` → Force Whisper only
- `NEXT_PUBLIC_SPEECH_ENGINE=deepgram` → Force Deepgram only

### 🔧 Local HTTPS Testing

**Option 1: ngrok (Recommended)**
```bash
# Install ngrok
npm install -g ngrok

# Start development server
npm run dev

# In separate terminal, create HTTPS tunnel
ngrok http 3000

# Use the https://xxx.ngrok.io URL for testing
```

**Option 2: Production Testing**
```bash
# Deploy to Vercel for HTTPS testing
vercel deploy

# Test speech recognition on live HTTPS URL
```

---

## 🔧 Browser Compatibility

### ✅ Supported Browsers:

| Browser | Native Speech | Whisper Fallback | Notes |
|---------|---------------|-------------------|-------|
| Chrome | ✅ | ✅ | Best support |
| Edge | ✅ | ✅ | Full compatibility |
| Safari | ⚠️ | ✅ | Limited speech API |
| Firefox | ❌ | ✅ | No native speech support |

### 🎤 Speech Recognition Support Matrix:

```javascript
// Detection logic in useSpeechTranscription.ts
const canNative = typeof window !== 'undefined' && 
                  window.isSecureContext && 
                  'webkitSpeechRecognition' in window;
```

### 📱 Mobile Support:

- **iOS Safari**: Limited speech recognition support
- **Android Chrome**: Full speech recognition support
- **Mobile fallback**: Whisper chunked transcription always available

---

## 🐛 Common Error Patterns

### 1. Speech Recognition Network Errors

**Error Message:**
```
🎤 Native Speech Recognition Error: network
🎤 Speech Recognition Error: Network error. Speech recognition requires HTTPS connection.
```

**Diagnosis:**
- Even on HTTPS, Web Speech API can fail due to browser/service limitations
- Not a code bug - browser security/service limitation

**Solution:**
- Use Whisper fallback: Set `NEXT_PUBLIC_SPEECH_ENGINE=whisper`
- Manual entry always available as backup

### 2. Microphone Permission Issues

**Error Message:**
```
🎤 Native Speech Recognition Error: not-allowed
```

**Solution:**
```javascript
// Check browser permissions
navigator.permissions.query({name: 'microphone'}).then(result => {
  console.log('Microphone permission:', result.state);
});
```

### 3. API Rate Limiting

**Error Pattern:**
```
HTTP 429: Too Many Requests
Rate limit exceeded for /api/analyze
```

**Solution:**
- Check API route rate limiting configuration
- Verify OpenAI API key limits
- Implement request throttling

### 4. Environment Variable Issues

**Missing Variables:**
```bash
# Required variables in .env.local
OPENAI_API_KEY=sk-your-key-here
NEXT_PUBLIC_SPEECH_ENGINE=auto
```

**Verification:**
```javascript
// Check in browser console
console.log('Speech Engine:', process.env.NEXT_PUBLIC_SPEECH_ENGINE);
```

---

## 💡 Quick Diagnostic Commands

### Git & Deployment Health Check:
```bash
# Complete deployment diagnostic
echo "=== Git Status ===" && git status
echo "=== Recent Commits ===" && git log --oneline -3  
echo "=== Remote Status ===" && git remote -v
echo "=== Vercel Deployments ===" && vercel ls --limit 3
echo "=== Build Test ===" && npm run build
```

### Speech Recognition Debug:
```javascript
// Run in browser console on production site
console.log('Speech Debug:', {
  isSecureContext: window.isSecureContext,
  hasWebkitSpeech: 'webkitSpeechRecognition' in window,
  userAgent: navigator.userAgent,
  speechEngine: process.env.NEXT_PUBLIC_SPEECH_ENGINE
});
```

### API Connectivity Test:
```bash
# Test API endpoints
curl -X POST https://your-app.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"questionContext":"test","currentTranscript":"test","analysisType":"insights"}'
```

---

## 📞 External Help Prompt

**When stuck, use this prompt with ChatGPT or external AI:**

```
I'm working on an AI Roundtable Facilitator built with Next.js 15, TypeScript, and OpenAI GPT-4o. 

CURRENT ISSUE: [Describe specific problem]

PROJECT CONTEXT:
- Modular speech transcription system with 3-layer fallback
- Native Web Speech API → Whisper serverless → Deepgram streaming  
- Production deployment on Vercel with HTTPS
- Real-time AI co-facilitation and transcript analysis

ARCHITECTURE:
- Frontend: Next.js 15 + React 18 + TypeScript + Tailwind CSS
- Backend: /api routes with OpenAI integration  
- Speech: useSpeechTranscription hook + /api/transcribe route
- Deployment: Vercel with auto-deployment from GitHub

KNOWN WORKING FEATURES:
- ✅ Manual transcript entry and AI analysis
- ✅ Session management and summary generation
- ✅ Professional UI with co-facilitator workflow
- ✅ Git workflow and Vercel deployment process

KNOWN ISSUES:
- ❌ Infinite restart loop in native Web Speech API (fix available locally)
- ⚠️ Web Speech API network errors on production HTTPS (browser limitation)

ATTEMPTED FIXES:
- [List specific fixes tried]
- [Include relevant error messages]
- [Note current git/deployment status]

FILES INVOLVED:
- src/hooks/useSpeechTranscription.ts (modular speech system)
- src/components/RoundtableCanvasV2.tsx (main interface) 
- src/app/api/transcribe/route.ts (Whisper fallback)
- src/app/api/analyze/route.ts (AI co-facilitation)

DIAGNOSTIC COMMANDS RUN:
git status: [output]
vercel ls: [output]  
npm run build: [success/failure]

Please provide specific, actionable guidance for resolving [ISSUE] while maintaining the existing working functionality.
```

---

## 🎯 Emergency Recovery Checklist

**If completely stuck:**

1. **☑️ Verify deployment works:** Test production URL manually
2. **☑️ Check git status:** Ensure no uncommitted critical changes  
3. **☑️ Test core features:** Manual entry + AI analysis workflow
4. **☑️ Isolate the issue:** Speech vs AI vs deployment vs git
5. **☑️ Use fallbacks:** Manual entry if speech broken, HTTP if HTTPS broken
6. **☑️ Get external help:** Use the comprehensive prompt above

**Recovery Commands:**
```bash
# Reset to last known good state
git stash
git checkout main
git pull origin main
vercel ls  # Check if deployment is actually working

# Test production without assumptions
open "https://your-app.vercel.app"
```

---

**Remember: Always verify actual status before assuming problems!**
