/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '480px',
      },
      colors: {
        glass: {
          50: 'rgba(255, 255, 255, 0.05)',
          100: 'rgba(255, 255, 255, 0.08)',
          200: 'rgba(255, 255, 255, 0.1)',
          300: 'rgba(255, 255, 255, 0.15)',
          400: 'rgba(255, 255, 255, 0.2)',
        },
      },
      backgroundColor: {
        'glass-dark': 'rgba(15, 23, 42, 0.6)',
        'glass-darker': 'rgba(15, 23, 42, 0.75)',
        'glass-medium': 'rgba(30, 41, 59, 0.5)',
        'glass-light': 'rgba(30, 41, 59, 0.4)',
      },
      borderColor: {
        'glass': 'rgba(255, 255, 255, 0.08)',
        'glass-light': 'rgba(255, 255, 255, 0.1)',
        'glass-medium': 'rgba(255, 255, 255, 0.15)',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'glass-lg': '0 12px 40px rgba(0, 0, 0, 0.4)',
        'glass-xl': '0 25px 50px rgba(0, 0, 0, 0.5)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.3)',
      },
      backdropBlur: {
        'glass': '12px',
        'glass-lg': '16px',
        'glass-xl': '20px',
      },
    },
  },
  plugins: [],
}
