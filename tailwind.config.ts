import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: "#1C2333",
          card: "#2A3348",
        },
        accent: {
          DEFAULT: "#2F6FED",
          light: "#E7F0FF",
        },
        surface: {
          DEFAULT: "#F5F7FB",
          card: "#FFFFFF",
          border: "#E2E5EC",
        },
        text: {
          DEFAULT: "#1C2333",
          secondary: "#6B7280",
          muted: "#9AA1B0",
        },
        success: {
          DEFAULT: "#1CA05C",
          light: "#E5F8EE",
        },
        warning: {
          DEFAULT: "#B8860B",
          light: "#FFF4DE",
        },
        danger: {
          DEFAULT: "#DC2626",
          light: "#FDEAEA",
        },
        master: {
          DEFAULT: "#6D3FE0",
          light: "#E9E4FF",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "Arial", "sans-serif"],
      },
      borderRadius: {
        card: "12px",
        btn: "8px",
      },
    },
  },
  plugins: [],
};
export default config;
