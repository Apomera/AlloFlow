// Font failures veraPDF found on the 2026-11-02 corpus (fixed 2026-11-03):
//  - notifications: Stage 4c decoded the page with TextDecoder('latin1'), which is windows-1252, and wrote the
//    bytes back with "& 0xff": WinAnsi 0x92 (’) became 0x19, a code the subset font has no glyph for
//    (7.21.8-1 .notdef x17, 7.21.4.1-2, 7.21.5-1, 7.21.7-2). Every curly quote on a page with a picture broke;
//  - udhr_en / udhr_es: an embedded SYMBOLIC TrueType subset with no /ToUnicode (7.21.7-1 x3583 / x4904). Stage 7b
//    writes the map from the font program (here: standard Macintosh glyph order agreeing with each code), and a
//    font it cannot map vetoes the PDF/UA claim;
//  - udhr_en: non-embedded ArialMT with /Differences [0 /t /h /e /space] over WinAnsi was "custom /Differences,
//    unrepairable": strict AGL names over a WinAnsi base now get the substitute and keep their encoding;
//  - fda: a non-embedded font drawn only inside a Form XObject was never collected (neither repaired nor counted).
// The REAL createTaggedPdf runs in Chromium under the verified-runtime host; veraPDF runs when Java exists.
// Substitute fonts come from the CDN (those tests skip offline). ALLO_MODULE_DIR: private copies for mutation checks.
import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { bootDocumentRuntime } from './helpers/document_runtime_host';

const ROOT = path.resolve(__dirname, '../..');
const MOD = process.env.ALLO_MODULE_DIR || ROOT;

function resolveJava(): string | null {
  for (const j of [process.env.ALLOFLOW_JAVA, 'C:/Users/cabba/.alloflow-tools/jdk-21.0.11+10-jre/bin/java.exe', 'java'].filter(Boolean) as string[]) {
    try { execFileSync(j, ['-version'], { stdio: 'ignore' }); return j; } catch (_) { /* next */ }
  }
  return null;
}
// veraPDF UA-1 failed rule ids ("7.21.7-1", ...), or null without Java
function veraFailed(b64: string): string[] | null {
  const java = resolveJava();
  if (!java) return null;
  const pdfPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'allo-fonts-')), 'out.pdf');
  fs.writeFileSync(pdfPath, Buffer.from(b64, 'base64'));
  let out = '';
  try { out = execFileSync(java, ['-jar', path.join(ROOT, 'verapdf', 'verapdf-cli.jar'), '-f', 'ua1', '--format', 'json', '--maxfailuresdisplayed', '5', '--', pdfPath], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); }
  catch (e: any) { out = String(e.stdout || ''); }
  const j = JSON.parse(out); const x = j.report.jobs[0].validationResult; const vr = Array.isArray(x) ? x[0] : x;
  return (vr.details.ruleSummaries || []).filter((s: any) => s.ruleStatus !== 'PASSED').map((s: any) => s.clause + '-' + s.testNumber);
}

// A minimal TrueType program shaped like the udhr subsets: empty glyphs of advance 500, ONE (1,0) format-0 cmap
// mapping each printable ASCII code to gidFor(code), and a version-3 post table (no glyph names).
function buildSymbolicTtf(gidFor: (c: number) => number, numGlyphs: number): number[] {
  const u16 = (v: number) => [(v >> 8) & 255, v & 255];
  const u32 = (v: number) => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
  const cmapIds = new Array(256).fill(0);
  for (let c = 32; c <= 126; c++) cmapIds[c] = gidFor(c);
  const tables: Record<string, number[]> = {
    head: [...u32(0x10000), ...u32(0x10000), ...u32(0), ...u32(0x5F0F3CF5), ...u16(0), ...u16(1000), ...new Array(16).fill(0),
      ...u16(0), ...u16(0), ...u16(1000), ...u16(1000), ...u16(0), ...u16(8), ...u16(2), ...u16(0), ...u16(0)],
    hhea: [...u32(0x10000), ...u16(800), ...u16(0x10000 - 200), ...u16(0), ...u16(500), ...new Array(22).fill(0), ...u16(numGlyphs)],
    maxp: [...u32(0x10000), ...u16(numGlyphs), ...new Array(26).fill(0)],
    hmtx: new Array(numGlyphs).fill(0).flatMap(() => [...u16(500), ...u16(0)]),
    loca: new Array((numGlyphs + 1) * 2).fill(0),
    glyf: [],
    cmap: [...u16(0), ...u16(1), ...u16(1), ...u16(0), ...u32(12), ...u16(0), ...u16(262), ...u16(0), ...cmapIds],
    post: [...u32(0x30000), ...u32(0), ...u16(0x10000 - 100), ...u16(50), ...new Array(20).fill(0)],
  };
  const tags = Object.keys(tables).sort();
  const sum = (b: number[]) => { let s = 0; for (let i = 0; i < b.length; i += 4) s = (s + (((b[i] || 0) << 24) | ((b[i + 1] || 0) << 16) | ((b[i + 2] || 0) << 8) | (b[i + 3] || 0))) >>> 0; return s; };
  let off = 12 + tags.length * 16;
  const dir: number[] = [...u32(0x10000), ...u16(tags.length), ...u16(128), ...u16(3), ...u16(tags.length * 16 - 128)];
  const body: number[] = [];
  for (const t of tags) {
    const d = tables[t];
    dir.push(...t.split('').map((ch) => ch.charCodeAt(0)), ...u32(sum(d)), ...u32(off), ...u32(d.length));
    const padded = d.concat(new Array((4 - (d.length % 4)) % 4).fill(0));
    body.push(...padded); off += padded.length;
  }
  return dir.concat(body);
}

async function boot(page) {
  await bootDocumentRuntime(page);
  for (const f of ['accessibility_evidence_module.js', 'verification_policy_module.js', 'doc_builder_renderer_module.js', 'doc_pipeline_module.js', 'view_pdf_validator_module.js']) {
    await page.addScriptTag({ path: fs.existsSync(path.join(MOD, f)) ? path.join(MOD, f) : path.join(ROOT, f) });
  }
  // __tag(srcBytes, html): the tagged PDF's fonts, page-1 content (byte-true latin1), summary and base64
  await page.evaluate(() => {
    const W: any = window;
    W.__tag = async (bytes: Uint8Array, html: string) => {
      const pipeline = W.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Doc', state: {} });
      const tagged = await pipeline.createTaggedPdf(bytes, { accessibleHtml: html }, { title: 'Doc', lang: 'en' });
      const out = tagged.bytes || tagged;
      const { PDFDocument, PDFName, PDFDict, PDFRef, PDFArray, decodePDFRawStream } = W.PDFLib;
      const doc = await PDFDocument.load(out); const c = doc.context;
      const look = (v: any) => (v instanceof PDFRef ? c.lookup(v) : v);
      const latin1 = (u8: Uint8Array) => { let s = ''; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return s; };
      const streamText = (st: any) => latin1(st.dict.get(PDFName.of('Filter')) ? decodePDFRawStream(st).decode() : st.contents);
      const fonts: any = {};
      const collect = (res: any) => {
        res = look(res);
        const fd = res && look(res.get(PDFName.of('Font')));
        if (fd instanceof PDFDict) for (const [k, fr] of fd.entries()) {
          const f = look(fr); const desc = look(f.get(PDFName.of('FontDescriptor')));
          const enc = look(f.get(PDFName.of('Encoding'))); const tu = look(f.get(PDFName.of('ToUnicode')));
          const W2 = look(f.get(PDFName.of('Widths')));
          fonts[String(k).slice(1)] = {
            base: String(f.get(PDFName.of('BaseFont'))),
            embedded: !!(desc && (desc.get(PDFName.of('FontFile')) || desc.get(PDFName.of('FontFile2')) || desc.get(PDFName.of('FontFile3')))),
            encoding: enc instanceof PDFDict ? { base: String(enc.get(PDFName.of('BaseEncoding'))), differences: String(enc.get(PDFName.of('Differences'))) } : String(enc),
            firstChar: Number(String(f.get(PDFName.of('FirstChar')))),
            widths: W2 instanceof PDFArray ? W2.asArray().slice(0, 6).map((n: any) => Number(String(n))) : null,
            toUnicode: tu ? streamText(tu) : null,
          };
        }
        const xo = res && look(res.get(PDFName.of('XObject')));
        if (xo instanceof PDFDict) for (const [, xr] of xo.entries()) { const x = look(xr); if (String(x.dict.get(PDFName.of('Subtype'))) === '/Form') collect(x.dict.get(PDFName.of('Resources'))); }
      };
      const p1 = doc.getPages()[0];
      collect(p1.node.get(PDFName.of('Resources')));
      const cs = look(p1.node.get(PDFName.of('Contents')));
      const content = (cs instanceof PDFArray ? cs.asArray().map(look) : [cs]).map(streamText).join('\n');
      const s = tagged.summary || {};
      let bin = ''; for (let i = 0; i < out.length; i += 0x8000) bin += String.fromCharCode.apply(null, out.subarray(i, i + 0x8000));
      return { fonts, content, uaDeclared: s.uaDeclared, mapped: s.fontsUnicodeMapped, withoutUnicode: s.fontsWithoutUnicode || [], repaired: s.fontsRepaired, unrepairable: s.fontsUnrepairable || [], b64: btoa(bin) };
    };
  });
}

const HTML = (body: string) => '<!DOCTYPE html><html lang="en"><head><title>Doc</title></head><body><main>' + body + '</main></body></html>';

test.describe.configure({ timeout: 300_000 });

test('a curly apostrophe (WinAnsi 0x92) in a literal string keeps its byte on a page with a picture', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(async (html) => {
    const W: any = window;
    const { PDFDocument, StandardFonts, PDFName } = W.PDFLib;
    const src = await PDFDocument.create(); const ctx = src.context;
    const font = await src.embedFont(StandardFonts.Helvetica);
    const cv = document.createElement('canvas'); cv.width = 40; cv.height = 20; const g = cv.getContext('2d')!; g.fillStyle = '#336'; g.fillRect(0, 0, 40, 20);
    const img = await src.embedPng(Uint8Array.from(atob(cv.toDataURL('image/png').split(',')[1]), (ch) => ch.charCodeAt(0)));
    const pg = src.addPage([612, 792]);
    pg.node.setFontDictionary(PDFName.of('F1'), font.ref);
    pg.node.setXObject(PDFName.of('Im0'), img.ref);
    const body = 'BT /F1 18 Tf 72 720 Td (Parents\x92 Right to Know) Tj ET\nBT /F1 12 Tf 72 690 Td (Our school\x92s \x93open door\x94 policy.) Tj ET\nq 80 0 0 40 72 600 cm /Im0 Do Q\n';
    pg.node.set(PDFName.of('Contents'), ctx.register(ctx.stream(Uint8Array.from(body, (ch) => ch.charCodeAt(0)))));
    return W.__tag(new Uint8Array(await src.save()), html);
  }, HTML('<h1>Parents’ Right to Know</h1><p>Our school’s “open door” policy.</p><p><img alt="School seal" src="data:image/png;base64,iVBORw0KGgo="></p>'));
  expect(r.content).toContain('(Parents\x92 Right to Know)');
  expect(r.content).toContain('(Our school\x92s \x93open door\x94 policy.)');
  expect(/[\x19\x1c\x1d]/.test(r.content)).toBe(false);
  expect(r.content).toMatch(/q 80 0 0 40 72 600 cm \/Figure <<\/MCID \d+>> BDC\s*\/Im0 Do/); // Stage 4c ran on this page
});

async function symbolicDoc(page, gidShift: number, numGlyphs: number) {
  const ttf = buildSymbolicTtf((c) => c - gidShift, numGlyphs);
  return page.evaluate(async ({ ttf, html }) => {
    const W: any = window;
    const { PDFDocument, PDFName, PDFNumber } = W.PDFLib;
    const src = await PDFDocument.create(); const ctx = src.context;
    const prog = Uint8Array.from(ttf);
    const ff = ctx.register(ctx.flateStream(prog, { Length1: prog.length }));
    const fd = ctx.register(ctx.obj({ Type: 'FontDescriptor', FontName: 'ABCDEF+TestSymbolic', Flags: 4, FontBBox: [0, -200, 1000, 800], ItalicAngle: 0, Ascent: 800, Descent: -200, CapHeight: 700, StemV: 80, FontFile2: ff }));
    const font = ctx.register(ctx.obj({ Type: 'Font', Subtype: 'TrueType', BaseFont: 'ABCDEF+TestSymbolic', FirstChar: 32, LastChar: 126,
      Widths: Array.from({ length: 95 }, () => PDFNumber.of(500)), FontDescriptor: fd }));
    const pg = src.addPage([612, 792]);
    pg.node.setFontDictionary(PDFName.of('F1'), font);
    pg.node.set(PDFName.of('Contents'), ctx.register(ctx.stream('BT /F1 12 Tf 72 720 Td (Hello families) Tj ET\n')));
    return W.__tag(new Uint8Array(await src.save()), html);
  }, { ttf, html: HTML('<p>Hello families</p>') });
}

test('an embedded symbolic TrueType font with no ToUnicode gets one from its own program', async ({ page }) => {
  await boot(page);
  const r = await symbolicDoc(page, 29, 98); // standard Macintosh glyph order: gid = code - 29, as the udhr subsets
  expect(r.mapped).toBe(1);
  expect(r.withoutUnicode).toEqual([]);
  const tu = r.fonts.F1.toUnicode as string;
  expect(tu).toContain('95 beginbfchar');
  for (const [code, uni] of [['20', '0020'], ['41', '0041'], ['48', '0048'], ['7E', '007E']]) expect(tu).toContain('<' + code + '> <' + uni + '>');
  const failed = veraFailed(r.b64);
  test.skip(failed === null, 'No Java runtime available for veraPDF (structural checks above still ran)');
  expect(failed!.filter((f) => /^7\.21\.[78]-/.test(f))).toEqual([]);
});

test('a symbolic font whose glyph order does not agree with its codes gets NO map and withholds the claim', async ({ page }) => {
  await boot(page);
  const r = await symbolicDoc(page, 28, 99); // shifted by one: nothing in the program says what the codes draw
  expect(r.mapped).toBe(0);
  expect(r.withoutUnicode).toEqual(['TestSymbolic']);
  expect(r.fonts.F1.toUnicode).toBeNull();
  expect(r.uaDeclared).toBe(false);
});

test('a non-embedded font with /Differences of standard names over WinAnsi gets the substitute and keeps its encoding', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(async (html) => {
    const W: any = window;
    const { PDFDocument, PDFName, PDFNumber } = W.PDFLib;
    const src = await PDFDocument.create(); const ctx = src.context;
    const mk = (base: string, encoding: any, widths: number[]) => ctx.register(ctx.obj({ Type: 'Font', Subtype: 'TrueType', BaseFont: base, FirstChar: 0, LastChar: widths.length - 1,
      Widths: widths.map((w) => PDFNumber.of(w)), Encoding: ctx.obj(encoding),
      FontDescriptor: ctx.register(ctx.obj({ Type: 'FontDescriptor', FontName: base, Flags: 32, FontBBox: [-664, -324, 2000, 1039], ItalicAngle: 0, Ascent: 728, Descent: -210, CapHeight: 716, StemV: 80 })) }));
    const diffs = () => ctx.obj([PDFNumber.of(0), PDFName.of('t'), PDFName.of('h'), PDFName.of('e'), PDFName.of('space')]);
    const good = mk('ArialMT', { Type: 'Encoding', BaseEncoding: 'WinAnsiEncoding', Differences: diffs() }, [278, 556, 556, 278]);
    const wide = mk('Arial-BoldMT', { Type: 'Encoding', BaseEncoding: 'WinAnsiEncoding', Differences: diffs() }, [600, 600, 600, 600]);
    const nobase = mk('Arial-ItalicMT', { Type: 'Encoding', Differences: diffs() }, [278, 556, 556, 278]);
    const pg = src.addPage([612, 792]);
    pg.node.setFontDictionary(PDFName.of('F1'), good); pg.node.setFontDictionary(PDFName.of('F2'), wide); pg.node.setFontDictionary(PDFName.of('F3'), nobase);
    pg.node.set(PDFName.of('Contents'), ctx.register(ctx.stream('BT /F1 12 Tf 72 720 Td <00010203> Tj ET\nBT /F2 12 Tf 72 700 Td <00010203> Tj ET\nBT /F3 12 Tf 72 680 Td <00010203> Tj ET\n')));
    return W.__tag(new Uint8Array(await src.save()), html);
  }, HTML('<p>the</p><p>the</p><p>the</p>'));
  test.skip(r.unrepairable.some((u: string) => /fetch failed|fontkit unavailable/.test(u)), 'substitute font not reachable (offline)');
  expect(r.fonts.F1).toEqual(expect.objectContaining({ embedded: true, firstChar: 0, encoding: { base: '/WinAnsiEncoding', differences: '[ 0 /t /h /e /space ]' } }));
  expect(r.fonts.F1.widths.slice(0, 4)).toEqual([278, 556, 556, 278]);
  expect(r.unrepairable).toEqual(['Arial-BoldMT (custom /Differences widths differ from the substitute)', 'Arial-ItalicMT (custom /Differences)']);
  expect(r.fonts.F2.embedded).toBe(false);
  expect(r.fonts.F3.embedded).toBe(false);
});

// fda's redaction box: a form with the AcroForm-style /Helv (Type1 Helvetica, /Differences without a base: breve,
// caron, ... at codes 24-31, quotesingle at 39) that draws only "(b) (4)".
async function helvForm(page, shows: string) {
  return page.evaluate(async (shows) => {
    const W: any = window;
    const { PDFDocument, PDFName, PDFNumber, StandardFonts } = W.PDFLib;
    const src = await PDFDocument.create(); const ctx = src.context;
    const body = await src.embedFont(StandardFonts.Helvetica);
    const helv = ctx.register(ctx.obj({ Type: 'Font', Subtype: 'Type1', BaseFont: 'Helvetica', Name: 'Helv',
      Encoding: ctx.obj({ Type: 'Encoding', Differences: ctx.obj([PDFNumber.of(24), PDFName.of('breve'), PDFName.of('caron'), PDFNumber.of(39), PDFName.of('quotesingle'), PDFNumber.of(96), PDFName.of('grave')]) }) }));
    const box = ctx.register(ctx.stream('0.66 g 72 600 200 40 re f 0 g BT /Helv 6 Tf 80 615 Td ' + shows + ' ET\n',
      { Type: 'XObject', Subtype: 'Form', BBox: [0, 0, 612, 792], Resources: { Font: { Helv: helv } } }));
    const rule = ctx.register(ctx.stream('0.5 w 72 500 m 540 500 l S\n', { Type: 'XObject', Subtype: 'Form', BBox: [0, 0, 612, 792] }));
    const cv = document.createElement('canvas'); cv.width = 40; cv.height = 40; const g = cv.getContext('2d')!; g.fillStyle = '#c33'; g.fillRect(0, 0, 40, 40);
    const img = await src.embedPng(Uint8Array.from(atob(cv.toDataURL('image/png').split(',')[1]), (c) => c.charCodeAt(0)));
    const pic = ctx.register(ctx.stream('q 40 0 0 40 300 300 cm /Im0 Do Q\n', { Type: 'XObject', Subtype: 'Form', BBox: [0, 0, 612, 792], Resources: { XObject: { Im0: img.ref } } }));
    const pg = src.addPage([612, 792]);
    pg.node.setFontDictionary(PDFName.of('F1'), body.ref);
    pg.node.setXObject(PDFName.of('Fm0'), box); pg.node.setXObject(PDFName.of('Fm1'), rule); pg.node.setXObject(PDFName.of('Fm2'), pic);
    pg.node.set(PDFName.of('Contents'), ctx.register(ctx.stream('BT /F1 18 Tf 72 740 Td (Approval Letter) Tj ET\n/Fm0 Do\n/Fm1 Do\n/Fm2 Do\n')));
    return W.__tag(new Uint8Array(await src.save()), '<!DOCTYPE html><html lang="en"><head><title>Doc</title></head><body><main><h1>Approval Letter</h1><p>[Redacted: a gray box marked (b) (4).]</p><p><img alt="District seal" src="data:image/png;base64,iVBORw0KGgo="></p></main></body></html>');
  }, shows);
}

test('a form font with an odd /Differences that draws only plain ASCII gets the substitute; the text form is a paragraph', async ({ page }) => {
  await boot(page);
  const r = await helvForm(page, '(\\050b\\051 ) Tj 9 0 Td (\\0504\\051) Tj');
  test.skip(r.unrepairable.some((u: string) => /fetch failed|fontkit unavailable/.test(u)), 'substitute font not reachable (offline)');
  expect(r.unrepairable).toEqual([]);
  expect(r.fonts.Helv).toEqual(expect.objectContaining({ embedded: true, encoding: '/WinAnsiEncoding' }));
  expect(r.content).toMatch(/\/P <<\/MCID \d+>> BDC\n\/Fm0 Do\nEMC/); // the redaction box: tagged as content
  expect(r.content).toMatch(/\/Artifact BMC\n\/Fm1 Do\nEMC/);       // a ruled line: decoration
  expect(r.content).toMatch(/\/Figure <<\/MCID \d+>> BDC\n\/Fm2 Do\nEMC/); // a form whose whole drawing is one picture: that picture
  const failed = veraFailed(r.b64);
  test.skip(failed === null, 'No Java runtime available for veraPDF (structural checks above still ran)');
  expect(failed!.filter((f) => /^7\.1-3$|^7\.21\./.test(f))).toEqual([]);
});

test('the same font drawing a code its /Differences remaps (breve at 24) stays unrepairable', async ({ page }) => {
  await boot(page);
  const r = await helvForm(page, '(\\030b) Tj');
  expect(r.unrepairable).toEqual(['Helvetica (custom /Differences)']);
});

test('a non-embedded font drawn only inside a Form XObject is repaired too', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(async (html) => {
    const W: any = window;
    const { PDFDocument, StandardFonts, PDFName } = W.PDFLib;
    const src = await PDFDocument.create(); const ctx = src.context;
    const font = await src.embedFont(StandardFonts.Helvetica);
    const form = ctx.register(ctx.stream('0.6 g 72 600 200 40 re f 0 g BT /Helv 9 Tf 80 615 Td ((b) (4)) Tj ET\n',
      { Type: 'XObject', Subtype: 'Form', BBox: [0, 0, 612, 792], Resources: { Font: { Helv: font.ref } } }));
    const pg = src.addPage([612, 792]);
    pg.node.setXObject(PDFName.of('Fm0'), form);
    pg.node.set(PDFName.of('Contents'), ctx.register(ctx.stream('/Fm0 Do\n')));
    return W.__tag(new Uint8Array(await src.save()), html);
  }, HTML('<p>(b) (4)</p>'));
  test.skip(r.unrepairable.some((u: string) => /fetch failed|fontkit unavailable/.test(u)), 'substitute font not reachable (offline)');
  expect(r.repaired).toBe(1);
  expect(r.fonts.Helv).toEqual(expect.objectContaining({ embedded: true }));
});
