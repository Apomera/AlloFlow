// Which page of a multi-page scan each tagged paragraph belongs to (2026-11-09). The tagger split paragraphs across pages by
// COUNT, so a short first page took paragraphs printed on the long second page. _alloAssignLeavesToPages puts each leaf on the
// page whose reading holds its words. The real function, sliced from the source, then the real server and tagger on a
// three-page scan with uneven pages.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

vi.setConfig({ testTimeout: 300000, hookTimeout: 60000 });
const requireCjs = createRequire(import.meta.url);
const PDFLib = requireCjs(resolve(process.cwd(), 'desktop/mcp/vendor/pdf-lib.min.js'));
const SRC = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const assign = new Function(sliceBetween(SRC, 'var _alloAssignLeavesToPages = function', '\n};', { file: 'doc_pipeline_source.jsx' }) + '\n};\nreturn _alloAssignLeavesToPages;')();
const SERVER = resolve(process.cwd(), 'desktop/mcp/alloflow-remediation-mcp-stdio.cjs');
const tmp = mkdtempSync(join(tmpdir(), 'alloflow-leaf-pages-'));
const sha = (b) => createHash('sha256').update(b).digest('hex');

// Page 1 is short, page 2 long, page 3 short: a count split (9 leaves / 3 pages = 3 each) gets five of them wrong.
const PAGES = [
  ['Garden Club Handbook', 'Welcome to the garden club for the spring term at Maple Street School.'],
  ['Weekly jobs', 'Water the raised beds every morning before the first bell rings.', 'Pull the weeds around the carrots and the lettuce on Tuesdays.', 'Record how tall the sunflowers have grown in the class chart.', 'Turn the compost with the long fork every second Friday.'],
  ['Contact', 'Questions go to Ms. Okafor in room 112 after lunch.'],
];
const LEAVES = PAGES.flatMap((p, pi) => p.map((text, i) => ({ role: i === 0 ? (pi === 0 ? 'H1' : 'H2') : 'P', text, page: pi })));

describe('_alloAssignLeavesToPages', () => {
  const texts = PAGES.map((p) => p.join('\n'));
  it('puts every leaf on the page that prints it, where a count split would not', () => {
    expect(assign(LEAVES, texts)).toEqual(LEAVES.map((l) => l.page));
    const byCount = LEAVES.map((_, i) => Math.min(Math.floor(i / 3), 2));
    expect(byCount).not.toEqual(LEAVES.map((l) => l.page));
  });
  it('a short heading between two pages goes with the page that follows it; a Sect never anchors', () => {
    const withSect = [{ role: 'Sect', text: texts.join(' ') }].concat(LEAVES);
    const out = assign(withSect, texts);
    expect(out.slice(1)).toEqual(LEAVES.map((l) => l.page));
    expect(out[0]).toBe(0);
  });
  it('never moves backwards, and tolerates a misread word', () => {
    const leaves = LEAVES.map((l) => ({ ...l, text: l.text.replace('sunflowers', 'sunflovvers') }));
    const out = assign(leaves, texts);
    for (let i = 1; i < out.length; i++) expect(out[i]).toBeGreaterThanOrEqual(out[i - 1]);
    expect(out).toEqual(LEAVES.map((l) => l.page));
  });
  it('gives up (null) when the page readings do not hold the leaves, or there is one page', () => {
    expect(assign(LEAVES, ['lorem ipsum dolor', 'sit amet consectetur', 'adipiscing elit sed'])).toBeNull();
    expect(assign(LEAVES, [texts.join(' ')])).toBeNull();
  });
  it('is wired into the scanned leaf plan', () => {
    expect(SRC).toContain('_leafPages = _alloAssignLeavesToPages(_unifiableLeafRefs, _textPageIdx.map((pi) => _ocrPageText(_ocrEntryFor(pi))));');
  });
});

let child, nextId = 1, buffer = '', cap;
const pending = new Map();
const request = (method, params, ms = 20000) => new Promise((res, rej) => {
  const id = nextId++;
  const t = setTimeout(() => { pending.delete(id); rej(new Error('timeout waiting for ' + method)); }, ms);
  pending.set(id, (m) => { clearTimeout(t); res(m); });
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
});
const call = async (name, args, ms = 280000) => (await request('tools/call', { name, arguments: args }, ms)).result;
beforeAll(async () => {
  const env = { ...process.env };
  delete env.GEMINI_API_KEY; env.ALLOFLOW_MCP_NO_KEY_FILES = '1'; env.ALLOFLOW_MCP_STATE_DIR = join(tmp, 'state');
  child = spawn(process.execPath, [SERVER], { cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'], env });
  child.stdout.setEncoding('utf-8');
  child.stdout.on('data', (chunk) => {
    buffer += chunk; let i;
    while ((i = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, i); buffer = buffer.slice(i + 1);
      let msg; try { msg = JSON.parse(line); } catch (_) { continue; }
      const r = msg && pending.get(msg.id); if (r) { pending.delete(msg.id); r(msg); }
    }
  });
  await request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'leaf-pages', version: '0' } });
  cap = (await call('remediation_capabilities', {})).structuredContent;
});
afterAll(() => { if (child) child.kill(); rmSync(tmp, { recursive: true, force: true }); });

describe('a three-page scan through the real tagger', () => {
  it('tags each paragraph on the page that prints it', async () => {
    if (!cap.chromiumInstalled) return;
    const dir = join(tmp, 'scan3'); mkdirSync(dir, { recursive: true });
    const png = new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'));
    const doc = await PDFLib.PDFDocument.create();
    const img = await doc.embedPng(png);
    for (let i = 0; i < 3; i++) doc.addPage([612, 792]).drawImage(img, { x: 0, y: 0, width: 612, height: 792 });
    doc.setTitle('Garden Club Handbook');
    const pdf = join(dir, 'handbook.pdf'); writeFileSync(pdf, await doc.save());
    const pdfSha = sha(readFileSync(pdf));
    const readingPath = join(dir, 'handbook-scan-reading.json');
    writeFileSync(readingPath, JSON.stringify({ tool: 'alloflow-remediation', kind: 'scan-reading', version: 1, sourceSha256: pdfSha, method: 'vision-ocr',
      sourceText: PAGES.map((p) => p.join('\n')).join('\n\n'), pages: PAGES.map((p, i) => ({ pageNum: i + 1, text: p.join('\n'), pageW: 612, pageH: 792 })) }));
    const report = join(dir, 'handbook-remediation-report.json');
    writeFileSync(report, JSON.stringify({ files: { scanReading: readingPath }, contentCoverage: { sourceSha256: pdfSha }, fidelityNotes: [] }));
    const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Garden Club Handbook</title></head><body><main>'
      + LEAVES.map((l) => { const t = l.role === 'P' ? 'p' : l.role.toLowerCase(); return '<' + t + '>' + l.text + '</' + t + '>'; }).join('') + '</main></body></html>';
    const htmlPath = join(dir, 'handbook-accessible.html'); writeFileSync(htmlPath, html);
    const sc = (await call('pdf_finalize_edited_html', { file_path: pdf, edited_html_path: htmlPath, confirmed_by: 'Ms. Rivera', report_path: report, validate_ua: !!cap.javaAvailable })).structuredContent;
    expect(sc.taggedPdfDelivery).toEqual({ ok: true, code: 'verified' });
    if (cap.javaAvailable) expect(sc.pdfUa.status).toBe('passed');
    // every tagged leaf: its text and the page its marked content sits on
    const { PDFDocument, PDFName, PDFArray, PDFDict, PDFRef, PDFString, PDFHexString } = PDFLib;
    const d = await PDFDocument.load(new Uint8Array(readFileSync(sc.files.taggedPdf)), { updateMetadata: false });
    const pageRefs = d.getPages().map((p) => p.ref.toString());
    const look = (x) => (x instanceof PDFRef ? d.context.lookup(x) : x);
    const got = {};
    const walk = (x) => {
      const node = look(x);
      if (node instanceof PDFArray) { node.asArray().forEach(walk); return; }
      if (!(node instanceof PDFDict)) return;
      const at = node.get(PDFName.of('ActualText'));
      const k = look(node.get(PDFName.of('K')));
      if (at instanceof PDFString || at instanceof PDFHexString) {
        const kids = k instanceof PDFArray ? k.asArray().map(look) : [k];
        const mcr = kids.find((c) => c instanceof PDFDict && c.get(PDFName.of('Pg')));
        const pg = mcr ? mcr.get(PDFName.of('Pg')) : node.get(PDFName.of('Pg'));
        if (pg) got[at.decodeText()] = pageRefs.indexOf(pg.toString());
      }
      if (k != null) walk(k);
    };
    walk(look(d.catalog.get(PDFName.of('StructTreeRoot'))).get(PDFName.of('K')));
    for (const l of LEAVES) expect(got[l.text], l.text).toBe(l.page);
  });
});
