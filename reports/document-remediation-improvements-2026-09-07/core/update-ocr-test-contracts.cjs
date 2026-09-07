const fs = require('node:fs');
function patch(file,changes) {
  const current=fs.readFileSync(file,'utf8'); const nl=current.includes('\r\n')?'\r\n':'\n'; let text=current.replace(/\r\n/g,'\n');
  for(const [before,after] of changes) { const at=text.indexOf(before); if(at<0||text.indexOf(before,at+before.length)>=0) throw new Error('Missing unique test anchor: '+before.slice(0,70)); text=text.slice(0,at)+after+text.slice(at+before.length); }
  if(fs.readFileSync(file,'utf8')!==current) throw new Error('Concurrent test change: '+file); fs.writeFileSync(file,text.replace(/\n/g,nl));
}
patch('tests/doc_pipeline_loop_support.test.js', [[`  it('does NOT flag a disagreement within tolerance', () => {
    const base = 'x'.repeat(300);
    const r = reconcileOcrPages([{ text: base }], [{ text: base + 'x'.repeat(15) }]); // +15 chars on 315 → within 10% and <20
    expect(r.disagreements).toHaveLength(0);
  });`, String.raw`  it('normalizes small whitespace differences without reporting a content conflict', () => {
    const base = 'Please record each observation and explain the result. '.repeat(6);
    const spaced = base.replace('record each', 'record \n\t each');
    const r = reconcileOcrPages([{ pageNum: 7, text: base }], [{ pageNum: 7, text: spaced }]);
    expect(r.disagreements).toHaveLength(0);
    expect(r.pages).toHaveLength(1);
    expect(r.pages[0].pageNum).toBe(7);
  });
  it('flags substantive instructions even when the length difference is small', () => {
    const base = 'Please record each observation and explain the result. '.repeat(6);
    const changed = base + 'Do not copy.';
    expect(changed.length - base.length).toBeLessThan(20);
    const r = reconcileOcrPages([{ pageNum: 7, text: base }], [{ pageNum: 7, text: changed }]);
    expect(r.disagreements).toHaveLength(1);
    expect(r.disagreements[0]).toMatchObject({ pageNum: 7, reason: 'text-conflict', requiresReview: true });
    expect(r.disagreements[0].tesseractText).toBe(base);
    expect(r.disagreements[0].visionText).toBe(changed);
  });`]]);
patch('tests/remediation_pipeline_audit_fixes.test.js', [
  ["import { buildStampedXObjectPdf } from './helpers/stamped_xobject_fixture.js';", "import { buildStampedXObjectPdf } from './helpers/stamped_xobject_fixture.js';\nimport { makeVisionExtraction } from './lib/ocr_source_runtime.js';"],
  [`  it('a failed Vision chunk records every page it was supposed to cover', () => {
    expect(dp).toContain('const _failedChunkIdx = new Set();');
    expect(dp).toContain("if (!chunk || !chunk.trim()) { _failedChunkIdx.add(i); return ''; }");
    expect(dp).toContain('pages: pagesOut, pageErrors: _visionPageErrors };');
  });`, String.raw`  it.each(['', ' \n\t'])('a blank Vision chunk records every physical page it was supposed to cover (%j)', async blank => {
    let calls = 0;
    const extract = makeVisionExtraction(async () => { calls++; return blank; }, { pageCount: 2, range: [7, 8] });
    const result = await extract();
    expect(calls).toBe(1); // Empty output is a failed extraction, not an ambiguous boundary retry.
    expect(result.fullText).toBe('');
    expect(result.pages.map(page => [page.pageNum, page.text])).toEqual([[7, ''], [8, '']]);
    expect(result.pageErrors.map(error => error.pageNum)).toEqual([7, 8]);
    expect(result.pageErrors.every(error => error.engine === 'vision' && error.error.length > 0)).toBe(true);
  });`],
]);
console.log('Updated only the assigned OCR test assertions.');