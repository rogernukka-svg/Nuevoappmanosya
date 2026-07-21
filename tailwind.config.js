/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        manos: {
          mint: "#64C7BE",
          deep: "#42B5AA",
          ink: "#050505",
          paper: "#F7F8FA",
        },
      },
    },
  },
  plugins: [],
};
