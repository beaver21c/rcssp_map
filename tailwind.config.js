/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans KR"', '"Malgun Gothic"', 'sans-serif']
      },
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0eefe',
          500: '#3b82f6',
          700: '#1d4ed8'
        }
      }
    }
  },
  plugins: []
};
