import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const fixture = JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-ut-flight-baseline.json'), 'utf8'));
const HOOK = '        var utFlightState = useState(0);\n';

// Normalize only this round's UT illustration changes before older byte hashes.
// The original renderer is a durable fixture, never a temporary workspace file.
export function restoreUtFlight(source) {
  let result = source.replace(/\r\n/g, '\n');
  if (!result.includes(HOOK)) return result;
  const start = result.indexOf('        function utFlightPoint() {');
  const demo = result.indexOf('        function demoUt() {', start);
  const end = result.indexOf('        function demoRt() {', demo);
  if (start < 0 || demo < 0 || end < 0) throw new Error('UT flight preservation boundaries changed');
  result = result.slice(0, start) + fixture.originalDemoUt + result.slice(end);
  for (const addition of [HOOK, '              renderUtFlightControls(),\n', "'data-ut-flight-workspace': '', "]) {
    if (result.split(addition).length !== 2) throw new Error('UT flight preservation addition count changed');
    result = result.replace(addition, '');
  }
  return result;
}

export const UT_FLIGHT_BASELINE = fixture;
