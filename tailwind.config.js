/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Light theme. The app's utility classes were written for dark mode, so the
        // scales are remapped here instead of rewriting every component:
        //  - zinc is inverted (zinc-950 = page background, zinc-100 = body text)
        //  - `ink` replaces translucent white for borders and tints
        //  - the accent shades used as text (300/200) are darkened to stay readable on white
        ink: '#09090b',
        zinc: {
          50: '#09090b', 100: '#18181b', 200: '#27272a', 300: '#3f3f46', 400: '#52525b',
          500: '#71717a', 600: '#a1a1aa', 700: '#d4d4d8', 800: '#e4e4e7', 900: '#f4f4f5', 950: '#fafafa',
        },
        emerald: { 200: '#065f46', 300: '#047857', 400: '#059669', 500: '#10b981' },
        teal: { 300: '#0f766e', 400: '#0d9488' },
        sky: { 100: '#075985', 200: '#075985', 300: '#0369a1', 400: '#0284c7' },
        amber: { 200: '#92400e', 300: '#b45309', 400: '#d97706' },
        rose: { 200: '#9f1239', 300: '#be123c', 400: '#e11d48' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      keyframes: {
        'sheet-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        rise: { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'toast-in': { from: { opacity: '0', transform: 'translateY(-8px) scale(.98)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: {
        'sheet-up': 'sheet-up .34s cubic-bezier(.2,.8,.2,1)',
        'fade-in': 'fade-in .2s ease-out',
        rise: 'rise .4s cubic-bezier(.2,.8,.2,1) both',
        shimmer: 'shimmer 1.6s infinite',
        'toast-in': 'toast-in .25s ease-out',
      },
    },
  },
  plugins: [],
};
