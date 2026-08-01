/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          light: '#faf6f0',     // Light warm pastel background
          purple: '#4f3267',    // Caratlane Signature Purple
          pink: '#de3163',      // Caratlane Hot Pink
          gold: '#bf195a',      // Darker pastel pink accent (replacing gold)
          zinc: '#ffffff',      // Pure white card background
          accent: '#9c27b0',    // Bright violet accent
          dark: '#301934',      // Deep purple background (if dark header/details used)
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Outfit"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
