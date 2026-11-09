/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hall: {
          50: '#fdf4f5',
          100: '#fbe8eb',
          200: '#f7d5d9',
          300: '#f0b4bd',
          400: '#e58796',
          500: '#d55f73',
          600: '#bf3f56',
          700: '#a13045',
          800: '#862b3d',
          900: '#732737',
          950: '#41101b',
        },
        navy: {
          800: '#0f172a',
          900: '#020617',
          950: '#01040f',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-red': '0 0 25px -5px rgba(239, 68, 68, 0.4)',
        'glow-primary': '0 0 25px -5px rgba(213, 95, 115, 0.35)',
      }
    },
  },
  plugins: [],
}
