import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  reporter: 'list',
  use: {
    browserName: 'firefox',
    baseURL: 'http://127.0.0.1:5174',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'firefox-desktop', use: { viewport: { width: 1440, height: 1000 } } },
    // A narrow Firefox viewport, not mobile-device emulation (unsupported by Firefox).
    { name: 'firefox-narrow', use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: false,
  },
});
