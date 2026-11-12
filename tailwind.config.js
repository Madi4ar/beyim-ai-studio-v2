/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './app.js', './data.js', './icons.js'],
  theme: {
    extend: {
      colors: {
        bg: '#FAFAFA',
        surface: '#FFFFFF',
        ink: '#171717',
        'ink-soft': '#6B6B6B',
        'ink-faint': '#A3A3A3',
        border: '#E7E7E7',
        brand: { DEFAULT: '#18999D', dark: '#127579', soft: '#E6F5F5' },
        success: '#1F8A4C',
        warning: '#B7791F',
        danger: '#C23B3B',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: { sm: '8px', md: '12px', lg: '16px', xl: '20px' },
      boxShadow: {
        card: '0 1px 2px rgba(23,23,23,.05)',
        pop: '0 8px 24px rgba(23,23,23,.08)',
      },
      maxWidth: { shell: '1440px' },
    },
  },
  plugins: [],
};
