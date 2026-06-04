// Lumen golden master (Phase 0 — the reactive kernel).
//
// Pins the PURE, DOM-free kernel of stem_tool_lumen.js so the certainty
// grammar, the uncertainty-first stats, the deterministic bootstrap, the
// small-n refusal, the reactive dirty-tracking, and the prose-template
// invariant can be refactored with a safety net. A diff here means a behavior
// change — re-baseline deliberately with `vitest -u` ONLY when reviewed.
//
// Importing the module under (jsdom) only registers the tool harmlessly; these
// tests exercise its pure core (window/document access is typeof-guarded, so
// the import is also safe under a plain node environment).

import { describe, it, expect } from 'vitest';
import * as LumenMod from '../stem_lab/stem_tool_lumen.js';

const L = LumenMod.default || LumenMod;

// Worked scenario (design §15): "Reyna — ORF/WCPM", 10 weekly probes across two
// phases (a Tier-2 block starts at week 6). The 6-of-10 subset exercises the
// anti-cherry-picking subset declaration.
const REYNA = [
  { x: 1, y: 42, phase: 'baseline' }, { x: 2, y: 45, phase: 'baseline' },
  { x: 3, y: 44, phase: 'baseline' }, { x: 4, y: 48, phase: 'baseline' },
  { x: 5, y: 47, phase: 'baseline' }, { x: 6, y: 53, phase: 'tier2' },
  { x: 7, y: 58, phase: 'tier2' },    { x: 8, y: 61, phase: 'tier2' },
  { x: 9, y: 60, phase: 'tier2' },    { x: 10, y: 66, phase: 'tier2' }
];

function buildReyna(points) {
  const comp = L.makeCompendium('WCPM', 'words/min');
  const ids = points.map(p => L.addObservation(comp, p));
  return { comp, ids };
}

// Project a claim to a stable, float-safe shape for snapshots.
function projectClaim(c) {
  if (c.refused) return { id: c.id, level: c.level, n: c.n, refused: true, shownOf: c.shownOf, text: c.text };
  const e = c.estimate;
  return {
    id: c.id, level: c.level, n: c.n, shownOf: c.shownOf, small: !!c.small,
    slope: L.round2(e.slope), intercept: L.round2(e.intercept), r: L.round2(e.r),
    interval: [L.round2(e.interval[0]), L.round2(e.interval[1])],
    bootstrap: [L.round2(e.bootstrap[0]), L.round2(e.bootstrap[1])],
    text: c.text
  };
}

describe('Lumen — kernel contract', () => {
  it('exposes the pure kernel', () => {
    ['encode', 'levelWord', 'linregress', 'slopeInterval', 'bootstrapSlopeCI', 'predictY',
      'smallNStatus', 'makeCompendium', 'addObservation', 'markDirty', 'deriveTrendClaim',
      'trendSentence', 'cyrb53', 'mulberry32'].forEach(fn => expect(typeof L[fn]).toBe('function'));
    expect(L.LEVELS).toEqual(['L0', 'L1', 'L2', 'L3']); // L4 deferred to v2
    expect(L.SMALL_N).toEqual({ refuseBelow: 3, flagBelow: 8 });
  });
});

describe('Lumen — certainty grammar (design §6.4)', () => {
  it('encodes every level (snapshot)', () => {
    expect(L.LEVELS.map(lvl => L.encode(lvl))).toMatchSnapshot();
  });

  it('opacity is floored to >=0.6 for legibility on white; the level word never fades', () => {
    L.LEVELS.forEach(lvl => {
      const b = L.encode(lvl);
      expect(b.markOpacity).toBeGreaterThanOrEqual(0.6);
      expect(b.labelOpacity).toBe(1.0);
      expect(b.srWord.length).toBeGreaterThan(0);
    });
  });

  it('caution ink (amber) appears ONLY at L3; color is never the only channel', () => {
    expect(L.encode('L0').caution).toBe(false);
    expect(L.encode('L1').caution).toBe(false);
    expect(L.encode('L2').caution).toBe(false);
    expect(L.encode('L3').caution).toBe(true);
    expect(L.encode('L3').texture).toBe('hatch45'); // redundant non-color channel
    expect(L.encode('L3').glyph.length).toBeGreaterThan(0);
  });

  it('level labels are descriptive, never mastery/ability claims', () => {
    Object.keys(L.GRAMMAR).forEach(k => {
      expect(L.GRAMMAR[k].label.toLowerCase()).not.toMatch(/master|mastery|proficient|ability|expert/);
    });
  });
});

describe('Lumen — uncertainty-first stats (design §6.5)', () => {
  it('fits a known-linear series exactly', () => {
    const pts = [{ x: 0, y: 0 }, { x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 6 }];
    const fit = L.linregress(pts);
    expect(L.round2(fit.slope)).toBe(2);
    expect(L.round2(fit.intercept)).toBe(0);
    expect(L.round2(fit.r)).toBe(1);
  });

  it('every estimate carries an interval (never a bare point)', () => {
    const ci = L.slopeInterval(REYNA.map(p => ({ x: p.x, y: p.y })));
    expect(ci).not.toBeNull();
    expect(ci.lo).toBeLessThan(ci.slope);
    expect(ci.hi).toBeGreaterThan(ci.slope);
  });

  it('refuses to extrapolate beyond the observed x-range', () => {
    const pts = REYNA.map(p => ({ x: p.x, y: p.y }));
    expect(L.predictY(pts, 6).refused).toBeUndefined();       // inside range
    expect(L.predictY(pts, 20).refused).toBe(true);           // beyond range
    expect(L.predictY(pts, 20).reason).toBe('extrapolation');
  });

  it('a degenerate (zero-variance-x) fit does not fabricate a slope', () => {
    expect(L.linregress([{ x: 3, y: 1 }, { x: 3, y: 9 }]).degenerate).toBe(true);
  });
});

describe('Lumen — the small-n rule (n<3 refuse, n<8 flag) is first-class', () => {
  it('classifies n correctly', () => {
    expect(L.smallNStatus(2)).toBe('refuse');
    expect(L.smallNStatus(3)).toBe('flag');
    expect(L.smallNStatus(7)).toBe('flag');
    expect(L.smallNStatus(8)).toBe('ok');
  });

  it('n<3 emits a real, announceable refusal claim — never a silent null', () => {
    const { comp, ids } = buildReyna(REYNA.slice(0, 2));
    const c = L.deriveTrendClaim(comp, { obsIds: ids });
    expect(c.refused).toBe(true);
    expect(c.estimate).toBeNull();
    expect(c.text).toMatch(/^Derived \(math\): n=2/);
    expect(c.text).toMatch(/too few points/);
  });

  it('3<=n<8 derives a trend but flags it small', () => {
    const { comp, ids } = buildReyna(REYNA.slice(0, 5));
    const c = L.deriveTrendClaim(comp, { obsIds: ids });
    expect(c.refused).toBeUndefined();
    expect(c.small).toBe(true);
    expect(c.text).toMatch(/n=5, small/);
  });
});

describe('Lumen — determinism (bootstrap is data-seeded, design §6.5)', () => {
  it('the bootstrap interval is identical across runs', () => {
    const pts = REYNA.map(p => ({ x: p.x, y: p.y }));
    const a = L.bootstrapSlopeCI(pts, 1000, 'WCPM:reyna');
    const b = L.bootstrapSlopeCI(pts, 1000, 'WCPM:reyna');
    expect(a).toEqual(b);
  });

  it('deriving the same claim twice yields an identical provenance hash + sentence', () => {
    const r1 = buildReyna(REYNA), r2 = buildReyna(REYNA);
    const c1 = L.deriveTrendClaim(r1.comp, { id: 'c1' });
    const c2 = L.deriveTrendClaim(r2.comp, { id: 'c1' });
    expect(c1._hash).toBe(c2._hash);
    expect(c1.text).toBe(c2.text);
    expect(c1.estimate).toEqual(c2.estimate);
  });
});

describe('Lumen — reactive dirty-tracking (design §4/§5)', () => {
  it('marks a claim dirty only when an observation it depends on changes', () => {
    const { comp, ids } = buildReyna(REYNA);
    comp.claims.push(L.deriveTrendClaim(comp, { id: 'cFull', obsIds: ids }));            // all 10
    comp.claims.push(L.deriveTrendClaim(comp, { id: 'cBaseline', obsIds: ids.slice(0, 5) })); // weeks 1-5
    // a baseline-week observation changed -> both the full claim and the baseline claim are dirty
    expect(L.markDirty(comp, [ids[0]]).sort()).toEqual(['cBaseline', 'cFull']);
    // a tier-2-only observation changed -> only the full claim is dirty
    expect(L.markDirty(comp, [ids[8]])).toEqual(['cFull']);
  });
});

describe('Lumen — the prose-template invariant (the SR-channel guarantee, §6.4/§15.5)', () => {
  it('every estimate-bearing sentence leads with the level word AND names the interval + n', () => {
    const { comp } = buildReyna(REYNA);
    const c = L.deriveTrendClaim(comp, {});
    expect(c.text).toMatch(/^Derived \(math\):/); // level word first
    expect(c.text).toMatch(/95% interval/);        // statistical channel never dropped
    expect(c.text).toMatch(/n=10/);
  });

  it('a subset claim DECLARES its omission in the sentence itself (anti-cherry-picking, §4.1)', () => {
    const { comp, ids } = buildReyna(REYNA);
    const c = L.deriveTrendClaim(comp, { obsIds: ids.slice(0, 6) }); // show 6 of 10
    expect(c.shownOf).toEqual({ shown: 6, total: 10 });
    expect(c.text).toMatch(/across these 6 of 10 probes/);
  });
});

describe('Lumen — the Reyna worked scenario (golden master)', () => {
  it('full series + a 6-of-10 subset (snapshot)', () => {
    const { comp, ids } = buildReyna(REYNA);
    const full = L.deriveTrendClaim(comp, { id: 'full' });
    const subset = L.deriveTrendClaim(comp, { id: 'subset', obsIds: ids.slice(0, 6) });
    const tooFew = L.deriveTrendClaim(comp, { id: 'tooFew', obsIds: ids.slice(0, 2) });
    expect({
      full: projectClaim(full),
      subset: projectClaim(subset),
      tooFew: projectClaim(tooFew)
    }).toMatchSnapshot();
  });
});

describe('Lumen — chart geometry + data-table peer (Phase 1, §9/§15)', () => {
  const { comp } = buildReyna(REYNA);
  const claim = L.deriveTrendClaim(comp, { id: 'full' });

  it('plot geometry (snapshot)', () => {
    expect(L.plotGeometry(REYNA, claim)).toMatchSnapshot();
  });

  it('places a HUMAN-SET phase line between week 5 and 6 (never auto-inferred)', () => {
    const geo = L.plotGeometry(REYNA, claim);
    expect(geo.phaseLines.length).toBe(1);
    expect(geo.phaseLines[0].x).toBe(5.5);
    expect(geo.phaseLines[0].fromPhase).toBe('baseline');
    expect(geo.phaseLines[0].toPhase).toBe('tier2');
  });

  it('the chart and its data-table peer read the SAME points (cannot disagree)', () => {
    const geo = L.plotGeometry(REYNA, claim);
    const tbl = L.dataTableModel(REYNA, claim);
    const tblPoints = tbl.rows.filter(r => !r.boundary).map(r => ({ x: r.x, y: r.y }));
    const geoPoints = geo.points.map(p => ({ x: p.x, y: p.y }));
    expect(tblPoints).toEqual(geoPoints);
  });

  it('the SR data-table peer carries a Level column + phase-boundary row + per-segment slopes (snapshot)', () => {
    expect(L.dataTableModel(REYNA, claim)).toMatchSnapshot();
  });

  it('the chart summary names the trend, the interval, and the phase line', () => {
    const s = L.chartSummaryText(REYNA, claim);
    expect(s).toMatch(/^Trend chart\./);
    expect(s).toMatch(/95% interval/);
    expect(s).toMatch(/human-set phase line at week 5\.5/);
  });
});

describe('Lumen — AI-involvement layer guards (Phase 1, §6.1/§6.3/§6.6/§7)', () => {
  const { comp } = buildReyna(REYNA);
  const claim = L.deriveTrendClaim(comp, { id: 'full' });
  const aiCtx = L.buildClaimContext(comp, claim);

  it('the AI context is PII-free aggregate numbers (no names / no raw labelled rows)', () => {
    const json = JSON.stringify(aiCtx);
    expect(json).not.toMatch(/name|student|reyna/i);
    expect(typeof aiCtx.slope).toBe('number');
    expect(aiCtx.interval.length).toBe(2);
    expect(aiCtx).not.toHaveProperty('observations');
    expect(aiCtx).not.toHaveProperty('rows');
  });

  it('the dial gate: AI is off below L2, and there is a hard n>=8 floor', () => {
    expect(L.aiAllowed('L1', 10).allowed).toBe(false);
    expect(L.aiAllowed('L3', 6).allowed).toBe(false); // small distinctive summary -> re-id risk
    expect(L.aiAllowed('L2', 10).allowed).toBe(true);
    expect(L.aiAllowed('L3', 10).allowed).toBe(true);
  });

  it('L2 numeric-whitelist: a clean re-word passes; a fabricated figure is REJECTED', () => {
    const clean = 'Across 10 check-ins, WCPM rose about 2.68 words a week (95% interval 2.12 to 3.23).';
    expect(L.lintL2(clean, aiCtx).ok).toBe(true);
    const bad = 'WCPM improved 50% — huge, near-grade-level gains!';
    const res = L.lintL2(bad, aiCtx);
    expect(res.ok).toBe(false);
    expect(res.offending).toContain(50);
  });

  it('L3 is a ranked SET needing >=1 non-effect explanation; bands are ordinal, NEVER a percent', () => {
    const good = L.validateHypotheses([
      { text: 'The Tier-2 block reduced off-task time.', kind: 'effect', rank: 1 },
      { text: 'Practice/maturation over the weeks.', kind: 'rival', rank: 2 },
      { text: 'Regression to the mean — early weeks were low.', kind: 'null', rank: 3 }
    ]);
    expect(good.ok).toBe(true);
    expect(good.hypotheses.map(hp => hp.band)).toEqual(['More likely', 'Plausible', 'Less likely']);
    good.hypotheses.forEach(hp => expect(hp.band).not.toMatch(/%/));
    expect(good.caveat).not.toMatch(/%/);

    const effectOnly = L.validateHypotheses([
      { text: 'The intervention worked.', kind: 'effect', rank: 1 },
      { text: 'The new curriculum worked.', kind: 'effect', rank: 2 }
    ]);
    expect(effectOnly.ok).toBe(false);
    expect(effectOnly.problems.join(' ')).toMatch(/non-effect/);
  });

  it('audience faces re-project the SAME claim; the Family face PRESERVES uncertainty (snapshot)', () => {
    const small = L.deriveTrendClaim(buildReyna(REYNA.slice(0, 5)).comp, { id: 's' });
    const refused = L.deriveTrendClaim(buildReyna(REYNA.slice(0, 2)).comp, { id: 'r' });
    expect({
      working: L.faceFor(claim, 'working'),
      iepTeam: L.faceFor(claim, 'iep-team'),
      family: L.faceFor(claim, 'family'),
      familySmall: L.faceFor(small, 'family'),
      familyRefused: L.faceFor(refused, 'family')
    }).toMatchSnapshot();
    expect(L.faceFor(claim, 'family')).toMatch(/could be roughly/); // range preserved
    expect(L.faceFor(claim, 'family')).not.toMatch(/tier|percentile|grade level/i); // no jargon/overclaim to a parent
  });
});

describe('Lumen — export, FERPA gate & L3 sign-off (Phase 1, §7/§8)', () => {
  const { comp } = buildReyna(REYNA);
  const claim = L.deriveTrendClaim(comp, { id: 'full' });
  const hyps = L.validateHypotheses([
    { text: 'Tier-2 block reduced off-task time.', kind: 'effect', rank: 1 },
    { text: 'Regression to the mean — early weeks were low.', kind: 'null', rank: 2 }
  ]).hypotheses;

  it('escHtml neutralizes an injection in any exported field', () => {
    expect(L.escHtml('<script>alert(1)</script>&"\'')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;&amp;&quot;&#39;');
  });

  it('the HTML brief is XSS-safe even with a hostile variable name (the printBook lesson)', () => {
    const evil = L.makeCompendium('WCPM<img src=x onerror=alert(1)>', 'w/min');
    REYNA.forEach(p => L.addObservation(evil, p));
    const out = L.buildExportHtml(evil, L.deriveTrendClaim(evil, {}), { audience: 'iep-team' });
    expect(out.html).not.toMatch(/<img src=x onerror/);
    expect(out.html).toMatch(/&lt;img src=x onerror/);
  });

  it('an IEP-team export is BLOCKED with an unsigned AI reading; owning it unblocks; a stale sign-off re-blocks', () => {
    expect(L.assertDefensible({ audience: 'working', aiHyps: hyps, signoff: null }).blocked).toBe(false); // not gated
    expect(L.assertDefensible({ audience: 'iep-team', aiHyps: hyps, signoff: null }).blocked).toBe(true);
    const sig = L.signoffHash(hyps);
    expect(L.assertDefensible({ audience: 'iep-team', aiHyps: hyps, signoff: sig }).blocked).toBe(false);
    expect(L.assertDefensible({ audience: 'iep-team', aiHyps: hyps, signoff: 'stale-hash' }).blocked).toBe(true);
    expect(L.assertDefensible({ audience: 'iep-team', aiHyps: null, signoff: null }).blocked).toBe(false); // no L3 content
  });

  it('CSV is aggregate-only by default; identifiable rows require the FERPA opt-in', () => {
    const agg = L.buildExportCsv(comp, claim, {});
    expect(agg.csv).toMatch(/aggregate only/);
    expect(agg.csv).toMatch(/slope,2.68/);
    expect(agg.csv).not.toMatch(/^1,42/m); // no raw weekly rows leaked
    const pii = L.buildExportCsv(comp, claim, { includePII: true });
    expect(pii.csv).toMatch(/CONFIDENTIAL/);
    expect(pii.filename).toMatch(/CONFIDENTIAL/);
    expect(pii.csv).toMatch(/^1,42,baseline,Derived \(math\)/m);
  });

  it('an AI-inclusive brief carries the level word, the method, and the verify-yourself caveat', () => {
    const out = L.buildExportHtml(comp, claim, { audience: 'iep-team', aiHyps: hyps, includeAI: true });
    expect(out.maxLevel).toBe('L3');
    expect(out.html).toMatch(/AI reading \(L3\)/);
    expect(out.html).toMatch(/verify yourself/);
    expect(out.html).toMatch(/95% t-interval/);
  });
});

describe('Lumen — Sourced provenance engine (Phase 1.x, §16)', () => {
  // SYNTHETIC fixture — value 999 / source TEST is deliberately NOT a real norm.
  const SPEC = {
    kind: 'percentile', measure: 'ORF-WCPM', unit: 'words/min', grade: 4, season: 'winter', percentile: 50,
    value: 999, source: 'TEST', year: 2099, population: 'synthetic', table: 'fixture',
    locator: 'https://example.org/fixture', citation: 'Synthetic test fixture (not a real norm).', verified: true
  };
  const comp = L.makeCompendium('WCPM', 'words/min', { measure: 'ORF-WCPM', grade: 4, seasonWindow: 'winter' });
  const ref = L.makeSourceRef(SPEC, comp);
  ref.id = 'sTest';

  it('SRC is a FOURTH provenance kept OUT of the L0-L3 ladder', () => {
    expect(L.LEVELS).toEqual(['L0', 'L1', 'L2', 'L3']);
    const b = L.encode('SRC');
    expect(b.isReference).toBe(true);
    expect(b.caution).toBe(false);              // never the L3 amber
    expect(b.ink).toBe(L.DEFAULT_PALETTE.reference);
    expect(L.referenceContrastOK()).toBe(true); // teal distinct from neutral + caution
  });

  it('the curated spine ships EMPTY (no fabricated norms); selectNorm REFUSES, never warns', () => {
    expect(Object.keys(L.NORM_SPINE.cells).length).toBe(0);
    expect(L.NORM_SPINE.reviewedOn).toBeNull();
    expect(L.selectNorm(L.NORM_SPINE, comp, { grade: 4, season: 'winter', percentile: 50 }).hazard).toBe('no-cell');
    expect(L.selectNorm(L.NORM_SPINE, comp, { grade: 8, season: 'winter' }).hazard).toBe('out-of-range'); // H&T tops at G6
    expect(L.selectNorm(L.NORM_SPINE, { measure: 'maze', unit: 'words/min' }, { grade: 4, season: 'winter' }).hazard).toBe('wrong-measure');
    expect(L.selectNorm(L.NORM_SPINE, comp, { grade: 4 }).hazard).toBe('no-season'); // season never inferred
  });

  it('a benchmark cannot become a student observation, and needs a citation + matching measure', () => {
    const c2 = L.makeCompendium('WCPM', 'words/min', { measure: 'ORF-WCPM' });
    const id = L.addSourceRef(c2, L.makeSourceRef(SPEC, c2));
    expect(id).toBe('s1');
    expect(c2.sourceRefs.length).toBe(1);
    expect(c2.observations.length).toBe(0); // never pushed into observations
    expect(() => L.makeSourceRef({ value: 1, measure: 'ORF-WCPM', unit: 'words/min' }, c2)).toThrow(/citation/);
    expect(() => L.makeSourceRef({ value: 1, measure: 'maze', unit: 'words/min', citation: 'x', locator: 'https://x' }, c2)).toThrow(/measure/);
  });

  it('renderable only when verified + http(s) locator + numeric value (blocks javascript: locators)', () => {
    expect(L.sourcedRenderable(ref).ok).toBe(true);
    expect(L.sourcedRenderable(Object.assign({}, ref, { verified: false })).ok).toBe(false);
    expect(L.sourcedRenderable(Object.assign({}, ref, { locator: 'javascript:alert(1)' })).ok).toBe(false);
  });

  it('faces never blend the benchmark into the student; Family calls it a reference, not a goal', () => {
    expect(L.benchmarkChipText(ref)).toMatch(/External benchmark \(not this student\)/);
    expect(L.sourcedFace(ref, 'family')).toMatch(/not this student's goal/);
    expect(L.sourcedFace(ref, 'iep-team')).toMatch(/national reference, not an individualized goal/);
  });

  it('the unified export gate blocks an unverified/stale benchmark in an IEP-team export', () => {
    expect(L.assertExportClean({ audience: 'iep-team', sourceRefs: [Object.assign({}, ref, { verified: false })] }).blocked).toBe(true);
    expect(L.assertExportClean({ audience: 'iep-team', sourceRefs: [ref] }).blocked).toBe(false); // verified curated is clean
    const stale = {}; stale[ref.id] = 'old-hash';
    expect(L.assertExportClean({ audience: 'iep-team', sourceRefs: [ref], sourceSignoffs: stale }).blocked).toBe(true); // stale re-blocks
    expect(L.assertExportClean({ audience: 'working', sourceRefs: [Object.assign({}, ref, { verified: false })] }).blocked).toBe(false); // working never gated
    const aiHyps = L.validateHypotheses([{ text: 'a', kind: 'effect', rank: 1 }, { text: 'b', kind: 'null', rank: 2 }]).hypotheses;
    expect(L.assertExportClean({ audience: 'iep-team', aiHyps: aiHyps, signoff: null, sourceRefs: [ref] }).blocked).toBe(true); // still ANDs the L3 gate
  });
});

describe('Lumen — Sourced rendering integration + the no-external-data invariant (§16.5/§16.6)', () => {
  const comp = L.makeCompendium('WCPM', 'words/min', { measure: 'ORF-WCPM', grade: 4, seasonWindow: 'winter' });
  REYNA.forEach(p => L.addObservation(comp, p));
  const claim = L.deriveTrendClaim(comp, {});
  const ref = L.makeSourceRef({
    kind: 'percentile', measure: 'ORF-WCPM', unit: 'words/min', grade: 4, season: 'winter', percentile: 50,
    value: 75, source: 'TEST', year: 2099, population: 'synthetic',
    locator: 'https://example.org/fixture', citation: 'Synthetic test fixture (not a real norm).', verified: true
  }, comp);
  ref.id = 's1';

  it('EMPTY sourceRefs leaves plotGeometry / dataTableModel BYTE-IDENTICAL (the no-external-data default)', () => {
    const g0 = L.plotGeometry(comp.observations, claim, undefined);
    const g1 = L.plotGeometry(comp.observations, claim, undefined, []);
    expect(g1.refLines).toBeUndefined();
    expect(JSON.stringify(g0)).toBe(JSON.stringify(g1));
    expect(JSON.stringify(L.dataTableModel(comp.observations, claim)))
      .toBe(JSON.stringify(L.dataTableModel(comp.observations, claim, [])));
    expect(L.LEVELS).toEqual(['L0', 'L1', 'L2', 'L3']); // SRC never enters LEVELS
  });

  it('a verified benchmark renders as a no-marker reference line + a worded SR/table peer', () => {
    const geo = L.plotGeometry(comp.observations, claim, undefined, [ref]);
    expect(geo.refLines.length).toBe(1);
    expect(geo.refLines[0].dPath).toMatch(/^M /);   // a horizontal line, not a point
    expect(geo.refLines[0].verified).toBe(true);
    expect(geo.y1).toBeGreaterThanOrEqual(75);      // window expanded to include the 75 benchmark (no clip)
    const tbl = L.dataTableModel(comp.observations, claim, [ref]);
    const refRows = tbl.rows.filter(r => r.reference);
    expect(refRows.length).toBe(1);
    expect(refRows[0].label).toMatch(/External benchmark \(not this student\).*\[verified\]/);
    expect(tbl.summary).toMatch(/External benchmark \(not this student\)/);
  });

  it('an UNVERIFIED benchmark does NOT render (no line, no row) — only verified renders in v1', () => {
    const unver = Object.assign({}, ref, { verified: false });
    expect(L.plotGeometry(comp.observations, claim, undefined, [unver]).refLines).toBeUndefined();
    expect(L.dataTableModel(comp.observations, claim, [unver]).rows.filter(r => r.reference).length).toBe(0);
  });

  it('exports carry a References section / reference row (scheme-safe, XSS-safe)', () => {
    const html = L.buildExportHtml(comp, claim, { audience: 'iep-team', sourceRefs: [ref] }).html;
    expect(html).toMatch(/External references/);
    expect(html).toMatch(/not this student's measured data or individualized goals/);
    expect(html).toMatch(/href="https:\/\/example\.org\/fixture"/);
    expect(html).not.toMatch(/<script/);
    const csv = L.buildExportCsv(comp, claim, { sourceRefs: [ref] }).csv;
    expect(csv).toMatch(/external references/);
    expect(csv).toMatch(/^reference,/m);
    // a no-refs export is unchanged (no References section)
    expect(L.buildExportHtml(comp, claim, { audience: 'iep-team' }).html).not.toMatch(/External references/);
  });
});

describe('Lumen — bar chart type (multi-pathway visualization)', () => {
  const { comp } = buildReyna(REYNA);
  const claim = L.deriveTrendClaim(comp, { id: 'full' });

  it('bar geometry (snapshot)', () => {
    expect(L.plotGeometry(REYNA, claim, undefined, [], 'bar')).toMatchSnapshot();
  });

  it('one bar per observation, all L0 (observed), non-negative heights on a shared baseline', () => {
    const g = L.plotGeometry(REYNA, claim, undefined, [], 'bar');
    expect(g.chartType).toBe('bar');
    expect(g.bars.length).toBe(REYNA.length);
    expect(g.bars.every(b => b.level === 'L0')).toBe(true);   // bars are OBSERVED data
    expect(g.bars.every(b => b.bh >= 0)).toBe(true);          // heights non-negative (baseline includes 0)
    expect(g.points).toBeUndefined();                          // bars, not points
    expect(typeof g.baseline).toBe('number');
  });

  it('the trend default is byte-identical with or without the chartType param', () => {
    expect(JSON.stringify(L.plotGeometry(REYNA, claim, undefined, [])))
      .toBe(JSON.stringify(L.plotGeometry(REYNA, claim, undefined, [], 'trend')));
  });

  it('the chart summary names the chart type', () => {
    expect(L.chartSummaryText(REYNA, claim, [], 'bar')).toMatch(/^Bar chart\./);
    expect(L.chartSummaryText(REYNA, claim, [])).toMatch(/^Trend chart\./);
  });

  it('a benchmark reference line works on the bar chart too', () => {
    const ref = L.makeSourceRef({ kind: 'percentile', measure: 'ORF-WCPM', unit: 'words/min', grade: 4, season: 'winter', percentile: 50, value: 75, source: 'TEST', year: 2099, locator: 'https://example.org/x', citation: 'fixture', verified: true }, L.makeCompendium('WCPM', 'words/min', { measure: 'ORF-WCPM' }));
    expect(L.plotGeometry(REYNA, claim, undefined, [ref], 'bar').refLines.length).toBe(1);
  });
});

describe('Lumen — dot & box chart types', () => {
  const { comp } = buildReyna(REYNA);
  const claim = L.deriveTrendClaim(comp, { id: 'full' });

  it('quantiles: five-number summary on a known set', () => {
    const q = L.quantiles([1, 2, 3, 4, 5]);
    expect(q.min).toBe(1); expect(q.median).toBe(3); expect(q.max).toBe(5);
    expect(q.q1).toBe(2); expect(q.q3).toBe(4); expect(q.iqr).toBe(2);
  });

  it('dot geometry: one L0 point per observation, no line, no bars (snapshot)', () => {
    const g = L.plotGeometry(REYNA, claim, undefined, [], 'dot');
    expect(g.chartType).toBe('dot');
    expect(g.dots.length).toBe(REYNA.length);
    expect(g.dots.every(p => p.level === 'L0')).toBe(true);
    expect(g.trendPath).toBeUndefined();
    expect(g.bars).toBeUndefined();
    expect(g).toMatchSnapshot();
  });

  it('box geometry: one five-number box per phase, ordered min<=q1<=median<=q3<=max (snapshot)', () => {
    const g = L.plotGeometry(REYNA, claim, undefined, [], 'box');
    expect(g.chartType).toBe('box');
    expect(g.boxes.map(b => b.phase)).toEqual(['baseline', 'tier2']);
    g.boxes.forEach(b => {
      expect(b.min).toBeLessThanOrEqual(b.q1);
      expect(b.q1).toBeLessThanOrEqual(b.median);
      expect(b.median).toBeLessThanOrEqual(b.q3);
      expect(b.q3).toBeLessThanOrEqual(b.max);
    });
    expect(g).toMatchSnapshot();
  });

  it('the trend default is still byte-identical (the dot/box dispatch did not disturb it)', () => {
    expect(JSON.stringify(L.plotGeometry(REYNA, claim, undefined, [])))
      .toBe(JSON.stringify(L.plotGeometry(REYNA, claim, undefined, [], 'trend')));
  });

  it('summary names the chart type; the benchmark line works on dot & box too', () => {
    expect(L.chartSummaryText(REYNA, claim, [], 'dot')).toMatch(/^Dot plot\./);
    expect(L.chartSummaryText(REYNA, claim, [], 'box')).toMatch(/^Box plot/);
    const ref = L.makeSourceRef({ kind: 'percentile', measure: 'ORF-WCPM', unit: 'words/min', grade: 4, season: 'winter', percentile: 50, value: 75, source: 'TEST', year: 2099, locator: 'https://example.org/x', citation: 'fixture', verified: true }, L.makeCompendium('WCPM', 'words/min', { measure: 'ORF-WCPM' }));
    expect(L.plotGeometry(REYNA, claim, undefined, [ref], 'dot').refLines.length).toBe(1);
    expect(L.plotGeometry(REYNA, claim, undefined, [ref], 'box').refLines.length).toBe(1);
  });
});

describe('Lumen — histogram chart type (distribution of values)', () => {
  const { comp } = buildReyna(REYNA);
  const claim = L.deriveTrendClaim(comp, { id: 'full' });

  it('histogramBins: counts sum to n; bins span [min,max]', () => {
    const hb = L.histogramBins([1, 2, 2, 3, 9, 10]);
    expect(hb.bins.reduce((s, b) => s + b.count, 0)).toBe(6);
    expect(hb.min).toBe(1); expect(hb.max).toBe(10);
  });

  it('histogram geometry: bins over values, y=count, all L0, no points/bars (snapshot)', () => {
    const g = L.plotGeometry(REYNA, claim, undefined, [], 'histogram');
    expect(g.chartType).toBe('histogram');
    expect(g.bins.reduce((s, b) => s + b.count, 0)).toBe(REYNA.length); // every observation counted exactly once
    expect(g.bins.every(b => b.level === 'L0')).toBe(true);
    expect(g.points).toBeUndefined();
    expect(g.bars).toBeUndefined();
    expect(g).toMatchSnapshot();
  });

  it('a benchmark on the histogram is a VERTICAL line (at the value on the x-axis, not horizontal)', () => {
    const ref = L.makeSourceRef({ kind: 'percentile', measure: 'ORF-WCPM', unit: 'words/min', grade: 4, season: 'winter', percentile: 50, value: 55, source: 'TEST', year: 2099, locator: 'https://example.org/x', citation: 'fixture', verified: true }, L.makeCompendium('WCPM', 'words/min', { measure: 'ORF-WCPM' }));
    const g = L.plotGeometry(REYNA, claim, undefined, [ref], 'histogram');
    expect(g.refLines.length).toBe(1);
    expect(g.refLines[0].vertical).toBe(true);
    expect(typeof g.refLines[0].sx).toBe('number');
  });

  it('summary names the histogram; the trend default stays byte-identical', () => {
    expect(L.chartSummaryText(REYNA, claim, [], 'histogram')).toMatch(/^Histogram/);
    expect(JSON.stringify(L.plotGeometry(REYNA, claim, undefined, [])))
      .toBe(JSON.stringify(L.plotGeometry(REYNA, claim, undefined, [], 'trend')));
  });
});
