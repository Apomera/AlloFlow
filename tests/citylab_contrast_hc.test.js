// @vitest-environment jsdom
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Contrast theme: the host forces a parcel button black and span ink yellow, so the corner plate is the only place the
// map keeps its colours, and yellow on the gold, green and pale plates read 1.0 to 4.47:1. Each rule below is applied to
// real markup for every fill the map can show, read out of the source so a new fill without an ink fails here.
// Pixels: see the contrast_bh report (a browser probe of all 3 towns x 8 lenses).
const DIR = process.env.CITYLAB_HC_DIR || path.join(process.cwd(), 'stem_lab');
const src = fs.readFileSync(path.join(DIR, 'stem_tool_citylab.js'), 'utf8');
const m = /st\.id = 'allo-citylab-hc-extra-css';\s*st\.textContent = ("(?:[^"\\]|\\.)*");/.exec(src);
const css = m ? JSON.parse(m[1]) : '';
const rules = css.split('}').filter(Boolean).flatMap((r) => r.split('{')[0].split(/,(?=\.theme-contrast)/).map((sel) => ({ sel, body: r.split('{')[1] })));

const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const lum = (h) => { const c = rgb(h); return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

const hexes = (s) => (s.match(/#[0-9a-f]{6}/gi) || []).map((x) => x.toLowerCase());
const between = (a, b) => { const i = src.indexOf(a); return src.slice(i, src.indexOf(b, i)); };
const useFills = [...between('var USES = [', 'var USE_BY_ID').matchAll(/fill: '(#[0-9a-f]{6})'/gi)].map((x) => x[1].toLowerCase());
const terrain = hexes(between('var TERRAIN_RAMP = [', '];'));
const twins = between('contrast: {', '};');
const lensTwins = [...twins.matchAll(/: '(#[0-9a-f]{6})'/gi)].map((x) => x[1].toLowerCase());
const plateFills = [...new Set([...useFills, ...terrain, ...lensTwins])];

function plate(fill, hover) {
  const c = rgb(fill).join(', ');
  document.body.innerHTML = `<div class="theme-contrast"><div data-stem-tool-shell="cityLab"><button id="citylab-parcel-A1" type="button"><span aria-hidden="true" class="absolute top-0 left-0 leading-none" style="padding: 1px 2px; background-color: rgb(${c});">Fd</span></button></div></div>`;
  const el = document.querySelector('span');
  const ink = (selFilter) => {
    for (const r of rules) {
      if (!selFilter(r.sel)) continue;
      const sel = r.sel.replace(/:hover/g, '');
      const hit = el.matches(sel);
      const col = /color:(#[0-9a-f]{3,6})/i.exec(r.body);
      if (hit && col) return col[1].length === 4 ? '#' + col[1].slice(1).split('').map((x) => x + x).join('') : col[1];
    }
    return null;
  };
  // At rest the host's span rule gives yellow; on hover its button:hover * rule gives black.
  if (!hover) return ink((s) => !s.includes(':hover')) || '#ffff00';
  return ink((s) => s.includes(':hover')) || ink((s) => !s.includes(':hover')) || '#000000';
}

describe('City Lab contrast theme: the map plates', () => {
  it('carries its own block scoped to the shell', () => {
    expect(m, 'allo-citylab-hc-extra-css is missing').not.toBeNull();
    for (const r of rules) for (const s of r.sel.split(/,(?=\.theme-contrast)/)) expect(s.startsWith('.theme-contrast [data-stem-tool-shell="cityLab"]'), s).toBe(true);
  });
  it('read the fills it must cover out of the source', () => {
    expect(useFills.length).toBe(11);
    expect(terrain.length).toBe(10);
    expect(lensTwins).toContain('#ffff00');
    expect(lensTwins).toContain('#00ffff');
  });
  it('every plate clears 4.5:1 at rest', () => {
    const bad = plateFills.filter((f) => ratio(plate(f, false), f) < 4.5).map((f) => f + ' ' + plate(f, false) + ' ' + ratio(plate(f, false), f).toFixed(2));
    expect(bad).toEqual([]);
  });
  it('every plate clears 4.5:1 under the hover rule, where the host turns inner text black', () => {
    const bad = plateFills.filter((f) => ratio(plate(f, true), f) < 4.5).map((f) => f + ' ' + plate(f, true) + ' ' + ratio(plate(f, true), f).toFixed(2));
    expect(bad).toEqual([]);
  });
  it('keeps the plate colour: no rule repaints it', () => {
    expect(/background/.test(css.replace(/\[style\*="background-color: rgb\([^)]*\)"\]/g, ''))).toBe(false);
  });
  it('lifts the code over the coach frame, so the frame cannot hide its first letter', () => {
    const r = rules.find((x) => x.body.includes('z-index'));
    expect(r, 'no stacking rule').toBeTruthy();
    plate('#7f9d84', false);
    expect(document.querySelector('span').matches(r.sel)).toBe(true);
  });
  it('does not apply outside the contrast theme', () => {
    document.body.innerHTML = '<div data-stem-tool-shell="cityLab"><button id="citylab-parcel-A1"><span style="background-color: rgb(127, 157, 132);">Fd</span></button></div>';
    const el = document.querySelector('span');
    expect(rules.some((r) => el.matches(r.sel.replace(/:hover/g, '')))).toBe(false);
  });
});

describe('City Lab contrast theme: the rain lens', () => {
  it('draws the run-off split on a span, because the host strips a button gradient', () => {
    expect(src).toContain("lens === 'rain' && sceneTheme === 'contrast'");
    expect(src).toContain("'data-citylab-hc-rain': String(rainPct)");
    const app = fs.readFileSync(path.join(process.cwd(), 'app_styles_module.js'), 'utf8');
    expect(app.includes('.theme-contrast button[style*="gradient"]')).toBe(true);
  });
});
