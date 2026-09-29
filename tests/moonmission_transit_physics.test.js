import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
let P;
beforeEach(() => {
  resetStemLab();
  loadTool(FILE, 'moonMission');
  P = window.MoonMissionPure;
});
const corrected = (P) => ({ speedError: 1, radialDeltaV: P.transit.correctedRadialDeltaV });

describe('Moon Mission moving-Moon outbound coast', () => {
  it('constructs the stated departure and a dynamically consistent circular Moon', () => {
    const C = P.transit, p = P.transitProfile(), first = p.samples[0];
    expect(first.earthAltitude).toBe(C.initialAltitude);
    expect(first.earthSpeed).toBeCloseTo(C.initialSpeed, 8);
    expect(Math.atan2(first.vx, first.vy) * 180 / Math.PI).toBeCloseTo(C.initialAngle, 10);
    expect(first.mass).toBe(C.dryMass + C.propellant);
    expect(first.engineOn).toBe(false);
    const period = 2 * Math.PI / C.angularRate;
    for (const time of [0, 86400, p.summary.duration, period]) {
      const m = P.transitMoonState(time);
      expect(Math.hypot(m.x, m.y)).toBeCloseTo(C.distance, 5);
      expect(Math.hypot(m.vx, m.vy)).toBeCloseTo(Math.sqrt((C.muEarth + C.muMoon) / C.distance), 8);
      expect(m.x * m.vx + m.y * m.vy).toBeCloseTo(0, 3);
    }
    expect(P.transitMoonState(86400).x).not.toBe(first.moonX);
    const cycle = P.transitMoonState(period);
    expect(Math.hypot(cycle.x - first.moonX, cycle.y - first.moonY)).toBeLessThan(0.000001);
  });

  it('uses direct and indirect lunar acceleration in its Earth-centered frame', () => {
    const C = P.transit, p = P.transitProfile(), time = 12 * 3600, h = 0.1;
    const a = P.transitSample(p, time - h), b = P.transitSample(p, time + h), s = P.transitSample(p, time);
    const dx = s.moonX - s.x, dy = s.moonY - s.y;
    const ax = -C.muEarth * s.x / s.earthDistance ** 3 + C.muMoon * (dx / s.moonDistance ** 3 - s.moonX / C.distance ** 3);
    const ay = -C.muEarth * s.y / s.earthDistance ** 3 + C.muMoon * (dy / s.moonDistance ** 3 - s.moonY / C.distance ** 3);
    expect(Math.abs((b.vx - a.vx) / (2 * h) - ax)).toBeLessThan(1e-7);
    expect(Math.abs((b.vy - a.vy) / (2 * h) - ay)).toBeLessThan(1e-7);
    // Omitting the origin acceleration produces a measurable wrong force.
    const directOnlyX = -C.muEarth * s.x / s.earthDistance ** 3 + C.muMoon * dx / s.moonDistance ** 3;
    const directOnlyY = -C.muEarth * s.y / s.earthDistance ** 3 + C.muMoon * dy / s.moonDistance ** 3;
    expect(Math.hypot(directOnlyX - ax, directOnlyY - ay)).toBeCloseTo(C.muMoon / C.distance ** 2, 12);
  });

  it('conserves the rotating-frame Jacobi integral throughout the unpowered coast', () => {
    const C = P.transit, p = P.transitProfile(), first = p.samples[0], end = p.samples.at(-1);
    for (const s of p.samples) {
      expect(Math.abs(s.jacobi - first.jacobi)).toBeLessThan(2e-8);
      expect(s.jacobiChange).toBe(0);
      expect(s.engineOn).toBe(false);
      expect(s.propellant).toBe(C.propellant);
      expect(s.mass).toBe(first.mass);
    }
    // Earth-only orbital energy is not a conserved quantity in this moving-Moon model.
    const energy = (s) => s.earthSpeed ** 2 / 2 - C.muEarth / s.earthDistance;
    expect(Math.abs(energy(end) - energy(first))).toBeGreaterThan(100000);
    expect(p.summary.outcome).toBe('encounter');
    expect(p.summary.closestAltitude).toBeGreaterThan(109000);
    expect(p.summary.closestAltitude).toBeLessThan(111000);
    expect(p.summary.duration / 3600).toBeGreaterThan(69);
    expect(p.summary.duration / 3600).toBeLessThan(71);
    expect(Math.abs(p.events.closest.moonRadialSpeed)).toBeLessThan(1e-6);
    expect(p.events.closest.phase).toBe('closest');
  });

  it('turns departure error into a real miss and a finite correction into a safe encounter', () => {
    const nominal = P.transitProfile(), missed = P.transitProfile({ speedError: 1 }), fixed = P.transitProfile(corrected(P));
    expect(missed.summary.outcome).toBe('miss');
    expect(missed.summary.closestAltitude).toBeGreaterThan(740000);
    expect(missed.summary.closestAltitude).toBeLessThan(755000);
    expect(fixed.summary.outcome).toBe('encounter');
    expect(Math.abs(fixed.summary.closestAltitude - nominal.summary.closestAltitude)).toBeLessThan(1);
    expect(fixed.summary.closestTime).not.toBe(nominal.summary.closestTime);
    expect(fixed.summary.actualBurn).toBeGreaterThan(2.9);
    expect(fixed.summary.actualBurn).toBeLessThan(3);
    expect(fixed.summary.propellantUsed).toBeGreaterThan(86);
    expect(fixed.summary.propellantUsed).toBeLessThan(87);
    expect(fixed.summary.propellantRemaining).toBeLessThan(missed.summary.propellantRemaining);
  });

  it('closes the mass, rocket-equation and thrust-work balances through the correction', () => {
    const C = P.transit, p = P.transitProfile(corrected(P)), first = p.samples[0];
    for (let i = 0; i < p.samples.length; i++) {
      const s = p.samples[i];
      expect(s.mass + s.propellantUsed).toBeCloseTo(first.mass, 7);
      expect(s.mass - s.propellant).toBeCloseTo(C.dryMass, 7);
      expect(s.propellant).toBeGreaterThanOrEqual(0);
      expect(s.idealDeltaV).toBeCloseTo(C.isp * C.g0 * Math.log(first.mass / s.mass), 6);
      // Integrated -2*v_rot dot a_thrust accounts for changing Jacobi during the burn.
      expect(Math.abs(s.jacobi - first.jacobi - s.jacobiChange)).toBeLessThan(2e-8);
      expect(Math.hypot(s.thrustX, s.thrustY)).toBeCloseTo(s.thrust, 6);
      expect(s.thrust).toBe(s.engineOn ? C.thrust : 0);
      if (i) {
        const prev = p.samples[i - 1];
        expect(prev.mass - s.mass).toBeCloseTo(prev.massFlow * (s.time - prev.time), 5);
      }
    }
    expect(p.summary.idealDeltaV).toBeCloseTo(Math.abs(C.correctedRadialDeltaV), 6);
    expect(p.summary.propellantUsed).toBeCloseTo(C.thrust / (C.isp * C.g0) * p.summary.actualBurn, 6);
  });

  it('resolves ignition and cutoff without state jumps or flames during coast', () => {
    const C = P.transit, p = P.transitProfile(corrected(P)), start = p.events.ignition, cut = p.events.cutoff;
    expect(start.time).toBe(C.ignitionTime);
    expect(start.engineOn).toBe(true);
    expect(P.transitSample(p, start.time - 0.0001).engineOn).toBe(false);
    expect(P.transitSample(p, start.time).engineOn).toBe(true);
    expect(P.transitSample(p, cut.time - 0.0001).engineOn).toBe(true);
    expect(P.transitSample(p, cut.time).engineOn).toBe(false);
    expect(cut.time - start.time).toBeCloseTo(p.summary.actualBurn, 7);
    for (let i = 1; i < p.samples.length; i++) {
      const a = p.samples[i - 1], b = p.samples[i];
      expect(b.time).toBeGreaterThanOrEqual(a.time);
      if (a.time === b.time) for (const key of ['x', 'y', 'vx', 'vy', 'mass']) expect(b[key]).toBe(a[key]);
      if (b.time > cut.time) {
        expect(b.engineOn).toBe(false);
        expect(b.mass).toBe(cut.mass);
        expect(b.propellant).toBe(cut.propellant);
      }
    }
    const zero = P.transitProfile();
    expect(zero.events.ignition.time).toBe(zero.events.cutoff.time);
    expect(zero.events.ignition.engineOn).toBe(false);
    expect(zero.summary.actualBurn).toBe(0);
  });

  it('freezes the commanded radial/transverse basis at ignition', () => {
    const p = P.transitProfile({ radialDeltaV: -4, tangentialDeltaV: 3 }), ignition = p.events.ignition;
    const ux = ignition.x / ignition.earthDistance, uy = ignition.y / ignition.earthDistance;
    const tx = (-4 * ux - 3 * uy) / 5, ty = (-4 * uy + 3 * ux) / 5;
    for (const s of p.samples.filter((s) => s.engineOn)) {
      expect(s.thrustX / s.thrust).toBeCloseTo(tx, 12);
      expect(s.thrustY / s.thrust).toBeCloseTo(ty, 12);
    }
    expect(p.summary.idealDeltaV).toBeCloseTo(5, 6);
  });

  it('ends fuel-limited burns at the available SPS propellant boundary', () => {
    const C = P.transit, p = P.transitProfile({ radialDeltaV: 20, propellant: 5 });
    expect(p.summary.cutoffReason).toBe('fuel');
    expect(p.summary.actualBurn).toBeCloseTo(5 / (C.thrust / (C.isp * C.g0)), 8);
    expect(p.events.cutoff.mass).toBeCloseTo(C.dryMass, 7);
    expect(p.summary.propellantRemaining).toBeLessThan(1e-8);
    expect(p.summary.idealDeltaV).toBeLessThan(1);
    expect(p.samples.filter((s) => s.time > p.events.cutoff.time).every((s) => !s.engineOn && s.mass === p.events.cutoff.mass)).toBe(true);
    const empty = P.transitProfile({ radialDeltaV: -20, propellant: 0 });
    expect(empty.summary.actualBurn).toBe(0);
    expect(empty.samples.every((s) => !s.engineOn && s.propellant === 0)).toBe(true);
  });

  it('distinguishes a low pass from an integrated lunar collision', () => {
    const low = P.transitProfile({ angleError: 0.01 }), impact = P.transitProfile({ angleError: 0.02 });
    expect(low.summary.outcome).toBe('hazardous');
    expect(low.summary.closestAltitude).toBeGreaterThan(0);
    expect(low.summary.closestAltitude).toBeLessThan(P.transit.safeAltitude);
    expect(impact.summary.outcome).toBe('impact');
    expect(impact.summary.impactBody).toBe('moon');
    expect(impact.summary.closestAltitude).toBeNull();
    expect(impact.events.closest).toBeNull();
    expect(Math.abs(impact.events.impact.moonAltitude)).toBeLessThan(0.001);
    expect(impact.events.impact.moonRadialSpeed).toBeLessThan(0);
    expect(P.transitSample(impact, impact.summary.duration + 100)).toEqual(impact.events.impact);
  });


  it('detects a grazing surface crossing before closest approach', () => {
    let low = 0.01, high = 0.02;
    for (let i = 0; i < 22; i++) {
      const mid = (low + high) / 2, p = P.transitProfile({ angleError: mid });
      if (p.summary.outcome === 'impact') high = mid; else low = mid;
    }
    const safe = P.transitProfile({ angleError: low });
    const hit = P.transitProfile({ angleError: high });
    expect(safe.summary.closestAltitude).toBeGreaterThan(0);
    expect(safe.summary.closestAltitude).toBeLessThan(0.1);
    expect(hit.summary.outcome).toBe('impact');
    expect(hit.events.closest).toBeNull();
    expect(Math.abs(hit.events.impact.moonAltitude)).toBeLessThan(0.001);
    expect(hit.events.impact.moonRadialSpeed).toBeLessThan(0);
  });

  it('measures the speed minimum from the trajectory in the stated Earth frame', () => {
    const p = P.transitProfile(), minimum = p.events.minimumEarthSpeed, t = minimum.time;
    expect(p.summary.minimumEarthSpeed).toBe(minimum.earthSpeed);
    expect(p.summary.minimumEarthSpeedTime).toBe(t);
    expect(minimum.earthSpeed).toBeGreaterThan(875);
    expect(minimum.earthSpeed).toBeLessThan(885);
    expect(P.transitSample(p, t - 10).earthSpeed).toBeGreaterThan(minimum.earthSpeed);
    expect(P.transitSample(p, t + 10).earthSpeed).toBeGreaterThan(minimum.earthSpeed);
    const earthPull = P.transit.muEarth / minimum.earthDistance ** 2;
    const moonPull = P.transit.muMoon / minimum.moonDistance ** 2;
    expect(Math.abs(earthPull / moonPull - 1)).toBeGreaterThan(0.05);
  });

  it('converges with tighter integration and replays independently of frame rate', () => {
    const plan = corrected(P), p = P.transitProfile(plan), fine = P.transitProfile({ ...plan, toleranceScale: 0.1 });
    expect(Math.abs(p.summary.closestAltitude - fine.summary.closestAltitude)).toBeLessThan(0.5);
    expect(Math.abs(p.summary.closestTime - fine.summary.closestTime)).toBeLessThan(0.001);
    expect(Math.abs(p.summary.minimumEarthSpeed - fine.summary.minimumEarthSpeed)).toBeLessThan(0.00001);
    const target = 180123.456, before = JSON.stringify(p);
    const direct = P.transitSample(p, target);
    for (const fps of [30, 60, 144]) {
      for (let frame = 0; frame < fps; frame++) P.transitSample(p, target * frame / fps);
      expect(P.transitSample(p, target)).toEqual(direct);
    }
    expect(JSON.stringify(p)).toBe(before);
    const s = P.transitSample(p, 172000);
    expect(s.earthDistance).toBeCloseTo(Math.hypot(s.x, s.y), 6);
    expect(s.moonDistance).toBeCloseTo(Math.hypot(s.x - s.moonX, s.y - s.moonY), 6);
    expect(s.moonSpeed).toBeCloseTo(Math.hypot(s.vx - s.moonVx, s.vy - s.moonVy), 8);
  });

  it('normalizes controls, bounds its cache and protects recorded state from mutation', () => {
    const normal = P.normalizeTransitPlan({ speedError: Infinity, angleError: '0.02', radialDeltaV: -99, tangentialDeltaV: 99 });
    expect(normal).toEqual({ speedError: 0, angleError: 0, radialDeltaV: -20, tangentialDeltaV: 20 });
    const p = P.transitProfile();
    expect(P.transitProfile({})).toBe(p);
    expect(Object.isFrozen(p)).toBe(true);
    expect(Object.isFrozen(p.samples[0])).toBe(true);
    expect(Object.isFrozen(p.events.minimumEarthSpeed)).toBe(true);
    const detached = P.transitSample(p, 0); detached.x = 0;
    expect(P.transitSample(p, 0).x).not.toBe(0);
    expect(P.transitSample(p, NaN).time).toBe(0);
    for (let i = 1; i <= 7; i++) P.transitProfile({ speedError: i / 10 });
    expect(P.transitProfile()).not.toBe(p);
    for (const value of Object.values(p.summary)) if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
    for (const s of p.samples) for (const value of Object.values(s)) if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
  });
});
