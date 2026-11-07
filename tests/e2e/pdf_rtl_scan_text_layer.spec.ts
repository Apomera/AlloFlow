// (2026-11-07) Right-to-left scans got no tagged PDF: Hebrew, Arabic and Urdu all withheld (fresh corpus runs).
//  - Noto Sans Hebrew has no ASCII digits or punctuation, Noto Sans Arabic no Latin letters: every "." "," "(1)" and
//    English word was dropped from the hidden text layer. They are now drawn with Noto Sans in their own runs.
//  - Shaped Noto Sans Arabic draws dotless shapes plus shared dot glyphs, so the letter read back "ئورتلائد" for
//    "بورتلاند". The layer is invisible, so it is drawn unshaped: one glyph per character.
//  - A right-to-left run is laid out fully reversed, numbers too; "۱۹۴۸" read back "۸۴۹۱". Numbers are pre-reversed.
//  - A long paragraph drawn as one 4 pt line ran past the page edge and was not read back; it now wraps.
//  - A text-layer read past its first limit keeps waiting (an Arabic letter was taken for a scan on a busy machine).
// The REAL createTaggedPdf runs in Chromium under the verified-runtime host. Fonts come from jsDelivr, as in the app.
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { bootDocumentRuntime } from './helpers/document_runtime_host';

const ROOT = path.resolve(__dirname, '../..');
const MOD = process.env.ALLO_MODULE_DIR || ROOT;

async function boot(page) {
  await bootDocumentRuntime(page);
  for (const f of ['accessibility_evidence_module.js', 'verification_policy_module.js', 'doc_builder_renderer_module.js', 'doc_pipeline_module.js', 'view_pdf_validator_module.js']) {
    await page.addScriptTag({ path: fs.existsSync(path.join(MOD, f)) ? path.join(MOD, f) : path.join(ROOT, f) });
  }
}

// A one-page "scan" (no text, a picture only), tagged from the given OCR text; returns what the saved PDF reads back.
async function scanTag(page, lang: string, text: string, html: string) {
  return page.evaluate(async ({ lang, text, html }) => {
    const W: any = window; const L = W.PDFLib;
    const src = await L.PDFDocument.create();
    const p = src.addPage([595, 842]);
    p.drawRectangle({ x: 40, y: 40, width: 515, height: 762, color: L.rgb(0.95, 0.95, 0.9) });
    const pipeline = W.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: (l: string) => /^(ar|he|fa|ur)/.test(l || ''), updateExportPreview: () => {}, getDefaultTitle: () => 'Scan', state: {} });
    const tagged = await pipeline.createTaggedPdf(new Uint8Array(await src.save()), { accessibleHtml: html, isScanned: true, groundTruthPages: [{ pageNum: 1, text }] }, { lang, title: 'Scan' });
    const bytes = tagged.bytes || tagged;
    const doc = await W.pdfjsLib.getDocument({ data: bytes.slice(), isEvalSupported: false }).promise;
    const pg = await doc.getPage(1);
    const tc = await pg.getTextContent({ includeMarkedContent: true });
    const width = pg.view[2];
    const items: any[] = []; const stack: string[] = [];
    for (const it of tc.items as any[]) {
      if (it.type === 'beginMarkedContent' || it.type === 'beginMarkedContentProps') { stack.push(it.tag); continue; }
      if (it.type === 'endMarkedContent') { stack.pop(); continue; }
      if (it.str && it.str.trim() && !stack.includes('Artifact')) items.push({ str: it.str, x: it.transform[4], w: it.width });
    }
    return {
      read: items.map((i) => i.str).join(' '),
      pastEdge: items.filter((i) => i.x + i.w > width + 1).length,
      dropped: tagged.ocrTextLayer && tagged.ocrTextLayer.droppedChars,
      roundTripOk: tagged.roundTrip ? tagged.roundTrip.ok : null,
      roundTripFails: ((tagged.roundTrip && tagged.roundTrip.checks) || []).filter((c: any) => c.status === 'fail').map((c: any) => c.rule + ': ' + c.detail),
    };
  }, { lang, text, html });
}
const doc = (lang: string, dir: string, body: string) => '<!doctype html><html lang="' + lang + '" dir="' + dir + '"><head><title>Scan</title></head><body><main>' + body + '</main></body></html>';
const words = (s: string) => s.split(/\s+/).filter(Boolean);

test.describe('right-to-left scan text layer', () => {
  test.setTimeout(240000);
  test.beforeEach(async ({ page }) => { await boot(page); });

  test('Hebrew keeps its digits and punctuation', async ({ page }) => {
    const h = 'הכרזה לכל באי עולם';
    const p = 'סעיף 1. כל בני האדם נולדו בני חורין, ושווים בערכם ובזכויותיהם (1948).';
    const r = await scanTag(page, 'he', h + '\n\n' + p, doc('he', 'rtl', '<h1>' + h + '</h1><p>' + p + '</p>'));
    expect(r.dropped).toBe(0);
    for (const w of words(h + ' ' + p).map((w) => w.replace(/[.,()]/g, ''))) expect(r.read).toContain(w);
    expect(r.read).toContain('1948');
    expect(r.read).toContain(',');
    expect(r.roundTripFails).toEqual([]);
  });

  test('Arabic letters read back as written, and English words inside are kept', async ({ page }) => {
    const p = 'عائلات مدارس بورتلاند العامة العزيزة، لقد كنا سعداء جدا بسبب جائحة COVID في المدارس';
    const r = await scanTag(page, 'ar', p, doc('ar', 'rtl', '<p>' + p + '</p>'));
    expect(r.dropped).toBe(0);
    for (const w of words(p).map((w) => w.replace(/،/g, ''))) expect(r.read).toContain(w);
    expect(r.roundTripFails).toEqual([]);
  });

  test('numbers in a right-to-left line read back in their own order', async ({ page }) => {
    const p = 'اقوام متحدہ کی جنرل اسمبلی نے ۱۰ دسمبر ۱۹۴۸ء کو منظور کیا';
    const r = await scanTag(page, 'ur', p, doc('ur', 'rtl', '<p>' + p + '</p>'));
    expect(r.read).toContain('۱۹۴۸ء');
    expect(r.read).toMatch(/(^|\s)۱۰(\s|$)/);
    expect(r.read).not.toContain('۸۴۹۱');
  });

  test('a long paragraph wraps inside the page and every word reads back', async ({ page }) => {
    const pool = 'عائلات مدارس بورتلاند العامة العزيزة لقد كنا سعداء جدا لتقديم الأسر يوم كامل أو جزئي لرعاية الطفل وبرامج الإثراء في خريف هذا العام'.split(' ');
    const ws = Array.from({ length: 120 }, (_, i) => pool[i % pool.length]);
    const p = ws.join(' ') + ' نهاية';
    const r = await scanTag(page, 'ar', p, doc('ar', 'rtl', '<p>' + p + '</p>'));
    expect(r.pastEdge).toBe(0);
    expect(r.read).toContain('نهاية');
    expect(words(r.read).filter((w) => pool.includes(w)).length).toBe(120);
  });

  // Persian UDHR p1: the page's own text is an English cover line (so the layer font is Noto Sans), while the tags
  // draw the Persian heading and paragraphs. 312 characters were dropped and the PDF held.
  test('Persian drawn on a page whose own text is English is kept, in the Persian script font', async ({ page }) => {
    const h = 'اعلامیه جهانی حقوق بشر';
    const r = await page.evaluate(async ({ h }) => {
      const W: any = window; const L = W.PDFLib;
      const src = await L.PDFDocument.create();
      src.addPage([595, 842]).drawRectangle({ x: 40, y: 40, width: 515, height: 762, color: L.rgb(0.95, 0.95, 0.9) });
      const pipeline = W.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: () => true, updateExportPreview: () => {}, getDefaultTitle: () => 'Scan', state: {} });
      const html = '<!doctype html><html lang="fa" dir="rtl"><head><title>Scan</title></head><body><main><p lang="en" dir="ltr">Universal Declaration of Human Rights</p><h1>' + h + '</h1></main></body></html>';
      const tagged = await pipeline.createTaggedPdf(new Uint8Array(await src.save()), { accessibleHtml: html, isScanned: true, groundTruthPages: [{ pageNum: 1, text: 'Universal Declaration of Human Rights' }] }, { lang: 'fa', title: 'Scan' });
      const doc = await W.pdfjsLib.getDocument({ data: (tagged.bytes || tagged).slice(), isEvalSupported: false }).promise;
      const tc = await (await doc.getPage(1)).getTextContent();
      return { read: tc.items.map((i: any) => i.str).join(' '), dropped: tagged.ocrTextLayer && tagged.ocrTextLayer.droppedChars };
    }, { h });
    expect(r.dropped).toBe(0);
    for (const w of h.split(' ')) expect(r.read).toContain(w);
  });

  // Persian UDHR's own Verdana-Bold: an embedded CIDFontType2 with no /CIDToGIDMap fails veraPDF 7.21.3.2. Absent means
  // /Identity, so it is written explicitly; the page draws the same (checked by rendering on the real file).
  test('an embedded TrueType CID font with no /CIDToGIDMap gets the implicit /Identity written', async ({ page }) => {
    const r = await page.evaluate(async () => {
      const W: any = window; const L = W.PDFLib;
      const src = await L.PDFDocument.create();
      src.registerFontkit(W.fontkit);
      const bytes = new Uint8Array(await (await fetch('https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io/fonts/NotoSans/hinted/ttf/NotoSans-Regular.ttf')).arrayBuffer());
      const font = await src.embedFont(bytes, { subset: true });
      src.addPage([612, 792]).drawText('A born digital page with an embedded font.', { x: 72, y: 700, size: 12, font });
      await src.flush();
      let removed = 0;
      for (const [, o] of src.context.enumerateIndirectObjects()) {
        if (o && o.get && String(o.get(L.PDFName.of('Subtype'))) === '/CIDFontType2' && o.get(L.PDFName.of('CIDToGIDMap'))) { o.delete(L.PDFName.of('CIDToGIDMap')); removed++; }
      }
      const pipeline = W.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Page', state: {} });
      const tagged = await pipeline.createTaggedPdf(await src.save(), { accessibleHtml: '<!doctype html><html lang="en"><head><title>Page</title></head><body><main><p>A born digital page with an embedded font.</p></main></body></html>' }, { lang: 'en', title: 'Page' });
      const out = await L.PDFDocument.load(tagged.bytes || tagged);
      const maps: string[] = [];
      for (const [, o] of out.context.enumerateIndirectObjects()) if (o && o.get && String(o.get(L.PDFName.of('Subtype'))) === '/CIDFontType2') maps.push(String(o.get(L.PDFName.of('CIDToGIDMap'))));
      return { removed, maps };
    });
    expect(r.removed).toBeGreaterThan(0);
    expect(r.maps.length).toBeGreaterThan(0);
    expect(r.maps.every((m) => m === '/Identity')).toBe(true);
  });

  test('a text-layer read slower than its first limit is waited for, not taken for a scan', async ({ page }) => {
    const r = await page.evaluate(async () => {
      const W: any = window; const L = W.PDFLib;
      const src = await L.PDFDocument.create();
      const font = await src.embedFont(L.StandardFonts.Helvetica);
      src.addPage([612, 792]).drawText('This letter has a real text layer that only reads slowly today.', { x: 72, y: 700, size: 12, font });
      const bytes = await src.save();
      const realTimeout = window.setTimeout.bind(window);
      let scaled = true;
      (window as any).setTimeout = (fn: any, ms: number, ...a: any[]) => realTimeout(fn, scaled && ms >= 15000 ? ms / 10 : ms, ...a);
      const real = W.pdfjsLib.getDocument.bind(W.pdfjsLib);
      const slow = (doc: any) => new Proxy(doc, { get(t, k) {
        if (k !== 'getPage') { const v = t[k]; return typeof v === 'function' ? v.bind(t) : v; }
        return async (n: number) => { const pg = await t.getPage(n); return new Proxy(pg, { get(tp, kp) {
          if (kp !== 'getTextContent') { const v = tp[kp]; return typeof v === 'function' ? v.bind(tp) : v; }
          return async (a: any) => { await new Promise((res) => realTimeout(res, 4500)); return tp.getTextContent(a); }; // past the 3 s first wait
        } }); };
      } });
      Object.defineProperty(W, 'pdfjsLib', { configurable: true, value: new Proxy(W.pdfjsLib, { get: (t, k) => (k === 'getDocument' ? (o: any) => { const task = real(o); return { promise: task.promise.then(slow) }; } : (t as any)[k]) }) });
      const pipeline = W.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Letter', state: {} });
      const out = await pipeline.extractPdfTextDeterministic(new Uint8Array(bytes));
      scaled = false;
      return { text: (out && out.fullText) || '', scanned: !!(out && out.isScanned) };
    });
    expect(r.text).toContain('real text layer');
    expect(r.scanned).toBe(false);
  });
});
