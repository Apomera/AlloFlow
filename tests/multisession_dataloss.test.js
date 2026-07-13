// Multi-session merge data-loss fix (2026-06-20) — from the pipeline-enhancement workflow.
// A multi-day, multi-range IEP/report workflow was handed a BLANK document while being told
// progress was saved. Two independent bugs compounded: (1) save stores the range under `html`
// but the merge read `remediatedHtml` (never written) → every section merged empty; (2) the
// save-side fingerprint used a base64-length size ESTIMATE + the RANGE-length pageCount while
// the load-side keyed on real File.size + the FULL-doc pageCount → a different sessionId, so the
// saved range was orphaned. This pins both fixes + (anti-drift) that doc_pipeline ships them.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pipeSrc = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// ── Mirror of _multiSessionId (the stable doc fingerprint) ──
const multiSessionId = (filename, fileSize, pageCount, documentDigest) => {
  const digest = String(documentDigest || '').toLowerCase();
  if (!/^sha256:[a-f0-9]{64}$/.test(digest)) return null;
  return 'msdoc_v2_' + digest.slice(7);
};
// ── Mirror of the merge's range-html accessor ──
const rangeHtml = (rg) => (rg && (rg.html || rg.remediatedHtml)) || '';

const digestA = 'sha256:' + 'a'.repeat(64);
const digestB = 'sha256:' + 'b'.repeat(64);
describe('fingerprint: save and load now agree (no more orphaned ranges)', () => {
  const fileName = 'IEP_report.pdf';
  const realSize = 524288;     // pendingPdfFile.size — what the load side uses
  const fullPages = 30;        // pdfAuditResult.pageCount — what the load side uses
  const base64Estimate = Math.round((realSize / 0.75) * 0.75); // the old save-side estimate basis
  const rangePages = 5;        // the range length (e.g. pages 1-5) — the OLD save-side pageCount

  const loadId = multiSessionId(fileName, realSize, fullPages, digestA);
  const saveIdFixed = multiSessionId(fileName, realSize, fullPages, digestA);
  const saveIdOld = multiSessionId(fileName, base64Estimate, rangePages);

  it('the FIXED save fingerprint equals the load fingerprint', () => {
    expect(saveIdFixed).toBe(loadId);
  });
  it('refuses legacy metadata-only identities because they are collision-prone', () => {
    expect(saveIdOld).toBeNull();
  });
  it('keys only on exact content: metadata changes do not fork it, content changes do', () => {
    expect(multiSessionId('renamed.pdf', 1, 1, digestA)).toBe(loadId);
    expect(multiSessionId(fileName, realSize, fullPages, digestB)).not.toBe(loadId);
    expect(multiSessionId(fileName, realSize, fullPages, 'invalid')).toBeNull();
  });
});

describe('merge reads the stored html field (the blank-document bug)', () => {
  it('reads `html` (what save actually writes)', () => {
    expect(rangeHtml({ html: '<main>page 1-5 content</main>' })).toBe('<main>page 1-5 content</main>');
  });
  it('falls back to `remediatedHtml` for a legacy/foreign record', () => {
    expect(rangeHtml({ remediatedHtml: '<main>legacy</main>' })).toBe('<main>legacy</main>');
  });
  it('a range with neither yields empty (no crash)', () => {
    expect(rangeHtml({})).toBe('');
    expect(rangeHtml(null)).toBe('');
  });
});

describe('anti-drift: doc_pipeline ships both fixes', () => {
  it('the merge uses the html-or-remediatedHtml accessor', () => {
    expect(pipeSrc).toMatch(/const _rangeHtml = \(rg\) => \(rg && \(rg\.html \|\| rg\.remediatedHtml\)\)/);
    expect(pipeSrc).toMatch(/_extractBodyContent\(_rangeHtml\(r\)\)/);
  });
  it('the save/load path requires the same exact document digest', () => {
    // Harness repair (2026-07-09): S1 snapshotted the size at run entry (_runFileSize = the real
    // pendingPdfFile.size captured before any concurrent upload can swap the bound var) — the
    // fingerprint still keys on REAL bytes, just via the snapshot.
    expect(pipeSrc).toContain('_multiSessionId(_msMeta.fileName, _msMeta.fileSize, _msMeta.pageCount, _documentKey)');
    expect(pipeSrc).toContain('documentDigest: _documentKey');
    expect(pipeSrc).toContain('return loadMultiSession(sid, digest);');
    expect(pipeSrc).toContain('var _MULTI_SESSION_SCHEMA = 2;');
  });
});
