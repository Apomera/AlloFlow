import { defineConfig } from 'vitest/config';
import base from './followup.vitest.config.js';
export default defineConfig({ test: { ...base.test, include: base.test.include.filter(file => /mailbox_|class_mailbox|session_transport/.test(file)) } });
