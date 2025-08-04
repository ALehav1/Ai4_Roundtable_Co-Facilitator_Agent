# Nuclear Reset: Fresh Vercel Project Setup

## 🚨 Context
The deployment pipeline was completely broken despite comprehensive fixes (commit e174e6c). Bundle hash `page-12c0296ac9ab8d11.js` remained unchanged through all troubleshooting attempts. Nuclear reset (project deletion/recreation) is the definitive solution.

## ✅ Pre-Reset Status
All critical fixes are implemented and ready for deployment:
- Dynamic rendering exports on all routes (page.tsx, API routes)
- Deterministic bundle generation in next.config.js
- Cache clearing build scripts
- Right panel AI content extraction bug fixed
- Speaker labeling changed from "Facilitator" to "Speaker"
- Manual entry textarea text alignment fixed

## 📋 Fresh Project Configuration

### Environment Variables (Production)
```
OPENAI_API_KEY=[your OpenAI API key]
```

### Build Settings
- **Framework**: Next.js (auto-detected)
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)
- **Root Directory**: `ai-roundtable/` (if repository has multiple folders)

### Critical Verification Points
After fresh deployment, verify:

1. **Bundle Hash Changed**: Should NOT be `page-12c0296ac9ab8d11.js`
2. **Speaker Labeling Fixed**: Manual entry dropdown shows "Speaker" not "Facilitator"
3. **AI Insights Display**: Right panel shows AI content, not "undefined"
4. **Text Alignment**: Manual entry textarea is left-aligned
5. **Console Logs**: Should show updated debug messages with fixes

## 🎯 Success Criteria
- New JavaScript bundle hash indicates fresh deployment
- All UI fixes from commit e174e6c are visible in production
- AI analysis endpoints return proper responses (not 400/500 errors)
- Manual entry workflow functions correctly
- Voice recognition shows improved error handling

## 📝 Post-Reset Action Items
1. Update README.md with new production URL
2. Test end-to-end AI analysis workflow
3. Validate speech recognition and manual entry paths
4. Document deployment pipeline restoration for future reference
