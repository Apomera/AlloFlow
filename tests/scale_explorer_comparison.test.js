import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js', 'utf8');
const sandbox = { window: { StemLab: { registerTool() {} } }, console: { log() {} } };
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {",
  "  window.comparison = { pair: compareMeasurements, bridge: scaleBridge, read: readComparison, items: ITEMS };\n  window.StemLab.registerTool('scaleExplorer', {"), sandbox);
const { pair, bridge, read, items } = sandbox.window.comparison;
const by = Object.fromEntries(items.map(item => [item.id, item]));

describe('Scale Explorer compares characteristic measurements', () => {
  it('preserves the chosen order while giving a unit-independent length ratio', () => {
    const result = pair(by.earth, by.moon);
    expect(result.a.id).toBe('earth'); expect(result.b.id).toBe('moon');
    expect(result.ratio).toBeCloseTo(3.669, 2);
    expect(pair(by.moon, by.earth).ratio).toBe(result.ratio);
    expect(pair({ size: by.earth.size * 1000 }, { size: by.moon.size * 1000 }).ratio).toBeCloseTo(result.ratio, 12);
    expect(pair(by.earth, by.earth)).toMatchObject({ ratio: 1, decades: 0 });
    expect(pair(null, by.earth)).toBeNull();
    expect(pair({ size: -1 }, by.earth)).toBeNull();
    expect(pair({ size: Infinity }, by.earth)).toBeNull();
    expect(pair({ size: 1e308 }, { size: 1e-308 })).toBeNull();
  });

  it('keeps exact endpoints, tenfold intermediate steps and a fractional final step for every catalog pair', () => {
    for (const a of items) for (const b of items) {
      const comparison = pair(a, b), steps = bridge(comparison, items);
      expect(steps[0].size, a.id + '/' + b.id).toBe(comparison.small.size);
      expect(steps.at(-1).size).toBe(comparison.big.size);
      expect(steps.length).toBeLessThanOrEqual(44);
      let product = 1;
      for (let index = 1; index < steps.length; index++) {
        const step = steps[index], previous = steps[index - 1];
        expect(step.size).toBeGreaterThan(previous.size);
        expect(step.size / previous.size).toBeCloseTo(step.factor, 9);
        expect(step.factor).toBeGreaterThan(1);
        expect(step.factor).toBeLessThanOrEqual(10 + 1e-8);
        product *= step.factor;
        if (!step.endpoint) {
          expect(step.factor).toBe(10);
          expect(step.exp - steps[0].exp).toBeCloseTo(index, 9);
          if (step.item) expect(Math.abs(Math.log10(step.item.size / step.size))).toBeLessThan(.5);
        }
      }
      expect(product / comparison.ratio).toBeCloseTo(1, 9);
    }
  });

  it('does not duplicate an endpoint at an exact whole decade or replace an exact step by its example', () => {
    const steps = bridge(pair({ id: 'small', size: 1 }, { id: 'big', size: 1000 }), [{ id: 'example', size: 13 }]);
    expect(steps.map(step => step.size)).toEqual([1, 10, 100, 1000]);
    expect(steps[1].item.size).toBe(13);
    expect(steps[1].size).toBe(10);
    expect(bridge(pair(by.human, by.human), items)).toHaveLength(1);
    expect(bridge(null, items)).toEqual([]);
  });

  it('uses personal height for the ratio and validates remembered comparison identifiers', () => {
    expect(pair({ ...by.human, size: 1.2, you: true }, by.door).ratio).toBeCloseTo(by.door.size / 1.2, 10);
    expect(read({ a: 'earth', b: 'moon' }, 'human', 'rbc')).toEqual({ a: 'earth', b: 'moon' });
    expect(read({ a: '__proto__', b: { id: 'earth' } }, 'human', 'rbc')).toEqual({ a: 'human', b: 'rbc' });
    expect(read(null, 'honeybee', 'human')).toEqual({ a: 'honeybee', b: 'human' });
  });
});
