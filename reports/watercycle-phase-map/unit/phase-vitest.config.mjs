import { fileURLToPath } from 'node:url';

export default {
  test: {
    environment: 'node',
    pool: 'forks',
    maxWorkers: 1,
    fileParallelism: false,
    setupFiles: [fileURLToPath(new URL('./ssr-node-setup.mjs', import.meta.url))],
    include: [
      'tests/watercycle_phase_map.test.js',
      'tests/watercycle_process_compare.test.js',
      'tests/watercycle_matter_energy.test.js',
    ],
  },
};
