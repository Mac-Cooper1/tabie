/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'tabie': {
          // Primary - Deep Wine Red
          'primary': '#722F37',
          'primary-light': '#8B3A44',
          'primary-dark': '#5A252C',

          // Background & Surfaces (Dark Theme)
          'bg': '#1C1917',
          'surface': '#292524',
          'card': '#292524',
          'border': '#44403C',

          // Text (for dark backgrounds)
          'text': '#FFFFFF',
          'muted': '#A8A29E',

          // Status colors
          'success': '#4ADE80',
          'warning': '#F59E0B',
          'error': '#DC2626',

          // Legacy aliases
          'dark': '#1C1917',
          'accent': '#722F37',
          'accent-dim': '#5A252C',
        }
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient': 'gradient 8s ease infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
