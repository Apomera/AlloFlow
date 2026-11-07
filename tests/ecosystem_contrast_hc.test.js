// @vitest-environment jsdom
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Contrast theme: the live phase status and outcome boxes use pale inline tones under the host's forced yellow or white
// ink (1.02-1.38:1). These are status boxes a student needs to read. The tone must survive as border, icon and word.
const DIR = process.env.ECOSYSTEM_HC_DIR || path.join(process.cwd(), 'stem_lab');
const src = fs.readFileSync(path.join(DIR, 'stem_tool_ecosystem.js'), 'utf8');
const m = /st\.id = 'allo-ecosystem-hc-extra-css';\s*st\.textContent = ("(?:[^"\\]|\\.)*");/.exec(src);
const css = m ? JSON.parse(m[1]) : '';
const rules = css.split('}').filter(Boolean).map((r) => { const i = r.indexOf('{'); return { sel: r.slice(0, i), body: r.slice(i + 1) }; });
const bodyFor = (el) => rules.filter((r) => el.matches(r.sel)).map((r) => r.body).join(';');
function mount(inner) {
  document.body.innerHTML = `<div class="theme-contrast"><div data-stem-tool-shell="ecosystem">${inner}</div></div>`;
  return document.body.querySelector('[data-stem-tool-shell]').firstElementChild;
}

describe('Ecosystem contrast theme', () => {
  it('has its own block, scoped to the shell', () => {
    expect(m, 'allo-ecosystem-hc-extra-css is missing').not.toBeNull();
    for (const r of rules) expect(r.sel.startsWith('.theme-contrast [data-stem-tool-shell="ecosystem"]'), r.sel).toBe(true);
  });
  it.each([
    ['high risk', 'rgba(254, 226, 226, 0.86)'],
    ['food pressure', 'rgba(254, 243, 199, 0.9)'],
    ['recovery', 'rgba(209, 250, 229, 0.88)'],
    ['collecting data', 'rgba(238, 242, 255, 0.9)'],
    ['cycle watch', 'rgba(204, 251, 241, 0.88)'],
    ['coexistence outcome', 'rgb(236, 253, 245)'],
    ['collapse outcome', 'rgb(255, 241, 242)'],
  ])('flattens the %s tone to black', (_name, tone) => {
    expect(bodyFor(mount(`<div style="background: ${tone}; border-color: rgb(165, 180, 252);">x</div>`))).toContain('background:#000!important');
  });
  it('lifts chart text that sat just under 4.5:1 on black, keeping the green and red series labels distinct', () => {
    const svg = mount('<svg><text id="axis" fill="#64748b">Modeled time</text><text id="pred" fill="#dc2626">Red foxes</text><text id="prey" fill="#16a34a">Rabbits</text></svg>');
    expect(bodyFor(svg.querySelector('#axis'))).toContain('fill:#fff!important');
    expect(bodyFor(svg.querySelector('#pred'))).toContain('fill:#ff8a72!important');
    expect(bodyFor(svg.querySelector('#prey'))).toBe('');
  });
  it('flattens only the fill, so the tone border stays', () => {
    expect(css.includes('border')).toBe(false);
  });
  it('every tone it flattens still exists in the tool source', () => {
    expect(src.includes("soft: 'rgba(254,226,226,0.86)'")).toBe(true);
    expect(src.includes("soft: 'rgba(204,251,241,0.88)'")).toBe(true);
  });
  it('does nothing outside the contrast theme', () => {
    document.body.innerHTML = '<div data-stem-tool-shell="ecosystem"><div id="x" style="background: rgba(238, 242, 255, 0.9);"></div></div>';
    expect(bodyFor(document.getElementById('x'))).toBe('');
  });
});
