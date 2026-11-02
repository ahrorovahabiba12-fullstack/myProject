/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f0ff",
          100: "#e6e1ff",
          200: "#cfc4ff",
          300: "#ab97ff",
          400: "#8b6bff",
          500: "#6c3ffb", // primary indigo/violet
          600: "#5a2fe0",
          700: "#4a24b8",
          800: "#3c1e94",
          900: "#2f1876",
        },
        accentBlue: "#4f6df5",
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
      },
      borderRadius: {
        card: "1.25rem",
      },
      boxShadow: {
        card: "0 8px 30px -12px rgba(76, 40, 190, 0.25)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #6c3ffb 0%, #4f6df5 100%)",
      },
      keyframes: {
        "scale-in": {
          "0%": { transform: "scale(0.7)", opacity: "0" },
          "60%": { transform: "scale(1.08)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "slide-in": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
      animation: {
        "scale-in": "scale-in 0.35s ease-out",
        "slide-in": "slide-in 0.2s ease-out",
      },
      fontFamily: {
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
