/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        sage: {
          50: "#f5f8f4",
          100: "#e6eee7",
          200: "#ceddce",
          300: "#abc4ae",
          400: "#7c9f83",
          500: "#577d60",
          600: "#365f47",
          700: "#1f3d2b",
          800: "#173022",
          900: "#102219"
        },
        earth: {
          100: "#f5f1e9",
          300: "#d9c8b1",
          500: "#aa8c6a",
          700: "#786149"
        }
      },
      boxShadow: {
        soft: "0 18px 45px rgba(44, 63, 50, 0.14)"
      },
      fontFamily: {
        display: ["Playfair Display", "serif"],
        body: ["Inter", "sans-serif"]
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-30px)" }
        }
      },
      animation: {
        fadeUp: "fadeUp 0.5s ease forwards",
        float: "float 6s ease-in-out infinite"
      }
    }
  },
  plugins: []
};
