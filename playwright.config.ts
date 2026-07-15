import { defineConfig, devices } from '@playwright/test'

const runner = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const managedServer = process.env.E2E_MANAGED_SERVER === '1'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3137',
    trace: 'on-first-retry',
  },
  webServer: managedServer
    ? undefined
    : {
        command: `${runner} tsx scripts/start-e2e-server.ts`,
        url: 'http://127.0.0.1:3137',
        reuseExistingServer: false,
        timeout: 120_000,
      },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
