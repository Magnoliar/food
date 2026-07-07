/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './app/**/*.{vue,ts}',
  ],
  theme: {
    extend: {
      colors: {
        morandi: {
          warm: '#A69080',
          cream: '#C4B5A5',
          khaki: '#8B7D6B',
          milk: '#D4C5B2',
          paper: '#F5F0EB',
          pink: '#B5838D',
          green: '#6D8B74',
          gold: '#C9A96E',
          sage: '#9CAF88',
          slate: '#8E9AAF',
          mauve: '#A4869A',
          clay: '#B8906F',
          fog: '#B5B0A8',
          dusk: '#9A8FA0',
        },
        dark: {
          bg: '#2C2825',
          card: '#3A3532',
          text: '#E8E0D8',
        },
        crayon: {
          coral: '#E8927C',
          teal: '#7FB5B5',
          sand: '#D4A76A',
          grass: '#A8C686',
          lavender: '#C7A0D2',
          sky: '#7BA7C2',
          rose: '#E8A0BF',
          lemon: '#E8D47C',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'serif'],
        display: ['"Playfair Display"', 'serif'],
        hand: ['"Caveat"', 'cursive'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        card: '8px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.06)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float-slow 8s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-15px) rotate(2deg)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
