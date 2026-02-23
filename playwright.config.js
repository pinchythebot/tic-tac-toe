/** @type {import('@playwright/test').PlaywrightTestConfig} */
const { devices } = require('@playwright/test');

const config = {
  testDir: './__tests__',
  testMatch: ['**/*.spec.js'],
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
};

module.exports = config;
