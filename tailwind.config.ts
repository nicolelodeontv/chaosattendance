import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        base: "rgb(var(--base) / <alpha-value>)",
        panel: "rgb(var(--panel) / <alpha-value>)",
        panel2: "rgb(var(--panel2) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        ink2: "rgb(var(--ink2) / <alpha-value>)",
        amber: "rgb(var(--amber) / <alpha-value>)",
        cyan: "rgb(var(--cyan) / <alpha-value>)",
        red: "rgb(var(--red) / <alpha-value>)",
        orange: "rgb(var(--orange) / <alpha-value>)",
        "orange-soft": "rgb(var(--orange-soft) / <alpha-value>)",
        ember: "rgb(var(--ember) / <alpha-value>)",
        discord: "rgb(var(--discord) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Rajdhani", "sans-serif"],
        title: ["var(--font-display)", "Rajdhani", "sans-serif"],
        body: ["var(--font-body)", "Rajdhani", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "14px",
        xl: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
