// Lumen RENDER golden master (SSR, design §15) — pins the actual rendered output
// across the key states so the render can be refactored with a safety net and the
// blank-tool / regression bug class is caught. Deterministic (data-seeded math),
// so snapshots are byte-stable. Re-baseline deliberately with `vitest -u` ONLY
// when a render change is reviewed and expected.

import { describe, it, expect } from 'vitest';
import * as LumenMod from '../stem_lab/stem_tool_lumen.js';
import { renderState, meta } from './helpers/lumen_harness.js';

const L = LumenMod.default || LumenMod;

const REYNA = [
  { x: 1, y: 42, phase: 'baseline' }, { x: 2, y: 45, phase: 'baseline' },
  { x: 3, y: 44, phase: 'baseline' }, { x: 4, y: 48, phase: 'baseline' },
  { x: 5, y: 47, phase: 'baseline' }, { x: 6, y: 53, phase: 'tier2' },
  { x: 7, y: 58, phase: 'tier2' }, { x: 8, y: 61, phase: 'tier2' },
  { x: 9, y: 60, phase: 'tier2' }, { x: 10, y: 66, phase: 'tier2' }
];

// A verified SYNTHETIC benchmark (value 75 / source TEST — not a real norm).
const benchComp = L.makeCompendium('WCPM', 'words/min', { measure: 'ORF-WCPM' });
const benchRef = L.makeSourceRef({
  kind: 'percentile', measure: 'ORF-WCPM', unit: 'words/min', grade: 4, season: 'winter', percentile: 50,
  value: 75, source: 'TEST', year: 2099, population: 'synthetic',
  locator: 'https://example.org/fixture', citation: 'Synthetic fixture (not a real norm).', verified: true
}, benchComp);
benchRef.id = 's1';

// A PAIRED fixture (each probe carries a 2nd measure y2) for the scatter pathway.
const PAIRED = REYNA.map((p, i) => ({ ...p, y2: [55, 58, 56, 62, 60, 66, 71, 73, 72, 79][i] }));

// A MULTI-SERIES fixture: ONE measure (WCPM), TWO conditions (cold vs practiced) of one student.
const MULTI = [
  { x: 1, y: 40, phase: 'baseline', series: 'cold' }, { x: 1, y: 52, phase: 'baseline', series: 'practiced' },
  { x: 2, y: 43, phase: 'baseline', series: 'cold' }, { x: 2, y: 55, phase: 'baseline', series: 'practiced' },
  { x: 3, y: 45, phase: 'baseline', series: 'cold' }, { x: 3, y: 57, phase: 'baseline', series: 'practiced' },
  { x: 4, y: 48, phase: 'baseline', series: 'cold' }, { x: 4, y: 60, phase: 'baseline', series: 'practiced' },
  { x: 5, y: 52, phase: 'tier2', series: 'cold' },    { x: 5, y: 65, phase: 'tier2', series: 'practiced' },
  { x: 6, y: 55, phase: 'tier2', series: 'cold' },    { x: 6, y: 69, phase: 'tier2', series: 'practiced' },
  { x: 7, y: 59, phase: 'tier2', series: 'cold' },    { x: 7, y: 72, phase: 'tier2', series: 'practiced' },
  { x: 8, y: 62, phase: 'tier2', series: 'cold' },    { x: 8, y: 76, phase: 'tier2', series: 'practiced' }
];
const MULTI_LABELS = { cold: 'Cold read', practiced: 'Practiced' };

const aiHyps = L.validateHypotheses([
  { text: 'The Tier-2 block reduced off-task time.', kind: 'effect', rank: 1 },
  { text: 'Regression to the mean — early weeks were low.', kind: 'null', rank: 2 }
]).hypotheses;

describe('Lumen — render golden master (SSR, §15)', () => {
  it('registration metadata', () => {
    expect(meta()).toMatchSnapshot();
  });

  it('empty state — no observations (entry + sample, no chart)', () => {
    expect(renderState({})).toMatchSnapshot();
  });

  it('n<3 refusal — too few points draws no line, shows a refusal sentence', () => {
    expect(renderState({ observations: REYNA.slice(0, 1) })).toMatchSnapshot();
  });

  it('L1 chart (no AI, working face) — the default opening state', () => {
    expect(renderState({ observations: REYNA, ceiling: 'L1', audience: 'working' })).toMatchSnapshot();
  });

  it('data table shown — the screen-reader peer', () => {
    expect(renderState({ observations: REYNA, showTable: true })).toMatchSnapshot();
  });

  it('Family face — re-worded, uncertainty preserved', () => {
    expect(renderState({ observations: REYNA, audience: 'family' })).toMatchSnapshot();
  });

  it('L3 ceiling + ranked hypothesis set + IEP-team sign-off', () => {
    expect(renderState({ observations: REYNA, ceiling: 'L3', audience: 'iep-team', aiHyps: aiHyps })).toMatchSnapshot();
  });

  it('a verified benchmark renders the teal reference line + citation chip', () => {
    expect(renderState({ observations: REYNA, sourceRefs: [benchRef] })).toMatchSnapshot();
  });

  it('bar chart pathway — rect bars + axes + phase line, no trend line', () => {
    expect(renderState({ observations: REYNA, chartType: 'bar' })).toMatchSnapshot();
  });

  it('dot/strip pathway — points only (no line, no bars)', () => {
    expect(renderState({ observations: REYNA, chartType: 'dot' })).toMatchSnapshot();
  });

  it('box pathway — per-phase five-number boxes', () => {
    expect(renderState({ observations: REYNA, chartType: 'box' })).toMatchSnapshot();
  });

  it('histogram pathway — value-range count bars (distribution, not time-series)', () => {
    expect(renderState({ observations: REYNA, chartType: 'histogram' })).toMatchSnapshot();
  });

  it('histogram + benchmark renders the VERTICAL teal reference line at the benchmark value', () => {
    expect(renderState({ observations: REYNA, chartType: 'histogram', sourceRefs: [benchRef] })).toMatchSnapshot();
  });

  it('scatter pathway — L0 paired points (primary y vs y2) + L1 fit line, association sentence', () => {
    expect(renderState({ observations: PAIRED, chartType: 'scatter', variable2: 'Comprehension', unit2: '%' })).toMatchSnapshot();
  });

  it('scatter with too few pairs refuses (no chart), naming the paired n', () => {
    expect(renderState({ observations: PAIRED.slice(0, 2), chartType: 'scatter', variable2: 'Comprehension', unit2: '%' })).toMatchSnapshot();
  });

  it('slope pathway — per-phase fitted segments + observed dots', () => {
    expect(renderState({ observations: REYNA, chartType: 'slope' })).toMatchSnapshot();
  });

  it('multi-series pathway — a coloured line + points per series, one sentence each', () => {
    expect(renderState({ observations: MULTI, chartType: 'multiSeriesLine', seriesLabels: MULTI_LABELS })).toMatchSnapshot();
  });
});

describe('Lumen — render invariants (no snapshot, just contracts)', () => {
  it('never returns null/blank — always a visible element (the blank-tool bug class)', () => {
    expect(renderState({}).length).toBeGreaterThan(50);
    expect(renderState({ observations: REYNA }).length).toBeGreaterThan(200);
  });

  it('the working render carries the L1 level word + the AI-ceiling control, no AI output', () => {
    const html = renderState({ observations: REYNA });
    expect(html).toMatch(/Derived \(math\)/);   // the claim's level word
    expect(html).toMatch(/AI ceiling/);          // the dial is present
    expect(html).not.toMatch(/Generate AI|ranked hypotheses/); // no AI affordance / L3 card at the L1 default
  });

  it('the benchmark renders in its own teal channel with the not-this-student chip', () => {
    const html = renderState({ observations: REYNA, sourceRefs: [benchRef] });
    expect(html).toMatch(/#0e7490/);                                   // teal reference ink
    expect(html).toMatch(/External benchmark \(not this student\)/);   // the chip
    expect(html).toMatch(/href="https:\/\/example\.org\/fixture"/);    // scheme-checked source link
  });

  it('the bar pathway renders rect bars + a "Bar chart" SR label, with no data-point circles', () => {
    const html = renderState({ observations: REYNA, chartType: 'bar' });
    expect(html).toMatch(/<rect/);
    expect(html).toMatch(/aria-label="Bar chart\./);
    expect((html.match(/<circle/g) || []).length).toBe(0); // bars, not points
  });

  it('dot & box pathways render with their own SR labels', () => {
    const dot = renderState({ observations: REYNA, chartType: 'dot' });
    expect(dot).toMatch(/aria-label="Dot plot\./);
    expect((dot.match(/<circle/g) || []).length).toBeGreaterThanOrEqual(REYNA.length); // a circle per point
    const box = renderState({ observations: REYNA, chartType: 'box' });
    expect(box).toMatch(/aria-label="Box plot/);
    expect(box).toMatch(/<rect/); // the IQR boxes
  });

  it('the scatter pathway reads two measures of one row, carries not-causation, draws no trend line', () => {
    const html = renderState({ observations: PAIRED, chartType: 'scatter', variable2: 'Comprehension', unit2: '%' });
    expect(html).toMatch(/aria-label="Scatter \(association\)/);
    expect(html).toMatch(/not causation/i);                         // the caveat survives into the rendered claim
    expect(html).toMatch(/Pearson r=/);
    expect((html.match(/<circle/g) || []).length).toBe(PAIRED.length); // one observed point per pair
    expect(html).toMatch(/stroke-dasharray="4 3"/);                  // the dashed L1 line of best fit
    expect((html.match(/<rect/g) || []).length).toBe(0);            // not bars / histogram
  });

  it('scatter is data-only L1: no AI affordance, no export, no benchmark picker in this view', () => {
    const html = renderState({ observations: PAIRED, chartType: 'scatter', ceiling: 'L3', audience: 'iep-team', variable2: 'Comprehension', unit2: '%' });
    expect(html).not.toMatch(/Generate AI|Export this view|Add ORF benchmark/);
  });

  it('the slope pathway draws per-phase segments + observed dots + a not-an-effect caveat', () => {
    const html = renderState({ observations: REYNA, chartType: 'slope' });
    expect(html).toMatch(/aria-label="Slope \(per-phase trends\)/);
    expect(html).toMatch(/not proof the change caused it/i);
    expect((html.match(/<circle/g) || []).length).toBe(REYNA.length);   // observed dots
    expect((html.match(/<rect/g) || []).length).toBe(0);                 // not bars/histogram
  });

  it('the multi-series pathway draws a line + points per series, names every series, no AI/export', () => {
    const html = renderState({ observations: MULTI, chartType: 'multiSeriesLine', seriesLabels: MULTI_LABELS });
    expect(html).toMatch(/aria-label="Multi-series line \(2 series/);
    expect(html).toMatch(/Cold read/);
    expect(html).toMatch(/Practiced/);
    expect(html).toMatch(/#1d4ed8/);                                     // series colour 0
    expect(html).toMatch(/#be123c/);                                     // series colour 1 (distinct from amber/teal)
    expect((html.match(/<circle/g) || []).length).toBe(MULTI.length);    // one observed point per row
    expect(html).not.toMatch(/Generate AI|Export this view/);            // no single pooled claim -> no AI/export
  });

  it('the histogram pathway renders count bars + its own SR label, with no trend line or data circles', () => {
    const html = renderState({ observations: REYNA, chartType: 'histogram' });
    expect(html).toMatch(/aria-label="Histogram/);
    expect(html).toMatch(/<rect/);
    expect((html.match(/<circle/g) || []).length).toBe(0); // distribution bars, not points or a trend
    // the x-axis is the measured VALUE range, not weeks 1..10 -> a high value-tick (>40) appears
    expect(html).toMatch(/>(4[2-9]|[5-9]\d|\d{3})</);
  });

  it('the histogram benchmark draws a VERTICAL teal line (x=value), not the horizontal time-series one', () => {
    const html = renderState({ observations: REYNA, chartType: 'histogram', sourceRefs: [benchRef] });
    expect(html).toMatch(/#0e7490/);                         // teal reference ink present
    // vertical line: x1 === x2 (a single x at the benchmark value); horizontal would have x1=padL, x2=w-padR
    expect(html).toMatch(/<line [^>]*x1="([\d.]+)"[^>]*x2="\1"[^>]*stroke="#0e7490"/);
  });
});
