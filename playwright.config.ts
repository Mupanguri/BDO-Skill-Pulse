import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: 'screenshot-tour.spec.ts',
  timeout: 45_000,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    viewport: { width: 1440, height: 900 },
    screenshot: 'off',
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { channel: 'chrome' },
    },
  ],
  outputDir: 'docs/screenshots/_artifacts',
})
