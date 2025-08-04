/**
 * Main Page - AI Roundtable Application
 * 
 * This is the entry point for the AI Roundtable Canvas application.
 * It renders the main RoundtableCanvas component and provides the
 * primary user interface for the facilitated discussion.
 * 
 * The page is server-side rendered initially, then becomes interactive
 * through the client-side RoundtableCanvas component.
 */

import RoundtableCanvasV2 from '@/components/RoundtableCanvasV2';
import { sessionConfig, uiText } from '@/config/roundtable-config';

// CRITICAL: Force dynamic rendering to fix Vercel deployment pipeline
// These exports prevent Next.js 14 from caching this route as static
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* 
        The RoundtableCanvas component handles all the interactive functionality:
        - Question progression and timing
        - Participant response collection
        - AI analysis integration
        - Session data management
        - Export capabilities
      */}
      <RoundtableCanvasV2 />
    </main>
  );
}

// Metadata for SEO and social sharing
export const metadata = {
  title: sessionConfig.title,
  description: sessionConfig.description,
  keywords: 'AI, roundtable, discussion, facilitation, reflexive systems, strategic planning',
  authors: [{ name: 'AI4 Roundtable Team' }],
  robots: 'noindex, nofollow', // Prevent search engine indexing for live sessions
};
// Force rebuild Sun Aug  3 20:01:16 EDT 2025
