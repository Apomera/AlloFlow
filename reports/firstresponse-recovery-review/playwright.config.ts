import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import software from '../firstresponse-depth-comparison/playwright-software.config';
export default defineConfig(software,{outputDir:resolve(process.cwd(),'reports/firstresponse-recovery-review/browser-artifacts')});
