// Column-aware OCR ground truth (H-5's scanned half, 2026-07-13). The text-layer
// path repairs multi-column reading order at extraction; scanned docs relied on
// Tesseract's internal layout analysis, which interleaves columns on real
// worksheets. _alloColumnReorderOcrText runs the winning page's word boxes
// through the SAME column detector and rebuilds the text — doubly conservative
// (identical word multiset + materially-different order required).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pipe = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const start = pipe.indexOf('function _alloOrderTextItems');
const end = pipe.indexOf('\n}', pipe.indexOf('function _alloColumnReorderOcrText', start)) + 2;
if (start < 0 || end < 1) throw new Error('column-reorder slice markers missing');
const reorder = new Function(pipe.slice(start, end) + '\nreturn _alloColumnReorderOcrText;')();

// Synthetic two-column page: 20 visual lines per column, 3 words per line,
// misaligned baselines (true body columns, not a table), y origin top-left.
const LINES = 20;
const mkColumns = () => {
  const words = [];
  const leftLines = [];
  const rightLines = [];
  for (let i = 0; i < LINES; i++) {
    const yL = 100 + i * 13;
    const yR = 100 + i * 13 + 6; // misaligned baselines → true columns, not a grid
    const lWords = [`left${i}a`, `left${i}b`, `left${i}c`];
    const rWords = [`right${i}a`, `right${i}b`, `right${i}c`];
    lWords.forEach((t, k) => words.push({ t, x0: 50 + k * 60, y0: yL, x1: 100 + k * 60, y1: yL + 10, c: 90 }));
    rWords.forEach((t, k) => words.push({ t, x0: 350 + k * 60, y0: yR, x1: 400 + k * 60, y1: yR + 10, c: 90 }));
    leftLines.push(lWords.join(' '));
    rightLines.push(rWords.join(' '));
  }
  return { words, leftLines, rightLines };
};

describe('_alloColumnReorderOcrText', () => {
  it('rebuilds an interleaved two-column page into column-major order (pure reorder)', () => {
    const { words, leftLines, rightLines } = mkColumns();
    // Tesseract interleaved: visual line i = left(i) + right(i)
    const interleaved = leftLines.map((l, i) => l + ' ' + rightLines[i]).join('\n');
    const r = reorder(words, interleaved);
    expect(r).toBeTruthy();
    expect(r.columns).toBe(2);
    const out = r.text.split(/\s+/);
    // Every left-column word precedes every right-column word.
    const lastLeft = Math.max(...out.map((w, i) => (w.startsWith('left') ? i : -1)));
    const firstRight = Math.min(...out.map((w, i) => (w.startsWith('right') ? i : out.length)));
    expect(lastLeft).toBeLessThan(firstRight);
    // Pure reorder: identical multiset.
    expect(out.slice().sort()).toEqual(interleaved.split(/\s+/).sort());
  });

  it('keeps the engine text when Tesseract already read the columns correctly', () => {
    const { words, leftLines, rightLines } = mkColumns();
    const columnMajor = leftLines.join('\n') + '\n' + rightLines.join('\n');
    expect(reorder(words, columnMajor)).toBeNull();
  });

  it('single-column pages are untouched', () => {
    const words = [];
    const lines = [];
    for (let i = 0; i < LINES; i++) {
      const y = 100 + i * 13;
      const ws = [`w${i}a`, `w${i}b`, `w${i}c`, `w${i}d`];
      ws.forEach((t, k) => words.push({ t, x0: 50 + k * 120, y0: y, x1: 150 + k * 120, y1: y + 10, c: 90 }));
      lines.push(ws.join(' '));
    }
    expect(reorder(words, lines.join('\n'))).toBeNull();
  });

  it('aligned-baseline grids (tables) are untouched — row-major is correct there', () => {
    const words = [];
    const lines = [];
    for (let i = 0; i < LINES; i++) {
      const y = 100 + i * 13; // SAME y both sides → table discriminator
      words.push({ t: `cellL${i}`, x0: 50, y0: y, x1: 150, y1: y + 10, c: 90 });
      words.push({ t: `cellR${i}`, x0: 350, y0: y, x1: 450, y1: y + 10, c: 90 });
      lines.push(`cellL${i} cellR${i}`);
    }
    expect(reorder(words, lines.join('\n'))).toBeNull();
  });

  it('refuses to adopt a rebuild whose word multiset differs from the engine text', () => {
    const { words, leftLines, rightLines } = mkColumns();
    const interleaved = leftLines.map((l, i) => l + ' ' + rightLines[i]).join('\n') + ' extraword';
    expect(reorder(words, interleaved)).toBeNull();
  });
});

describe('reconcile + disclosure wiring (anti-drift)', () => {
  it('runs only on Tesseract-won pages with boxes, discloses via columnReorders', () => {
    expect(pipe).toContain("_winner === 'tesseract' && tPage && Array.isArray(tPage.words) && tPage.words.length");
    expect(pipe).toContain('_columnReorders.push({ pageNum: _pn, columns: _cr.columns });');
    expect(pipe).toContain('columnReorders: _columnReorders');
    expect(pipe).toContain('window.__alloOcrColumnReorders');
    expect(pipe).toContain("kind: 'ocrColumnOrder'");
  });
  it('the verdict strip cautions on a reorder; the view treats it as a quality kind', () => {
    expect(pipe).toContain('multi-column reading order was rebuilt from the scan');
    const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
    expect(view).toContain('ocrColumnOrder: 1');
  });
});
