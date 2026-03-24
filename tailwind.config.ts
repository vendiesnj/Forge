import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        surface2: 'var(--surface2)',
        border: 'var(--border)',
        border2: 'var(--border2)',
        ink: {
          DEFAULT: 'var(--ink)',
          2: 'var(--ink2)',
          3: 'var(--ink3)',
          4: 'var(--ink4)',
        },
        amber: {
          DEFAULT: 'var(--amber)',
          bg: 'var(--amber-bg)',
          border: 'var(--amber-border)',
        },
        green: {
          DEFAULT: 'var(--green)',
          bg: 'var(--green-bg)',
          border: 'var(--green-border)',
        },
        red: {
          DEFAULT: 'var(--red)',
          bg: 'var(--red-bg)',
          border: 'var(--red-border)',
        },
        blue: {
          DEFAULT: 'var(--blue)',
          bg: 'var(--blue-bg)',
          border: 'var(--blue-border)',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      borderRadius: {
        forge: '6px',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s linear infinite',
        fadeUp: 'fadeUp 0.3s ease forwards',
        spin: 'spin 0.8s linear infinite',
        pulse: 'pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
