import base from '../solar-seasons-observer-enhancement-2026-10-06/deferred-jsdom.vitest.config.mjs';

export default {
  ...base,
  test: {
    ...base.test,
    include: ['tests/solar_system_comparison_scale_navigation.test.js', 'tests/solar_system_comparison_bench.test.js'],
    testTimeout: 600000,
    hookTimeout: 900000,
    reporters: ['verbose', 'json'],
    outputFile: { json: 'reports/solar-comparison-scale-enhancement-2026-10-07/unit-results.json' },
  },
};
