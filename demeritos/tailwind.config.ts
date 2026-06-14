import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        azul: {
          DEFAULT: '#0f5aab',
          dark: '#0a3f7a',
          med: '#1a6bc7',
          clr: '#2a7de1',
          lite: '#e8f0fb',
        },
        naranja: {
          DEFAULT: '#fa8d08',
          drk: '#d97507',
          clr: '#ffaa33',
          bg: '#fff5e0',
        },
        rojo: { DEFAULT: '#d62b0f', clr: '#e73719' },
        verde: { DEFAULT: '#1a7a45', clr: '#22a85c' },
      },
      fontFamily: {
        sans: ['Poppins', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
