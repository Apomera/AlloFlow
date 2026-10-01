// OCR-fidelity fixes from the 2-day review workflow (2026-06-21):
//  - ocr-fidelity-1 (med): grammar/spelling corrections are derived from PLAIN OCR text but applied to
//    the HTML string. A `wrong` that is also an HTML/ARIA token ("main") rewrote <main>→<Main>,
//    role="main"→role="Main" (broken landmark), attributes, alt text. The apply is now markup-aware:
//    match a full tag OR the word; the replacer leaves tags untouched.
//  - ocr-fidelity-3 (low): the replacement was passed raw to String.replace, so $&/$n in a `right`
//    value spliced surrounding text. A function replacer inserts it literally.
//  - ocr-fidelity-2 (med): scanned + partial pageRange sized numChunks to the WHOLE doc, firing dozens
//    of out-of-range "pages 12 through 10" Vision calls. effectivePageCount now narrows to the range,
//    and a defensive break stops the loop once a chunk start passes the range end.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pipe = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// ── Mirror of the markup-aware grammar apply ──
const grEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const applyCorrection = (html, w, r) => {
  const reSafe = new RegExp('<[^>]*>|(?<![\\p{L}\\p{N}])' + grEsc(w) + '(?![\\p{L}\\p{N}])', 'gu');
  return html.replace(reSafe, (m) => (m.charCodeAt(0) === 60 ? m : r));
};

describe('ocr-fidelity-1: a correction whose `wrong` is also an HTML/ARIA token never touches markup', () => {
  it('"main"→"Main" fixes body text but leaves <main>, role="main", and id="main-content" intact', () => {
    const html = '<main id="main-content" role="main"><p>the main idea is clear</p></main>';
    const out = applyCorrection(html, 'main', 'Main');
    expect(out).toContain('<main id="main-content" role="main">'); // landmark + attrs untouched
    expect(out).toContain('</main>');
    expect(out).toContain('the Main idea');                         // body text corrected
    expect(out).not.toContain('role="Main"');                       // the bug: broken ARIA role
    expect(out).not.toContain('<Main');                             // the bug: invalid tag
  });
  it('"image"→"Image" leaves an <img alt="..."> attribute alone but fixes prose', () => {
    const html = '<img alt="a diagram of an image"><p>see the image below</p>';
    const out = applyCorrection(html, 'image', 'Image');
    expect(out).toContain('alt="a diagram of an image"'); // alt attribute (inside the tag) untouched
    expect(out).toContain('see the Image below');         // prose corrected
  });
  it('still fixes ordinary OCR errors in body text (the th→though boundary-anchoring is preserved)', () => {
    expect(applyCorrection('<p>teh cat</p>', 'teh', 'the')).toBe('<p>the cat</p>');
    // boundary anchors stop interior corruption: "th" must NOT splice into "health"
    expect(applyCorrection('<p>good health</p>', 'th', 'though')).toBe('<p>good health</p>');
  });
});

describe('ocr-fidelity-3: the replacement is inserted literally (no $-pattern splicing)', () => {
  it('a `right` value containing $& is not treated as a replacement pattern', () => {
    expect(applyCorrection('<p>cost here</p>', 'cost', '$& price')).toBe('<p>$& price here</p>');
  });
});

// ── Mirror of the scanned page-range chunking ──
const narrowedPageCount = (detPageCount, pageRange) =>
  (pageRange && pageRange[1]) ? Math.max(1, Math.min(detPageCount, pageRange[1]) - Math.max(1, pageRange[0] || 1) + 1) : detPageCount;
const chunksFor = (detPageCount, pageRange, PAGES_PER_CHUNK = 2) => {
  const eff = narrowedPageCount(detPageCount, pageRange);
  const numChunks = Math.max(1, Math.ceil(eff / PAGES_PER_CHUNK));
  const rangeStart = (pageRange && pageRange[0]) ? pageRange[0] : 1;
  const rangeEndRaw = (pageRange && pageRange[1]) ? pageRange[1] : (rangeStart + eff - 1);
  const rangeEnd = Math.min(rangeEndRaw, rangeStart + eff - 1);
  const chunks = [];
  for (let i = 0; i < numChunks; i++) {
    const startPage = rangeStart + i * PAGES_PER_CHUNK;
    if (startPage > rangeEnd) break;
    const endPage = Math.min(rangeStart + (i + 1) * PAGES_PER_CHUNK - 1, rangeEnd);
    chunks.push([startPage, endPage]);
  }
  return { eff, numChunks, chunks };
};

describe('ocr-fidelity-2: scanned + page-range sizes chunks to the RANGE, not the whole doc', () => {
  it('pages 6-10 of a 100-page scan → 5 pages, 3 chunks, all in range (no "pages 12 through 10")', () => {
    const r = chunksFor(100, [6, 10]);
    expect(r.eff).toBe(5);
    expect(r.chunks).toEqual([[6, 7], [8, 9], [10, 10]]);
    for (const [s, e] of r.chunks) expect(s).toBeLessThanOrEqual(e); // no malformed prompt
  });
  it('no page range → full doc unchanged (100 pages, 50 chunks, 1..100)', () => {
    const r = chunksFor(100, null);
    expect(r.eff).toBe(100);
    expect(r.numChunks).toBe(50);
    expect(r.chunks[0]).toEqual([1, 2]);
    expect(r.chunks[r.chunks.length - 1]).toEqual([99, 100]);
  });
  it('a range that overshoots the doc clamps to the real end ([6,200] of 100 → ends at 100)', () => {
    const r = chunksFor(100, [6, 200]);
    expect(r.chunks[r.chunks.length - 1][1]).toBe(100);
    for (const [s, e] of r.chunks) { expect(s).toBeLessThanOrEqual(e); expect(e).toBeLessThanOrEqual(100); }
  });
  it('the defensive break means NO chunk is ever out of range, for many shapes', () => {
    for (const [pc, range] of [[100, [6, 10]], [50, [1, 3]], [20, [19, 25]], [7, null], [3, [2, 2]]]) {
      const r = chunksFor(pc, range);
      for (const [s, e] of r.chunks) expect(s).toBeLessThanOrEqual(e);
    }
  });
});

describe('anti-drift: doc_pipeline ships both OCR fixes', () => {
  it('the grammar apply is markup-aware (tag-or-word regex + function replacer)', () => {
    expect(pipe).toMatch(/_grReSafe = new RegExp\('<\[\^>\]\*>\|\(\?<!\[\\\\p\{L\}\\\\p\{N\}\]\)'/);
    expect(pipe).toMatch(/if \(m\.charCodeAt\(0\) === 60\) return m;/);
    expect(pipe).not.toMatch(/accessibleHtml = accessibleHtml\.replace\(_grRe, r\);/); // the old raw apply is gone
  });
  it('the scanned branch narrows effectivePageCount to the active pageRange', () => {
    expect(pipe).toMatch(/effectivePageCount = \(_pageRange && _pageRange\[1\]\)\s*\n\s*\? Math\.max\(1, Math\.min\(det\.pageCount, _pageRange\[1\]\)/);
  });
  it('the Vision chunk loop has the defensive out-of-range break', () => {
    expect(pipe).toMatch(/if \(startPage > _rangeEnd\) break;/);
  });
});
