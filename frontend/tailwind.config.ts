import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        sky: {
          50:  '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        brand: {
          light:  '#e0f2fe',
          soft:   '#bae6fd',
          mid:    '#38bdf8',
          DEFAULT:'#0ea5e9',
          deep:   '#0284c7',
          darker: '#0369a1',
          dark:   '#075985',
          navy:   '#0c4a6e',
        },
      },
      fontFamily: {
        sans:    ['var(--font-dm-sans)', 'DM Sans', 'sans-serif'],
        display: ['var(--font-syne)', 'Syne', 'sans-serif'],
        mono:    ['var(--font-jetbrains)', 'JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-up':    'fadeUp 0.4s ease both',
        'fade-in':    'fadeIn 0.3s ease both',
        'slide-in':   'slideIn 0.3s ease both',
        'shimmer':    'shimmer 2s infinite',
        'pulse-slow': 'pulse 3s infinite',
        'spin-slow':  'spin 3s linear infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-16px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      boxShadow: {
        'sky-sm': '0 2px 8px rgba(14,165,233,0.15)',
        'sky-md': '0 4px 20px rgba(14,165,233,0.25)',
        'sky-lg': '0 8px 40px rgba(14,165,233,0.35)',
        'card':   '0 2px 16px rgba(12,74,110,0.08)',
        'card-hover': '0 8px 32px rgba(12,74,110,0.14)',
      },
      backgroundImage: {
        'sky-gradient': 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
        'sky-soft':     'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
        'hero-mesh':    'radial-gradient(at 40% 20%, #bae6fd 0px, transparent 50%), radial-gradient(at 80% 0%, #e0f2fe 0px, transparent 50%), radial-gradient(at 0% 50%, #7dd3fc 0px, transparent 50%)',
      },
    },
  },
  plugins: [],
}
export default config
