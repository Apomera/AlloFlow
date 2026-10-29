import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const fieldsStart = source.indexOf('  var ISS_OPS_RESULTS =');
const fieldsEnd = source.indexOf('  function issOpsSetup(', fieldsStart);
const helperStart = source.indexOf('  function issOpsRuleComparison(');
const helperEnd = source.indexOf('  function issOpsTrialCsv(', helperStart);
if ([fieldsStart, fieldsEnd, helperStart, helperEnd].some(index => index < 0)) throw new Error('Station comparison helpers not found');
const { compare, resultText, deltaText, fields } = new Function(
  source.slice(fieldsStart, fieldsEnd) + source.slice(helperStart, helperEnd) +
  '\nreturn {compare:issOpsRuleComparison,resultText:issOpsResultText,deltaText:issOpsDeltaText,fields:ISS_OPS_RESULTS};'
)();

const evidence = (changes = {}) => ({ batteryMin: 50, batteryEnd: 61.866860358216876, co2Peak: 2855.619689999139,
  cabinMin: 21.7, cabinMax: 22.38, cmgPeak: 38.16842105263158, recovery: 98, waterResupply: .532, ...changes });
const rule = (before, after, id) => compare(before, after).find(row => row.id === id);

describe('space station rule comparison evidence', () => {
  it('reports each exact inclusive or strict rule boundary independently', () => {
    const cases = [
      ['power', { batteryMin: 24.999999999 }, { batteryMin: 25 }],
      ['air', { co2Peak: 4000 }, { co2Peak: 3999.999999999 }],
      ['water', { recovery: 89.999999999 }, { recovery: 90 }],
      ['thermal', { cabinMin: 17.999999999 }, { cabinMin: 18, cabinMax: 27 }],
      ['thermal', { cabinMax: 27.000000001 }, { cabinMin: 18, cabinMax: 27 }],
      ['attitude', { cmgPeak: 80 }, { cmgPeak: 79.999999999 }]
    ];
    for (const [id, failing, passing] of cases) {
      expect(rule(evidence(failing), evidence(passing), id)).toEqual({ id, before: false, after: true, state: 'resolved' });
      expect(rule(evidence(passing), evidence(failing), id)).toEqual({ id, before: true, after: false, state: 'introduced' });
      expect(rule(evidence(failing), evidence(failing), id)).toEqual({ id, before: false, after: false, state: 'still-check' });
      expect(rule(evidence(passing), evidence(passing), id)).toEqual({ id, before: true, after: true, state: 'still-go' });
    }
  });

  it('keeps simultaneous improvements and regressions visible without averaging them', () => {
    const before = evidence({ batteryMin: 20, co2Peak: 3999.6, recovery: 89.999, cabinMin: 17.99, cmgPeak: 79.96 });
    const after = evidence({ batteryMin: 24, co2Peak: 4000.2, recovery: 90, cabinMin: 18, cabinMax: 27.01, cmgPeak: 80 });
    expect(compare(before, after)).toEqual([
      { id: 'power', before: false, after: false, state: 'still-check' },
      { id: 'air', before: true, after: false, state: 'introduced' },
      { id: 'water', before: false, after: true, state: 'resolved' },
      { id: 'thermal', before: false, after: false, state: 'still-check' },
      { id: 'attitude', before: true, after: false, state: 'introduced' }
    ]);
    expect(compare(evidence(), evidence({ batteryEnd: 0, waterResupply: 99 })).every(row => row.state === 'still-go')).toBe(true);
  });

  it('treats both cabin limits as one rule and requires both to pass', () => {
    const failing = evidence({ cabinMin: 17, cabinMax: 28 });
    expect(compare(failing, evidence({ cabinMin: 18, cabinMax: 28 }))).toHaveLength(5);
    expect(rule(failing, evidence({ cabinMin: 18, cabinMax: 28 }), 'thermal').state).toBe('still-check');
    expect(rule(failing, evidence({ cabinMin: 17, cabinMax: 27 }), 'thermal').state).toBe('still-check');
    expect(rule(failing, evidence({ cabinMin: 18, cabinMax: 27 }), 'thermal').state).toBe('resolved');
  });

  it('rejects incomplete, inherited, nonnumeric, and nonfinite measurements without false GO results', () => {
    for (const field of fields) {
      const missing = evidence();
      delete missing[field.key];
      const inherited = Object.assign(Object.create({ [field.key]: evidence()[field.key] }), missing);
      for (const invalid of [missing, inherited, ...[undefined, null, '', '25', NaN, Infinity, -Infinity, true, [], {}]
        .map(value => evidence({ [field.key]: value }))]) {
        expect(compare(invalid, evidence())).toBeNull();
        expect(compare(evidence(), invalid)).toBeNull();
      }
    }
    for (const invalid of [undefined, null, [], 'results', 25, Object.create(evidence())]) {
      expect(compare(invalid, evidence())).toBeNull();
      expect(compare(evidence(), invalid)).toBeNull();
    }
  });

  it('retains full-precision evidence and returns detached results', () => {
    const before = Object.freeze(evidence({ batteryMin: 24.999999999999996 }));
    const after = Object.freeze(evidence({ batteryMin: 25 }));
    const snapshot = JSON.stringify([before, after]);
    const results = compare(before, after);
    expect(results[0].state).toBe('resolved');
    results[0].before = true;
    results.push({ id: 'other' });
    expect(compare(before, after)).toHaveLength(5);
    expect(compare(before, after)[0].before).toBe(false);
    expect(JSON.stringify([before, after])).toBe(snapshot);
    expect(compare(JSON.parse(JSON.stringify(before)), JSON.parse(JSON.stringify(after)))[0].state).toBe('resolved');
  });
});

describe('space station boundary-aware reading text', () => {
  it.each([[25, 1], [4000, 0], [90, 1], [18, 1], [27, 1], [80, 1]])(
    'distinguishes readings on both sides of the %s boundary at %s decimals', (boundary, digits) => {
      const step = Math.pow(10, -digits) / 4;
      expect(resultText(boundary - step, digits, [boundary])).toBe('< ' + boundary.toFixed(digits));
      expect(resultText(boundary + step, digits, [boundary])).toBe('> ' + boundary.toFixed(digits));
      expect(resultText(boundary, digits, [boundary])).toBe(boundary.toFixed(digits));
      expect(resultText(boundary - step * 4, digits, [boundary])).toBe((boundary - step * 4).toFixed(digits));
      expect(resultText(boundary + step * 4, digits, [boundary])).toBe((boundary + step * 4).toFixed(digits));
    }
  );

  it('uses ordinary rounding away from supplied boundaries and never mutates boundary lists', () => {
    const boundaries = Object.freeze([18, 27]);
    expect(resultText(22.3456, 2, boundaries)).toBe('22.35');
    expect(resultText(17.999999999999996, 1, boundaries)).toBe('< 18.0');
    expect(resultText(27.000000000000004, 1, boundaries)).toBe('> 27.0');
    expect(resultText(3999.6, 0)).toBe('4000');
    expect(resultText(3999.6, 0, ['4000', NaN, Infinity])).toBe('4000');
    expect(boundaries).toEqual([18, 27]);
  });

  it('normalizes negative zero without hiding its side of an explicitly supplied zero boundary', () => {
    expect(resultText(-0, 1, [0])).toBe('0.0');
    expect(resultText(-.001, 1)).toBe('0.0');
    expect(resultText(-.001, 1, [0])).toBe('< 0.0');
    expect(resultText(.001, 1, [-0])).toBe('> 0.0');
  });

  it('fails safely for invalid readings and keeps display precision in the supported range', () => {
    for (const value of [undefined, null, '25', NaN, Infinity, -Infinity, [], {}, true]) expect(resultText(value, 1, [25])).toBe('—');
    expect(resultText(12.34, -2)).toBe('12');
    expect(resultText(12.34, NaN)).toBe('12');
    expect(resultText(12.34, 1.9)).toBe('12.3');
    expect(resultText(1, 101)).toBe((1).toFixed(100));
  });
});

describe('space station measured delta text', () => {
  it('shows exactly zero only for unchanged evidence including negative zero', () => {
    expect(deltaText(4, 4, 1)).toBe('0');
    expect(deltaText(-0, 0, 2)).toBe('0');
    expect(deltaText(0, -0, 2)).toBe('0');
    expect(deltaText(4, 4.26, 1)).toBe('+0.3');
    expect(deltaText(4, 3.74, 1)).toBe('−0.3');
    expect(deltaText(-4, -3, 1)).toBe('+1.0');
  });

  it.each([[0, '1'], [1, '0.1'], [2, '0.01'], [3, '0.001']])(
    'preserves the direction of a change smaller than the %s-decimal display unit', (digits, unit) => {
      const small = Number(unit) / 10;
      expect(deltaText(0, small, digits)).toBe('+<' + unit);
      expect(deltaText(0, -small, digits)).toBe('−<' + unit);
    }
  );

  it('preserves tiny representable changes at full precision', () => {
    expect(deltaText(25, 25 + Number.EPSILON * 16, 1)).toBe('+<0.1');
    expect(deltaText(25, 25 - Number.EPSILON * 16, 1)).toBe('−<0.1');
    expect(deltaText(0, Number.MIN_VALUE, 1)).toBe('+<0.1');
    expect(deltaText(0, -Number.MIN_VALUE, 1)).toBe('−<0.1');
  });

  it('rejects invalid input and overflow without numeric coercion', () => {
    for (const value of [undefined, null, '', '25', NaN, Infinity, -Infinity, [], {}, true]) {
      expect(deltaText(value, 1, 1)).toBe('—');
      expect(deltaText(1, value, 1)).toBe('—');
    }
    expect(deltaText(-Number.MAX_VALUE, Number.MAX_VALUE, 1)).toBe('—');
    expect(deltaText(0, 1.2, -1)).toBe('+1');
    expect(deltaText(0, 1.2, NaN)).toBe('+1');
    expect(deltaText(0, 1.25, 1.9)).toBe('+1.3');
  });
});
