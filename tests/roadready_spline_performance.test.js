import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const fixture = JSON.parse(readFileSync('tests/fixtures/roadready-spline-before.json', 'utf8'));
let RR;
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});
describe('Road Ready spline cache behavior', () => {
  it.each(fixture.cases)('preserves the original seeded road across travel and cleanup: seed=$seed options=$options', ({ seed, options, expected }) => {
    const spline = RR.createRoadSpline(seed, 48, options);
    fixture.operations.forEach((op, index) => {
      if (typeof op === 'object') { spline.cleanup(op.cleanup); return; }
      const actual = [spline.centerAt(op), spline.headingAt(op), spline.heightAt(op)];
      actual.forEach((value, axis) => expect(value).toBeCloseTo(expected[index][axis], 12));
    });
  });
  it('reuses cached samples for repeated interpolation without growing memory', () => {
    const spline = RR.createRoadSpline(42, 48);
    spline.centerAt(-200); spline.centerAt(200);
    const size = Object.keys(spline.samples).length, anchor = spline.samples[20];
    for (let i = 0; i < 10000; i++) {
      const y = (i % 300) - 150 + 0.5;
      expect(Number.isFinite(spline.centerAt(y))).toBe(true);
      expect(Number.isFinite(spline.headingAt(y))).toBe(true);
    }
    expect(Object.keys(spline.samples)).toHaveLength(size);
    expect(spline.samples[20]).toBe(anchor);
  });
});
