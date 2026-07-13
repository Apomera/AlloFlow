// Lumen — axe-core WCAG 2.1 A+AA self-audit across every meaningful UI state.
//
// Renders the REAL tool (SSR via the lumen harness) into a fresh jsdom document
// and runs axe-core over it, exactly like the doc_pipeline export a11y gate.
// A state passes ONLY with zero violations at the WCAG A/AA rule tags.
//
// HONEST LIMITS (same as the export gate): jsdom has no layout engine, so the
// color-contrast rule returns "incomplete" here — contrast is enforced by the
// hand-computed ratios in the 2026-07-12 pass (slate-400 → slate-500) and by
// real-browser audits. Click/async behavior is state-fed, not clicked.

import { describe, it, expect } from 'vitest';
import axe from 'axe-core';
import { JSDOM } from 'jsdom';
import * as LumenMod from '../stem_lab/stem_tool_lumen.js';
import { renderState } from './helpers/lumen_harness.js';

const L = LumenMod.default || LumenMod;

const REYNA = [
  { x: 1, y: 42, phase: 'baseline' }, { x: 2, y: 45, phase: 'baseline' },
  { x: 3, y: 44, phase: 'baseline' }, { x: 4, y: 48, phase: 'baseline' },
  { x: 5, y: 47, phase: 'baseline' }, { x: 6, y: 53, phase: 'tier2' },
  { x: 7, y: 58, phase: 'tier2' }, { x: 8, y: 61, phase: 'tier2' },
  { x: 9, y: 60, phase: 'tier2' }, { x: 10, y: 66, phase: 'tier2' }
];
const PAIRED = REYNA.map((p, i) => ({ ...p, y2: [55, 58, 56, 62, 60, 66, 71, 73, 72, 79][i] }));
const MULTI = [
  { x: 1, y: 40, phase: 'baseline', series: 'cold' }, { x: 1, y: 52, phase: 'baseline', series: 'practiced' },
  { x: 2, y: 43, phase: 'baseline', series: 'cold' }, { x: 2, y: 55, phase: 'baseline', series: 'practiced' },
  { x: 3, y: 45, phase: 'baseline', series: 'cold' }, { x: 3, y: 57, phase: 'baseline', series: 'practiced' },
  { x: 4, y: 48, phase: 'tier2', series: 'cold' }, { x: 4, y: 60, phase: 'tier2', series: 'practiced' }
];

const benchComp = L.makeCompendium('WCPM', 'words/min', { measure: 'ORF-WCPM' });
const benchRef = L.makeSourceRef({
  kind: 'percentile', measure: 'ORF-WCPM', unit: 'words/min', grade: 4, season: 'winter', percentile: 50,
  value: 75, source: 'TEST', year: 2099, population: 'synthetic',
  locator: 'https://example.org/fixture', citation: 'Synthetic fixture (not a real norm).', verified: true
}, benchComp);
benchRef.id = 's1';

const aiHyps = L.validateHypotheses([
  { text: 'The Tier-2 block reduced off-task time.', kind: 'effect', rank: 1 },
  { text: 'Regression to the mean — early weeks were low.', kind: 'null', rank: 2 }
]).hypotheses;

const IMPORT_PREVIEW = {
  fileName: 'weeks.csv', fileType: 'csv', delimiter: ',', notes: [],
  headers: ['week', 'wcpm', 'phase'],
  rows: [['1', '42', 'baseline'], ['2', '45', 'baseline'], ['3', '44', 'baseline']],
  mapping: { xCol: 0, yCol: 1, phaseCol: 2, y2Col: null, seriesCol: null }, error: null
};

// Every meaningful UI state — a violation in ANY of them fails the gate.
const STATES = {
  'empty (onboarding)': {},
  'default trend chart': { observations: REYNA },
  'data table open': { observations: REYNA, showTable: true },
  'view options open': { observations: REYNA, showViewOptions: true },
  'L3 sign-off (Formal)': { observations: REYNA, ceiling: 'L3', audience: 'iep-team', aiHyps: aiHyps },
  'import mapper staged': { importPreview: IMPORT_PREVIEW },
  'practice box open': { showPractice: true },
  'paste box open': { showPaste: true },
  'present mode': { observations: REYNA, presentMode: true },
  'verified benchmark': { observations: REYNA, sourceRefs: [benchRef] },
  'multi-series + table': { observations: MULTI, chartType: 'multiSeriesLine', seriesLabels: { cold: 'Cold read', practiced: 'Practiced' }, showTable: true },
  'grouped bar + table': { observations: MULTI, chartType: 'groupedBar', seriesLabels: { cold: 'Cold read', practiced: 'Practiced' }, showTable: true },
  'scatter (association)': { observations: PAIRED, chartType: 'scatter', variable2: 'Comprehension', unit2: '%' },
  'synthetic practice data': { observations: REYNA.map((r) => ({ ...r, synthetic: true })) },
  'evidence-inquiry sandbox open': { observations: REYNA, showInquiry: true },
  'benchmark workspace open': { observations: REYNA, benchWorkspace: { open: true, seasons: ['winter'], percentiles: [50], cells: [], activePageIdx: 0 } }
};

async function audit(d) {
  // The tool is a COMPONENT inside the host app, so the page shell (lang, title,
  // main landmark) is supplied here the way the host supplies it in production.
  const page = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Lumen axe audit</title></head><body><main>'
    + renderState(d) + '</main></body></html>';
  const dom = new JSDOM(page, { runScripts: 'outside-only' });
  dom.window.eval(axe.source);
  return dom.window.axe.run(dom.window.document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
  });
}

function violationSummary(results) {
  return results.violations.map((v) =>
    v.id + ' (' + v.impact + '): ' + v.help + ' — ' +
    v.nodes.slice(0, 3).map((n) => n.html.slice(0, 120)).join(' | ')
  ).join('\n');
}

describe('Lumen — axe-core WCAG 2.1 A+AA audit (every UI state)', () => {
  for (const [name, state] of Object.entries(STATES)) {
    it(`${name}: zero axe violations`, async () => {
      const results = await audit(state);
      expect(violationSummary(results)).toBe('');
      expect(results.violations.length).toBe(0);
    });
  }

  it('the audit is meaningful — axe actually evaluated a substantial rule set', async () => {
    const results = await audit({ observations: REYNA, showTable: true });
    expect(results.passes.length).toBeGreaterThan(20);
  });

  // axe's aria-hidden-focus rule returns "incomplete" under jsdom (it needs layout to
  // judge focusability), so enforce the stronger STATIC invariant here: no element in
  // ANY state may combine aria-hidden="true" with a tabindex — a screen-reader user's
  // focus must never be able to land on a node that is hidden from them (WCAG 4.1.2).
  it('no state renders an aria-hidden element that can take focus', () => {
    for (const [name, state] of Object.entries(STATES)) {
      const html = renderState(state);
      const combos = html.match(/<[^>]*aria-hidden="true"[^>]*tabindex=|<[^>]*tabindex=[^>]*aria-hidden="true"/gi) || [];
      expect(combos, name + ' has aria-hidden focusable element(s): ' + combos.join(' ')).toEqual([]);
    }
  });
});
