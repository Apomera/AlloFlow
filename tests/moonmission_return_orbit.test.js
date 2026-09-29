import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let P;
beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  resetStemLab(); loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
});
afterAll(() => vi.restoreAllMocks());

describe('conserved trans-Earth orbit', () => {
  it.each([-4, -6.5, -9])('matches entry position, total speed and angle at %s degrees', angle => {
    const p = P.returnProfile(angle), first = P.returnSample(p, 0), end = P.returnSample(p, p.summary.duration);
    expect(first.radius).toBeCloseTo(384400000, 5);
    expect(end.altitude).toBeCloseTo(P.entry.interfaceAltitude, 5);
    expect(end.speed).toBeCloseTo(P.entry.interfaceSpeed, 7);
    expect(end.gamma).toBeCloseTo(angle, 8);
    expect(end.radialSpeed).toBeCloseTo(end.speed * Math.sin(angle * Math.PI / 180), 7);
    expect(end.tangentialSpeed).toBeCloseTo(end.speed * Math.cos(angle * Math.PI / 180), 7);
    expect(end.atInterface).toBe(true);
    expect(first.atInterface).toBe(false);
  });

  it('conserves energy and angular momentum throughout the same drawn trajectory', () => {
    const p = P.returnProfile(), E = P.entry;
    for (const row of p.samples) {
      expect(Math.abs(row.speed ** 2 / 2 - E.mu / Math.hypot(row.x, row.y) - p.summary.energy)).toBeLessThan(1e-6);
      expect(Math.abs((row.x * row.vy - row.y * row.vx) / p.summary.angularMomentum - 1)).toBeLessThan(2e-13);
      expect(row.radius).toBe(Math.hypot(row.x, row.y));
      expect(row.speed).toBe(Math.hypot(row.vx, row.vy));
      expect(row.speed).toBeCloseTo(Math.hypot(row.radialSpeed, row.tangentialSpeed), 8);
    }
  });

  it('gets Cartesian velocity and gravity from derivatives of position at physical time', () => {
    const p = P.returnProfile(), mu = P.entry.mu;
    for (const t of [1000, p.summary.duration / 2, p.summary.duration - 900, p.summary.duration - 10]) {
      const a = P.returnSample(p, t - 0.05), b = P.returnSample(p, t + 0.05), row = P.returnSample(p, t);
      expect((b.x - a.x) / 0.1).toBeCloseTo(row.vx, 3);
      expect((b.y - a.y) / 0.1).toBeCloseTo(row.vy, 3);
      expect((b.vx - a.vx) / 0.1).toBeCloseTo(-mu * row.x / row.radius ** 3, 4);
      expect((b.vy - a.vy) / 0.1).toBeCloseTo(-mu * row.y / row.radius ** 3, 4);
    }
  });

  it('agrees with an independent forward RK4 integration of Earth gravity', () => {
    const p = P.returnProfile(), first = p.samples[0], mu = P.entry.mu;
    let state = [first.x, first.y, first.vx, first.vy], time = 0;
    const derivative = ([x, y, vx, vy]) => { const r = Math.hypot(x, y); return [vx, vy, -mu * x / r ** 3, -mu * y / r ** 3]; };
    while (time < p.summary.duration) {
      const radius = Math.hypot(state[0], state[1]);
      const dt = Math.min(60, 0.01 * Math.sqrt(radius ** 3 / mu), p.summary.duration - time);
      const k1 = derivative(state), k2 = derivative(state.map((v, i) => v + k1[i] * dt / 2));
      const k3 = derivative(state.map((v, i) => v + k2[i] * dt / 2)), k4 = derivative(state.map((v, i) => v + k3[i] * dt));
      state = state.map((v, i) => v + dt * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6); time += dt;
    }
    const end = p.events.interface;
    expect(Math.hypot(state[0] - end.x, state[1] - end.y)).toBeLessThan(10);
    expect(Math.hypot(state[2] - end.vx, state[3] - end.vy)).toBeLessThan(0.02);
  });

  it('distinguishes decreasing altitude from the longer curved path length', () => {
    const p = P.returnProfile(); let radialDistance = 0, pathLength = 0;
    const count = 10000, dt = p.summary.duration / count;
    let before = P.returnSample(p, 0);
    for (let i = 1; i <= count; i++) {
      const row = P.returnSample(p, i * dt);
      expect(row.radius).toBeLessThan(before.radius); expect(row.speed).toBeGreaterThan(before.speed);
      radialDistance += (row.closingSpeed + before.closingSpeed) * dt / 2;
      pathLength += (row.speed + before.speed) * dt / 2; before = row;
    }
    const fall = p.samples[0].radius - p.events.interface.radius;
    expect(Math.abs(radialDistance / fall - 1)).toBeLessThan(0.00001);
    expect(pathLength).toBeGreaterThan(fall * 1.03);
    expect(p.events.interface.closingSpeed).toBeLessThan(p.events.interface.speed / 5);
  });

  it('locates separation at an exact elapsed time without changing the orbit', () => {
    const p = P.returnProfile(), event = p.events.separation;
    expect(event.remainingSeconds).toBe(833);
    expect(P.returnSample(p, event.time - 0.001).serviceModuleSeparated).toBe(false);
    expect(P.returnSample(p, event.time).serviceModuleSeparated).toBe(true);
    expect(event.energy).toBeCloseTo(p.summary.energy, 5);
    expect(event.angularMomentum / p.summary.angularMomentum).toBeCloseTo(1, 12);
    expect(p.samples.some(row => row.time === event.time)).toBe(true);
  });

  it('uses actual position for Earth angular radius and a consistent illumination preset', () => {
    const p = P.returnProfile();
    for (const fraction of [0, 0.5, 0.99, 1]) {
      const row = P.returnSample(p, p.summary.duration * fraction), view = row.view;
      expect(view.angRadiusDeg).toBeCloseTo(Math.asin(P.entry.radius / row.radius) * 180 / Math.PI, 10);
      expect(view.lit).toBeCloseTo((1 + row.y / row.radius) / 2, 12);
      expect(P.returnView(row.altitude / 1000).angRadiusDeg).toBeCloseTo(view.angRadiusDeg, 8);
      expect(P.returnView(row.altitude / 1000).lit).toBeCloseTo(view.lit, 8);
    }
    expect(p.events.interface.view.angRadiusDeg).toBeGreaterThan(78);
  });

  it('keeps all selectable angles finite and gives each angle a different momentum and arrival time', () => {
    let previous = null;
    for (let angle = -4; angle >= -9.001; angle -= 0.1) {
      const p = P.returnProfile(angle), end = p.events.interface;
      for (const value of Object.values(p.summary)) expect(Number.isFinite(value)).toBe(true);
      expect(p.summary.duration / 86400).toBeGreaterThan(2.6); expect(p.summary.duration / 86400).toBeLessThan(2.63);
      expect(end.gamma).toBeCloseTo(angle, 8);
      if (previous) { expect(p.summary.angularMomentum).toBeLessThan(previous.angularMomentum); expect(p.summary.duration).toBeLessThan(previous.duration); }
      previous = p.summary;
    }
  });

  it('bounds inputs, clamps sampling and retains a bounded immutable profile cache', () => {
    const p = P.returnProfile();
    expect(P.returnProfile(NaN)).toBe(p); expect(P.returnProfile(6.5)).toBe(p);
    expect(P.returnProfile(-100).angle).toBe(-9); expect(P.returnProfile(-1).angle).toBe(-4);
    expect(P.returnSample(p, -1)).toEqual(p.samples[0]); expect(P.returnSample(p, NaN)).toEqual(p.samples[0]);
    expect(P.returnSample(p, 1e10)).toEqual(p.events.interface);
    expect(Object.isFrozen(p.orbit)).toBe(true); expect(Object.isFrozen(p.samples[10])).toBe(true);
    expect(Object.isFrozen(p.samples[10].view)).toBe(true); expect(Object.isFrozen(p.summary)).toBe(true);
    const detached = P.returnSample(p, 100); detached.view.lit = -1;
    expect(P.returnSample(p, 100).view.lit).toBeGreaterThanOrEqual(0);
    for (const angle of [-4, -4.2, -4.4, -4.6, -4.8, -5]) P.returnProfile(angle);
    expect(P.returnProfile()).not.toBe(p); expect(P.returnProfile().summary).toEqual(p.summary);
  });
});
