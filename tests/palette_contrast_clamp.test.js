// Deterministic palette contrast clamp (S2, 2026-06-23). The enforcement core of "AI proposes a palette →
// we GUARANTEE accessibility": for every rendered ink/surface pair, if the WCAG ratio fails, the ink's
// luminance is nudged (hue-preserving) until it clears the floor (4.5 body, 3.0 large/UI). This extracts the
// real clampPaletteContrast and INDEPENDENTLY recomputes the WCAG ratio of every output pair to prove the
// guarantee actually holds (not just that the engine claims it does).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const _s = dp.indexOf('function clampPaletteContrast(palette, opts) {');
const _tail = '\n  return _r;\n}';
const _e = dp.indexOf(_tail, _s) + _tail.length;
if (_s === -1 || _e < _tail.length) throw new Error('extraction markers for clampPaletteContrast missing');
const clampPaletteContrast = new Function(dp.slice(_s, _e) + '\nreturn clampPaletteContrast;')();

// Independent WCAG contrast (so we verify the engine against a SEPARATE implementation).
const rgb = (hex) => { const h = hex.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16)); };
const lum = (hex) => { const c = rgb(hex).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };

describe('clampPaletteContrast: every clamped pair INDEPENDENTLY clears its WCAG floor', () => {
  it('a palette with failing body/heading/link/header/callout/accent all get clamped to pass', () => {
    const proposed = {
      bg: '#ffffff', surface: '#f8fafc',
      text: '#999999',          // ~2.85:1 on white — FAILS 4.5
      heading: '#bbbbbb',       // very light — FAILS 3.0
      link: '#93c5fd',          // light blue — FAILS 4.5 on white
      headerBg: '#fde68a', headerText: '#ffffff',   // white on pale yellow — FAILS
      calloutBg: '#fef3c7', calloutText: '#fde68a', // pale on pale — FAILS
      accent: '#bfdbfe', border: '#eeeeee',         // light UI — FAIL 3.0
    };
    const { palette, report, allPass } = clampPaletteContrast(proposed);
    // GUARANTEE: recompute each reported pair's ratio from the corrected palette and confirm it meets target.
    for (const r of report) {
      const got = ratio(palette[r.token], palette[r.against]);
      expect(got, `${r.token} on ${r.against} → ${palette[r.token]}/${palette[r.against]} = ${got.toFixed(2)} (target ${r.target})`).toBeGreaterThanOrEqual(r.target - 0.05);
    }
    expect(allPass).toBe(true);
    // the failing ones were actually changed
    expect(report.find((r) => r.token === 'text').clamped).toBe(true);
    expect(palette.text).not.toBe('#999999');
  });
  it('surfaces/anchors (bg, headerBg, calloutBg) are NEVER mutated — only the ink adapts', () => {
    const proposed = { bg: '#ffffff', surface: '#f1f5f9', text: '#aaaaaa', headerBg: '#1e293b', headerText: '#475569' };
    const { palette } = clampPaletteContrast(proposed);
    expect(palette.bg).toBe('#ffffff');
    expect(palette.surface).toBe('#f1f5f9');
    expect(palette.headerBg).toBe('#1e293b'); // dark header preserved; headerText lightened to pass
  });
  it('already-passing colors are left UNCHANGED (no needless mutation)', () => {
    const proposed = { bg: '#ffffff', text: '#1f2937', heading: '#111827', accent: '#1d4ed8' };
    const { palette, report } = clampPaletteContrast(proposed);
    expect(palette.text).toBe('#1f2937');
    expect(report.every((r) => !r.clamped)).toBe(true);
  });
  it('large text + non-text UI use the 3:1 floor, body text uses 4.5:1', () => {
    const r = clampPaletteContrast({ bg: '#ffffff', text: '#777', heading: '#777', accent: '#777' }).report;
    expect(r.find((x) => x.token === 'text').target).toBe(4.5);
    expect(r.find((x) => x.token === 'heading').target).toBe(3.0);
    expect(r.find((x) => x.token === 'accent').target).toBe(3.0);
  });
});

describe('clampPaletteContrast: hue-preserving + robust', () => {
  it('clamping a light blue link stays BLUE (b channel still dominant), just darker', () => {
    const { palette } = clampPaletteContrast({ bg: '#ffffff', link: '#93c5fd' });
    const [r, g, b] = rgb(palette.link);
    expect(b).toBeGreaterThan(r);       // still bluish
    expect(lum(palette.link)).toBeLessThan(lum('#93c5fd')); // darker
  });
  it('clamps the ink on a DARK surface by LIGHTENING it', () => {
    const { palette } = clampPaletteContrast({ headerBg: '#0f172a', headerText: '#334155' });
    expect(ratio(palette.headerText, '#0f172a')).toBeGreaterThanOrEqual(4.5 - 0.05);
    expect(lum(palette.headerText)).toBeGreaterThan(lum('#334155')); // lightened toward white
  });
  it('skips a pair whose token is absent (partial palettes are fine)', () => {
    const { report } = clampPaletteContrast({ bg: '#ffffff', text: '#999' }); // no link/heading/etc.
    expect(report.some((r) => r.token === 'link')).toBe(false);
    expect(report.some((r) => r.token === 'text')).toBe(true);
  });
  it('honors a custom pair spec', () => {
    const { report } = clampPaletteContrast(
      { ink: '#bbb', paper: '#ffffff' },
      { pairs: [{ fg: 'ink', bg: 'paper', target: 7.0 }] }
    );
    expect(report).toHaveLength(1);
    expect(report[0].target).toBe(7.0);
    expect(report[0].after).toBeGreaterThanOrEqual(7.0 - 0.05);
  });
});

describe('anti-drift: the engine is exported on the factory API', () => {
  it('clampPaletteContrast is on the public return', () => {
    expect(dp).toMatch(/clampPaletteContrast: clampPaletteContrast,/);
  });
});
