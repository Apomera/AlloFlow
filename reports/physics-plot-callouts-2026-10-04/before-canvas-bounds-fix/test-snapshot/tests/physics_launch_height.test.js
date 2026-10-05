import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

let P;
beforeAll(() => {
  new Function(readFileSync('stem_lab/stem_tool_physics.js', 'utf8'))();
  P = window.StemLab._physics;
});

function body(angle, velocity, gravity, height, mass = 1, drag = false) {
  const rad = angle * Math.PI / 180;
  return { mX: 0, mY: height, mVx: velocity * Math.cos(rad), mVy: velocity * Math.sin(rad), grav: gravity, drag: drag ? P.DRAG_K : 0, mass, t: 0 };
}

function finish(b, dt) {
  for (let i = 0; i < 100000 && !b.landed; i++) P.step(b, dt);
  expect(b.landed).toBe(true);
  return b;
}

// Independent explicit-midpoint reference, with 350 times smaller steps than
// the production RK4 engine. Linear impact interpolation is accurate enough
// at this resolution for the stated 20-micrometre range error budget.
function midpointReference(angle, velocity, gravity, height, mass) {
  const rad = angle * Math.PI / 180, dt = 0.0001, k = 0.004 / mass;
  let x = 0, y = height, vx = velocity * Math.cos(rad), vy = velocity * Math.sin(rad), t = 0, maxH = height;
  for (let i = 0; i < 1000000; i++) {
    const speed = Math.hypot(vx, vy);
    const midVx = vx - k * speed * vx * dt / 2;
    const midVy = vy + (-gravity - k * speed * vy) * dt / 2;
    const midSpeed = Math.hypot(midVx, midVy);
    const nextX = x + midVx * dt, nextY = y + midVy * dt;
    if (nextY <= 0) {
      const fraction = y / (y - nextY);
      return { range: x + (nextX - x) * fraction, time: t + dt * fraction, maxH };
    }
    x = nextX; y = nextY; t += dt;
    vx -= k * midSpeed * midVx * dt;
    vy += (-gravity - k * midSpeed * midVy) * dt;
    maxH = Math.max(maxH, y);
  }
  throw new Error('Reference flight did not land');
}

describe('elevated vacuum launches', () => {
  it('exports the version and retains default ground-level results', () => {
    expect(P.MODEL_VERSION).toBe('projectile-v3');
    for (const drag of [false, true]) {
      expect(P.simulate(45, 25, 9.8, drag, 2)).toEqual(P.simulate(45, 25, 9.8, drag, 2, 0));
      expect(P.solveVelocity(35, 90, 9.8, drag, 1)).toBe(P.solveVelocity(35, 90, 9.8, drag, 1, 0));
    }
    expect(P.vacuum(45, 25, 9.8)).toEqual(P.vacuum(45, 25, 9.8, 0));
    expect(P.vacuum(45, 25, 9.8).optimumAngle).toBeCloseTo(45, 12);
  });

  it.each([[0, 15, 9.8, 10], [0, 5, 25, 0.0001], [35, 25, 9.8, 20], [85, 50, 1, 50]])(
    'matches the analytic impact and absolute apex from angle %d°, speed %d, gravity %d, height %d', (angle, velocity, gravity, height) => {
      const rad = angle * Math.PI / 180, vx = velocity * Math.cos(rad), vy = velocity * Math.sin(rad);
      const time = (vy + Math.sqrt(vy * vy + 2 * gravity * height)) / gravity;
      const expected = { range: vx * time, maxH: height + vy * vy / (2 * gravity), time, apexT: vy / gravity };
      for (const result of [P.simulate(angle, velocity, gravity, false, 1, height), P.vacuum(angle, velocity, gravity, height)]) {
        expect(result.status).toBe('landed');
        for (const key of Object.keys(expected)) expect(result[key]).toBeCloseTo(expected[key], 8);
      }
      const b = finish(body(angle, velocity, gravity, height, 3), 0.035);
      expect(b.mY).toBe(0);
      expect(b.mVy).toBeCloseTo(-Math.sqrt(vy * vy + 2 * gravity * height), 8);
      expect(0.5 * b.mass * (b.mVx ** 2 + b.mVy ** 2)).toBeCloseTo(0.5 * b.mass * velocity ** 2 + b.mass * gravity * height, 7);
      expect(b.apex.mY).toBeCloseTo(expected.maxH, 8);
    });

  it('horizontal range scales with speed while fall time depends on height', () => {
    const a = P.vacuum(0, 15, 9.8, 10), b = P.vacuum(0, 30, 9.8, 10);
    expect(a.time).toBeCloseTo(Math.sqrt(20 / 9.8), 12);
    expect(b.time).toBe(a.time);
    expect(b.range).toBe(2 * a.range);
    expect(a.maxH).toBe(10);
    expect(a.apexT).toBe(0);
  });

  it('computes the optimum elevated launch angle and maximum range', () => {
    const velocity = 20, gravity = 9.8, height = 50;
    const optimum = Math.atan(velocity / Math.sqrt(velocity ** 2 + 2 * gravity * height)) * 180 / Math.PI;
    const result = P.vacuum(optimum, velocity, gravity, height);
    expect(result.optimumAngle).toBeCloseTo(optimum, 12);
    expect(result.optimumAngle).toBeLessThan(45);
    expect(result.range).toBeCloseTo(velocity / gravity * Math.sqrt(velocity ** 2 + 2 * gravity * height), 10);
    expect(result.range).toBeGreaterThan(P.vacuum(optimum - 0.1, velocity, gravity, height).range);
    expect(result.range).toBeGreaterThan(P.vacuum(optimum + 0.1, velocity, gravity, height).range);
  });
});

describe('elevated drag launches', () => {
  it('matches the exact quadratic-drag drop-from-rest solution', () => {
    const gravity = 9.8, height = 50, mass = 2, k = P.DRAG_K / mass;
    const time = Math.acosh(Math.exp(k * height)) / Math.sqrt(gravity * k);
    const impactSpeed = Math.sqrt(gravity / k) * Math.tanh(Math.sqrt(gravity * k) * time);
    const result = P.simulate(0, 0, gravity, true, mass, height);
    expect(result.status).toBe('landed');
    expect(result.range).toBe(0);
    expect(result.maxH).toBe(height);
    expect(result.apexT).toBe(0);
    expect(result.time).toBeCloseTo(time, 7);
    const b = finish(body(0, 0, gravity, height, mass, true), P.DT);
    expect(-b.mVy).toBeCloseTo(impactSpeed, 7);
    expect(b.maxH).toBe(height);
  });

  it.each([[0, 25, 9.8, 20, 1], [45, 50, 9.8, 50, 1]])(
    'agrees with an independent drag reference and converges at %d°, %d m/s', (angle, velocity, gravity, height, mass) => {
      const reference = midpointReference(angle, velocity, gravity, height, mass);
      for (const dt of [P.DT, P.DT / 2, P.DT / 4]) {
        const b = finish(body(angle, velocity, gravity, height, mass, true), dt);
        expect(Math.abs(b.mX - reference.range)).toBeLessThan(0.00002);
        expect(Math.abs(b.t - reference.time)).toBeLessThan(0.000001);
        expect(Math.abs(b.maxH - reference.maxH)).toBeLessThan(0.000001);
        expect(0.5 * mass * (b.mVx ** 2 + b.mVy ** 2)).toBeLessThan(0.5 * mass * velocity ** 2 + mass * gravity * height);
      }
    });
});

describe('height domains and target solvers', () => {
  it.each([null, NaN, Infinity, -1, 50.01, '10'])('rejects unsupported height %s', height => {
    expect(P.simulate(45, 25, 9.8, false, 1, height).status).toBe('invalid');
    expect(P.vacuum(45, 25, 9.8, height).status).toBe('invalid');
    expect(P.solveVelocity(45, 50, 9.8, false, 1, height)).toBeNull();
    expect(P.solveAngle(25, 50, 9.8, false, 1, height)).toBeNull();
  });

  it('reports no ground return immediately for elevated zero-gravity flights', () => {
    for (const [angle, velocity] of [[0, 0], [0, 25], [45, 25]]) {
      for (const drag of [false, true]) expect(P.simulate(angle, velocity, 0, drag, 1, 10)).toEqual({ status: 'no-impact', range: null, maxH: null, time: null, apexT: null });
      expect(P.vacuum(angle, velocity, 0, 10).status).toBe('no-impact');
    }
    expect(P.simulate(0, 25, 0, false, 1, 0)).toEqual({ status: 'landed', range: 0, maxH: 0, time: 0, apexT: 0 });
  });

  it('solves elevated horizontal shots and targets on either angle branch', () => {
    for (const drag of [false, true]) {
      const speed = P.solveVelocity(0, 30, 9.8, drag, 1, 20);
      expect(speed).not.toBeNull();
      expect(P.simulate(0, speed, 9.8, drag, 1, 20).range).toBeCloseTo(30, 7);
      const horizontal = P.simulate(0, 20, 9.8, drag, 1, 20).range;
      expect(P.solveAngle(20, horizontal, 9.8, drag, 1, 20)).toBe(0);
      for (const range of [horizontal / 2, horizontal + 1]) {
        const angle = P.solveAngle(20, range, 9.8, drag, 1, 20);
        expect(angle).not.toBeNull();
        expect(P.simulate(angle, 20, 9.8, drag, 1, 20).range).toBeCloseTo(range, 6);
      }
    }
    expect(P.solveAngle(20, 0, 9.8, false, 1, 20)).toBe(90);
  });
});
