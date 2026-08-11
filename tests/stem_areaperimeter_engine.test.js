import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Machine verification for the Area & Perimeter Lab. The tool exports a frozen
// AreaPerimeterPure module clearly built for testing, but this suite was never
// written. The whole file loads with an injected window; the challenge bank is
// additionally executed from a source slice and verified against its own math.

const src = fs.readFileSync('stem_lab/stem_tool_areaperimeter.js', 'utf8');
const publicSrc = () => fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_areaperimeter.js', 'utf8');

const win = {};
// eslint-disable-next-line no-new-func
new Function('window', src)(win);
const Pure = win.AreaPerimeterPure;

describe('module registration', () => {
  it('registers areaPerimeter and freezes the pure module', () => {
    expect(win.StemLab.isRegistered('areaPerimeter')).toBe(true);
    expect(Object.isFrozen(Pure)).toBe(true);
  });
});

describe('rectangleMetrics', () => {
  it('computes area and perimeter', () => {
    expect(Pure.rectangleMetrics(6, 4)).toEqual({ area: 24, perimeter: 20 });
    expect(Pure.rectangleMetrics(1, 1)).toEqual({ area: 1, perimeter: 4 });
  });

  it('treats invalid or negative dimensions as zero', () => {
    expect(Pure.rectangleMetrics(-3, 4)).toEqual({ area: 0, perimeter: 8 });
    expect(Pure.rectangleMetrics('nope', 4).area).toBe(0);
  });
});

describe('compositeMetrics (L-shape)', () => {
  it('area = whole minus notch; perimeter equals the OUTER rectangle perimeter', () => {
    // Removing a corner notch does not change the perimeter: the two inner cut
    // edges exactly replace the outer edges they displaced.
    const m = Pure.compositeMetrics(10, 8, 4, 3);
    expect(m.cutWidth).toBe(6);
    expect(m.area).toBe(80 - 18);
    expect(m.perimeter).toBe(36);
  });

  it('boundaryEdges walk sums to the perimeter', () => {
    for (const [W, H, L, N] of [[10, 8, 4, 3], [14, 12, 1, 11], [5, 4, 4, 1]]) {
      const m = Pure.compositeMetrics(W, H, L, N);
      const sum = m.boundaryEdges.reduce((a, b) => a + b, 0);
      expect(sum, W + 'x' + H).toBe(m.perimeter);
      expect(m.area).toBe(W * H - m.cutWidth * N);
    }
  });

  it('clamps the left width and notch into the outer rectangle', () => {
    const m = Pure.compositeMetrics(10, 8, 25, 99);
    expect(m.cutWidth).toBe(0);
    expect(m.area).toBe(80);
  });
});

describe('factorPairs', () => {
  it('returns every factor pair with its perimeter', () => {
    const pairs = Pure.factorPairs(24);
    expect(pairs.map((p) => p.w + 'x' + p.h)).toEqual(['24x1', '12x2', '8x3', '6x4']);
    for (const p of pairs) {
      expect(p.w * p.h).toBe(24);
      expect(p.p).toBe(2 * (p.w + p.h));
    }
  });

  it('the most-square pair always has the least perimeter (the lab\'s key insight)', () => {
    for (const target of [12, 18, 24, 30, 36]) {
      const pairs = Pure.factorPairs(target);
      const least = pairs.slice().sort((a, b) => a.p - b.p)[0];
      const mostSquare = pairs.slice().sort((a, b) => (a.w - a.h) - (b.w - b.h))[0];
      expect(least, 'area ' + target).toBe(mostSquare);
    }
    expect(Pure.factorPairs(36).find((p) => p.p === 24)).toMatchObject({ w: 6, h: 6 });
  });

  it('rejects invalid input', () => {
    expect(Pure.factorPairs(0)).toEqual([]);
    expect(Pure.factorPairs('x')).toEqual([]);
  });
});

describe('answer + tile validation', () => {
  it('numeric answers accept float noise but not wrong values or blanks', () => {
    expect(Pure.isCorrectNumericAnswer('28', 28)).toBe(true);
    expect(Pure.isCorrectNumericAnswer(' 28 ', 28)).toBe(true);
    expect(Pure.isCorrectNumericAnswer(28.0000001, 28)).toBe(true);
    expect(Pure.isCorrectNumericAnswer('28.1', 28)).toBe(false);
    expect(Pure.isCorrectNumericAnswer('', 0)).toBe(false);
    expect(Pure.isCorrectNumericAnswer('abc', 28)).toBe(false);
  });

  it('tile keys must round-trip and stay inside the grid', () => {
    expect(Pure.isValidTileKey('3-2', 6, 4)).toBe(true);
    expect(Pure.isValidTileKey('03-2', 6, 4)).toBe(false);
    expect(Pure.isValidTileKey('6-0', 6, 4)).toBe(false);
    expect(Pure.isValidTileKey('0-4', 6, 4)).toBe(false);
    expect(Pure.countValidTiles({ '0-0': true, '5-3': true, '6-0': true, 'x': true }, 6, 4)).toBe(2);
  });

  it('clampInteger rounds and pins to range, mapping non-numbers to the minimum', () => {
    expect(Pure.clampInteger(7.6, 1, 20)).toBe(8);
    expect(Pure.clampInteger(99, 1, 20)).toBe(20);
    expect(Pure.clampInteger('nope', 1, 20)).toBe(1);
  });
});

describe('challenge progress', () => {
  it('normalizes both id keys and legacy numeric-index keys', () => {
    const byId = Pure.normalizeChallengeProgress({ 'garden-area': true });
    expect(byId['garden-area']).toBe(true);
    const byIndex = Pure.normalizeChallengeProgress({ 0: true, 4: true });
    expect(byIndex['garden-area']).toBe(true);
    expect(byIndex['l-shape-area']).toBe(true);
    expect(Pure.challengeProgressCount({ 'garden-area': true, bogus: true })).toBe(1);
  });
});

// ── The challenge bank, executed from source and verified against its own math ──
const CHALLENGES = (() => {
  const start = src.indexOf('var CHALLENGES = [');
  const end = src.indexOf('];', start);
  expect(start).toBeGreaterThan(-1);
  // eslint-disable-next-line no-new-func
  return new Function('t', src.slice(start, end + 2) + '\nreturn CHALLENGES;')((k, fb) => fb);
})();

describe('challenge bank', () => {
  it('has the ten expected ids in registry order', () => {
    expect(CHALLENGES.map((c) => c.id)).toEqual(Pure.challengeIds);
  });

  it('every answer is provably correct for its kind', () => {
    for (const c of CHALLENGES) {
      if (c.kind === 'rect') {
        expect(c.answer, c.id).toBe(c.answerType === 'area' ? c.w * c.h : 2 * (c.w + c.h));
      } else if (c.kind === 'composite') {
        expect(c.answer, c.id).toBe(c.outerW * c.outerH - c.cutW * c.cutH);
      } else if (c.kind === 'compare') {
        expect(c.w * c.h, c.id + ' equal areas').toBe(c.w2 * c.h2);
        expect(c.answer, c.id).toBe(Math.abs(2 * (c.w + c.h) - 2 * (c.w2 + c.h2)));
      } else if (c.kind === 'missing') {
        expect([c.w, c.h], c.id).toContain(c.answer);
      }
      expect(c.explanation, c.id + ' explanation names the answer').toContain(String(c.answer));
      expect(['foundations', 'reasoning', 'stretch'], c.id).toContain(c.difficulty);
    }
  });

  it('the numbers quoted in each prompt match the stored dimensions', () => {
    for (const c of CHALLENGES) {
      if (c.kind === 'rect') {
        expect(c.prompt, c.id).toContain(String(c.w));
        expect(c.prompt, c.id).toContain(String(c.h));
      } else if (c.kind === 'composite') {
        for (const n of [c.outerW, c.outerH, c.cutW, c.cutH]) expect(c.prompt, c.id).toContain(String(n));
      }
    }
  });
});

describe('i18n (source pins)', () => {
  it('the three previously hardcoded strings go through t()', () => {
    expect(src).toContain("t('stem.areaperimeter.hid', \"Hid\")");
    expect(src).toContain("t('stem.areaperimeter.drawn_with_the_same_unit_scale'");
    expect(src).toContain("t('stem.areaperimeter.subtract', \"subtract\")");
  });
});

describe('deployment copies', () => {
  it('public mirror is byte-identical to the root copy', () => {
    expect(publicSrc()).toBe(src);
  });
});
