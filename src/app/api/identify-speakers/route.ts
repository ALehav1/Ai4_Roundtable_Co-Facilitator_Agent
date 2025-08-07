import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const IdentifySpeakersSchema = z.object({
  transcript: z.array(z.object({
    id: z.string(),
    text: z.string(),
    speaker: z.string(),
    timestamp: z.string()
  }))
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transcript } = IdentifySpeakersSchema.parse(body);
    
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });

    // First pass: Identify introductions and speaker characteristics
    const introductionPrompt = `Analyze this transcript to identify speakers based on their introductions and speaking patterns.

TRANSCRIPT:
${transcript.map((entry, i) => `[${i}] ${entry.speaker}: ${entry.text}`).join('\n')}

TASK 1: Find all self-introductions where people state their name, organization, or role.
TASK 2: Identify speaking patterns that might distinguish different participants.
TASK 3: Note any references to other speakers by name.

Output a JSON object with this structure:
{
  "identifiedSpeakers": [
    {
      "name": "Actual name if mentioned",
      "organization": "Their organization if mentioned", 
      "role": "Their role if mentioned",
      "firstMentionIndex": "index where they introduce themselves",
      "speakingCharacteristics": "Notable patterns in their speech"
    }
  ],
  "speakerReferences": [
    {
      "index": "entry index",
      "referencedName": "Name mentioned",
      "context": "How they were referenced"
    }
  ]
}

IMPORTANT: Only include information explicitly stated in the transcript. Do not invent details.`;

    const identificationResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: introductionPrompt }],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const speakerData = JSON.parse(identificationResponse.choices[0].message.content || '{}');

    // Second pass: Attribute speakers to entries
    const attributionPrompt = `Based on the speaker information identified, suggest speaker attributions for each transcript entry.

IDENTIFIED SPEAKERS:
${JSON.stringify(speakerData.identifiedSpeakers, null, 2)}

TRANSCRIPT ENTRIES TO ATTRIBUTE:
${transcript.map((entry, i) => `[${i}] Current label: "${entry.speaker}" | Text: "${entry.text}"`).join('\n')}

ATTRIBUTION RULES:
1. If someone introduces themselves in an entry, that entry is definitely theirs
2. Look for contextual clues (e.g., "As I mentioned earlier", "In my organization", etc.)
3. Consider speaking patterns identified earlier
4. If uncertain, keep the generic label
5. The facilitator typically asks questions and guides discussion

Output a JSON object with:
{
  "attributions": [
    {
      "index": "entry index",
      "suggestedSpeaker": "Suggested speaker name or keep original label",
      "confidence": 0.0 to 1.0,
      "reasoning": "Brief explanation"
    }
  ]
}`;

    const attributionResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: attributionPrompt }],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const attributions = JSON.parse(attributionResponse.choices[0].message.content || '{"attributions": []}');

    return NextResponse.json({
      success: true,
      identifiedSpeakers: speakerData.identifiedSpeakers,
      attributions: attributions.attributions || attributions,
      message: "Speaker identification complete. Review and confirm attributions."
    });

  } catch (error) {
    console.error('Speaker identification error:', error);
    return NextResponse.json(
      { error: 'Failed to identify speakers', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
