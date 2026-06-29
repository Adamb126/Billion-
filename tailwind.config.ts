import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0e7490", // teal-700 — cool, "recovery / water" feel
          dark: "#155e75",
          light: "#22d3ee",
        },
      },
    },
  },
  plugins: [],
};

export default config;
