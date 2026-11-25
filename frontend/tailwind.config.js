/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--display)'],
        sans: ['var(--body)'],
        mono: ['var(--mono)'],
      },
      colors: {
        'hlb-bg': 'var(--bg)',
        'hlb-surface': 'var(--surface)',
        'hlb-ink': 'var(--ink)',
        'hlb-soft': 'var(--soft)',
        'hlb-muted': 'var(--muted)',
        'hlb-line': 'var(--line)',
        'hlb-paper': 'var(--paper)',
        'hlb-yellow': 'var(--yellow)',
        'hlb-orange': 'var(--orange)',
        'hlb-blue': 'var(--blue)',
        'hlb-red': 'var(--red)',
        'hlb-green': 'var(--green)',
        'hlb-pink': 'var(--pink)',
        'hlb-mint': 'var(--mint)',
        'hlb-edge': 'var(--edge)',
        'hlb-hover': 'var(--hover)',
        'hlb-on-yellow': 'var(--on-yellow)',
      },
    },
  },
  plugins: [],
};
