import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

function loadCacheManager() {
  const start = anti.indexOf('const ALLO_PDF_REMEDIATION_CACHE = (() => {');
  const end = anti.indexOf('\nconst ALLO_EVALUATION_PORTAL_URL_KEY', start);
  if (start < 0 || end < 0) throw new Error('PDF remediation cache helper block not found');
  return new Function(anti.slice(start, end) + '\nreturn ALLO_PDF_REMEDIATION_CACHE;')();
}

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial).map(([key, value]) => [key, String(value)]));
  return {
    get length() { return values.size; },
    key(index) { return Array.from(values.keys())[index] ?? null; },
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    has(key) { return values.has(key); },
  };
}

const cache = loadCacheManager();
const remediationPayload = ({ name, savedAt, beforeScore, afterScore, pageCount = 1, sourceText = 'private source text', auditResult = null }) => JSON.stringify({
  documentName: name,
  savedAt,
  pdfFixResult: { sourceText, finalText: sourceText + ' remediated', beforeScore, afterScore, pageCount },
  ...(auditResult ? { auditResult } : {})
});

describe('PDF remediation device-cache ownership', () => {
  it('dismisses only the latest exact result and automatically reveals a newer one', () => {
    const first = cache.ENTRY_PREFIX + 'first.pdf__100__abc';
    const second = cache.ENTRY_PREFIX + 'second.pdf__200__def';
    const storage = createStorage({ [first]: '{"result":1}', [cache.LATEST_KEY]: first });

    expect(cache.isLatestDismissed(storage)).toBe(false);
    expect(cache.dismissLatest(storage)).toBe(true);
    expect(cache.dismissedStorageKey(storage)).toBe(first);
    expect(cache.isLatestDismissed(storage)).toBe(true);

    storage.setItem(second, '{"result":2}');
    storage.setItem(cache.LATEST_KEY, second);
    expect(cache.isLatestDismissed(storage)).toBe(false);

    cache.clearDismissal(storage);
    expect(storage.getItem(cache.DISMISSED_KEY)).toBeNull();
  });

  it('deletes every remediation cache generation but preserves unrelated local data', () => {
    const first = cache.ENTRY_PREFIX + 'first.pdf__100__abc';
    const second = cache.ENTRY_PREFIX + 'second.pdf__200__def';
    const storage = createStorage({
      [first]: '{"result":1}',
      [second]: '{"result":2}',
      [cache.LATEST_KEY]: second,
      [cache.LEGACY_KEY]: '{"legacy":true}',
      [cache.DISMISSED_KEY]: second,
      allo_preferences: '{"contrast":"high"}',
      other_app_cache: 'leave me alone',
    });

    expect(cache.clear(storage)).toBe(2);
    expect(storage.has(first)).toBe(false);
    expect(storage.has(second)).toBe(false);
    expect(storage.has(cache.LATEST_KEY)).toBe(false);
    expect(storage.has(cache.LEGACY_KEY)).toBe(false);
    expect(storage.has(cache.DISMISSED_KEY)).toBe(false);
    expect(storage.getItem('allo_preferences')).toBe('{"contrast":"high"}');
    expect(storage.getItem('other_app_cache')).toBe('leave me alone');
  });

  it('lists all valid generations newest-first without exposing document content', () => {
    const first = cache.ENTRY_PREFIX + 'first.pdf__100__abc';
    const second = cache.ENTRY_PREFIX + 'second.pdf__200__def';
    const storage = createStorage({
      [first]: remediationPayload({ name: 'First lesson.pdf', savedAt: '2026-08-20T12:00:00.000Z', beforeScore: 61, afterScore: 92, sourceText: 'first private passage' }),
      [second]: remediationPayload({
        name: 'Second lesson.pdf', savedAt: '2026-08-21T12:00:00.000Z', beforeScore: 72, afterScore: 97,
        pageCount: 4, sourceText: 'second private passage',
        auditResult: { score: 72, summary: 'Full saved audit context', scores: [{ key: 'structure', score: 70 }] }
      }),
      [cache.LATEST_KEY]: second,
    });

    const summaries = cache.listSummaries(storage);
    expect(summaries.map(entry => entry.documentName)).toEqual(['Second lesson.pdf', 'First lesson.pdf']);
    expect(summaries[0]).toMatchObject({ storageKey: second, beforeScore: 72, afterScore: 97, pageCount: 4 });
    expect(JSON.stringify(summaries)).not.toContain('private passage');
    expect(summaries[0]).not.toHaveProperty('pdfFixResult');
    expect(summaries[0]).not.toHaveProperty('auditResult');
    expect(cache.readEntry(storage, first)?.pdfFixResult.sourceText).toBe('first private passage');
    expect(cache.readEntry(storage, second)?.auditResult).toMatchObject({ score: 72, summary: 'Full saved audit context' });
  });

  it('deletes one selected generation and promotes the newest remaining entry', () => {
    const first = cache.ENTRY_PREFIX + 'first.pdf__100__abc';
    const second = cache.ENTRY_PREFIX + 'second.pdf__200__def';
    const storage = createStorage({
      [first]: remediationPayload({ name: 'First.pdf', savedAt: '2026-08-20T12:00:00.000Z', beforeScore: 60, afterScore: 90 }),
      [second]: remediationPayload({ name: 'Second.pdf', savedAt: '2026-08-21T12:00:00.000Z', beforeScore: 70, afterScore: 95 }),
      [cache.LATEST_KEY]: second,
      [cache.DISMISSED_KEY]: second,
      allo_preferences: '{"contrast":"high"}',
    });

    expect(cache.remove(storage, second)).toBe(true);
    expect(storage.getItem(second)).toBeNull();
    expect(storage.getItem(cache.LATEST_KEY)).toBe(first);
    expect(storage.getItem(cache.DISMISSED_KEY)).toBeNull();
    expect(cache.listSummaries(storage).map(entry => entry.storageKey)).toEqual([first]);
    expect(storage.getItem('allo_preferences')).toBe('{"contrast":"high"}');
    expect(cache.remove(storage, 'allo_preferences')).toBe(false);
  });

  it('will not follow a corrupted latest pointer into an unrelated AlloFlow key', () => {
    const storage = createStorage({
      [cache.LATEST_KEY]: 'allo_preferences',
      allo_preferences: '{"contrast":"high"}',
    });

    expect(cache.latestStorageKey(storage)).toBe('');
    expect(cache.dismissLatest(storage)).toBe(false);
    expect(storage.getItem(cache.DISMISSED_KEY)).toBeNull();
  });
});
