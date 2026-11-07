// @vitest-environment jsdom
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Contrast theme: the host forces span ink yellow (app_styles_module.js:1003), so the grey Start here chips read 1.15:1.
// Only a browser can prove the pixels (see the contrast_bh report); here the rules are parsed and applied to real markup.
const DIR = process.env.NUMBERLINE_HC_DIR || path.join(process.cwd(), 'stem_lab');
const src = fs.readFileSync(path.join(DIR, 'stem_tool_numberline.js'), 'utf8');
const m = /st\.id = 'allo-numberline-hc-extra-css';\s*st\.textContent = ("(?:[^"\\]|\\.)*");/.exec(src);
const css = m ? JSON.parse(m[1]) : '';
const rules = css.split('}').filter(Boolean).map((r) => ({ sel: r.split('{')[0], body: r.split('{')[1] }));
const hits = (el) => rules.filter((r) => el.matches(r.sel)).map((r) => r.body).join(';');
function mount(inner) {
  document.body.innerHTML = `<div class="theme-contrast"><div data-stem-tool-shell="numberline">${inner}</div></div>`;
  return document.body.querySelector('[data-stem-tool-shell]').firstElementChild;
}
const chip = (bg, ink) => `<li data-nl-path-step="a"><span aria-hidden="true" style="width: 26px; height: 26px; flex-shrink: 0; background: ${bg}; color: ${ink};">2</span></li>`;

describe('Number Line contrast theme', () => {
  it('carries its own block after the generated markers, scoped to the shell', () => {
    expect(m, 'allo-numberline-hc-extra-css is missing').not.toBeNull();
    const genEnd = src.indexOf('// end WCAG 1.4.3 high contrast');
    expect(genEnd).toBeGreaterThan(0);
    expect(src.indexOf("st.id = 'allo-numberline-hc-extra-css'")).toBeGreaterThan(genEnd);
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) expect(r.sel.startsWith('.theme-contrast [data-stem-tool-shell="numberline"]'), r.sel).toBe(true);
  });
  it('turns a waiting path chip black with a yellow edge', () => {
    const el = mount(chip('rgb(226, 232, 240)', 'rgb(15, 23, 42)')).firstElementChild;
    expect(hits(el)).toContain('background:#000!important');
    expect(hits(el)).toContain('#ffff00');
  });
  it('leaves the next and done chips, whose fills already carry yellow, alone', () => {
    expect(hits(mount(chip('rgb(29, 78, 216)', 'rgb(255, 255, 255)')).firstElementChild)).toBe('');
    expect(hits(mount(chip('rgb(4, 120, 87)', 'rgb(255, 255, 255)')).firstElementChild)).toBe('');
  });
  it('makes the LCM result, a dark <b> the host does not force, yellow', () => {
    expect(hits(mount('<p><b class="font-mono text-base text-rose-900">LCM(4, 6) = 12</b></p>').firstElementChild)).toContain('color:#ffff00');
    const b = mount('<button><b class="text-rose-900">x</b></button>').firstElementChild;
    expect(hits(b)).toBe('');
  });
  it('darkens grey axis labels on the white number line panel', () => {
    document.body.innerHTML = '<div class="theme-contrast"><div data-stem-tool-shell="numberline"><svg><text id="t" fill="#64748b">1.5</text><text id="u" fill="#1e3a8a">2</text></svg></div></div>';
    expect(hits(document.getElementById('t'))).toContain('fill:#000');
    expect(hits(document.getElementById('u'))).toBe('');
  });
  it('only ever applies inside the contrast theme', () => {
    document.body.innerHTML = '<div data-stem-tool-shell="numberline"><ol>' + chip('rgb(226, 232, 240)', 'rgb(15, 23, 42)') + '</ol></div>';
    expect(hits(document.querySelector('span'))).toBe('');
  });
});
