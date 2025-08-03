import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';

export async function GET(request: NextRequest) {
  // Prevent Next.js from prebuilding this route at build time
  noStore();
  
  // Test all possible environment variable names
  const envVars = {
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    NEXT_PUBLIC_OPENAI_API_KEY: !!process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    OPENAI_KEY: !!process.env.OPENAI_KEY,
    NEXT_OPENAI_API_KEY: !!process.env.NEXT_OPENAI_API_KEY,
    AI_API_KEY: !!process.env.AI_API_KEY, // This is what we set via CLI
  };
  
  // Get the resolved API key using the same fallback logic
  const resolvedKey = process.env.OPENAI_API_KEY || 
                     process.env.NEXT_PUBLIC_OPENAI_API_KEY ||
                     process.env.OPENAI_KEY ||
                     process.env.NEXT_OPENAI_API_KEY ||  
                     process.env.AI_API_KEY;
  
  const result = {
    timestamp: new Date().toISOString(),
    environment_variables: envVars,
    resolved_key_exists: !!resolvedKey,
    resolved_key_length: resolvedKey?.length || 0,
    resolved_key_first_chars: resolvedKey ? resolvedKey.substring(0, 7) + '...' : 'none',
    all_env_keys: Object.keys(process.env).filter(key => 
      key.includes('OPENAI') || key.includes('AI_API')
    )
  };
  
  console.log('ENV TEST RESULT:', JSON.stringify(result, null, 2));
  
  return NextResponse.json(result);
}
