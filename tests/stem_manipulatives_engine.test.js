import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Machine verification for the Math Manipulatives lab. Every mathematical
// claim asserted below is recomputed independently in this file.

const sourcePath = 'stem_lab/stem_tool_manipulatives.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_manipulatives.js';
const src = fs.readFileSync(sourcePath, 'utf8');

function extractLiteral(startMarker, endMarker) {
  const start = src.indexOf(startMarker);
  const end = src.indexOf(endMarker, start);
  expect(start, startMarker + ' present in source').toBeGreaterThan(-1);
  expect(end, endMarker + ' bounds ' + startMarker).toBeGreaterThan(start);
  const chunk = src.slice(start, end);
  const objText = chunk.slice(chunk.indexOf('=') + 1, chunk.lastIndexOf(';'));
  // eslint-disable-next-line no-new-func
  return new Function('return (' + objText + ')')();
}

beforeEach(() => {
  resetStemLab();
  loadTool(sourcePath, 'base10');
});

describe('CCSS standards map', () => {
  const map = extractLiteral('var STANDARDS_MAP =', 'var MANIP_PALETTES');

  it('every code is well-formed CCSS math notation and grade-consistent', () => {
    for (const manip of Object.keys(map)) {
      for (const std of map[manip]) {
        expect(std.code, manip).toMatch(/^[K1-7]\.(CC|OA|NBT|NF|MD|G|NS)\.[A-D]\.\d+(\.[a-z])?$/);
        expect(std.code.split('.')[0], manip + ' ' + std.code).toBe(std.grade);
        expect(std.desc.length, std.code).toBeGreaterThan(20);
      }
    }
  });

  it('pins the anchor standards', () => {
    expect(map.blocks.map((s) => s.code)).toContain('K.NBT.A.1');
    expect(map.tenFrame.map((s) => s.code)).toContain('K.OA.A.4');
    expect(map.geoboard.map((s) => s.code)).toContain('3.MD.D.8');
  });
});

describe('pattern-block fractions', () => {
  it('trapezoid, rhombus, and triangle values compose a whole hexagon', () => {
    // 2 trapezoids = 3 rhombi = 6 triangles = 1 hexagon.
    const trap = /id:\s*'trap',[^}]*value:\s*([\d./]+)/.exec(src);
    const rhom = /id:\s*'rhombus_blue',[^}]*value:\s*([\d./]+)/.exec(src);
    const tri = /id:\s*'triangle',[^}]*value:\s*([\d./]+)/.exec(src);
    // eslint-disable-next-line no-new-func
    const num = (m) => new Function('return (' + m[1] + ')')();
    expect(2 * num(trap)).toBeCloseTo(1, 12);
    expect(3 * num(rhom)).toBeCloseTo(1, 12);
    expect(6 * num(tri)).toBeCloseTo(1, 12);
  });

  it('the prose teaches 2 trapezoids per hexagon, never 6 (regression pin)', () => {
    expect(src).toContain('2 trapezoids = 1 hexagon');
    expect(src).not.toContain('6 trapezoids = 1 hexagon');
    expect(src).not.toContain('six trapezoids');
  });
});

describe('lang packs carry the corrected trapezoid fact', () => {
  // The "6 trapezoids = 1 hexagon" error shipped translated into every pack.
  // Invariant: within that key's value, the first digit from {two, six} in
  // any numeral system is a TWO — the wrong leading six is gone, while the
  // legitimate later sixes (6 triangles, 1/6) survive.
  const KEY = 'hexagon_trapezoid_rhombus_triangle_squ';
  const TWOS = ['2', '٢', '۲', '२', '২', '၂', '๒', '໒', '២', '༢'];
  const SIXES = ['6', '٦', '۶', '६', '৬', '၆', '๖', '໖', '៦', '༦'];

  for (const dir of ['lang', 'desktop/web-app/public/lang']) {
    it(dir + ': first two-or-six digit in the value is a two, in all packs', () => {
      let checked = 0;
      for (const file of fs.readdirSync(dir)) {
        if (!file.endsWith('.js')) continue;
        const pack = fs.readFileSync(dir + '/' + file, 'utf8');
        const keyAt = pack.indexOf(KEY);
        if (keyAt < 0) continue;
        const m = /^"?\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(pack.slice(keyAt + KEY.length));
        expect(m, file).toBeTruthy();
        const value = m[1];
        let firstTwo = Infinity;
        let firstSix = Infinity;
        for (const ch of TWOS) { const at = value.indexOf(ch); if (at >= 0) firstTwo = Math.min(firstTwo, at); }
        for (const ch of SIXES) { const at = value.indexOf(ch); if (at >= 0) firstSix = Math.min(firstSix, at); }
        expect(firstTwo, dir + '/' + file + ' :: ' + value.slice(0, 90)).toBeLessThan(firstSix);
        checked++;
      }
      expect(checked).toBeGreaterThanOrEqual(60);
    });
  }
});

describe('slide rule', () => {
  const problems = extractLiteral('var srProblems =', 'var abacusFacts');

  it('the instructed procedure now reads the right answer for every practice problem', () => {
    // Left index (C-1 over a) when the answer stays on-scale, right index
    // (C-10 over a, read D x 10) when it passes 10 — exactly what the
    // on-screen hint teaches. Replicates the tool's readout model.
    for (const p of problems) {
      const wrap = p.answer > 10;
      const cOffset = Math.log10(p.a) - (wrap ? 1 : 0);
      expect(cOffset, p.a + 'x' + p.b + ' offset reachable').toBeGreaterThanOrEqual(-1);
      expect(cOffset).toBeLessThanOrEqual(1);
      const cursorPos = cOffset + Math.log10(p.b);
      expect(cursorPos, p.a + 'x' + p.b + ' cursor on-scale').toBeGreaterThanOrEqual(0);
      expect(cursorPos).toBeLessThanOrEqual(1 + 1e-9);
      const dVal = Math.pow(10, cursorPos);
      const product = dVal * (cOffset < 0 ? 10 : 1);
      expect(Math.abs(product - p.answer), p.a + 'x' + p.b).toBeLessThanOrEqual(p.answer * 0.15);
      expect(product).toBeCloseTo(p.answer, 6);
    }
  });

  it('regression pins: no double-counted slide factor, wrap-capable clamp', () => {
    expect(src).toContain('var product = dVal * (srWrapped ? 10 : 1);');
    expect(src).not.toContain('dVal * Math.pow(10, sr.cOffset');
    expect(src).toContain('cOffset: Math.max(-1, Math.min(1, normX');
  });
});

describe('place-value quiz generator', () => {
  const fnStart = src.indexOf('function generatePVQuiz()');
  const fnEnd = src.indexOf('var srProblems');
  const fnText = src.slice(fnStart, src.lastIndexOf('}', fnEnd) + 1);
  // eslint-disable-next-line no-new-func
  const generatePVQuiz = new Function('return (' + fnText + ')')();

  it('300 generated questions all have self-consistent answers', () => {
    for (let i = 0; i < 300; i++) {
      const q = generatePVQuiz();
      expect(q.opts, q.q).toContain(q.answer);
      expect(q.opts.length, q.q).toBeGreaterThanOrEqual(2);
      if (q.type === 'expanded_to_standard') {
        const sum = q.q.replace('What number is ', '').replace('?', '').split('+')
          .reduce((acc, part) => acc + Number(part.replace(/[^\d]/g, '') || 0), 0);
        expect(String(sum), q.q).toBe(q.answer);
      } else if (q.type === 'round') {
        const m = /Round ([\d,]+) to the nearest ([\d,]+):/.exec(q.q);
        const n = Number(m[1].replace(/,/g, ''));
        const to = Number(m[2].replace(/,/g, ''));
        expect(String(Math.round(n / to) * to), q.q).toBe(q.answer);
      } else if (q.type === 'compare') {
        const m = /([\d,]+) ___ ([\d,]+)/.exec(q.q);
        const a = Number(m[1].replace(/,/g, ''));
        const b = Number(m[2].replace(/,/g, ''));
        expect(a > b ? '>' : a < b ? '<' : '=', q.q).toBe(q.answer);
      } else if (q.type === 'digit_place') {
        const m = /What digit is in the (\w+) place of ([\d,]+)\?/.exec(q.q);
        const n = Number(m[2].replace(/,/g, ''));
        const div = { ones: 1, tens: 10, hundreds: 100, thousands: 1000 }[m[1]];
        expect(String(Math.floor(n / div) % 10), q.q).toBe(q.answer);
      }
    }
  });
});

describe('geoboard', () => {
  it('renders the perimeter of a 3x3 square as 12.00', () => {
    const html = renderTool('base10', { _manipulatives: { mode: 'geoboard', geoboardSegments: [
      { x1: 0, y1: 0, x2: 3, y2: 0 }, { x1: 3, y1: 0, x2: 3, y2: 3 },
      { x1: 3, y1: 3, x2: 0, y2: 3 }, { x1: 0, y1: 3, x2: 0, y2: 0 }
    ] } });
    expect(html).toContain('12.00');
  });

  it('challenge validators: square puzzle demands a square, degenerate polygons rejected (pins)', () => {
    expect(src).toContain("type: 'square', target: 12");
    expect(src).toContain('var segsFormAxisSquare = function(segs)');
    expect(src).toContain('var cycleArea = function(segs)');
    expect(src).toContain('lie on one line');
  });
});

describe('deployment copies', () => {
  it('public mirror is byte-identical to the root copy', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(src);
  });
});
