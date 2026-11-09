'use strict';
// A person's corrections, carried onto a scan's word boxes (2026-11-08; pdf_finalize_edited_html).
//
// The tagged PDF of a scan draws its invisible text from the run's machine reading: each word at its printed position. When a
// person corrects a misread word in the accessible version, the tags read the correction but search and copy would still find
// the misread form. carryCorrectionsOntoReading finds, page by page and in order, the stretch of the edited text each page's
// words line up with, then lets `align` (the pipeline's _alloAlignVisionOntoOcrWords, via pipeline.alignReadingOntoOcrWords)
// put that stretch onto the page's boxes under its own guards: anchors on both sides, words that resemble each other, and
// numbers kept on the review list. A page that does not line up well is left as the machine read it.
//
// Self-contained (no closure over this module): the driver sends its source into the page; tests call it with the aligner
// sliced from the pipeline source.
function carryCorrectionsOntoReading(pages, editedText, align) {
  const stats = { pagesWithBoxes: 0, pagesCorrected: 0, wordsReplaced: 0, corrections: [], skipped: [] };
  if (!Array.isArray(pages) || typeof editedText !== 'string' || typeof align !== 'function') return { pages, stats };
  const key = (t) => String(t || '').normalize('NFKC').toLowerCase().replace(/[‘’ʼ]/g, "'").replace(/[^\p{L}\p{N}]/gu, '');
  const edited = editedText.split(/\s+/).filter((t) => key(t));
  const ek = edited.map(key);
  // LCS of two key lists; returns matched index pairs in order. Bounded by the caller.
  const lcs = (A, B) => {
    const n = A.length, m = B.length, W = m + 1, d = new Uint16Array((n + 1) * W);
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) d[i * W + j] = A[i] === B[j] ? d[(i + 1) * W + j + 1] + 1 : Math.max(d[(i + 1) * W + j], d[i * W + j + 1]);
    const pairs = [];
    for (let i = 0, j = 0; i < n && j < m;) {
      if (A[i] === B[j] && d[i * W + j] === d[(i + 1) * W + j + 1] + 1) { pairs.push([i, j]); i++; j++; } else if (d[(i + 1) * W + j] >= d[i * W + j + 1]) i++; else j++;
    }
    return pairs;
  };
  const pageNo = (page, pi) => (page && Number.isInteger(page.pageNum) ? page.pageNum : pi + 1);
  // Pass 1: where each page's words sit in the edited text (in order; a page that does not line up is skipped).
  const placed = [];
  let cursor = 0;
  pages.forEach((page, pi) => {
    if (!page || !Array.isArray(page.words) || !page.words.length) return;
    stats.pagesWithBoxes++;
    const pk = page.words.map((w) => key(w && w.t)).filter(Boolean);
    if (!pk.length) return;
    const span = Math.min(ek.length - cursor, pk.length * 2 + 400);
    if (span <= 0 || (pk.length + 1) * (span + 1) > 12e6) { stats.skipped.push({ page: pageNo(page, pi), reason: span <= 0 ? 'no edited text left to match' : 'page too large to line up' }); return; }
    const pairs = lcs(pk, ek.slice(cursor, cursor + span));
    if (pairs.length < Math.max(3, pk.length * 0.5)) { stats.skipped.push({ page: pageNo(page, pi), reason: 'under half of its words line up with the edited text' }); return; }
    const first = cursor + pairs[0][1], last = cursor + pairs[pairs.length - 1][1];
    placed.push({ pi, first, last });
    cursor = last + 1;
  });
  // Pass 2: each page's stretch reaches back to where the previous page ended and on to where the next begins (at most 20
  // words each way), so a misread first or last word (often a heading at the top of a page) has its correction in reach.
  // Sentinel words on both ends give those edge words an anchor on each side, as the aligner requires; they are removed after.
  const S0 = 'qqallocarrystartqq', S1 = 'qqallocarryendqq';
  const out = pages.slice();
  placed.forEach((p, k) => {
    const page = pages[p.pi];
    const lo = Math.max(k > 0 ? placed[k - 1].last + 1 : 0, p.first - 20);
    const hi = Math.min(k + 1 < placed.length ? placed[k + 1].first - 1 : ek.length - 1, p.last + 20);
    const w0 = page.words[0], wn = page.words[page.words.length - 1];
    const words = [Object.assign({}, w0, { t: S0, c: 100, _carrySentinel: true })].concat(page.words, [Object.assign({}, wn, { t: S1, c: 100, _carrySentinel: true })]);
    let res = null;
    // The aligner rewrites its "OCR text" around the boxes, so it is given the box words themselves: a saved page text is
    // often another reading (the vision transcription) whose words are not the boxes' words.
    try { res = align(words, words.map((w) => w.t).join(' '), [S0].concat(edited.slice(lo, hi + 1), [S1]).join(' ')); } catch (_) { res = null; }
    if (!res || !Array.isArray(res.words)) { stats.skipped.push({ page: pageNo(page, p.pi), reason: 'the aligner did not trust the match' }); return; }
    const newWords = res.words.filter((w) => !(w && w._carrySentinel)).map((w) => { const c = Object.assign({}, w); delete c._carrySentinel; return c; });
    const changed = newWords.length !== page.words.length || newWords.some((w, i) => !page.words[i] || w.t !== page.words[i].t);
    if (!changed) return;
    const list = (res.stats && Array.isArray(res.stats.corrections)) ? res.stats.corrections : [];
    stats.pagesCorrected++;
    stats.wordsReplaced += (res.stats && Number.isInteger(res.stats.correctionCount)) ? res.stats.correctionCount : list.length;
    for (const c of list) if (stats.corrections.length < 200) stats.corrections.push({ page: pageNo(page, p.pi), from: String(c.from || ''), to: String(c.to || '') });
    // The page text stays as saved (it decides which pages hold text and which script font is embedded); only the boxes change.
    out[p.pi] = Object.assign({}, page, { words: newWords });
  });
  return { pages: out, stats };
}

module.exports = { carryCorrectionsOntoReading };
