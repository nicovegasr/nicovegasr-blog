import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4330);
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
    // Without --ignore-lock, astro exits quietly if a preview of this checkout is already running on any port.
    command: `npm run build && npm run preview -- --ignore-lock --host 127.0.0.1 --port ${port}`,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 2_000 },
    url: `http://127.0.0.1:${port}/es/contenido/laboratorios/`,
    // Reusing is opt-in: a server left running by another checkout would test the wrong code.
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === '1',
    timeout: 180_000,
  },
});
