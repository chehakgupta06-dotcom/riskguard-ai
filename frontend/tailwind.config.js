/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0A0906",
          900: "#0F0D09",
          800: "#171410",
          700: "#221E17",
          600: "#2E2820",
          500: "#453D30",
        },
        cream: {
          50: "#FBF8F2",
          100: "#F3EEE3",
          200: "#E6DCC8",
          300: "#D2C4A4",
        },
        ember: {
          400: "#E0925C",
          500: "#C97A3D",
          600: "#A9612C",
          700: "#814A21",
        },
        signal: {
          safe: "#7FA98C",
          watch: "#D6A94F",
          risk: "#C1524B",
          critical: "#8E2E2A",
        },
      },
      fontFamily: {
        display: ["Space Grotesk", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(201, 122, 61, 0.35)",
      },
      backgroundImage: {
        grain: "radial-gradient(circle at 1px 1px, rgba(243,238,227,0.045) 1px, transparent 0)",
      },
    },
  },
  plugins: [],
};
