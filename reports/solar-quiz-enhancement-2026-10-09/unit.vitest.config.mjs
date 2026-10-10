import base from '../solar-seasons-observer-enhancement-2026-10-06/deferred-jsdom.vitest.config.mjs';
import { fileURLToPath } from 'node:url';
export default { ...base, test: { ...base.test,
  include: ['tests/solar_system_quiz_workbench.test.js', 'tests/stem_position_bias_fixes.test.js'],
  testTimeout: 600000, hookTimeout: 900000,
  outputFile: { json: fileURLToPath(new URL('./' + process.env.SOLAR_UNIT_CASE + '-results.json', import.meta.url)) },
} };
