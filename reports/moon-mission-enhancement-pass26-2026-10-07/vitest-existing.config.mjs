import {defineConfig} from 'vitest/config';
export default defineConfig({test:{environment:'node',setupFiles:['reports/moon-mission-enhancement-pass26-2026-10-07/deferred-jsdom.setup.mjs'],include:['tests/moonmission_descent_dust.test.js','tests/moonmission_descent_surface.test.js'],pool:'threads',maxWorkers:1,fileParallelism:false,testTimeout:60000,hookTimeout:180000}});
