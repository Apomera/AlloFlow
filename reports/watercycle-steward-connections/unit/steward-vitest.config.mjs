import { fileURLToPath } from 'node:url';

export default {
  test: {
    environment: 'node',
    pool: 'forks',
    maxWorkers: 1,
    fileParallelism: false,
    setupFiles: [fileURLToPath(new URL('./ssr-node-setup.mjs', import.meta.url))],
    include: [
      'tests/watercycle_steward_connections.test.js',
      'tests/watercycle_steward_decisions.test.js',
      'tests/watercycle_steward_history.test.js',
    ],
  },
};
