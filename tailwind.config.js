module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          100: '#f7f7f7',
          200: '#e1e1e1', 
          300: '#cfcfcf',
          400: '#b1b1b1',
          500: '#9e9e9e',
          600: '#7e7e7e',
          700: '#626262',
          800: '#515151',
          900: '#3b3b3b',
          950: '#1a1a1a',
        },
        // Динамические цвета через CSS переменные
        accent: {
          DEFAULT: 'var(--accent-color)',
          dark: 'var(--accent-color-dark)',
          light: 'var(--accent-color-light)',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
};