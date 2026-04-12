/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        body: ['DM Sans', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        surface: {
          DEFAULT: '#ffffff',
          secondary: '#f8fafc',
          dark: '#0f172a',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
        gray: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 20px 60px rgba(0, 0, 0, 0.1), 0 4px 16px rgba(0, 0, 0, 0.06)',
        'premium': '0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
        'glow-primary': '0 0 30px rgba(99, 102, 241, 0.3)',
        'glow-success': '0 0 20px rgba(34, 197, 94, 0.3)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fadeIn': 'fadeIn 0.5s ease-out',
        'slideUp': 'slideUp 0.6s ease-out',
        'shimmer': 'shimmer 1.8s infinite linear',
        'pulse-soft': 'pulse-soft 2.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-800px 0' },
          '100%': { backgroundPosition: '800px 0' },
        },
        'pulse-soft': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(99, 102, 241, 0.2)' },
          '50%': { boxShadow: '0 0 0 12px rgba(99, 102, 241, 0)' },
        },
      },
      container: {
        center: true,
        padding: '1rem',
        screens: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
          '2xl': '1400px',
        },
      },
    },
  },
  plugins: [],
}
