import { stripWeldlabPhaseFixes } from './weldlab_accessible_phase_restore.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const changes = JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-accessible-diagram-fixes.json'), 'utf8'));
// Only historical lesson preservation checks remove these later repairs.
// Runtime tests always load production source without restoration.
export function stripWeldlabDiagramFixes(source) {
  let result = stripWeldlabPhaseFixes(source).replace(/\r\n/g, '\n');
  for (const change of [...changes].reverse()) {
    if (!result.includes(change.new)) continue;
    if (result.split(change.new).length !== 2) throw Error('Ambiguous diagram restoration: ' + change.owner);
    result = result.replace(change.new, () => change.old);
  }
  return result;
}
