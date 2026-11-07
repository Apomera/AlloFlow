// @vitest-environment jsdom
// Universe in light and dark. The tool has its OWN appearance toggle, so a dark card can sit in the host's light theme and
// a pale card in the host's dark theme. The host's light-theme sheet turns text-slate-400 into #64748b and amber-400 into
// #d97706 with !important (stem_lab_module.js:4189, :4199), which is what took these under 4.5:1. Dark host leaves
// text-slate-500 at #64748b. Pixel readings are in the lightdark report; these pin the source of each reading.
// UNIVERSE_LD_DIR=<dir> runs against another copy, to show the failure on the old file.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = process.env.UNIVERSE_LD_DIR || path.join(process.cwd(), 'stem_lab');
const src = fs.readFileSync(path.join(DIR, 'stem_tool_universe.js'), 'utf8');

const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const lum = (h) => { const c = rgb(h); return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const lineWith = (needle) => src.split('\n').find((l) => l.includes(needle)) || '';

describe('Universe light and dark: small text that sat just under 4.5:1', () => {
  it('prints every composition label at 4.5:1 or better on its own slice', () => {
    const label = /fontWeight: 700, fill: '(#[0-9a-f]{6})' \}, p\[1\] \+ '%'\)/.exec(src);
    expect(label, 'pie label not found').not.toBeNull();
    const slices = [...`${lineWith('var UNIVERSE_COMPOSITION = ')}${lineWith('var UNIVERSE_ORDINARY_SPLIT = ')}`.matchAll(/, \d+, '(#[0-9a-f]{6})'\]/g)].map((m) => m[1]);
    expect(slices.length).toBe(5);
    const bad = slices.filter((s) => ratio(label[1], s) < 4.5).map((s) => s + ' ' + ratio(label[1], s).toFixed(2));
    expect(bad).toEqual([]);
  });

  it('keeps "Choose one to see the detail." off the classes the host remaps', () => {
    const l = lineWith('Choose one to see the detail.');
    expect(l).toBeTruthy();
    expect(/text-slate-[45]00/.test(l), l.trim()).toBe(false);
    expect(l).toContain("dk ? 'text-slate-300' : 'text-slate-600'");
  });

  it('gives the astronomer year a colour that clears 4.5:1 on its tinted card and on the dark panel', () => {
    const l = lineWith('ast.year),');
    const m = /color: isDark \? '(#[0-9a-f]{6})' : '(#[0-9a-f]{6})'/.exec(l);
    expect(m, 'the year has one colour for both appearances: ' + l.trim()).not.toBeNull();
    expect(ratio(m[2], '#d0f1f7')).toBeGreaterThanOrEqual(4.5);
    expect(ratio(m[1], '#1e293b')).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the notes on the always-dark redshift cards off text-slate-400', () => {
    for (const needle of ['z > 0 means wavelength grew', 'H\\u2080 = 70 km/s/Mpc']) {
      const l = lineWith(needle);
      expect(l, needle).toBeTruthy();
      expect(l.includes('text-slate-400'), l.trim().slice(0, 120)).toBe(false);
    }
    const i = src.indexOf("'For nearby galaxies this linear model works well.");
    expect(i).toBeGreaterThan(0);
    const before = src.slice(src.lastIndexOf('className:', i), i);
    expect(before.includes('text-slate-400')).toBe(false);
  });

  it('cases the planet labels, because the red giant grows under them (3.05-3.46:1 on the red disc)', () => {
    const l = lineWith('x: px + 6, y: py - 5, fontSize: 11');
    expect(l).toBeTruthy();
    expect(l).toContain("paintOrder: 'stroke'");
  });

  it('keeps the Danger line off amber-400, which the host turns into 3.25:1 on a dark card', () => {
    const l = lineWith('Danger: " + cc.danger');
    expect(l).toBeTruthy();
    expect(l.includes('text-amber-400')).toBe(false);
  });
});
