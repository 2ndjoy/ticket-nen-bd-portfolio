const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  use: {
    baseURL: process.env.DEMO_BASE_URL || 'http://127.0.0.1:5000',
    browserName: 'chromium',
    trace: 'retain-on-failure'
  }
});
