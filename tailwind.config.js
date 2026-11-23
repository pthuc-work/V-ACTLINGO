/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: 'var(--brand-navy)',
          blue: 'var(--brand-blue)',
          yellow: 'var(--brand-yellow)',
          green: 'var(--brand-green)',
          red: 'var(--brand-red)',
          gray: 'var(--brand-gray)',
          card: 'var(--brand-card)',
          bg: 'var(--brand-bg)',
          border: 'var(--brand-border)',
        },
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
