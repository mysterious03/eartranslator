/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#05060e',
        surface: '#0a0b16',
        border:  'rgba(255,255,255,0.05)',
        accent:  '#00FFC8', // Teal
        primary: '#6366f1', // Indigo
        secondary: '#8b5cf6', // Purple
        dim:     '#111322',
        muted:   '#2d3142',
        sub:     '#6e7391',
        text:    '#f1f3f9',
        error:   '#f43f5e',
        ok:      '#00FFC8',
      },
      fontFamily: {
        sans:    ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      animation: {
        'spin-slow': 'spin 12s linear infinite',
        'ping-slow': 'ping 2.5s cubic-bezier(0,0,0.2,1) infinite',
        'fade-up': 'fadeUp 0.6s cubic-bezier(0.16,1,0.3,1)',
        'fade-in': 'fadeIn 0.3s ease',
        'float-slow': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%':   { transform: 'translateY(24px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':       { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
