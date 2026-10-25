// The downloaded HTML export stays legible in every reading theme, and the original
// with supports draws AlloFlow's own generated Markdown.
//
// WHY (2026-10-25): an export showed "# Justice" and "[⁽¹⁾](https://…)" as literal text
// under "Original with supports", and Dark theme text was too dark to read. Causes:
//  1. The original rendered Markdown only for an explicit format: 'markdown', which the app
//     never records, so generated sources stayed raw.
//  2. The whole-export WCAG fixer judged theme-scoped CSS against the light body and
//     rewrote Dark mode's white text (e.g. .mcq-label) to #737373.
//  3. A color written on an element itself (the adapted passage's #1e293b) ignores the
//     theme; the theme switcher's inkGuard now re-inks text that misses contrast.
//
// ALLO_DOC_PIPELINE_CANDIDATE points the gate at a mutated copy, so it can be
// mutation-checked without touching the shipped module.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { loadAlloModule } from './setup.js';

let contract, pipeline;
const parse = html => new DOMParser().parseFromString(html, 'text/html');
const cfg = { isWorksheet: false, includeOriginalReading: true, includeTeacherKey: false };
const JUSTICE = '# Justice\n\n## What Does It Mean to Be Just?\n\n'
  + 'Justice is a big idea about being fair to all people. [⁽¹⁾](https://en.wikipedia.org/wiki/Justice) '
  + '**Justice is like this balance.**\n\n- Fair rules\n- Equal treatment';

const rgb = value => value.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
const lum = c => { const s = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2]; };
const ratio = (a, b) => { const x = lum(rgb(a)), y = lum(rgb(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
  new Function(readFileSync(process.env.ALLO_DOC_PIPELINE_CANDIDATE || 'doc_pipeline_module.js', 'utf8'))();
  contract = window.AlloModules.InstructionalContext;
  const model = async () => '{}';
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: model, callGeminiVision: model, callImagen: async () => null,
    addToast: () => {}, t: key => key, isRtlLang: () => false,
    updateExportPreview: () => {}, getDefaultTitle: () => 'Reading',
    state: { leveledTextLanguage: 'English', currentUiLanguage: 'English', exportConfig: {} },
  });
}, 60_000); // the 3.7 MB pipeline module can take over the 10 s default on a busy machine

describe('original with supports draws the Markdown AlloFlow generated', () => {
  it('renders headings, citation links and emphasis from a default plain-text snapshot', () => {
    const item = contract.createSupportedReading(JUSTICE, {}), before = JSON.stringify(item);
    expect(item.sourceSnapshot.format).toBe('plain-text');
    const body = parse(pipeline.generateResourceHTML(item, false, {}, cfg)).querySelector('[data-original-text]');
    expect(body.getAttribute('data-original-format')).toBe('markdown');
    expect(body.querySelector('h1').textContent).toBe('Justice');
    expect(body.querySelector('h2').textContent).toBe('What Does It Mean to Be Just?');
    expect(body.querySelector('a').getAttribute('href')).toBe('https://en.wikipedia.org/wiki/Justice');
    expect(body.querySelector('strong').textContent).toBe('Justice is like this balance.');
    expect(body.querySelectorAll('li')).toHaveLength(2);
    expect(body.textContent).not.toMatch(/\[⁽|\]\(https|\*\*|(^|\n)\s*#/);
    expect(JSON.stringify(item)).toBe(before);
    expect(contract.isSupportedOriginal(item)).toBe(true);
  });

  it('a grounded citation alone is enough to render the source as Markdown', () => {
    const item = contract.createSupportedReading('Fairness matters. [⁽²⁾](https://www.law.cornell.edu/wex/justice) It is reasonable.', {});
    const body = parse(pipeline.generateResourceHTML(item, false, {}, cfg)).querySelector('[data-original-text]');
    expect(body.getAttribute('data-original-format')).toBe('markdown');
    expect(body.querySelector('a').getAttribute('href')).toBe('https://www.law.cornell.edu/wex/justice');
  });

  it('plain text without generated markup stays character-exact', () => {
    const source = 'Use #1 first.\r\n**Literal stars** and [Link notation](https://example.test/) stay.\r\n';
    const item = contract.createSupportedReading(source, {});
    const body = parse(pipeline.generateResourceHTML(item, false, {}, cfg)).querySelector('[data-original-text]');
    expect(body.getAttribute('data-original-format')).toBe('plain-text');
    expect(body.textContent).toBe(source);
  });
});

describe('the WCAG fixer leaves reading-theme CSS alone', () => {
  it('keeps theme-scoped colors and still fixes an unscoped faint color', () => {
    const html = '<!doctype html><html><head><meta charset="utf-8"><style>'
      + 'html[data-alloflow-theme="dark"] .mcq-label { color: #ffffff !important; }\n'
      + 'html[data-alloflow-theme="dark"] .reflection-block > p:first-child { color: #c7d2fe !important; }\n'
      + 'html[data-alloflow-theme="sepia"] .note, html[data-alloflow-theme="hc"] .note { color: #f8fafc; }\n'
      + '.faint { color: #cccccc; }</style></head><body><p class="faint">x</p></body></html>';
    const out = pipeline.fixContrastViolations(html).html;
    expect(out.includes('.mcq-label { color: #ffffff !important; }'), 'dark rule kept').toBe(true);
    expect(out.includes('p:first-child { color: #c7d2fe !important; }'), 'child-combinator dark rule kept').toBe(true);
    expect(out.includes('.note { color: #f8fafc; }'), 'sepia/hc rule kept').toBe(true);
    expect(out.includes('.faint { color: #cccccc; }'), 'unscoped faint color is still fixed').toBe(false);
  });

  it('a full export ships Dark mode answer text white, not the #737373 rewrite', () => {
    const html = pipeline.generateFullPackHTML([{ type: 'quiz', id: 'q1', title: 'Check', data: { questions: [
      { type: 'mcq', question: 'Is justice fair?', options: ['Yes', 'No'], correctAnswer: 'Yes' }] } }], 'Justice', false, {}, cfg);
    expect(html.includes('html[data-alloflow-theme="dark"] .mcq-label { color: #ffffff !important; }')).toBe(true);
    expect(html.includes('.mcq-label { color:#737373')).toBe(false);
  });
});

// Every teacher-chosen export style, and the teacher copy, in Light (no runtime re-inking).
// 2026-10-25 audit: answer keys were #16a34a (3.3:1), High Contrast style's Cornell headers
// were white on lavender (1.23:1), Minimalist section titles missed 4.5:1 on tinted headers.
describe('every export style and the teacher copy stay legible in Light', () => {
  let browser;
  const pack = JSON.parse(readFileSync('allopacks/american_revolution_causes_grade5.allopack.json', 'utf8'));
  const exportFor = (state, config) => window.AlloModules.createDocPipeline({
    callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
    addToast: () => {}, t: key => key, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Reading',
    state: { leveledTextLanguage: 'English', currentUiLanguage: 'English', exportConfig: {}, ...state },
  }).generateFullPackHTML(pack.history, pack.sourceTopic, false, {}, { ...cfg, ...config });
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); }, 60_000);
  afterAll(async () => { await browser?.close(); }, 30_000);

  // Readable text below AA on its painted surface; aria-hidden decoration and disabled controls are exempt.
  const missesAA = async html => {
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'load' });
      const once = page.getByRole('button', { name: 'Use once without autosave' });
      if (await once.count()) await once.first().click();
      // Settled colors: no mid-transition reads, and the debounced load-time ink pass has run.
      await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });
      await page.waitForTimeout(400);
      return await page.evaluate(() => {
        const parse = s => { const p = String(s).match(/[\d.]+/g).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
        const over = (t, u) => ({ r: t.r * t.a + u.r * (1 - t.a), g: t.g * t.a + u.g * (1 - t.a), b: t.b * t.a + u.b * (1 - t.a), a: 1 });
        const lum = c => [c.r, c.g, c.b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
        const surface = el => { const layers = []; for (let n = el; n; n = n.parentElement) { const cs = getComputedStyle(n), c = parse(cs.backgroundColor); if (cs.backgroundImage !== 'none' && c.a < 1 && !/1px, transparent 1px\)/.test(cs.backgroundImage)) return null; if (c.a > 0) { layers.push(c); if (c.a >= 1) break; } } return layers.reverse().reduce((u, t) => over(t, u), { r: 255, g: 255, b: 255, a: 1 }); };
        const out = [];
        for (const el of document.body.querySelectorAll('*')) {
          if (el.closest('svg, script, style, [aria-hidden="true"], :disabled') || !el.getClientRects().length) continue;
          if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
          const cs = getComputedStyle(el), bg = surface(el);
          if (!bg || cs.visibility === 'hidden') continue;
          const fg = over(parse(cs.color), bg), x = lum(fg), y = lum(bg), ratio = (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
          const size = parseFloat(cs.fontSize), large = size >= 24 || (+cs.fontWeight >= 700 && size >= 18.66);
          if (ratio < (large ? 3 : 4.5)) out.push(el.tagName + ' ' + cs.color + ' on ' + JSON.stringify(bg) + ' ' + ratio.toFixed(2) + ' "' + el.textContent.trim().slice(0, 30) + '"');
        }
        return out;
      });
    } finally { await page.close(); }
  };

  it('the teacher copy (answer keys included)', async () => {
    const misses = await missesAA(exportFor({}, { includeTeacherKey: true }));
    expect(misses, misses.slice(0, 5).join('\n')).toEqual([]);
  }, 60_000);

  it.each(['professional', 'academic', 'elementary', 'minimal', 'highContrast', 'nature', 'print', 'magazine', 'dark'])('the %s export style', async style => {
    const misses = await missesAA(exportFor({ exportTheme: style }, {}));
    expect(misses, misses.slice(0, 5).join('\n')).toEqual([]);
  }, 60_000);
});

// A real browser: jsdom settles competing !important rules by source order alone, so it
// cannot show whether the ink beats a resource's own !important color.
describe('inkGuard re-inks text whose own color misses contrast in a reading theme', () => {
  let browser, page;
  beforeAll(async () => {
    const snapshot = contract.createSourceSnapshot(JUSTICE, { sourceArtifactId: 'src-justice', language: 'English' });
    const adapted = {
      id: 'adapt-justice', type: 'simplified', title: 'Adapted Text (5th Grade)', data: 'Justice means being **fair** to everyone.',
      sourceSnapshot: snapshot, sourceFamilyId: 'src-justice', instructionalText: { schemaVersion: 1, role: 'supplemental', form: 'adapted' },
    };
    const glossary = { id: 'g1', type: 'glossary', title: 'Key Terms', data: [{ term: 'Colony', definition: 'A place ruled by a country far away.' }] };
    const frames = JSON.parse(readFileSync('allopacks/argument_evidence_grade6.allopack.json', 'utf8')).history.find(item => item.type === 'sentence-frames');
    const html = pipeline.generateFullPackHTML([adapted, glossary, frames], 'Justice', false, {}, { ...cfg, includeGlossary: true, includeSimplified: true, includeSentenceFrames: true });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
  }, 60_000);
  afterAll(async () => { await browser?.close(); }, 30_000);

  // Click the toolbar theme button (the page's own code), then read painted colors.
  const pick = theme => page.evaluate(theme => {
    document.querySelector('[data-rt-theme="' + theme + '"]').click();
    const surface = el => { for (let n = el; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; if (c.startsWith('rgb(')) return c; } return 'rgb(255, 255, 255)'; };
    const read = el => (el ? { color: getComputedStyle(el).color, bg: surface(el) } : null);
    return {
      passage: read([...document.querySelectorAll('#adapt-justice p')].find(p => p.textContent.includes('Justice means'))),
      term: read(document.querySelector('.gloss-term')),
      frameNumber: read(document.querySelector('.alloflow-frame-num')),
      marks: document.querySelectorAll('[data-allo-ink]').length,
    };
  }, theme);

  it('the adapted passage is readable in Dark (it was #1e293b on #1e293b)', async () => {
    const { passage, marks } = await pick('dark');
    expect(passage, 'adapted passage paragraph found').not.toBeNull();
    expect(ratio(passage.color, passage.bg)).toBeGreaterThanOrEqual(4.5);
    expect(marks).toBeGreaterThan(0);
  });

  it('High Contrast reaches 7:1 even over a resource\'s own !important color', async () => {
    const { term, frameNumber } = await pick('hc');
    expect(term, 'glossary term found').not.toBeNull();
    expect(ratio(term.color, term.bg)).toBeGreaterThanOrEqual(7);
    // Sentence-frame numbers were white on indigo (6.29:1).
    expect(frameNumber, 'sentence-frame number found').not.toBeNull();
    expect(ratio(frameNumber.color, frameNumber.bg)).toBeGreaterThanOrEqual(7);
  });

  it('Light clears every mark and restores the authored colors', async () => {
    const { passage, marks } = await pick('light');
    expect(marks).toBe(0);
    expect(passage.color).toBe('rgb(30, 41, 59)');
  });
});
