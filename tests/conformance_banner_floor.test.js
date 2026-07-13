// Conformance banner floored with the byte validator (audit #18, 2026-06-15). The headline
// Conformant/Non-Conformant verdict was computed only from the IN-MEMORY HTML self-check and never
// reconciled with the independent byte-level validator run on the shipped bytes — so a byte-level
// FAIL (e.g. a subtree dropped at save) could still show green "Conformant" while the lower
// byte-validation section reported failure. Now the banner takes the worse verdict.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// Mirror of the floor logic.
function bannerLabel(inMemoryFail, pev) {
  let label = inMemoryFail === 0 ? 'Conformant' : (inMemoryFail <= 2 ? 'Mostly Conformant' : 'Non-Conformant');
  const s = pev && pev.summary;
  if (s && s.overall === 'FAIL' && label === 'Conformant') {
    const f = typeof s.fail === 'number' ? s.fail : 3;
    label = f > 2 ? 'Non-Conformant (shipped-file check)' : 'Mostly Conformant (shipped-file check)';
  }
  return label;
}

describe('conformance banner is floored with the shipped-file validator', () => {
  it('a clean in-memory check + byte FAIL no longer reads green "Conformant"', () => {
    expect(bannerLabel(0, { summary: { overall: 'FAIL', fail: 4 } })).toBe('Non-Conformant (shipped-file check)');
    expect(bannerLabel(0, { summary: { overall: 'FAIL', fail: 1 } })).toBe('Mostly Conformant (shipped-file check)');
  });
  it('a clean in-memory check + byte PASS stays Conformant', () => {
    expect(bannerLabel(0, { summary: { overall: 'PASS', fail: 0 } })).toBe('Conformant');
    expect(bannerLabel(0, null)).toBe('Conformant');
  });
  it('never UPGRADES — an in-memory Non-Conformant stays Non-Conformant even if byte passes', () => {
    expect(bannerLabel(5, { summary: { overall: 'PASS', fail: 0 } })).toBe('Non-Conformant');
  });

  it('anti-drift: the floor is wired into the banner computation', () => {
    expect(src).toContain("if (hasChecks && _pevSum && _pevSum.overall === 'FAIL' && conformanceLabel === 'Conformant') {");
    expect(src).toContain("conformanceLabel = _byteFail > 2 ? 'Non-Conformant (shipped-file check)' : 'Mostly Conformant (shipped-file check)';");
  });
});
