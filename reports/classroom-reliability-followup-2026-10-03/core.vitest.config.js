import { defineConfig } from 'vitest/config';
import base from './followup.vitest.config.js';
export default defineConfig({ test: { ...base.test, include: base.test.include.filter(file => file.startsWith('reports/') || /classroom_|history_reload|report_storage_mixed|utils_pure_storage/.test(file)) } });
