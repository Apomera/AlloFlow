// 4-H activity keyless run (2026-11-05): the source marks its non-discrimination notice /Artifact on both pages and the HTML
// keeps it as a paragraph, so a PDF reader never heard it, and veraPDF and coverage could not tell. Now the copy that fits the
// reading order is released and tagged; the other copy stays decoration. Short text the source hides stays hidden.
// Also: an address wrapped onto two lines has one annotation per line, and was read as two links; now one Link holds both.
// The REAL createTaggedPdf runs in Chromium under the verified-runtime host; veraPDF runs when Java exists.
import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { bootDocumentRuntime } from './helpers/document_runtime_host';

const ROOT = path.resolve(__dirname, '../..');
const MOD = process.env.ALLO_MODULE_DIR || ROOT;

function veraFails(b64: string): string[] | null {
  let java: string | null = null;
  for (const j of [process.env.ALLOFLOW_JAVA, 'C:/Users/cabba/.alloflow-tools/jdk-21.0.11+10-jre/bin/java.exe', 'java'].filter(Boolean) as string[]) {
    try { execFileSync(j, ['-version'], { stdio: 'ignore' }); java = j; break; } catch (_) { /* next */ }
  }
  if (!java) return null;
  const pdfPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'allo-release-')), 'out.pdf');
  fs.writeFileSync(pdfPath, Buffer.from(b64, 'base64'));
  let out = '';
  try { out = execFileSync(java, ['-jar', path.join(ROOT, 'verapdf', 'verapdf-cli.jar'), '-f', 'ua1', '--format', 'json', '--maxfailuresdisplayed', '5', '--', pdfPath], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }); }
  catch (e: any) { out = String(e.stdout || ''); }
  const j = JSON.parse(out); const x = j.report.jobs[0].validationResult; const vr = Array.isArray(x) ? x[0] : x;
  return (vr.details.ruleSummaries || []).filter((s: any) => s.ruleStatus !== 'PASSED').map((s: any) => s.clause + '-' + s.testNumber);
}

async function boot(page) {
  await bootDocumentRuntime(page);
  for (const f of ['accessibility_evidence_module.js', 'verification_policy_module.js', 'doc_builder_renderer_module.js', 'doc_pipeline_module.js', 'view_pdf_validator_module.js']) {
    await page.addScriptTag({ path: fs.existsSync(path.join(MOD, f)) ? path.join(MOD, f) : path.join(ROOT, f) });
  }
}

const NOTICE = 'The University is an equal opportunity employer and does not discriminate in any program.';

async function run(page, spec: any) {
  return page.evaluate(async ({ spec }) => {
    const W: any = window; const L = W.PDFLib;
    const { PDFDocument, StandardFonts, PDFName, PDFArray, PDFDict, PDFRef, PDFString, PDFRawStream } = L;
    const src = await PDFDocument.create();
    const font = await src.embedFont(StandardFonts.Helvetica);
    const fontKey = 'F1';
    for (const pg of spec.pages) {
      const p = src.addPage([612, 792]);
      p.node.setFontDictionary(PDFName.of(fontKey), font.ref);
      const lines: string[] = [];
      pg.forEach((row: any, i: number) => {
        const y = 720 - i * 24, hex = font.encodeText(row.t).toString();
        const bt = 'BT /' + fontKey + ' 11 Tf 72 ' + y + ' Td ' + hex + ' Tj ET';
        lines.push(row.artifact ? '/Artifact BMC\n' + bt + '\nEMC' : bt);
        if (row.href) {
          const a = src.context.obj({ Type: 'Annot', Subtype: 'Link', Rect: [72, y - 2, 540, y + 12], Border: [0, 0, 0], A: { Type: 'Action', S: 'URI', URI: PDFString.of(row.href) } });
          const ar = src.context.register(a);
          let arr = p.node.get(PDFName.of('Annots'));
          if (!arr) { arr = src.context.obj([]); p.node.set(PDFName.of('Annots'), arr); }
          arr.push(ar);
        }
      });
      const stream = src.context.stream(lines.join('\n'));
      p.node.set(PDFName.of('Contents'), src.context.register(stream));
    }
    await src.embedFont(StandardFonts.Helvetica);
    const html = '<!DOCTYPE html><html lang="en"><head><title>Doc</title></head><body><main>' + spec.html + '</main></body></html>';
    const pipeline = W.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Doc', state: {} });
    const tagged = await pipeline.createTaggedPdf(new Uint8Array(await src.save()), { accessibleHtml: html }, { lang: 'en', title: 'Doc' });
    const bytes = tagged.bytes || tagged;
    const v = await W.AlloModules.PdfValidator.validateExportedPdfBytes(bytes);
    const doc = await PDFDocument.load(bytes); const c = doc.context;
    const look = (x: any) => (x instanceof PDFRef ? c.lookup(x) : x);
    const pageNo = new Map(doc.getPages().map((p: any, i: number) => [String(p.ref), i + 1]));
    const leaves: any[] = [];
    const walk = (x: any) => {
      const n = look(x);
      if (n instanceof PDFArray) { n.asArray().forEach(walk); return; }
      if (!(n instanceof PDFDict)) return;
      const K = n.get(PDFName.of('K'));
      const kids = K == null ? [] : (look(K) instanceof PDFArray ? look(K).asArray() : [K]);
      const mcrs = kids.map(look).filter((d: any) => d instanceof PDFDict && d.get(PDFName.of('MCID')));
      const objrs = kids.map(look).filter((d: any) => d instanceof PDFDict && String(d.get(PDFName.of('Type'))) === '/OBJR');
      const S = String(n.get(PDFName.of('S'))).slice(1), at = n.get(PDFName.of('ActualText')), alt = n.get(PDFName.of('Alt'));
      if (at || alt || mcrs.length || objrs.length) leaves.push({ S, text: at ? at.decodeText() : alt ? alt.decodeText() : '', mcrs: mcrs.length, objrs: objrs.length, pg: mcrs.length ? pageNo.get(String(mcrs[0].get(PDFName.of('Pg')))) : null });
      if (K != null) walk(K);
    };
    walk(look(doc.catalog.get(PDFName.of('StructTreeRoot'))).get(PDFName.of('K')));
    const pdf = await W.pdfjsLib.getDocument({ data: bytes.slice() }).promise;
    const artifacts: string[] = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const tc = await (await pdf.getPage(p)).getTextContent({ includeMarkedContent: true });
      const stack: string[] = []; let out = '';
      for (const it of tc.items as any[]) {
        if (it.type === 'beginMarkedContent' || it.type === 'beginMarkedContentProps') stack.push(it.tag || '');
        else if (it.type === 'endMarkedContent') stack.pop();
        else if (typeof it.str === 'string' && it.str.trim() && stack.includes('Artifact')) out += it.str + ' ';
      }
      artifacts.push(out);
    }
    let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return { leaves, artifacts, fails: ((v && v.checks) || []).filter((x: any) => x.status === 'fail').map((x: any) => x.rule + ': ' + x.detail), b64: btoa(bin) };
  }, { spec });
}

const LONG = (w: string) => ('Plain text about the ' + w + ' section of this document for readers to enjoy.');

test.describe('text the source marks as decoration, and links wrapped over two lines', () => {
  test.beforeEach(async ({ page }) => { await boot(page); });

  test('a whole prose paragraph hidden on both pages is tagged once, on the page that fits the reading order', async ({ page }) => {
    const r = await run(page, {
      pages: [[{ t: 'First heading text' }, { t: LONG('first') }, { t: NOTICE, artifact: true }], [{ t: LONG('second') }, { t: NOTICE, artifact: true }]],
      html: '<h1>First heading text</h1><p>' + LONG('first') + '</p><p>' + LONG('second') + '</p><p>' + NOTICE + '</p>',
    });
    expect(r.fails).toEqual([]);
    const notice = r.leaves.filter((x: any) => x.text === NOTICE);
    expect(notice).toEqual([expect.objectContaining({ S: 'P', pg: 2 })]);
    expect(r.artifacts[0]).toContain('equal opportunity');
    expect(r.artifacts[1]).not.toContain('equal opportunity');
    const pages = r.leaves.filter((x: any) => x.pg).map((x: any) => x.pg);
    expect(pages).toEqual(pages.slice().sort((a: number, b: number) => a - b)); // reading never steps back
    const f = veraFails(r.b64); if (f) expect(f).toEqual([]);
  });

  test('a notice printed in several lines: only the chosen copy is released, so the other leaves no stray pieces', async ({ page }) => {
    const A = 'The University is an equal opportunity employer and does';
    const B = 'not discriminate in any program, service or activity it runs.';
    const hidden = [{ t: A, artifact: true }, { t: B, artifact: true }];
    const r = await run(page, {
      pages: [[{ t: 'First heading text' }, { t: LONG('first') }, ...hidden], [{ t: LONG('second') }, ...hidden]],
      html: '<h1>First heading text</h1><p>' + LONG('first') + '</p><p>' + LONG('second') + '</p><p>' + A + ' ' + B + '</p>',
    });
    expect(r.fails).toEqual([]);
    expect(r.leaves.filter((x: any) => x.text === A || x.text === B)).toEqual([]);
    expect(r.leaves.find((x: any) => x.text === A + ' ' + B)).toEqual(expect.objectContaining({ S: 'P', pg: 2 }));
    expect(r.artifacts[0]).toContain('equal opportunity');
  });

  test('when the next paragraph prints on page 1, the page 1 copy is the one tagged', async ({ page }) => {
    const r = await run(page, {
      pages: [[{ t: 'First heading text' }, { t: NOTICE, artifact: true }, { t: LONG('first') }], [{ t: LONG('second') }, { t: NOTICE, artifact: true }]],
      html: '<h1>First heading text</h1><p>' + NOTICE + '</p><p>' + LONG('first') + '</p><p>' + LONG('second') + '</p>',
    });
    expect(r.leaves.find((x: any) => x.text === NOTICE).pg).toBe(1);
    expect(r.artifacts[1]).toContain('equal opportunity');
    const f = veraFails(r.b64); if (f) expect(f).toEqual([]);
  });

  test('short text the source hides stays hidden, even when the HTML keeps it', async ({ page }) => {
    const r = await run(page, {
      pages: [[{ t: 'First heading text' }, { t: LONG('first') }, { t: 'Reviewed June 2025 by staff', artifact: true }]],
      html: '<h1>First heading text</h1><p>' + LONG('first') + '</p><p>Reviewed June 2025 by staff</p>',
    });
    expect(r.artifacts[0]).toContain('Reviewed June');
    expect(r.leaves.filter((x: any) => x.text === 'Reviewed June 2025 by staff')).toEqual([]);
  });

  test('a decoration the HTML does not keep stays decoration', async ({ page }) => {
    const r = await run(page, {
      pages: [[{ t: 'First heading text' }, { t: LONG('first') }, { t: NOTICE, artifact: true }]],
      html: '<h1>First heading text</h1><p>' + LONG('first') + '</p>',
    });
    expect(r.artifacts[0]).toContain('equal opportunity');
    expect(r.leaves.filter((x: any) => /equal opportunity/.test(x.text))).toEqual([]);
  });

  test('an address wrapped onto two lines is one Link holding both annotations', async ({ page }) => {
    const u = 'https://example.org/edu/learn/project/the-types-of-clouds-and-what-they-mean';
    const r = await run(page, {
      pages: [[{ t: 'First heading text' }, { t: LONG('first') }, { t: 'example.org/edu/learn/project/the-types-of', href: u }, { t: 'clouds-and-what-they-mean', href: u }, { t: LONG('second') }]],
      html: '<h1>First heading text</h1><p>' + LONG('first') + '</p><p><a href="' + u + '">example.org/edu/learn/project/the-types-of clouds-and-what-they-mean</a></p><p>' + LONG('second') + '</p>',
    });
    const links = r.leaves.filter((x: any) => x.S === 'Link');
    expect(links).toHaveLength(1);
    expect(links[0].objrs).toBe(2);
    expect(r.fails).toEqual([]);
    const f = veraFails(r.b64); if (f) expect(f).toEqual([]);
  });

  test('two separate links to the same place stay two', async ({ page }) => {
    const u = 'https://example.org/form-for-families';
    const r = await run(page, {
      pages: [[{ t: 'First heading text' }, { t: 'Open the family form here today', href: u }, { t: LONG('first') }, { t: 'Open the same form again here', href: u }]],
      html: '<h1>First heading text</h1><p><a href="' + u + '">Open the family form here today</a></p><p>' + LONG('first') + '</p><p><a href="' + u + '">Open the same form again here</a></p>',
    });
    expect(r.leaves.filter((x: any) => x.S === 'Link')).toHaveLength(2);
    const f = veraFails(r.b64); if (f) expect(f).toEqual([]);
  });

  test('two links to one place inside one paragraph, with words between them, stay two', async ({ page }) => {
    const u = 'https://example.org/form-for-families';
    const r = await run(page, {
      pages: [[{ t: 'First heading text' }, { t: 'Open the family form here today', href: u }, { t: 'and when you are finished please', }, { t: 'Open the same form again here', href: u }, { t: LONG('first') }]],
      html: '<h1>First heading text</h1><p><a href="' + u + '">Open the family form here today</a> and when you are finished please <a href="' + u + '">Open the same form again here</a></p><p>' + LONG('first') + '</p>',
    });
    expect(r.leaves.filter((x: any) => x.S === 'Link')).toHaveLength(2);
  });

  test('a running head on some pages, read by no leaf, is decoration, not text after the signature (FDA letter)', async ({ page }) => {
    const HEAD = 'NDA 021957: the product name line';
    const r = await run(page, {
      pages: [[{ t: 'First heading text' }, { t: LONG('first') }, { t: LONG('filler') }], [{ t: HEAD }, { t: LONG('second') }, { t: LONG('third') }], [{ t: HEAD }, { t: LONG('fourth') }, { t: LONG('fifth') }]],
      html: '<h1>First heading text</h1><p>' + LONG('first') + '</p><p>' + LONG('filler') + '</p><p>' + LONG('second') + '</p><p>' + LONG('third') + '</p><p>' + LONG('fourth') + '</p><p>' + LONG('fifth') + '</p>',
    });
    expect(r.leaves.filter((x: any) => /NDA 021957/.test(x.text))).toEqual([]);
    expect(r.artifacts[1]).toContain('NDA 021957');
    expect(r.artifacts[2]).toContain('NDA 021957');
    expect(r.fails).toEqual([]);
    const f = veraFails(r.b64); if (f) expect(f).toEqual([]);
  });

  test('a header kept once at the end of the HTML links to the copy nearest where it reads, so reading never steps back', async ({ page }) => {
    const HEAD = 'NDA 021957: the product name line';
    const page4 = [{ t: LONG('sixth') }, { t: LONG('seventh') }, { t: HEAD }, { t: 'Sincerely and with thanks' }];
    const r = await run(page, {
      pages: [[{ t: 'First heading text' }, { t: LONG('first') }, { t: LONG('filler') }], [{ t: HEAD }, { t: LONG('second') }, { t: LONG('third') }], [{ t: HEAD }, { t: LONG('fourth') }, { t: LONG('fifth') }], page4],
      html: '<h1>First heading text</h1><p>' + ['first', 'filler', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'].map(LONG).join('</p><p>') + '</p><p>Sincerely and with thanks</p><p>' + HEAD + '</p>',
    });
    expect(r.leaves.filter((x: any) => x.text === HEAD)).toEqual([expect.objectContaining({ S: 'P', pg: 4 })]);
    const pages = r.leaves.filter((x: any) => x.pg).map((x: any) => x.pg);
    expect(pages).toEqual(pages.slice().sort((a: number, b: number) => a - b));
    expect(r.artifacts[1]).toContain('NDA 021957');
    expect(r.fails).toEqual([]);
    const f = veraFails(r.b64); if (f) expect(f).toEqual([]);
  });

  test('a repeat kept where it first prints is not moved', async ({ page }) => {
    const HEAD = 'NDA 021957: the product name line';
    const r = await run(page, {
      pages: [[{ t: 'First heading text' }, { t: HEAD }, { t: LONG('first') }], [{ t: HEAD }, { t: LONG('second') }, { t: LONG('third') }]],
      html: '<h1>First heading text</h1><p>' + HEAD + '</p><p>' + ['first', 'second', 'third'].map(LONG).join('</p><p>') + '</p>',
    });
    expect(r.leaves.find((x: any) => x.text === HEAD).pg).toBe(1);
  });

  test('the same line in the middle of the pages, or on one page only, stays readable', async ({ page }) => {
    const LINE = 'Please read the note about buses';
    const mid = await run(page, {
      pages: [[{ t: 'First heading text' }, { t: LONG('first') }, { t: LINE }, { t: LONG('second') }, { t: LONG('third') }], [{ t: LONG('fourth') }, { t: LONG('fifth') }, { t: LINE }, { t: LONG('sixth') }, { t: LONG('seventh') }]],
      html: '<h1>First heading text</h1><p>' + ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'].map(LONG).join('</p><p>') + '</p>',
    });
    expect(mid.artifacts.join(' ')).not.toContain('note about buses');
    const one = await run(page, {
      pages: [[{ t: LINE }, { t: 'First heading text' }, { t: LONG('first') }], [{ t: LONG('second') }, { t: LONG('third') }]],
      html: '<h1>First heading text</h1><p>' + LONG('first') + '</p><p>' + LONG('second') + '</p><p>' + LONG('third') + '</p>',
    });
    expect(one.artifacts.join(' ')).not.toContain('note about buses');
  });

  test('two wrapped lines of DIFFERENT addresses stay two', async ({ page }) => {
    const r = await run(page, {
      pages: [[{ t: 'First heading text' }, { t: 'example.org/one/page/for/reading', href: 'https://example.org/one' }, { t: 'example.org/two/page/for/reading', href: 'https://example.org/two' }, { t: LONG('first') }]],
      html: '<h1>First heading text</h1><p><a href="https://example.org/one">example.org/one/page/for/reading</a> <a href="https://example.org/two">example.org/two/page/for/reading</a></p><p>' + LONG('first') + '</p>',
    });
    expect(r.leaves.filter((x: any) => x.S === 'Link')).toHaveLength(2);
  });
});
