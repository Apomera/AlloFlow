import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import base from '../../playwright.config';

// Keep failure traces and screenshots, but avoid video encoding during the
// focused follow-up after a browser-context teardown timed out on this host.
export default defineConfig({
  ...base,
  testDir: resolve(process.cwd(), 'tests/e2e'),
  use: { ...base.use, video: 'off' },
});
