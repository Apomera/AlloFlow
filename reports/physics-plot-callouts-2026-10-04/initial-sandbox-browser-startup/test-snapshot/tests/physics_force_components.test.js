import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

let P;
beforeAll(() => {
  new Function(readFileSync('stem_lab/stem_tool_physics.js', 'utf8'))();
  P = window.StemLab._physics;
});

// Synthetic recorded states isolate the force law from trajectory integration.
function observation({ vx = 12, vy = 16, mass = 2, gravity = 9.8, drag = true,
  t = 1, y = 10, angle = 45, velocity = 25, launchHeight = 10 } = {}) {
  const trail = [{ mX: 0, mY: y, mVx: vx, mVy: vy, t }];
  trail.parameters = Object.freeze({ angle, velocity, gravity, mass, launchHeight, drag });
  trail.modelVersion = P.MODEL_VERSION;
  trail.run = 7;
  return trail;
}

const inspect = settings => P.inspectSample(observation(settings), 0);
const point = b => ({ mX: b.mX, mY: b.mY, mVx: b.mVx, mVy: b.mVy, t: b.t });

function recordedFlight({ angle = 35, velocity = 30, mass = 2, gravity = 9.8,
  launchHeight = 10, drag = true } = {}) {
  const body = { mX: 0, mY: launchHeight, mVx: angle === 90 ? 0 : velocity * Math.cos(angle * Math.PI / 180),
    mVy: velocity * Math.sin(angle * Math.PI / 180), mass, grav: gravity, drag: drag ? P.DRAG_K : 0, t: 0 };
  const trail = [point(body)];
  trail.parameters = Object.freeze({ angle, velocity, mass, gravity, launchHeight, drag });
  trail.modelVersion = P.MODEL_VERSION;
  for (let i = 0; !body.landed && i < 10000; i++) {
    P.step(body, P.DT);
    P.recordSample(trail, body);
  }
  expect(body.landed).toBe(true);
  if (body.apex) trail.apex = Object.freeze({ mX: body.apex.mX, mY: body.apex.mY, vx: body.apex.mVx, tSec: body.apex.t });
  return trail;
}

// Tolerance follows the contributing values, so tiny forces cannot pass as zero.
function closeAtScale(actual, expected, scale) {
  expect(Number.isFinite(actual)).toBe(true);
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(64 * Number.EPSILON * scale);
}

function assertBalance(s) {
  expect(s).not.toBeNull();
  const mass = s.parameters.mass;
  closeAtScale(s.fx, s.gravityFx + s.dragFx, Math.abs(s.gravityFx) + Math.abs(s.dragFx));
  closeAtScale(s.fy, s.gravityFy + s.dragFy, Math.abs(s.gravityFy) + Math.abs(s.dragFy));
  closeAtScale(s.ax, s.fx / mass, Math.abs(s.fx / mass));
  closeAtScale(s.ay, s.fy / mass, Math.abs(s.fy / mass));
  closeAtScale(Math.hypot(s.gravityFx, s.gravityFy), s.gravityForce, s.gravityForce);
  closeAtScale(Math.hypot(s.dragFx, s.dragFy), s.dragForce, s.dragForce);
}

describe('recorded force components', () => {
  it('resolves a known 3–4–5 velocity triangle with signed components in newtons', () => {
    const s = inspect(); // speed = 20 m/s, K = 0.004 kg/m, mass = 2 kg
    expect(s.gravityFx).toBe(0);
    expect(s.gravityFy).toBe(-19.6);
    expect(s.dragFx).toBeCloseTo(-0.96, 14);
    expect(s.dragFy).toBeCloseTo(-1.28, 14);
    expect(s.fx).toBeCloseTo(-0.96, 14);
    expect(s.fy).toBeCloseTo(-20.88, 13);
    expect(s.dragForce).toBeCloseTo(1.6, 14);
    expect(s.ax).toBeCloseTo(-0.48, 14);
    expect(s.ay).toBeCloseTo(-10.44, 13);
    assertBalance(s);
  });

  it.each([[12, 16], [12, -16], [-12, 16], [-12, -16], [0, -20], [20, 0]])(
    'opposes velocity (%s, %s) and dissipates power K × speed³', (vx, vy) => {
      const s = inspect({ vx, vy });
      const power = s.dragFx * vx + s.dragFy * vy;
      const expectedPower = -P.DRAG_K * Math.hypot(vx, vy) ** 3;
      closeAtScale(power, expectedPower, Math.abs(expectedPower));
      expect(power).toBeLessThan(0);
      closeAtScale(s.dragFx * vy - s.dragFy * vx, 0,
        Math.abs(s.dragFx * vy) + Math.abs(s.dragFy * vx));
      if (vx !== 0) expect(Math.sign(s.dragFx)).toBe(-Math.sign(vx));
      if (vy !== 0) expect(Math.sign(s.dragFy)).toBe(-Math.sign(vy));
      assertBalance(s);
    });

  it.each([1e-8, -1e-8])('preserves tiny signed vertical drag at vy = %s despite cancellation in net force', vy => {
    const s = inspect({ vx: 1e-8, vy, mass: 1 });
    const expected = -P.DRAG_K * Math.hypot(1e-8, vy) * vy;
    expect(s.fy + s.gravityForce).toBe(0); // This reconstruction loses the force.
    expect(s.dragFy).not.toBe(0);
    expect(s.dragFy / expected).toBeCloseTo(1, 14);
    expect(Math.sign(s.dragFy)).toBe(-Math.sign(vy));
    expect(Number(P.formatSampleValue(s.dragFy))).not.toBe(0);
    expect(Math.sign(Number(P.formatSampleValue(s.dragFy)))).toBe(Math.sign(expected));
    assertBalance(s);
  });

  it.each([16, 0, -16])('has only gravity in vacuum at vy = %s', vy => {
    const s = inspect({ vy, drag: false });
    expect(s.gravityFx).toBe(0);
    expect(s.gravityFy).toBe(-19.6);
    for (const field of ['dragFx', 'dragFy', 'dragForce', 'fx', 'ax']) expect(s[field] === 0).toBe(true);
    expect(s.fy).toBe(s.gravityFy);
    expect(s.ay).toBe(-9.8);
    assertBalance(s);
  });

  it('keeps horizontal drag and downward gravity at a recorded oblique apex', () => {
    const trail = recordedFlight();
    const index = trail.findIndex(p => p.t === trail.apex.tSec && p.mVy === 0);
    const s = P.inspectSample(trail, index);
    expect(s).toMatchObject({ apex: true, phase: 'apex', vy: 0 });
    expect(s.dragFx).toBeLessThan(0);
    expect(s.dragFy === 0).toBe(true);
    expect(s.fy).toBe(s.gravityFy);
    expect(s.ay).toBe(-9.8);
    assertBalance(s);
  });

  it('has zero drag but nonzero gravity at a vertical-launch apex', () => {
    const trail = recordedFlight({ angle: 90 });
    const index = trail.findIndex(p => p.t === trail.apex.tSec && p.mVy === 0);
    const s = P.inspectSample(trail, index);
    expect(s).toMatchObject({ apex: true, vx: 0, vy: 0, speed: 0 });
    expect(s.dragFx === 0 && s.dragFy === 0 && s.dragForce === 0).toBe(true);
    expect(s.gravityFy).toBe(-19.6);
    expect(s.ay).toBe(-9.8);
    assertBalance(s);
  });

  it('shows release forces without declaring a lone horizontal launch to be an apex or impact', () => {
    const s = inspect({ vx: 20, vy: 0, angle: 0, velocity: 20, t: 0 });
    expect(s).toMatchObject({ apex: false, impact: false, phase: 'level', t: 0 });
    expect(s.dragFx).toBeCloseTo(-1.6, 14);
    expect(s.dragFy === 0).toBe(true);
    expect(s.gravityFy).toBe(-19.6);
    assertBalance(s);
  });

  it('retains the opposing forces when vertical terminal descent has approximately zero net force', () => {
    const mass = 2, gravity = 9.8;
    const s = inspect({ vx: 0, vy: -Math.sqrt(mass * gravity / P.DRAG_K), mass, gravity });
    expect(s.gravityFy).toBeLessThan(0);
    expect(s.dragFy).toBeGreaterThan(0);
    closeAtScale(s.dragFy, mass * gravity, mass * gravity);
    closeAtScale(s.fy, 0, Math.abs(s.gravityFy) + Math.abs(s.dragFy));
    expect(s.dragForce).toBeGreaterThan(0);
    assertBalance(s);
  });

  it.each([false, true])('keeps finite zero forces at rest with zero gravity, drag = %s', drag => {
    const s = inspect({ vx: 0, vy: 0, gravity: 0, drag, velocity: 0 });
    for (const field of ['gravityFx', 'gravityFy', 'dragFx', 'dragFy', 'fx', 'fy', 'ax', 'ay', 'dragForce', 'gravityForce']) {
      expect(Number.isFinite(s[field])).toBe(true);
      expect(s[field] === 0).toBe(true);
      expect(P.formatSampleValue(s[field])).toBe('0.00');
    }
    assertBalance(s);
  });

  it.each([false, true])('uses arriving velocity at impact and adds no ground-contact force, drag = %s', drag => {
    const trail = recordedFlight({ drag });
    const s = P.inspectSample(trail, trail.length - 1);
    expect(s).toMatchObject({ impact: true, phase: 'impact', y: 0 });
    expect(s.vy).toBeLessThan(0);
    expect(s.gravityFy).toBe(-19.6);
    if (drag) {
      expect(s.dragFx).toBeLessThan(0);
      expect(s.dragFy).toBeGreaterThan(0);
    } else {
      expect(s.dragFx === 0 && s.dragFy === 0).toBe(true);
      expect(s.fy).toBe(-19.6);
    }
    assertBalance(s);
  });

  it('scales gravity with captured mass while the same velocity gives the same drag force', () => {
    const light = inspect({ mass: 1 }), heavy = inspect({ mass: 10 });
    expect(heavy.gravityFy).toBe(light.gravityFy * 10);
    expect(heavy.dragFx).toBe(light.dragFx);
    expect(heavy.dragFy).toBe(light.dragFy);
    expect(heavy.dragForce).toBe(light.dragForce);
    expect(heavy.ax).toBe(light.ax / 10);
    assertBalance(light);
    assertBalance(heavy);
  });

  it('freezes components and captured parameters independently of later evidence mutations', () => {
    const trail = observation();
    const s = P.inspectSample(trail, 0), saved = structuredClone(s);
    expect(Object.isFrozen(s)).toBe(true);
    expect(Object.isFrozen(s.parameters)).toBe(true);
    for (const field of ['gravityFx', 'gravityFy', 'dragFx', 'dragFy']) expect(typeof s[field]).toBe('number');
    trail[0].mVx = -99;
    trail[0].mVy = -100;
    trail.parameters = { ...trail.parameters, mass: 10, gravity: 25, drag: false };
    expect(s).toEqual(saved);
    expect(s.parameters).toMatchObject({ mass: 2, gravity: 9.8, airResist: true });
    assertBalance(s);
  });

  it.each([
    ['non-finite velocity', { vx: Infinity }],
    ['non-finite gravity', { gravity: NaN }],
    ['zero mass', { mass: 0 }],
    ['overflowing gravity force', { mass: 2, gravity: 1e308 }],
    ['overflowing drag force', { vx: 1e200, vy: 1e200 }],
  ])('rejects %s instead of exposing non-finite components', (_label, settings) => {
    expect(inspect(settings)).toBeNull();
  });
});
