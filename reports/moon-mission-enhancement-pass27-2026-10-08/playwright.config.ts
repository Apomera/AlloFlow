import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
export default defineConfig({ testDir:resolve(__dirname,'../../tests/e2e'), workers:1, retries:0, timeout:180000, fullyParallel:false, use:{viewport:{width:1100,height:1000},trace:'off',video:'off',screenshot:'only-on-failure',actionTimeout:20000,navigationTimeout:60000}, expect:{timeout:15000}, projects:[{name:'chromium',use:{browserName:'chromium'}}] });
