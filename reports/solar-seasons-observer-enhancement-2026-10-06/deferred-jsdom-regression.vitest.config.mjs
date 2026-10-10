import { fileURLToPath } from 'node:url';
import base from './deferred-jsdom.vitest.config.mjs';
export default {...base,test:{...base.test,
  include:['tests/solar_system_seasons_lab.test.js','tests/solar_system_visual_science.test.js','tests/solar_system_themed_color_safety.test.js','tests/solar_system_science_trust.test.js','tests/solar_system_learning_journey.test.js','tests/solar_system_investigation_hub.test.js'],
  outputFile:{json:fileURLToPath(new URL('./unit-regression-results.json',import.meta.url))}
}};
