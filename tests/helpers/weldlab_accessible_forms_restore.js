import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stripWeldlabCoverageFixes } from './weldlab_accessible_coverage_restore.js';

const baseline = JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-accessible-forms-baseline.json'), 'utf8'));

// Undo only this forms pass, using durable exact snippets rather than scratch files.
export function stripAccessibleForms(source) {
  let result = stripWeldlabCoverageFixes(source).replace(/\r\n/g, '\n');
  if (!result.includes('a11y14_pipe_pay_feedback')) return result;
  for (const { old: original, new: replacement } of [...baseline.replacements].reverse()) {
    if (result.split(replacement).length !== 2) throw new Error('Unexpected accessible forms restoration count');
    result = result.replace(replacement, () => original);
  }
  return result;
}

export const accessibleFormsBaseline = baseline.regions;
