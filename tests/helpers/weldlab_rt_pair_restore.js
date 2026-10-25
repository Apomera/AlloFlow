import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const baseline = JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-rt-pair-baseline.json'), 'utf8'));
export function stripRtAnglePair(source) {
  let result = source.replace(/\r\n/g, '\n');
  const hook = '        var rtPairState = useState({ a: 0, b: 45 });\n';
  if (!result.includes(hook)) return result;
  const start = result.indexOf('        function demoRt(angleProbe) {');
  const end = result.indexOf('        var PT_STEPS =', start);
  if (start < 0 || end < start) throw new Error('Missing RT pair boundaries');
  result = result.slice(0, start) + baseline.originalDemoRt + result.slice(end);
  for (const addition of [hook, ',\n              renderRtAnglePair()']) {
    if (result.split(addition).length !== 2) throw new Error('Unexpected RT pair preservation count');
    result = result.replace(addition, '');
  }
  return result;
}
