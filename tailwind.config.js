/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        mw: {
          bg: 'var(--mw-bg)',
          secondary: 'var(--mw-bg-secondary)',
          card: 'var(--mw-card)',
          'card-hover': 'var(--mw-card-hover)',
          accent: 'var(--mw-accent)',
          primary: 'var(--mw-primary)',
          gold: 'var(--mw-gold)',
          success: 'var(--mw-success)',
          warning: 'var(--mw-warning)',
          danger: 'var(--mw-danger)',
          text: 'var(--mw-text)',
          muted: 'var(--mw-text-secondary)',
          faint: 'var(--mw-text-muted)',
        },
      },
      fontFamily: {
        display: ['var(--font-space)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        mw: 'var(--mw-radius)',
        'mw-lg': 'var(--mw-radius-lg)',
        'mw-xl': 'var(--mw-radius-xl)',
      },
      boxShadow: {
        mw: 'var(--mw-shadow)',
        'mw-lg': 'var(--mw-shadow-lg)',
        'mw-red': 'var(--mw-glow-red)',
        'mw-blue': 'var(--mw-glow-blue)',
        'mw-gold': 'var(--mw-glow-gold)',
      },
      transitionTimingFunction: {
        mw: 'var(--mw-ease)',
      },
      animation: {
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        float: 'float 7s ease-in-out infinite',
        shimmer: 'shimmer 2.4s linear infinite',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
