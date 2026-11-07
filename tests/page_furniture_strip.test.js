// (2026-11-07) Printed page numbers and running headers/footers the structure pass transcribed as paragraphs.
// NCES (54 pp): ~100 footers + running headers; Persian UDHR: page numbers ٢..١١, 4 inside sentences. The AI audit
// rated them a critical reading-order failure, every fix was refused, and neither document got a tagged PDF.
// Rules come from the real runs; the negatives are real content a first version removed (syllabus, budget).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import { sliceBetween } from './helpers/anchored_slice.js';

const PIPE = readFileSync(process.env.ALLO_PIPELINE_SOURCE || resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const strip = new Function(sliceBetween(PIPE, 'var _alloStripPageFurniture = function', '// Tagged-PDF linking (2026-10-27, complaint)', { file: 'doc_pipeline_source.jsx' }) + '\nreturn _alloStripPageFurniture;')();
const require = createRequire(import.meta.url);
global.DOMParser = global.DOMParser || new JSDOM('').window.DOMParser;
const P = require(process.env.ALLO_MCP_DIR ? resolve(process.env.ALLO_MCP_DIR, 'remediation_narration_plan.cjs') : resolve(process.cwd(), 'desktop/mcp/remediation_narration_plan.cjs'));

// Chunks of 3 pages, wrapped in the markers the pipeline puts around each chunk.
const doc = (chunks) => {
  const out = [];
  chunks.forEach((blocks, ci) => {
    out.push({ type: 'rawhtml', html: '<div data-chunk-start="' + ci + '" style="display:none"></div>' });
    out.push(...blocks);
    out.push({ type: 'rawhtml', html: '<div data-chunk-end="' + ci + '" style="display:none"></div>' });
  });
  return out;
};
const run = (chunks, pages) => strip(doc(chunks), { firstPage: 1, pagesPerChunk: 3, lastPage: pages || chunks.length * 3 });
const p = (text) => ({ type: 'p', text });
const texts = (r) => r.blocks.filter((b) => b.type !== 'rawhtml').map((b) => b.text);

describe('page furniture in the structure blocks', () => {
  it('removes running footers with a page number and the running header beside them (NCES)', () => {
    const F = (n) => p('Report on the Condition of Education 2023 | ' + n);
    const H = p('Postsecondary Education');
    // One footer per page, as printed (pages 1-3, 4-6, 7).
    const r = run([
      [{ type: 'h2', text: 'Postsecondary Education' }, p('In fall 2021, 70 percent enrolled.'), F(1), H, p('By control, the number of institutions fell.'), F(2), H, p('Tuition rose.'), F(3)],
      [H, p('Of the 2.7 million completers, 62 percent enrolled.'), F(4), H, p('Completion rates rose.'), F(5), H, p('Aid grew.'), F(6)],
      [H, p('Loans were repaid.'), F(7)],
    ], 7);
    expect(texts(r)).toEqual(['Postsecondary Education', 'In fall 2021, 70 percent enrolled.', 'By control, the number of institutions fell.', 'Tuition rose.', 'Of the 2.7 million completers, 62 percent enrolled.', 'Completion rates rose.', 'Aid grew.', 'Loans were repaid.']);
    expect(r.removed.filter((x) => x.kind === 'footer')).toHaveLength(7);
    expect(r.removed.filter((x) => x.kind === 'running header')).toHaveLength(6);
    expect(r.numbers).toEqual(['1', '2', '3', '4', '5', '6', '7']);
  });

  it('removes bare page numbers in any digit script and joins the sentences they split (Persian)', () => {
    const r = run([
      [p('و در محیطی آزاد تر وضع'), p('٢'), p('زندگی بهتری بوجود آورند .'), p('٣')],
      [p('مادهٔ هفتم ـ همه در برابر قانون مساوی هستند .'), p('٤'), p('مادهٔ هشتم ـ هر کس حق دارد .'), p('٥')],
      [p('عقیدهٔ'), p('٧'), p('سیاسی یا هر عقیده دیگر .')],
    ]);
    expect(r.removed.map((x) => x.text)).toEqual(['٢', '٣', '٤', '٥', '٧']);
    expect(texts(r)).toEqual(['و در محیطی آزاد تر وضع زندگی بهتری بوجود آورند .', 'مادهٔ هفتم ـ همه در برابر قانون مساوی هستند .', 'مادهٔ هشتم ـ هر کس حق دارد .', 'عقیدهٔ سیاسی یا هر عقیده دیگر .']);
    expect(r.joined).toBe(2);
  });

  it('joins an English sentence only when the second half starts in lowercase', () => {
    const r = run([[p('approaches that are agile, risk-informed, and'), p('1'), p('continuously improving.'), p('Small'), p('2')],
      [p('Organizations differ.'), p('3'), p('Next page text.'), p('4')], [p('More.'), p('7')]]);
    expect(texts(r)).toEqual(['approaches that are agile, risk-informed, and continuously improving.', 'Small', 'Organizations differ.', 'Next page text.', 'More.']);
  });

  it('keeps a repeated line whose number never changes (syllabus, budget: real content)', () => {
    const r1 = run([[p('Post to blog (latest post by 1/26 11:59pm).'), p('Post to blog (latest post by 1/28 11:59pm).'), p('Post to blog (latest post by 2/2 11:59pm).'), p('Post to blog (latest post by 2/4 11:59pm).')]]);
    expect(r1.removed).toEqual([]);
    const S = p('Source: Maine DOE ED-279 reports');
    const r2 = run([[p('Chart one.'), S], [p('Chart two.'), S], [p('Chart three.'), S]]);
    expect(r2.removed).toEqual([]);
  });

  it('keeps numbers that rise faster than the pages (a quiz on one page) and anything that is not a plain paragraph', () => {
    const q = (n) => p('Question ' + n + ' of 10');
    expect(run([[q(1), p('a'), q(2), p('b'), q(3), p('c'), q(4)], [q(5), q(6), q(7)]]).removed).toEqual([]);
    const r = run([[{ type: 'h3', text: '1' }, p('<a href="https://x.org">2</a>'), { type: 'ul', items: ['3'] }], [p('text')], [p('more')]]);
    expect(r.removed).toEqual([]);
  });

  it('needs the chunk page evidence: without it nothing is removed', () => {
    expect(strip([p('a'), p('1'), p('b'), p('2'), p('c'), p('3')], {}).removed).toEqual([]);
  });

  it('is wired before rendering, disclosed as a caution, and its numbers are not "changed values"', () => {
    expect(PIPE.includes('const _pf = _alloStripPageFurniture(allBlocks, { firstPage: _t2RangeStart, pagesPerChunk: TRANSFORM_PAGES, lastPage: _t2LastPage });')).toBe(true);
    // A caution, not a hold: a note without caution:true becomes "content fidelity needs a human check" (Persian replay).
    expect(PIPE.includes("_structuralFidelityNotes.push({ kind: 'pageFurniture', caution: true,")).toBe(true);
    expect(PIPE.includes("if (kinds.pageFurniture) cautions.push(")).toBe(true);
    expect(PIPE.split("window.__lastGroundTruthPageMap : null) + ' ' + _alloFurnitureNumbers()").length - 1).toBe(2);
    expect(PIPE.includes('window.__alloPageFurniture = null; // page numbers / running heads removed from the structure blocks, fresh each run')).toBe(true);
  });
});

describe('content coverage: printed page numbers in other digit scripts', () => {
  it('drops a bare page number printed in Persian digits, as it does an ASCII one (Persian replay: 10 "missing" ٢..١١)', () => {
    const fa = ['یک', 'دو', 'سه', 'چهار', 'پنج'];
    const pages = fa.map((w, i) => ({ pageNum: i + 1, text: 'متن صفحه ' + w + (i ? ' ' + '٠١٢٣٤٥٦٧٨٩'[i + 1] : '') }));
    const html = fa.map((w) => '<p>متن صفحه ' + w + '</p>').join('');
    expect(P.assessSourceCoverage({ sourceText: pages.map((x) => x.text).join('\n'), outputHtml: html, pages, method: 'vision-ocr' })).toMatchObject({ status: 'matched', missingTokens: 0 });
  });
});

describe('content coverage: printed page numbers behind the physical page', () => {
  it('drops a page number printed with an offset (front matter), and still counts a real missing number', () => {
    const pages = [1, 2, 3, 4, 5, 6].map((n) => ({ pageNum: n, text: n <= 2 ? 'Front matter page ' + ['i', 'ii'][n - 1] : 'Body text of page ' + ['one', 'two', 'three', 'four'][n - 3] + ' ' + (n - 2) }));
    const html = '<p>Front matter page i</p><p>Front matter page ii</p><p>Body text of page one</p><p>Body text of page two</p><p>Body text of page three</p><p>Body text of page four</p>';
    const sourceText = pages.map((x) => x.text).join('\n');
    expect(P.assessSourceCoverage({ sourceText, outputHtml: html, pages, method: 'text' })).toMatchObject({ status: 'matched', missingTokens: 0 });
    expect(P.assessSourceCoverage({ sourceText: sourceText + '\nThe total was 4500 dollars.', outputHtml: html + '<p>The total was dollars.</p>', pages, method: 'text' }).missingTokens).toBeGreaterThan(0);
  });
});
