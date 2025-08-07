/**
 * Root Layout - AI Roundtable Application
 * 
 * This layout component wraps the entire application and provides:
 * - Global CSS styles (including Tailwind)
 * - Application metadata and SEO settings
 * - Font loading and optimization
 * - Global error boundaries (implicit through Next.js)
 * 
 * All pages in the application will be wrapped by this layout.
 */

import type { Metadata, Viewport } from 'next';
import './globals.css';
import { sessionConfig } from '@/config/ai-transformation-config';

// Viewport configuration (required separate export in Next.js 13+)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

// Application metadata for SEO and social sharing
export const metadata: Metadata = {
  title: {
    default: sessionConfig.title,
    template: `%s | ${sessionConfig.title}`
  },
  description: sessionConfig.description,
  keywords: ['AI', 'roundtable', 'discussion', 'facilitation', 'strategic planning', 'reflexive systems'],
  authors: [{ name: 'AI4 Roundtable Team' }],
  creator: 'AI4 Roundtable Team',
  
  // Prevent indexing for live sessions (privacy)
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
  
  // Open Graph metadata for social sharing
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: sessionConfig.title,
    description: sessionConfig.description,
    siteName: sessionConfig.title,
  },
  
  // Twitter Card metadata
  twitter: {
    card: 'summary',
    title: sessionConfig.title,
    description: sessionConfig.description,
  },
  

};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Additional meta tags for better performance */}
        <meta name="theme-color" content="#2563eb" />
        <meta name="color-scheme" content="light" />
        
        {/* Preconnect to external domains for faster loading */}
        <link rel="preconnect" href="https://api.openai.com" />
        <link rel="dns-prefetch" href="https://api.openai.com" />
      </head>
      <body className="antialiased bg-roundtable-background text-roundtable-text">
        {/* 
          Main application content
          The children prop contains the page content (page.tsx)
        */}
        {children}
        
        {/* 
          Global JavaScript that might be needed
          (Currently none required, but keeping structure for future additions)
        */}
        <script 
          dangerouslySetInnerHTML={{
            __html: `
              // Global error handler for better debugging
              window.addEventListener('error', function(e) {
                console.error('Global error:', e.error);
              });
              
              // Global unhandled promise rejection handler
              window.addEventListener('unhandledrejection', function(e) {
                console.error('Unhandled promise rejection:', e.reason);
              });
            `
          }}
        />
      </body>
    </html>
  );
}
