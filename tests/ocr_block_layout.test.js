// OCR "stuck at the top" fix (2026-06-21): the scanned-tagging block fallback (a page with OCR text but
// no per-word boxes) used to draw the whole page's text as ONE size:1 run at a fixed top y, so pdf-lib
// stacked every wrapped line into a ~1pt sliver at the page top. _alloOcrBlockLayout now distributes the
// lines DOWN the page. This pins the distribution math (the part that was actually broken) directly, plus
// the live built module's exposed helper, plus the anti-drift wiring in createTaggedPdf.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pipeSrc = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// ── exercise the LIVE built helper (loaded from the module the browser actually runs) ──
async function liveLayout() {
  globalThis.window = globalThis.window || globalThis;
  await import(resolve(process.cwd(), 'doc_pipeline_module.js'));
  const fn = window.AlloModules && window.AlloModules.createDocPipeline && window.AlloModules.createDocPipeline.ocrBlockLayout;
  return fn;
}

describe('OCR block-fallback layout — lines spread down the page, never bunched at the top', () => {
  it('the live module exposes ocrBlockLayout', async () => {
    const fn = await liveLayout();
    expect(typeof fn).toBe('function');
  });

  it('14 newline-separated lines get 14 DISTINCT, strictly-descending y-positions spanning the page', async () => {
    const fn = await liveLayout();
    const text = Array.from({ length: 14 }, (_, i) => 'Assessment finding line ' + (i + 1) + '.').join('\n');
    const layout = fn(text, 792);
    expect(layout.lines.length).toBe(14);
    const ys = layout.lines.map((l) => l.y);
    // distinct
    expect(new Set(ys.map((y) => Math.round(y))).size).toBe(14);
    // strictly descending (top-to-bottom reading order)
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeLessThan(ys[i - 1]);
    // span the page, NOT a ~1pt sliver at the top (the bug)
    expect(ys[0] - ys[ys.length - 1]).toBeGreaterThan(60);
    // first line near the top, last line well below it
    expect(ys[0]).toBeGreaterThan(700);
    expect(ys[ys.length - 1]).toBeLessThan(700);
  });

  it('a single run with NO newlines (e.g. Vision text) is chunked into pseudo-lines that still flow down', async () => {
    const fn = await liveLayout();
    const text = Array.from({ length: 60 }, (_, i) => 'word' + i).join(' '); // 60 words, no newlines
    const layout = fn(text, 792);
    expect(layout.lines.length).toBeGreaterThan(1); // 60/12 = 5 pseudo-lines
    const ys = layout.lines.map((l) => l.y);
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeLessThan(ys[i - 1]);
  });

  it('empty / whitespace text yields no lines (caller draws nothing → /Artifact path handles bare pages)', async () => {
    const fn = await liveLayout();
    expect(fn('', 792).lines.length).toBe(0);
    expect(fn('   \n  \n', 792).lines.length).toBe(0);
  });

  it('line-height and size stay in sane bounds even for a huge page of text', async () => {
    const fn = await liveLayout();
    const text = Array.from({ length: 400 }, (_, i) => 'line ' + i).join('\n');
    const layout = fn(text, 792);
    expect(layout.lineHeight).toBeGreaterThanOrEqual(6);
    expect(layout.lineHeight).toBeLessThanOrEqual(16);
    expect(layout.size).toBeLessThanOrEqual(12);
    // never positions a line below the page bottom guard
    for (const l of layout.lines) expect(l.y).toBeGreaterThanOrEqual(24);
  });
});

describe('anti-drift: createTaggedPdf consumes the shared layout (no inline fixed-top block)', () => {
  it('defines the pure layout helper and the block fallback calls it', () => {
    expect(pipeSrc).toMatch(/var _alloOcrBlockLayout = function \(text, pageH\) \{/);
    expect(pipeSrc).toMatch(/const _layout = _alloOcrBlockLayout\(ocrText, \(sz && sz\.height \? sz\.height : 792\)\)/);
  });
  it('the old fixed-top single-run block (size:1 at height-36) is gone', () => {
    expect(pipeSrc).not.toMatch(/const _drawOpts = \(font\) => \(\{ x: 36, y: \(sz && sz\.height \? sz\.height : 792\) - 36, size: 1/);
  });
});
