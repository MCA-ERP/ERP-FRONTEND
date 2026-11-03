/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Arial', 'sans-serif'],
      },
      colors: {
        // Official MCA Brand Guidelines Palette
        mca: {
          green: '#0A7F5B',        // Growth Green (Letter M)
          'green-deep': '#065740', // Deep Green
          'green-mint': '#D9EFE8', // Mint tint
          'green-light': '#D9EFE8',
          blue: '#0294CE',         // Class Blue (Lead UI color, Letter C)
          'blue-sky': '#DCEFF9',   // Sky tint
          'blue-tint': '#41AFDA',  // 25% tint
          'blue-soft': '#81CAE7',  // 50% tint
          'blue-shade': '#026F9B', // 25% shade
          'blue-dark': '#014A67',  // Deep shade
          'blue-deep': '#012534',
          red: '#E53A35',          // Assist Red (Call to Action CTA, Letter A)
          'red-blush': '#FCE0DF',  // Blush tint
          'red-hover': '#AC2C28',  // Deep red hover
          ink: '#111827',          // Ink (Text neutral)
          cloud: '#F3F5F7',        // Cloud (Card/Neutral bg)
        },
        brand: {
          sky: '#0294CE',
          'sky-light': '#DCEFF9',
          'sky-hover': '#026F9B',
          'sky-dark': '#014A67',
          blue: '#0294CE',
          'blue-hover': '#026F9B',
          'blue-light': '#DCEFF9',
          red: '#E53A35',
          'red-hover': '#AC2C28',
          'red-light': '#FCE0DF',
          green: '#0A7F5B',
          'green-light': '#D9EFE8',
          cyan: '#0294CE',
          'cyan-light': '#DCEFF9',
        }
      },
      boxShadow: {
        'glass': '0 10px 30px -5px rgba(2, 148, 206, 0.08), 0 0 15px -3px rgba(10, 127, 91, 0.05)',
        'glass-hover': '0 20px 40px -10px rgba(2, 148, 206, 0.2), 0 0 20px -3px rgba(2, 148, 206, 0.1)',
        'glow-sky': '0 0 20px rgba(2, 148, 206, 0.35)',
        'glow-blue': '0 0 20px rgba(2, 148, 206, 0.35)',
        'glow-red': '0 0 20px rgba(229, 58, 53, 0.35)',
      }
    },
  },
  plugins: [],
};
