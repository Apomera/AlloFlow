import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let P;
beforeAll(() => { resetStemLab(); loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission'); P = window.MoonMissionPure; });
describe('finite S-IVB injection physics', () => {
  it('uses the launch reserve and the circular parking state with the same J-2 engine', () => {
    const s = P.tliInitialState(), C = P.tliPhysics, L = P.launch;
    expect(s.mass - C.dryMass).toBeCloseTo(P.launchProfile().summary.propellantRemaining, 8);
    expect(C.dryMass).toBe(L.payloadMass + L.stages[2].dryMass);
    expect(C.thrust).toBe(L.stages[2].vacuumThrust);
    expect(C.exhaustVelocity).toBe(L.stages[2].vacuumIsp * L.g0);
    expect(s.vy).toBeCloseTo(P.orbitSnapshot(0).speed, 10);
    expect(P.tliElements(s).apogee).toBeCloseTo(185000, 6);
  });
  it.each([[300, 'insufficient'], [342, 'lunar-distance'], [350, 'escape']])('measures the %s second cutoff as %s', (duration, outcome) => {
    const p = P.tliProfile({ duration }), s = p.summary, C = P.tliPhysics;
    expect(s.outcome).toBe(outcome); expect(s.duration).toBe(duration);
    expect(s.propellantUsed).toBeCloseTo(C.thrust / C.exhaustVelocity * duration, 5);
    expect(s.mass).toBeCloseTo(p.initialMass - s.propellantUsed, 8);
    expect(s.deltaV).toBeCloseTo(C.exhaustVelocity * Math.log(p.initialMass / s.mass), 10);
    expect(s.propellantRemaining).toBeGreaterThan(C.reserve);
    expect(s.perigee).toBeGreaterThan(185000);
    const end = p.samples.at(-1);
    expect(end.thrust).toBe(0); expect(end.properAcceleration).toBe(0);
    for (const row of p.samples) {
      expect(row.mass).toBeGreaterThanOrEqual(C.dryMass + C.reserve);
      expect(row.energy).toBeCloseTo(row.speed ** 2 / 2 - C.mu / row.radius, 7);
    }
    if (outcome === 'escape') { expect(s.energy).toBeGreaterThan(0); expect(s.apogee).toBeNull(); }
    else expect(s.apogee + C.radius >= C.moonRadius).toBe(outcome === 'lunar-distance');
  });
  it('separates engine impulse from the change in inertial speed and shows increasing acceleration', () => {
    const p = P.tliProfile(), a = P.tliSample(p, 1), b = P.tliSample(p, 341);
    expect(p.summary.deltaV).toBeCloseTo(3166.6003, 3);
    expect(p.summary.deltaV).toBeGreaterThan(p.summary.speed - p.samples[0].speed + 100);
    expect(b.properAcceleration).toBeGreaterThan(a.properAcceleration * 2);
    expect(p.summary.apogee / 1000).toBeCloseTo(472607.176, 2);
  });
  it('conserves energy and angular momentum during an independent coast', () => {
    const s = { ...P.tliSample(P.tliProfile(), 342) }, before = P.tliElements(s);
    P.tliStep(s, 600, false); const after = P.tliElements(s);
    expect(after.energy / before.energy).toBeCloseTo(1, 10);
    expect(after.angularMomentum / before.angularMomentum).toBeCloseTo(1, 11);
    expect(s.mass).toBeCloseTo(P.tliProfile().summary.mass, 8);
  });
  it('spends a tiny supply without passing the reserve or inventing engine impulse', () => {
    const C = P.tliPhysics, s = P.tliInitialState(C.reserve + 0.001), initial = { ...s }, coast = { ...s };
    P.tliStep(s, 1); P.tliStep(coast, 1, false);
    const impulse = Math.hypot(s.vx - coast.vx, s.vy - coast.vy);
    expect(s.mass).toBe(C.dryMass + C.reserve);
    expect(impulse).toBeCloseTo(C.exhaustVelocity * Math.log(initial.mass / s.mass), 7);
    expect(s.time).toBeCloseTo(1, 10);
  });
  it('links position derivatives, thrust work and angular momentum changes', () => {
    const p = P.tliProfile(), C = P.tliPhysics;
    for (const t of [30.125, 130.75, 320.345]) {
      const dt = 0.002, a = P.tliSample(p, t - dt), s = P.tliSample(p, t), b = P.tliSample(p, t + dt);
      expect((b.x - a.x) / (2 * dt)).toBeCloseTo(s.vx, 3);
      expect((b.y - a.y) / (2 * dt)).toBeCloseTo(s.vy, 3);
      expect((b.energy - a.energy) / (2 * dt)).toBeCloseTo(C.thrust / s.mass * s.speed, 1);
      expect((b.angularMomentum - a.angularMomentum) / (2 * dt)).toBeCloseTo(s.angularMomentum * C.thrust / (s.mass * s.speed), -1);
    }
  });
  it('agrees with an independent polar midpoint integration', () => {
    const C = P.tliPhysics, p = P.tliProfile(), dt = 0.01;
    let q = { r: C.radius + C.altitude, theta: 0, vr: 0, vt: p.samples[0].speed, mass: p.initialMass };
    function derivative(s) {
      const speed = Math.hypot(s.vr, s.vt), a = C.thrust / s.mass;
      return { r: s.vr, theta: s.vt / s.r, vr: s.vt ** 2 / s.r - C.mu / s.r ** 2 + a * s.vr / speed,
        vt: -s.vr * s.vt / s.r + a * s.vt / speed, mass: -C.thrust / C.exhaustVelocity };
    }
    for (let i = 0; i < 34200; i++) {
      const a = derivative(q), mid = {}; for (const k in q) mid[k] = q[k] + a[k] * dt / 2;
      const b = derivative(mid); for (const k in q) q[k] += b[k] * dt;
    }
    const end = P.tliSample(p, 342);
    expect(Math.hypot(q.r * Math.cos(q.theta) - end.x, q.r * Math.sin(q.theta) - end.y)).toBeLessThan(0.02);
    expect(q.vr).toBeCloseTo(end.radialSpeed, 4); expect(q.vt).toBeCloseTo(end.tangentialSpeed, 4);
    expect(q.mass).toBeCloseTo(end.mass, 4);
  });
  it('keeps profiles immutable, inspected samples detached and invalid times inert', () => {
    const p = P.tliProfile(); expect(P.tliProfile()).toBe(p);
    for (const value of [p, p.summary, p.samples, p.samples[0]]) expect(Object.isFrozen(value)).toBe(true);
    const s = P.tliSample(p, 100); s.mass = 0; expect(P.tliSample(p, 100).mass).toBeGreaterThan(100000);
    for (const raw of [null, {}, { duration: Infinity }, { duration: '300' }, { duration: 341 }]) expect(P.tliPlan(raw).duration).toBe(342);
    const q = P.tliInitialState(), before = { ...q }; for (const dt of [-1, 0, NaN, Infinity]) P.tliStep(q, dt); expect(q).toEqual(before);
  });
});
