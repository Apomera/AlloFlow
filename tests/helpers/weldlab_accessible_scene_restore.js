import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stripWeldlabCoverageFixes } from './weldlab_accessible_coverage_restore.js';

const fixture = JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-accessible-scene-baseline.json'), 'utf8'));

// Restore only the camera click alternatives and the menu contrast adjustment.
// Older scope hashes can continue to pin the existing scene, simulation and UI.
export function restoreAccessibleScene(source) {
  let restored = stripWeldlabCoverageFixes(source).replace(/\r\n/g, '\n');
  for (const change of fixture.changes.slice().reverse()) {
    const newCount = restored.split(change.new).length - 1;
    if (!newCount) continue;
    if (newCount !== 1) throw new Error('Accessible scene replacement count changed: ' + change.id);
    restored = restored.replace(change.new, () => change.old);
  }
  return restored;
}

export const ACCESSIBLE_SCENE_BASELINE = fixture;
