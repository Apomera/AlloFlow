export default {
  resolve: { alias: { vitest: 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/node_modules/vitest/dist/index.js' } },
  test: {
    environment: 'node',
    setupFiles: ['C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-3/universe-close-projection58/node-renderer-setup.mjs'],
    include: [
      'tests/universe_flight_physics.test.js',
      'tests/universe_flight_bulges.test.js',
      'tests/universe_flight_close_disk.test.js',
    ],
    globals: false,
  },
};
