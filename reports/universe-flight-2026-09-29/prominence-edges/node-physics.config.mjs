// Diagnostic only: run the unchanged math assertions without jsdom or the
// repository's browser setup. This does not verify the full DOM unit suite.
export default {
  test: {
    environment: 'node',
    setupFiles: ['./reports/universe-flight-2026-09-29/prominence-edges/node-physics-setup.js'],
    include: ['tests/universe_flight_physics.test.js'],
    globals: false,
  },
};
