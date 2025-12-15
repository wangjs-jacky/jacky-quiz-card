/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: '#6366f1', // Indigo 500
        secondary: '#10b981', // Emerald 500
        danger: '#ef4444', // Red 500
        card: '#ffffff',
        background: '#f3f4f6', // Gray 100
      }
    },
  },
  plugins: [],
}

