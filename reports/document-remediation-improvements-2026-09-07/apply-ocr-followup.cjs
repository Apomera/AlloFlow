const fs = require('node:fs');
const file = 'doc_pipeline_source.jsx';
const before = fs.readFileSync(file, 'utf8');
let s = before.replace(/\r\n/g, '\n');
function replace(a, b) {
  if (s.split(a).length !== 2) throw new Error('Expected one match: ' + a.slice(0, 100));
  s = s.replace(a, () => b);
}
replace('const pages = [], pageErrors = [];', "const pages = [], pageErrors = [];\n    let stopReason = null;");
replace("if (error && (error.name === 'AbortError' || error.isAbort || error.isThrottle || error.isDailyQuota)) throw error;", String.raw`if (error && (error.name === 'AbortError' || error.isAbort)) throw error;
          const limited = error && (error.isThrottle || error.isDailyQuota || error.status === 429)
            || (typeof _isThrottleErr === 'function' && _isThrottleErr(error));
          if (limited) {
            stopReason = 'rate-limit';
            for (let pending = i; pending < pageCount; pending++) {
              const missingPage = startPage + pending;
              pages.push({ pageNum: missingPage, pageStart: missingPage, pageEnd: missingPage, text: '', boundarySource: 'unresolved' });
              pageErrors.push({ pageNum: missingPage, engine: 'vision', error: 'Physical-page OCR retry paused by a provider rate limit.' });
            }
            break;
          }`);
replace('unsegmentedText: parts.length !== pageCount ? text : \'\', retriedPages:', 'stopReason, unsegmentedText: parts.length !== pageCount ? text : \'\', retriedPages:');
replace('|[<>=≤≥≠+\\-]/gu) || [];', '|[\\p{Sm}<>=≤≥≠+\\-]/gu) || [];');
replace('          let chunkResults = [];', '          let chunkResults = [];\n          let _visionStopped = false;');
replace("              warnLog('[PDF Fix] OCR chunk ' + (batch + index + 1) + ' extraction failed:', err);", String.raw`              if (err && (err.isThrottle || err.isDailyQuota || err.status === 429)
                  || (typeof _isThrottleErr === 'function' && _isThrottleErr(err))) _visionStopped = true;
              warnLog('[PDF Fix] OCR chunk ' + (batch + index + 1) + ' extraction failed:', err);`);
replace('            chunkResults = chunkResults.concat(batchResults);', String.raw`            chunkResults = chunkResults.concat(batchResults);
            if (_visionStopped) {
              chunkResults = chunkResults.concat(Array(Math.max(0, chunkPromises.length - chunkResults.length)).fill(null));
              break;
            }`);
replace("              let bytes = _base64;", "              if (_visionStopped) throw Object.assign(new Error('Vision OCR paused by provider rate limit.'), { isThrottle: true });\n              let bytes = _base64;");
replace('            pagesOut.push(...resolution.pages);', "            if (resolution.stopReason) _visionStopped = true;\n            pagesOut.push(...resolution.pages);");
replace("              for (let q = 0; q < pageCount; q++) _visionPageErrors.push({ pageNum: startPage + q, engine: 'vision', partial: true,\n                error: 'Gemini Vision truncated chunk ' + (ci + 1) + '; this page requires a complete independent reading.' });", String.raw`              for (let q = 0; q < pageCount; q++) {
                const pageNum = startPage + q;
                const completeRetry = resolution.pages.some(p => p.pageNum === pageNum && p.boundarySource === 'physical-page-retry' && String(p.text || '').trim());
                if (!completeRetry) _visionPageErrors.push({ pageNum, engine: 'vision', partial: true,
                  error: 'Gemini Vision truncated chunk ' + (ci + 1) + '; this page requires a complete independent reading.' });
              }`);
if (fs.readFileSync(file, 'utf8') !== before) throw new Error('Source changed concurrently.');
fs.writeFileSync(file, s);
const testFile = 'tests/ocr_page_identity_behavior.test.js';
let tests = fs.readFileSync(testFile, 'utf8');
tests = tests.replace("['Return on 2026-09-07.',", "['Calculate 6 × 2.', 'Calculate 6 ÷ 2.', 'text-conflict'],\n    ['Allow ±5 mm.', 'Allow 5 mm.', 'text-conflict'],\n    ['Return on 2026-09-07.',");
tests += String.raw`
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
`;
fs.writeFileSync(testFile, tests);
console.log('Preserved partial OCR work on quota, cleared superseded warnings, and added math-symbol disagreement tests.');
