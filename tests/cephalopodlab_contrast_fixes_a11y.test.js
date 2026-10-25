import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

// Contrast defects found by the 2026-10-25 WCAG sweep (full axe 2.2 A/AA over
// all 98 sections in both themes, plus the pixel probe for gradient-backed
// text). Each case computes the ratio from the colours the section actually
// renders, so a later restyle that keeps the property but loses the contrast
// still fails.
const SOURCE = 'stem_lab/stem_tool_cephalopodlab.js';
const RENDER_TIMEOUT_MS = 20000;

function renderSection(activeSection, data = {}) {
  const container = document.createElement('div');
  container.innerHTML = renderTool('cephalopodLab', {
    cephalopodLab: { activeSection, ...data },
  });
  return container;
}

function rgb(value) {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(value || '');
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  const hex = /^#([0-9a-f]{6})$/i.exec(value || '');
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16));
  return null;
}
function luminance([r, g, b]) {
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

beforeEach(() => {
  window.localStorage.clear();
  resetStemLab();
  loadTool(SOURCE, 'cephalopodLab');
});

describe('Cephalopod Lab contrast fixes', () => {
  // Native selects and number inputs keep the browser's WHITE field while
  // inheriting this tool's light ink: the species, mode, graphics and seed
  // controls measured 1.23:1. Their markup is pinned by the pass references, so
  // the fix is a section-scoped stylesheet. jsdom does not cascade
  // background-color, so this checks the cascade itself: the rule's selector
  // must match every launch field, no inline style may override it, and the
  // rule's own ink/ground pair must clear AA.
  it('paints a dark ground under every Hunter Sim launch control', () => {
    const container = renderSection('hunt', { _threeLoaded: true });
    document.body.appendChild(container);
    try {
      const fields = [...container.querySelectorAll('select, input[type="number"]')]
        .filter((el) => /Species|Mode|Graphics|World seed/.test(el.closest('label') ? el.closest('label').textContent : ''));
      expect(fields.length).toBe(4);
      const css = [...container.querySelectorAll('style')].map((st) => st.textContent).find((t) => t.includes('#cephalopod-section-panel-hunt select'));
      expect(css, 'scoped launch-control rule').toBeTruthy();
      const m = /^([^{]+)\{([^}]*)\}/.exec(css);
      const selector = m[1].trim();
      const decl = Object.fromEntries(m[2].split(';').filter(Boolean).map((d) => { const i = d.indexOf(':'); return [d.slice(0, i).trim(), d.slice(i + 1).trim()]; }));
      expect(decl['color-scheme']).toBe('dark');
      expect(ratio(rgb(decl.color), rgb(decl['background-color']))).toBeGreaterThanOrEqual(4.5);
      for (const field of fields) {
        expect(field.matches(selector), 'rule reaches ' + field.outerHTML.slice(0, 60)).toBe(true);
        expect(field.style.background + field.style.backgroundColor + field.style.color, 'inline override on ' + field.outerHTML.slice(0, 60)).toBe('');
      }
    } finally { container.remove(); }
  }, RENDER_TIMEOUT_MS);

  // The count badges sat at 4.22:1 (selected, violet) and 3.48:1 (slate) on
  // the grounds the pixel probe measured behind the filter tabs.
  it('keeps the Resources filter counts readable on their measured grounds', () => {
    const container = renderSection('resources');
    const counts = [...container.querySelectorAll('[role="tab"] span')].filter((s) => /^\s*\(\d+\)$/.test(s.textContent));
    expect(counts.length).toBeGreaterThan(1);
    const grounds = { selected: [44, 50, 117], idle: [21, 29, 59] };
    for (const span of counts) {
      const tab = span.closest('[role="tab"]');
      const ground = tab.getAttribute('aria-selected') === 'true' ? grounds.selected : grounds.idle;
      expect(ratio(rgb(span.style.color), ground)).toBeGreaterThanOrEqual(4.5);
    }
  }, RENDER_TIMEOUT_MS);

  // HOME and REFUGE were each drawn 7 px above their marker with no halo, so
  // they overprinted whenever the den and the refuge sat close on the map. The
  // REFUGE block is pinned verbatim by pass71, so HOME is the label that moves.
  it('draws HOME through a haloed helper that steps off the REFUGE label', () => {
    const source = readFileSync(SOURCE, 'utf8');
    const start = source.indexOf('function mmLabel(');
    expect(start).toBeGreaterThan(0);
    const helper = source.slice(start, source.indexOf('}', source.indexOf('return {x0:', start)) + 1);
    expect(helper).toContain('strokeText');
    expect(helper).toMatch(/Math\.max\(hw\+3,Math\.min\(W-hw-3,x\)\)/);
    // The reserved box mirrors where the pinned block draws REFUGE (same gate, 7 px up).
    expect(source).toMatch(/if\(rlx>20&&rlx<W-20&&rlz>12&&rlz<H-5\)refugeLabelBox=/);
    expect(source).toMatch(/if\(refugeLabelBox&&[^;]+\)hy=hz\+14;[^;]*mmLabel\('HOME',hx,hy,/);
    expect(source).toContain("if(refugeX>20&&refugeX<W-20&&refugeZ>12&&refugeZ<H-5)");
    expect(source).not.toMatch(/fillText\('HOME'/);
  });
});
