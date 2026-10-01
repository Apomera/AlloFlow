// H-6 (2026-06-24): the chunked-fix splitter (splitHtmlOnTagBoundary) used to back up only to the last '>',
// so it freely cut between </td>/<td> or </li>/<li> — splitting a table/list across two chunks that each get
// fixed in isolation, which can duplicate a header row, drop continuation rows, or orphan a cell (none of which
// the char-count gate sees). It's now container-aware: it cuts only at depth-0 boundaries and grows a chunk (up
// to 2×) to keep a table/list/figure whole, falling back to a raw cut only for a container larger than the cap.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

const _s = dp.indexOf('const splitHtmlOnTagBoundary = (html, size) => {');
const _e = dp.indexOf('\n  };', _s) + '\n  };'.length;
const splitHtmlOnTagBoundary = new Function(dp.slice(_s, _e) + '\nreturn splitHtmlOnTagBoundary;')();

// a chunk with an UNBALANCED <table> open/close = a mid-table cut
const containerSplit = (chunks, tag) => chunks.some((c) =>
  (c.match(new RegExp('<' + tag + '[\\s>]', 'gi')) || []).length !== (c.match(new RegExp('</' + tag + '>', 'gi')) || []).length);

describe('splitHtmlOnTagBoundary: never cut inside a table/list/figure (H-6)', () => {
  it('CONTENT PRESERVED: chunks always rejoin to the exact original (the non-negotiable invariant)', () => {
    const big = '<body>' + Array.from({ length: 200 }, (_, i) => `<p>Paragraph ${i} with some filler text to add length here.</p>`).join('') + '</body>';
    const chunks = splitHtmlOnTagBoundary(big, 1000);
    expect(chunks.join('')).toBe(big);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('keeps a <table> whole when it fits within the growth cap (no mid-table cut)', () => {
    // ~1000-char table that STRADDLES the 1000-char boundary (so the old splitter would have cut it) but is
    // well under 2× the chunk size, so the container-aware splitter grows the chunk to keep it whole.
    const rows = Array.from({ length: 14 }, (_, i) => `<tr><td>Row ${i} cell A</td><td>Row ${i} cell B</td><td>Row ${i} cell C</td></tr>`).join('');
    const html = '<body><p>' + 'lead '.repeat(120) + '</p><table>' + rows + '</table><p>after</p></body>';
    const chunks = splitHtmlOnTagBoundary(html, 1000);
    expect(chunks.join('')).toBe(html);              // no content loss
    expect(containerSplit(chunks, 'table')).toBe(false); // the <table> is never split across chunks
  });

  it('keeps a <ul> whole (no mid-list cut)', () => {
    const items = Array.from({ length: 20 }, (_, i) => `<li>List item ${i} with enough text to matter here.</li>`).join('');
    const html = '<body><p>' + 'lead '.repeat(120) + '</p><ul>' + items + '</ul><p>after</p></body>';
    const chunks = splitHtmlOnTagBoundary(html, 1000);
    expect(chunks.join('')).toBe(html);
    expect(containerSplit(chunks, 'ul')).toBe(false);
  });

  it('FALLBACK: a single table larger than 2× the chunk still splits (content preserved) so the budget holds', () => {
    const rows = Array.from({ length: 200 }, (_, i) => `<tr><td>${'cell ' + i + ' '.repeat(10)}</td></tr>`).join('');
    const html = '<body><table>' + rows + '</table></body>'; // one giant table >> 2× size
    const chunks = splitHtmlOnTagBoundary(html, 500);
    expect(chunks.join('')).toBe(html);              // still no content loss
    expect(chunks.length).toBeGreaterThan(1);         // it DID split (can't keep a huge table in one 500-char chunk)
  });

  it('short / empty input returns a single chunk', () => {
    expect(splitHtmlOnTagBoundary('<p>tiny</p>', 1000)).toEqual(['<p>tiny</p>']);
    expect(splitHtmlOnTagBoundary('', 1000)).toEqual(['']);
  });

  it('every chunk makes forward progress (no zero-length chunk, terminates)', () => {
    const html = '<body>' + '<div>block of text</div>'.repeat(500) + '</body>';
    const chunks = splitHtmlOnTagBoundary(html, 300);
    expect(chunks.every((c) => c.length > 0)).toBe(true);
    expect(chunks.join('')).toBe(html);
  });
});

describe('anti-drift: the container-aware split ships', () => {
  it('source tracks container depth + has the safe-boundary + grow logic', () => {
    expect(dp).toContain('var CONTAINER = /^(?:table|ul|ol|figure|dl)$/i;');
    expect(dp).toContain('safe.push(m.index + m[0].length)');
    expect(dp).toContain('grow to finish a container whole');
  });
  it('B2 (2026-06-28): a tag-integrity guard backs the last-resort cut off an open tag', () => {
    expect(dp).toContain('Tag-integrity guard (B2');
    expect(dp).toContain('if (_lt > _gt && _lt > i) cut = _lt;');
  });
});

describe('B2: the last-resort cut never ends a chunk mid-tag (content preserved)', () => {
  it('backs the cut up to the <img> start instead of slicing mid-attribute', () => {
    const text = 'word '.repeat(16);
    const html = '<body>' + text + '<img alt="' + 'y'.repeat(200) + '" src="z.png"></body>';
    const chunks = splitHtmlOnTagBoundary(html, 100);
    expect(chunks.join('')).toBe(html);                       // content preserved (the non-negotiable invariant)
    expect(chunks.some((c) => c.endsWith(text))).toBe(true);  // a chunk ends exactly at the <img> boundary, not `…<img alt="yy`
  });
});
