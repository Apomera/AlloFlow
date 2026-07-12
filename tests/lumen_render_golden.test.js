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

  it('grouped-bar pathway — bars per phase × series mean, legend, raw-data table', () => {
    expect(renderState({ observations: MULTI, chartType: 'groupedBar', seriesLabels: MULTI_LABELS, showTable: true })).toMatchSnapshot();
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
    expect(html).not.toMatch(/Generate AI|Export this view|Add external benchmark/);
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
    // every observed point still rendered, but the MARKER varies by series (not colour-only)
    const markers = (html.match(/<circle|<rect|<polygon/g) || []).length;
    expect(markers).toBeGreaterThanOrEqual(MULTI.length);
    expect(html).not.toMatch(/Generate AI|Export this view/);            // no single pooled claim -> no AI/export
  });

  it('multi-series is color-blind-safe: series 0 = solid line + circles, series 1 = dashed line + squares', () => {
    const html = renderState({ observations: MULTI, chartType: 'multiSeriesLine', seriesLabels: MULTI_LABELS });
    expect(html).toMatch(/stroke-dasharray="7 4"/);                      // series 1's line is dashed (non-colour cue)
    expect((html.match(/<circle/g) || []).length).toBeGreaterThanOrEqual(8); // series-0 circle markers
    expect((html.match(/<rect/g) || []).length).toBeGreaterThanOrEqual(8);   // series-1 square markers (8 points)
    // series 0 stays solid (no dash on its line) — single-series charts look unchanged
    const t = renderState({ observations: REYNA.map((r, i) => ({ ...r, series: 'only' })), chartType: 'multiSeriesLine' });
    expect(t).not.toMatch(/stroke-dasharray="7 4"/);
  });

  it('the grouped-bar pathway draws mean bars + a legend, names every cell, raw points in the table', () => {
    const html = renderState({ observations: MULTI, chartType: 'groupedBar', seriesLabels: MULTI_LABELS, showTable: true });
    expect(html).toMatch(/aria-label="Grouped bar \(mean per phase/);
    expect(html).toMatch(/Cold read/);                                   // legend label
    expect(html).toMatch(/<rect/);                                       // the mean bars
    expect(html).toMatch(/#1d4ed8/);                                     // series colour 0
    expect(html).toMatch(/#be123c/);                                     // series colour 1
    expect(html).toMatch(/<th[^>]*>Series<\/th>/);                       // the raw-data peer carries a Series column
    expect((html.match(/<tbody>[\s\S]*<tr/g) || []).length).toBeGreaterThan(0);
    expect(html).not.toMatch(/Generate AI|Export this view/);            // comparison view, no single pooled claim
  });

  it('grouped-bar is color-blind-safe: bars filled by a per-series TEXTURE pattern, not colour alone', () => {
    const html = renderState({ observations: MULTI, chartType: 'groupedBar', seriesLabels: MULTI_LABELS });
    expect(html).toMatch(/<pattern[^>]*id="lumenSeriesPat0"/);           // texture defs exist
    expect(html).toMatch(/<pattern[^>]*id="lumenSeriesPat1"/);
    expect(html).toMatch(/fill="url\(#lumenSeriesPat[01]\)"/);           // bars use the texture, not a flat colour
    expect(html).toMatch(/#1d4ed8/);                                     // hue still present (stroke + legend) — redundant channel
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

  // ─────────────────────────────────────────────────────────────────────
  // INGEST (design §5 Pillar 1) — the column-mapper preview panel.
  // When a file has been parsed (importPreview present), the render
  // shows a Cancel + Confirm header, a 5-role mapping grid, the first
  // ≤5 rows from the file, an error line if present, and the L0
  // disclosure. We pin a structural snapshot AND assert the privacy
  // guarantee at the render layer (headers can be student-name-shaped
  // but never enter the AI surface — see check_lumen_floor for the
  // claim-context assertion; here we just confirm they render in the
  // preview as plain text inside the mapper panel).
  // ─────────────────────────────────────────────────────────────────────
  const SAMPLE_IMPORT_PREVIEW = {
    fileName: 'reyna_orf_weeks_01_10.csv',
    fileType: 'csv',
    delimiter: ',',
    notes: [],
    headers: ['week', 'wcpm', 'phase'],
    rows: [
      ['1', '42', 'baseline'],
      ['2', '45', 'baseline'],
      ['3', '44', 'baseline'],
      ['4', '48', 'baseline'],
      ['5', '47', 'baseline'],
      ['6', '53', 'tier2']
    ],
    mapping: { xCol: 0, yCol: 1, phaseCol: 2, y2Col: null, seriesCol: null },
    error: null
  };

  it('the import-mapper preview renders headers, first 5 rows, mapping dropdowns, and the L0 disclosure', () => {
    const html = renderState({ importPreview: SAMPLE_IMPORT_PREVIEW });
    expect(html).toMatch(/Map columns from reyna_orf_weeks_01_10\.csv/);
    expect(html).toMatch(/Confirm \+ bind/);
    expect(html).toMatch(/Cancel/);
    expect(html).toMatch(/x column \(required\)/);
    expect(html).toMatch(/y column \(required\)/);
    expect(html).toMatch(/phase column \(optional\)/);
    // headers render as <th> text in the preview table
    expect(html).toMatch(/<th[^>]*>week<\/th>/);
    expect(html).toMatch(/<th[^>]*>wcpm<\/th>/);
    expect(html).toMatch(/<th[^>]*>phase<\/th>/);
    // the L0 disclosure copy must be present and copy-survivable as plain text
    expect(html).toMatch(/Imported values land as L0/);
    expect(html).toMatch(/No AI call fires during ingest/);
  });

  it('the import-mapper surfaces a structured parse error inline (rose-700 text), without throwing', () => {
    const errPreview = Object.assign({}, SAMPLE_IMPORT_PREVIEW, { rows: [], error: 'File exceeds 2 MB limit (3145728 bytes).' });
    const html = renderState({ importPreview: errPreview });
    expect(html).toMatch(/File exceeds 2 MB limit/);
    expect(html).toMatch(/text-rose-700/);
  });

  it('the import-mapper preview is structurally byte-stable (snapshot)', () => {
    expect(renderState({ importPreview: SAMPLE_IMPORT_PREVIEW })).toMatchSnapshot();
  });

  it('the x-column mapper offers a row-order option (for dated exports with no numeric x)', () => {
    const html = renderState({ importPreview: SAMPLE_IMPORT_PREVIEW });
    expect(html).toMatch(/<option value="index">\(row order/);
  });

  it('a recognized AlloFlow report shows the honest re-projection note; an identifiable roster is refused', () => {
    const reco = Object.assign({}, SAMPLE_IMPORT_PREVIEW, { recognized: 'AlloFlow fluency export', recoNote: 'Recognized an AlloFlow fluency export — auto-mapped Reading rate (WCPM) over assessment order. Review and confirm to re-project it as an honest finding.' });
    const html = renderState({ importPreview: reco });
    expect(html).toMatch(/Recognized an AlloFlow fluency export/);
    expect(html).toMatch(/text-emerald-700/);
    const refused = Object.assign({}, SAMPLE_IMPORT_PREVIEW, { error: 'This looks like an identifiable multi-student roster (it has a Student/Name column). Lumen never imports per-student records — that is the Teacher Dashboard’s job.' });
    const html2 = renderState({ importPreview: refused });
    expect(html2).toMatch(/never imports per-student records/);
    expect(html2).toMatch(/text-rose-700/);
  });

  it('the import button + hidden file input render on the empty state (the only entry point for new files)', () => {
    const html = renderState({});
    expect(html).toMatch(/Import file/);
    expect(html).toMatch(/id="lumen-file-input"/);
    expect(html).toMatch(/accept="[^"]*\.csv[^"]*\.xlsx/);
  });

  // ─────────────────────────────────────────────────────────────────────
  // SYNTHETIC practice data (the "generate sample" feature): a synthetic
  // dataset must SELF-DECLARE everywhere — a persistent banner, an in-SVG
  // watermark (so a chart crop carries it), and SYN-burned marks — while
  // a real dataset stays byte-identical (no banner, no watermark).
  // ─────────────────────────────────────────────────────────────────────
  it('synthetic practice data — persistent banner + in-SVG watermark + SYN marks (snapshot)', () => {
    const synth = REYNA.map((r) => ({ ...r, synthetic: true }));
    const html = renderState({ observations: synth, ceiling: 'L1', audience: 'working', chartType: 'bar' });
    expect(html).toMatch(/Synthetic practice data — NOT a real student/); // the persistent banner
    expect(html).toMatch(/PRACTICE DATA/);                                 // the in-SVG watermark (uppercase)
    expect(html).toMatch(/#6d28d9/);                                       // the reserved synthetic violet
    expect(html).toMatchSnapshot();
  });

  it('the practice-data disclosure toggle renders in every state; the controls live behind it', () => {
    const html = renderState({});
    expect(html).toMatch(/⚗ Practice data…/);            // the toggle is always reachable
    expect(html).not.toMatch(/Generate practice data/);   // the trio is calm-by-default (behind the disclosure)
    const open = renderState({ showPractice: true });
    expect(open).toMatch(/Generate practice data/);
    expect(open).toMatch(/Practice-data scenario/);
    ['improving', 'flat', 'variable', 'declining', 'responsive'].forEach((s) => expect(open).toMatch(new RegExp('value="' + s + '"')));
    // scenario keys stay the VALUES; the visible labels are humanized
    expect(open).toMatch(/Improving trend/);
    expect(open).toMatch(/Flat \/ no change/);
  });

  it('real data shows NO synthetic banner or watermark (byte-identity guard)', () => {
    const html = renderState({ observations: REYNA, chartType: 'bar' });
    expect(html).not.toMatch(/Synthetic practice data — NOT a real student/);
    expect(html).not.toMatch(/PRACTICE DATA/); // uppercase watermark absent (the lowercase button label is fine)
  });
});

// ─────────────────────────────────────────────────────────────────────
// PRESENT MODE + PRESENTATION EXPORT (the share layer). An EXTRA, opt-in
// layer — never the default. The calm analysis view stays the front door;
// the overlay is additive (off => byte-identical), re-renders the IDENTICAL
// chart large with one honest reveal, and is what the presentation export
// (buildPresentationHtml, live-SVG-inlining) captures.
// ─────────────────────────────────────────────────────────────────────
describe('Lumen — present mode + presentation export', () => {
  it('the analysis view exposes a ▶ Present button but NO overlay by default (additive)', () => {
    const html = renderState({ observations: REYNA });
    expect(html).toMatch(/▶ Present/);
    expect(html).not.toMatch(/id="lumen-present-overlay"/);
    expect(html).not.toMatch(/lumen-reveal/);
  });

  it('present mode renders a full-screen overlay: live chart, finding, provenance, export/fullscreen/exit', () => {
    const html = renderState({ observations: REYNA, presentMode: true });
    expect(html).toMatch(/id="lumen-present-overlay"/);
    expect(html).toMatch(/role="dialog"/);
    expect(html).toMatch(/aria-modal="true"/);
    expect(html).toMatch(/id="lumen-chart-present"/);            // the reused responsive chart
    expect(html).toMatch(/Export presentation \(HTML\)/);
    expect(html).toMatch(/Fullscreen/);
    expect(html).toMatch(/Exit/);
    expect(html).toMatch(/Derived \(math\)/);                    // the provenance pill in the slide
  });

  it('present mode is keyboard-operable: focus lands inside (autofocus), a trigger to return to, and trap pivots', () => {
    const html = renderState({ observations: REYNA, presentMode: true });
    // focus moves INTO the overlay on open
    expect(html).toMatch(/<button[^>]*id="lumen-present-first"[^>]*autofocus/i);
    // the first/last controls the keydown Tab trap pivots on (the wrap itself is an
    // event handler — Tab on last -> first, Shift+Tab on first -> last — not SSR-visible)
    expect(html).toMatch(/id="lumen-present-first"/);
    expect(html).toMatch(/id="lumen-present-last"/);
    // the OLD aria-hidden focusable sentinel pattern is BANNED (WCAG 4.1.2 / axe
    // aria-hidden-focus): no element may combine aria-hidden with a tabindex.
    expect((html.match(/tabindex="0"[^>]*aria-hidden="true"|aria-hidden="true"[^>]*tabindex="0"/gi) || []).length).toBe(0);
  });

  it('the ▶ Present trigger carries the id that focus returns to on Exit/Esc', () => {
    const html = renderState({ observations: REYNA });
    expect(html).toMatch(/<button[^>]*id="lumen-present-trigger"[^>]*>▶ Present/);
  });

  it('the reveal is honest: one keyframe, whole-chart, motion-opt-out (no per-element dramatize)', () => {
    const html = renderState({ observations: REYNA, presentMode: true });
    expect(html).toMatch(/@keyframes lumenReveal/);
    expect(html).toMatch(/prefers-reduced-motion/);              // a11y motion opt-out
    // the reveal is on the SLIDE container, not on the band/line individually
    expect((html.match(/lumen-reveal/g) || []).length).toBeGreaterThanOrEqual(1);
  });

  it('present mode preserves the honesty marks — the band + a second copy of the live chart, never an area fill', () => {
    const html = renderState({ observations: REYNA, presentMode: true });
    expect(html).toMatch(/fill-opacity="0.1"/);                  // the uncertainty band
    expect((html.match(/id="lumen-chart-(main|present)"/g) || []).length).toBe(2); // main behind + present
  });

  it('synthetic data in present mode keeps the violet practice banner + the in-SVG watermark', () => {
    const synth = REYNA.map((r) => ({ ...r, synthetic: true }));
    const html = renderState({ observations: synth, presentMode: true });
    expect(html).toMatch(/Synthetic practice data — not a real student/i);
    expect(html).toMatch(/PRACTICE DATA/);                       // watermark survives into the present chart
  });

  it('present-mode overlay is structurally byte-stable (snapshot)', () => {
    expect(renderState({ observations: REYNA, presentMode: true })).toMatchSnapshot();
  });

  // buildPresentationHtml pure-function honesty (check_lumen_floor §14 pins more;
  // these are the CI-visible essentials co-located with the render contracts).
  function compReyna() { const c = L.makeCompendium('WCPM', 'words/min'); REYNA.forEach((r) => L.addObservation(c, r)); return c; }

  it('buildPresentationHtml: real export = max-level footer, no SYNTHETIC, FERPA finding-only', () => {
    const comp = compReyna();
    const out = L.buildPresentationHtml(comp, L.deriveTrendClaim(comp, {}), { audience: 'working' });
    expect(out.html).toMatch(/max epistemic level L1/);
    expect(out.html).not.toMatch(/SYNTHETIC/);
    expect(out.html).toMatch(/finding-only \(no identifiable rows\)/);
    expect(out.filename).toMatch(/-summary\.html$/);
  });

  it('buildPresentationHtml: opt-in PII embeds the table + CONFIDENTIAL footer + filename', () => {
    const comp = compReyna();
    const out = L.buildPresentationHtml(comp, L.deriveTrendClaim(comp, {}), { audience: 'working', includePII: true });
    expect(out.html).toMatch(/<table>/);
    expect(out.html).toMatch(/CONFIDENTIAL \(identifiable\)/);
    expect(out.filename).toMatch(/-CONFIDENTIAL\.html$/);
  });

  it('buildPresentationHtml: the inlined live SVG is sanitized but the chart survives', () => {
    const comp = compReyna();
    const hostile = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect onload="alert(2)" x="0"/><text>ok</text></svg>';
    const out = L.buildPresentationHtml(comp, L.deriveTrendClaim(comp, {}), { chartSvg: hostile });
    expect(out.html).not.toMatch(/<script>/);
    expect(out.html).not.toMatch(/onload/);
    expect(out.html).toMatch(/<figure class="chart">/);
    expect(out.html).toMatch(/<text>ok<\/text>/);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2026-07-12 enhancement wave: calm-by-default view options, data-bound
// sign-off at the render layer, typed phase entry, undo/remove/clear,
// copy-finding, table a11y (caption + scope), and honest empty states.
// ─────────────────────────────────────────────────────────────────────
describe('Lumen — calm-by-default + editing + a11y contracts (2026-07-12)', () => {
  it('view options are calm-by-default: audience/chart rows hidden at the default state, named on the toggle', () => {
    const html = renderState({ observations: REYNA });
    expect(html).toMatch(/View options — Working · Trend/);   // closed toggle names the hidden state
    expect(html).not.toMatch(/id="lumen-view-options"/);      // rows not rendered
    expect(html).toMatch(/aria-expanded="false"[^>]*aria-controls="lumen-view-options"|aria-controls="lumen-view-options"[^>]*aria-expanded="false"/);
    expect(html).toMatch(/AI ceiling/);                       // the dial STAYS persistent (design §15.1)
  });

  it('view options AUTO-OPEN when audience or chart is non-default (state is never hidden)', () => {
    const bar = renderState({ observations: REYNA, chartType: 'bar' });
    expect(bar).toMatch(/id="lumen-view-options"/);
    expect(bar).toMatch(/aria-pressed="true"[^>]*>Bar|>Bar<\/button>/);
    const fam = renderState({ observations: REYNA, audience: 'family' });
    expect(fam).toMatch(/id="lumen-view-options"/);
    const explicit = renderState({ observations: REYNA, showViewOptions: true });
    expect(explicit).toMatch(/id="lumen-view-options"/);
    expect(explicit).toMatch(/Plain language/);               // the face buttons render when open
  });

  it('the L3 sign-off check is DATA-BOUND at the render layer: a hyps-only (legacy/stale) sign-off shows re-sign, the bound one shows signed', () => {
    const comp = L.makeCompendium('Measure', 'units');
    REYNA.forEach((r) => L.addObservation(comp, r));
    const claimHash = L.deriveTrendClaim(comp, {})._hash;
    const staleSig = L.signoffHash(aiHyps);                   // hyps-only — earned before the data-binding fix
    const stale = renderState({ observations: REYNA, ceiling: 'L3', audience: 'iep-team', aiHyps: aiHyps, signoff: staleSig });
    expect(stale).toMatch(/Sign off before a formal export/);
    expect(stale).not.toMatch(/✓ Signed off/);
    const boundSig = L.signoffHash(aiHyps, claimHash);        // bound to THIS data
    const signed = renderState({ observations: REYNA, ceiling: 'L3', audience: 'iep-team', aiHyps: aiHyps, signoff: boundSig });
    expect(signed).toMatch(/✓ Signed off/);
  });

  it('typed entry has a phase (condition) input, and Undo/Clear appear only once data exists', () => {
    const empty = renderState({});
    expect(empty).toMatch(/Phase \(optional\)/);
    expect(empty).not.toMatch(/Undo last|Clear all/);
    const withData = renderState({ observations: REYNA });
    expect(withData).toMatch(/↩ Undo last/);
    expect(withData).toMatch(/🗑 Clear all/);
  });

  it('the data table is an accessible table: caption + th scope, and a per-row Remove control on the 1:1 (trend) peer', () => {
    const html = renderState({ observations: REYNA, showTable: true });
    expect(html).toMatch(/<caption class="sr-only">/);
    expect(html).toMatch(/<th scope="col"/);
    expect(html).toMatch(/>Remove<\/th>/);
    expect(html).toMatch(/aria-label="Remove the point at week 1, value 42"/);
    // the multi-series (aggregate) peer stays read-only — no Remove column
    const multi = renderState({ observations: MULTI, chartType: 'multiSeriesLine', seriesLabels: MULTI_LABELS, showTable: true });
    expect(multi).not.toMatch(/>Remove<\/th>/);
  });

  it('the finding card offers a one-click copy of the provenance-bound sentence', () => {
    const html = renderState({ observations: REYNA });
    expect(html).toMatch(/⧉ Copy finding/);
  });

  it('the benchmark picker states its honest empty-state while the norm spine ships empty', () => {
    const html = renderState({ observations: REYNA });
    expect(html).toMatch(/Add external benchmark/);
    expect(html).toMatch(/norm table ships empty on purpose/);
    // once a verified ref exists the note yields to the chip
    const withRef = renderState({ observations: REYNA, sourceRefs: [benchRef] });
    expect(withRef).not.toMatch(/norm table ships empty on purpose/);
  });

  it('present mode never renders over a non-presentable view (persisted-state guard)', () => {
    const html = renderState({ observations: MULTI, chartType: 'multiSeriesLine', seriesLabels: MULTI_LABELS, presentMode: true });
    expect(html).not.toMatch(/id="lumen-present-overlay"/);
  });

  it('the present-mode reveal CSS is a literal (never routed through the i18n shim)', () => {
    const html = renderState({ observations: REYNA, presentMode: true });
    expect(html).toMatch(/@keyframes lumenReveal\{from\{opacity:0/);
    expect(html).toMatch(/prefers-reduced-motion/);
  });
});
