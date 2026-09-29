import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let P;
beforeEach(() => {
  resetStemLab();
  loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
});

describe('Moon Mission physical lunar ascent', () => {
  it('starts with Apollo-like fixed APS thrust and the ascent stage mass only', () => {
    const C = P.ascent, p = P.ascentProfile(), first = p.events.liftoff;
    expect(first.mass).toBe(4890);
    expect(first.mass).toBe(C.dryMass + C.propellant);
    expect(first.propellant).toBe(2365);
    expect(first.thrust).toBeCloseTo(15568.7756534, 6);
    expect(first.massFlow).toBeCloseTo(C.thrust / (C.isp * C.g0), 10);
    expect(first.altitude).toBe(0);
    expect(first.speed).toBe(0);
    expect(first.pitch).toBe(0);
    expect(first.gravity).toBeCloseTo(1.62490443, 7);
    expect(first.thrust / first.mass / first.gravity).toBeGreaterThan(1.9);
    expect(first.thrust / first.mass / first.gravity).toBeLessThan(2.1);
  });

  it('conserves mass with finite propellant and rocket-equation exhaust flow', () => {
    const C = P.ascent, p = P.ascentProfile(), start = p.events.liftoff;
    for (let i = 0; i < p.samples.length; i++) {
      const s = p.samples[i];
      expect(s.propellant).toBeGreaterThanOrEqual(C.reserve - 1e-6);
      expect(s.mass + s.propellantUsed).toBeCloseTo(start.mass, 6);
      expect(s.mass - s.propellant).toBeCloseTo(C.dryMass, 6);
      expect(s.propellant + s.propellantUsed).toBeCloseTo(C.propellant, 6);
      expect(s.massFlow).toBeCloseTo(s.thrust / (C.isp * C.g0), 10);
      if (!i) continue;
      const previous = p.samples[i - 1], dt = s.time - previous.time;
      expect(s.mass).toBeLessThanOrEqual(previous.mass);
      expect(previous.mass - s.mass).toBeCloseTo(previous.massFlow * dt, 6);
    }
  });

  it('integrates altitude, downrange and speed from the same force history', () => {
    const C = P.ascent, p = P.ascentProfile();
    let altitude = 0, angle = 0, radial = 0, tangent = 0;
    const acceleration = (s) => ({
      radial: s.thrust / s.mass * Math.cos(s.pitch) + s.tangentialSpeed ** 2 / (C.radius + s.altitude) - s.gravity,
      tangent: s.thrust / s.mass * Math.sin(s.pitch) - s.radialSpeed * s.tangentialSpeed / (C.radius + s.altitude),
    });
    for (let i = 1; i < p.samples.length; i++) {
      const a = p.samples[i - 1], b = p.samples[i], dt = b.time - a.time;
      const aa = acceleration(a), ab = acceleration(b);
      altitude += dt * (a.radialSpeed + b.radialSpeed) / 2;
      angle += dt * (a.tangentialSpeed / (C.radius + a.altitude) + b.tangentialSpeed / (C.radius + b.altitude)) / 2;
      radial += dt * (aa.radial + ab.radial) / 2;
      tangent += dt * (aa.tangent + ab.tangent) / 2;
      expect(b.speed).toBeCloseTo(Math.hypot(b.radialSpeed, b.tangentialSpeed), 9);
      expect(b.downrange).toBeCloseTo(b.angle * C.radius, 8);
    }
    const end = p.events.cutoff;
    expect(Math.abs(end.altitude - altitude)).toBeLessThan(0.05);
    expect(Math.abs(end.angle - angle)).toBeLessThan(1e-7);
    expect(Math.abs(end.radialSpeed - radial)).toBeLessThan(0.002);
    expect(Math.abs(end.tangentialSpeed - tangent)).toBeLessThan(0.002);
  });

  it('accounts for thrust work and ideal delta-v without gravity creating energy', () => {
    const C = P.ascent, p = P.ascentProfile();
    for (const s of p.samples) {
      const energy = s.speed ** 2 / 2 - C.mu / (C.radius + s.altitude);
      expect(Math.abs(energy + C.mu / C.radius - s.energyGain)).toBeLessThan(0.001);
      expect(s.idealDeltaV).toBeCloseTo(C.isp * C.g0 * Math.log(p.events.liftoff.mass / s.mass), 5);
      expect(s.loadG).toBeCloseTo(s.thrust / (s.mass * C.g0), 10);
    }
    expect(p.summary.idealDeltaV).toBeGreaterThan(p.summary.cutoffSpeed);
    expect(p.summary.peakG).toBeLessThan(0.7);
    expect(p.events.cutoff.loadG).toBe(0);
    expect(p.events.cutoff.gravity).toBeGreaterThan(1.5);
  });

  it('keeps the initial climb vertical before pitching the entire ascent stage', () => {
    const p = P.ascentProfile(), C = P.ascent;
    expect(p.events.pitch.time).toBe(C.verticalSeconds);
    expect(p.events.pitch.pitch).toBe(0);
    expect(p.events.pitch.tangentialSpeed).toBe(0);
    expect(p.events.pitch.altitude).toBeGreaterThan(70);
    expect(p.events.pitch.altitude).toBeLessThan(90);
    const climbing = P.ascentSample(p, 60);
    expect(climbing.pitch).toBeGreaterThan(0.9);
    expect(climbing.radialSpeed).toBeGreaterThan(40);
    expect(climbing.tangentialSpeed).toBeGreaterThan(climbing.radialSpeed);
    for (let i = 1; i < p.samples.length; i++) {
      const a = p.samples[i - 1], b = p.samples[i];
      expect(Math.abs(b.pitch - a.pitch)).toBeLessThanOrEqual(C.pitchRate * (b.time - a.time) + 1e-9);
    }
  });

  it('cuts off into a computed low lunar ellipse with an Apollo-like burn time', () => {
    const C = P.ascent, p = P.ascentProfile(), end = p.events.cutoff, orbit = P.ascentOrbitElements(end);
    expect(p.summary.outcome).toBe('orbit');
    expect(p.summary.cutoffReason).toBe('insertion');
    expect(p.summary.duration).toBeGreaterThan(425);
    expect(p.summary.duration).toBeLessThan(445);
    expect(end.engineOn).toBe(false);
    expect(end.orbit).toBe(true);
    expect(orbit.bound).toBe(true);
    expect(orbit.perilune).toBeGreaterThanOrEqual(C.targetPerilune);
    expect(orbit.apolune).toBeGreaterThanOrEqual(C.targetApolune);
    expect(orbit.apolune).toBeLessThan(C.targetApolune + 0.01);
    expect(p.summary.perilune).toBe(orbit.perilune);
    expect(p.summary.apolune).toBe(orbit.apolune);
    expect(p.summary.period / 60).toBeGreaterThan(110);
    expect(p.summary.period / 60).toBeLessThan(116);
    expect(end.propellant).toBeGreaterThan(100);
    expect(end.propellant).toBeLessThan(175);
    expect(end.speed).toBeGreaterThan(1650);
    expect(end.speed).toBeLessThan(1720);
    expect(end.speed ** 2).toBeCloseTo(C.mu * (2 / (C.radius + end.altitude) - 1 / orbit.semimajorAxis), 6);
    expect(P.ascentSample(p, end.time - 0.001).engineOn).toBe(true);
    expect(P.ascentSample(p, end.time).engineOn).toBe(false);
  });

  it('rejects a tall vertical trajectory as orbit despite its total speed', () => {
    const vertical = P.ascentOrbitElements({ altitude: 20000, radialSpeed: 1685, tangentialSpeed: 0 });
    expect(vertical.bound).toBe(true);
    expect(vertical.perilune).toBe(-P.ascent.radius);
    expect(vertical.angularMomentum).toBe(0);
    const escape = P.ascentOrbitElements({ altitude: 20000, radialSpeed: 3000, tangentialSpeed: 100 });
    expect(escape.bound).toBe(false);
    expect(escape.apolune).toBeNull();
    expect(escape.period).toBeNull();
  });

  it('reports a fuel-starved failure without manufacturing an orbital endpoint', () => {
    const p = P.ascentProfile({ propellant: 1000 }), C = P.ascent, end = p.events.cutoff;
    expect(p.summary.outcome).toBe('suborbital');
    expect(p.summary.cutoffReason).toBe('propellant');
    expect(end.propellant).toBeCloseTo(C.reserve, 8);
    expect(end.mass).toBeCloseTo(C.dryMass + C.reserve, 6);
    expect(end.speed).toBeLessThan(900);
    expect(end.altitude).toBeLessThan(12000);
    expect(p.summary.perilune).toBeLessThan(0);
    expect(end.engineOn).toBe(false);
    expect(end.orbit).toBe(false);
    expect(p.summary.duration).toBeCloseTo((1000 - C.reserve) / (C.thrust / (C.isp * C.g0)), 7);
    const empty = P.ascentProfile({ propellant: 0 });
    expect(empty.summary.duration).toBe(0);
    expect(empty.summary.outcome).toBe('suborbital');
    expect(empty.events.liftoff.engineOn).toBe(false);
    expect(empty.events.cutoff.propellant).toBe(0);
    expect(empty.events.cutoff.mass).toBe(C.dryMass);
  });

  it('converges when the integration step is halved and is independent of paint rate', () => {
    const normal = P.ascentProfile(), fine = P.ascentProfile({ step: 0.125 });
    expect(Math.abs(normal.summary.duration - fine.summary.duration)).toBeLessThan(0.03);
    expect(Math.abs(normal.summary.perilune - fine.summary.perilune)).toBeLessThan(5);
    expect(Math.abs(normal.summary.cutoffAltitude - fine.summary.cutoffAltitude)).toBeLessThan(1);
    expect(Math.abs(normal.summary.propellantRemaining - fine.summary.propellantRemaining)).toBeLessThan(0.2);
    for (const fps of [20, 60, 120]) {
      let seconds = 0;
      for (let i = 0; i < fps * 10; i++) seconds += 30 / fps;
      const a = P.ascentSample(normal, seconds), b = P.ascentSample(normal, 300);
      expect(a.altitude).toBeCloseTo(b.altitude, 6);
      expect(a.mass).toBeCloseTo(b.mass, 6);
      expect(a.speed).toBeCloseTo(b.speed, 6);
    }
  });

  it('distinguishes a surface-clearing orbit below target from a suborbital failure', () => {
    const p = P.ascentProfile({ propellant: 2250 });
    expect(p.summary.outcome).toBe('target-miss');
    expect(p.summary.cutoffReason).toBe('propellant');
    expect(p.summary.perilune).toBeGreaterThan(0);
    expect(p.summary.apolune).toBeLessThan(P.ascent.targetApolune);
    expect(p.events.cutoff.orbit).toBe(true);
    expect(p.events.cutoff.engineOn).toBe(false);
  });

  it('keeps cached trajectories immutable, validates times and returns detached samples', () => {
    const p = P.ascentProfile();
    expect(P.ascentProfile()).toBe(p);
    expect(Object.isFrozen(p)).toBe(true);
    expect(Object.isFrozen(p.samples)).toBe(true);
    expect(Object.isFrozen(p.events.cutoff)).toBe(true);
    expect(Object.isFrozen(p.summary)).toBe(true);
    expect(P.ascentSample(p, NaN)).toEqual(P.ascentSample(p, 0));
    expect(P.ascentSample(p, -200)).toEqual(P.ascentSample(p, 0));
    expect(P.ascentSample(p, 100000)).toEqual(p.events.cutoff);
    const sample = P.ascentSample(p, 120.123);
    sample.altitude = -999;
    expect(P.ascentSample(p, 120.123).altitude).toBeGreaterThan(5000);
    const end = P.ascentSample(p, p.summary.duration);
    end.mass = 1;
    expect(p.events.cutoff.mass).toBeGreaterThan(2600);
    for (const row of p.samples) {
      for (const value of Object.values(row)) if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
    }
  });
});
