// Bike Lab, final recommendations round (2026-11-23, evening): light-theme contrast, plus two contrast-theme leftovers.
// Measured in a browser with the host module loaded (C:/tmp/sports_labs_1123/bikelab/fr_steps_light.cjs):
//  - the "This Gear" labels were white at 70-80% opacity on purple-600 (4.0:1);
//  - the mph labels under the cadence bars were slate-400 on white (2.6:1);
//  - option buttons had slate-200/300/400 edges on white (1.2-2.6:1), and pale borderless buttons had no edge;
//  - the Sandbox and Ride fullscreen buttons had a 45%-alpha edge (2.4:1 on black), and the disclosure summaries
//    had no edge of their own;
//  - at the default 85 rpm no cadence bar was lit, because 85 is exactly 5 from both 80 and 90.
// BIKELAB_SRC points the suite at another copy for the fail-first check.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync(process.env.BIKELAB_SRC || 'stem_lab/stem_tool_bikelab.js', 'utf8').replace(/\r\n/g, '\n');
const cut = (from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('anchors missing: ' + from); return src.slice(a, b); };
const css = cut("st.id = 'allo-stem-bikelab-refine-css';", '].join(');
const gearing = cut('      function GearingLab() {', '      function RepairSim() {');

const lum = (hex) => { const c = hex.replace('#', '').match(/../g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const TW = { 'violet-600': '#7c3aed', 'purple-600': '#9333ea', 'violet-700': '#6d28d9', 'slate-500': '#64748b', 'slate-600': '#475569' };

describe('Gearing Lab, light theme', () => {
  it('"This Gear" labels are solid white, which reads 4.5:1 on both gradient stops', () => {
    const card = cut("h('div', { className: 'bikelab-hc-panel bg-gradient-to-br from-violet-600 to-purple-600", "'Shown at quarter speed'");
    expect(card).not.toMatch(/opacity-(70|75|80)\b/);
    for (const stop of [TW['violet-600'], TW['purple-600']]) expect(ratio('#ffffff', stop)).toBeGreaterThan(4.5);
  });

  it('the mph labels under the cadence bars are slate-600 (7.6:1), not slate-400 (2.6:1)', () => {
    expect(gearing).toContain("h('div', { className: 'text-xs text-slate-600' }, pt.v.toFixed(0) + ' mph')");
    expect(gearing).not.toContain('text-slate-400');
    expect(ratio(TW['slate-600'], '#ffffff')).toBeGreaterThan(4.5);
  });

  it('option buttons draw a slate-500 edge (4.8:1 on white), not a pale slate one', () => {
    // every unselected button class string in the view
    const buttonClasses = [...gearing.matchAll(/className: '([^']*border-2[^']*)'/g), ...gearing.matchAll(/: '(border-slate-\d00 bg-white[^']*)'/g)].map((m) => m[1]);
    expect(buttonClasses.length).toBeGreaterThan(4);
    for (const c of buttonClasses) expect(c, c).not.toMatch(/(^|\s)border-slate-(100|200|300|400)(\s|$)/);
    // the gear matrix cells (pale fills on white, 1.1-1.5:1) get an edge of their own
    expect(gearing).toContain("'w-full min-h-6 p-1 text-center font-mono cursor-pointer border border-slate-500 ");
    expect(ratio(TW['slate-500'], '#ffffff')).toBeGreaterThan(3);
  });

  it('the bar nearest the cadence slider is lit for every slider value, exactly one at a time', () => {
    const m = gearing.match(/var isCurrent = ([^;]+);/);
    expect(m).toBeTruthy();
    const lit = new Function('pt', 'cadence', 'return ' + m[1] + ';');
    for (let cadence = 40; cadence <= 120; cadence++) {
      const on = [];
      for (let c = 40; c <= 120; c += 10) if (lit({ c }, cadence)) on.push(c);
      expect(on.length, 'cadence ' + cadence).toBe(1);
      expect(Math.abs(on[0] - cadence)).toBeLessThanOrEqual(5);
    }
    // the white speed label on the lit bar reads (violet-500 was 4.2:1)
    expect(gearing).toContain("(isCurrent ? 'bg-violet-700' : 'bg-violet-200')");
    expect(ratio('#ffffff', TW['violet-700'])).toBeGreaterThan(4.5);
  });
});

describe('Whole tool, light theme edges', () => {
  it('pale slate edges on buttons draw in slate-500, and pale borderless buttons get that edge', () => {
    expect(css).toContain('.bikelab-root button:is(.border-slate-100,.border-slate-200,.border-slate-300,.border-slate-400){border-color:#64748b}');
    expect(css).toContain('.bikelab-root button:is(.bg-slate-100,.bg-slate-200,.bg-violet-100):not(.border):not(.border-2){border:2px solid #64748b}');
    // no !important: the contrast theme's yellow edges (host and tool) must still win there
    expect(css).not.toMatch(/border-slate-400\)\{border-color:#64748b!important/);
    for (const fill of ['#f1f5f9', '#e2e8f0', '#ede9fe']) expect(ratio('#64748b', fill)).toBeGreaterThan(3);
  });

  it('the preset chips edge reads 3:1 on white (slate-400 was 2.6:1)', () => {
    const chip = css.match(/\.bikelab-preset-chip\{[^}]*border:1px solid (#[0-9a-f]{6})/);
    expect(chip).toBeTruthy();
    expect(ratio(chip[1], '#ffffff')).toBeGreaterThan(3);
  });
});

describe('Contrast-theme leftovers', () => {
  it('both fullscreen buttons draw a solid light edge and turn yellow on black in the contrast theme', () => {
    const fs = [...src.matchAll(/title: t\('stem\.bikelab\.fullscreen(?:_2)?', 'Fullscreen'\), className: 'bikelab-fs-btn',/g)];
    expect(fs.length).toBe(2);
    expect(src).not.toContain("border: '1px solid rgba(148,163,184,0.45)'");
    expect((src.match(/border: '2px solid #e2e8f0', color: '#f8fafc',/g) || []).length).toBe(2);
    expect(ratio('#e2e8f0', '#0f172a')).toBeGreaterThan(3);
    expect(css).toContain('.theme-contrast .bikelab-root button.bikelab-fs-btn{background:#000000!important;border:2px solid #ffff00!important;color:#ffff00!important}');
  });

  it('every disclosure summary has an edge of its own, yellow in the contrast theme', () => {
    const summaries = [...src.matchAll(/h\('summary', \{[^}]*className: '([^']*)'/g)].map((m) => m[1]);
    expect(summaries.length).toBeGreaterThanOrEqual(4);
    for (const c of summaries) expect(c).toMatch(/\bbikelab-disclosure\b/);
    expect(css).toContain('.bikelab-root summary.bikelab-disclosure{border:2px solid #4f46e5;');
    expect(ratio('#4f46e5', '#ffffff')).toBeGreaterThan(3);
    expect(css).toContain('.theme-contrast .bikelab-root summary.bikelab-disclosure{border-color:#ffff00!important;');
  });

  it('slate-500 button edges turn yellow in the contrast theme (the host only remaps slate-100..300)', () => {
    expect(css).toContain('.theme-contrast .bikelab-root button.border-slate-500{border-color:#ffff00!important}');
  });
});
