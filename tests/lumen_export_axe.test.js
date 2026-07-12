// Lumen — axe-core WCAG 2.1 A+AA audit of the EXPORTED artifacts.
//
// The brief (buildExportHtml) and the presentation (buildPresentationHtml) are
// standalone hand-to-a-person HTML files — the deliverable end of "turn any
// dataset into a defensible finding you can hand to a person". Their
// accessibility matters at least as much as the in-app UI (the recipient never
// sees the app), so every audience/PII/AI/synthetic/benchmark combination is
// audited as a COMPLETE document (the builders own their <html lang>, title,
// and viewport). Same jsdom + axe pattern as tests/lumen_axe_audit.test.js;
// color-contrast can't run without layout (hand-checked instead).

import { describe, it, expect } from 'vitest';
import axe from 'axe-core';
import { JSDOM } from 'jsdom';
import * as LumenMod from '../stem_lab/stem_tool_lumen.js';

const L = LumenMod.default || LumenMod;

const REYNA = [
  { x: 1, y: 42, phase: 'baseline' }, { x: 2, y: 45, phase: 'baseline' },
  { x: 3, y: 44, phase: 'baseline' }, { x: 4, y: 48, phase: 'baseline' },
  { x: 5, y: 47, phase: 'baseline' }, { x: 6, y: 53, phase: 'tier2' },
  { x: 7, y: 58, phase: 'tier2' }, { x: 8, y: 61, phase: 'tier2' },
  { x: 9, y: 60, phase: 'tier2' }, { x: 10, y: 66, phase: 'tier2' }
];

function comp(rows) {
  const c = L.makeCompendium('WCPM', 'words/min', { measure: 'ORF-WCPM' });
  (rows || REYNA).forEach((r) => L.addObservation(c, r));
  return c;
}
const SYNTH = REYNA.map((r) => ({ ...r, synthetic: true }));

const ref = L.makeSourceRef({
  kind: 'percentile', measure: 'ORF-WCPM', unit: 'words/min', grade: 4, season: 'winter', percentile: 50,
  value: 75, source: 'TEST', year: 2099, population: 'synthetic',
  locator: 'https://example.org/fixture', citation: 'Synthetic fixture (not a real norm).', verified: true
}, comp());
ref.id = 's1';

const aiHyps = L.validateHypotheses([
  { text: 'The Tier-2 block reduced off-task time.', kind: 'effect', rank: 1 },
  { text: 'Regression to the mean — early weeks were low.', kind: 'null', rank: 2 }
]).hypotheses;

// A representative serialized live chart (the shape exportPresentation captures):
// role="img" + aria-label carried on the svg exactly as the in-app maker emits it.
const CHART_SVG = '<svg id="lumen-chart-main" viewBox="0 0 480 280" role="img" aria-label="Trend chart. Derived (math): WCPM rose ~2.68 words/min per step (95% interval +2.12 to +3.23; n=10)."><path d="M 44,220 L 464,60" fill="none" stroke="#0f172a"></path><circle cx="44" cy="220" r="3.5" fill="#0f172a"></circle></svg>';

function docFor(builder, rows, opts) {
  const c = comp(rows);
  const claim = L.deriveTrendClaim(c, {});
  return builder(c, claim, opts || {}).html;
}

const ARTIFACTS = {
  'brief · working · finding-only': () => docFor(L.buildExportHtml, REYNA, { audience: 'working' }),
  'brief · formal · PII + signed AI + benchmark': () => docFor(L.buildExportHtml, REYNA, { audience: 'iep-team', includePII: true, includeAI: true, aiHyps, sourceRefs: [ref] }),
  'brief · family (plain language)': () => docFor(L.buildExportHtml, REYNA, { audience: 'family' }),
  'brief · synthetic practice data': () => docFor(L.buildExportHtml, SYNTH, { audience: 'working', synthetic: true }),
  'presentation · working · no chart captured': () => docFor(L.buildPresentationHtml, REYNA, { audience: 'working' }),
  'presentation · working · live chart inlined': () => docFor(L.buildPresentationHtml, REYNA, { audience: 'working', chartSvg: CHART_SVG }),
  'presentation · formal · PII + signed AI + benchmark': () => docFor(L.buildPresentationHtml, REYNA, { audience: 'iep-team', includePII: true, includeAI: true, aiHyps, sourceRefs: [ref], chartSvg: CHART_SVG }),
  'presentation · synthetic practice data': () => docFor(L.buildPresentationHtml, SYNTH, { audience: 'working', synthetic: true, chartSvg: CHART_SVG })
};

async function audit(html) {
  const dom = new JSDOM(html, { runScripts: 'outside-only' });
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

describe('Lumen — exported artifacts pass axe WCAG 2.1 A+AA', () => {
  for (const [name, build] of Object.entries(ARTIFACTS)) {
    it(`${name}: zero axe violations`, async () => {
      const results = await audit(build());
      expect(violationSummary(results)).toBe('');
      expect(results.violations.length).toBe(0);
    });
  }

  it('both builders declare the document language (WCAG 3.1.1 — the file stands alone)', () => {
    expect(docFor(L.buildExportHtml, REYNA, {})).toMatch(/<html lang="en">/);
    expect(docFor(L.buildPresentationHtml, REYNA, {})).toMatch(/<html lang="en">/);
  });

  it('the audit is meaningful — axe evaluated a substantial rule set on a full artifact', async () => {
    const results = await audit(docFor(L.buildPresentationHtml, REYNA, { audience: 'iep-team', includePII: true, includeAI: true, aiHyps, sourceRefs: [ref], chartSvg: CHART_SVG }));
    expect(results.passes.length).toBeGreaterThan(15);
  });
});
