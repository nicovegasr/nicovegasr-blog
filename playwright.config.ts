import { defineConfig, devices } from '@playwright/test';

const port = 4330;
const continuousIntegration = !!process.env.CI;

export default defineConfig({
  testDir: './src',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: continuousIntegration,
  retries: continuousIntegration ? 1 : 0,
  reporter: continuousIntegration ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } }],
  // The labs are static pages: test the real production build, not the dev server.
  webServer: {
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}/es/laboratorios/`,
    reuseExistingServer: !continuousIntegration,
    timeout: 180_000,
  },
});
