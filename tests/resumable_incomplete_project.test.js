// Resumable incomplete project (2026-06-20). When a hard AI failure (auth/quota/network)
// hits AFTER extraction, the pipeline must NOT scrap the expensive OCR/text-layer work —
// it banks {extractedText, base64, auditResult, failureReason} so the host saves a
// version-2 .alloflow.json the existing "Continue a previous session" loader resumes.
// This pins: the failure classifier, the success-only→incomplete-aware save/load round
// trip, the "worth resuming" gate, and (anti-drift) that all three modules ship the wiring.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pipeSrc = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const hostSrc = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const viewSrc = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

// ── Mirror of the module catch's failure classifier (kept in sync via anti-drift) ──
const classifyFailure = (msg) => {
  const m = String(msg || '');
  return /401|api[ _-]?key|unauthor|permission[ _-]?denied|forbidden/i.test(m) ? 'auth'
    : /429|quota|rate[ _-]?limit|resource[ _-]?exhausted/i.test(m) ? 'quota'
    : /network|fetch|timeout|getaddr|ENOTFOUND|failed to fetch|offline/i.test(m) ? 'network'
    : 'other';
};
// ── Mirror of the "worth resuming" gate (module catch) ──
const worthResuming = (text, silent) => !silent && typeof text === 'string' && text.trim().length >= 50;
// ── Mirror of saveProjectToFile's incomplete-serialize branch (host) ──
const serializeIncomplete = (override) => ({
  version: 2,
  incomplete: true,
  fileName: override.fileName || 'document.pdf',
  extractedText: override.extractedText || '',
  pdfBase64: override.base64 || null,
  failureReason: override.failureReason || 'other',
  auditResult: override.auditResult || null,
  pageCount: (override.auditResult && override.auditResult.pageCount) || null,
});
// ── Mirror of the PDF view loader's acceptance guard ──
const loaderAccepts = (p) => !!(p && p.version && (p.accessibleHtml || p.incomplete));

describe('failure classifier → reason bucket', () => {
  it('401 / API key / permission → auth', () => {
    expect(classifyFailure('Request failed: 401 Unauthorized')).toBe('auth');
    expect(classifyFailure('API key not valid. Please pass a valid API key.')).toBe('auth');
    expect(classifyFailure('PERMISSION_DENIED')).toBe('auth');
  });
  it('429 / quota / resource exhausted → quota', () => {
    expect(classifyFailure('HTTP 429: rate limit exceeded')).toBe('quota');
    expect(classifyFailure('RESOURCE_EXHAUSTED: quota')).toBe('quota');
  });
  it('fetch / network / timeout → network', () => {
    expect(classifyFailure('Failed to fetch')).toBe('network');
    expect(classifyFailure('network timeout after 30s')).toBe('network');
  });
  it('everything else → other', () => {
    expect(classifyFailure('HTML generation failed')).toBe('other');
    expect(classifyFailure('')).toBe('other');
  });
});

describe('"worth resuming" gate (only bank real, non-batch extractions)', () => {
  it('banks a substantial single-file extraction', () => {
    expect(worthResuming('x'.repeat(200), false)).toBe(true);
  });
  it('does NOT bank a trivial/empty extraction (nothing to resume)', () => {
    expect(worthResuming('too short', false)).toBe(false);
    expect(worthResuming('', false)).toBe(false);
    expect(worthResuming(null, false)).toBe(false);
  });
  it('does NOT bank in silent/batch mode (batch owns its own handling)', () => {
    expect(worthResuming('x'.repeat(200), true)).toBe(false);
  });
});

describe('save → load round trip (incomplete projects are first-class)', () => {
  const payload = { extractedText: 'A'.repeat(500), base64: 'JVBERi0xLjc=', fileName: 'IEP_scan.pdf', failureReason: 'auth', auditResult: { pageCount: 7 } };
  const project = serializeIncomplete(payload);

  it('serializes the resume-critical fields (extraction + bytes + reason)', () => {
    expect(project.version).toBe(2);
    expect(project.incomplete).toBe(true);
    expect(project.extractedText).toBe(payload.extractedText);
    expect(project.pdfBase64).toBe(payload.base64);
    expect(project.failureReason).toBe('auth');
    expect(project.pageCount).toBe(7); // pulled from the carried auditResult
  });
  it('the (relaxed) PDF-view loader ACCEPTS the incomplete project', () => {
    expect(loaderAccepts(project)).toBe(true);
  });
  it('still accepts a v1 COMPLETED project (back-compat preserved)', () => {
    expect(loaderAccepts({ version: 1, accessibleHtml: '<html></html>' })).toBe(true);
  });
  it('still REJECTS junk (no version, or version with neither html nor incomplete)', () => {
    expect(loaderAccepts({})).toBe(false);
    expect(loaderAccepts({ version: 2 })).toBe(false); // version but nothing to restore
    expect(loaderAccepts({ accessibleHtml: '<html>' })).toBe(false); // html but no version
  });
});

describe('anti-drift: all three modules ship the wiring', () => {
  it('pipeline banks window.__lastIncompleteProject with the extraction + bytes', () => {
    expect(pipeSrc).toMatch(/window\.__lastIncompleteProject = \{/);
    expect(pipeSrc).toMatch(/extractedText: extractedText/);
    expect(pipeSrc).toMatch(/base64: _base64 \|\| null/);
    expect(pipeSrc).toMatch(/extractedText\.trim\(\)\.length >= 50/); // the worth-resuming gate
  });
  it('pipeline classifier keeps the auth/quota/network buckets', () => {
    expect(pipeSrc).toMatch(/permission\[ _-\]\?denied\|forbidden/);
    expect(pipeSrc).toMatch(/resource\[ _-\]\?exhausted/);
  });
  it('host saveProjectToFile has the incomplete branch (version 2, bytes, text)', () => {
    expect(hostSrc).toMatch(/_override && _override\.incomplete/);
    expect(hostSrc).toMatch(/version: 2/);
    expect(hostSrc).toMatch(/pdfBase64: _override\.base64/);
    expect(hostSrc).toMatch(/extractedText: _override\.extractedText/);
  });
  it('host wrapper defines + calls the recovery-save helper on failure', () => {
    expect(hostSrc).toMatch(/const _maybeSaveIncompleteProject = \(\) =>/);
    const calls = (hostSrc.match(/_maybeSaveIncompleteProject\(\);/g) || []).length;
    expect(calls).toBeGreaterThanOrEqual(2); // success path + catch path
  });
  it('PDF view loader relaxes the guard + restores the resume seeds', () => {
    expect(viewSrc).toMatch(/!project\.accessibleHtml && !project\.incomplete/);
    expect(viewSrc).toMatch(/if \(project\.incomplete\) \{/);
    expect(viewSrc).toMatch(/setInputText\(project\.extractedText\)/);
    expect(viewSrc).toMatch(/setPendingPdfBase64\(project\.pdfBase64 \|\| null\)/);
    expect(viewSrc).toMatch(/_projectDocumentEpoch = startNewPdfAudit\(\)/);
  });
});

// ── Mirror of the Step-1 OCR-skip seed gate (doc_pipeline) ──
// Returns the text the pipeline would feed downstream given the deterministic-extraction
// result + a parked resume seed. Born-digital (text already >100) ALWAYS wins; the seed
describe('host remediation project restore hardening', () => {
  it('host generic project loading accepts unfinished v2 files without inventing a score', () => {
    expect(hostSrc).toContain("!_savedProject.version || (!_savedProject.accessibleHtml && !_savedProject.incomplete)");
    expect(hostSrc).toContain('if (project.incomplete) {');
    expect(hostSrc).toContain('documentDigest: _resumeDigest');
    expect(hostSrc).toContain('documentDigest: project.auditResult.documentDigest || _resumeDigest');
    expect(hostSrc).toContain('documentDigest: _resumeDigest, score: null');
    expect(hostSrc).toContain('pendingPdfFile && pendingPdfFile.documentDigest');
  });

  it('restores canonical verification evidence and starts FileReader safely', () => {
    expect(hostSrc).toContain('const _loadedVerificationCoverage = _derivedProjectVerification.coverage || _derivedProjectVerification.verificationCoverage || project.verificationCoverage || null;');
    expect(hostSrc).toContain("const _loadedVerificationState = _derivedProjectVerification.verificationState || 'partial';");
    expect(hostSrc).toContain('const _loadedAfterScoreVerified = _derivedProjectVerification.afterScoreVerified === true');
    expect(hostSrc).toContain('size: Number(project.fileSize) || Number(project.multiSession && project.multiSession.fileSize) || 0');
    expect(hostSrc).toContain('documentDigest: project.documentDigest || project.docKey || null');
    expect(hostSrc).toMatch(/try \{\s*reader\.readAsText\(file\);\s*\} catch \(readError\)/);
});

  it('preserves the live HTML-binding proof after canonical view normalization', () => {
    const proofCopies = viewSrc.match(/_viewAttachRuntimeBindingProof\(_normalizedLoadedFixResult, project\.accessibleHtml/g) || [];
    expect(proofCopies).toHaveLength(2);
    expect(viewSrc.match(/setPdfFixResult\(_normalizedLoadedFixResult\);/g) || []).toHaveLength(2);
  });
  });
// only fills the scanned/empty case, and only on an exact filename match with real text.
const textAfterSeed = (extracted, seed, fileName) => {
  let text = extracted || '';
  if ((!text || text.length <= 100) && seed && seed.fileName === fileName
      && typeof seed.text === 'string' && seed.text.trim().length >= 50) {
    text = seed.text;
  }
  return text;
};

describe('OCR-skip on resume — reuse cached text only when it actually saves re-OCR', () => {
  const seed = { fileName: 'scan.pdf', text: 'OCR'.repeat(50) }; // 150 chars

  it('SCANNED (deterministic empty) + matching seed → reuses cached text (skips OCR)', () => {
    expect(textAfterSeed('', seed, 'scan.pdf')).toBe(seed.text);
  });
  it('BORN-DIGITAL (fresh text-layer >100) → ignores the seed (fresh extraction is truth)', () => {
    const fresh = 'D'.repeat(500);
    expect(textAfterSeed(fresh, seed, 'scan.pdf')).toBe(fresh);
  });
  it('filename mismatch → seed ignored, falls through to OCR (no cross-file reuse)', () => {
    expect(textAfterSeed('', seed, 'a-different.pdf')).toBe('');
  });
  it('too-short seed (<50 chars) → ignored', () => {
    expect(textAfterSeed('', { fileName: 'scan.pdf', text: 'tiny' }, 'scan.pdf')).toBe('');
  });
  it('no seed present → unchanged (normal path)', () => {
    expect(textAfterSeed('', null, 'scan.pdf')).toBe('');
  });
});

describe('anti-drift: the OCR-skip seed is wired end-to-end', () => {
  it('pipeline consumes window.__resumeExtractedText with the filename + length guards', () => {
    expect(pipeSrc).toMatch(/const _seed = window\.__resumeExtractedText/);
    expect(pipeSrc).toMatch(/_seed\.fileName === _fileName/);
    expect(pipeSrc).toMatch(/_seed\.text\.trim\(\)\.length >= 50/);
    expect(pipeSrc).toMatch(/window\.__resumeExtractedText = null/); // single-use consume
  });
  it('pipeline only reuses when deterministic extraction came up empty (scanned case)', () => {
    expect(pipeSrc).toMatch(/!extractedText \|\| extractedText\.length <= 100/);
  });
  it('the loader parks the seed under the same filename it sets on pendingPdfFile', () => {
    // Harness repair (2026-07-09): H2 (deep dive 2026-07-02) added docKey to the seed so a
    // re-uploaded DIFFERENT file with the same name refuses it (fingerprint mismatch).
    expect(viewSrc).toMatch(/window\.__resumeExtractedText = \{ fileName: project\.fileName \|\| 'resumed-project\.pdf', text: project\.extractedText, docKey: project\.docKey \|\| null \}/);
  });
});
