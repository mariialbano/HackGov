/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'gov-orange': '#ff8101', // Cor do botão GOV.BR e destaques do menu
        'gov-green': '#51ba7e',  // Cor do botão de feedback / chatbot
        'gov-bg': '#f9fafb'      // Cinza bem claro de fundo das páginas
      }
    },
  },
  plugins: [],
}
