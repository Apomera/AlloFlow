import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';

// The area model dropped a partial's label whenever its band was under 22px,
// which on the shipped problem 308 x 24 hid 8x20 and 8x4 -- the two partials a
// student is most likely to forget, and exactly what error case e3 teaches.
// The text list below the diagram still carried them, so the picture and the
// text disagreed about what existed.

const src = fs.readFileSync('stem_lab/stem_tool_arithmetic.js', 'utf8');

function render(a, b, theme) {
  theme = theme || {};
  resetStemLab();
  loadTool('stem_lab/stem_tool_arithmetic.js', 'arithmeticStudio');
  const ctx = {
    React, toolData: { _arithmeticStudio: { tab: 'learn', operation: 'multiply', a, b } },
    isDark: !!theme.dark, isContrast: !!theme.contrast, setToolData() {}, updateMulti() {}
  };
  return ReactDOMServer.renderToStaticMarkup(window.StemLab._registry.arithmeticStudio.render(ctx));
}

const labelsIn = (html) => [...html.matchAll(/data-partial-label="([^"]+)"/g)].map((m) => m[1]);
const partialsIn = (html) => [...html.matchAll(/data-partial-product="(\d+)"/g)].map((m) => Number(m[1]));

// Multiplication operands from the shipped bank, so a bank edit cannot dodge
// this gate. m5 (308 x 24) is the case that exposed the defect.
const MULTIPLY = (() => {
  const flat = src.replace(/\s+/g, '');
  const re = /id:'(m\d+)',op:'multiply',level:\d+,a:(\d+),b:(\d+)/g;
  const out = [];
  let m;
  while ((m = re.exec(flat)) !== null) out.push({ id: m[1], a: Number(m[2]), b: Number(m[3]) });
  return out;
})();

describe('area-model partial labels', () => {
  it('finds the shipped multiplication problems, including 308 x 24', () => {
    expect(MULTIPLY.length).toBeGreaterThan(0);
    expect(MULTIPLY.some((p) => p.a === 308 && p.b === 24)).toBe(true);
  });

  it('labels every partial the diagram draws, on every shipped problem', () => {
    for (const { id, a, b } of MULTIPLY) {
      const html = render(a, b);
      const drawn = partialsIn(html);
      if (!drawn.length) continue; // small operands use the dot-array model
      expect(labelsIn(html).length, `${id} (${a} x ${b})`).toBe(drawn.length);
    }
  });

  it('shows all four partials for 308 x 24, not just the two wide ones', () => {
    const html = render(308, 24);
    expect(partialsIn(html).sort((x, y) => x - y)).toEqual([32, 160, 1200, 6000]);
    expect(labelsIn(html).sort()).toEqual(['A', 'B', 'C', 'D']);
  });

  it('keeps every label inside the diagram', () => {
    // Labels for thin bands move outside the band; they must not leave the
    // 360-wide viewBox, or they are hidden in a different way.
    for (const [a, b] of [[308, 24], [99, 99], [24, 13], [47, 6]]) {
      const html = render(a, b);
      const xs = [...html.matchAll(/<text[^>]*x="([\d.]+)"[^>]*data-partial-label=/g)].map((m) => Number(m[1]));
      for (const x of xs) {
        expect(x, `${a} x ${b} label at x=${x}`).toBeGreaterThanOrEqual(0);
        expect(x, `${a} x ${b} label at x=${x}`).toBeLessThanOrEqual(360);
      }
    }
  });

  it('the picture and the text list agree on which partials exist', () => {
    for (const { id, a, b } of MULTIPLY) {
      const html = render(a, b);
      const drawn = partialsIn(html);
      if (!drawn.length) continue;
      // Every drawn partial's product appears in the text summary too.
      for (const product of drawn) expect(html, `${id}: ${product}`).toContain('= ' + product);
    }
  });

  it('does not pin a light background with theme-following ink', () => {
    // The summary panel hardcoded #f5f3ff and set no colour, so dark mode put
    // light ink on a near-white card.
    const i = src.indexOf("partials.map(function(part) { return h('p'");
    const panel = src.slice(Math.max(0, i - 400), i);
    expect(panel).toContain('isDark');
    expect(panel).toContain('isContrast');
  });

  it('renders the area model in dark and high-contrast themes', () => {
    for (const theme of [{ dark: true }, { contrast: true }, { dark: true, contrast: true }]) {
      const html = render(308, 24, theme);
      expect(labelsIn(html).length, JSON.stringify(theme)).toBe(4);
    }
  });

  it('ships the same model in the public mirror', () => {
    expect(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_arithmetic.js', 'utf8')).toBe(src);
  });
});
