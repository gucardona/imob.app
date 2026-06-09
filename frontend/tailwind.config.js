/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        warm: {
          50:  '#faf8f6',
          100: '#f5f1ec',
          200: '#e8e1d8',
          300: '#d4cab8',
          400: '#b0a08a',
          500: '#8c7a62',
          600: '#6e5f4b',
          700: '#4f4236',
          800: '#2e2520',
          900: '#1a150f',
        },
        gold: {
          400: '#e2b84a',
          500: '#c49a3c',
          600: '#a67d2e',
        },
      },
      letterSpacing: {
        widest: '0.2em',
      },
    },
  },
  plugins: [],
}
