import { defineConfig } from '@playwright/test';
import base from '../../playwright.config';

// Keep trace and screenshot diagnostics while avoiding video encoder overhead.
export default defineConfig({
  ...base,
  testDir: '../../tests/e2e',
  use: { ...base.use, video: 'off' },
});
