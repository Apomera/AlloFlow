// HTML downloads carry the teacher's chosen document font inside the file,
// so OpenDyslexic, Lexend and the rest still show offline and opening the
// page contacts no font server. Only the character subsets the document uses
// are embedded; any failure leaves the page as it was. Network is faked here;
// a real-network, offline-render check: C:\tmp\export_fonts\e2e_font_embed.cjs.
import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let embed;
let pipeline;
const state = {};

beforeAll(() => {
  loadAlloModule('export_handlers_module.js');
  embed = window.AlloModules.ExportHandlers.embedDocumentFont;
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  loadAlloModule('doc_pipeline_module.js');
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
    addToast: () => {}, t: key => key, isRtlLang: () => false,
    updateExportPreview: () => {}, getDefaultTitle: () => 'Document', getState: () => state,
  });
});

const GOOGLE_CSS = [
  "/* cyrillic */ @font-face { font-family: 'Lexend'; font-weight: 400; src: url(https://fonts.gstatic.com/s/lexend/cyr.woff2) format('woff2'); unicode-range: U+0400-045F, U+0490-0491; }",
  "/* vietnamese */ @font-face { font-family: 'Lexend'; font-weight: 400; src: url(https://fonts.gstatic.com/s/lexend/vi.woff2) format('woff2'); unicode-range: U+0102-0103, U+1EA0-1EF9; }",
  "/* latin */ @font-face { font-family: 'Lexend'; font-weight: 400; src: url(https://fonts.gstatic.com/s/lexend/latin.woff2) format('woff2'); unicode-range: U+0000-00FF, U+0131, U+2000-206F; }",
  "/* latin */ @font-face { font-family: 'Lexend'; font-weight: 700; src: url(https://fonts.gstatic.com/s/lexend/latin700.woff2) format('woff2'); unicode-range: U+0000-00FF; }",
].join('\n');
const fontBytes = (name) => new TextEncoder().encode('FONT:' + name);
function fakeFetch(overrides = {}) {
  const calls = [];
  const fn = async (url) => {
    calls.push(url);
    if (overrides[url] === 'fail') return { ok: false, status: 503 };
    if (url.startsWith('https://fonts.googleapis.com/')) return { ok: true, text: async () => GOOGLE_CSS };
    const big = overrides[url] === 'big';
    return { ok: true, arrayBuffer: async () => (big ? new Uint8Array(2 * 1024 * 1024) : fontBytes(url.split('/').pop())).buffer };
  };
  fn.calls = calls;
  return fn;
}
const page = (rule, body = 'Photosynthesis café') => '<!DOCTYPE html><html><head><style>/* alloflow-document-font */ ' + rule + ' /* /alloflow-document-font */ body{font-family:Lexend}</style></head><body><main>' + body + '</main></body></html>';
const LEXEND = "@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;700&display=swap');";
const DATA = (name) => 'data:font/woff2;base64,' + Buffer.from('FONT:' + name).toString('base64');

describe('embedding the document font in HTML downloads', () => {
  it('replaces a Google Fonts import with the subsets the document uses', async () => {
    const fetch = fakeFetch();
    const result = await embed(page(LEXEND), { fetch });
    expect(result.embedded).toBe(true);
    expect(result.faces).toBe(2);
    expect(result.html).not.toContain('fonts.googleapis.com');
    expect(result.html).not.toContain('fonts.gstatic.com');
    expect(result.html).toContain(DATA('latin.woff2'));
    expect(result.html).toContain(DATA('latin700.woff2'));
    expect(fetch.calls.filter(u => /cyr|vi\.woff2/.test(u))).toEqual([]);
    expect(result.html).toContain('body{font-family:Lexend}');
  });

  it('adds the Vietnamese or Cyrillic subset when the text needs it', async () => {
    const vi = await embed(page(LEXEND, 'Quang hợp'), { fetch: fakeFetch() });
    expect(vi.html).toContain(DATA('vi.woff2'));
    const ru = await embed(page(LEXEND, 'Фотосинтез'), { fetch: fakeFetch() });
    expect(ru.html).toContain(DATA('cyr.woff2'));
    expect(ru.html).not.toContain(DATA('vi.woff2'));
  });

  it('embeds OpenDyslexic from its @font-face rules', async () => {
    const od = "@font-face { font-family: 'OpenDyslexic'; src: url('https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/woff/OpenDyslexic-Regular.woff') format('woff'); font-weight: normal; } @font-face { font-family: 'OpenDyslexic'; src: url('https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/woff/OpenDyslexic-Bold.woff') format('woff'); font-weight: bold; }";
    const result = await embed(page(od), { fetch: fakeFetch() });
    expect(result.embedded).toBe(true);
    expect(result.faces).toBe(2);
    expect(result.html).not.toContain('cdn.jsdelivr.net');
    expect(result.html).toContain('data:font/woff;base64,' + Buffer.from('FONT:OpenDyslexic-Bold.woff').toString('base64'));
  });

  it('leaves the page untouched when a font cannot be fetched, is too large, or comes from elsewhere', async () => {
    const original = page(LEXEND);
    const failed = await embed(original, { fetch: fakeFetch({ 'https://fonts.gstatic.com/s/lexend/latin700.woff2': 'fail' }) });
    expect(failed).toMatchObject({ embedded: false, html: original });
    const big = await embed(original, { fetch: fakeFetch({ 'https://fonts.gstatic.com/s/lexend/latin.woff2': 'big' }) });
    expect(big).toMatchObject({ embedded: false, reason: 'fonts too large', html: original });
    const elsewhere = page("@import url('https://evil.example/font.css');");
    expect(await embed(elsewhere, { fetch: fakeFetch() })).toMatchObject({ embedded: false, html: elsewhere, reason: 'unexpected font host' });
    expect(await embed('<html><body>no font</body></html>', { fetch: fakeFetch() })).toMatchObject({ embedded: false, reason: 'none' });
  });

  it('the real export marks only the document font, not the opt-in reader fonts', () => {
    // The app's font catalog entry for OpenDyslexic (window.FONT_OPTIONS).
    const oldOptions = window.FONT_OPTIONS;
    window.FONT_OPTIONS = [{ id: 'opendyslexic', label: 'OpenDyslexic', family: "'OpenDyslexic', 'Comic Sans MS', sans-serif" }];
    state.selectedFont = 'opendyslexic';
    let html;
    try {
      html = pipeline.generateFullPackHTML([{ type: 'simplified', id: 'r1', title: 'Reading', data: 'Text' }], 'Lesson', false, {}, { useAppFont: true, readerWebFonts: true });
    } finally {
      delete state.selectedFont;
      window.FONT_OPTIONS = oldOptions;
    }
    const open = html.indexOf('/* alloflow-document-font */');
    const close = html.indexOf('/* /alloflow-document-font */');
    expect(open).toBeGreaterThan(-1);
    expect(close).toBeGreaterThan(open);
    const marked = html.slice(open, close);
    expect(marked).toContain('OpenDyslexic');
    expect(marked).not.toContain('Atkinson');
    expect(html.split('/* alloflow-document-font */').length).toBe(2);
  });
});
