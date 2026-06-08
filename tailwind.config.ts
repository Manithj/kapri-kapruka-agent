import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Warm Sri Lankan gifting palette
        cream: {
          DEFAULT: "#FBF7F0",
          50: "#FEFCF8",
          100: "#FBF7F0",
          200: "#F3EADB",
        },
        emerald: {
          ink: "#0B3D32",
          deep: "#0E5B4A",
          mid: "#15786160",
          soft: "#E7F0EC",
        },
        gold: {
          DEFAULT: "#C9A24B",
          soft: "#EAD9A8",
        },
        ink: "#1E2A28",
        clay: "#C45B3C",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,40,34,0.04), 0 8px 24px -12px rgba(16,40,34,0.18)",
        float: "0 12px 40px -12px rgba(16,40,34,0.35)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "bounce-sm": {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-3px)" },
        },
        pop: {
          "0%": { transform: "scale(0.5)" },
          "60%": { transform: "scale(1.25)" },
          "100%": { transform: "scale(1)" },
        },
        "toast-in": {
          "0%": { opacity: "0", transform: "translateY(14px) scale(0.96)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out both",
        shimmer: "shimmer 1.5s infinite",
        "bounce-sm": "bounce-sm 1.2s ease-in-out infinite",
        pop: "pop 0.45s ease-out",
        "toast-in": "toast-in 0.3s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
