import { describe, it, expect, vi } from 'vitest';
import { reconcile, resolveChunk, makeVisionExtraction } from './lib/ocr_source_runtime.js';

describe('OCR physical-page identity and source agreement', () => {
  it('retains a second page recovered only by Tesseract in canonical source text', () => {
    const rec = reconcile([{ pageNum: 1, text: 'First page.' }, { pageNum: 2, text: 'Complete experiment B on the second page.' }],
      [{ pageNum: 1, text: 'First page with more detailed instructions.' }]);
    expect(rec.fullText).toContain('Complete experiment B');
    expect(rec.pages.map(p => p.pageNum)).toEqual([1, 2]);
  });

  it('retries ambiguous uneven pages instead of inventing boundaries and duplicating prose', async () => {
    const first = 'First page contains instructions to observe sunlight. '.repeat(12);
    const second = 'Submit the worksheet.';
    const retry = vi.fn(async pageNum => pageNum === 6 ? first : second);
    const resolved = await resolveChunk(first + '\n' + second, 6, 2, retry);
    expect(retry.mock.calls).toEqual([[6], [7]]);
    expect(resolved.pages.map(p => p.pageNum)).toEqual([6, 7]);
    expect(resolved.pages.every(p => p.boundarySource === 'physical-page-retry')).toBe(true);
    const rec = reconcile([{ pageNum: 6, text: first }, { pageNum: 7, text: second }], resolved.pages);
    expect(rec.fullText).toBe(first + '\n\n' + second);
    expect(rec.disagreements).toEqual([]);
  });

  it('uses valid page markers without spending a retry and keeps absolute page numbers', async () => {
    const retry = vi.fn();
    const resolved = await resolveChunk('Page six\r\n[[PAGE BREAK]]\r\nPage seven', 6, 2, retry);
    expect(retry).not.toHaveBeenCalled();
    expect(resolved.pages.map(p => [p.pageNum, p.text])).toEqual([[6, 'Page six'], [7, 'Page seven']]);
    expect(resolved.pageErrors).toEqual([]);
  });

  it('keeps unresolved text separate when per-page retry fails', async () => {
    const original = 'Both pages merged without any boundary.';
    const result = await resolveChunk(original, 1, 2, async () => { throw new Error('Network failed'); });
    expect(result.fullText).toBe('');
    expect(result.unsegmentedText).toBe(original);
    expect(result.pages.every(p => p.text === '')).toBe(true);
    expect(result.pageErrors.map(e => e.pageNum)).toEqual([1, 2]);
  });

  it('does not retry blank failed chunks, and propagates cancellation during a retry', async () => {
    const retry = vi.fn();
    expect((await resolveChunk('', 1, 2, retry)).pageErrors).toHaveLength(2);
    expect(retry).not.toHaveBeenCalled();
    const abort = Object.assign(new Error('Cancelled'), { name: 'AbortError' });
    await expect(resolveChunk('ambiguous', 1, 2, async () => { throw abort; })).rejects.toBe(abort);
  });

  it.each([
    ['Vocabulary 95. Block Design 102.', 'Vocabulary 96. Block Design 103.', 'value-conflict'],
    ['Give -5 mg daily.', 'Give +5 mg daily.', 'value-conflict'],
    ['Do not use this method.', 'Do now use this method.', 'text-conflict'],
    ['Calculate 6 × 2.', 'Calculate 6 ÷ 2.', 'text-conflict'],
    ['Allow ±5 mm.', 'Allow 5 mm.', 'text-conflict'],
    ['Return on 2026-09-07.', 'Return on 2026-09-08.', 'value-conflict'],
  ])('surfaces material OCR disagreement for %s', (left, right, reason) => {
    const rec = reconcile([{ pageNum: 2, text: left }], [{ pageNum: 2, text: right }]);
    expect(rec.disagreements).toEqual([expect.objectContaining({ pageNum: 2, reason, requiresReview: true, tesseractText: left, visionText: right })]);
  });

  it('ignores case and whitespace-only differences and does not invent a conflict for an absent engine', () => {
    expect(reconcile([{ pageNum: 1, text: 'Read the text.' }], [{ pageNum: 1, text: 'READ  the\ntext.' }]).disagreements).toEqual([]);
    expect(reconcile([{ pageNum: 1, text: 'Read the text.' }], []).disagreements).toEqual([]);
  });

  it('the actual two-page extraction retries missing delimiters before reconciliation', async () => {
    const model = vi.fn(async prompt => {
      if (prompt.includes('physical page 1 ')) return 'Page one complete.';
      if (prompt.includes('physical page 2 ')) return 'Page two complete.';
      return 'Page one complete. Page two complete.';
    });
    const result = await makeVisionExtraction(model)();
    expect(model).toHaveBeenCalledTimes(3);
    expect(result.pages.map(p => p.text)).toEqual(['Page one complete.', 'Page two complete.']);
    expect(result.fullText).toBe('Page one complete.\n\nPage two complete.');
  });

  it('limits actual initial OCR requests to five concurrent calls', async () => {
    let active = 0, maxActive = 0;
    const model = vi.fn(async prompt => {
      active++;
      maxActive = Math.max(active, maxActive);
      await new Promise(resolve => setTimeout(resolve, 5));
      active--;
      const [, first, last] = /pages (\d+) through (\d+)/.exec(prompt);
      return 'Content page ' + first + '\n[[PAGE BREAK]]\nContent page ' + last;
    });
    const result = await makeVisionExtraction(model, { pageCount: 14 })();
    expect(maxActive).toBe(5);
    expect(model).toHaveBeenCalledTimes(7);
    expect(result.pages.map(p => p.pageNum)).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
  });
});

describe('OCR recovery preserves completed work across provider limits', () => {
  it('retains successfully retried pages and stops further calls after a quota failure', async () => {
    const retry = vi.fn(async pageNum => {
      if (pageNum === 1) return 'Recovered first page.';
      throw Object.assign(new Error('Daily quota'), { isDailyQuota: true });
    });
    const result = await resolveChunk('Unsegmented multi-page text.', 1, 3, retry);
    expect(retry).toHaveBeenCalledTimes(2);
    expect(result.fullText).toBe('Recovered first page.');
    expect(result.stopReason).toBe('rate-limit');
    expect(result.pageErrors.map(e => e.pageNum)).toEqual([2, 3]);
  });
  it('clears original truncation warnings after complete physical-page retries', async () => {
    const model = vi.fn(async prompt => {
      if (prompt.includes('physical page 1 ')) return 'Complete first page.';
      if (prompt.includes('physical page 2 ')) return 'Complete second page.';
      return 'Truncated first page.\n[Note: Document was partially extracted due to length.]';
    });
    const result = await makeVisionExtraction(model)();
    expect(result.pageErrors).toEqual([]);
    expect(result.fullText).toBe('Complete first page.\n\nComplete second page.');
  });
  it('does not launch another batch after quota failure and retains earlier successful pages', async () => {
    const model = vi.fn(async prompt => {
      const [, first, last] = /pages (\d+) through (\d+)/.exec(prompt);
      if (Number(first) === 5) throw Object.assign(new Error('Rate limited'), { status: 429 });
      return 'Content page ' + first + '\n[[PAGE BREAK]]\nContent page ' + last;
    });
    const result = await makeVisionExtraction(model, { pageCount: 14 })();
    expect(model).toHaveBeenCalledTimes(5);
    expect(result.fullText).toContain('Content page 1');
    expect(result.fullText).not.toContain('Content page 11');
    expect(result.pageErrors.map(e => e.pageNum)).toEqual([5, 6, 11, 12, 13, 14]);
  });
});
