import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#050505',
        secondary: '#0f0f0f',
        accent: '#ffffff',
        muted: '#a8a8a8',
        border: 'rgba(255, 255, 255, 0.08)',
        card: 'rgba(255, 255, 255, 0.03)',
        ink: '#f8f5ef',
        ember: '#f3b36a',
        marine: '#7ad7d1',
        rose: '#f2a0b6',
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'Inter', 'Arial', 'sans-serif'],
      },
      animation: {
        marquee: 'marquee 40s linear infinite',
        'marquee-reverse': 'marquee-reverse 40s linear infinite',
        'border-spin': 'border-spin 6s linear infinite',
        float: 'float 7s ease-in-out infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'marquee-reverse': {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0%)' },
        },
        'border-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      backdropBlur: {
        xl: '24px',
      },
      boxShadow: {
        'soft-glow': '0 24px 90px rgba(255, 255, 255, 0.12)',
        'marine-glow': '0 20px 90px rgba(122, 215, 209, 0.18)',
      },
    },
  },
  plugins: [],
};

export default config;
