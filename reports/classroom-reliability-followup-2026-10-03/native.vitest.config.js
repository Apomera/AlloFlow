import { defineConfig } from 'vitest/config';
import base from './followup.vitest.config.js';
export default defineConfig({ test: { ...base.test, include: base.test.include.filter(file => /device_storage|storage_recovery|storage_security/.test(file)) } });
