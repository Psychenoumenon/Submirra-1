/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
      extend: {
        colors: {
          'art-nouveau': {
            purple: {
              50: '#f5f3ff',
              100: '#ede9fe',
              200: '#ddd6fe',
              300: '#c4b5fd',
              400: '#a78bfa',
              500: '#8b5cf6',
              600: '#7c3aed',
              700: '#6d28d9',
              800: '#5b21b6',
              900: '#4c1d95',
              950: '#2e1065',
            },
            gold: {
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
            'dark-purple': '#1a0b2e',
            'deep-purple': '#2d1b4e',
            'royal-purple': '#4a2c7a',
            'metallic-gold': '#d4af37',
            'light-gold': '#f4e4bc',
          },
        },
        fontFamily: {
          'art-nouveau': ['Playfair Display', 'serif'],
          'elegant': ['Cormorant Garamond', 'serif'],
        },
        backgroundImage: {
          'art-nouveau-gradient': 'linear-gradient(135deg, #4a2c7a 0%, #2d1b4e 50%, #1a0b2e 100%)',
          'gold-gradient': 'linear-gradient(135deg, #d4af37 0%, #f4e4bc 100%)',
          'purple-gold-gradient': 'linear-gradient(135deg, #6d28d9 0%, #d4af37 100%)',
        },
        boxShadow: {
          'art-nouveau': '0 10px 40px rgba(109, 40, 217, 0.3), 0 0 20px rgba(212, 175, 55, 0.2)',
          'gold-glow': '0 0 20px rgba(212, 175, 55, 0.5), 0 0 40px rgba(212, 175, 55, 0.3)',
          'purple-glow': '0 0 30px rgba(109, 40, 217, 0.4), 0 0 60px rgba(109, 40, 217, 0.2)',
        },
      },
    },
    plugins: [],
  };
  