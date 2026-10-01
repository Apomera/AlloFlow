import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import base from '../../playwright.config';

export default defineConfig({
  ...base,
  testDir: resolve(process.cwd(), 'tests/e2e'),
  use: { ...base.use, video: 'off' },
});
