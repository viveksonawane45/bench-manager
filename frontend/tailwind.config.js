/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        darkBg: "var(--bg-color)", 
        darkCard: "var(--card-color)", 
        darkBorder: "var(--border-color)", 
        darkAccent: "var(--accent-color)", 
        darkText: "var(--text-color)", 
        darkTextMuted: "var(--text-muted-color)", 
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
        coral: {
          DEFAULT: "#e06d61",
          hover: "#d35e52",
        },
        taupe: {
          DEFAULT: "#969181",
          dark: "#868172",
        },
        charcoal: {
          DEFAULT: "#0e0d12",
          card: "#14131a",
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['"Fira Code"', 'monospace'],
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        premium: '0 4px 30px rgba(0, 0, 0, 0.05)',
        bento: '0 10px 35px -5px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
