/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
        primary: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        surface: {
          100: 'rgba(255, 255, 255, 0.96)',
          200: 'rgba(255, 255, 255, 0.88)',
          300: 'rgba(255, 255, 255, 0.72)',
          400: 'rgba(255, 255, 255, 0.56)',
          500: 'rgba(255, 255, 255, 0.40)',
        },
      },
      borderRadius: {
        xl: '18px',
        '2xl': '22px',
      },
      boxShadow: {
        soft: '0 8px 30px rgba(0,0,0,0.08)',
        card: '0 2px 16px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [
    function ({ addComponents, theme }) {
      addComponents({
        '.glass': {
          backgroundColor: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.4)',
        },
      })
    },
  ],
}
