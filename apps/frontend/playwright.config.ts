import { defineConfig } from '@playwright/test';

const BACKEND_PORT = 3002;
const FRONTEND_PORT = 3003;

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  retries: 0,
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    headless: true,
  },
  webServer: [
    {
      command: `PORT=${BACKEND_PORT} npm run start:dev -w @referral-system/backend`,
      cwd: '../..',
      url: `http://localhost:${BACKEND_PORT}/api`,
      reuseExistingServer: true,
      timeout: 60000,
    },
    {
      command: `PORT=${FRONTEND_PORT} NEXT_PUBLIC_API_URL=http://localhost:${BACKEND_PORT}/api npm run dev -w @referral-system/frontend`,
      cwd: '../..',
      url: `http://localhost:${FRONTEND_PORT}`,
      reuseExistingServer: true,
      timeout: 60000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
