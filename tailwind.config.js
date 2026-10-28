/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#090a0d',
          900: '#0f1115',
          850: '#15181e',
          800: '#1b1f27',
          700: '#282e39',
          600: '#3a4252',
        },
        gold: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        emerald: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        }
      }
    },
  },
  plugins: [],
}
