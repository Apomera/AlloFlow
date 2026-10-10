export default { test: {
  environment: 'jsdom',
  include: ['tests/universe_flight_physics.test.js','tests/universe_flight_dust.test.js','tests/universe_flight_cloud_surfaces.test.js','tests/universe_flight_nebula_detail.test.js','tests/universe_flight_landmark_browser.test.js','tests/universe_flight_pair_guidance.test.js', 'tests/universe_flight_pair_frame.test.js', 'tests/universe_flight_inspector.test.js', 'tests/universe_flight_pair_layout.test.js'],
  globals: false,
  isolate: false,
  fileParallelism: false,
  testTimeout: 30000,
  hookTimeout: 30000,
} };
