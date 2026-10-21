/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#056839', // Тёмно-зеленый
        background: '#F8F9FA', // RU: Светлый фон / EN: Light background
        white: '#FFFFFF', // Оқ
        gold: '#D4AF37', // RU: Золотой акцент / EN: Gold accent
      }
    },
  },
  plugins: [],
}
