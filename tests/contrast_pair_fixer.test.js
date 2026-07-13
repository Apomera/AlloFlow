// Deterministic contrast PAIR fixer (2026-06-21): the foreground-only fixer could force the text into an
// ugly extreme (or fail to reach the ratio) when the fg was already near-black/white. _alloContrastFixPair
// generalizes it: 'auto' moves the foreground first and falls back to the BACKGROUND only when the fg
// alone can't reach target; the AI micro-tool overrides with preserve='fg'|'bg'|'both' (strategy only —
// every hex is computed here, never by the model). Tests the live built fn + the key invariant (the result
// ALWAYS reaches the target) + the auto-loop / micro-tool wiring.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pipeSrc = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

async function liveFix() {
  globalThis.window = globalThis.window || globalThis;
  await import(resolve(process.cwd(), 'doc_pipeline_module.js'));
  return window.AlloModules && window.AlloModules.createDocPipeline && window.AlloModules.createDocPipeline.contrastFixPair;
}

// independent contrast-ratio computation (not the impl's) to verify the OUTPUT actually passes
const _lin = (h) => { const n = parseInt(h, 16) / 255; return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4); };
const _lum = (hex) => { const h = hex.replace('#', ''); return 0.2126 * _lin(h.slice(0, 2)) + 0.7152 * _lin(h.slice(2, 4)) + 0.0722 * _lin(h.slice(4, 6)); };
const ratio = (a, b) => { const x = _lum(a), y = _lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

describe('contrastFixPair — reaches WCAG AA, choosing which colour to move', () => {
  it('the live module exposes contrastFixPair', async () => {
    expect(typeof (await liveFix())).toBe('function');
  });

  it('INVARIANT: for any failing pair, the result reaches the target (or reports moved=none if it already passed)', async () => {
    const f = await liveFix();
    const samples = ['#999999', '#777777', '#aaaaaa', '#cccccc', '#666666', '#888888', '#b5651d', '#f5d76e', '#2e8b57', '#4169e1'];
    const bgs = ['#ffffff', '#000000', '#f5d76e', '#222222', '#dddddd', '#1a1a1a'];
    for (const fg of samples) for (const bg of bgs) {
      const r = f(fg, bg);
      if (r.moved === 'none') { expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5 - 0.01); }
      else { expect(ratio(r.fg, r.bg), fg + ' on ' + bg + ' → ' + JSON.stringify(r)).toBeGreaterThanOrEqual(4.5 - 0.01); }
    }
  });

  it('auto moves the FOREGROUND first (preserves the surface) for the common text-on-surface case', async () => {
    const f = await liveFix();
    const r = f('#999999', '#ffffff');
    expect(r.moved).toBe('fg');
    expect(r.bg).toBe('#ffffff'); // white surface untouched
  });

  it('auto falls back to the BACKGROUND when the foreground alone cannot reach the target', async () => {
    const f = await liveFix();
    // At AAA 7:1 on a mid-tone background, NEITHER a black nor a white foreground reaches 7:1, so the
    // background must also move. (At AA 4.5:1 a black-or-white text always suffices, so fg-only is correct.)
    const r = f('#000000', '#767676', 7);
    expect(['bg', 'both']).toContain(r.moved);
    expect(ratio(r.fg, r.bg)).toBeGreaterThanOrEqual(7 - 0.05);
  });

  it('preserve=fg keeps the foreground and moves the surface', async () => {
    const f = await liveFix();
    const r = f('#ffffff', '#f5d76e', 4.5, 'fg'); // keep the white text, darken the yellow surface
    expect(r.fg).toBe('#ffffff');
    expect(r.bg).not.toBe('#f5d76e');
    expect(ratio(r.fg, r.bg)).toBeGreaterThanOrEqual(4.5 - 0.01);
  });

  it('preserve=bg keeps the surface and moves the text', async () => {
    const f = await liveFix();
    const r = f('#ffffff', '#f5d76e', 4.5, 'bg'); // keep the yellow surface, darken the text
    expect(r.bg).toBe('#f5d76e');
    expect(r.fg).not.toBe('#ffffff');
    expect(ratio(r.fg, r.bg)).toBeGreaterThanOrEqual(4.5 - 0.01);
  });

  it('preserve=both splits the adjustment across both colours', async () => {
    const f = await liveFix();
    const r = f('#777777', '#9a9a9a', 4.5, 'both');
    expect(r.moved).toBe('both');
    expect(r.fg).not.toBe('#777777');
    expect(r.bg).not.toBe('#9a9a9a');
    expect(ratio(r.fg, r.bg)).toBeGreaterThanOrEqual(4.5 - 0.01);
  });

  it('an already-compliant pair is left untouched', async () => {
    const f = await liveFix();
    const r = f('#000000', '#ffffff');
    expect(r).toEqual({ fg: '#000000', bg: '#ffffff', moved: 'none' });
  });

  it('respects a stricter target (AAA 7:1)', async () => {
    const f = await liveFix();
    const r = f('#767676', '#ffffff', 7);
    expect(ratio(r.fg, r.bg)).toBeGreaterThanOrEqual(7 - 0.05);
  });

  it('invalid colours are returned unchanged (moved=none), never throw', async () => {
    const f = await liveFix();
    expect(f('not-a-color', '#fff')).toEqual({ fg: 'not-a-color', bg: '#fff', moved: 'none' }); // inputs returned untouched
    expect(f(null, null).moved).toBe('none');
  });
});

describe('anti-drift: both contrast consumers route through the shared deterministic fixer', () => {
  it('the fix_color_contrast micro-tool takes a preserve param and calls _alloContrastFixPair', () => {
    expect(pipeSrc).toMatch(/fix_color_contrast: \{[\s\S]*?params: '\{target, fgColor, bgColor, expectedContrastRatio, preserve\}'/);
    expect(pipeSrc).toMatch(/var _fix = _alloContrastFixPair\(p\.fgColor, p\.bgColor, p\.expectedContrastRatio \|\| 4\.5, p\.preserve\);/);
    // it applies background-color (not just color) when the fixer moved the bg
    // (P5 2026-07-02: the style writer lives in the shared _mutColorContrast mutator,
    // whose param is `fix` — used by BOTH the string path and the shared-doc fnDoc path)
    expect(pipeSrc).toMatch(/_decls\.push\('background-color:' \+ fix\.bg\)/);
    expect(pipeSrc).toContain('const _mutColorContrast = (fix) =>');
  });
  it('the axe-driven auto-loop uses the pair fixer and only patches a bg when the element OWNS one', () => {
    expect(pipeSrc).toMatch(/const _fix = _alloContrastFixPair\(fgHex, bgHex\);/);
    expect(pipeSrc).toMatch(/const _applyBg = moveBg && _ownsBg\(el\);/);
    // never patch a background behind plain inherited-surface text
    expect(pipeSrc).toMatch(/never\s*\n?\s*\/\/ patch a background behind plain text|never patch a background behind plain text/);
  });
});
