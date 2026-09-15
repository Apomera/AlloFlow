// Output-audit sections start and end on block-element boundaries (2026-09-13, NCES tables pilot).
//
// The fixed-stride slicer this replaces nudged only each section's END to the next '>' and let
// every later section START mid-element — mid-attribute when the pipeline's own toolbar
// handlers were long. A text-only auditor reads that half-element as markup: on the pilot a
// white "Replace" label, cut away from its coloured button, was reported as a critical
// white-on-white failure. These cases pin the splitter's contract on the real source.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const start = source.indexOf('  const _AUDIT_BLOCK_CLOSE = ');
const end = source.indexOf('\n  };', start);
if (start < 0 || end < 0) throw new Error('splitHtmlForAudit not found');
const split = new Function(source.slice(start, end + 5) + '\nreturn splitHtmlForAudit;')();

const para = (i, words) => `<p id="p${i}">${('word ').repeat(words).trim()}</p>\n`;
const doc = (n, words) => '<html lang="en"><head><title>T</title></head><body><main>' + Array.from({ length: n }, (_, i) => para(i, words)).join('') + '</main></body></html>';

const startsOnBoundary = (chunk) => /^\s*<[a-zA-Z/!]/.test(chunk);
const endsOnBoundary = (chunk) => /(>\s*|<\/[a-z0-9]+>)\s*$/i.test(chunk) && chunk.lastIndexOf('<') < chunk.lastIndexOf('>');

describe('splitHtmlForAudit', () => {
  it('returns the whole document as one section when it fits', () => {
    const html = doc(5, 20);
    expect(split(html, 16000, 800)).toEqual([html]);
  });

  it('starts and ends every section on a tag boundary, never mid-element', () => {
    const html = doc(400, 30); // ~65 KB of paragraphs
    const chunks = split(html, 16000, 800);
    expect(chunks.length).toBeGreaterThan(3);
    for (const chunk of chunks) {
      expect(startsOnBoundary(chunk), chunk.slice(0, 60)).toBe(true);
      expect(endsOnBoundary(chunk), chunk.slice(-60)).toBe(true);
      // no half paragraph at either end
      expect(chunk.trimStart().startsWith('<p id=') || chunk.startsWith('<html')).toBe(true);
      expect(chunk.trimEnd().endsWith('</p>') || chunk.trimEnd().endsWith('</html>')).toBe(true);
      expect(chunk.length).toBeLessThanOrEqual(16000);
    }
  });

  it('covers the document with whole-block overlaps, in order, and never repeats a tail section', () => {
    const html = doc(400, 30);
    const chunks = split(html, 16000, 800);
    let cursor = 0;
    for (let i = 0; i < chunks.length; i++) {
      const at = html.indexOf(chunks[i], Math.max(0, cursor - 800));
      expect(at, 'section ' + i + ' is a contiguous slice').toBeGreaterThanOrEqual(0);
      if (i > 0) {
        expect(at, 'section ' + i + ' overlaps its predecessor').toBeLessThan(cursor);
        expect(cursor - at, 'overlap stays within the budget').toBeLessThanOrEqual(800);
        // the overlap is made of whole paragraphs: the section starts on one the previous ended with
        expect(chunks[i - 1].includes(chunks[i].trimStart().slice(0, 40))).toBe(true);
      }
      cursor = at + chunks[i].length;
    }
    expect(cursor).toBe(html.length);
    expect(chunks[chunks.length - 2].endsWith(chunks[chunks.length - 1])).toBe(false);
  });

  it('never cuts inside a table, list, figure or definition list', () => {
    const rows = Array.from({ length: 300 }, (_, i) => `<tr><th scope="row">r${i}</th><td>${'v '.repeat(20)}</td></tr>`).join('');
    const html = '<html><body><main>' + para(0, 400) + '<table><caption>Big</caption><tbody>' + rows + '</tbody></table>' + para(1, 400) + '</main></body></html>';
    const chunks = split(html, 16000, 800);
    for (const chunk of chunks) {
      const opens = (chunk.match(/<table\b/g) || []).length, closes = (chunk.match(/<\/table>/g) || []).length;
      expect(opens, 'table open/close balanced in every section').toBe(closes);
    }
    expect(chunks.join('')).toContain('r299</th>');
  });

  it('does not mistake a "<" inside a script body for a tag boundary', () => {
    const script = '<script>for(var i=0;i<kids.length;i++){if(a<b&&c>d){x()}}</script>';
    const html = '<html><head>' + script + '</head><body><main>' + Array.from({ length: 200 }, (_, i) => para(i, 40)).join('') + '</main></body></html>';
    const chunks = split(html, 16000, 800);
    expect(chunks[0]).toContain(script);
    for (const chunk of chunks) expect(chunk).not.toMatch(/^[^<]*kids\.length/);
  });

  it('keeps a long onclick attribute whole instead of cutting inside it', () => {
    const handler = 'onclick="(function(b){' + 'b.disabled=true;'.repeat(120) + '})(this)"';
    const button = `<button type="button" ${handler} style="background:#0f766e;color:#ffffff !important"><span style="color:#ffffff !important">Replace</span></button>`;
    const blocks = Array.from({ length: 60 }, (_, i) => `<figure id="f${i}"><img src="__ALLOFLOW_DATAURL_FINAL_${i}__" alt="chart ${i}"><div>${button}</div><figcaption>${'caption words '.repeat(30)}</figcaption></figure>\n`).join('');
    const html = '<html><body><main>' + blocks + '</main></body></html>';
    const chunks = split(html, 16000, 800);
    expect(chunks.length).toBeGreaterThan(2);
    for (const chunk of chunks) {
      // a half-cut handler would leave an unbalanced quote count or a bare "Replace" span at a section start
      expect((chunk.match(/onclick="/g) || []).length).toBe((chunk.match(/\)\(this\)"/g) || []).length);
      expect(chunk.trimStart().startsWith('<figure') || chunk.startsWith('<html')).toBe(true);
    }
  });

  it('falls back to a raw cut only when a single text run is larger than the budget', () => {
    const html = '<html><body><main><p>' + 'word '.repeat(9000) + '</p><p>End marker</p></main></body></html>';
    const chunks = split(html, 16000, 800);
    expect(chunks.length).toBe(3);
    expect(chunks.join('')).toContain('End marker');
    expect(chunks[chunks.length - 1]).toContain('<p>End marker</p>');
  });
});

describe('the output audit uses the block-boundary splitter', () => {
  it('replaces the fixed-stride loop', () => {
    expect(source).toContain('const chunks = splitHtmlForAudit(_auditHtmlForModel, CHUNK_SIZE, OVERLAP);');
    expect(source).not.toContain("for (let i = 0; i < _auditHtmlForModel.length; i += CHUNK_SIZE - OVERLAP) {");
  });
});
