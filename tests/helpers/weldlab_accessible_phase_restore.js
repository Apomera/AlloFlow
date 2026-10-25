import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const changes = JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-accessible-phase-fixes.json'), 'utf8'));
// Runtime tests use live production code. Only historical source checks reverse later repairs.
export function stripWeldlabPhaseFixes(source) {
  let result = source.replace(/\r\n/g, '\n');
  for (const change of [...changes].reverse()) {
    if (!result.includes(change.new)) continue;
    if (result.split(change.new).length !== 2) throw Error('Ambiguous phase restoration: ' + change.owner);
    result = result.replace(change.new, () => change.old);
  }
  return result;
}
