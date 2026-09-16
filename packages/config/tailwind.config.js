/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f4f7fa",
          100: "#e5ecf3",
          200: "#cedde9",
          300: "#a6c3da",
          400: "#77a2c6",
          500: "#5485b0",
          600: "#3f6b94",
          700: "#335677",
          800: "#1f3a68", // DAIH Navy
          900: "#182e52",
          950: "#0f1d35",
        },
        accent: {
          50: "#fff9eb",
          100: "#feeec7",
          200: "#fddc8a",
          300: "#fbc54d",
          400: "#f9ac1f",
          500: "#f08d08",
          600: "#d56c04", // DAIH Warm Amber
          700: "#ab4a07",
          800: "#8c3a0d",
          900: "#74310e",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};
