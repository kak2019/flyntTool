const config = {
  plugins: [
    "@tailwindcss/postcss",
    ["@csstools/postcss-oklab-function", { preserve: false, subFeatures: { displayP3: false } }],
    ["@csstools/postcss-color-mix-function", { preserve: false }],
  ],
};

export default config;
