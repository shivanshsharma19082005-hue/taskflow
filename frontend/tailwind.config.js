/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f5ff',
          100: '#dbe7fe',
          200: '#bcd1fe',
          300: '#8fb3fd',
          400: '#5b8bfa',
          500: '#3767f5',
          600: '#2549e8',
          700: '#1e3ad4',
          800: '#1f31ab',
          900: '#1f2d87',
        },
      },
    },
  },
  plugins: [],
};
