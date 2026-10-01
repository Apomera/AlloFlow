import { describe, it, expect, vi } from 'vitest';
import { reconcile, resolveChunk } from './lib/ocr_source_runtime.js';

describe('two-page OCR preserves one physical record per page', () => {
  it('retains a page recovered only by Tesseract instead of replacing the whole source with Vision', () => {
    const rec = reconcile([{ pageNum: 1, text: 'Page one.' }, { pageNum: 2, text: 'Page two score 98.' }],
      [{ pageNum: 1, text: 'Page one with additional detail.' }]);
    expect(rec.fullText).toContain('Page two score 98.');
    expect(rec.fullText.match(/98/g)).toHaveLength(1);
  });
  it('retries a combined Vision blob and avoids duplicating page-two values', async () => {
    const retry = vi.fn(async n => n === 1 ? 'VCI 105' : 'WMI 98');
    const vision = await resolveChunk('VCI 105 WMI 98', 1, 2, retry);
    const result = reconcile([{ pageNum: 1, text: 'VCI 105' }, { pageNum: 2, text: 'WMI 98' }], vision.pages);
    expect(result.fullText).toBe('VCI 105\n\nWMI 98');
    expect(result.fullText.match(/98/g)).toHaveLength(1);
    expect(retry).toHaveBeenCalledTimes(2);
  });
  it('accepts exact markers without additional model calls', async () => {
    const retry = vi.fn();
    const vision = await resolveChunk('VCI 105\n[[PAGE BREAK]]\nWMI 98', 1, 2, retry);
    expect(vision.fullText).toBe('VCI 105\n\nWMI 98');
    expect(retry).not.toHaveBeenCalled();
  });
});
