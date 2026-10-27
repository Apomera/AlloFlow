import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { drawPhysicsElementTree } from './helpers/physics_element_tree.js';

// Two ways to hit a target: a horizontal line at the target distance crosses the range-angle
// curve; each crossing is a launch angle that lands exactly there.
let P;
beforeAll(() => {
  new Function(readFileSync('stem_lab/stem_tool_physics.js', 'utf8'))();
  P = window.StemLab._physics;
});

function render(physics = {}) {
  let state = { physics: { angle: 45, velocity: 25, gravity: 9.8, mass: 1, launchHeight: 0, airResist: false, showRangeExplorer: true, ...physics } };
  const ctx = {
    React: { useState: value => [value, () => {}], createElement: (type, props, ...children) => ({ type, props: props || {}, children }) },
    icons: {}, props: {}, toolSnapshots: [], gradeLevel: '10th Grade', setToolData: update => { state = update(state); },
    t: (_key, fallback) => fallback, addToast: () => {}, announceToSR: () => {}, awardXP: () => {},
  };
  return { draw: () => drawPhysicsElementTree(ctx, state), state: () => state.physics };
}
function all(tree, predicate) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(child => all(child, predicate));
  return [...(predicate(tree) ? [tree] : []), ...all(tree.children, predicate)];
}
const find = (tree, predicate) => all(tree, predicate)[0];
const attr = (tree, name) => find(tree, node => node.props && node.props[name] !== undefined && node.props[name] !== false);
const text = tree => Array.isArray(tree) ? tree.map(text).join(' ') : tree && typeof tree === 'object' ? text(tree.children) : tree == null || tree === false ? '' : String(tree);
const revealed = (physics = {}) => {
  const app = render(physics);
  attr(app.draw(), 'data-physics-range-skip').props.onClick();
  return app;
};
const result = tree => text(attr(tree, 'data-physics-range-target-result'));
const setTarget = (app, v) => attr(app.draw(), 'data-physics-range-target-slider').props.onChange({ target: { value: String(v) } });

describe('target angles', () => {
  it('finds both no-drag angles exactly where R = v²·sin(2θ)/g puts them, and they add to 90°', () => {
    const s = P.rangeSweep(25, 9.8, false, 1, 0);
    const a = P.targetAngles(s, 50, false);
    const low = Math.asin(50 * 9.8 / 625) * 90 / Math.PI;
    expect(a.low.angle).toBeCloseTo(low, 9);
    expect(a.high.angle).toBeCloseTo(90 - low, 9);
    expect(a.low.range).toBeCloseTo(50, 9);
    expect(a.high.range).toBeCloseTo(50, 9);
    expect(a.low.time).toBeLessThan(a.high.time);              // 2.22 s vs 4.59 s
    expect(a.low.maxH).toBeLessThan(a.high.maxH);
  });

  it('through air lands on the target too, and the pair moves closer together', () => {
    const s = P.rangeSweep(25, 9.8, true, 1, 0);
    const air = P.targetAngles(s, 40, true), vac = P.targetAngles(s, 40, false);
    expect(air.drag).toBe(true);
    expect(air.peak).toBe(s.best);
    expect(air.low.range).toBeCloseTo(40, 9);
    expect(air.high.range).toBeCloseTo(40, 9);
    expect(air.low.angle).toBeGreaterThan(vac.low.angle);
    expect(air.high.angle).toBeLessThan(vac.high.angle);
    expect(air.low.angle + air.high.angle).toBeLessThan(89);     // the 90° rule is a no-drag rule
  });

  it('says when no angle reaches, or when only one crossing is on the slider', () => {
    const s = P.rangeSweep(25, 9.8, true, 1, 0);
    const beyond = P.targetAngles(s, 60, true);
    expect(beyond).toMatchObject({ reachable: false, low: null, high: null });
    expect(P.targetAngles(s, 60, false).reachable).toBe(true);    // 63.8 m without drag
    const raised = P.rangeSweep(25, 9.8, false, 1, 10);
    const one = P.targetAngles(raised, 20, false);               // even 0° flies past 20 m from 10 m up
    expect(one.low).toBeNull();
    expect(one.high.range).toBeCloseTo(20, 9);
  });

  it('rejects targets it cannot measure', () => {
    const s = P.rangeSweep(25, 9.8, false, 1, 0);
    for (const bad of [0, -3, NaN, Infinity, '40']) expect(P.targetAngles(s, bad, false)).toBeNull();
    expect(P.targetAngles(null, 40, false)).toBeNull();
  });
});

describe('Two ways to hit a target panel', () => {
  it('appears only after the reveal, at 3/4 of the farthest range on the chart axis grid', () => {
    const app = render();
    expect(attr(app.draw(), 'data-physics-range-target')).toBeUndefined();
    attr(app.draw(), 'data-physics-range-skip').props.onClick();
    const tree = app.draw();
    const slider = attr(tree, 'data-physics-range-target-slider').props;
    // Axis 0-80 m in 20 m ticks, so the slider moves in 2 m steps: 0.75 × 63.8 m -> 48 m.
    expect([slider.min, slider.max, slider.step, slider.value]).toEqual([2, 80, 2, 48]);
    const low = Math.asin(48 * 9.8 / 625) * 90 / Math.PI;
    const lowTxt = low.toFixed(1) + '°', highTxt = (90 - Math.round(low * 10) / 10).toFixed(1) + '°';
    expect(result(tree)).toContain(`Two angles land at 48 m: ${lowTxt} and ${highTxt}.`);
    expect(result(tree)).toContain(`${lowTxt} + ${highTxt} = 90.0°`);
    expect(slider['aria-valuetext']).toBe(`48 m: ${lowTxt} and ${highTxt}`);
    const a = P.targetAngles(P.rangeSweep(25, 9.8, false, 1, 0), 48, false);
    expect(result(tree)).toContain(`The low shot is in the air for ${a.low.time.toFixed(2)} s and rises ${a.low.maxH.toFixed(1)} m. The high shot takes ${a.high.time.toFixed(2)} s`);
    expect(result(tree)).not.toContain('closer together');
  });

  it('draws the target line and rings each crossing on the curve', () => {
    const app = revealed();
    const tree = app.draw();
    const line = attr(tree, 'data-physics-range-target-line').props;
    expect(line.y1).toBe(line.y2);
    // Y(r) = T + plotH - r / yMax * plotH with T 18, plotH 226, yMax 80.
    expect(line.y1).toBeCloseTo(18 + 226 - 48 / 80 * 226, 9);
    const rings = all(tree, n => n.props && n.props['data-physics-range-target-hit']);
    expect(rings.map(r => r.props['data-physics-range-target-hit'])).toEqual(['low', 'high']);
    const a = P.targetAngles(P.rangeSweep(25, 9.8, false, 1, 0), 48, false);
    // X(a) = L + (a - 5) / 80 * plotW with L 84, plotW 538.
    rings.forEach((r, i) => {
      expect(r.props.cy).toBeCloseTo(line.y1, 9);
      expect(r.props.cx).toBeCloseTo(84 + ([a.low, a.high][i].angle - 5) / 80 * 538, 9);
    });
  });

  it('with drag compares the pair with the no-drag pair, and drops the 90° sentence', () => {
    const app = revealed({ airResist: true });
    setTarget(app, 40);
    const s = P.rangeSweep(25, 9.8, true, 1, 0);
    const air = P.targetAngles(s, 40, true), vac = P.targetAngles(s, 40, false);
    const r = result(app.draw());
    expect(r).toContain(`Two angles land at 40 m: ${air.low.angle.toFixed(1)}° and ${air.high.angle.toFixed(1)}°.`);
    expect(r).toContain(`Without air drag the two angles would be ${vac.low.angle.toFixed(1)}° and ${vac.high.angle.toFixed(1)}°. Through air they move closer together`);
    expect(r).not.toContain('add up to 90°');
  });

  it('explains out-of-reach and one-sided targets', () => {
    const app = revealed({ airResist: true });
    setTarget(app, 60);
    expect(result(app.draw())).toContain('No angle reaches 60 m: the farthest is 53.5 m at 43.6°.');
    expect(result(app.draw())).toContain('Without air drag it would reach: the no-drag curve peaks at 63.8 m.');
    expect(attr(app.draw(), 'data-physics-range-target-read')).toBeUndefined();
    expect(attr(app.draw(), 'data-physics-range-target-hit')).toBeUndefined();
    const raised = revealed({ launchHeight: 10 });
    setTarget(raised, 20);
    const r = result(raised.draw());
    expect(r).toMatch(/^Only one angle on the Angle slider lands at 20 m: 8\d\.\d°\. The other crossing is outside the slider \(0° to 85°\)\.$/);
  });

  it('snaps typed values to the slider grid and keeps the target on the chart', () => {
    const app = revealed();
    setTarget(app, 47.3);
    expect(app.state().rangeExplorer.target).toBe(48);
    setTarget(app, 500);
    expect(app.state().rangeExplorer.target).toBe(80);
  });

  it('sends each crossing to the curve reader as a whole-degree angle', () => {
    const app = revealed();
    const reads = all(app.draw(), n => n.props && n.props['data-physics-range-target-read']);
    expect(reads.map(b => text(b))).toEqual(['Read the curve at 24°', 'Read the curve at 66°']);
    reads[1].props.onClick();
    expect(app.state().rangeExplorer.inspect).toBe(66);
    expect(text(attr(app.draw(), 'data-physics-range-reading'))).toContain('At 66°');
  });
});
