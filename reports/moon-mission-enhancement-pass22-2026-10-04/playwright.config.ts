import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import base from '../../playwright.config';

export default defineConfig({ ...base, testDir: resolve(__dirname, '../../tests/e2e'), workers: 1, retries: 0,
  use: { ...base.use, video: 'off', launchOptions: { ...base.use?.launchOptions, slowMo: 100 } },
});
