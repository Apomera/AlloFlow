// Gate for dev-tools/check_label_semantics.cjs: generic t('common.*') aria-labels
// that hide visible text (WCAG 2.5.3) and names on role-less generic elements.
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const TOOL = path.join(ROOT, 'dev-tools', 'check_label_semantics.cjs');
const run = (...args) => execFileSync(process.execPath, [TOOL, ...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });

describe('label semantics gate', () => {
  it('detects both defect kinds in its own fixtures', () => {
    expect(run('--selftest')).toContain('selftest PASS');
  });
  it('finds no generic label overrides or prohibited names in app sources', () => {
    expect(run()).toContain('0 finding(s)');
  }, 120000);
});
