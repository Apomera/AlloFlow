// @vitest-environment jsdom
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Contrast theme: the host forces span ink yellow (app_styles_module.js:1003), which beats the tool's own "on fill" ink:
// the selected frame number on --fn-selected read 1.16:1 and the Drone Flight launch pill on --bf-accent read 1.55:1.
const DIR = process.env.BEEHIVE_HC_DIR || path.join(process.cwd(), 'stem_lab');
const src = fs.readFileSync(path.join(DIR, 'stem_tool_beehive.js'), 'utf8');
const m = /st\.id = 'allo-beehive-hc-extra-css';\s*st\.textContent = ("(?:[^"\\]|\\.)*");/.exec(src);
const css = m ? JSON.parse(m[1]) : '';
const rules = css.split('}').filter(Boolean).map((r) => { const i = r.indexOf('{'); return { sel: r.slice(0, i), body: r.slice(i + 1) }; });
const bodyFor = (el) => rules.filter((r) => el.matches(r.sel)).map((r) => r.body).join(';');
function mount(inner) {
  document.body.innerHTML = `<div class="theme-contrast"><div data-stem-tool-shell="beehive">${inner}</div></div>`;
  return document.body.querySelector('[data-stem-tool-shell]').firstElementChild;
}

describe('Beehive contrast theme', () => {
  it('has its own block, scoped to the shell', () => {
    expect(m, 'allo-beehive-hc-extra-css is missing').not.toBeNull();
    for (const r of rules) expect(r.sel.split(/,(?=\.theme-contrast)/).every((s) => s.startsWith('.theme-contrast [data-stem-tool-shell="beehive"]')), r.sel).toBe(true);
  });
  it('gives the selected frame number black ink, and only the selected one', () => {
    const row = mount('<div class="bee-3d-frame-positions"><span data-selected="true">1</span><span data-selected="false">2</span></div>');
    expect(bodyFor(row.children[0])).toContain('color:#000!important');
    expect(bodyFor(row.children[1])).toBe('');
  });
  it('gives the Drone Flight launch pill black ink', () => {
    const b = mount('<button class="bee-flight-launch"><span class="bee-flight-launch-cta" aria-hidden="true">Launch Easy</span></button>');
    expect(bodyFor(b.querySelector('.bee-flight-launch-cta'))).toContain('color:#000!important');
  });
  it('does nothing outside the contrast theme', () => {
    document.body.innerHTML = '<div data-stem-tool-shell="beehive"><div class="bee-3d-frame-positions"><span id="x" data-selected="true">1</span></div></div>';
    expect(bodyFor(document.getElementById('x'))).toBe('');
  });
});
