import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// The raster suite saves its own native pixel evidence and PNGs. Avoid recording
// thousands of additional trace steps while retaining every assertion and budget.
export default defineConfig({ ...base, use: { ...base.use, trace: 'off' } });
