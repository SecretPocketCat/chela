import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  prefix: "tw-",
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      light: "#e5e7eb",
      dark: "#222",
      border: "#333",
      "border-dark": "#252525",
      primary: "#075985",
      negative: "#f87171",
      positive: "#34d399",
    },
  },
  plugins: [],
} satisfies Config;
