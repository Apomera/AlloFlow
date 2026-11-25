// Kepler Colony 2026-11-23 round 3: the loop strip and the 2D colony diagram used
// 10-11 unit text, and the diagram's 780-unit viewBox shrank it to about 5 px on a
// phone. Every label must reach 12 CSS px, or move to a readable legend.
// SPACECOLONY_SVG_SRC points at another copy (fail-first check against start_r3.js).
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.SPACECOLONY_SVG_SRC || 'stem_lab/stem_tool_spacecolony.js';
const SRC = readFileSync(resolve(process.cwd(), FILE), 'utf8');
function toolPath() {
  if (!process.env.SPACECOLONY_SVG_SRC) return FILE;
  const dir = mkdtempSync(join(tmpdir(), 'sc-svg-'));
  const out = join(dir, 'stem_tool_spacecolony.js');
  writeFileSync(out, SRC);
  return out;
}

function render(data) {
  loadTool(toolPath(), 'spaceColony');
  const html = renderTool('spaceColony', data || {});   // this tool reads ctx.toolData flat
  const doc = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html');
  const section = doc.querySelector('[data-centauri-habitat]');
  expect(section, 'habitat command section renders').toBeTruthy();
  return { doc, section };
}
function fontUnits(el) {
  const inline = el.style && el.style.fontSize;
  return parseFloat(inline || el.getAttribute('font-size'));
}

describe('Kepler Colony SVG text is readable at phone width', () => {
  beforeEach(() => resetStemLab());

  it('the loop strip draws 1 unit = 1 CSS px and every label is at least 12 px', () => {
    const { section } = render();
    const svg = section.querySelector('.sc-loop-strip svg');
    expect(svg).toBeTruthy();
    const vb = svg.getAttribute('viewBox').split(/\s+/).map(Number);
    expect(Number(svg.getAttribute('width'))).toBe(vb[2]);
    expect(Number(svg.getAttribute('height'))).toBe(vb[3]);
    const texts = [...svg.querySelectorAll('text')];
    expect(texts.length).toBe(6);
    for (const t of texts) expect(fontUnits(t), t.textContent).toBeGreaterThanOrEqual(12);
  });

  it('the 2D diagram shows its labels only where they reach 12 px, and a legend carries them otherwise', () => {
    const { section } = render({ colonyBuildings: ['hydroponics'], colonyTerraform: 37 });
    const svg = [...section.querySelectorAll('svg')].find(s => s.getAttribute('viewBox') === '0 0 780 310');
    expect(svg).toBeTruthy();
    const texts = [...svg.querySelectorAll('text')];
    expect(texts.length).toBeGreaterThanOrEqual(9);
    const minUnits = Math.min(...texts.map(fontUnits));
    expect(minUnits).toBeGreaterThanOrEqual(13);
    for (const t of texts) expect(t.getAttribute('class') || '', t.textContent).toContain('sc-diag-label');
    // the container query that hides them must switch over before the smallest label drops under 12 px
    const css = [...section.querySelectorAll('style')].map(s => s.textContent).join('\n');
    const m = css.match(/@container \(max-width:(\d+)px\)\{[^{}]*\.sc-diag-label\{display:none\}/);
    expect(m, 'container query hides the in-picture labels').toBeTruthy();
    const firstShownWidth = Number(m[1]) + 1;
    expect(minUnits * (firstShownWidth - 2) / 780).toBeGreaterThanOrEqual(12);
    expect(css).toMatch(/\.sc-diag-wrap\{container-type:inline-size\}/);
    expect(svg.parentElement.getAttribute('class')).toBe('sc-diag-wrap');
    // the legend repeats every label in HTML text of 12 px or more
    const legend = section.querySelector('[data-sc-diagram-legend]');
    expect(legend).toBeTruthy();
    expect(legend.parentElement).toBe(svg.parentElement);
    const lt = legend.textContent;
    expect(lt).toContain('1/3 loops online · terraform 37%');
    expect(lt).toMatch(/Left: Food loop · online/);
    expect(lt).toMatch(/Middle: Water loop · planned/);
    expect(lt).toMatch(/Right: Power loop · planned/);
    expect(lt).toContain('sealed habitat');
    expect(lt).toContain('Illustrative scene');
    for (const el of legend.querySelectorAll('p, li')) expect(parseFloat(el.style.fontSize)).toBeGreaterThanOrEqual(12);
    // and the picture's text alternative names the same summary
    expect(svg.getAttribute('aria-label')).toContain('1/3 loops online · terraform 37%');
  });
});
