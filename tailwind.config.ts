import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Custom colors for the roundtable theme
      colors: {
        'roundtable': {
          primary: '#2563eb', // Blue for primary actions
          secondary: '#7c3aed', // Purple for AI insights
          accent: '#059669', // Green for active states
          background: '#f8fafc', // Light gray background
          surface: '#ffffff', // White surfaces
          text: '#0f172a', // Dark text
          muted: '#64748b', // Muted text
        }
      },
      // Animation for AI thinking states
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-gentle': 'bounce 1s infinite',
      }
    },
  },
  plugins: [],
}
export default config
