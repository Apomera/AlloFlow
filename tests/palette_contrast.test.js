// Tests for routing the PDF-remediation palette (batchDocStyle) through clampPaletteContrast so every
// theme is WCAG AA by construction. Extracts the pure clampPaletteContrast engine from source and
// exercises it with batchDocStyle's token names (headerText/headerBg, headingColor/bgColor, ...),
// including the exact failure the user hit (#737373 header text on a dark-blue band ~2.5:1).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// clampPaletteContrast is a self-contained top-level function (defines its own color math).
const block = dp.match(/function clampPaletteContrast\(palette, opts\) \{[\s\S]*?\n  return _r;\r?\n\}/);
if (!block) throw new Error('could not extract clampPaletteContrast from source');
const clamp = new Function(block[0] + '\n; return clampPaletteContrast;')();

// Independent WCAG contrast (so we verify against our OWN math, not the function's report).
const hexToRgb = (h) => { h = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16)); };
const lum = (rgb) => { const c = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const l1 = lum(hexToRgb(a)), l2 = lum(hexToRgb(b)); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };

// The batchDocStyle-keyed pairs the remediation path passes (mirrors the source).
const BDS_PAIRS = [
  { fg: 'headerText', bg: 'headerBg', target: 4.5 },
  { fg: 'headingColor', bg: 'bgColor', target: 3.0 },
  { fg: 'accentColor', bg: 'bgColor', target: 3.0 },
  { fg: 'tableBorder', bg: 'bgColor', target: 3.0 },
];

describe('batchDocStyle AA clamp — the exact failure + general guarantee', () => {
  it('fixes the reported case: #737373 header text on a dark-blue band (~2.5:1) → >= 4.5:1', () => {
    const bds = { headerText: '#737373', headerBg: '#1e3a5f', bgColor: '#ffffff', headingColor: '#1e3a5f', accentColor: '#2563eb', tableBorder: '#cbd5e1' };
    expect(ratio('#737373', '#1e3a5f')).toBeLessThan(4.5);          // precondition: the bug
    const out = clamp(bds, { pairs: BDS_PAIRS }).palette;
    expect(out.headerText).not.toBe('#737373');                     // it was adjusted
    expect(ratio(out.headerText, '#1e3a5f')).toBeGreaterThanOrEqual(4.5); // ...to pass AA
  });

  it('leaves an already-compliant palette untouched (no needless color shifts)', () => {
    const bds = { headerText: '#ffffff', headerBg: '#1e3a5f', bgColor: '#ffffff', headingColor: '#1e3a5f', accentColor: '#2563eb', tableBorder: '#94a3b8' };
    const r = clamp(bds, { pairs: BDS_PAIRS });
    expect(r.allPass).toBe(true);
    expect(r.palette.headerText).toBe('#ffffff');
    expect(r.palette.headingColor).toBe('#1e3a5f');
  });

  it('clamps a low-contrast heading (large text, 3:1 floor)', () => {
    const bds = { headingColor: '#b8c0cc', bgColor: '#ffffff', headerText: '#ffffff', headerBg: '#1e3a5f' };
    expect(ratio('#b8c0cc', '#ffffff')).toBeLessThan(3.0);          // precondition
    const out = clamp(bds, { pairs: BDS_PAIRS }).palette;
    expect(ratio(out.headingColor, '#ffffff')).toBeGreaterThanOrEqual(3.0);
  });

  it('after clamping, every pair present in the palette passes its target', () => {
    const bds = { headerText: '#888888', headerBg: '#0b1a3a', bgColor: '#ffffff', headingColor: '#aab4c4', accentColor: '#cfe0ff', tableBorder: '#e8edf5' };
    const r = clamp(bds, { pairs: BDS_PAIRS });
    expect(r.allPass).toBe(true);
    for (const p of BDS_PAIRS) {
      if (bds[p.fg] && bds[p.bg]) expect(ratio(r.palette[p.fg], r.palette[p.bg])).toBeGreaterThanOrEqual(p.target - 0.01);
    }
  });

  it('hue-preserving — a clamped color keeps its dominant channel (mood preserved)', () => {
    // a too-light blue accent on white → darkened toward a darker BLUE, not turned gray/black arbitrarily
    const out = clamp({ accentColor: '#9ec5ff', bgColor: '#ffffff', headerText: '#fff', headerBg: '#1e3a5f' }, { pairs: BDS_PAIRS }).palette;
    const [r, g, b] = hexToRgb(out.accentColor);
    expect(b).toBeGreaterThanOrEqual(r);   // blue stays the strongest channel
    expect(b).toBeGreaterThanOrEqual(g);
  });

  it('non-hex (gradient) background is skipped, not crashed (fail-safe)', () => {
    const out = clamp({ headerText: '#737373', headerBg: 'linear-gradient(90deg,#1e3a5f,#2563eb)', bgColor: '#ffffff' }, { pairs: BDS_PAIRS });
    expect(out).toHaveProperty('palette');           // no throw
    expect(out.palette.headerText).toBe('#737373');  // can't clamp against a gradient → left as-is
  });
});

describe('docStyle AA clamp — LIVE pipeline wiring (fixAndVerifyPdf)', () => {
  it('the LIVE fix path routes docStyle through clampPaletteContrast, after it is finalized, before the renderer', () => {
    expect(dp).toMatch(/const _dsClamp = clampPaletteContrast\(docStyle, \{ pairs: _dsPairs \}\)/);
    expect(dp).toMatch(/\{ fg: 'headerText', bg: 'headerBg', target: 4\.5 \}/);
    expect(dp).toMatch(/docStyle = \{ \.\.\.docStyle, \.\.\._dsClamp\.palette \}/);
    expect(dp).toMatch(/catch \(_dsClampErr\) \{ warnLog\('\[PDF Fix\] docStyle contrast clamp failed/);
    const clampIdx = dp.indexOf('clampPaletteContrast(docStyle');
    const presetIdx = dp.indexOf('Using preset theme:');                 // a live-path docStyle branch
    const rendererIdx = dp.indexOf('Deterministic HTML renderer from JSON content blocks');
    expect(clampIdx).toBeGreaterThan(presetIdx);                          // after docStyle is finalized
    expect(rendererIdx).toBeGreaterThan(clampIdx);                        // before colors bake into the HTML
  });
  it('the dead processSinglePdfForBatch loop no longer clamps (relocated, not duplicated)', () => {
    expect(dp).not.toMatch(/clampPaletteContrast\(batchDocStyle/);
  });
});
