import { defineConfig, devices } from '@playwright/test';
import { join } from 'path';

// Absolute path to index.html — used as the app URL in tests.
// Loading via file:// eliminates all web server dependencies (no port
// conflicts, no server startup failures, no IPv4/IPv6 binding issues).
export const APP_URL = `file://${join(process.cwd(), 'index.html')}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 30000,
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          // Allow file:// pages to load sibling files (icons, sw.js, etc.)
          args: ['--allow-file-access-from-files'],
        },
      },
    },
  ],
});
