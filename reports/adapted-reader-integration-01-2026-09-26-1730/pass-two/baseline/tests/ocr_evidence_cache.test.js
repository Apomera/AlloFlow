import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

const makeCache = () => {
  const start = source.indexOf("  const _OCR_EVIDENCE_VERSION = '");
  const end = source.indexOf('  const _auditCacheKey = async', start);
  if (start < 0 || end < 0) throw new Error('OCR evidence cache helpers not found');
  const fakeWindow = {};
  return new Function('window', source.slice(start, end) + [
    'return {',
    '  identity: _ocrEvidenceIdentity,',
    '  key: _ocrEvidenceKey,',
    '  read: _readOcrEvidence,',
    '  write: _writeOcrEvidence,',
    '  restore: _restoreOcrEvidenceGlobals,',
    '  stats: () => ({ entries: _ocrEvidenceCache.size, bytes: _ocrEvidenceCacheBytes }),',
    '  window,',
    '};',
  ].join('\n'))(fakeWindow);
};

const completeEvidence = (pageNums = [1, 2], suffix = '') => ({
  extractedText: ('Complete reconciled OCR evidence ' + suffix + ' ').repeat(8),
  groundTruthCharCount: 240,
  groundTruthPages: pageNums.map(pageNum => ({ pageNum, text: 'page ' + pageNum, words: [{ text: 'word' }] })),
  groundTruthMethod: 'vision-ocr',
  ocrTesseractText: 'tesseract ' + suffix,
  ocrVisionText: 'vision ' + suffix,
  ocrDisagreements: [],
  ocrMethod: 'tesseract+vision',
  ocrPageErrors: [],
  ocrLowConfidencePages: [],
});

describe('session-local exact-byte OCR evidence cache', () => {
  let cache;
  beforeEach(() => { cache = makeCache(); });

  it('reuses only an exact document/range/language/backend/page-count identity', () => {
    const identity = cache.identity({
      documentDigest: 'sha256:abc',
      pageRange: [5, 6],
      ocrLanguage: 'EN',
      backendId: 'gemini:model-a',
      effectivePageCount: 2,
    });
    expect(cache.write(identity, completeEvidence([5, 6]))).toBe(true);
    expect(cache.read(identity)?.extractedText).toContain('Complete reconciled OCR evidence');
    const variants = [
      { ...identity, documentDigest: 'sha256:different' },
      { ...identity, pageRangeKey: '6-7' },
      { ...identity, ocrLanguage: 'es' },
      { ...identity, backendId: 'gemini:model-b' },
      { ...identity, effectivePageCount: 3 },
      { ...identity, version: 'future-version' },
    ];
    variants.forEach(variant => expect(cache.read(variant)).toBeNull());
  });

  it('stores immutable serialized evidence and restores the full OCR/fidelity context', () => {
    const identity = cache.identity({
      documentDigest: 'sha256:clone',
      pageRange: null,
      ocrLanguage: 'auto',
      backendId: 'gemini:default',
      effectivePageCount: 2,
    });
    const evidence = completeEvidence();
    expect(cache.write(identity, evidence)).toBe(true);
    evidence.groundTruthPages[0].text = 'mutated after write';
    const first = cache.read(identity);
    expect(first.groundTruthPages[0].text).toBe('page 1');
    first.groundTruthPages[0].text = 'mutated after read';
    const second = cache.read(identity);
    expect(second.groundTruthPages[0].text).toBe('page 1');
    cache.restore(second);
    expect(cache.window.__lastOcrMethod).toBe('tesseract+vision');
    expect(cache.window.__lastGroundTruthPageMap).toEqual(second.groundTruthPages);
    expect(cache.window.__lastOcrTesseractText).toBe('tesseract ');
    expect(cache.window.__lastOcrVisionText).toBe('vision ');
  });

  it('refuses incomplete, failed, non-OCR, or too-short evidence', () => {
    const identity = cache.identity({
      documentDigest: 'sha256:strict',
      pageRange: [3, 4],
      ocrLanguage: 'auto',
      backendId: 'gemini:default',
      effectivePageCount: 2,
    });
    expect(cache.write(identity, completeEvidence([3]))).toBe(false);
    expect(cache.write(identity, { ...completeEvidence([3, 4]), ocrPageErrors: [{ pageNum: 4, error: 'failed' }] })).toBe(false);
    expect(cache.write(identity, { ...completeEvidence([3, 4]), ocrMethod: null })).toBe(false);
    expect(cache.write(identity, { ...completeEvidence([3, 4]), extractedText: 'too short' })).toBe(false);
    expect(cache.stats().entries).toBe(0);
  });

  it('is bounded to four LRU entries', () => {
    const makeIdentity = n => cache.identity({
      documentDigest: 'sha256:' + n,
      pageRange: null,
      ocrLanguage: 'auto',
      backendId: 'gemini:default',
      effectivePageCount: 1,
    });
    const ids = [1, 2, 3, 4].map(makeIdentity);
    ids.forEach((identity, idx) => expect(cache.write(identity, completeEvidence([1], String(idx + 1)))).toBe(true));
    expect(cache.stats().entries).toBe(4);
    expect(cache.read(ids[0])).not.toBeNull();
    const fifth = makeIdentity(5);
    expect(cache.write(fifth, completeEvidence([1], '5'))).toBe(true);
    expect(cache.read(ids[1])).toBeNull();
    expect(cache.read(ids[0])).not.toBeNull();
    expect(cache.stats().entries).toBe(4);
  });
});

describe('OCR evidence cache integration ordering and bypasses', () => {
  it('consults the cache only after deterministic extraction proves the PDF is scanned', () => {
    const deterministic = source.indexOf('const _extOut = await _runExtractionPhase');
    const cacheRead = source.indexOf('const _bankedOcr = _readOcrEvidence', deterministic);
    const scannedBranch = source.indexOf('// Scanned-PDF path: run Tesseract and Vision in parallel', cacheRead);
    expect(deterministic).toBeGreaterThan(-1);
    expect(cacheRead).toBeGreaterThan(deterministic);
    expect(scannedBranch).toBeGreaterThan(cacheRead);
  });

  it('manual full- and per-page re-OCR bypass cache reads', () => {
    const at = source.indexOf('const _bankedOcr = _readOcrEvidence');
    const guard = source.slice(at - 350, at);
    expect(guard).toContain('!_forceFullOcr');
    expect(guard).toContain('!(_forceOcrPages && _forceOcrPages.length)');
  });

  it('banks complete evidence before image descriptions and all later AI stages', () => {
    const write = source.indexOf('const _banked = _writeOcrEvidence');
    const images = source.indexOf('const _imgOut = await _extractPdfImages', write);
    expect(write).toBeGreaterThan(-1);
    expect(images).toBeGreaterThan(write);
  });

  it('ships bounded, session-only cache semantics in source', () => {
    expect(source).toContain('const _OCR_EVIDENCE_MAX_ENTRIES = 4');
    expect(source).toContain('const _OCR_EVIDENCE_MAX_BYTES = 32 * 1024 * 1024');
    expect(source).toContain('deliberately NOT persistent');
  });
});
