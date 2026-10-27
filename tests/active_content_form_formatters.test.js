import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

// 2026-10-25 (Aaron approved; PROPOSAL_form_formatter_allowlist.md): Acrobat's own field formatters
// (AFDate/AFNumber/AFPercent/AFSpecial/AFTime) no longer count as active content. They reformat what
// is typed into one field and reach nothing else, yet every district fillable form carried them, so
// no form could get a tagged PDF. Only an /AA holding nothing but field triggers (F, K, V, C), each a
// plain JavaScript action whose WHOLE string is one allowlisted call, passes. Everything else blocks.

// ALLO_PIPELINE_SOURCE lets a mutation run point at a private copy instead of the shared file.
const source = readFileSync(process.env.ALLO_PIPELINE_SOURCE || resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const start = source.indexOf('function _alloScanActiveContent(pdfDoc, PDFLibNS)');
const end = source.indexOf('// ── S7', start);
if (start < 0 || end < 0) throw new Error('active-content scanner not found');
const scanActiveContent = new Function(`${source.slice(start, end)}\nreturn _alloScanActiveContent;`)();

const PDFLibNS = { PDFName: { of: (n) => n } };
const dict = (values = {}) => ({ get: (n) => values[n], keys: () => Object.keys(values) });
const array = (values) => ({ size: () => values.length, get: (i) => values[i] });
const js = (code, extra = {}) => dict({ S: '/JavaScript', JS: code, ...extra });
const field = (aa) => dict({ T: 'Date', FT: '/Tx', AA: aa });
const scanFields = (fields, catalogExtra = {}) => scanActiveContent({
  context: { lookup: (v) => v }, catalog: dict({ AcroForm: dict({ Fields: array(fields) }), ...catalogExtra }), getPages: () => [],
}, PDFLibNS);
const types = (r) => r.findings.map((f) => f.type);

describe('allowed: Acrobat field formatters only', () => {
  const ALLOWED = [
    'AFDate_FormatEx("mm/dd/yyyy")', 'AFDate_KeystrokeEx("mm/dd/yyyy");', 'AFDate_FormatEx("mmm d, yyyy")',
    'AFDate_Format(1)', 'AFTime_FormatEx("h:MM tt")', 'AFTime_Keystroke(0)',
    'AFNumber_Format(2, 0, 0, 0, "$", true)', 'AFNumber_Keystroke(2,0,0,0,"",false)',
    'AFPercent_Format(1, 0)', 'AFSpecial_Format(2)', 'AFSpecial_Keystroke(3)', 'AFSpecial_KeystrokeEx("(999) 999-9999")',
  ];
  for (const code of ALLOWED) {
    it('passes ' + code, () => {
      const r = scanFields([field(dict({ F: js(code), K: js(code) }))]);
      expect(types(r)).toEqual([]);
      expect(r.any).toBe(false);
      expect(r.allowedFormattingScripts).toBe(1);
    });
  }
});

describe('still blocked: anything that is not exactly a formatter', () => {
  const BLOCKED = [
    'AFDate_FormatEx("mm/dd/yyyy");app.alert(1)', 'AFDate_FormatEx("mm/dd/yyyy") // note', 'AFDate_FormatEx("mm/" + "dd")',
    'AFSpecial_Format(7)', 'AFNumber_Format(2, 0, 0, 0, "$$$$", true)', "AFDate_FormatEx('mm/dd/yyyy')",
    'this.submitForm("https://x")', 'AFSimple_Calculate("SUM", new Array("a","b"))', '',
  ];
  for (const code of BLOCKED) {
    it('blocks ' + JSON.stringify(code), () => {
      expect(types(scanFields([field(dict({ F: js(code) }))]))).toContain('additional-actions');
    });
  }
  it('blocks a non-field trigger (mouse enter) even with a formatter string', () => {
    expect(types(scanFields([field(dict({ E: js('AFDate_FormatEx("mm/dd/yyyy")') }))]))).toContain('additional-actions');
  });
  it('blocks a chained action (/Next)', () => {
    expect(types(scanFields([field(dict({ F: js('AFSpecial_Format(2)', { Next: js('app.alert(1)') }) }))]))).toContain('additional-actions');
  });
  it('blocks a non-JavaScript action and a JS stream it cannot read', () => {
    expect(types(scanFields([field(dict({ F: dict({ S: '/Launch' }) }))]))).toContain('additional-actions');
    expect(types(scanFields([field(dict({ F: dict({ S: '/JavaScript', JS: { contents: [1, 2, 3] } }) }))]))).toContain('additional-actions');
  });
  it('blocks when ONE trigger of several is not a formatter', () => {
    expect(types(scanFields([field(dict({ F: js('AFSpecial_Format(2)'), K: js('event.rc = doEvil()') }))]))).toContain('additional-actions');
  });
  it('the same rule applies to an /AA on a page widget annotation', () => {
    const page = (aa) => ({ node: dict({ Annots: array([dict({ Subtype: '/Widget', AA: aa })]) }) });
    const scanPage = (aa) => scanActiveContent({ context: { lookup: (v) => v }, catalog: dict({}), getPages: () => [page(aa)] }, PDFLibNS);
    const ok = scanPage(dict({ F: js('AFSpecial_Format(2)') }));
    expect(types(ok)).toEqual([]);
    expect(ok.allowedFormattingScripts).toBe(1);
    expect(types(scanPage(dict({ F: js('app.launchURL("https://x")') })))).toContain('additional-actions');
  });
  it('a currency symbol longer than three characters is not a formatter', () => {
    expect(types(scanFields([field(dict({ F: js('AFNumber_Format(2, 0, 0, 0, "abcd", true)') }))]))).toContain('additional-actions');
  });
  it('document-level JavaScript still blocks when every field script is allowed', () => {
    const r = scanFields([field(dict({ F: js('AFDate_FormatEx("mm/dd/yyyy")') }))],
      { Names: dict({ JavaScript: dict({ Names: array(['init', js('app.alert(1)')]) }) }) });
    expect(types(r)).toContain('javascript');
    expect(types(r)).not.toContain('additional-actions');
    expect(r.allowedFormattingScripts).toBe(1);
  });
});

describe('real pdf-lib documents', () => {
  const require = createRequire(import.meta.url);
  const PDF = require(resolve(process.cwd(), 'desktop/mcp/vendor/pdf-lib.min.js'));
  it('a text field with date formatting passes; adding app.alert blocks it', async () => {
    const build = async (code) => {
      const doc = await PDF.PDFDocument.create();
      const page = doc.addPage([300, 300]);
      const tf = doc.getForm().createTextField('date');
      tf.addToPage(page, { x: 20, y: 200, width: 120, height: 20 });
      const action = doc.context.obj({ S: 'JavaScript', JS: PDF.PDFString.of(code) });
      tf.acroField.dict.set(PDF.PDFName.of('AA'), doc.context.obj({ F: doc.context.register(action), K: doc.context.register(action) }));
      return doc;
    };
    const ok = scanActiveContent(await build('AFDate_FormatEx("mm/dd/yyyy")'), PDF);
    expect(ok.findings.map((f) => f.type)).toEqual([]);
    expect(ok.allowedFormattingScripts).toBeGreaterThanOrEqual(1);
    const bad = scanActiveContent(await build('AFDate_FormatEx("mm/dd/yyyy");app.alert(1)'), PDF);
    expect(bad.findings.map((f) => f.type)).toContain('additional-actions');
  });
  const CHILDFIND = 'C:/tmp/remediation_corpus/new/mdoe-cds-child-find-intake-form.pdf';
  it.skipIf(!existsSync(CHILDFIND))('the real child-find form: its field formatters are allowed, its document-level script still blocks', async () => {
    const doc = await PDF.PDFDocument.load(new Uint8Array(readFileSync(CHILDFIND)), { updateMetadata: false });
    const r = scanActiveContent(doc, PDF);
    expect(r.allowedFormattingScripts).toBeGreaterThanOrEqual(1);
    expect(r.findings.map((f) => f.type)).toContain('javascript');
  });
});
