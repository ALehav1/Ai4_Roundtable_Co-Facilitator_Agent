# AI Co-Facilitator Panel Design Documentation

## Overview
The AI Co-Facilitator Panel provides context-aware insights, follow-up questions, and synthesis during roundtable discussions. This document explains the current design, behavior, and user experience.

## Panel Structure

### 1. AI Analysis Buttons (Top Section)
Four main analysis buttons in a 2x2 grid layout:

| **Strategic Insights** | **Follow-up Questions** |
|----------------------|------------------------|
| 💡 Generate strategic insights and key themes | ❓ Suggest follow-up questions to deepen discussion |

| **Synthesize Discussion** | **Executive Summary** |
|---------------------------|---------------------|
| 📊 High-level synthesis of current discussion | 📋 High-level summary and action items |

**Button Behavior:**
- Each button triggers a specific type of AI analysis
- Analysis uses rich context: session topic, current phase, transcript, facilitator prompts
- Buttons show loading state during analysis (spinning icon)
- Multiple buttons can be clicked in sequence

### 2. Insights Display Container (Bottom Section)

**Design Pattern:** Single unified container displaying all AI outputs

**Key Characteristics:**
- **No Tab System:** All insights, questions, and synthesis appear in the same scrollable container
- **Latest 3 Items:** Only the most recent 3 AI outputs are visible (`.slice(-3)`)
- **Color-Coded by Type:** Each insight type has distinct visual styling
- **Real-time Updates:** New analysis results appear immediately at the bottom

**Insight Types & Styling:**
```
💡 Strategic Insights    → Purple styling
❓ Follow-up Questions   → Blue styling  
📊 Synthesis            → Green styling
🤖 Other/General        → Default styling
```

**Content Structure per Insight:**
- **Header:** Icon + Type Label + Timestamp (HH:MM AM/PM format)
- **Content:** Full AI-generated text with rich formatting
- **Metadata:** Confidence score and context information (stored but not displayed)

### 3. Empty State
When no insights exist:
- Lightbulb icon with "AI Co-Facilitator Ready" message
- Instructional text: "Start the discussion to receive AI-powered insights, follow-up questions, and synthesis"

## User Experience Flow

### Typical Usage Pattern:
1. **Start Discussion:** Begin recording or manual entry
2. **Generate Insights:** Click "Strategic Insights" for initial analysis
3. **Explore Further:** Use "Follow-up Questions" to deepen discussion
4. **Synthesize:** Click "Synthesize Discussion" for high-level themes
5. **Summarize:** Generate "Executive Summary" for action items

### Content Management:
- **Scrolling:** Container uses `overflow-y: auto` for navigation through longer content
- **History:** Older insights (beyond 3 most recent) are preserved in session data but not displayed
- **No Editing:** Insights are read-only; new analysis generates new items

## Technical Implementation

### Context-Rich Analysis
Each AI request includes:
- **Session Topic:** Current discussion focus
- **Phase Context:** Current question/phase and description  
- **Transcript:** Real-time discussion content
- **Facilitator Prompts:** Context-specific guidance
- **Previous Insights:** Builds on prior analysis
- **Participant Count:** Dynamic speaker tracking

### Smart Triggering
- **Manual Triggers:** User clicks analysis buttons
- **Automatic Triggers:** Planned for phase transitions and discussion milestones
- **Throttling:** Prevents duplicate/rapid-fire requests

### Error Handling
- **Network Issues:** Shows user-friendly error messages
- **Empty Content:** Provides guidance to continue discussion
- **API Failures:** Graceful degradation with actionable feedback

## Design Philosophy

### Why Single Container (No Tabs):
1. **Conversational Flow:** Insights build on each other naturally
2. **Context Preservation:** Users see how analysis evolves over time
3. **Simplicity:** No need to remember which tab contains what content
4. **Real-time Updates:** New insights appear immediately in chronological order

### Benefits:
- **Streamlined UX:** No mental model of separate tabs/modes
- **Contextual Awareness:** Previous insights inform new analysis
- **Natural Progression:** Discussion flows from insights → questions → synthesis → summary

### Potential Future Enhancements:
- **Tabbed Filtering:** Option to filter by insight type
- **Expand/Collapse:** Individual insight management
- **Export/Share:** Export specific insights or full analysis
- **History View:** Access to full session insight timeline

## CSS Classes Reference

```css
.insights-container     /* Main scrollable container */
.insight-card          /* Individual insight wrapper */
.insight-header        /* Icon + label + timestamp row */
.insight-icon          /* Type-specific emoji icon */
.insight-label         /* "Strategic Insights", "Follow-up", etc. */
.insight-time          /* Timestamp styling */
.insight-content       /* Main AI-generated content */
```

Color classes: `.purple`, `.blue`, `.green` for type-specific styling.

## Integration Points

### With Session Context:
- **Phase Awareness:** Analysis adapts to current discussion phase
- **Speaker Detection:** Incorporates smart facilitator vs participant detection
- **Template Integration:** Uses session template context for relevant prompts

### With Recording System:
- **Live Updates:** Analysis triggers during active recording
- **Manual Entry:** Works with both speech-to-text and manual transcript input
- **Quality Thresholds:** Minimum transcript length before analysis

---

**Last Updated:** January 2025  
**Status:** Production Ready  
**Version:** v2.0 (Context-Rich AI Analysis)
