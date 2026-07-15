/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        morandi: {
          warm: '#9A8677', cream: '#CBBBAA', khaki: '#78695D', milk: '#E8DED2', paper: '#F7F2EA',
          pink: '#A77B82', green: '#617B65', gold: '#AD874D', sage: '#8DA07B', slate: '#7D899D',
          mauve: '#987E91', clay: '#A9785A', fog: '#AAA39B', dusk: '#8C8291',
        },
        crayon: {
          coral: '#C96D55', teal: '#659A98', sand: '#B98A4E', grass: '#78965F', lavender: '#A783AF',
          sky: '#658CA5', rose: '#BB7896', lemon: '#C4A94A',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'serif'], display: ['"Playfair Display"', 'serif'],
        hand: ['"Caveat"', 'cursive'], mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { card: 'var(--radius-lg)' },
      boxShadow: { card: 'var(--shadow-sm)', 'card-hover': 'var(--shadow-md)' },
    },
  },
  plugins: [],
}
