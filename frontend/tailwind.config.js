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
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      boxShadow: {
        premium: '0 4px 30px rgba(0, 0, 0, 0.2)',
        glass: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
      },
      backdropBlur: {
        premium: '8px',
      }
    },
  },
  plugins: [],
}
