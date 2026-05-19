/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          400: '#7DD3FC',
          500: '#38BDF8',
          600: '#0EA5E9',
        },
      },
      maxWidth: {
        mobile: '480px',
      },
    },
  },
  plugins: [],
}

