export default { test: {
  environment: 'node',
  include: ['tests/universe_flight_pair_frame.test.js', 'tests/universe_flight_inspector.test.js'],
  globals: false,
  isolate: false,
  fileParallelism: false,
  testTimeout: 30000,
  hookTimeout: 30000,
} };
