import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const fixture = JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-posture-baseline.json'), 'utf8'));
const HOOK = '        var postureCaseState = useState(0);\n';

// Remove only the additive posture board before older preservation hashes.
// The five authored records retain their original bytes in a durable fixture.
export function restorePostureStudy(source) {
  let result = source.replace(/\r\n/g, '\n');
  if (!result.includes(HOOK)) return result;
  const start = result.indexOf('        var POSTURE_CASES = ');
  const end = result.indexOf('        var content;\n', start);
  if (start < 0 || end < start || !result.slice(start, end).includes('        function renderPostureStudy() {')) throw new Error('Posture preservation boundaries changed');
  result = result.slice(0, start) + result.slice(end);
  for (const addition of [HOOK, '            renderPostureStudy(),\n']) {
    if (result.split(addition).length !== 2) throw new Error('Posture preservation addition count changed');
    result = result.replace(addition, '');
  }
  const reference = '              POSTURE_CASES.map(function(p, i) {';
  if (result.split(reference).length !== 2) throw new Error('Posture original-row reference changed');
  return result.replace(reference, () => fixture.originalArray + '.map(function(p, i) {');
}

export const POSTURE_BASELINE = fixture;
