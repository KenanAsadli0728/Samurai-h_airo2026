import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        plex: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        solar: { DEFAULT: '#F59E0B', light: '#FDE68A', dark: '#B45309' },
        wind:  { DEFAULT: '#06B6D4', light: '#A5F3FC', dark: '#0E7490' },
        geo:   { DEFAULT: '#10B981', light: '#A7F3D0', dark: '#065F46' },
        navy: {
          900: '#0B1120',
          800: '#0F172A',
          700: '#1E293B',
          600: '#334155',
        },
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulse_ring: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease-out forwards',
        'pulse-ring': 'pulse_ring 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
