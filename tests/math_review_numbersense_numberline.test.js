import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// The Number Line must DRAW the quantities its questions are about: tick
// marks on whole-number / landmark values, and a place-value expansion that
// adds up to the decimal printed beside it.
//
// MR_NUMBERSENSE_NUMBERLINE_SRC points the suite at another copy of the tool
// (mutation check: the pre-fix copy must turn these red).

const FILE = process.env.MR_NUMBERSENSE_NUMBERLINE_SRC || 'stem_lab/stem_tool_numberline.js';
const W = 700, PAD = 40;

beforeEach(() => { resetStemLab(); loadTool(FILE, 'numberline'); });

function lineModel(range, challenge) {
  const html = renderTool('numberline', { _numberline: { tab: 'challenges', range, challenge } });
  const svgStart = html.indexOf('<svg', html.indexOf('allo-nl-bg-challenges'));
  const svg = html.slice(svgStart, html.indexOf('</svg>', svgStart));
  const labels = [...svg.matchAll(/<text x="([\d.]+)" y="102"[^>]*>([^<]+)<\/text>/g)].map((m) => Number(m[2].replace(/,/g, '')));
  const minorValues = [...svg.matchAll(/<line x1="([\d.]+)" y1="(?:45|52)"[^>]*stroke="#60a5fa"/g)]
    .map((m) => range.min + (Number(m[1]) - PAD) / (W - 2 * PAD) * (range.max - range.min));
  return { labels, minorValues };
}

const isMultiple = (v, step) => Math.abs(v / step - Math.round(v / step)) < 1e-6;

describe('rounding challenge lines show the multiples being rounded to', () => {
  const cases = [
    { raw: 47, base: 10, range: { min: 30, max: 60 }, landmarks: [40, 50] },
    { raw: 347, base: 100, range: { min: 200, max: 500 }, landmarks: [300, 400] },
    { raw: 4721, base: 1000, range: { min: 3000, max: 6000 }, landmarks: [4000, 5000] }
  ];
  for (const c of cases) {
    it('Round ' + c.raw + ' to the nearest ' + c.base + ': ' + c.landmarks.join(' and ') + ' are labelled', () => {
      // Before: 30..60 was labelled 30, 33, 36, 39, 42, ... - neither 40 nor 50.
      const challenge = { type: 'rounding', roundingValue: c.raw, roundingBase: c.base, answer: Math.round(c.raw / c.base) * c.base, question: 'Round ' + c.raw + ' to the nearest ' + c.base + '.' };
      const { labels, minorValues } = lineModel(c.range, challenge);
      for (const v of c.landmarks) expect(labels, 'labels ' + labels.join(', ')).toContain(v);
      for (const v of labels) expect(isMultiple(v, c.base / 2), v + ' is not a half-multiple of ' + c.base).toBe(true);
      for (const v of minorValues) expect(isMultiple(v, c.base / 10), 'minor tick at ' + v).toBe(true);
    });
  }
});

describe('integer challenges put every tick on a whole number', () => {
  for (const range of [{ min: -20, max: 20 }, { min: -5, max: 20 }]) {
    it('range ' + range.min + '..' + range.max, () => {
      // Before: -20..20 drew minor ticks every 0.8, so an arrow on 7 sat between ticks.
      const challenge = { type: 'identify', _arrowValue: 7, answer: 7, question: 'What number does the arrow point to?' };
      const { labels, minorValues } = lineModel(range, challenge);
      expect(labels.length).toBeGreaterThan(3);
      for (const v of labels.concat(minorValues)) expect(Number.isInteger(Math.round(v * 1e6) / 1e6), 'tick at ' + v).toBe(true);
      // Every whole number in range is a tick (major or minor).
      const all = new Set(labels.concat(minorValues).map((v) => Math.round(v)));
      for (let n = range.min; n <= range.max; n++) expect(all.has(n), 'no tick at ' + n).toBe(true);
    });
  }

  it('leaves the default 0..20 explore line exactly as before (one tick per unit)', () => {
    const html = renderTool('numberline', {});
    const labels = [...html.matchAll(/<text x="([\d.]+)" y="102"[^>]*>([^<]+)<\/text>/g)].map((m) => Number(m[2]));
    expect(labels).toEqual(Array.from({ length: 21 }, (_, i) => i));
  });
});

describe('place-value expansion', () => {
  const expansionOf = (fdValue) => {
    const html = renderTool('numberline', { _numberline: { tab: 'fracdec', fdValue, fdDen: 4, fdMin: -2, fdMax: 2, fdShowExpansion: true } });
    const m = /font-mono">([^<]*?) = ([^<]*?)<\/p>/.exec(html.slice(html.indexOf('Place-value expansion')));
    expect(m, 'expansion paragraph').not.toBeNull();
    return { decimal: m[1], expansion: m[2] };
  };
  // Read the expansion LITERALLY: "-1 + 5/10" is -0.5; only "-( ... )" negates a whole sum.
  const evaluate = (expr) => {
    const grouped = /^-\((.*)\)$/.exec(expr);
    const body = grouped ? grouped[1] : expr;
    const sum = body.split(' + ').reduce((acc, term) => {
      const f = /^(-?)(\d+)\/(\d+)$/.exec(term);
      return acc + (f ? (f[1] ? -1 : 1) * Number(f[2]) / Number(f[3]) : Number(term));
    }, 0);
    return grouped ? -sum : sum;
  };

  for (const v of [-0.25, -1.25, -1.5, -0.6, 0.625, 1.75, 0.3]) {
    it(v + ' expands to terms that add back to the decimal shown', () => {
      // Before: -0.25 printed "-2/10 + 5/100", which is -0.15.
      const { decimal, expansion } = expansionOf(v);
      expect(Number(decimal)).toBe(v);
      expect(Math.abs(evaluate(expansion) - v), decimal + ' = ' + expansion).toBeLessThan(1e-9);
    });
  }

  it('negative expansions group the whole sum', () => {
    expect(expansionOf(-0.25).expansion).toBe('-(2/10 + 5/100)');
    expect(expansionOf(-0.6).expansion).toBe('-6/10');
  });
});
