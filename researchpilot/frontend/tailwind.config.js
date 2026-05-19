/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void: '#05050a',
        deep: '#0a0d14',
        surface: '#0f1219',
        raised: '#151922',
        hover: '#1c2130',
        border: {
          dim: 'rgba(255,255,255,0.06)',
          mid: 'rgba(255,255,255,0.12)',
          bright: 'rgba(255,255,255,0.22)',
        },
        indigo: {
          glow: 'rgba(99,102,241,0.3)',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        ui: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s ease infinite',
        'spin-slow': 'spin 2s linear infinite',
      },
    },
  },
  plugins: [],
}
