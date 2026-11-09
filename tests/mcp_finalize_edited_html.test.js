// pdf_finalize_edited_html (2026-11-08): the tagged PDF is built from the ORIGINAL PDF and an accessible version a person
// edited and approved. No model is used, so the whole file runs without a Gemini key. It spawns the real server and, where
// Chromium is installed, drives the real tagger: the edit has to show in the saved tag tree, the checks have to run on the
// EDITED version, and what the person cannot change has to be refused rather than quietly delivered.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

vi.setConfig({ testTimeout: 300000, hookTimeout: 60000 });
const requireCjs = createRequire(import.meta.url);
const PDFLib = requireCjs(resolve(process.cwd(), 'desktop/mcp/vendor/pdf-lib.min.js'));
const SERVER = resolve(process.cwd(), 'desktop/mcp/alloflow-remediation-mcp-stdio.cjs');
const tmp = mkdtempSync(join(tmpdir(), 'alloflow-finalize-'));
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

// A born-digital page: a title, three headings and their paragraphs, in Helvetica.
async function makePdf(file, { blank = false } = {}) {
  const doc = await PDFLib.PDFDocument.create();
  const regular = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  const bold = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
  const page = doc.addPage([612, 792]);
  if (!blank) {
    let y = 720;
    const put = (t, size, font) => { page.drawText(t, { x: 72, y, size, font }); y -= size + 14; };
    put('Water Cycle Guide', 24, bold);
    put('Evaporation', 16, bold);
    put('Heat from the sun turns liquid water into vapor that rises into the air.', 11, regular);
    put('Condensation', 16, bold);
    put('Cooling vapor forms tiny droplets that gather into clouds above the land.', 11, regular);
    put('Precipitation', 16, bold);
    put('Heavy droplets fall as rain or snow and the cycle begins again.', 11, regular);
    put('Source: field notes', 9, regular);
  }
  doc.setTitle('Water Cycle Guide'); doc.setLanguage('en-US');
  writeFileSync(file, await doc.save());
}
const html = ({ precipitation = 'h2', evaporation = 'Heat from the sun turns liquid water into vapor that rises into the air.', extra = '', source = true } = {}) =>
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Water Cycle Guide</title></head><body>'
  + '<a href="#main-content" class="skip">Skip to main content</a><main id="main-content">'
  + '<h1>Water Cycle Guide</h1><h2>Evaporation</h2><p>' + evaporation + '</p>'
  + '<h2>Condensation</h2><p>Cooling vapor forms tiny droplets that gather into clouds above the land.</p>'
  + '<' + precipitation + '>Precipitation</' + precipitation + '><p>Heavy droplets fall as rain or snow and the cycle begins again.</p>' + (source ? '<p>Source: field notes</p>' : '') + extra
  + '</main></body></html>';

// The roles in the saved tag tree, counted (what a screen reader navigates by).
async function roleCounts(pdfPath) {
  const { PDFDocument, PDFName, PDFArray, PDFDict, PDFRef } = PDFLib;
  const d = await PDFDocument.load(new Uint8Array(readFileSync(pdfPath)), { updateMetadata: false });
  const look = (x) => (x instanceof PDFRef ? d.context.lookup(x) : x);
  const counts = {};
  const walk = (x) => {
    const n = look(x);
    if (n instanceof PDFArray) { n.asArray().forEach(walk); return; }
    if (!(n instanceof PDFDict)) return;
    const s = n.get(PDFName.of('S'));
    if (s) { const r = String(s).slice(1); counts[r] = (counts[r] || 0) + 1; }
    const k = n.get(PDFName.of('K')); if (k != null) walk(k);
  };
  walk(look(d.catalog.get(PDFName.of('StructTreeRoot'))).get(PDFName.of('K')));
  return counts;
}

let cap;
const needsChromium = (fn) => async () => { if (!cap.chromiumInstalled) return; await fn(); };

beforeAll(async () => {
  const env = { ...process.env };
  delete env.GEMINI_API_KEY; env.ALLOFLOW_MCP_NO_KEY_FILES = '1'; env.ALLOFLOW_MCP_STATE_DIR = join(tmp, 'state');
  child = spawn(process.execPath, [SERVER], { cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'], env });
  child.stdout.setEncoding('utf-8'); child.stdout.on('data', onStdout);
  await request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'finalize', version: '0' } });
  cap = (await call('remediation_capabilities', {})).structuredContent;
});
afterAll(() => { if (child) child.kill(); rmSync(tmp, { recursive: true, force: true }); });

describe('pdf_finalize_edited_html: the tool and its argument checks (no browser)', () => {
  it('is registered, needs no key, and is classified as a tool that may fetch a public font', () => {
    expect(cap.keylessToolNames).toContain('pdf_finalize_edited_html');
    expect(cap.geminiRequiredToolNames).not.toContain('pdf_finalize_edited_html');
    expect(cap.dataHandling.publicDependencyDownloadToolNames).toContain('pdf_finalize_edited_html');
    expect(cap.dataHandling.offlineToolNames).not.toContain('pdf_finalize_edited_html');
  });
  it('refuses missing or bad arguments before any browser starts', async () => {
    const pdf = join(tmp, 'args.pdf'); await makePdf(pdf);
    const good = join(tmp, 'args.html'); writeFileSync(good, html());
    const base = { file_path: pdf, edited_html_path: good, confirmed_by: 'Ms. Rivera' };
    const err = async (over) => { const r = (await request('tools/call', { name: 'pdf_finalize_edited_html', arguments: { ...base, ...over } })); return r.error ? r.error.message : (r.result.isError ? r.result.content[0].text : null); };
    expect(await err({ confirmed_by: 'x' })).toMatch(/confirmed_by/);
    expect(await err({ edited_html_path: 'relative.html' })).toMatch(/absolute path of an \.html file/);
    expect(await err({ edited_html_path: join(tmp, 'a.txt') })).toMatch(/absolute path of an \.html file/);
    expect(await err({ edited_html_path: join(tmp, 'ghost.html') })).toMatch(/No file at/);
    const notHtml = join(tmp, 'notes.html'); writeFileSync(notHtml, 'just some words, not a document at all');
    expect(await err({ edited_html_path: notHtml })).toMatch(/does not look like an HTML document/);
    expect(await err({ validate_ua: 'yes' })).toMatch(/validate_ua must be a boolean/);
    expect(await err({ surprise: 1 })).toMatch(/surprise|unknown|additional/i);
    expect(await err({ report_path: '/not/a/report.json' })).toMatch(/report_path/);
  });
  it('refuses a report that belongs to a different PDF', async () => {
    const pdf = join(tmp, 'mine.pdf'); await makePdf(pdf);
    const good = join(tmp, 'mine.html'); writeFileSync(good, html());
    const report = join(tmp, 'other-remediation-report.json');
    writeFileSync(report, JSON.stringify({ contentCoverage: { sourceSha256: 'f'.repeat(64) }, fidelityNotes: [] }));
    const r = await request('tools/call', { name: 'pdf_finalize_edited_html', arguments: { file_path: pdf, edited_html_path: good, confirmed_by: 'Ms. Rivera', report_path: report } });
    expect(r.error ? r.error.message : r.result.content[0].text).toMatch(/different PDF/);
  });
});

describe('pdf_finalize_edited_html: the real tagger (needs Chromium; veraPDF needs Java)', () => {
  it('builds the PDF from the edit: the new heading level is in the tag tree, the person is in the report, nothing is ready', needsChromium(async () => {
    const pdf = join(tmp, 'guide.pdf'); await makePdf(pdf);
    const edited = join(tmp, 'guide-edited.html'); writeFileSync(edited, html({ precipitation: 'h3' }));
    const r = await call('pdf_finalize_edited_html', { file_path: pdf, edited_html_path: edited, confirmed_by: 'Ms. Rivera, art teacher', note: 'Precipitation sits under Condensation.', validate_ua: !!cap.javaAvailable });
    expect(r.isError).toBeFalsy();
    const sc = r.structuredContent;
    // outputs beside the original, named so the run's own files are never overwritten
    expect(sc.files.accessibleHtml).toMatch(/guide-reviewed-accessible\.html$/);
    expect(sc.files.taggedPdf).toMatch(/guide-reviewed-tagged(-review-required)?\.pdf$/);
    expect(sc.files.report).toMatch(/guide-reviewed-remediation-report\.json$/);
    expect(sha(readFileSync(sc.files.accessibleHtml))).toBe(sha(readFileSync(edited)));
    // the edit is in the PDF a screen reader navigates: one H1, two H2, and the H3 the person made
    const roles = await roleCounts(sc.files.taggedPdf);
    expect(roles).toMatchObject({ H1: 1, H2: 2, H3: 1 });
    // provenance and honesty
    expect(sc.personEdit).toMatchObject({ confirmedBy: 'Ms. Rivera, art teacher', note: 'Precipitation sits under Condensation.', editedHtmlSha256: sha(readFileSync(edited)) });
    expect(sc.personEdit.basis).toMatch(/not verified/);
    expect(sc.taggedPdfDelivery).toEqual({ ok: true, code: 'verified' });
    expect(sc.contentCoverage).toMatchObject({ status: 'matched', missingTokens: 0 });
    expect(sc.activeContentScanVerified).toBe(true);
    expect(sc.verdict.level).not.toBe('ready');
    expect(sc.verdictReasons.cautions.join(' ')).toMatch(/edited and approved/);
    expect(sc.deliveryExplanation.headline).toMatch(/^Built from the accessible version Ms\. Rivera, art teacher edited and approved/);
    expect(sc.verification.ai).toBeNull();           // no model ran, and the report does not pretend one did
    expect(sc.remainingAxeViolations).toBe(0);
    if (cap.javaAvailable) {
      expect(sc.pdfUa.status).toBe('passed');
      expect(sc.files.taggedPdf).toMatch(/-reviewed-tagged\.pdf$/);
      expect(sc.verdict.level).toBe('caution');
    }
    expect(existsSync(sc.files.completionManifest)).toBe(true);
  }));

  it('reflects the person\'s structure, not the run\'s: the same PDF with the unedited HTML has no H3', needsChromium(async () => {
    const pdf = join(tmp, 'guide2.pdf'); await makePdf(pdf);
    const plain = join(tmp, 'guide2.html'); writeFileSync(plain, html());
    const sc = (await call('pdf_finalize_edited_html', { file_path: pdf, edited_html_path: plain, confirmed_by: 'Mr. Osei', validate_ua: false })).structuredContent;
    expect(await roleCounts(sc.files.taggedPdf)).toMatchObject({ H1: 1, H2: 3 });
    expect((await roleCounts(sc.files.taggedPdf)).H3).toBeUndefined();
  }));

  it('re-checks the EDITED version: an image with no alternative text stops the PDF and says why', needsChromium(async () => {
    const pdf = join(tmp, 'guide3.pdf'); await makePdf(pdf);
    const bad = join(tmp, 'guide3.html'); writeFileSync(bad, html({ extra: '<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">' }));
    const sc = (await call('pdf_finalize_edited_html', { file_path: pdf, edited_html_path: bad, confirmed_by: 'Mr. Osei', validate_ua: false })).structuredContent;
    expect(sc.files.taggedPdf).toBeUndefined();
    expect(sc.taggedPdfError).toBe('distribution_review_required');
    expect(sc.verdict.level).toBe('review');
    expect(sc.verdictReasons.review.join(' ')).toMatch(/axe-core found \d+ violation/);
    expect(sc.remainingAxeViolations).toBeGreaterThan(0);
  }));

  it('holds the PDF when the edit deletes words of the original, and the release tool completes it', needsChromium(async () => {
    const pdf = join(tmp, 'guide4.pdf'); await makePdf(pdf);
    const lost = join(tmp, 'guide4.html'); writeFileSync(lost, html({ source: false }));
    const sc = (await call('pdf_finalize_edited_html', { file_path: pdf, edited_html_path: lost, confirmed_by: 'Mr. Osei', validate_ua: !!cap.javaAvailable })).structuredContent;
    expect(sc.taggedPdfError).toBe('content_coverage_requires_review');
    expect(sc.files.taggedPdf).toBeUndefined();
    expect(sc.contentCoverage.missingWords.map((w) => w.word).sort()).toEqual(['field', 'notes', 'source']);
    if (!cap.javaAvailable) return; // a held PDF is only releasable once veraPDF has passed it
    expect(sc.files.heldTaggedPdf).toMatch(/guide4-reviewed-tagged-held-for-review\.pdf$/);
    expect(sc.coverageRelease.eligible).toBe(true);
    const released = (await call('pdf_release_held_tagged_pdf', { report_path: sc.files.report, confirmed_by: 'Mr. Osei', coverage_fingerprint: sc.coverageRelease.fingerprint })).structuredContent;
    expect(released.released).toBe(true);
    expect(released.taggedPdf).toMatch(/guide4-reviewed-tagged\.pdf$/);
    expect(existsSync(released.taggedPdf)).toBe(true);
  }));

  // The limit of the whole idea, pinned: a born-digital PDF's text is fixed. An edit that rewords a printed paragraph leaves
  // it unable to link to the page, and the byte checks refuse the PDF rather than ship a tag that reads nothing.
  it('does not deliver a PDF when an edit rewords a printed paragraph, and says the text no longer matches the page', needsChromium(async () => {
    const pdf = join(tmp, 'guide5.pdf'); await makePdf(pdf);
    const shortened = join(tmp, 'guide5.html'); writeFileSync(shortened, html({ evaporation: 'Heat from the sun turns liquid water into vapor.' }));
    const sc = (await call('pdf_finalize_edited_html', { file_path: pdf, edited_html_path: shortened, confirmed_by: 'Mr. Osei', validate_ua: false })).structuredContent;
    expect(sc.files.taggedPdf).toBeUndefined();
    expect(sc.files.heldTaggedPdf).toBeUndefined();
    expect(sc.taggedPdfError).toBe('content_coverage_requires_review'); // the lost words are reported first
    expect(sc.heldTaggedPdfUnavailable).toMatch(/orphaned semantic leaves/);
    expect(sc.coverageRelease.eligible).toBe(false);
  }));
  it('leaves a paragraph the person adds out of the tag tree, and still delivers the PDF', needsChromium(async () => {
    const pdf = join(tmp, 'guide6.pdf'); await makePdf(pdf);
    const added = join(tmp, 'guide6.html'); writeFileSync(added, html({ extra: '<p>Note added by the reviewer for readers new to the topic.</p>' }));
    const sc = (await call('pdf_finalize_edited_html', { file_path: pdf, edited_html_path: added, confirmed_by: 'Mr. Osei', validate_ua: false })).structuredContent;
    expect(sc.taggedPdfError).toBeUndefined();
    expect(sc.contentCoverage).toMatchObject({ status: 'matched', missingTokens: 0 });
    expect(existsSync(sc.files.accessibleHtml) && readFileSync(sc.files.accessibleHtml, 'utf8')).toMatch(/Note added by the reviewer/);
    expect((await roleCounts(sc.files.taggedPdf)).P).toBe(4); // the four printed paragraphs; the added fifth is not tagged
  }));

  it('refuses a scan when no saved page reading is supplied, instead of guessing where its text goes', needsChromium(async () => {
    const pdf = join(tmp, 'blank.pdf'); await makePdf(pdf, { blank: true });
    const h = join(tmp, 'blank.html'); writeFileSync(h, html());
    const r = await request('tools/call', { name: 'pdf_finalize_edited_html', arguments: { file_path: pdf, edited_html_path: h, confirmed_by: 'Mr. Osei', validate_ua: false } }, 280000);
    const text = r.error ? r.error.message : (r.result.isError ? r.result.content[0].text : JSON.stringify(r.result.structuredContent));
    expect(text).toMatch(/finalize_scanned_needs_reading: this PDF is a scan\. .*Pass report_path/);
  }));
});
