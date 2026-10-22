import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// check_stem_i18n_registration.cjs existed from 2026-09-22 but no gate ran it,
// so unregistered STEM keys grew from 485 to 2,374 unseen (machinelab 943,
// spacestation 538). It also skipped camelCase namespaces and double-quoted keys.

const PACKAGE = process.env.STEM_I18N_GATE_PACKAGE || 'package.json';

describe('STEM i18n registration gate', () => {
  it('verify:gate runs it', () => {
    const gate = JSON.parse(readFileSync(PACKAGE, 'utf8')).scripts['verify:gate'];
    expect(gate.includes('node dev-tools/check_stem_i18n_registration.cjs'), 'verify:gate no longer runs the STEM i18n registration ratchet').toBe(true);
  });

  it('detects complete missing keys while ignoring computed prefixes, including comments and both quote styles', () => {
    const run = spawnSync(process.execPath, ['dev-tools/check_stem_i18n_registration.cjs', '--selftest'], { encoding: 'utf8' });
    expect(run.status, run.stdout + run.stderr).toBe(0);
    expect(run.stdout.includes('camelCase + double quotes seen'), run.stdout).toBe(true);
    expect(run.stdout.includes('computed prefixes ignored'), run.stdout).toBe(true);
    expect(run.stdout.includes('complete commented keys CAUGHT'), run.stdout).toBe(true);
  });
});
