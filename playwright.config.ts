import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests',testMatch:'browser.spec.ts',fullyParallel:true,
  use:{baseURL:'http://127.0.0.1:4197',headless:true},
  webServer:{command:'bunx vite --host 127.0.0.1 --port 4197 --strictPort',url:'http://127.0.0.1:4197',reuseExistingServer:false,timeout:30000},
  reporter:'list',
});
