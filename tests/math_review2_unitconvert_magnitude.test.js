// Math review 2 (2026-10-19): the Magnitude widget's "tiny" band (< 2 orders
// of magnitude) used cm -> m as its example. cm -> m is exactly 2 orders, so
// setting the sliders to that very example (10^-2 -> 10^0) lands in the
// "small" band and shows a different example. Every band's own example must
// classify into that band.
// MATH_REVIEW2_UNITCONVERT_SRC lets a mutation run point this at a variant.
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = process.env.MATH_REVIEW2_UNITCONVERT_SRC || 'stem_lab/stem_tool_unitconvert.js';
const SI = { p: -12, n: -9, 'µ': -6, u: -6, m: -3, c: -2, d: -1, '': 0, da: 1, h: 2, k: 3, M: 6, G: 9, T: 12 };
const BASE_UNITS = ['m', 'g', 'L', 's'];

// "cm" -> -2, "kg" -> 3, "m" -> 0. Returns null for anything else.
function exponent(unit) {
  for (const base of BASE_UNITS) {
    if (unit.endsWith(base)) {
      const prefix = unit.slice(0, unit.length - base.length);
      if (Object.prototype.hasOwnProperty.call(SI, prefix)) return SI[prefix];
    }
  }
  return null;
}

beforeEach(() => {
  resetStemLab();
  loadTool(SOURCE, 'unitConvert');
});

function band(sourceExp, targetExp) {
  const html = renderTool('unitConvert', { unitConvert: { tab: 'magHunt', magHunt: { sourceExp, targetExp, hypothesis: '', log: [] } } });
  const host = document.createElement('div');
  host.innerHTML = html;
  const readout = Array.from(host.querySelectorAll('div.font-mono')).find((el) => /OOM\)/.test(el.textContent));
  expect(readout, 'no magnitude readout for ' + sourceExp + ' -> ' + targetExp).toBeTruthy();
  const card = readout.parentElement;
  return { label: card.children[0].textContent.trim(), desc: card.children[1].textContent.trim() };
}

describe('Magnitude bands and their examples', () => {
  it('every unit-pair example sits in the band that cites it', () => {
    // One slider setting per band, from the band edges in the tool.
    const seen = [[0, 1], [0, 3], [0, 6], [0, 10], [0, 15]].map(([s, t]) => band(s, t));
    expect(new Set(seen.map((b) => b.label)).size, 'expected five distinct bands').toBe(5);
    let checked = 0;
    for (const b of seen) {
      const m = /\(([^()→]+)→([^()]+)\)/.exec(b.desc);
      if (!m) continue;
      const from = exponent(m[1].trim());
      const to = exponent(m[2].trim());
      expect(from, 'cannot read unit ' + m[1]).not.toBeNull();
      expect(to, 'cannot read unit ' + m[2]).not.toBeNull();
      const own = band(from, to);
      expect(own.label, b.label + ' cites ' + m[0] + ', which is ' + Math.abs(to - from) + ' OOM and lands in ' + own.label).toBe(b.label);
      checked++;
    }
    expect(checked, 'the tiny and small bands both cite a unit pair').toBeGreaterThanOrEqual(2);
  });

  it('cm -> m (2 orders) is a small change, not a tiny one', () => {
    const b = band(-2, 0);
    expect(b.label).toMatch(/Small/);
    const tiny = band(0, 1);
    expect(tiny.desc, 'tiny band still cites cm -> m').not.toMatch(/cm→m/);
  });
});
