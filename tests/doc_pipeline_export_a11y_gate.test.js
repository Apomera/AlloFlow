// PHASE B — the axe self-audit GATE for the student HTML export.
//
// Dogfoods our own accessibility engine on our own output: generates a representative
// export via the REAL generateFullPackHTML, then runs axe-core (WCAG 2.1 A + AA) over the
// rendered HTML in jsdom and asserts the violation set hasn't regressed past a documented
// baseline. As Phase A source fixes land, BASELINE shrinks toward [].
//
// NOTE: jsdom has no layout engine, so axe's color-contrast rule can't run here (it returns
// "incomplete", not "violation") — contrast is covered separately by scratchpad/contrast.cjs
// and the WCAG-equivalence sentinels. This gate covers the STRUCTURAL criteria (1.3.1, 2.4.1,
// 3.3.2, 4.1.2, regions, lists, tables, aria), which is exactly the Phase A work.

import { describe, it, expect, beforeAll } from 'vitest';
import axe from 'axe-core';
import { JSDOM } from 'jsdom';
import { loadAlloModule } from './setup.js';

// Rule IDs axe currently reports on the export that are NOT yet fixed (the live "remaining
// work" scorecard). The gate FAILS if a violation appears that is NOT in this set (a
// regression). Shrink this list as Phase A fixes land; goal is [].
const BASELINE = new Set([
  // (filled in from the first run — see console output)
]);

let html;
let results;

beforeAll(async () => {
  loadAlloModule('doc_pipeline_module.js');
  const factory = window.AlloModules.createDocPipeline;
  const stub = async () => '{}';
  const pipeline = factory({
    callGemini: stub, callGeminiVision: stub, callImagen: async () => null,
    addToast: () => {}, t: (k) => k, isRtlLang: () => false,
    updateExportPreview: () => {}, getDefaultTitle: () => 'Document', state: {},
  });

  const historyItems = [
    { type: 'simplified', id: 's1', title: 'Reading', meta: 'Grade 5',
      data: 'Volcanoes erupt when pressure builds. 3 < 5, and salt & water mix.' },
    { type: 'quiz', id: 'q1', title: 'Comprehension Check', meta: 'MCQ',
      data: { questions: [
        { type: 'mcq', question: 'Is 2 < 3?', options: ['Yes & true', 'No'], correctAnswer: 'Yes & true' },
        { type: 'fill-blank', question: 'Lava is ____ rock.', expectedFill: 'molten' },
        { type: 'short-answer', question: 'Explain one cause of an eruption.', expectedAnswer: 'Pressure.' },
      ] } },
    { type: 'glossary', id: 'g1', title: 'Key Terms', meta: 'Vocabulary',
      data: [{ term: 'Magma', definition: 'Molten rock below ground.' },
             { term: 'Vent', definition: 'An opening lava flows through.' }] },
    { type: 'note-taking', id: 'n1', title: 'Notes', meta: 'Double-entry',
      data: { templateType: 'double-entry', rows: [{ left: 'Quote', right: 'Reaction' }] } },
  ];

  html = pipeline.generateFullPackHTML(historyItems, 'Volcanoes', false, {}, null);

  // Audit the rendered DOM. runScripts: 'outside-only' lets us inject axe but does NOT run the
  // export's own toolbar/karaoke scripts — we want the static structure.
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
  dom.window.eval(axe.source);
  results = await dom.window.axe.run(dom.window.document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  });
});

describe('HTML export · axe-core WCAG 2.1 A+AA self-audit gate', () => {
  it('produced an export to audit', () => {
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(500);
  });

  it('axe actually evaluated rules (so a 0-violation result is meaningful, not a no-op)', () => {
    // passes = WCAG rules that ran and found no problem. If axe ran on a real DOM this is large.
    expect(results.passes.length).toBeGreaterThan(8);
  });

  it('SCORECARD: log axe pass/incomplete/violation counts + every violation', () => {
    const lines = results.violations.map(v =>
      `  [${v.impact}] ${v.id} (${v.nodes.length}) — ${v.help}\n      e.g. ${(v.nodes[0]?.target || []).join(' ')}`);
    // eslint-disable-next-line no-console
    console.log(`\n=== axe WCAG 2.1 A+AA on the export: ${results.passes.length} passes, ${results.incomplete.length} incomplete (e.g. contrast — needs layout), ${results.violations.length} violations ===\n${lines.join('\n') || '  (no violations)'}\n`);
    expect(Array.isArray(results.violations)).toBe(true);
  });

  it('REGRESSION GATE: no violation outside the documented baseline', () => {
    const ids = results.violations.map(v => v.id);
    const unexpected = ids.filter(id => !BASELINE.has(id));
    expect(unexpected, `New axe violations not in BASELINE: ${unexpected.join(', ')}`).toEqual([]);
  });
});

// Self-check: prove the axe-in-jsdom integration actually FLAGS known failures, so a
// 0-violation result on the real export is trustworthy rather than a silent no-op.
describe('axe-in-jsdom self-check (must flag known failures)', () => {
  it('flags image-without-alt and input-without-label', async () => {
    const bad = `<!DOCTYPE html><html lang="en"><head><title>x</title></head><body>
      <main><img src="x.png"><input type="text"></main></body></html>`;
    const dom = new JSDOM(bad, { runScripts: 'outside-only', pretendToBeVisual: true });
    dom.window.eval(axe.source);
    const r = await dom.window.axe.run(dom.window.document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    });
    const ids = r.violations.map(v => v.id);
    expect(ids).toContain('image-alt');
    expect(ids.some(id => /label|aria-input-field-name/.test(id))).toBe(true);
  });
});
