import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Isolated runner for this pass. The standard node environment acknowledges
// worker startup before the official jsdom setup runs in the setup file.
export default defineConfig({
  root: fileURLToPath(new URL('../../', import.meta.url)),
  test: {
    environment: 'node',
    setupFiles: [fileURLToPath(new URL('./deferred-jsdom.setup.mjs', import.meta.url))],
    include: ['tests/solar_system_seasons_observer.test.js'],
    globals: false,
    fileParallelism: false,
    maxWorkers: 1,
    pool: 'threads',
    testTimeout: 180000,
    hookTimeout: 180000,
    reporters: ['verbose', 'json'],
    outputFile: {
      json: fileURLToPath(new URL('./unit-deferred-jsdom.json', import.meta.url)),
    },
  },
});
