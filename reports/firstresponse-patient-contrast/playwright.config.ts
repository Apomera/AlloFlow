import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import software from '../firstresponse-depth-comparison/playwright-software.config';

export default defineConfig(software, {
  testMatch: '**/firstresponse-patient-contrast.spec.ts', workers: 1, retries: 0,
  outputDir: resolve(process.cwd(), 'reports/firstresponse-patient-contrast/browser-artifacts'),
});
