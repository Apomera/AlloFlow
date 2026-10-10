import base from '../solar-seasons-observer-enhancement-2026-10-06/deferred-jsdom.vitest.config.mjs';
import { fileURLToPath } from 'node:url';
export default { ...base, test: { ...base.test,
  include: ['tests/solar_system_gravity_inspection_chart.test.js', 'tests/solar_system_gravity_drop_lab.test.js', 'tests/solar_system_comparison_scale_navigation.test.js'],
  testTimeout: 600000, hookTimeout: 900000,
  setupFiles: process.env.SOLAR_UNIT_CASE === 'unit-model' ? [] : base.test.setupFiles,
  outputFile: { json: fileURLToPath(new URL('./' + (['unit-chart', 'unit-model', 'unit-comparison'].includes(process.env.SOLAR_UNIT_CASE) ? process.env.SOLAR_UNIT_CASE : 'unit') + '-results.json', import.meta.url)) },
} };
