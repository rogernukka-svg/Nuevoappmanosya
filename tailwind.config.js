/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}", // por si usás Pages Router en algo
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",   // utilidades compartidas
  ],
  darkMode: "class",
  // (Opcional) Si tenés estilos externos que pisan utilidades,
  // activá la siguiente línea:
  // important: true,
  theme: {
    extend: {
      /* 🎨 Paleta de colores ManosYA */
      colors: {
        primary: "#14B8A6",
        secondary: "#06B6D4",
        dark: "#0B0B0B",
        light: "#F9FAFB",
        accent: "#10B981",
      },
      /* 🔠 Tipografía */
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        heading: ["Manrope", "Inter", "system-ui", "sans-serif"],
      },
      /* 🌈 Sombras y animaciones */
      boxShadow: {
        glow: "0 0 15px rgba(20,184,166,0.4)",
        innerGlow: "inset 0 0 20px rgba(20,184,166,0.15)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 8px #14B8A6" },
          "50%": { opacity: "0.7", boxShadow: "0 0 20px #06B6D4" },
        },
      },
      animation: {
        float: "float 3s ease-in-out infinite",
        pulseGlow: "pulseGlow 2.5s ease-in-out infinite",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
    },
  },
  plugins: [
    // require("@tailwindcss/forms"),
  ],
};