import fs from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const gate = require('../dev-tools/check_ui_strings_drift.cjs');

// ui_strings.js overrides the fallback in t('key', 'fallback'), and the STEM render harness
// supplies no ui_strings — it renders fallbacks. So every assertion elsewhere in this suite
// about a tool's wording is blind to what students actually read. This is the runner for
// dev-tools/check_ui_strings_drift.cjs, so the gate cannot rot unexecuted.
describe('ui_strings ships the reviewed fallback wording', () => {
  const { checked, drift } = gate.scan();
  const allowed = gate.loadBaseline();
  const shipped = fs.readFileSync('ui_strings.js', 'utf8');

  it('compares a meaningful number of localized strings', () => {
    // Guards against the scan silently matching nothing after a refactor.
    expect(checked).toBeGreaterThan(5000);
  });

  it('has no unbaselined divergence between shipped copy and source fallbacks', () => {
    const unexpected = drift
      .filter((d) => !(d.id in allowed))
      .map((d) => `${d.id}\n    ships   : ${d.shipped.slice(0, 120)}\n    fallback: ${d.fallback.slice(0, 120)}`);
    expect(unexpected).toEqual([]);
  });

  it('keeps the burn-safety and accuracy wording that reviews put in place', () => {
    // The concrete regressions this gate was built for: each of these shipped long after the
    // source had been corrected, because only the fallback was edited.
    expect(shipped).not.toContain('GO — Excellent conditions for cultural burning');
    expect(shipped).not.toContain('NO-GO — Conditions unsafe for burning');
    expect(shipped).not.toContain('Frameshifts (insertion/deletion) are usually catastrophic');
    expect(shipped).not.toContain('Sutures (coronal, sagittal, lambdoid) fuse by age 2');
    expect(shipped).not.toContain('High fuel + drought + suppression = catastrophic event.');
  });
});
