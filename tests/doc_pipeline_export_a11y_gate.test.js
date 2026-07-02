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
import { JSDOM, VirtualConsole } from 'jsdom';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

// Second, INDEPENDENT engine: IBM Equal Access (accessibility-checker-engine) — the same engine
// the PDF-remediation pipeline runs for "two-engine consensus" with axe. ace-node is its headless
// build. Loading a second engine catches issues axe's ruleset misses (and vice versa).
const require = createRequire(import.meta.url);
const aceMod = require('accessibility-checker-engine/ace-node');
const aceEngine = aceMod.ace || aceMod;

// Rule IDs each engine currently reports on the export that are NOT yet fixed (the live "remaining
// work" scorecard). The gate FAILS if a violation appears that is NOT in the engine's baseline (a
// regression). Shrink toward []. Two engines = two baselines.
const BASELINE = new Set([
  // axe (filled in from the first run — see console output)
]);
const ACE_BASELINE = new Set([
  // IBM Equal Access VIOLATION-level rule IDs that are known/accepted. Currently EMPTY — the export
  // has 0 VIOLATION-level failures (matches axe's 0). ace may report RECOMMENDATION-level (advisory,
  // not gated) `aria_content_in_landmark` items; known advisory cases are ACCEPTED, NOT regressions:
  //   1. body > a.sr-only  — the skip link. Correct-by-design: a skip link MUST precede the landmarks
  //      (WCAG 2.4.1 / technique G1), so it cannot itself live inside one. Known ace false-positive.
]);

let html;
let pipeline;
let results;
let aceResults;
let aceViolations;

const hexRgb = (hex) => {
  const h = String(hex || '').replace('#', '').trim();
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const luminance = (hex) => {
  const rgb = hexRgb(hex);
  if (!rgb) return null;
  const c = rgb.map((v) => {
    const n = v / 255;
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (fg, bg) => {
  const a = luminance(fg);
  const b = luminance(bg);
  if (a == null || b == null) return null;
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};
const waitForExportRuntime = (win) => new Promise((resolve) => {
  const done = () => win.setTimeout(resolve, 0);
  if (win.document.readyState === 'complete' || win.document.readyState === 'interactive') done();
  else win.document.addEventListener('DOMContentLoaded', done, { once: true });
});

beforeAll(async () => {
  loadAlloModule('doc_pipeline_module.js');
  const factory = window.AlloModules.createDocPipeline;
  const stub = async () => '{}';
  pipeline = factory({
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
      // The first term carries < & > " to prove the glossary escaping (text + alt attr).
      data: [{ term: 'Magma & "lava" <hot>', definition: 'Molten rock below ground.' },
             { term: 'Vent', definition: 'An opening lava flows through.' }] },
    { type: 'note-taking', id: 'n1', title: 'Notes', meta: 'Double-entry',
      data: { templateType: 'double-entry', rows: [{ left: 'Quote', right: 'Reaction' }] } },
  ];

  html = pipeline.generateFullPackHTML(historyItems, 'Volcanoes', false, {}, {
    annotations: [],
    annotationsByResource: {
      s1: [
        { id: 'teacher-note-s1', kind: 'note', x: 42, y: 92, content: 'Check this key idea.', color: 'yellow', author: 'teacher', createdAt: '2026-06-01T12:00:00.000Z' },
      ],
      q1: [
        { id: 'teacher-sticker-q1', type: 'star', x: 64, y: 84, author: 'teacher', createdAt: '2026-06-01T12:00:00.000Z' },
      ],
    },
  });

  // Audit the rendered DOM. runScripts: 'outside-only' lets us inject axe but does NOT run the
  // export's own toolbar/karaoke scripts — we want the static structure.
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
  dom.window.eval(axe.source);
  results = await dom.window.axe.run(dom.window.document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  });

  // Second engine — IBM Equal Access, WCAG_2_1 ruleset, over the same export DOM (fresh JSDOM so
  // axe and ace don't interfere). A real violation = outcome FAIL with VIOLATION severity (ace also
  // reports RECOMMENDATION / POTENTIAL / MANUAL outcomes, which are advisory and excluded here).
  const aceDom = new JSDOM(html, { pretendToBeVisual: true });
  const aceReport = await new aceEngine.Checker().check(aceDom.window.document, ['WCAG_2_1']);
  aceResults = (aceReport && aceReport.results) || [];
  aceViolations = aceResults.filter((r) => r.value && r.value[1] === 'FAIL' && r.value[0] === 'VIOLATION');
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

  it('escapes raw text content (4.1.1) — special chars become entities, never raw markup', () => {
    // The seeded glossary term "Magma & \"lava\" <hot>" must appear entity-encoded, not raw.
    expect(html).toContain('Magma &amp; &quot;lava&quot; &lt;hot&gt;');
    expect(html).not.toContain('<hot>');
    // and the lesson topic / quiz option special chars too
    expect(html).toContain('Yes &amp; true');
  });

  it('embeds teacher annotations for every resource and wraps each resource for targeting', () => {
    expect(html).toContain('id="alloflow-teacher-annotations-by-resource"');
    expect(html).toContain('"s1":[{"id":"teacher-note-s1"');
    expect(html).toContain('"q1":[{"id":"teacher-sticker-q1"');
    expect(html).toContain('data-alloflow-resource-id="s1"');
    expect(html).toContain('data-alloflow-resource-id="q1"');
  });

  it('keeps export toolbars and save controls inside landmarks', () => {
    expect(html).toContain('class="alloflow-reading-tools-shell expanded" aria-label="Reading and annotation tools"');
    expect(html).toContain('<aside class="alloflow-export-save-tools" aria-label="Save your work">');
  });

  it('ships exported reading tools for font, spacing, and pointer-guided reading', () => {
    expect(html).toContain('data-rt-font');
    expect(html).toContain('Dyslexia-friendly');
    expect(html).toContain('data-rt-text="letter"');
    expect(html).toContain('data-rt-guide="line"');
    expect(html).toContain('data-rt-guide="focus"');
    expect(html).toContain('id="alloflow-reader-line"');
    expect(html).toContain('id="alloflow-reader-mask-top"');
    expect(html).toContain('alloflow-reader-guide');
  });

  it('collapses reading tools into a compact mobile tray', () => {
    expect(html).toContain('class="alloflow-tools-toggle"');
    expect(html).toContain('id="alloflow-tools-panel"');
    expect(html).toContain("matchMedia('(max-width: 720px)')");
  });

  it('SCORECARD: log axe pass/incomplete/violation counts + every violation', () => {
    const lines = results.violations.map(v =>
      `  [${v.impact}] ${v.id} (${v.nodes.length}) — ${v.help}\n      e.g. ${(v.nodes[0]?.target || []).join(' ')}`);
    // eslint-disable-next-line no-console
    console.log(`\n=== axe WCAG 2.1 A+AA on the export: ${results.passes.length} passes, ${results.incomplete.length} incomplete (e.g. contrast — needs layout), ${results.violations.length} violations ===\n${lines.join('\n') || '  (no violations)'}\n`);
    expect(Array.isArray(results.violations)).toBe(true);
  });

  it('2.1.1 keyboard path shipped: annotation can be created without a mouse', () => {
    // The annotation runtime is mouse-based (click→note, mouseup+selection→highlight). The keyboard
    // path makes the content area focusable while annotating and adds an Enter handler that mirrors
    // both. Assert that path is present in the exported runtime (a regression guard — the actual
    // keyboard INTERACTION still needs a real-browser smoke; jsdom can't drive it).
    expect(html).toContain("host.addEventListener('keydown'");
    expect(html).toContain("Press Enter here to add a note");
    expect(html).toContain("host.setAttribute('tabindex', '0')");
  });

  it('annotation runtime initializes in the downloaded HTML and opens the inline note editor', async () => {
    const runtimeErrors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', (err) => {
      const msg = String((err && (err.stack || err.message)) || err || '');
      if (/SyntaxError|Uncaught/i.test(msg)) runtimeErrors.push(msg);
    });
    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://example.test/export.html',
      virtualConsole,
    });
    await waitForExportRuntime(dom.window);
    expect(runtimeErrors).toEqual([]);

    const noteBtn = dom.window.document.querySelector('[data-rt-anno="note"]');
    const host = dom.window.document.getElementById('main-export-content');
    expect(noteBtn).toBeTruthy();
    expect(host).toBeTruthy();
    expect(dom.window.document.getElementById('s1')?.querySelector('.alloflow-anno-note')).toBeTruthy();
    expect(dom.window.document.getElementById('q1')?.querySelector('.alloflow-anno-sticker')).toBeTruthy();
    noteBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, clientX: 12, clientY: 12 }));
    expect(noteBtn.getAttribute('aria-pressed')).toBe('true');
    host.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, clientX: 90, clientY: 140 }));
    await new Promise((resolve) => dom.window.setTimeout(resolve, 0));
    expect(dom.window.document.querySelector('.alloflow-note-editor textarea')).toBeTruthy();
  });

  it('teacher note pins open as an inline popover instead of a toast or alert', () => {
    expect(html).toContain('className = \'alloflow-note-popover\'');
    expect(html).toContain('function showNotePopover');
    expect(html).toContain('showNotePopover(a, note)');
    expect(html).not.toContain('alert(noteMessage)');
  });

  it('annotation color swatches are wired to the toolbar mode classes', () => {
    expect(html).toContain('.alloflow-reading-tools.mode-note ~ .alloflow-anno-colors-note');
    expect(html).toContain('.alloflow-reading-tools.mode-highlight ~ .alloflow-anno-colors-hl');
  });

  it('keeps the plain JSON save CTA hidden unless answer fields exist', () => {
    expect(html).toContain('id="alloflow-savejson-cta" style="display:none;');
    expect(html).toContain(".interactive-textarea, .interactive-blank, .question[data-correct]");
  });

  it('keeps export-only chrome themed across dark, sepia, and high contrast modes', () => {
    expect(html).toContain('html[data-alloflow-theme="dark"] .alloflow-toc');
    expect(html).toContain('html[data-alloflow-theme="sepia"] .alloflow-audio-downloads');
    expect(html).toContain('html[data-alloflow-theme="hc"] .alloflow-export-save-tools');
    expect(html).toContain('html[data-alloflow-theme="dark"] .alloflow-rt-select');
    expect(html).toContain('html[data-alloflow-theme="hc"] .alloflow-section-marker span:last-child');
  });

  it('keeps default downloaded HTML useful offline and printable for long sections', () => {
    expect(html).not.toContain('fonts.googleapis.com/css2?family=Inter');
    expect(html).toContain('.section { margin-bottom: 2rem; page-break-inside: auto; break-inside: auto;');
    expect(html).toContain('.resource-header, .card, .quiz-box, .question, .reflection-block, figure');
  });

  it('read-aloud controls support pause/resume without stealing text clicks from annotations', () => {
    expect(html).toContain('function pause()');
    expect(html).toContain('function resume()');
    expect(html).toContain('allo-ka-stop');
    expect(html).toContain('function findAudioBox');
    expect(html).toContain('speechSynthesis');
    expect(html).toContain('Resume');
  });

  it('Venn diagram export stays legible at large text sizes via stable visual text and auto-open fallback', () => {
    const vennHtml = pipeline.generateResourceHTML({
      type: 'outline',
      id: 'venn1',
      title: 'Compare',
      data: {
        main: 'Compare and Contrast',
        structureType: 'Venn Diagram',
        branches: [
          { title: 'You-Statements', items: ['Focus on the person', 'Make the other person feel attacked'] },
          { title: 'I-Statements', items: ['Focus on your own feelings', 'Make it easier to listen'] },
          { title: 'Shared', items: ['Ways to communicate', 'Involve talking about a problem'] },
        ],
      },
    }, false, {}, {});
    expect(vennHtml).toContain('class="venn-visual"');
    expect(vennHtml).toContain('font-size: 16px');
    expect(vennHtml).toContain('data-diagram-auto-open="large-text"');
  });

  it('curated export themes expose contrast-clamped text colors for body, headings, and links', () => {
    const themes = pipeline.EXPORT_THEMES || {};
    expect(Object.keys(themes).length).toBeGreaterThanOrEqual(4);
    for (const [id, theme] of Object.entries(themes)) {
      const bg = theme.bgColor || '#ffffff';
      const surface = theme.cardBg || bg;
      for (const pair of [
        ['textColor', bg, 4.5],
        ['textColor', surface, 4.5],
        ['headingColor', bg, 3.0],
        ['headingColor', surface, 3.0],
        ['accentColor', bg, 4.5],
        ['accentColor', surface, 4.5],
      ]) {
        const [token, against, target] = pair;
        const got = contrast(theme[token], against);
        if (got == null) continue;
        expect(got, `${id}.${token} on ${against}`).toBeGreaterThanOrEqual(target - 0.05);
      }
    }
  });

  it('REGRESSION GATE: no violation outside the documented baseline', () => {
    const ids = results.violations.map(v => v.id);
    const unexpected = ids.filter(id => !BASELINE.has(id));
    expect(unexpected, `New axe violations not in BASELINE: ${unexpected.join(', ')}`).toEqual([]);
  });
});

describe('HTML export · IBM Equal Access (ace) WCAG_2_1 self-audit gate — second engine', () => {
  it('ace actually evaluated rules (so its result is meaningful, not a no-op)', () => {
    expect(aceResults.length).toBeGreaterThan(8);
  });

  it('SCORECARD: log ace pass/fail/violation counts + every FAIL (violation + recommendation)', () => {
    const fails = aceResults.filter((r) => r.value && r.value[1] === 'FAIL');
    const lines = fails.map((v) => `  [${v.value[0]}] ${v.ruleId} — ${v.path && v.path.dom}`);
    // eslint-disable-next-line no-console
    console.log(`\n=== IBM Equal Access (WCAG_2_1) on the export: ${aceResults.length} checks, ${fails.length} FAIL (${aceViolations.length} VIOLATION-level) ===\n${lines.join('\n') || '  (no failures)'}\n`);
    expect(Array.isArray(aceResults)).toBe(true);
  });

  it('REGRESSION GATE: no ace VIOLATION outside the documented baseline', () => {
    const ids = aceViolations.map((v) => v.ruleId);
    const unexpected = ids.filter((id) => !ACE_BASELINE.has(id));
    expect(unexpected, `New ace violations not in ACE_BASELINE: ${unexpected.join(', ')}`).toEqual([]);
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

  it('ace flags a known failure too (so its 0-violations is also trustworthy)', async () => {
    const bad = `<!DOCTYPE html><html lang="en"><head><title>x</title></head><body><main><img src="x.png"></main></body></html>`;
    const dom = new JSDOM(bad, { pretendToBeVisual: true });
    const report = await new aceEngine.Checker().check(dom.window.document, ['WCAG_2_1']);
    const fails = (report.results || []).filter((r) => r.value && r.value[1] === 'FAIL');
    expect(fails.some((r) => /img|alt/i.test(r.ruleId))).toBe(true);
  });
});
