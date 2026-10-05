import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import base from '../../playwright.config';

// Local harness verification retains failure traces and screenshots. Video
// encoding is unnecessary for these deterministic measurements and captures.
export default defineConfig({
  ...base,
  testDir: resolve(__dirname, '../../tests/e2e'),
  workers: 1,
  retries: 0,
  use: { ...base.use, video: 'off' },
});
