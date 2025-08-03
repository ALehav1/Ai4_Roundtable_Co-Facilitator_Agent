/**
 * Whisper Transcription API Route
 * 
 * Serverless endpoint for audio transcription using OpenAI's Whisper model.
 * Used as fallback when native Web Speech API is not available or fails.
 * 
 * Accepts: FormData with 'file' (webm audio blob)
 * Returns: { text: string } - transcribed text
 */

import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import OpenAI from 'openai';

// Prevent Next.js from prebuilding this route at build time
export const runtime = 'edge';

export async function POST(request: NextRequest) {
  // Prevent caching and prebuilding issues
  noStore();

  try {
    // Validate OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('🚨 OPENAI_API_KEY not configured');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Parse form data
    const formData = await request.formData();
    const audioFile = formData.get('file') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    console.log('🎤 Transcribing audio chunk:', {
      filename: audioFile.name,
      size: audioFile.size,
      type: audioFile.type,
    });

    // Validate file type and size
    if (!audioFile.type.startsWith('audio/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Audio file required.' },
        { status: 400 }
      );
    }

    // Limit file size (10MB max for Whisper API)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (audioFile.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Skip very small files (likely empty or noise)
    if (audioFile.size < 1000) { // Less than 1KB
      console.log('🎤 Skipping very small audio chunk:', audioFile.size);
      return NextResponse.json({ text: '' });
    }

    // Call OpenAI Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en', // Optional: can be auto-detected
      response_format: 'text',
    });

    const transcriptText = transcription.trim();
    
    console.log('✅ Whisper transcription result:', {
      text: transcriptText.substring(0, 100) + (transcriptText.length > 100 ? '...' : ''),
      fullLength: transcriptText.length,
    });

    return NextResponse.json({ 
      text: transcriptText,
      metadata: {
        fileSize: audioFile.size,
        duration: 'unknown', // Could calculate from audio metadata if needed
        model: 'whisper-1',
        timestamp: new Date().toISOString(),
      }
    });

  } catch (error: any) {
    console.error('🚨 Whisper transcription error:', error);
    
    // Handle specific OpenAI API errors
    if (error.status === 401) {
      return NextResponse.json(
        { error: 'Invalid OpenAI API key' },
        { status: 401 }
      );
    }
    
    if (error.status === 429) {
      return NextResponse.json(
        { error: 'OpenAI API rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    if (error.message?.includes('audio file')) {
      return NextResponse.json(
        { error: 'Invalid audio file format or corrupted file' },
        { status: 400 }
      );
    }

    // Generic error response
    return NextResponse.json(
      { 
        error: 'Transcription failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      },
      { status: 500 }
    );
  }
}
