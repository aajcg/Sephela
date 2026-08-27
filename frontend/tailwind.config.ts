import type { Config } from "tailwindcss";

// Design tokens live here (HSL CSS vars in globals.css) so light/dark and
// future theming stay consistent across the dashboard.
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        accent: {
          cyan: "hsl(var(--accent-cyan))",
          violet: "hsl(var(--accent-violet))",
          emerald: "hsl(var(--accent-emerald))",
          amber: "hsl(var(--accent-amber))",
          rose: "hsl(var(--accent-rose))",
        },
        // Severity scale for risk visualization.
        severity: {
          info: "hsl(210 90% 55%)",
          low: "hsl(160 84% 39%)",
          medium: "hsl(38 92% 50%)",
          high: "hsl(25 95% 55%)",
          critical: "hsl(347 77% 50%)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'slide-in-left': 'slideInLeft 0.4s ease-out forwards',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 3s ease infinite',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
        'spin-slow': 'spin-slow 3s linear infinite',
        'stagger-fade': 'stagger-fade 0.5s ease-out forwards',
        'count-up': 'count-up 0.6s ease-out forwards',
        'progress-fill': 'progress-fill 1s ease-out forwards',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};

export default config;
