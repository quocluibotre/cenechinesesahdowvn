/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#2b2eee",
        "primary-dark": "#1f21b8",
      },
      fontFamily: {
        "display": ["Plus Jakarta Sans", "sans-serif"]
      }
    },
  },
  plugins: [],
}