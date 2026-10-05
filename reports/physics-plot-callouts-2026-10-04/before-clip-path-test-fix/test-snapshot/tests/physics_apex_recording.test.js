import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

let P;
beforeAll(() => {
  new Function(readFileSync('stem_lab/stem_tool_physics.js', 'utf8'))();
  P = window.StemLab._physics;
});
const point = b => ({ mX: b.mX, mY: b.mY, mVx: b.mVx, mVy: b.mVy, t: b.t });
function recorded({ angle = 35, velocity = 30, gravity = 9.8, mass = 2, height = 0, drag = false } = {}) {
  const body = { mX: 0, mY: height, mVx: velocity * Math.cos(angle * Math.PI / 180), mVy: velocity * Math.sin(angle * Math.PI / 180), grav: gravity, drag: drag ? P.DRAG_K : 0, mass, t: 0 };
  const trail = [point(body)];
  trail.parameters = Object.freeze({ angle, velocity, gravity, mass, launchHeight: height, drag });
  trail.modelVersion = P.MODEL_VERSION;
  for (let steps = 0; !body.landed && steps < 10000; steps++) {
    P.step(body, P.DT);
    const original = structuredClone(body);
    P.recordSample(trail, body);
    expect(body).toEqual(original);
  }
  expect(body.landed).toBe(true);
  if (body.apex) trail.apex = Object.freeze({ mX: body.apex.mX, mY: body.apex.mY, vx: body.apex.mVx, tSec: body.apex.t });
  return { body, trail };
}

describe('canonical apex observations', () => {
  it.each([
    { angle: 5, velocity: 5, gravity: 25 },
    { angle: 5, velocity: 5, gravity: 25, drag: true },
    { angle: 35, velocity: 30 },
    { angle: 35, velocity: 30, drag: true },
    { angle: 85, velocity: 50, gravity: 1, mass: 10, height: 50 },
    { angle: 85, velocity: 50, gravity: 1, mass: 10, height: 50, drag: true },
    { angle: 0, velocity: 15, height: 10 },
    { angle: 0, velocity: 15, height: 10, drag: true },
  ])('records the original resolved apex exactly once: %j', settings => {
    const { body, trail } = recorded(settings);
    const expected = P.simulate(settings.angle ?? 35, settings.velocity ?? 30, settings.gravity ?? 9.8, !!settings.drag, settings.mass ?? 2, settings.height ?? 0);
    expect(body.t).toBe(expected.time);
    expect(body.mX).toBe(expected.range);
    expect(body.maxH).toBe(expected.maxH);
    for (let i = 1; i < trail.length; i++) expect(trail[i].t).toBeGreaterThan(trail[i - 1].t);
    const matches = trail.map((p, i) => ({ p, i })).filter(({ p }) => p.t === body.apex.t && p.mVy === 0);
    expect(matches).toHaveLength(1);
    const { p, i } = matches[0];
    expect(p).toEqual(point(body.apex));
    expect(P.inspectSample(trail, i)).toMatchObject({ apex: true, phase: 'apex', vy: 0, y: body.maxH, ay: -(settings.gravity ?? 9.8) });
    expect(trail.at(-1)).toEqual(point(body));
    expect(P.inspectSample(trail, trail.length - 1)).toMatchObject({ impact: true, phase: 'impact' });
    const original = structuredClone(trail);
    expect(P.recordSample(trail, body)).toBe(0);
    expect(trail).toEqual(original);
  });

  it('keeps all three events when an entire flight finishes within one tick', () => {
    const { body, trail } = recorded({ angle: 5, velocity: 5, gravity: 25 });
    expect(trail).toHaveLength(3);
    expect(trail.map(p => p.t)).toEqual([0, body.apex.t, body.t]);
    expect(body.t).toBeLessThan(P.DT);
    expect(trail[1].mY).toBeGreaterThan(0);
    expect(P.formatSampleValue(trail[1].mY)).not.toBe('0.00');
  });

  it('does not duplicate an apex exactly at an observation boundary', () => {
    const first = { mX: 0, mY: 0, mVx: 10, mVy: 1, t: 0 };
    const apex = { mX: 1, mY: 0.05, mVx: 10, mVy: 0, t: 0.1 };
    const body = { ...apex, apex: { ...apex } }, trail = [{ ...first }];
    expect(P.recordSample(trail, body)).toBe(1);
    expect(trail).toEqual([first, apex]);
    expect(P.recordSample(trail, body)).toBe(0);
    expect(trail).toEqual([first, apex]);
  });

  it('coalesces a real tick-boundary apex and still retains the next impact', () => {
    const body = { mX: 0, mY: 0, mVx: 10, mVy: 25 * P.DT, grav: 25, drag: 0, mass: 1, t: 0 };
    const trail = [point(body)];
    P.step(body, P.DT);
    expect(body.apex.t).toBeLessThan(body.t);
    expect(body.t - body.apex.t).toBeLessThan(1e-14);
    const atApex = structuredClone(body);
    expect(P.recordSample(trail, body)).toBe(1);
    expect(body).toEqual(atApex);
    expect(trail).toEqual([trail[0], point(body.apex)]);
    expect(P.recordSample(trail, body)).toBe(0);
    P.step(body, P.DT);
    expect(body.landed).toBe(true);
    const atImpact = structuredClone(body);
    expect(P.recordSample(trail, body)).toBe(1);
    expect(body).toEqual(atImpact);
    expect(trail).toHaveLength(3);
    expect(trail.at(-1)).toEqual(point(body));
    expect(trail[2].t).toBeGreaterThan(trail[1].t);
    expect(trail[2].mY).toBe(0);
  });

  it('reuses a horizontal release instead of adding another t=0 point', () => {
    const { body, trail } = recorded({ angle: 0, velocity: 15, height: 10 });
    expect(body.apex.t).toBe(0);
    expect(trail.filter(p => p.t === 0)).toHaveLength(1);
    expect(P.inspectSample(trail, 0)).toMatchObject({ apex: true, phase: 'apex', vy: 0 });
    const onlyLaunch = [trail[0]];
    onlyLaunch.parameters = trail.parameters;
    onlyLaunch.modelVersion = trail.modelVersion;
    expect(P.inspectSample(onlyLaunch, 0)).toMatchObject({ apex: false, phase: 'level' });
  });

  it('does not invent an apex when older evidence omits the resolved event', () => {
    const { trail } = recorded();
    const apex = trail.findIndex(p => p.t === trail.apex.tSec);
    trail.splice(apex, 1);
    expect(trail.some((_, i) => P.inspectSample(trail, i).apex)).toBe(false);
    expect(trail.some((_, i) => P.inspectSample(trail, i).phase === 'rising')).toBe(true);
    expect(trail.some((_, i) => P.inspectSample(trail, i).phase === 'falling')).toBe(true);
  });

  it.each([
    p => { p.t = NaN; }, p => { p.mX = -1; }, p => { p.mY = -1; },
    p => { p.mVy = Infinity; }, p => { p.t = -1; },
  ])('leaves evidence intact when the current state is invalid', corrupt => {
    const trail = [{ mX: 0, mY: 1, mVx: 2, mVy: 3, t: 0 }];
    const body = { mX: 1, mY: 2, mVx: 2, mVy: 1, t: 1 };
    corrupt(body);
    const original = structuredClone(trail);
    expect(P.recordSample(trail, body)).toBe(0);
    expect(trail).toEqual(original);
  });

  it('ignores malformed event metadata while retaining a valid current observation', () => {
    for (const apex of [{ t: NaN }, { mX: 1, mY: 2, mVx: 3, mVy: 1, t: 0.5 }, { mX: 1, mY: 2, mVx: 3, mVy: 0, t: 2 }]) {
      const trail = [{ mX: 0, mY: 1, mVx: 3, mVy: 4, t: 0 }];
      const body = { mX: 2, mY: 2, mVx: 3, mVy: -1, t: 1, apex };
      expect(P.recordSample(trail, body)).toBe(1);
      expect(trail.at(-1)).toEqual(point(body));
    }
  });
});

describe('readable recorded values', () => {
  it.each([0.0038, -0.0038, 1e-12, -1e-12])('preserves the sign and magnitude of tiny nonzero value %s', value => {
    expect(Number(P.formatSampleValue(value))).toBeCloseTo(value, Math.ceil(-Math.log10(Math.abs(value))) + 2);
    expect(Number(P.formatSampleValue(value))).not.toBe(0);
    expect(Math.sign(Number(P.formatSampleValue(value)))).toBe(Math.sign(value));
  });
  it.each([[0, '0.00'], [-0, '0.00'], [0.01, '0.01'], [12.345, '12.35'], [-9.8, '-9.80']])('keeps normal reading %s legible', (value, expected) => {
    expect(P.formatSampleValue(value)).toBe(expected);
  });
  it.each([NaN, Infinity, '1', null])('does not format invalid reading %s as a measurement', value => {
    expect(P.formatSampleValue(value)).toBe('—');
  });
});
