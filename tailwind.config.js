/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#3B82F6',
          gold: '#F4C430',
          gray: '#1F2937',
          white: '#F9FAFB',
          black: '#0B0F14'
        }
      },
      boxShadow: {
        'glow-blue': '0 0 0 2px rgba(59,130,246,0.2), 0 0 30px rgba(59,130,246,0.35)',
        'glow-gold': '0 0 0 2px rgba(244,196,48,0.2), 0 0 30px rgba(244,196,48,0.35)',
        'glow-white': '0 0 0 2px rgba(249,250,251,0.15), 0 0 24px rgba(249,250,251,0.25)'
      },
      borderColor: {
        'glass': 'rgba(255,255,255,0.08)'
      },
      backgroundImage: {
        'radial-faint': 'radial-gradient(600px circle at var(--x,50%) var(--y,50%), rgba(59,130,246,0.08), transparent 40%)'
      }
    },
  },
  plugins: [],
};
