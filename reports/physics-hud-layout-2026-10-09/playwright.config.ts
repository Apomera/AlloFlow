import { defineConfig } from '@playwright/test';
import base from '../../playwright.config';

export default defineConfig({
  ...base,
  testDir: '../../tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: { ...base.use, video: 'off' },
});
