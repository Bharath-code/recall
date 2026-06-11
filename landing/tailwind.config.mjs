/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        slate: 'rgb(var(--color-slate) / <alpha-value>)',
        terminal: 'rgb(var(--color-terminal) / <alpha-value>)',
        cyan: 'rgb(var(--color-cyan) / <alpha-value>)',
        mint: 'rgb(var(--color-mint) / <alpha-value>)',
        ember: 'rgb(var(--color-ember) / <alpha-value>)',
        dust: 'rgb(var(--color-dust) / <alpha-value>)',
        cloud: 'rgb(var(--color-cloud) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'xs': '12px',
        'sm': '14px',
        'base': '16px',
        'lg': '18px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '32px',
        '4xl': '48px',
      },
    },
  },
  plugins: [],
}
