/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    boxShadow: {
      sm: '0 1px 2px 0 rgba(79, 70, 229, 0.15)',
      DEFAULT: '0 1px 3px 0 rgba(79, 70, 229, 0.18), 0 1px 2px -1px rgba(79, 70, 229, 0.12)',
      md: '0 6px 12px -3px rgba(79, 70, 229, 0.22), 0 3px 6px -4px rgba(79, 70, 229, 0.18)',
      lg: '0 12px 20px -8px rgba(79, 70, 229, 0.25), 0 6px 10px -8px rgba(79, 70, 229, 0.2)',
      xl: '0 20px 30px -12px rgba(79, 70, 229, 0.28), 0 10px 15px -10px rgba(79, 70, 229, 0.22)',
      '2xl': '0 30px 50px -18px rgba(79, 70, 229, 0.32)',
      inner: 'inset 0 2px 4px 0 rgba(15, 23, 42, 0.12)',
      none: '0 0 #0000',
    },
    extend: {
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        shimmer: "shimmer 2s linear infinite",
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
      borderRadius: {
        'card': '1.5rem', // 24px - Bento-Box standard
        'card-lg': '2rem', // 32px - For larger cards
        'card-sm': '1rem', // 16px - For smaller elements
      },
      boxShadow: {
        'bento': '0 1px 3px 0 rgba(79, 70, 229, 0.12), 0 1px 2px -1px rgba(79, 70, 229, 0.08)',
        'bento-hover': '0 8px 16px -6px rgba(79, 70, 229, 0.2), 0 4px 8px -4px rgba(79, 70, 229, 0.18)',
        'bento-lg': '0 16px 30px -12px rgba(79, 70, 229, 0.28), 0 8px 16px -8px rgba(79, 70, 229, 0.22)',
        'primary': '0 12px 20px -10px rgba(79, 70, 229, 0.45)',
        'accent': '0 12px 20px -10px rgba(139, 92, 246, 0.4)',
      },
      spacing: {
        'bento-gap': '1.5rem', // Standard gap between bento cards
        'bento-gap-sm': '1rem', // Smaller gap
        'bento-gap-lg': '2rem', // Larger gap
      },
      colors: {
        primary: '#4F46E5',
        secondary: '#0F172A',
        accent: '#8B5CF6',
        blue: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#4F46E5',
          600: '#4338ca',
          700: '#3730a3',
          800: '#312e81',
          900: '#1e1b4b',
        },
        'bento-bg': 'var(--card-bg)',
        'bento-border': 'var(--card-border)',
      },
    },
  },
  plugins: [],
};
