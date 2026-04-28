/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        ink: '#0b1220',
        navy: '#1e293b',
        mist: '#e2e8f0',
        ocean: '#0f172a'
      },
      boxShadow: {
        card: '0 10px 25px -15px rgba(15, 23, 42, 0.45)'
      },
      animation: {
        'fade-in-up': 'fadeInUp 420ms ease-out both'
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      }
    },
  },
  plugins: [],
}

