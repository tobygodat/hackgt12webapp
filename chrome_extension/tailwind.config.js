/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    // Always-dark app; no darkMode toggle
    theme: {
        extend: {
            colors: {
                // map semantic tokens to CSS vars
                bg: "var(--bg)",
                card: "var(--card)",
                surface: "var(--surface)",
                surfaceAlt: "var(--surface-alt)",
                border: "var(--border)",
                text: {
                    DEFAULT: "var(--text)",
                    muted: "var(--muted)",
                },
                brand: {
                    from: "var(--brand-from)",
                    to: "var(--brand-to)",
                    glow: "var(--brand-glow)",
                },
                success: "#16A34A",
                warning: "#F59E0B",
                danger: "#DC2626",
            },
            boxShadow: {
                glow: "0 0 0 3px rgba(254, 198, 106, 0.35)",
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
            },
        },
    },
    plugins: [],
};
