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

  it('reads an 8-digit hex tint as translucent, not as a solid surface', () => {
    // Read as opaque, #dc26261a looked like solid red: red badge text was "fixed" to near-white
    // (1.1:1), and a #b91c1c11 drop zone was handed color:#ffffff.
    const html = '<!doctype html><html><head><meta charset="utf-8"></head><body>'
      + '<span style="background: #dc26261a; color: #dc2626;">Idea 1</span><div style="background: #b91c1c11; padding: 4px;">Zone</div></body></html>';
    const out = pipeline.fixContrastViolations(html).html;
    expect(out.includes('<span style="background: #dc26261a; color: #dc2626;">'), 'badge color kept').toBe(true);
    expect(out.includes('<div style="background: #b91c1c11; padding: 4px;">'), 'no white added to the tint').toBe(true);
  });

  it('leaves the export\'s own interface CSS as written, even on a Dark base', () => {
    // Judged against a dark body, text on the white erase-confirm card was lightened to 3.45:1.
    const html = pipeline.generateFullPackHTML([{ type: 'quiz', id: 'q1', title: 'Check', data: { questions: [
      { type: 'mcq', question: 'Fair?', options: ['Yes', 'No'], correctAnswer: 'Yes' }] } }], 'Justice', false, {}, cfg);
    const dark = window.AlloModules.createDocPipeline({
      callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
      addToast: () => {}, t: key => key, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Reading',
      state: { leveledTextLanguage: 'English', currentUiLanguage: 'English', exportConfig: {}, exportTheme: 'dark' },
    }).generateFullPackHTML([{ type: 'quiz', id: 'q1', title: 'Check', data: { questions: [
      { type: 'mcq', question: 'Fair?', options: ['Yes', 'No'], correctAnswer: 'Yes' }] } }], 'Justice', false, {}, cfg);
    for (const out of [html, dark]) {
      expect(out.includes('.alloflow-anno-confirm p { margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #334155; }')).toBe(true);
      expect(out.includes('.alloflow-anno-item-text { display: block; font-weight: 500; color: #1e293b;')).toBe(true);
    }
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
  // Resource types no pack carries; fluency word colors and brainstorm badges missed AA in Light.
  const extras = [
    { id: 'fl1', type: 'fluency-record', title: 'Fluency check', data: { metrics: { wcpm: 92, accuracy: 94, totalWords: 3, durationSeconds: 2 }, feedback: 'Slow down on names.',
      wordData: [{ word: 'The', status: 'correct' }, { word: 'colonists', status: 'stumbled' }, { word: 'gathered', status: 'missed' }] } },
    { id: 'bs1', type: 'brainstorm', title: 'Brainstorm', data: [1, 2, 3, 4, 5, 6, 7, 8].map(n => ({ title: 'Idea ' + n, description: 'Why it matters' })) },
    { id: 'dbq1', type: 'dbq', title: 'Why resist?', data: { historicalContext: 'Taxes rose after 1763.', documents: [{ id: 'A', title: 'Document A', source: 'Boston Gazette, 1765', content: 'No taxation without representation!' }],
      synthesisPrompt: 'Explain the conflict.', rubric: [{ criterion: 'Claim', description: 'States a claim.' }] } },
    { id: 'udl1', type: 'udl-advice', title: 'UDL Strategies', data: '## Engagement\n\n- Offer a **choice** of source.' },
  ];
  const exportFor = (state, config, extra = []) => window.AlloModules.createDocPipeline({
    callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
    addToast: () => {}, t: key => key, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Reading',
    state: { leveledTextLanguage: 'English', currentUiLanguage: 'English', exportConfig: {}, ...state },
  }).generateFullPackHTML(pack.history.concat(extra), pack.sourceTopic, false, {}, { ...cfg, includeDbq: true, ...config });
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); }, 60_000);
  afterAll(async () => { await browser?.close(); }, 30_000);

  // Readable text below AA on its painted surface; aria-hidden decoration and disabled controls are exempt.
  // authored: measure the export's own colors (what prints, and what a reader without scripts
  // sees) by lifting the runtime ink first. Dark-base exports rely on that ink by design.
  const missesAA = async (html, { authored = false } = {}) => {
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'load' });
      const once = page.getByRole('button', { name: 'Use once without autosave' });
      if (await once.count()) await once.first().click();
      // Settled colors: no mid-transition reads, and the debounced load-time ink pass has run.
      await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });
      await page.waitForTimeout(400);
      if (authored) await page.evaluate(() => document.querySelectorAll('[data-allo-ink]').forEach(el => el.removeAttribute('data-allo-ink')));
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

  it('the teacher copy (answer keys, fluency, brainstorm, DBQ and UDL advice included)', async () => {
    const html = exportFor({}, { includeTeacherKey: true }, extras);
    for (const id of ['fl1', 'bs1', 'dbq1', 'udl1']) expect(html.includes('data-alloflow-resource-id="' + id + '"'), id + ' rendered').toBe(true);
    const misses = await missesAA(html, { authored: true });
    expect(misses, misses.slice(0, 5).join('\n')).toEqual([]);
  }, 60_000);

  // Brand profiles saved through the real module (so each passes the editor's validation). A dark
  // brand page used to leave its passage #1e293b on a #1e293b card, and the fixer lightened text
  // on white cards against the dark page; tinted light brand cards failed slate-500 greys.
  // The header/footer bands come from the ACTIVE brand, which need not be the chosen style.
  const BRANDS = {
    dark: { bg: '#0f172a', body: '#e2e8f0', heading: '#fbbf24', accent: '#38bdf8', cardBg: '#1e293b', cardBorder: '#334155' },
    // Heading vs page is 3.3:1, which validation allows; the band text must not inherit that.
    tinted: { bg: '#f0fdfa', body: '#134e4a', heading: '#0d9488', accent: '#14b8a6', cardBg: '#ccfbf1', cardBorder: '#5eead4' },
  };
  const saveBrand = (key) => {
    loadAlloModule('brand_profile_module.js');
    const saved = window.AlloModules.BrandProfile.saveBrandProfile({ name: 'Test ' + key, colors: BRANDS[key], header: { text: 'Grade 6 Social Studies', showLogo: false }, footer: { text: 'For families', showPageNumber: true } });
    expect(saved.ok, saved.errors.join('; ')).toBe(true);
    return saved.id;
  };
  it.each([['dark-page brand', 'dark', 'dark'], ['tinted light brand', 'tinted', 'tinted'], ['tinted brand style under dark-brand bands', 'tinted', 'dark']])('a %s, teacher copy', async (name, styleKey, activeKey) => {
    const style = saveBrand(styleKey), active = activeKey === styleKey ? style : saveBrand(activeKey);
    window.AlloModules.BrandProfile.setActiveBrandProfile(active);
    const html = exportFor({ exportTheme: style }, { includeTeacherKey: true });
    expect(html.includes('class="brand-header"'), 'brand band rendered').toBe(true);
    // A dark brand page opens in the full dark mode (screen re-inking alone would hide this;
    // print and the fixer depend on it). The footer takes the page's text color: the active
    // brand's body color was chosen for its own page, and the fixer greyed it elsewhere.
    expect(/<html\b[^>]*\bdata-alloflow-base-theme="([a-z]+)"/.exec(html)?.[1], 'base theme on <html>').toBe(styleKey === 'dark' ? 'dark' : 'light');
    expect(html.includes('.brand-footer { border-top: 1px solid ' + BRANDS[activeKey].cardBorder + '; color: inherit;'), 'footer inherits the page color').toBe(true);
    const misses = await missesAA(html, { authored: styleKey !== 'dark' });
    expect(misses, misses.slice(0, 5).join('\n')).toEqual([]);
  }, 60_000);

  it.each(['professional', 'academic', 'elementary', 'minimal', 'highContrast', 'nature', 'print', 'magazine', 'dark'])('the %s export style', async style => {
    const misses = await missesAA(exportFor({ exportTheme: style }, {}), { authored: style !== 'dark' });
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
    const once = page.getByRole('button', { name: 'Use once without autosave' });
    if (await once.count()) await once.first().click();
    await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });
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

  // 2026-10-25 overlay audit: the erase-confirm title was white on its white card in Dark, tool-row
  // labels were #64748b on the dark tray, and the pink note header was 3.9:1 in every theme.
  it('dialogs and annotation tools stay legible in every theme', async () => {
    const read = (theme, selector) => page.evaluate(([theme, selector]) => {
      document.querySelector('[data-rt-theme="' + theme + '"]').click();
      const el = document.querySelector(selector);
      if (!el) return null;
      let bg = 'rgb(255, 255, 255)';
      for (let n = el; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; if (c.startsWith('rgb(')) { bg = c; break; } }
      return { color: getComputedStyle(el).color, bg };
    }, [theme, selector]);
    const need = theme => (theme === 'hc' ? 7 : 4.5);
    // Erase stays disabled until a student has marks; the dialog is class-styled, so mount the
    // structure askAnnotationConfirmation builds.
    await page.evaluate(() => {
      const o = document.createElement('div'); o.className = 'alloflow-anno-confirm-backdrop'; o.id = 'test-confirm';
      o.innerHTML = '<div class="alloflow-anno-confirm" role="alertdialog"><h2>Erase your marks?</h2><p>This removes everything you marked.</p></div>';
      document.body.appendChild(o);
    });
    for (const theme of ['dark', 'sepia', 'hc']) for (const part of ['h2', 'p']) {
      const r = await read(theme, '.alloflow-anno-confirm ' + part);
      expect(ratio(r.color, r.bg), theme + ' confirm ' + part).toBeGreaterThanOrEqual(need(theme));
    }
    await page.evaluate(() => document.getElementById('test-confirm').remove());
    await page.click('[data-rt-anno="note"]');
    for (const theme of ['dark', 'sepia', 'hc']) {
      const r = await read(theme, '.alloflow-anno-colors-note .alloflow-anno-colors-label');
      expect(ratio(r.color, r.bg), theme + ' tool label').toBeGreaterThanOrEqual(need(theme));
    }
    await page.click('[data-rt-note-color="pink"]');
    await page.locator('#adapt-justice p', { hasText: 'Justice means' }).click();
    for (const theme of ['light', 'hc']) {
      const r = await read(theme, '.alloflow-note-editor-header');
      expect(r, 'note editor open').not.toBeNull();
      expect(ratio(r.color, r.bg), theme + ' pink note header').toBeGreaterThanOrEqual(need(theme));
    }
    await page.evaluate(() => document.querySelectorAll('.alloflow-note-editor').forEach(e => e.remove()));
    await page.click('[data-rt-anno="off"]');
  });

  it('Light clears every mark and restores the authored colors', async () => {
    const { passage, marks } = await pick('light');
    expect(marks).toBe(0);
    expect(passage.color).toBe('rgb(30, 41, 59)');
  });

  it('Light also re-inks text added later that misses contrast, but not decoration', async () => {
    // Brand tints, custom styles and later content: the guard runs in Light too, screen only.
    await page.evaluate(() => {
      const section = document.querySelector('#adapt-justice');
      section.insertAdjacentHTML('beforeend', '<p id="test-faint" style="color:#a3a3a3">Faint authored text</p>'
        + '<div id="test-deco" aria-hidden="true" style="color:#a3a3a3">◆ ◆ ◆</div>');
    });
    await page.waitForTimeout(400); // the debounced pass after an added element
    const read = await page.evaluate(() => {
      const surface = el => { for (let n = el; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; if (c.startsWith('rgb(')) return c; } return 'rgb(255, 255, 255)'; };
      const out = {};
      for (const id of ['test-faint', 'test-deco']) { const el = document.getElementById(id); out[id] = { color: getComputedStyle(el).color, bg: surface(el) }; el.remove(); }
      return out;
    });
    expect(ratio(read['test-faint'].color, read['test-faint'].bg)).toBeGreaterThanOrEqual(4.5);
    expect(read['test-deco'].color).toBe('rgb(163, 163, 163)');
  });
});
