import base from '../solar-seasons-observer-enhancement-2026-10-06/deferred-jsdom.vitest.config.mjs';
import {fileURLToPath} from 'node:url';
export default {...base,test:{...base.test,include:['tests/solar_system_gravity_inspection_chart.test.js','tests/solar_system_gravity_drop_lab.test.js','tests/solar_system_activity_context.test.js'],testTimeout:600000,hookTimeout:900000,outputFile:{json:fileURLToPath(new URL('./'+process.env.SOLAR_UNIT_CASE+'-results.json',import.meta.url))}}};
