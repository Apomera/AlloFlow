// @vitest-environment jsdom
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Contrast theme: the orbit labels are written by the render loop with a pale inline fill (rgba(248,250,252,.92), selected
// rgba(254,240,138,.96)) under the host's forced yellow: 1.15:1. The launch button's gradient lives in a tool class, so the
// host's button[class*=bg-gradient] flatten misses it.
const DIR = process.env.SOLAR_HC_DIR || path.join(process.cwd(), 'stem_lab');
const src = fs.readFileSync(path.join(DIR, 'stem_tool_solarsystem.js'), 'utf8');
const m = /st\.id = 'allo-solarsystem-hc-extra-css';\s*st\.textContent = ("(?:[^"\\]|\\.)*");/.exec(src);
const css = m ? JSON.parse(m[1]) : '';
const rules = css.split('}').filter(Boolean).map((r) => { const i = r.indexOf('{'); return { sel: r.slice(0, i), body: r.slice(i + 1) }; });
const bodyFor = (el) => rules.filter((r) => el.matches(r.sel)).map((r) => r.body).join(';');
function mount(inner) {
  document.body.innerHTML = `<div class="theme-contrast"><div data-stem-tool-shell="solarSystem">${inner}</div></div>`;
  return document.body.querySelector('[data-stem-tool-shell]').firstElementChild;
}

describe('Solar System contrast theme', () => {
  it('has its own block, scoped to the shell', () => {
    expect(m, 'allo-solarsystem-hc-extra-css is missing').not.toBeNull();
    for (const r of rules) expect(r.sel.split(/,(?=\.theme-contrast)/).every((s) => s.startsWith('.theme-contrast [data-stem-tool-shell="solarSystem"]')), r.sel).toBe(true);
  });
  it('paints orbit labels black, beating the inline fill', () => {
    const label = mount('<div class="solar-orbit-label" style="background: rgba(248, 250, 252, 0.92);">Mars</div>');
    expect(bodyFor(label)).toContain('background:#000!important');
  });
  it('keeps the selected label distinct: a yellow edge, and the TARGET word stays', () => {
    const label = mount('<div class="solar-orbit-label solar-orbit-label--selected">Earth</div>');
    const selected = rules.filter((r) => label.matches(r.sel)).pop();
    expect(selected.body).toContain('border-color:#ff0!important');
    expect(src.includes('.solar-orbit-label--selected::before{content:"TARGET"')).toBe(true);
    expect(/solar-orbit-label--selected::before[^{]*\{[^}]*display:\s*none/.test(css)).toBe(false);
  });
  it('removes the launch button gradient', () => {
    expect(bodyFor(mount('<button class="solar-tutorial-launch">Start Exploring!</button>'))).toContain('background-image:none!important');
  });
  it('lifts the Betelgeuse label above 4.5:1 on the black sky, leaving the star dot its own colour', () => {
    const svg = mount('<svg style="width: 100%; display: block; background: rgb(0, 0, 0);"><circle fill="#dc2626"></circle><text fill="#dc2626">Betelgeuse</text></svg>');
    expect(bodyFor(svg.querySelector('text'))).toContain('fill:#ff8a72!important');
    expect(bodyFor(svg.querySelector('circle'))).toBe('');
  });
  it('lifts the speed scale and sky clock labels on their dark gradients', () => {
    const speed = mount('<svg style="width: 100%; display: block; background: radial-gradient(rgb(10, 10, 24) 0%, rgb(0, 0, 0) 100%);"><text fill="#dc2626">Human walking</text></svg>');
    expect(bodyFor(speed.querySelector('text'))).toContain('fill:#ff8a72!important');
    const sky = mount('<svg style="width: 100%; display: block; background: linear-gradient(rgb(30, 58, 138) 0%, rgb(30, 64, 175) 50%, rgb(6, 78, 59) 100%);"><text fill="#a78bfa">21:00</text></svg>');
    expect(bodyFor(sky.querySelector('text'))).toContain('fill:#fff!important');
  });
  it('does nothing outside the contrast theme', () => {
    document.body.innerHTML = '<div data-stem-tool-shell="solarSystem"><div id="x" class="solar-orbit-label"></div></div>';
    expect(bodyFor(document.getElementById('x'))).toBe('');
  });
});
