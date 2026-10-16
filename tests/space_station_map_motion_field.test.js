import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const { field, color } = new Function(source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  function issTransferPlan(')) + '\nreturn { field: issMapMotionField, color: issMapMotionFieldColor };')();
const rad = Math.PI / 180;
const norm = v => Math.hypot(...v);
const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function nearVector(actual, expected, digits = 11) {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((v, i) => expect(v).toBeCloseTo(expected[i], digits));
}
// Independent forward matrices; never call the production probe or pose helper.
function pointAt(point, alpha, feather) {
  const a = alpha * rad, f = feather * rad;
  const rz = [[Math.cos(f), -Math.sin(f), 0], [Math.sin(f), Math.cos(f), 0], [0, 0, 1]];
  const rx = [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
  const intermediate = rz.map(row => dot(row, point));
  return rx.map(row => dot(row, intermediate));
}
function derivative(point, options, component) {
  const h = .001;
  const ar = component === 'feather' ? 0 : options.alphaRate;
  const fr = component === 'rotation' ? 0 : options.featherRate;
  const next = pointAt(point, options.alpha + h * ar, options.feather + h * fr);
  const prior = pointAt(point, options.alpha - h * ar, options.feather - h * fr);
  return next.map((v, i) => (v - prior[i]) / (2 * h));
}
const components = ['total', 'rotation', 'feather'];
const poses = [
  { alpha: 0, feather: 0, alphaRate: .08, featherRate: -.03 },
  { alpha: 73, feather: -36, alphaRate: -.2, featherRate: .1 },
  { alpha: -139, feather: 53, alphaRate: .7, featherRate: -.8 },
  { alpha: 179.9998, feather: 21, alphaRate: .9, featherRate: .4 },
  { alpha: -179.9998, feather: -67, alphaRate: -.9, featherRate: -.6 },
  { alpha: 90, feather: 89.9, alphaRate: -1, featherRate: -.2 },
];
function corners() {
  return [-1, 1].flatMap(side => [-.45, .45].flatMap(x => [.3, 3.7].map(z => [x, .02, side * z])));
}

describe('space station surface speed field', () => {
  it('defaults to two stationary 11 by 25 material grids with no axis', () => {
    const state = field();
    expect(field(null)).toEqual(state);
    expect(state).toMatchObject({ component: 'total', angularSpeed: 0, axis: null, peak: 0, maxAll: 0, ceiling: 0, locked: false, saturated: false });
    expect(state.panels.map(p => p.side)).toEqual([1, -1]);
    for (const panel of state.panels) {
      expect(panel.samples).toHaveLength(275);
      for (const [index, sample] of panel.samples.entries()) {
        const row = Math.floor(index / 11), col = index % 11;
        expect(sample.span).toBe(row / 24); expect(sample.chord).toBe(col / 10);
        nearVector(sample.localPoint, [-.45 + .9 * col / 10, .02, panel.side * (.3 + 3.4 * row / 24)]);
        expect(sample.speed).toBe(0); expect(sample.ratio).toBe(0);
        nearVector(sample.color, [30 / 255, 41 / 255, 100 / 255]);
      }
    }
  });

  it.each(poses)('matches independent material derivatives at alpha=$alpha, feather=$feather', options => {
    for (const component of components) {
      const state = field({ ...options, component });
      for (const panel of state.panels) for (const index of [0, 5, 10, 79, 137, 198, 264, 274]) {
        const sample = panel.samples[index];
        expect(sample.speed).toBeCloseTo(norm(derivative(sample.localPoint, options, component)), 8);
      }
    }
  });

  it('finds the peak at corners and bounds independent interior speeds', () => {
    for (const options of poses) for (const component of components) {
      const state = field({ ...options, component });
      const maximum = Math.max(...corners().map(p => norm(derivative(p, options, component))));
      expect(state.peak).toBeCloseTo(maximum, 8);
      expect(Math.max(...state.panels.flatMap(p => p.samples.map(s => s.speed)))).toBeCloseTo(state.peak, 12);
      for (let i = 0; i < 31; i++) {
        const x = -.45 + .9 * ((i * 17 + 3) % 97) / 96;
        const z = .3 + 3.4 * ((i * 29 + 13) % 101) / 100;
        for (const side of [-1, 1]) expect(norm(derivative([x, .02, side * z], options, component))).toBeLessThanOrEqual(state.peak + 1e-9);
      }
    }
  });

  it('shares the maximum across both halves and all three component choices', () => {
    const options = poses[1], results = components.map(component => field({ ...options, component }));
    const independentMaximum = Math.max(...components.flatMap(component => corners().map(p => norm(derivative(p, options, component)))));
    for (const state of results) {
      expect(state.maxAll).toBeCloseTo(independentMaximum, 8);
      expect(state.ceiling).toBe(results[0].ceiling);
      expect(state.maxAll).toBe(Math.max(...results.map(v => v.peak)));
      expect(state.saturated).toBe(false);
      for (const panel of state.panels) for (const sample of panel.samples) expect(sample.ratio).toBeCloseTo(sample.speed / state.ceiling, 12);
    }
  });

  it('preserves all speed magnitudes and colors under a common alpha rotation', () => {
    const options = { ...poses[2], alpha: 0 }, before = field(options);
    for (const alpha of [-173, -90, 37, 180]) {
      const after = field({ ...options, alpha });
      expect(after.ceiling).toBeCloseTo(before.ceiling, 12);
      after.panels.forEach((panel, p) => panel.samples.forEach((sample, i) => {
        expect(sample.speed).toBeCloseTo(before.panels[p].samples[i].speed, 12);
        nearVector(sample.color, before.panels[p].samples[i].color);
      }));
    }
  });

  it('reports a unit instantaneous axis that satisfies speed = omega times perpendicular distance', () => {
    for (const options of poses) for (const component of components) {
      const state = field({ ...options, component });
      const rotation = [options.alphaRate * rad, 0, 0];
      const feather = pointAt([0, 0, options.featherRate * rad], options.alpha, 0);
      const expectedOmega = component === 'rotation' ? rotation : component === 'feather' ? feather : rotation.map((v, i) => v + feather[i]);
      nearVector(state.omega, expectedOmega);
      expect(state.angularSpeed).toBeCloseTo(norm(expectedOmega), 12);
      expect(norm(state.axis)).toBeCloseTo(1, 12);
      for (const panel of state.panels) for (const index of [0, 137, 274]) {
        const sample = panel.samples[index], position = pointAt(sample.localPoint, options.alpha, options.feather);
        const along = dot(position, state.axis), foot = state.axis.map(v => v * along);
        const radius = position.map((v, i) => v - foot[i]);
        expect(dot(radius, state.axis)).toBeCloseTo(0, 12);
        expect(sample.speed).toBeCloseTo(state.angularSpeed * norm(radius), 12);
        expect(sample.speed).toBeCloseTo(norm(cross(expectedOmega, position)), 12);
      }
    }
  });

  it('uses radians for surface velocity while retaining degree inputs', () => {
    const state = field({ component: 'rotation', alphaRate: 1 });
    expect(state.alphaRate).toBe(1);
    expect(state.angularSpeed).toBeCloseTo(rad, 12);
    expect(state.peak).toBeCloseTo(rad * Math.hypot(3.7, .02), 12);
  });

  it('keeps feather speed independent of span but dependent on chord', () => {
    const state = field({ ...poses[2], component: 'feather' });
    for (const panel of state.panels) for (let col = 0; col <= 10; col++) {
      const expected = Math.abs(poses[2].featherRate) * rad * Math.hypot(-.45 + .9 * col / 10, .02);
      for (const row of [0, 7, 24]) expect(panel.samples[row * 11 + col].speed).toBeCloseTo(expected, 12);
    }
    expect(state.panels[0].samples[5].speed).toBeGreaterThan(0);
    expect(state.panels[0].samples[5].speed).toBeLessThan(state.panels[0].samples[0].speed);
  });

  it('does not invent an axis for a stationary selected component when the other is moving', () => {
    const state = field({ alphaRate: .2, featherRate: 0, component: 'feather' });
    expect(state.axis).toBeNull(); expect(state.angularSpeed).toBe(0); expect(state.peak).toBe(0);
    expect(state.maxAll).toBeGreaterThan(0); expect(state.ceiling).toBeGreaterThan(0);
    expect(state.panels.flatMap(p => p.samples).every(s => s.speed === 0 && s.ratio === 0)).toBe(true);
  });

  it('reverses the angular velocity axis while leaving speed and color unchanged', () => {
    const options = poses[1], before = field(options);
    const after = field({ ...options, alphaRate: -options.alphaRate, featherRate: -options.featherRate });
    nearVector(after.axis, before.axis.map(v => -v));
    expect(after.ceiling).toBeCloseTo(before.ceiling, 12);
    expect(after.panels).toEqual(before.panels);
  });

  it('locks the color ceiling across changing rates and components without changing speeds', () => {
    const options = poses[1], initial = field(options), ceiling = initial.ceiling;
    for (const component of components) {
      const slower = { ...options, alphaRate: options.alphaRate / 2, featherRate: options.featherRate / 2, component };
      const automatic = field(slower), locked = field({ ...slower, ceiling });
      expect(locked.locked).toBe(true); expect(locked.ceiling).toBe(ceiling); expect(locked.saturated).toBe(false);
      expect(locked.peak).toBe(automatic.peak); expect(locked.angularSpeed).toBe(automatic.angularSpeed);
      expect(locked.axis).toEqual(automatic.axis);
      locked.panels.forEach((p, j) => p.samples.forEach((s, i) => {
        expect(s.speed).toBe(automatic.panels[j].samples[i].speed);
        expect(s.ratio).toBeCloseTo(automatic.panels[j].samples[i].ratio / 2, 12);
      }));
    }
  });

  it('caps colors at a locked ceiling while retaining speeds above it', () => {
    const options = poses[0], ceiling = field(options).ceiling / 3;
    const state = field({ ...options, ceiling });
    expect(state.locked).toBe(true); expect(state.saturated).toBe(true); expect(state.peak).toBeGreaterThan(ceiling);
    const capped = state.panels.flatMap(p => p.samples).filter(s => s.speed > ceiling);
    expect(capped.length).toBeGreaterThan(0);
    for (const sample of capped) { expect(sample.ratio).toBe(1); nearVector(sample.color, [1, 224 / 255, 120 / 255]); }
  });

  it('retains a positive locked ceiling through rest and can return to automatic scaling', () => {
    const state = field({ ceiling: '.0125' });
    expect(state).toMatchObject({ ceiling: .0125, locked: true, saturated: false, peak: 0, axis: null });
    expect(state.panels.flatMap(p => p.samples).every(s => s.ratio === 0)).toBe(true);
    expect(field({ ceiling: null })).toMatchObject({ locked: false, ceiling: 0 });
  });

  it('rejects invalid ceilings and component names without nonfinite values', () => {
    const normal = field(poses[0]);
    for (const ceiling of [undefined, null, '', 0, -1, NaN, Infinity, -Infinity, true, {}, 'invalid']) {
      const state = field({ ...poses[0], component: 'invalid', ceiling });
      expect(state.component).toBe('total'); expect(state.locked).toBe(false); expect(state.ceiling).toBe(normal.ceiling);
      expect(state.panels).toEqual(normal.panels);
    }
  });

  it('clamps angular rates and preserves valid negative inputs', () => {
    const state = field({ alpha: 15, feather: -20, alphaRate: 9, featherRate: -9 });
    expect(state).toMatchObject({ alphaRate: 1, featherRate: -1 });
    expect(state).toEqual(field({ alpha: 15, feather: -20, alphaRate: 1, featherRate: -1 }));
  });

  it('maps the three color stops, interpolates between them and clamps bad input', () => {
    nearVector(color(0), [30 / 255, 41 / 255, 100 / 255]);
    nearVector(color(.5), [40 / 255, 170 / 255, 172 / 255]);
    nearVector(color(1), [1, 224 / 255, 120 / 255]);
    nearVector(color(.25), [35 / 255, 105.5 / 255, 136 / 255]);
    nearVector(color(.75), [147.5 / 255, 197 / 255, 146 / 255]);
    expect(color(-3)).toEqual(color(0)); expect(color(4)).toEqual(color(1));
    for (const value of [undefined, null, NaN, Infinity, 'invalid']) expect(color(value)).toEqual(color(0));
  });

  it('does not mutate inputs or share arrays between model results', () => {
    const options = Object.freeze({ ...poses[1], component: 'rotation', ceiling: .02 });
    const first = field(options), second = field(options);
    expect(first).toEqual(second);
    first.panels[0].samples[0].color[0] = -1;
    first.panels[0].samples[0].localPoint[0] = 99;
    first.axis[0] = 99; first.omega[0] = 99;
    expect(second).toEqual(field(options));
  });
});
