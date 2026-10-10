export default { test: {
  environment: 'node',
  setupFiles: ['C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-3/universe-flyby-detours60/detours-node-setup.mjs'],
  include: ['tests/universe_flight_detours.test.js', 'tests/universe_flight_physics.test.js'],
  globals: false,
  isolate: false,
  fileParallelism: false,
  testTimeout: 600000,
  hookTimeout: 600000,
} };
