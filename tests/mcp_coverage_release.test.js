// (2026-11-05) A coverage hold repeats on every run, so "nothing is lost" needs a way out: the finished PDF waits under a
// held name and pdf_release_held_tagged_pdf releases those exact bytes once a person has checked the listed words.
// The stdio half speaks to the real server; no Chromium, no key.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

vi.setConfig({ testTimeout: 60000, hookTimeout: 60000 });
const require2 = createRequire(import.meta.url);
const MCP_DIR = process.env.ALLO_MCP_DIR || resolve(process.cwd(), 'desktop/mcp'); // a mutated copy, for checking this test
const V = require2(join(MCP_DIR, 'remediation_verification.cjs'));
const P = require2(join(MCP_DIR, 'remediation_narration_plan.cjs'));
const SERVER = join(MCP_DIR, 'alloflow-remediation-mcp-stdio.cjs');
const sha = (b) => createHash('sha256').update(b).digest('hex');
const CODE = 'content_coverage_requires_review';
const passedUa = (b) => ({ standard: 'PDF/UA-1 (ISO 14289-1)', profile: 'ua1', scope: 'x', status: 'passed', compliant: true, validator: 'veraPDF', inputSha256: sha(b), inputBytes: b.length, failedChecks: 0, failedRuleCount: 0, failedRules: [] });

const coverage = (over = {}) => ({
  status: 'review_required', reviewRequired: true, sourceTokens: 1000, matchedTokens: 997, missingTokens: 3, tokenRecall: 0.997,
  missingWords: [{ word: 'Birth-', count: 2 }, { word: '11', count: 1 }], extraction: { pageErrorCount: 0, lowConfidencePageCount: 0, errorPages: [], lowConfidencePages: [] },
  sourceSha256: 'a'.repeat(64), htmlSha256: 'b'.repeat(64), ...over,
});
const held = (over = {}) => ({ sha256: 'c'.repeat(64), bytes: 9, delivery: { ok: true, code: 'verified' }, exportMode: 'original_layout', readingNotes: ['A note.'], pdfUa: passedUa(Buffer.from('%PDF-1.7x')), ...over });
const heldReport = (over = {}) => ({
  taggedPdfError: CODE, contentCoverage: coverage(), heldTaggedPdf: held(), files: { heldTaggedPdf: 'C:/o/doc-tagged-held-for-review.pdf' },
  verdict: { level: 'review', reviewCount: 1, cautionCount: 0 }, verdictReasons: { review: ['Source content coverage requires review'], cautions: [] },
  verificationState: 'complete', ...over,
});

describe('who can release a coverage hold', () => {
  it('eligible: every word is listed and the waiting PDF passed veraPDF', () => {
    const st = V.coverageReleaseStatus(heldReport());
    expect(st).toMatchObject({ eligible: true, code: 'eligible', missingTokens: 3 });
    expect(st.fingerprint).toMatch(/^[a-f0-9]{16}$/);
    expect(st.wordsToConfirm).toEqual([{ word: 'Birth-', count: 2 }, { word: '11', count: 1 }]);
  });
  it.each([
    ['not-held', { taggedPdfError: 'page_range_tagged_pdf_unsupported' }],
    ['no-source-text', { contentCoverage: coverage({ status: 'unavailable' }) }],
    ['unread-pages', { contentCoverage: coverage({ extraction: { pageErrorCount: 1 } }) }],
    ['too-much-missing', { contentCoverage: coverage({ tokenRecall: 0.89 }) }],
    ['words-not-all-listed', { contentCoverage: coverage({ missingTokens: 300 }) }],
    ['no-held-pdf', { heldTaggedPdf: undefined, files: {}, heldTaggedPdfUnavailable: 'distribution_review_required' }],
    ['held-pdf-not-validated', { heldTaggedPdf: held({ pdfUa: { status: 'failed' } }) }],
    ['held-pdf-not-validated', { heldTaggedPdf: held({ pdfUa: { status: 'not-run' } }) }],
  ])('refuses %s', (code, over) => {
    const st = V.coverageReleaseStatus(heldReport(over));
    expect(st.eligible).toBe(false);
    expect(st.code).toBe(code);
    expect(st.message).toBeTruthy();
    expect(st.fingerprint).toBeUndefined();
  });
  it('names the other check that blocked the PDF, so a person is not sent to check words for nothing', () => {
    const st = V.coverageReleaseStatus(heldReport({ heldTaggedPdf: undefined, files: {}, heldTaggedPdfUnavailable: 'distribution_review_required' }));
    expect(st.message).toContain('distribution_review_required');
  });
  it('the code changes when the source, the HTML or the word list changes', () => {
    const base = V.coverageReleaseFingerprint(coverage());
    expect(V.coverageReleaseFingerprint(coverage())).toBe(base);
    expect(V.coverageReleaseFingerprint(coverage({ sourceSha256: 'd'.repeat(64) }))).not.toBe(base);
    expect(V.coverageReleaseFingerprint(coverage({ htmlSha256: 'd'.repeat(64) }))).not.toBe(base);
    expect(V.coverageReleaseFingerprint(coverage({ missingWords: [{ word: 'Birth-', count: 2 }, { word: '12', count: 1 }] }))).not.toBe(base);
    expect(V.coverageReleaseFingerprint(coverage({ extraction: { lowConfidencePages: [4] } }))).not.toBe(base);
  });
  it('coverage lists every different word up to 200, so a person can check them all', () => {
    const words = Array.from({ length: 150 }, (_, i) => 'word' + i);
    const c = P.assessSourceCoverage({ sourceText: 'kept here ' + words.join(' '), outputHtml: '<p>kept here</p>', pages: [{ text: 'x' }], method: 'pdfjs' });
    expect(c.missingWords.length).toBe(150);
    expect(c.missingWords.reduce((n, w) => n + w.count, 0)).toBe(c.missingTokens);
  });
});

describe('what the report says', () => {
  const withStatus = (over) => { const s = heldReport(over); s.coverageRelease = V.coverageReleaseStatus(s); return s; };
  it('held and eligible: says the PDF exists, which file, and how to release it', () => {
    const s = withStatus();
    const out = V.explainDelivery(s);
    expect(out.headline).toMatch(/^A tagged PDF was made but is held until a person checks the words/);
    expect(out.headline).not.toMatch(/No tagged PDF was made/);
    expect(out.items[0].nextStep).toContain('doc-tagged-held-for-review.pdf');
    expect(out.items[0].nextStep).toContain('pdf_release_held_tagged_pdf');
    expect(out.items[0].nextStep).toContain(s.coverageRelease.fingerprint);
    expect(out.items[0].nextStep).not.toContain('share once');
  });
  it('held but not eligible: keeps "no tagged PDF" and says why a confirmation will not help', () => {
    const out = V.explainDelivery(withStatus({ heldTaggedPdf: undefined, files: {}, heldTaggedPdfUnavailable: 'distribution_review_required' }));
    expect(out.headline).toMatch(/^No tagged PDF was made/);
    // (2026-11-07) Plain wording: no PDF exists to hold, so the reader goes to the other check first.
    expect(out.items[0].nextStep).toMatch(/Confirming these words alone will not produce a tagged PDF/);
    expect(out.items[0].meaning).toMatch(/so none was made/);
    expect(out.items[0].nextStep).not.toContain('pdf_release_held_tagged_pdf');
  });
  it('an older report with no release data reads as it did', () => {
    const out = V.explainDelivery({ files: {}, taggedPdfError: CODE, contentCoverage: { missingWords: [{ word: 'rd', count: 1 }] } });
    expect(out.items[0].nextStep).toMatch(/share once a person confirms nothing is lost\.$/);
  });
  it('more words than fit: says how many, and the word list is not passed off as complete', () => {
    const missingWords = Array.from({ length: 30 }, (_, i) => ({ word: 'w' + i, count: 1 }));
    const out = V.explainDelivery({ files: {}, taggedPdfError: CODE, contentCoverage: { missingWords } });
    expect(out.items[0].detail).toMatch(/^30 different words not found in the accessible version; the first 25: /);
  });
});

describe('the released report', () => {
  const release = (over) => V.applyCoverageRelease(heldReport(over), { confirmedBy: 'Ms. Rivera', note: 'Hyphen only.', at: '2026-11-05T15:00:00.000Z', taggedPdfPath: 'C:/o/doc-tagged.pdf' });
  it('drops the hold, keeps a caution naming the person and the words, and is not called ready', () => {
    const r = release();
    expect(r.taggedPdfError).toBeUndefined();
    expect(r.heldTaggedPdf).toBeUndefined();
    expect(r.coverageRelease).toBeUndefined();
    expect(r.files).toEqual({ taggedPdf: 'C:/o/doc-tagged.pdf' });
    expect(r.taggedPdfDelivery).toEqual({ ok: true, code: 'verified' });
    expect(r.taggedPdfReadingNotes).toEqual(['A note.']);
    expect(r.verdict).toEqual({ level: 'caution', reviewCount: 0, cautionCount: 1 });
    expect(r.verdictReasons.review).toEqual([]);
    expect(r.verdictReasons.cautions[0]).toContain('Ms. Rivera');
    expect(r.verdictReasons.cautions[0]).toContain('"Birth-" (x2)');
    expect(r.verdictReasons.cautions[0]).toMatch(/cannot verify/);
    expect(r.pdfUa.status).toBe('passed');
    expect(r.deliveryStatus).toBe('complete-for-tested-scope');
    expect(r.reviewRequired).toBe(false);
    expect(r.contentCoverage).toMatchObject({ status: 'person_confirmed', reviewRequired: false, missingTokens: 3 });
    expect(r.contentCoverage.personConfirmation).toMatchObject({ confirmedBy: 'Ms. Rivera', note: 'Hyphen only.', confirmedAt: '2026-11-05T15:00:00.000Z' });
    expect(r.deliveryExplanation.headline).toContain('on the word of Ms. Rivera');
    expect(r.deliveryExplanation.worthAGlance[0]).toContain('Ms. Rivera');
  });
  it('dates the confirmation by the local day, not the UTC one', () => {
    const at = '2026-11-06T03:18:00.000Z', d = new Date(at);
    const local = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const r = V.applyCoverageRelease(heldReport(), { confirmedBy: 'A B', at, taggedPdfPath: 'x' });
    expect(r.verdictReasons.cautions[0]).toContain('confirmed on ' + local + ' that');
  });
  it('does not settle anything else: another review reason keeps the verdict at review', () => {
    const r = release({ verdict: { level: 'review', reviewCount: 2, cautionCount: 0 }, verdictReasons: { review: ['WCAG verification is review-required; review the engine coverage', 'Source content coverage requires review'], cautions: [] } });
    expect(r.verdict.level).toBe('review');
    expect(r.verdict.reviewCount).toBe(1);
    expect(r.reviewRequired).toBe(true);
  });
  it('does not change the report it was given', () => {
    const input = heldReport();
    V.applyCoverageRelease(input, { confirmedBy: 'A B', at: '2026-11-05T15:00:00.000Z', taggedPdfPath: 'x' });
    expect(input.taggedPdfError).toBe(CODE);
    expect(input.contentCoverage.status).toBe('review_required');
  });
});

describe('the driver keeps the PDF aside only behind every other gate', () => {
  const drv = readFileSync(join(MCP_DIR, 'remediation_headless_driver.cjs'), 'utf8');
  it('the hold no longer stops the build, comes after the active-content gates, and stays the reported reason', () => {
    expect(drv).not.toContain("if(contentCoverage.reviewRequired)throw Error('content_coverage_requires_review')");
    const hold = drv.indexOf('coverageHold = !!contentCoverage.reviewRequired;');
    expect(hold).toBeGreaterThan(drv.indexOf("throw new Error('active_content_requires_review');"));
    expect(hold).toBeLessThan(drv.indexOf("throw new Error('distribution_review_required');"));
    expect(drv).toContain("taggedPdfError = coverageHold ? 'content_coverage_requires_review' : 'scan_corrections_require_review'; taggedPdfDelivery = null; taggedPdfExportMode = null;");
    expect(drv).toContain('taggedPdfB64 = null; taggedPdfReadingNotes = [];');
  });
});

describe('pdf_release_held_tagged_pdf over stdio', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'alloflow-cov-release-'));
  let child, buffer = '', nextId = 1, dirN = 0;
  const pending = new Map();
  const send = (method, params) => new Promise((res, rej) => {
    const id = nextId++;
    pending.set(id, res);
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n', (e) => e && rej(e));
  });
  const call = async (args) => {
    const msg = await send('tools/call', { name: 'pdf_release_held_tagged_pdf', arguments: args });
    return { error: !!(msg.result && msg.result.isError) || !!msg.error, data: msg.result && msg.result.structuredContent, text: msg.result && msg.result.content && msg.result.content[0] && msg.result.content[0].text };
  };
  beforeAll(async () => {
    child = spawn(process.execPath, [SERVER], { stdio: ['pipe', 'pipe', 'ignore'], env: { ...process.env, ALLOFLOW_MCP_ALLOWED_ROOTS: tmp, GEMINI_API_KEY: '' } });
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (c) => {
      buffer += c;
      let i;
      while ((i = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, i); buffer = buffer.slice(i + 1);
        if (!line.trim()) continue;
        const m = JSON.parse(line);
        if (m.id !== undefined && pending.has(m.id)) { const r = pending.get(m.id); pending.delete(m.id); r(m); }
      }
    });
    await send('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  });
  afterAll(() => { try { child.kill(); } catch (_) {} try { rmSync(tmp, { recursive: true, force: true }); } catch (_) {} });

  // A run's real file set: source, HTML, held PDF, report and a manifest that binds them.
  const make = () => {
    const dir = join(tmp, 'run' + (++dirN));
    require2('node:fs').mkdirSync(dir);
    const source = Buffer.from('%PDF-1.7 source'), html = Buffer.from('<p>accessible</p>'), pdf = Buffer.from('%PDF-1.7 held bytes');
    const p = { source: join(dir, 'doc.pdf'), html: join(dir, 'doc-accessible.html'), held: join(dir, 'doc-tagged-held-for-review.pdf'), report: join(dir, 'doc-remediation-report.json'), manifest: join(dir, 'doc-remediation-completion.json') };
    writeFileSync(p.source, source); writeFileSync(p.html, html); writeFileSync(p.held, pdf);
    const report = heldReport({
      input: p.source, files: { accessibleHtml: p.html, heldTaggedPdf: p.held, report: p.report, completionManifest: p.manifest },
      contentCoverage: coverage({ sourceSha256: sha(source), htmlSha256: sha(html) }),
      heldTaggedPdf: held({ sha256: sha(pdf), bytes: pdf.length, pdfUa: passedUa(pdf) }),
    });
    report.coverageRelease = V.coverageReleaseStatus(report);
    const writeReport = (r) => {
      const bytes = Buffer.from(JSON.stringify(r));
      writeFileSync(p.report, bytes);
      writeFileSync(p.manifest, JSON.stringify({
        schema: 1, kind: 'alloflow-remediation-completion', source: { path: p.source, sizeBytes: source.length, sha256: sha(source) },
        compatibility: { optionsSha256: 'e'.repeat(64), engineSha256: 'f'.repeat(64) }, attempt: { jobId: null, attemptId: null, attemptNumber: 0 }, completedAt: '2026-11-05T14:00:00.000Z',
        artifacts: [{ role: 'accessibleHtml', relativePath: 'doc-accessible.html', sizeBytes: html.length, sha256: sha(html) }, { role: 'report', relativePath: 'doc-remediation-report.json', sizeBytes: bytes.length, sha256: sha(bytes) }],
      }));
    };
    writeReport(report);
    return { p, report, pdf, writeReport, args: { report_path: p.report, confirmed_by: 'Ms. Rivera', coverage_fingerprint: report.coverageRelease.fingerprint } };
  };

  it('releases the exact bytes, moves the name, and leaves a report and manifest that still bind', async () => {
    const m = make();
    const { data } = await call({ ...m.args, note: 'Only a hyphen.' });
    expect(data).toMatchObject({ released: true, alreadyReleased: false, confirmedBy: 'Ms. Rivera', deliveryStatus: 'complete-for-tested-scope' });
    expect(data.verdict.level).toBe('caution');
    expect(readFileSync(data.taggedPdf).equals(m.pdf)).toBe(true);
    expect(data.taggedPdf).toMatch(/doc-tagged\.pdf$/);
    expect(existsSync(m.p.held)).toBe(false);
    const saved = JSON.parse(readFileSync(m.p.report, 'utf8'));
    expect(saved.files.taggedPdf).toBe(data.taggedPdf);
    expect(saved.taggedPdfError).toBeUndefined();
    expect(saved.contentCoverage.personConfirmation.note).toBe('Only a hyphen.');
    const manifest = JSON.parse(readFileSync(m.p.manifest, 'utf8'));
    expect(manifest.compatibility.engineSha256).toBe('f'.repeat(64));
    const roles = Object.fromEntries(manifest.artifacts.map((a) => [a.role, a]));
    expect(roles.report.sha256).toBe(sha(readFileSync(m.p.report)));
    expect(roles.taggedPdf.sha256).toBe(sha(m.pdf));
    const again = await call(m.args);
    expect(again.data).toMatchObject({ released: true, alreadyReleased: true, taggedPdf: data.taggedPdf, confirmedBy: 'Ms. Rivera' });
  });
  it('refuses a code from another word list, and changes nothing', async () => {
    const m = make();
    const before = readFileSync(m.p.report);
    const { data } = await call({ ...m.args, coverage_fingerprint: '0123456789abcdef' });
    expect(data).toMatchObject({ released: false, code: 'fingerprint-mismatch' });
    expect(readFileSync(m.p.report).equals(before)).toBe(true);
    expect(existsSync(m.p.held)).toBe(true);
    expect(existsSync(join(m.p.source, '..', 'doc-tagged.pdf'))).toBe(false);
  });
  it('refuses when the held PDF changed', async () => {
    const m = make();
    writeFileSync(m.p.held, '%PDF-1.7 different');
    expect((await call(m.args)).data).toMatchObject({ released: false, code: 'files-changed' });
    expect(existsSync(join(m.p.source, '..', 'doc-tagged.pdf'))).toBe(false);
  });
  it('refuses when the HTML changed after the words were listed', async () => {
    const m = make();
    writeFileSync(m.p.html, '<p>edited</p>');
    expect((await call(m.args)).data).toMatchObject({ released: false, code: 'files-changed' });
  });
  it('refuses when the original changed', async () => {
    const m = make();
    writeFileSync(m.p.source, '%PDF-1.7 other doc');
    expect((await call(m.args)).data).toMatchObject({ released: false, code: 'files-changed' });
  });
  it('refuses a report edited by hand, even with a matching new code', async () => {
    const m = make();
    const edited = JSON.parse(readFileSync(m.p.report, 'utf8'));
    edited.contentCoverage.missingWords = [{ word: 'other', count: 3 }];
    writeFileSync(m.p.report, JSON.stringify(edited));
    const code = V.coverageReleaseStatus(edited).fingerprint;
    expect((await call({ ...m.args, coverage_fingerprint: code })).data).toMatchObject({ released: false, code: 'files-changed' });
  });
  it('refuses a hold a person cannot settle', async () => {
    const m = make();
    const r = { ...m.report, contentCoverage: { ...m.report.contentCoverage, tokenRecall: 0.5 } };
    m.writeReport(r);
    expect((await call(m.args)).data).toMatchObject({ released: false, code: 'too-much-missing' });
  });
  it('needs a person named and a report path', async () => {
    const m = make();
    expect((await call({ ...m.args, confirmed_by: ' ' })).error).toBe(true);
    expect((await call({ ...m.args, report_path: 'doc-remediation-report.json' })).error).toBe(true);
    expect((await call({ ...m.args, report_path: m.p.html })).error).toBe(true);
    expect(existsSync(m.p.held)).toBe(true);
  });
  it('does not reach outside the allowed folders', async () => {
    const m = make();
    const outside = join(tmpdir(), 'not-allowed-remediation-report.json');
    expect((await call({ ...m.args, report_path: outside })).error).toBe(true);
    expect(existsSync(m.p.held)).toBe(true);
  });
});
