import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

let P;
beforeAll(() => {
  new Function(readFileSync('stem_lab/stem_tool_physics.js', 'utf8'))();
  P = window.StemLab._physics;
});

function flight({ angle = 35, velocity = 25, gravity = 9.8, mass = 2, launchHeight = 10, drag = false } = {}) {
  const b = {
    mX: 0, mY: launchHeight, mVx: velocity * Math.cos(angle * Math.PI / 180),
    mVy: velocity * Math.sin(angle * Math.PI / 180), grav: gravity,
    drag: drag ? P.DRAG_K : 0, mass, t: 0,
  };
  const sample = () => ({ mX: b.mX, mY: b.mY, mVx: b.mVx, mVy: b.mVy, t: b.t });
  const trail = [sample()];
  trail.parameters = Object.freeze({ angle, velocity, gravity, mass, launchHeight, drag });
  trail.modelVersion = P.MODEL_VERSION;
  trail.run = 7;
  for (let i = 0; !b.landed && i < 10000; i++) { P.step(b, P.DT); trail.push(sample()); }
  expect(b.landed).toBe(true);
  return trail;
}

describe('inspection of recorded projectile samples', () => {
  it('derives each vacuum snapshot from captured mass, height and gravity', () => {
    const trail = flight();
    const before = structuredClone(trail);
    for (let index = 0; index < trail.length; index++) {
      const s = P.inspectSample(trail, index), point = trail[index];
      expect(s).toMatchObject({ index, count: trail.length, t: point.t, x: point.mX, y: point.mY,
        vx: point.mVx, vy: point.mVy, ax: -0, ay: -9.8, gravityForce: 19.6, dragForce: 0, dragLoss: 0, run: 7 });
      expect(s.speed).toBeCloseTo(Math.hypot(point.mVx, point.mVy), 10);
      expect(s.totalEnergy).toBeCloseTo(0.5 * 2 * 25 ** 2 + 2 * 9.8 * 10, 8);
      expect(s.initialEnergy).toBe(821);
      expect(s.impact).toBe(index === trail.length - 1);
    }
    expect(trail).toEqual(before);
  });

  it('shows drag force opposing velocity and preserves the measured loss of mechanical energy', () => {
    const trail = flight({ angle: 45, velocity: 40, drag: true, mass: 3, launchHeight: 20 });
    for (const index of [0, Math.floor(trail.length / 3), Math.floor(trail.length * 2 / 3), trail.length - 1]) {
      const s = P.inspectSample(trail, index);
      const dragX = s.fx, dragY = s.fy + s.gravityForce;
      expect(dragX * s.vx + dragY * s.vy).toBeCloseTo(-P.DRAG_K * s.speed ** 3, 8);
      expect(Math.hypot(dragX, dragY)).toBeCloseTo(s.dragForce, 8);
      expect(s.ax).toBeCloseTo(s.fx / 3, 10);
      expect(s.ay).toBeCloseTo(s.fy / 3, 10);
      expect(s.initialEnergy).toBeCloseTo(0.5 * 3 * 40 ** 2 + 3 * 9.8 * 20, 9);
      expect(s.ke + s.pe + s.dragLoss).toBeCloseTo(s.initialEnergy, 8);
    }
    expect(P.inspectSample(trail, trail.length - 1).dragLoss).toBeGreaterThan(0);
  });

  it('supports the one recorded sample of a paused horizontal launch and freezes scalar evidence', () => {
    const trail = flight({ angle: 0, velocity: 15, mass: 2, launchHeight: 10 });
    trail.splice(1);
    const snapshot = P.inspectSample(trail, 0);
    expect(snapshot).toMatchObject({ t: 0, count: 1, y: 10, vy: 0, ke: 225, pe: 196, impact: false });
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.parameters)).toBe(true);
    trail[0].mX = 99;
    trail[0].mVy = -100;
    trail.parameters = { ...trail.parameters, mass: 9 };
    expect(snapshot).toMatchObject({ x: 0, vy: 0, parameters: { mass: 2, launchHeight: 10 } });
  });

  it('uses the exact short-flight impact sample rather than reconstructing time from the index', () => {
    const trail = flight({ angle: 5, velocity: 5, gravity: 25, launchHeight: 0 });
    expect(trail).toHaveLength(2);
    const impact = P.inspectSample(trail, 1);
    expect(impact.t).toBeCloseTo(2 * 5 * Math.sin(5 * Math.PI / 180) / 25, 12);
    expect(impact.t).toBeLessThan(P.DT);
    expect(impact).toMatchObject({ impact: true, pe: 0, y: 0 });
  });

  it.each([-1, 0.5, NaN, Infinity, '0', 100000])('rejects invalid sample index %s', index => {
    expect(P.inspectSample(flight(), index)).toBeNull();
  });

  it('rejects incomplete, unsupported or non-finite evidence instead of reading current controls', () => {
    expect(P.inspectSample(null, 0)).toBeNull();
    for (const corrupt of [
      trail => { delete trail.parameters; },
      trail => { trail.modelVersion = 'unknown-model'; },
      trail => { trail.parameters = { ...trail.parameters, mass: 0 }; },
      trail => { trail.parameters = { ...trail.parameters, drag: 'false' }; },
      trail => { trail.parameters = { ...trail.parameters, launchHeight: undefined }; },
      trail => { trail[0].t = NaN; },
      trail => { trail[0].mY = -1; },
      trail => { trail[0].mVx = 1e308; },
    ]) {
      const trail = flight(); corrupt(trail);
      expect(P.inspectSample(trail, 0)).toBeNull();
    }
  });
});
