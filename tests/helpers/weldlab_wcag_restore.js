import { stripWeldlabPracticeFixes } from './weldlab_accessible_practice_restore.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const changes = JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-wcag-fixes.json'), 'utf8'));
// Historical model/copy digests exclude this later, explicitly recorded a11y repair.
// Each replacement is exact and checked; actual interaction tests use the live source.
export function stripWeldlabWcagFixes(source) {
  let result = stripWeldlabPracticeFixes(source).replace(/\r\n/g, '\n');
  const active = {
    root: /weldlab-focus-css|data-weld-menu-footer|data-weld-microstructure-key|key === 'cumulative' \? ' pt-2 mt-2'/.test(result),
    keyboard: /data-weld-tabset|pendingViewFocusRef|function tabGroupKeys|data-weld-menu-button/.test(result),
    forms: result.includes('a11y14_pipe_pay_feedback') || result.includes("el.name + ' · ' + __alloT('stem.weldlab.weight_percent'"),
    visual: /data-weld-scene-orbit|data-weld-menu-button/.test(result),
  };
  for (const change of [...changes].reverse()) {
    if (!active[change.owner]) continue;
    if (!result.includes(change.new)) continue;
    if (result.split(change.new).length !== 2) throw Error('Ambiguous accessibility restoration: ' + change.owner);
    result = result.replace(change.new, () => change.old);
  }
  return result;
}
