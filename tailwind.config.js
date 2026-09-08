/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",  // ← این خط رو درست کن (tsx بود، نه txs)
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};