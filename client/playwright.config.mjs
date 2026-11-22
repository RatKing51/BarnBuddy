import { defineConfig } from '@playwright/test';
import { readDashboardTestEnv, sessionFile } from './tests/browser/dashboard-env.mjs';

const signedIn = process.env.BARNBUDDY_SIGNED_IN === '1';
const development = signedIn ? readDashboardTestEnv() : null;
const baseURL = 'http://127.0.0.1:5174';
const walkthrough = /dashboard\.spec\.mjs$/;
const setup = /dashboard\.setup\.mjs$/;
const desktop = { name: 'firefox-desktop', use: { viewport: { width: 1440, height: 1000 } } };
// Firefox uses narrow viewports without emulating mobile devices.
const narrow = { name: 'firefox-narrow', use: { viewport: { width: 390, height: 844 } } };
const viewports = [desktop, narrow];
const dashboardViewports = [
  narrow,
  { name: 'firefox-360', use: { viewport: { width: 360, height: 800 } } },
  { name: 'firefox-430', use: { viewport: { width: 430, height: 932 } } },
  desktop,
];

const viteServer = {
  command: 'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',
  url: baseURL,
  reuseExistingServer: false,
  env: { CLERK_SECRET_KEY: '' },
};

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  workers: signedIn ? 1 : undefined,
  reporter: 'list',
  use: {
    browserName: 'firefox',
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    ...viewports.map(project => ({ ...project, testIgnore: [setup, walkthrough] })),
    ...(signedIn ? [
      { name: 'clerk-setup', testMatch: setup, use: { trace: 'off', screenshot: 'off' } },
      ...dashboardViewports.map(project => ({
        name: `dashboard-${project.name}`,
        testMatch: walkthrough,
        dependencies: ['clerk-setup'],
        use: { ...project.use, actionTimeout: 10_000, trace: 'off', storageState: sessionFile('premium') },
      })),
    ] : []),
  ],
  webServer: development ? [
    {
      command: 'node server.js',
      cwd: development.serverDirectory,
      url: `${development.apiURL}/health`,
      reuseExistingServer: false,
      env: { EMAIL_ENABLED: 'false', CLIENT_URL: baseURL },
    },
    viteServer,
  ] : viteServer,
});
