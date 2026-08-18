const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8089',
    specPattern: 'cypress/integration/**/*.spec.js',
    supportFile: false,
    video: false,
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 8000,
    defaultUrlTimeout: 8000,
  },
});