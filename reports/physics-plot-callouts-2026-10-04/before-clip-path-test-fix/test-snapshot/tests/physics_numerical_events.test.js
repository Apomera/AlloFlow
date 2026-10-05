import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

let P;
beforeAll(() => {
  new Function(readFileSync('stem_lab/stem_tool_physics.js', 'utf8'))();
  P = window.StemLab._physics;
});

function launch(angle, velocity, gravity = 9.8, drag = false, mass = 1) {
  const rad = angle * Math.PI / 180;
  return { mX: 0, mY: 0, mVx: velocity * Math.cos(rad), mVy: velocity * Math.sin(rad),
    grav: gravity, drag: drag ? P.DRAG_K : 0, mass, t: 0 };
}

function finish(b, dt) {
  for (let i = 0; i < 100000 && !b.landed; i++) P.step(b, dt);
  expect(b.landed).toBe(true);
  return b;
}

describe('projectile ground and apex events', () => {
  it.each([
    [5, 5, 25], [45, 25, 9.8], [85, 50, 1], [10, 200, 25],
  ])('matches closed-form vacuum motion at %d°, %d m/s, g=%d', (angle, velocity, gravity) => {
    const rad = angle * Math.PI / 180;
    const time = 2 * velocity * Math.sin(rad) / gravity;
    const maxH = (velocity * Math.sin(rad)) ** 2 / (2 * gravity);
    const range = velocity ** 2 * Math.sin(2 * rad) / gravity;
    const result = P.simulate(angle, velocity, gravity, false, 1);
    expect(result.status).toBe('landed');
    expect(result.time).toBeCloseTo(time, 9);
    expect(result.apexT).toBeCloseTo(time / 2, 9);
    expect(result.maxH).toBeCloseTo(maxH, 8);
    expect(result.range).toBeCloseTo(range, 8);
  });

  it('resolves an entire short flight, including its apex, in its first step', () => {
    const b = launch(5, 5, 25);
    P.step(b, P.DT);
    expect(b.landed).toBe(true);
    expect(b.mY).toBe(0);
    expect(b.t).toBeCloseTo(0.034862297099063265, 12);
    expect(b.mX).toBeCloseTo(0.17364817766693033, 12);
    expect(b.apex.t).toBeCloseTo(b.t / 2, 12);
    expect(b.apex.mVy).toBe(0);
    expect(b.maxH).toBeCloseTo(0.0037980617469479836, 12);
    expect(b.mVy).toBeCloseTo(-5 * Math.sin(5 * Math.PI / 180), 12);
  });

  it('leaves paused, negative-duration, and already landed states untouched', () => {
    const b = launch(45, 25, 9.8, true);
    const initial = { ...b };
    P.step(b, 0);
    P.step(b, -1);
    expect(b).toEqual(initial);
    finish(b, P.DT);
    const impact = structuredClone(b);
    P.step(b, 1);
    expect(b).toEqual(impact);
  });

  it('lands at the same vacuum event across step sizes, with conserved impact energy', () => {
    for (const dt of [1 / 30, 1 / 60, 1 / 144, 1 / 240, P.DT, 10]) {
      const b = finish(launch(45, 25), dt);
      expect(b.mX).toBeCloseTo(625 / 9.8, 9);
      expect(b.mVx ** 2 + b.mVy ** 2).toBeCloseTo(625, 8);
      expect(b.apex.mY).toBeCloseTo(b.maxH, 12);
    }
  });
});

describe('quadratic drag accuracy', () => {
  // Independent finely stepped RK4 oracle from the review's numerical-probe.cjs.
  // Fixed fixtures avoid using the implementation under test as its own oracle.
  it.each([
    [5, 5, 25, 0.1735673440641449, 0.034858183151981796, 0.003797170786250159],
    [45, 50, 9.8, 149.11351571536875, 6.1309097041286185, 46.39439950114724],
  ])('matches independent drag reference at %d°, %d m/s, g=%d', (angle, velocity, gravity, range, time, maxH) => {
    const result = P.simulate(angle, velocity, gravity, true, 1);
    expect(result.status).toBe('landed');
    expect(Math.abs(result.range - range)).toBeLessThan(0.00001);
    expect(Math.abs(result.time - time)).toBeLessThan(0.000001);
    expect(Math.abs(result.maxH - maxH)).toBeLessThan(0.000001);
  });

  it('matches the analytic horizontal quadratic-drag solution in zero gravity', () => {
    const b = { ...launch(0, 100, 0, true, 2), mY: 10 };
    P.step(b, 2);
    const k = P.DRAG_K / 2;
    expect(b.mX).toBeCloseTo(Math.log(1 + k * 100 * 2) / k, 6);
    expect(b.mVx).toBeCloseTo(100 / (1 + k * 100 * 2), 7);
    expect(b.mY).toBe(10);
    expect(b.mVy).toBe(0);
    expect(b.t).toBeCloseTo(2, 12);
  });

  it('converges across step sizes and never gains mechanical energy through drag', () => {
    const expected = P.simulate(45, 50, 9.8, true, 1);
    for (const dt of [1 / 30, 1 / 60, 1 / 144, 1 / 240, P.DT]) {
      const b = launch(45, 50, 9.8, true, 1);
      let energy = 1250;
      for (let i = 0; i < 2000 && !b.landed; i++) {
        P.step(b, dt);
        const nextEnergy = 0.5 * (b.mVx ** 2 + b.mVy ** 2) + b.grav * b.mY;
        expect(nextEnergy).toBeLessThanOrEqual(energy + 1e-8);
        energy = nextEnergy;
      }
      expect(b.landed).toBe(true);
      expect(Math.abs(b.mX - expected.range)).toBeLessThan(0.00001);
      expect(Math.abs(b.t - expected.time)).toBeLessThan(0.000001);
      expect(Math.abs(b.maxH - expected.maxH)).toBeLessThan(0.000001);
    }
  });
});

describe('unsupported and unreachable outcomes', () => {
  it.each([
    [NaN, 25, 9.8, false, 1], [45, Infinity, 9.8, false, 1],
    [45, 25, -1, false, 1], [45, 25, 9.8, true, 0],
    [45, 25, 9.8, true, -1], [91, 25, 9.8, false, 1],
  ])('rejects invalid launch inputs without inventing a landing', (...args) => {
    expect(P.simulate(...args)).toEqual({ status: 'invalid', range: null, time: null, maxH: null, apexT: null });
  });

  it('reports no impact in zero gravity and an explicit iteration limit', () => {
    expect(P.simulate(45, 25, 0, true, 1).status).toBe('no-impact');
    expect(P.simulate(45, 25, 0, false, 1).range).toBeNull();
    expect(P.simulate(85, 200, 0.01, false, 1)).toEqual({ status: 'limit', range: null, time: null, maxH: null, apexT: null });
    expect(P.solveVelocity(45, 10, 0, false, 1)).toBeNull();
    expect(P.solveAngle(25, 10, 0, false, 1)).toBeNull();
    expect(P.solveVelocity(45, NaN, 9.8, true, 1)).toBeNull();
    expect(P.solveAngle(25, -10, 9.8, true, 1)).toBeNull();
  });

  it('supports internal target speeds above visible controls and exact maximum-range targets', () => {
    const velocity = P.solveVelocity(45, 1000, 9.8, false, 1);
    expect(velocity).toBeGreaterThan(50);
    expect(velocity).toBeLessThan(200);
    expect(P.simulate(45, velocity, 9.8, false, 1).range).toBeCloseTo(1000, 7);
    expect(P.solveAngle(25, 625 / 9.8, 9.8, false, 1)).toBeCloseTo(45, 3);
    const smallAngle = P.solveAngle(25, 0.1, 9.8, false, 1);
    expect(smallAngle).toBeGreaterThan(0);
    expect(smallAngle).toBeLessThan(1);
    expect(P.simulate(smallAngle, 25, 9.8, false, 1).range).toBeCloseTo(0.1, 6);
  });
});
