/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'marketing-black': '#08090a',
        'panel-dark': '#0f1011',
        'level-3': '#191a1b',
        'primary-text': '#f7f8f8',
        'secondary-text': '#d0d6e0',
        'tertiary-text': '#8a8f98',
        'quaternary-text': '#62666d',
        'brand-indigo': '#5e6ad2',
        'accent-violet': '#7170ff',
        'accent-hover': '#828fff',
        'border-primary': '#23252a',
        'border-subtle': 'rgba(255,255,255,0.08)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      backdropBlur: {
        glass: '20px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-inset': 'inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'glow': '0 0 20px rgba(113, 112, 255, 0.4)',
        'glow-lg': '0 0 30px rgba(113, 112, 255, 0.6)',
      },
    },
  },
  plugins: [],
}
