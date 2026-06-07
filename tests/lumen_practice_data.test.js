// Lumen SYNTHETIC PRACTICE-DATA generator + its honesty guards.
//
// The "generate sample data" feature is an integrity hazard for an HONESTY
// instrument: fabricated points must never pose as observed (L0) data, and must
// never reach a defensible IEP export. These tests pin both halves —
//   (a) the generator: deterministic, re-rollable, clamped, scenario-shaped;
//   (b) the guards: synthetic stamp + fail-safe flag, SYN provenance (out of
//       LEVELS), export watermark on HTML+CSV, a hard IEP-team export block,
//       and exclusion from the AI context + claim hash (display/provenance only).

import { describe, it, expect } from 'vitest';
import * as LumenMod from '../stem_lab/stem_tool_lumen.js';

const L = LumenMod.default || LumenMod;

function compFrom(rows) {
  const c = L.makeCompendium('WCPM', 'words/min');
  rows.forEach((r) => L.addObservation(c, r));
  return c;
}

describe('Lumen practice data — generator', () => {
  it('is deterministic for a fixed seed and diverges on re-roll', () => {
    const a = L.generatePracticeData({ scenario: 'improving', n: 10, seed: 'demo-1' });
    const b = L.generatePracticeData({ scenario: 'improving', n: 10, seed: 'demo-1' });
    const c = L.generatePracticeData({ scenario: 'improving', n: 10, seed: 'demo-2' });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(c));
  });

  it('emits kernel-consumable rows that round-trip to a non-throwing claim', () => {
    const rows = L.generatePracticeData({ scenario: 'improving', n: 10, seed: 'rt' });
    rows.forEach((r) => {
      expect(typeof r.x).toBe('number');
      expect(typeof r.y).toBe('number');
      expect(r.phase === null || typeof r.phase === 'string').toBe(true);
      expect(Number.isNaN(r.x) || Number.isNaN(r.y)).toBe(false);
    });
    const claim = L.deriveTrendClaim(compFrom(rows), {});
    expect(claim.refused).toBeFalsy();
  });

  it('respects n exactly and clamps to the [3,60] range (never below the n<3 refuse floor)', () => {
    [3, 10, 25].forEach((n) => expect(L.generatePracticeData({ n: n, seed: 'n' }).length).toBe(n));
    expect(L.generatePracticeData({ n: 1, seed: 'n' }).length).toBe(3);
    expect(L.generatePracticeData({ n: 999, seed: 'n' }).length).toBe(60);
    expect(L.generatePracticeData().length).toBeGreaterThanOrEqual(3);
  });

  it("'improving' trends up, 'declining' trends down, 'flat' straddles zero", () => {
    const up = L.deriveTrendClaim(compFrom(L.generatePracticeData({ scenario: 'improving', n: 12, seed: 'u' })), {});
    const dn = L.deriveTrendClaim(compFrom(L.generatePracticeData({ scenario: 'declining', n: 12, seed: 'd' })), {});
    const fl = L.deriveTrendClaim(compFrom(L.generatePracticeData({ scenario: 'flat', n: 12, seed: 'f' })), {});
    expect(up.estimate.slope).toBeGreaterThan(0);
    expect(dn.estimate.slope).toBeLessThan(0);
    expect(fl.estimate.interval[0]).toBeLessThanOrEqual(0);
    expect(fl.estimate.interval[1]).toBeGreaterThanOrEqual(0);
  });

  it('clamps every y >= 0 across all scenarios and many seeds', () => {
    Object.keys(L.PRACTICE_SCENARIOS).forEach((s) => {
      for (let seed = 0; seed < 8; seed++) {
        L.generatePracticeData({ scenario: s, n: 40, seed: s + seed }).forEach((r) => expect(r.y).toBeGreaterThanOrEqual(0));
      }
    });
  });

  it('a phased scenario emits exactly one human-style phase boundary the geometry reads', () => {
    const rows = L.generatePracticeData({ scenario: 'improving', n: 12, seed: 'p' });
    const phases = [...new Set(rows.map((r) => r.phase))];
    expect(phases.length).toBe(2);
    expect(phases.every((p) => typeof p === 'string')).toBe(true);
    const geo = L.plotGeometry(rows, L.deriveTrendClaim(compFrom(rows), {}));
    expect(geo.phaseLines.length).toBe(1);
  });
});

describe('Lumen practice data — honesty guards', () => {
  it('stamps synthetic:true on every generated row; real rows never carry it (byte-identity)', () => {
    expect(L.generatePracticeData({ n: 10, seed: 's' }).every((r) => r.synthetic === true)).toBe(true);
    const c = compFrom([{ x: 1, y: 2, phase: 'a' }]);
    expect(Object.keys(c.observations[0]).join(',')).toBe('id,x,y,phase'); // no phantom synthetic key
    expect(c.observations[0].synthetic).toBeUndefined();
  });

  it('compHasSynthetic is derived from rows and fail-safe (one fake row taints the set)', () => {
    expect(L.compHasSynthetic(compFrom(L.generatePracticeData({ n: 5, seed: 'h' })))).toBe(true);
    expect(L.compHasSynthetic(compFrom([{ x: 1, y: 2 }, { x: 2, y: 3 }]))).toBe(false);
    expect(L.compHasSynthetic(compFrom([{ x: 1, y: 2 }, { x: 2, y: 3, synthetic: true }]))).toBe(true);
  });

  it('SYN is a real grammar key but is OUT of the L0–L3 ladder', () => {
    expect(L.LEVELS).not.toContain('SYN');
    expect(L.encode('SYN').srWord).toBe('Synthetic (practice)');
    expect(L.encode('SYN').glyph).toBe('◇');
    expect(L.encode('SYN').isSynthetic).toBe(true);
  });

  it('synthetic geometry marks burn SYN, real marks stay L0', () => {
    const synC = compFrom(L.generatePracticeData({ scenario: 'improving', n: 10, seed: 'g' }));
    const realC = compFrom([{ x: 1, y: 42, phase: 'b' }, { x: 2, y: 45, phase: 'b' }, { x: 3, y: 50, phase: 'b' }, { x: 4, y: 55, phase: 't' }]);
    const synBars = L.barGeometry(synC.observations, L.deriveTrendClaim(synC, {})).bars.map((m) => m.level);
    const realBars = L.barGeometry(realC.observations, L.deriveTrendClaim(realC, {})).bars.map((m) => m.level);
    expect([...new Set(synBars)]).toEqual(['SYN']);
    expect([...new Set(realBars)]).toEqual(['L0']);
  });

  it('the data table marks synthetic rows "Synthetic (practice)", real rows unchanged', () => {
    const synC = compFrom(L.generatePracticeData({ scenario: 'improving', n: 10, seed: 't' }));
    const levels = L.dataTableModel(synC.observations, L.deriveTrendClaim(synC, {})).rows.filter((r) => r.level).map((r) => r.level);
    expect([...new Set(levels)]).toEqual(['Synthetic (practice)']);
  });

  it('blocks an iep-team export while synthetic — no signoff clears it', () => {
    expect(L.assertExportClean({ audience: 'iep-team', synthetic: true }).blocked).toBe(true);
    expect(L.assertExportClean({ audience: 'iep-team', synthetic: true, signoff: 'anything' }).blocked).toBe(true);
    expect(L.assertExportClean({ audience: 'iep-team', synthetic: false }).blocked).toBe(false);
    expect(L.assertExportClean({ audience: 'working', synthetic: true }).blocked).toBe(false); // exploration still allowed (watermarked)
    expect(L.assertExportClean({ audience: 'family', synthetic: true }).blocked).toBe(false);
  });

  it('the synthetic block ANDs with the L3 gate (combined reason)', () => {
    const g = L.assertExportClean({ audience: 'iep-team', synthetic: true, aiHyps: [{ band: 'likely', text: 'x', kind: 'effect', rank: 1 }] });
    expect(g.blocked).toBe(true);
    expect(g.reason).toMatch(/synthetic/i);
    expect(g.reason).toMatch(/AI reading|own it/i);
  });

  it('buildExportHtml burns an un-launderable SYNTHETIC marker; real export has none', () => {
    const synC = compFrom(L.generatePracticeData({ scenario: 'improving', n: 10, seed: 'hx' }));
    const realC = compFrom([{ x: 1, y: 42 }, { x: 2, y: 45 }, { x: 3, y: 50 }]);
    const synH = L.buildExportHtml(synC, L.deriveTrendClaim(synC, {}), { audience: 'working', synthetic: true });
    const realH = L.buildExportHtml(realC, L.deriveTrendClaim(realC, {}), { audience: 'working' });
    expect(synH.html).toMatch(/SYNTHETIC/);
    expect(synH.html).toMatch(/not a real student/i);
    expect(synH.filename).toMatch(/PRACTICE/);
    expect(realH.html).not.toMatch(/SYNTHETIC/);
    expect(realH.filename).not.toMatch(/PRACTICE/);
  });

  it('buildExportCsv marks synthetic rows + filename; real CSV keeps Derived (math)', () => {
    const synC = compFrom(L.generatePracticeData({ scenario: 'improving', n: 10, seed: 'cx' }));
    const realC = compFrom([{ x: 1, y: 42 }, { x: 2, y: 45 }, { x: 3, y: 50 }]);
    const synCsv = L.buildExportCsv(synC, L.deriveTrendClaim(synC, {}), { includePII: true, synthetic: true });
    const realCsv = L.buildExportCsv(realC, L.deriveTrendClaim(realC, {}), { includePII: true });
    expect(synCsv.csv).toMatch(/SYNTHETIC/);
    expect(synCsv.csv).toMatch(/Synthetic \(practice\)/);
    expect(synCsv.csv).not.toMatch(/Derived \(math\)/);
    expect(synCsv.filename).toMatch(/SYNTHETIC/);
    expect(realCsv.csv).toMatch(/Derived \(math\)/);
    expect(realCsv.csv).not.toMatch(/SYNTHETIC/);
  });

  it('replacing synthetic data with real data clears the flag and unblocks the export', () => {
    let comp = compFrom(L.generatePracticeData({ scenario: 'improving', n: 10, seed: 'r' }));
    expect(L.compHasSynthetic(comp)).toBe(true);
    comp = compFrom([{ x: 1, y: 42, phase: 'b' }, { x: 2, y: 45, phase: 'b' }, { x: 3, y: 50, phase: 'b' }]);
    expect(L.compHasSynthetic(comp)).toBe(false);
    expect(L.buildExportHtml(comp, L.deriveTrendClaim(comp, {}), { audience: 'working', synthetic: L.compHasSynthetic(comp) }).html).not.toMatch(/SYNTHETIC/);
    expect(L.assertExportClean({ audience: 'iep-team', synthetic: L.compHasSynthetic(comp) }).blocked).toBe(false);
  });

  it('synthetic-ness never reaches the AI context or perturbs the claim hash', () => {
    const real = [{ x: 1, y: 42, phase: 'b' }, { x: 2, y: 45, phase: 'b' }, { x: 3, y: 50, phase: 't' }, { x: 4, y: 55, phase: 't' }];
    const syn = real.map((r) => Object.assign({}, r, { synthetic: true }));
    const realClaim = L.deriveTrendClaim(compFrom(real), {});
    const synClaim = L.deriveTrendClaim(compFrom(syn), {});
    expect(synClaim._hash).toBe(realClaim._hash); // display-only: identical math => identical provenance hash
    const ctx = L.buildClaimContext(compFrom(syn), synClaim);
    expect(ctx).not.toHaveProperty('synthetic');
    expect(JSON.stringify(ctx)).not.toMatch(/synthetic|practice/i);
  });
});
