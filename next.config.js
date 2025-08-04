/** @type {import('next').NextConfig} */
const nextConfig = {
  // CRITICAL: Fix deterministic bundle hash generation for Vercel deployment
  generateBuildId: async () => {
    return process.env.VERCEL_GIT_COMMIT_SHA || `local-${Date.now()}`;
  },
  
  // Webpack configuration for consistent builds
  webpack: (config, { dev }) => {
    // Force deterministic module and chunk IDs
    config.optimization.moduleIds = 'deterministic';
    config.optimization.chunkIds = 'deterministic';
    
    // Clear filesystem cache for fresh builds in production
    if (config.cache && !dev) {
      config.cache = Object.freeze({
        type: 'memory',
      });
    }
    
    return config;
  },
  
  // Custom headers to control caching behavior
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
  
  // Enable experimental features for better performance
  experimental: {
    // Optimize for production deployment
    optimizeCss: true,
    // Prevent hash inconsistency
    webpackBuildWorker: false,
  },
  
  // Environment configuration
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
}

module.exports = nextConfig
