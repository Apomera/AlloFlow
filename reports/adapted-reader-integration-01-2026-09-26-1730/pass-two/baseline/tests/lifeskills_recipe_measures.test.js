import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE = 'stem_lab/stem_tool_lifeskills.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_lifeskills.js';
const read = (f) => readFileSync(resolve(process.cwd(), f), 'utf8');

function bodyOf(src, name) {
  const i = src.indexOf('function ' + name + '(');
  if (i === -1) return null;
  let depth = 0, started = false;
  for (let j = i; j < src.length; j += 1) {
    if (src[j] === '{') { depth += 1; started = true; }
    else if (src[j] === '}') { depth -= 1; if (started && depth === 0) return src.slice(i, j + 1); }
  }
  return null;
}
function loadFns(file) {
  const src = read(file);
  const out = {};
  for (const n of ['fmtCookAmount', 'fmtCookItem', 'fmtCookUnit']) {
    const b = bodyOf(src, n);
    if (!b) throw new Error(n + ' not found in ' + file);
    // eslint-disable-next-line no-new-func
    out[n] = new Function(b + '; return ' + n + ';')();
  }
  return out;
}
function arrayLiteral(src, name) {
  const start = src.indexOf('var ' + name + ' = [');
  if (start === -1) return null;
  const end = src.indexOf('\n  ];', start);
  if (end === -1) return null;
  return src.slice(src.indexOf('[', start), end + 4);
}
// eslint-disable-next-line no-new-func
const load = (src, n) => new Function('return ' + arrayLiteral(src, n) + ';')();

describe('Life Skills Lab — recipe measurements', () => {
  it('shows the recipe unchanged at 1x', () => {
    // THE BUG. Display was `scaled.toFixed(1)` above 1, so a stored 2.25 cups of
    // flour rendered as "2.3 cups" and 1.25 cups of milk as "1.3" — the tool
    // misreported its OWN recipe at its own scale, before any scaling happened.
    const { fmtCookAmount } = loadFns(SOURCE);
    const recipes = load(read(SOURCE), 'RECIPES');
    const parse = (s) => {
      const m = String(s).trim().match(/^(?:(\d+)\s+)?(?:(\d+)\/(\d+))?$/);
      if (!m) return parseFloat(s);
      return (parseInt(m[1] || '0', 10)) + (m[2] ? parseInt(m[2], 10) / parseInt(m[3], 10) : 0);
    };
    for (const r of recipes) {
      for (const ing of r.ingredients) {
        expect(parse(fmtCookAmount(ing.amount)), `${r.name} / ${ing.item}`)
          .toBeCloseTo(ing.amount, 6);
      }
    }
  });

  it('uses fractions a measuring cup actually has', () => {
    // "0.38 cup sugar" is not a measurement anyone can make.
    const { fmtCookAmount } = loadFns(SOURCE);
    expect(fmtCookAmount(2.25)).toBe('2 1/4');
    expect(fmtCookAmount(0.375)).toBe('3/8');
    expect(fmtCookAmount(1.125)).toBe('1 1/8');
    expect(fmtCookAmount(1.25)).toBe('1 1/4');
    expect(fmtCookAmount(0.125)).toBe('1/8');
    expect(fmtCookAmount(3.75)).toBe('3 3/4');
    expect(fmtCookAmount(10.5)).toBe('10 1/2');
  });

  it('keeps whole numbers whole', () => {
    const { fmtCookAmount } = loadFns(SOURCE);
    expect(fmtCookAmount(1)).toBe('1');
    expect(fmtCookAmount(3)).toBe('3');
    expect(fmtCookAmount(16)).toBe('16');
  });

  it('falls back to a number when the value is not a kitchen fraction', () => {
    // 1/16 is not 1/8, and pretending otherwise would be a 100% error. Better a
    // decimal the student can reason about than a confidently wrong fraction.
    const { fmtCookAmount } = loadFns(SOURCE);
    expect(fmtCookAmount(0.0625)).toBe('0.06');
    expect(fmtCookAmount(0)).toBe('0');
    expect(fmtCookAmount(-1)).toBe('0');
    expect(fmtCookAmount(Number.NaN)).toBe('0');
    expect(fmtCookAmount('x')).toBe('0');
  });

  it('never scales a stored amount into a wrong fraction', () => {
    // Across every ingredient and a range of scales, what is shown must be within
    // half a 1/8 step of the true value — or be an explicit decimal.
    const { fmtCookAmount } = loadFns(SOURCE);
    const recipes = load(read(SOURCE), 'RECIPES');
    const parse = (s) => {
      const t = String(s).trim();
      const m = t.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);
      if (m) return parseInt(m[1] || '0', 10) + parseInt(m[2], 10) / parseInt(m[3], 10);
      return parseFloat(t);
    };
    for (const r of recipes) {
      for (const ing of r.ingredients) {
        for (const s of [0.5, 1, 1.5, 2, 3, 4]) {
          const exact = ing.amount * s;
          const shown = parse(fmtCookAmount(exact));
          expect(Math.abs(shown - exact), `${r.name} ${ing.item} x${s}`).toBeLessThanOrEqual(0.0626);
        }
      }
    }
  });

  it('agrees in number with what is displayed, not the raw float', () => {
    // Half an egg displays as "1/2" and must read "1/2 egg"; a 0.5 that rounds for
    // display to "1" must read "1 egg", not "1 eggs".
    const { fmtCookItem } = loadFns(SOURCE);
    expect(fmtCookItem('eggs', '1')).toBe('egg');
    expect(fmtCookItem('egg', '1')).toBe('egg');
    expect(fmtCookItem('egg', '2')).toBe('eggs');
    expect(fmtCookItem('eggs', '1/2')).toBe('egg');
    expect(fmtCookItem('eggs', '6')).toBe('eggs');
    // Uncountable items are left alone.
    expect(fmtCookItem('flour', '2')).toBe('flour');
    expect(fmtCookItem('chocolate chips', '1')).toBe('chocolate chips');
  });

  it('inflects spelled-out units in both directions', () => {
    // Units are stored inconsistently ("cups" flour, "cup" butter), so the
    // formatter has to singularise AND pluralise. Abbreviations never inflect.
    const { fmtCookUnit } = loadFns(SOURCE);
    expect(fmtCookUnit('cups', '1')).toBe('cup');
    expect(fmtCookUnit('cup', '2')).toBe('cups');
    expect(fmtCookUnit('cups', '1/2')).toBe('cup');
    expect(fmtCookUnit('cup', '1 1/2')).toBe('cups');
    expect(fmtCookUnit('tsp', '1')).toBe('tsp');
    expect(fmtCookUnit('tsp', '3')).toBe('tsp');
    expect(fmtCookUnit('oz', '16')).toBe('oz');
    expect(fmtCookUnit('', '2')).toBe('');
  });

  it('uses the formatter for both columns of the table', () => {
    // The "Original" column had its own raw `ing.amount` render, which is how the
    // 1x mismatch shipped. Both columns must go through the same formatter.
    const src = read(SOURCE);
    expect(src).toContain('var baseDisplay = fmtCookAmount(ing.amount);');
    expect(src).toContain('fmtCookUnit(ing.unit, baseDisplay)');
    expect(src).toContain('fmtCookUnit(ing.unit, display)');
    expect(src).not.toMatch(/scaled\.toFixed\(1\)/);
  });

  it('ships the same formatters in the desktop mirror', () => {
    for (const n of ['fmtCookAmount', 'fmtCookItem', 'fmtCookUnit']) {
      expect(bodyOf(read(MIRROR), n), n + ' missing from mirror').toBe(bodyOf(read(SOURCE), n));
    }
  });
});
