/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {}, // <-- LA CORRECTION EST ICI
    autoprefixer: {},
  },
};

export default config;