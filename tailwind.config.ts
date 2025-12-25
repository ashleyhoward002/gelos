import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Bright & Vibrant Light Theme

        // Light backgrounds
        'bright-white': '#FAFBFF',
        'soft-lavender': '#F0F4FF',
        'pure-white': '#FFFFFF',
        'light-gray': '#F8FAFC',

        // Primary accent - Electric Cyan (from logo)
        'electric-cyan': {
          DEFAULT: '#00D4FF',
          50: '#E6FAFF',
          100: '#CCF5FF',
          200: '#99EBFF',
          300: '#67E8F9',
          400: '#33DCFF',
          500: '#00D4FF',
          600: '#00B8E6',
          700: '#0099CC',
          800: '#007AA3',
          900: '#005C7A',
        },

        // Secondary accent - Neon Purple (from logo)
        'neon-purple': {
          DEFAULT: '#A855F7',
          50: '#F5EEFE',
          100: '#EBDDFD',
          200: '#D7BBFC',
          300: '#C084FC',
          400: '#B66EFA',
          500: '#A855F7',
          600: '#9333EA',
          700: '#7E22CE',
          800: '#6B21A8',
          900: '#581C87',
        },

        // Vibrant Orange (from logo)
        'vibrant-orange': {
          DEFAULT: '#FF8C42',
          50: '#FFF3EB',
          100: '#FFE7D6',
          200: '#FFD0AD',
          300: '#FFB885',
          400: '#FFA15C',
          500: '#FF8C42',
          600: '#FF6B14',
          700: '#E55500',
          800: '#B84400',
          900: '#8A3300',
        },

        // Golden Sun (from logo)
        'golden-sun': {
          DEFAULT: '#FFD700',
          50: '#FFFBE6',
          100: '#FFF7CC',
          200: '#FFEF99',
          300: '#FFE766',
          400: '#FFDF33',
          500: '#FFD700',
          600: '#CCAC00',
          700: '#998100',
          800: '#665600',
          900: '#332B00',
        },

        // Cosmic Green
        'cosmic-green': {
          DEFAULT: '#4ADE80',
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
        },

        // Hot Pink
        'hot-pink': {
          DEFAULT: '#EC4899',
          50: '#FDF2F8',
          100: '#FCE7F3',
          200: '#FBCFE8',
          300: '#F9A8D4',
          400: '#F472B6',
          500: '#EC4899',
          600: '#DB2777',
          700: '#BE185D',
          800: '#9D174D',
          900: '#831843',
        },

        // Text colors (dark for light backgrounds)
        'slate-dark': '#1E293B',
        'slate-medium': '#64748B',
        'slate-light': '#94A3B8',

        // Border colors (light and subtle)
        'border': '#E2E8F0',
        'border-hover': '#CBD5E1',

        // Status colors
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',

        // Legacy compatibility
        coral: {
          DEFAULT: '#00D4FF',
          500: '#00D4FF',
          600: '#00B8E6',
          700: '#0099CC',
        },
      },
      fontFamily: {
        heading: ["var(--font-poppins)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'medium': '0 4px 16px rgba(0, 0, 0, 0.1)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 40px rgba(0, 0, 0, 0.1)',
        'glow-cyan': '0 0 20px rgba(0, 212, 255, 0.3)',
        'glow-purple': '0 0 20px rgba(168, 85, 247, 0.3)',
        'glow-orange': '0 0 20px rgba(255, 140, 66, 0.3)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(circle at top, var(--tw-gradient-stops))',
        'neon-gradient': 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)',
        'warm-gradient': 'linear-gradient(135deg, #FF8C42 0%, #FFD700 100%)',
        'fun-gradient': 'linear-gradient(135deg, #F0F4FF 0%, #FAFBFF 100%)',
        // Aurora gradient - soft teal to lavender
        'aurora-gradient': 'linear-gradient(135deg, #67E8F9 0%, #A5F3FC 25%, #DDD6FE 75%, #C4B5FD 100%)',
        'aurora-gradient-soft': 'linear-gradient(135deg, rgba(103, 232, 249, 0.3) 0%, rgba(165, 243, 252, 0.3) 25%, rgba(221, 214, 254, 0.3) 75%, rgba(196, 181, 253, 0.3) 100%)',
        // Purple button gradient
        'purple-gradient': 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
        'purple-gradient-hover': 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
      },
    },
  },
  plugins: [],
};
export default config;
