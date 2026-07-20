// Host↔module seam contracts (2026-07-20). Runs the real gate script: every
// parsable `_m.fn(args…)` forward in AlloFlowANTI.txt must agree with the
// module source's parameter shape (required–total range, rest-aware). This is
// the playSequence-class bug (deps landed in contentId) turned into a gate.
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('wrapper contracts', () => {
  it('every parsable host↔module seam agrees on arity', () => {
    const out = execFileSync('node', [path.join(ROOT, 'dev-tools', 'check_wrapper_contracts.cjs')], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(out).toContain('✓ check_wrapper_contracts');
    // Coverage floor: if parsing regresses (pattern drift, renamed sources),
    // checked seams silently dropping is itself a failure.
    const checked = Number((out.match(/checked: (\d+)/) || [])[1] || 0);
    expect(checked).toBeGreaterThanOrEqual(55);
  });
});
