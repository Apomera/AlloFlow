// Page Designer A4 pages and document language/direction (2026-11-09).
// A4 is a page-size preset (Letter stays the default); lang/dir are optional
// doc-level fields outside the ledger, so saves made before them still load.
import { describe, it, expect, beforeAll } from 'vitest';
import { loadAlloModule } from './setup.js';

let ST;
beforeAll(() => {
  loadAlloModule('studio_module.js');
  ST = window.AlloModules.AlloStudio;
  if (!ST) throw new Error('AlloStudio failed to register');
});

const T0 = 1751477000000;
const addText = (doc, text, extra = {}) => {
  ST.stAppend(doc, {
    type: 'object.add',
    object: Object.assign({ type: 'text', role: 'body', frame: { x: 48, y: 48, w: 600, h: 60 }, z: 10, runs: [{ text, style: { size: 18 } }] }, extra),
  }, 'user', T0);
  return doc.objects[doc.objects.length - 1];
};

describe('A4 preset', () => {
  it('exists at 96 dpi and Letter stays the default', () => {
    expect(ST.ST_CANVAS_PRESETS['a4-portrait']).toEqual({ w: 794, h: 1123 });
    expect(ST.ST_CANVAS_PRESETS['a4-landscape']).toEqual({ w: 1123, h: 794 });
    expect(ST.stCreateDoc(undefined, 'x', T0).canvas.preset).toBe('letter-portrait');
    const d = ST.stCreateDoc('a4-portrait', 'A4', T0);
    expect(d.canvas).toMatchObject({ preset: 'a4-portrait', w: 794, h: 1123 });
    expect(ST.stValidateDoc(d)).toEqual([]);
  });

  it('resizing a Letter page to A4 keeps coordinates and clamps into the page', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Flyer', T0);
    addText(d, 'wide', { frame: { x: 0, y: 900, w: 816, h: 100 } });
    ST.stAppend(d, { type: 'canvas.resize', preset: 'a4-portrait' }, 'user', T0);
    expect(d.canvas).toMatchObject({ preset: 'a4-portrait', w: 794, h: 1123 });
    expect(d.objects[0].frame).toMatchObject({ x: 0, y: 900, w: 794, h: 100 });
    expect(ST.stValidateDoc(d)).toEqual([]);
  });

  it('print CSS names the A4 paper and pins the page box to it', () => {
    const css = ST.stPrintCss({ preset: 'a4-portrait', w: 794, h: 1123 });
    expect(css).toContain('@page { size: A4 portrait; margin: 0; }');
    expect(css).toContain('height: 297mm');
    expect(ST.stPrintCss({ w: 1123, h: 794 })).toContain('size: A4 landscape');
    expect(ST.stPrintCss({ w: 816, h: 1056 })).toContain('size: 8.5in 11in');
  });

  it('HTML and worksheet exports carry the A4 page size; Letter output is unchanged', () => {
    const a4 = ST.stCreateDoc('a4-portrait', 'A4 sheet', T0);
    addText(a4, 'Hello', { role: 'heading1' });
    expect(ST.stExportHtml(a4)).toContain('@page { size: A4 portrait; margin: 0; }');
    expect(ST.stExportHtml(a4)).toContain('width: 794px; height: 1123px');
    expect(ST.stExportWorksheetHtml(a4)).toContain('@page { size: A4 portrait; }');
    const letter = ST.stCreateDoc('letter-portrait', 'L', T0);
    expect(ST.stExportHtml(letter)).not.toContain('@page');
  });

  it('PPTX uses an 8.27 x 11.69 in custom layout for A4', () => {
    const spec = ST.stExportPptxSpec(ST.stCreateDoc('a4-portrait', 'A4 deck', T0));
    expect(spec.layout).toEqual({ name: 'ALLOFLOW_A4', width: 8.27, height: 11.69, standard: false });
    expect(ST.stExportPptxSpec(ST.stCreateDoc('a4-landscape', 'A4', T0)).layout).toMatchObject({ width: 11.69, height: 8.27 });
    const calls = [];
    function Fake() {
      this.ShapeType = { rect: 'rect', ellipse: 'ellipse' };
      this.defineLayout = (l) => calls.push(l);
      this.addSlide = () => ({ addText() {}, addImage() {}, addShape() {}, addNotes() {} });
    }
    ST.stRenderPptx(spec, Fake);
    expect(calls).toEqual([{ name: 'ALLOFLOW_A4', width: 8.27, height: 11.69 }]);
  });
});

describe('document language and direction', () => {
  it('old documents with no lang/dir still validate and export as English LTR', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Old save', T0);
    addText(d, 'Hi');
    const saved = JSON.parse(JSON.stringify(ST.stDurableDoc(d)));
    expect(saved.lang).toBeUndefined();
    expect(ST.stValidateDoc(saved)).toEqual([]);
    const html = ST.stExportHtml(ST.stCanonicalizeDoc(saved));
    expect(html).toContain('<html lang="en">');
    expect(html).not.toContain('dir=');
  });

  it('validates lang and dir but keeps them out of the ledger', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Doc', T0);
    addText(d, 'Hola');
    d.lang = 'es-MX';
    d.dir = 'ltr';
    expect(ST.stValidateDoc(d)).toEqual([]);
    expect(d.ledger.ops.some((op) => /lang/.test(op.type))).toBe(false);
    expect(ST.stValidateDoc(Object.assign({}, d, { lang: 'en" onload="x' }))).toContain('Invalid document language');
    expect(ST.stValidateDoc(Object.assign({}, d, { dir: 'up' }))).toContain('Invalid text direction');
    expect(ST.stCanonicalizeDoc(d).lang).toBe('es-MX');
  });

  it('rejects an invalid per-object language', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Doc', T0);
    addText(d, 'Bad', { lang: '<script>' });
    expect(ST.stValidateDoc(d).some((e) => /invalid language/.test(e))).toBe(true);
  });

  it('falls back to the host language, then English', () => {
    expect(ST.stDocLanguage({}, { lang: 'fr', dir: 'ltr' })).toEqual({ lang: 'fr', dir: 'ltr' });
    expect(ST.stDocLanguage({}, { lang: 'ar' })).toEqual({ lang: 'ar', dir: 'rtl' });
    expect(ST.stDocLanguage({}, null)).toEqual({ lang: 'en', dir: 'ltr' });
    expect(ST.stDocLanguage({ lang: 'he' }, { lang: 'en', dir: 'ltr' })).toEqual({ lang: 'he', dir: 'rtl' });
    expect(ST.stDocLanguage({ lang: 'ar', dir: 'ltr' })).toEqual({ lang: 'ar', dir: 'ltr' });
    expect(ST.stLangDir('az-Arab')).toBe('rtl');
    expect(ST.stLangDir('pa-Guru')).toBe('ltr');
  });

  it('HTML export sets lang/dir on the root and honours per-object lang', () => {
    const d = ST.stCreateDoc('letter-portrait', 'مرحبا', T0);
    d.lang = 'ar';
    addText(d, 'مرحبا', { role: 'heading1' });
    addText(d, 'cat', { lang: 'en' });
    const html = ST.stExportHtml(d);
    expect(html).toContain('<html lang="ar" dir="rtl">');
    expect(html).toContain('<p lang="en" dir="ltr" style=');
    expect(html).toContain('<h1 style=');
    const print = html.replace('</head>', '<style>' + ST.stPrintCss(d.canvas) + '</style>\n</head>');
    expect(print).toContain('<html lang="ar" dir="rtl">');
  });

  it('an explicit export language still wins (escaped)', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Doc', T0);
    d.lang = 'es';
    expect(ST.stExportHtml(d, { lang: 'de' })).toContain('<html lang="de">');
    expect(ST.stExportHtml(d, { lang: 'x" a="b' })).toContain('<html lang="x&quot; a=&quot;b">');
  });

  it('worksheet HTML carries lang, dir and per-question lang', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Hoja', T0);
    d.lang = 'he';
    addText(d, 'Title', { role: 'heading1' });
    addText(d, 'Instructions');
    addText(d, '1. Say the word', { role: 'heading2', lang: 'en' });
    const html = ST.stExportWorksheetHtml(d);
    expect(html).toContain('<html lang="he" dir="rtl">');
    expect(html).toContain('<li lang="en" dir="ltr">');
    expect(ST.stExportWorksheetData(d).questions[0].lang).toBe('en');
  });

  it('PPTX text carries the language and RTL mode', () => {
    const d = ST.stCreateDoc('a4-portrait', 'Doc', T0);
    d.lang = 'ar';
    addText(d, 'مرحبا');
    addText(d, 'cat', { lang: 'en-US' });
    const spec = ST.stExportPptxSpec(d);
    expect(spec.lang).toBe('ar');
    expect(spec.dir).toBe('rtl');
    expect(spec.slides[0].shapes[0].options).toMatchObject({ lang: 'ar', rtlMode: true });
    expect(spec.slides[0].shapes[1].options.lang).toBe('en-US');
    expect(spec.slides[0].shapes[1].options.rtlMode).toBeUndefined();
    function Fake() { this.ShapeType = {}; this.defineLayout = () => {}; this.addSlide = () => ({ addText() {}, addNotes() {} }); }
    expect(ST.stRenderPptx(spec, Fake).rtlMode).toBe(true);
  });

  it('shape outlines export to HTML and PPTX and survive validation', () => {
    const d = ST.stCreateDoc('letter-portrait', 'Doc', T0);
    ST.stAppend(d, { type: 'object.add', object: { type: 'shape', shape: 'rect', frame: { x: 10, y: 10, w: 40, h: 40 }, z: 1, fill: '#ffffff', decorative: true, stroke: { color: '#64748b', width: 2, dash: 'dashed' } } }, 'user', T0);
    expect(ST.stValidateDoc(d)).toEqual([]);
    expect(ST.stExportHtml(d)).toContain('border:2px dashed #64748b;');
    expect(ST.stExportPptxSpec(d).slides[0].shapes[0].options.line).toEqual({ color: '64748b', width: 1.5, dashType: 'dash' });
    expect(ST.stSafeStroke({ color: 'red;x', width: 99 })).toEqual({ color: '#111827', width: 12, dash: 'solid' });
  });
});
