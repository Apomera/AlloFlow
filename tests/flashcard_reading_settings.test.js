// Lane R4: "Use my reading settings" in the flash-card HTML export, and the
// word-list dialog following the reader's font and text size.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const DIR = process.env.LANE_DIR || '.';
const REPO = process.cwd().replace(/\\/g, '/');
const { JSDOM } = createRequire(REPO + '/package.json')('jsdom');

const FONTS = [
  { id: 'default', label: 'Default (System)', family: '', cssClass: '' },
  { id: 'opendyslexic', label: 'OpenDyslexic', family: "'OpenDyslexic', sans-serif", cssClass: 'font-opendyslexic', googleFont: null },
  { id: 'lexend', label: 'Lexend', family: "'Lexend', sans-serif", cssClass: 'font-lexend', googleFont: 'Lexend:wght@400;500;700' },
];
const DEFAULTS = { fontId: 'default', fontFamily: '', fontClass: '', baseFontSize: 16, lineHeight: 1.6, letterSpacing: 0, colorOverlay: 'none', readingRuler: false, fonts: FONTS };
function bridge(patch = {}) {
  const font = FONTS.find((f) => f.id === (patch.fontId || 'default'));
  const state = { ...DEFAULTS, fontFamily: font.family, fontClass: font.cssClass, ...patch };
  window.__alloReadingSettings = { get: () => ({ ...state }), set: () => {}, subscribe: () => () => {} };
}

beforeAll(() => {
  new Function(readFileSync(REPO + '/ui_font_library_module.js', 'utf8'))();
  new Function(readFileSync(DIR + '/export_module.js', 'utf8'))();
});

const cleanups = [];
afterEach(() => {
  cleanups.splice(0).reverse().forEach((fn) => fn());
  document.querySelectorAll('.agx-overlay').forEach((node) => node.remove());
  delete window.__alloReadingSettings;
  document.body.className = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const FONT_BYTES = new Uint8Array([1, 2, 3, 4]);
function stubFontFetch({ fail = false } = {}) {
  const fetch = vi.fn(async (url) => {
    if (fail) throw new Error('offline');
    return { ok: true, arrayBuffer: async () => FONT_BYTES.buffer.slice(0), text: async () => "@font-face{font-family:'Lexend';src:url(https://fonts.gstatic.com/s/lexend/a.woff2) format('woff2')}" };
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}
const glossary = (extra = {}) => ({
  id: 'g1', type: 'glossary',
  data: [
    { entryId: 'leaf', term: 'Leaf', def: 'A plant part that makes food.' },
    { entryId: 'root', term: 'Root', def: 'The part under the ground.' },
  ],
  ...extra,
});
const withAudio = () => glossary({ karaokeAudio: { format: 'per-entry', version: 4, legacy: {}, entries: {
  a: { identity: { identityVersion: 4, adapterId: 'alloflow.glossary.read-aloud', scopeId: 'main', segmentId: 'entry/leaf/term', spokenText: 'Leaf' }, audio: 'UklGRiQAAABXQVZF', mime: 'audio/wav' },
} } });
function exporter(content) {
  const files = [];
  vi.stubGlobal('Blob', class { constructor(parts) { this.text = parts.join(''); files.push(this); } });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:cards');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const api = window.AlloModules.createExport({ liveRef: { current: { generatedContent: content, t: (k) => k, addToast: () => {} } }, escapeXml: (s) => String(s) });
  return { api, files, html: () => files.at(-1) && files.at(-1).text };
}
const dialog = () => document.querySelector('.agx-overlay [role="dialog"]');
const checkboxes = () => [...dialog().querySelectorAll('input[type="checkbox"]')];
const download = () => [...dialog().querySelectorAll('button')].find((b) => b.textContent === 'Download').click();
const readerStyle = (html) => new DOMParser().parseFromString(html, 'text/html').querySelector('style[data-reader-settings]');

describe('flash-card export: the options step', () => {
  it('settings that differ open the step with "Use my reading settings" on', () => {
    bridge({ baseFontSize: 20 });
    const run = exporter(glossary());
    run.api.handleExportFlashcards('standard');
    expect(run.files, 'nothing downloads before the choice').toHaveLength(0);
    const boxes = checkboxes();
    expect(boxes).toHaveLength(1);
    expect(boxes[0].closest('label').textContent).toBe('Use my reading settings');
    expect(boxes[0].checked).toBe(true);
    const help = document.getElementById(boxes[0].getAttribute('aria-describedby'));
    expect(help.textContent).toBe('Prints with your font, text size and spacing.');
    expect(document.activeElement).toBe(boxes[0]);
  });
  it('default settings with prepared audio: offered after the audio choice, and off', () => {
    bridge();
    const run = exporter(withAudio());
    run.api.handleExportFlashcards('standard');
    const boxes = checkboxes();
    expect(boxes.map((b) => [b.closest('label').textContent, b.checked])).toEqual([['Include prepared audio', true], ['Use my reading settings', false]]);
  });
  it('default settings and no audio: no step, and the file has no reader CSS', () => {
    bridge();
    const fetch = stubFontFetch();
    const run = exporter(glossary());
    run.api.handleExportFlashcards('standard');
    expect(dialog()).toBeNull();
    expect(run.files).toHaveLength(1);
    expect(readerStyle(run.html())).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('without the host bridge nothing changes: no option, no step', () => {
    const run = exporter(glossary());
    run.api.handleExportFlashcards('standard');
    expect(dialog()).toBeNull();
    expect(run.files).toHaveLength(1);
  });
});

describe('flash-card export: the file', () => {
  it('on: embeds the reader font as data and applies the reader CSS', async () => {
    bridge({ fontId: 'opendyslexic', baseFontSize: 20, lineHeight: 1.8, letterSpacing: 0.05 });
    const fetch = stubFontFetch();
    const run = exporter(glossary());
    run.api.handleExportFlashcards('standard');
    download();
    await vi.waitFor(() => expect(run.files).toHaveLength(1));
    const css = readerStyle(run.html()).textContent;
    expect(css.includes("@font-face{font-family:'OpenDyslexic';src:url(data:font/woff;base64,AQIDBA==)"), 'font embedded').toBe(true);
    expect(css.includes('html{font-size:20px}')).toBe(true);
    expect(css.includes("font-family:'OpenDyslexic', sans-serif !important")).toBe(true);
    expect(css.includes('line-height:1.8 !important;letter-spacing:0.05em !important')).toBe(true);
    expect(run.html().includes('cdn.jsdelivr.net'), 'no remote font in the offline file').toBe(false);
    expect(fetch.mock.calls.length).toBe(2);
  });
  it('off: unchecking leaves the reader CSS and the font out', () => {
    bridge({ fontId: 'opendyslexic', baseFontSize: 20 });
    const fetch = stubFontFetch();
    const run = exporter(glossary());
    run.api.handleExportFlashcards('standard');
    checkboxes()[0].click();
    download();
    expect(run.files).toHaveLength(1);
    const html = run.html();
    expect(readerStyle(html)).toBeNull();
    expect(html.includes('@font-face') || html.includes('html{font-size')).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('a font that cannot be embedded falls back to a <link>', async () => {
    bridge({ fontId: 'lexend' });
    stubFontFetch({ fail: true });
    const run = exporter(glossary());
    run.api.handleExportFlashcards('standard');
    download();
    await vi.waitFor(() => expect(run.files).toHaveLength(1));
    const doc = new DOMParser().parseFromString(run.html(), 'text/html');
    expect(doc.querySelector('head link[rel="stylesheet"]').getAttribute('href')).toBe('https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;700&display=swap');
    expect(readerStyle(run.html()).textContent.includes("font-family:'Lexend', sans-serif !important")).toBe(true);
  });
  it('and to the system font when no font face can be had', async () => {
    bridge({ fontId: 'lexend' });
    vi.spyOn(window.AlloModules.UIFontLibrary, 'exportFontFaceCss').mockRejectedValue(new Error('blocked'));
    const run = exporter(glossary());
    run.api.handleExportFlashcards('standard');
    download();
    await vi.waitFor(() => expect(run.files).toHaveLength(1));
    const doc = new DOMParser().parseFromString(run.html(), 'text/html');
    expect(doc.querySelector('head link')).toBeNull();
    expect(run.html().includes('@font-face')).toBe(false);
    expect(readerStyle(run.html()).textContent.includes("font-family:'Lexend', sans-serif !important"), 'the stack ends in a system font').toBe(true);
  });
  it('large text: card text is in rem, the fold guide is in the flow, and the sides stack from 24 px', async () => {
    const exportAt = async (size) => {
      bridge({ baseFontSize: size });
      const run = exporter(glossary());
      run.api.handleExportFlashcards('standard');
      download();
      await vi.waitFor(() => expect(run.files).toHaveLength(1));
      return run.html();
    };
    const big = await exportAt(32);
    const dom = new JSDOM(big);
    cleanups.push(() => dom.window.close());
    const rules = [...dom.window.document.styleSheets].flatMap((sheet) => [...sheet.cssRules]).filter((rule) => rule.style);
    const sizes = rules.filter((rule) => rule.style.fontSize && rule.selectorText !== 'html').map((rule) => [rule.selectorText, rule.style.fontSize]);
    expect(sizes.length).toBeGreaterThan(8);
    expect(sizes.filter(([, value]) => !/rem$/.test(value)), 'every card font size follows the root size').toEqual([]);
    const rule = (selector) => rules.filter((r) => r.selectorText === selector).at(-1);
    expect(rule('html').style.fontSize).toBe('32px');
    expect(rule('.cut-guide').style.position).toBe('static');
    expect(rule('.card-container').style.flexDirection).toBe('column');
    expect(rule('body').style.overflowWrap, 'a long word wraps instead of pushing the page sideways').toBe('break-word');
    document.querySelectorAll('.agx-overlay').forEach((node) => node.remove());
    const small = readerStyle(await exportAt(20)).textContent;
    expect(small.includes('flex-direction:column'), 'side by side below 24 px').toBe(false);
    expect(small.includes('.cut-guide{position:static')).toBe(true);
  });
});

describe('word-list dialog', () => {
  it('sits in <body>, so the body font class reaches it, and sizes its text in rem', () => {
    document.body.className = 'font-opendyslexic';
    const run = exporter(glossary());
    run.api.handleExportGlossaryFile('chooser');
    const overlay = document.querySelector('.agx-overlay');
    expect(overlay.parentElement).toBe(document.body);
    expect(dialog().querySelector('legend').matches('.font-opendyslexic *')).toBe(true);
    const libCss = document.getElementById('alloflow-ui-font-library-css');
    if (libCss) expect(libCss.textContent.includes(".font-opendyslexic, .font-opendyslexic *:not(")).toBe(true);
    const sheet = document.getElementById('allo-gx-style').sheet;
    const all = (list) => [...list].flatMap((r) => (r.style ? [r] : r.cssRules ? all(r.cssRules) : []));
    const sizes = all(sheet.cssRules).filter((r) => r.style).map((r) => r.style.fontSize).filter((value) => value && value !== 'inherit');
    expect(sizes.length).toBeGreaterThanOrEqual(5);
    expect(sizes.filter((value) => !/rem/.test(value) || /\dpx/.test(value)), 'text sizes in rem only').toEqual([]);
  });
});
