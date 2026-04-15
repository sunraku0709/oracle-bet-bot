/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./hooks/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        gold: "#FFD700",
        "gold-dark": "#C9A84C",
        "bg-primary": "#0a0a0a",
        "bg-secondary": "#111111",
        "bg-card": "#1a1a1a",
        "border-subtle": "#2a2a2a",
        "text-primary": "#FFFFFF",
        "text-secondary": "#9CA3AF",
        "silver": "#9CA3AF",
        "no-bet": "#EF4444",
        "premium-green": "#AAFF00",
      },
      fontFamily: {
        bold: ["System"],
      },
    },
  },
  plugins: [],
};
