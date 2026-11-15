/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      screens: { xs: '480px' },
      colors: {
        primary: {
          50: '#eef4ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#141d2e',
          950: '#0f1521',
        },
        accent: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#0d3b4a',
        },
        brand: {
          dark: '#0f1521',
          mid: '#141d2e',
          light: '#1e3a5f',
        },
        surface: {
          light: '#f8f9fe',
          dark: '#0f1117',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,.06), 0 4px 12px 0 rgba(0,0,0,.04)',
        'card-hover': '0 4px 20px 0 rgba(37,99,235,.10), 0 1px 6px 0 rgba(0,0,0,.06)',
        glow: '0 0 20px rgba(59,130,246,.35)',
        'glow-sm': '0 0 10px rgba(59,130,246,.25)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,.08)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-brand': 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #06b6d4 100%)',
        'gradient-brand-soft': 'linear-gradient(135deg, #eef4ff 0%, #cffafe 100%)',
        'mesh-light':
          'radial-gradient(at 40% 20%, hsla(220,100%,97%,1) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(210,100%,96%,1) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(200,90%,96%,1) 0px, transparent 50%)',
        'mesh-dark':
          'radial-gradient(at 40% 20%, hsla(248,60%,8%,1) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(240,50%,10%,1) 0px, transparent 50%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(59,130,246,.3)' },
          '50%': { boxShadow: '0 0 20px rgba(59,130,246,.6)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out',
        'fade-in': 'fade-in 0.25s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'slide-in-left': 'slide-in-left 0.3s ease-out',
        shimmer: 'shimmer 2.5s infinite linear',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
