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
        cyber: {
          950: '#070A12',
          900: '#0B0F19',
          850: '#0F1626',
          800: '#111827',
          750: '#192234',
          700: '#1F2937',
          600: '#374151'
        }
      }
    },
  },
  plugins: [],
}

