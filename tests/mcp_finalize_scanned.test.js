// pdf_finalize_edited_html on a SCAN (2026-11-08, phase 2). A scan has no text layer: the tagged PDF's hidden text and its
// word check come from the page-by-page machine reading a run saves beside its report (<name>-scan-reading.json). These tests
// build an image-only PDF, a reading with word boxes and a report naming it, then drive the real server and tagger: a structure
// edit is delivered, a person's correction of a misread word is held for them to confirm, and a reading of another PDF is refused.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

vi.setConfig({ testTimeout: 300000, hookTimeout: 60000 });
const requireCjs = createRequire(import.meta.url);
const PDFLib = requireCjs(resolve(process.cwd(), 'desktop/mcp/vendor/pdf-lib.min.js'));
const Driver = requireCjs(resolve(process.cwd(), 'desktop/mcp/remediation_headless_driver.cjs'));
const SERVER = resolve(process.cwd(), 'desktop/mcp/alloflow-remediation-mcp-stdio.cjs');
const tmp = mkdtempSync(join(tmpdir(), 'alloflow-finalize-scan-'));
const sha = (b) => createHash('sha256').update(b).digest('hex');

let child, nextId = 1, buffer = '';
const pending = new Map();
function onStdout(chunk) {
  buffer += chunk;
  let i;
  while ((i = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, i); buffer = buffer.slice(i + 1);
    if (!line.trim()) continue;
    let msg; try { msg = JSON.parse(line); } catch (_) { continue; }
    if (msg.id === undefined) continue;
    const r = pending.get(msg.id); if (r) { pending.delete(msg.id); r(msg); }
  }
}
const request = (method, params, ms = 20000) => new Promise((res, rej) => {
  const id = nextId++;
  const t = setTimeout(() => { pending.delete(id); rej(new Error('timeout waiting for ' + method)); }, ms);
  pending.set(id, (m) => { clearTimeout(t); res(m); });
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
});
const call = async (name, args, ms = 280000) => (await request('tools/call', { name, arguments: args }, ms)).result;
const refusal = async (name, args) => { const r = await request('tools/call', { name, arguments: args }, 280000); return r.error ? r.error.message : (r.result.isError ? r.result.content[0].text : null); };

// The printed page, as the run's machine reading saw it: one heading misread ("Evaporatlon").
const LINES = [
  ['Water Cycle Guide', 24], ['Evaporatlon', 16], ['Heat from the sun turns liquid water into vapor that rises into the air.', 11],
  ['Condensation', 16], ['Cooling vapor forms tiny droplets that gather into clouds above the land.', 11],
  ['Precipitation', 16], ['Heavy droplets fall as rain or snow and the cycle begins again.', 11],
];
// A grey 1x1 PNG stretched over the page: an image-only PDF, which is all a scan is to the tagger.
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
async function makeScan(file) {
  const doc = await PDFLib.PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const img = await doc.embedPng(new Uint8Array(PNG_1PX));
  page.drawImage(img, { x: 0, y: 0, width: 612, height: 792 });
  doc.setTitle('Water Cycle Guide'); doc.setLanguage('en-US');
  writeFileSync(file, await doc.save());
}
// Word boxes in PDF points, origin top-left (the shape the OCR step records).
function reading() {
  const words = [];
  let y = 72;
  for (const [line, size] of LINES) {
    let x = 72;
    for (const t of line.split(' ')) { const w = t.length * size * 0.5; words.push({ t, x0: x, y0: y, x1: x + w, y1: y + size, c: 90 }); x += w + size * 0.3; }
    y += size + 14;
  }
  const text = LINES.map(([l]) => l).join('\n');
  return { pages: [{ pageNum: 1, text, words, pageW: 612, pageH: 792 }], sourceText: text };
}
const HTML = (evaporation = 'Evaporatlon', precipitation = 'h2') => '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Water Cycle Guide</title></head><body>'
  + '<a href="#main-content" class="skip">Skip to main content</a><main id="main-content">'
  + '<h1>Water Cycle Guide</h1><h2>' + evaporation + '</h2><p>Heat from the sun turns liquid water into vapor that rises into the air.</p>'
  + '<h2>Condensation</h2><p>Cooling vapor forms tiny droplets that gather into clouds above the land.</p>'
  + '<' + precipitation + '>Precipitation</' + precipitation + '><p>Heavy droplets fall as rain or snow and the cycle begins again.</p></main></body></html>';

let n = 0;
// A folder as a run leaves it: the scan, its report and the saved reading the report names.
async function runFolder({ readingFor } = {}) {
  const dir = join(tmp, 's' + (++n)); mkdirSync(dir, { recursive: true });
  const pdf = join(dir, 'scan.pdf'); await makeScan(pdf);
  const pdfSha = sha(readFileSync(pdf));
  const r = reading();
  const readingPath = join(dir, 'scan-scan-reading.json');
  writeFileSync(readingPath, JSON.stringify({ tool: 'alloflow-remediation', kind: 'scan-reading', version: 1, sourceSha256: readingFor || pdfSha, method: 'tesseract+vision', sourceText: r.sourceText, pages: r.pages }));
  const runHtml = join(dir, 'scan-accessible.html'); writeFileSync(runHtml, HTML());
  const report = join(dir, 'scan-remediation-report.json');
  writeFileSync(report, JSON.stringify({ files: { accessibleHtml: runHtml, scanReading: readingPath }, contentCoverage: { sourceSha256: pdfSha, htmlSha256: sha(readFileSync(runHtml)) }, fidelityNotes: [] }));
  return { dir, pdf, report, readingPath };
}

// Every struct element's role and /ActualText, in reading order.
async function tagTree(pdfPath) {
  const { PDFDocument, PDFName, PDFArray, PDFDict, PDFRef, PDFString, PDFHexString } = PDFLib;
  const d = await PDFDocument.load(new Uint8Array(readFileSync(pdfPath)), { updateMetadata: false });
  const look = (x) => (x instanceof PDFRef ? d.context.lookup(x) : x);
  const out = [];
  const walk = (x) => {
    const node = look(x);
    if (node instanceof PDFArray) { node.asArray().forEach(walk); return; }
    if (!(node instanceof PDFDict)) return;
    const s = node.get(PDFName.of('S'));
    if (s) {
      const at = node.get(PDFName.of('ActualText'));
      out.push({ role: String(s).slice(1), text: at instanceof PDFString || at instanceof PDFHexString ? at.decodeText() : null });
    }
    const k = node.get(PDFName.of('K')); if (k != null) walk(k);
  };
  walk(look(d.catalog.get(PDFName.of('StructTreeRoot'))).get(PDFName.of('K')));
  return out;
}

let cap;
const needsChromium = (fn) => async () => { if (!cap.chromiumInstalled) return; await fn(); };

beforeAll(async () => {
  const env = { ...process.env };
  delete env.GEMINI_API_KEY; env.ALLOFLOW_MCP_NO_KEY_FILES = '1'; env.ALLOFLOW_MCP_STATE_DIR = join(tmp, 'state');
  child = spawn(process.execPath, [SERVER], { cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'], env });
  child.stdout.setEncoding('utf-8'); child.stdout.on('data', onStdout);
  await request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'finalize-scan', version: '0' } });
  cap = (await call('remediation_capabilities', {})).structuredContent;
});
afterAll(() => { if (child) child.kill(); rmSync(tmp, { recursive: true, force: true }); });

describe('scanReadingForRun: what a run saves for a scan (no browser)', () => {
  const pages = [{ pageNum: 1, text: 'Hello world', words: [{ t: 'Hello', x0: 1, y0: 2, x1: 3, y1: 4, c: 91, extra: 'dropped' }, { t: 'bad', x0: 'x' }], pageW: 612, pageH: 792, viewportTransform: [1, 0, 0, -1, 0, 792], secret: 'not kept' }];
  it('keeps page text, numeric word boxes and page geometry, and nothing else', () => {
    const r = Driver.scanReadingForRun({ isScanned: true, groundTruthMethod: 'tesseract', groundTruthPages: pages, sourceText: 'Hello world' }, 'doc.pdf', null);
    expect(r).toEqual({ method: 'tesseract', sourceText: 'Hello world', pages: [{ pageNum: 1, text: 'Hello world', words: [{ t: 'Hello', x0: 1, y0: 2, x1: 3, y1: 4, c: 91 }], pageW: 612, pageH: 792, viewportTransform: [1, 0, 0, -1, 0, 792] }] });
  });
  it('saves nothing for a born-digital file, an Office file or a run with no page map', () => {
    expect(Driver.scanReadingForRun({ isScanned: false, groundTruthMethod: 'pdfjs', groundTruthPages: pages }, 'doc.pdf', null)).toBeNull();
    expect(Driver.scanReadingForRun({ isScanned: true, groundTruthPages: pages }, 'doc.docx', null)).toBeNull();
    expect(Driver.scanReadingForRun({ isScanned: true, groundTruthPages: null }, 'doc.pdf', null)).toBeNull();
  });
  it('falls back to the page map the page kept when the result has none, and reads an OCR method as a scan', () => {
    const r = Driver.scanReadingForRun({ groundTruthMethod: 'vision', groundTruthPages: [] }, 'doc.pdf', [{ page: 2, content: 'From the fallback' }]);
    expect(r.pages).toEqual([{ pageNum: 2, text: 'From the fallback' }]);
  });
  // A real run (garden scan, 2026-11-08) called its PDF "ready" while the hidden text sat in a column at the top of the page.
  it('scanLayerCaution: a run says when the hidden text could not be laid over the printed words, and only then', () => {
    expect(Driver.scanLayerCaution({ scanned: true, blockLayoutPages: [1], positionedPages: 0, pagesWithText: 1 }))
      .toMatch(/^On this scan, the hidden text could not be laid over the printed words .*Screen readers are not affected.$/);
    const longest = Driver.scanLayerCaution({ scanned: true, blockLayoutPages: Array.from({ length: 40 }, (_, i) => i + 100), positionedPages: 1, pagesWithText: 200 });
    expect(longest.length).toBeLessThanOrEqual(300); // the report clips a caution at 300 characters
    expect(Driver.scanLayerCaution({ scanned: true, blockLayoutPages: [1, 2], positionedPages: 0, pagesWithText: 2 })).toMatch(/^On every page of this scan,/);
    expect(Driver.scanLayerCaution({ scanned: true, blockLayoutPages: [2, 5], positionedPages: 3, pagesWithText: 5 })).toMatch(/^On pages 2, 5 of this scan,/);
    expect(Driver.scanLayerCaution({ scanned: true, blockLayoutPages: [], positionedPages: 3 })).toBeNull();
    expect(Driver.scanLayerCaution({ scanned: false, blockLayoutPages: [1] })).toBeNull();
    expect(Driver.scanLayerCaution(null)).toBeNull();
    // the run's page uses it on the tagger's own report, and it turns "ready" into "caution"
    const src = readFileSync(resolve(process.cwd(), 'desktop/mcp/remediation_headless_driver.cjs'), 'utf8');
    expect(src).toContain("textLayerCaution = (0, eval)('(' + scanLayerCautionFn + ')')(tagged && tagged.ocrTextLayer);");
    expect(src).toContain("if(textLayerCaution&&verdict)verdict={...verdict,level:verdict.level==='ready'?'caution':verdict.level,cautions:[...(verdict.cautions||[]),textLayerCaution]};");
  });
  it('the artifact writer saves it as <name>-scan-reading.json for a PDF, with the source hash', () => {
    const src = readFileSync(SERVER, 'utf8');
    const w = src.slice(src.indexOf('async function writeRunArtifacts('), src.indexOf('async function remediateOneFile('));
    expect(w).toContain("files.scanReading = claimOutputPath(outDir, stem + '-scan-reading.json');");
    expect(w).toContain("kind: 'scan-reading', version: 1, sourceSha256: compatibility.inputSha256");
  });
});

describe('pdf_finalize_edited_html on a scan (needs Chromium; veraPDF needs Java)', () => {
  it('builds the PDF from a structure edit: the tags carry the edited text, and the report says it is a scan', needsChromium(async () => {
    const f = await runFolder();
    const edited = join(f.dir, 'scan-accessible-edited.html'); writeFileSync(edited, HTML('Evaporatlon', 'h3'));
    const sc = (await call('pdf_finalize_edited_html', { file_path: f.pdf, edited_html_path: edited, confirmed_by: 'Ms. Rivera', report_path: f.report, validate_ua: !!cap.javaAvailable })).structuredContent;
    expect(sc.taggedPdfError).toBeUndefined();
    expect(sc.taggedPdfDelivery).toEqual({ ok: true, code: 'verified' });
    expect(sc.contentCoverage).toMatchObject({ status: 'matched', missingTokens: 0 });
    const tree = await tagTree(sc.files.taggedPdf);
    expect(tree.filter((t) => /^H\d$/.test(t.role)).map((t) => t.role + ':' + t.text)).toEqual(['H1:Water Cycle Guide', 'H2:Evaporatlon', 'H2:Condensation', 'H3:Precipitation']);
    expect(tree.filter((t) => t.role === 'P').map((t) => t.text)).toContain('Heavy droplets fall as rain or snow and the cycle begins again.');
    expect(sc.personEdit.scanReading).toMatchObject({ file: 'scan-scan-reading.json', pages: 1, method: 'tesseract+vision', sha256: sha(readFileSync(f.readingPath)) });
    expect(sc.fidelityNotes.find((x) => x.kind === 'scanEdit').msg).toMatch(/The original is a scan\..*sits on the printed words.*misread form/);
    expect(sc.fidelityNotes.find((x) => x.kind === 'scanEdit').correctionsPlaced).toEqual([]); // a structure edit corrects no word
    expect(sc.verdict.level).not.toBe('ready');
    if (cap.javaAvailable) expect(sc.pdfUa.status).toBe('passed');
  }));

  it('a corrected misread word is held for the person to confirm, and released it reads the correction', needsChromium(async () => {
    const f = await runFolder();
    const edited = join(f.dir, 'scan-accessible-edited.html'); writeFileSync(edited, HTML('Evaporation'));
    const sc = (await call('pdf_finalize_edited_html', { file_path: f.pdf, edited_html_path: edited, confirmed_by: 'Ms. Rivera', report_path: f.report, validate_ua: !!cap.javaAvailable })).structuredContent;
    expect(sc.taggedPdfError).toBe('content_coverage_requires_review');
    expect(sc.contentCoverage.missingWords.map((w) => w.word)).toEqual(['evaporatlon']); // the machine reading's form, for the person to check
    if (!cap.javaAvailable) return;
    expect(sc.coverageRelease.eligible).toBe(true);
    const released = (await call('pdf_release_held_tagged_pdf', { report_path: sc.files.report, confirmed_by: 'Ms. Rivera', coverage_fingerprint: sc.coverageRelease.fingerprint })).structuredContent;
    expect(released.released).toBe(true);
    const tree = await tagTree(released.taggedPdf);
    expect(tree.find((t) => t.role === 'H2').text).toBe('Evaporation');
    // the correction is also on the printed word's box, so search and copy find it
    const note = sc.fidelityNotes.find((x) => x.kind === 'scanEdit');
    expect(note.correctionsPlaced).toEqual([{ page: 1, from: 'Evaporatlon', to: 'Evaporation' }]);
    expect(note.msg).toMatch(/with 1 corrected word put in place of the machine's reading/);
  }));

  // 2026-11-09: the boxes are matched to the text by their WORDS (_alignCallsToRuns). Boxes that kept only the headings
  // still place the headings exactly, and the paragraphs the OCR engine missed go next to them, said as such.
  it('places the paragraphs the OCR boxes missed next to the text before them, and says so', needsChromium(async () => {
    const f = await runFolder();
    const r = JSON.parse(readFileSync(f.readingPath, 'utf8'));
    const keep = new Set(['Water', 'Cycle', 'Guide', 'Evaporatlon', 'Condensation', 'Precipitation']);
    r.pages[0].words = r.pages[0].words.filter((w) => keep.has(w.t)); // the boxes lost every paragraph
    writeFileSync(f.readingPath, JSON.stringify(r));
    const edited = join(f.dir, 'scan-accessible-edited.html'); writeFileSync(edited, HTML());
    const sc = (await call('pdf_finalize_edited_html', { file_path: f.pdf, edited_html_path: edited, confirmed_by: 'Ms. Rivera', report_path: f.report, validate_ua: !!cap.javaAvailable })).structuredContent;
    if (cap.javaAvailable) expect(sc.pdfUa.status).toBe('passed');
    if (cap.javaAvailable) expect(sc.taggedPdfDelivery).toEqual({ ok: true, code: 'verified' });
    const note = sc.fidelityNotes.find((x) => x.kind === 'scanEdit');
    expect(note).toMatchObject({ positionedPages: 1, blockLayoutPages: [] });
    expect(note.approximatedPassages).toBeGreaterThanOrEqual(3);
    expect(note.msg).toMatch(/sits on the printed words.* pieces of text the OCR engine did not see \(for example table cells\) sit near their printed place, not on it\./);
    expect(sc.verdictReasons.cautions.every((c) => c.length <= 300)).toBe(true);
  }));

  // Boxes that match none of the text (another reading altogether) still fall to the block layout, and the report says so.
  it('says so when the invisible text could not be laid over the printed words', needsChromium(async () => {
    const f = await runFolder();
    const r = JSON.parse(readFileSync(f.readingPath, 'utf8'));
    r.pages[0].words = r.pages[0].words.slice(0, 10).map((w, i) => Object.assign({}, w, { t: 'zq' + i })); // few boxes, none line up
    writeFileSync(f.readingPath, JSON.stringify(r));
    const edited = join(f.dir, 'scan-accessible-edited.html'); writeFileSync(edited, HTML());
    const sc = (await call('pdf_finalize_edited_html', { file_path: f.pdf, edited_html_path: edited, confirmed_by: 'Ms. Rivera', report_path: f.report, validate_ua: false })).structuredContent;
    const note = sc.fidelityNotes.find((x) => x.kind === 'scanEdit');
    expect(note).toMatchObject({ positionedPages: 0, blockLayoutPages: [1] });
    expect(note.msg).toMatch(/On this page search and copy find the edited text, but in a column at the top of the page, not on the printed words/);
    expect(note.msg).not.toMatch(/sits on the printed words/);
    // the verdict's short form says the same, within the 300 characters a report keeps of a caution
    expect(sc.verdictReasons.cautions.some((c) => /in a column at the top of the page, not on the printed words/.test(c))).toBe(true);
    expect(sc.verdictReasons.cautions.every((c) => c.length <= 300)).toBe(true);
  }));

  it('refuses a reading saved for a different PDF, and a scan whose run saved no reading', needsChromium(async () => {
    const other = await runFolder({ readingFor: 'e'.repeat(64) });
    const edited = join(other.dir, 'x.html'); writeFileSync(edited, HTML());
    expect(await refusal('pdf_finalize_edited_html', { file_path: other.pdf, edited_html_path: edited, confirmed_by: 'Ms. Rivera', report_path: other.report, validate_ua: false }))
      .toMatch(/scan reading beside that report cannot be used: it belongs to a different PDF/);
    const none = await runFolder();
    rmSync(none.readingPath);
    const report = JSON.parse(readFileSync(none.report, 'utf8')); delete report.files.scanReading; writeFileSync(none.report, JSON.stringify(report));
    const h = join(none.dir, 'x.html'); writeFileSync(h, HTML());
    expect(await refusal('pdf_finalize_edited_html', { file_path: none.pdf, edited_html_path: h, confirmed_by: 'Ms. Rivera', report_path: none.report, validate_ua: false }))
      .toMatch(/finalize_scanned_needs_reading: this PDF is a scan\. /);
    expect(existsSync(join(none.dir, 'scan-reviewed-tagged.pdf'))).toBe(false);
  }));

  it('refuses a reading that is not one AlloFlow wrote, and pages with no text at all', needsChromium(async () => {
    const f = await runFolder();
    const h = join(f.dir, 'x.html'); writeFileSync(h, HTML());
    writeFileSync(f.readingPath, JSON.stringify({ kind: 'something-else', pages: [] }));
    expect(await refusal('pdf_finalize_edited_html', { file_path: f.pdf, edited_html_path: h, confirmed_by: 'Ms. Rivera', report_path: f.report, validate_ua: false })).toMatch(/not a scan reading AlloFlow wrote/);
    writeFileSync(f.readingPath, JSON.stringify({ tool: 'alloflow-remediation', kind: 'scan-reading', version: 1, sourceSha256: sha(readFileSync(f.pdf)), pages: [{ pageNum: 1, text: '  ' }] }));
    expect(await refusal('pdf_finalize_edited_html', { file_path: f.pdf, edited_html_path: h, confirmed_by: 'Ms. Rivera', report_path: f.report, validate_ua: false })).toMatch(/holds no text for any page/);
  }));
});
