import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stripWeldlabNavigationFixes } from './weldlab_accessible_navigation_restore.js';
const changes = JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-accessible-milestone-fixes.json'), 'utf8'));
// Runtime checks use current source; historical digest checks reverse only recorded repairs.
export function stripWeldlabMilestoneFixes(source) {
  let result = stripWeldlabNavigationFixes(source);
  for (const change of [...changes].reverse()) {
    if (!result.includes(change.new)) continue;
    if (result.split(change.new).length !== 2) throw Error('Ambiguous milestone restoration: ' + change.owner);
    result = result.replace(change.new, () => change.old);
  }
  return result;
}
