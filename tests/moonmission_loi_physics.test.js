import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let P;
beforeEach(() => {
  resetStemLab();
  loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
});

describe('Moon Mission finite-burn lunar capture', () => {
  it('constructs a hyperbolic arrival from excess energy and unpowered perilune', () => {
    const C = P.loi, p = P.loiProfile(), first = p.samples[0], o = P.loiOrbitElements(first);
    expect(first.time).toBe(0);
    expect(first.engineOn).toBe(false);
    expect(first.phase).toBe('approach');
    expect(first.radialSpeed).toBeLessThan(0);
    expect(first.tangentialSpeed).toBeGreaterThan(0);
    expect(first.mass).toBe(C.dryMass + C.propellant);
    expect(o.bound).toBe(false);
    expect(o.energy).toBeCloseTo(C.excessSpeed ** 2 / 2, 7);
    expect(o.perilune).toBeCloseTo(C.arrivalPerilune, 6);
    expect(o.eccentricity).toBeGreaterThan(1);
    expect(o.apolune).toBeNull();
    expect(o.period).toBeNull();
  });

  it('cannot capture an unpowered flyby and conserves orbital energy and momentum', () => {
    const C = P.loi, p = P.loiProfile({ burnDuration: 0 }), first = p.samples[0];
    const initial = P.loiOrbitElements(first);
    expect(p.summary.outcome).toBe('flyby');
    expect(p.summary.actualBurn).toBe(0);
    expect(p.events.ignition.time).toBe(p.events.cutoff.time);
    expect(p.events.ignition.engineOn).toBe(false);
    expect(p.events.periapsis.time).toBeCloseTo(C.approachSeconds, 5);
    expect(p.events.periapsis.altitude).toBeCloseTo(C.arrivalPerilune, 4);
    expect(p.samples.at(-1).radialSpeed).toBeGreaterThan(0);
    expect(p.summary.apolune).toBeNull();
    for (const s of p.samples) {
      const o = P.loiOrbitElements(s);
      expect(s.engineOn).toBe(false);
      expect(s.propellant).toBe(C.propellant);
      expect(s.mass).toBe(first.mass);
      expect(Math.abs(o.energy - initial.energy)).toBeLessThan(0.00002);
      expect(Math.abs(o.angularMomentum / initial.angularMomentum - 1)).toBeLessThan(1e-11);
    }
  });

  it('starts and ends the finite fixed-thrust burn at the selected times', () => {
    const C = P.loi, p = P.loiProfile();
    expect(p.events.ignition.time).toBe(C.approachSeconds - p.controls.ignitionLead);
    expect(p.events.cutoff.time - p.events.ignition.time).toBe(p.controls.burnDuration);
    expect(P.loiSample(p, p.events.ignition.time - 0.001).engineOn).toBe(false);
    expect(P.loiSample(p, p.events.ignition.time).engineOn).toBe(true);
    expect(P.loiSample(p, p.events.cutoff.time - 0.001).engineOn).toBe(true);
    expect(P.loiSample(p, p.events.cutoff.time).engineOn).toBe(false);
    for (const s of p.samples) {
      expect(s.thrust).toBe(s.engineOn ? C.thrust : 0);
      expect(s.massFlow).toBeCloseTo(s.thrust / (C.isp * C.g0), 10);
      expect(s.loadG).toBeCloseTo(s.thrust / (s.mass * C.g0), 10);
    }
    for (let i = 1; i < p.samples.length; i++) {
      const a = p.samples[i - 1], b = p.samples[i];
      if (a.time !== b.time) continue;
      for (const key of ['x', 'y', 'vx', 'vy', 'mass', 'propellant']) expect(b[key]).toBe(a[key]);
    }
  });

  it('accounts for propellant, thrust work and rocket-equation delta-v together', () => {
    const C = P.loi, p = P.loiProfile(), first = p.samples[0];
    let lastEnergy = Infinity;
    for (let i = 0; i < p.samples.length; i++) {
      const s = p.samples[i];
      expect(s.mass + s.propellantUsed).toBeCloseTo(first.mass, 5);
      expect(s.mass - s.propellant).toBeCloseTo(C.dryMass, 5);
      expect(s.propellant).toBeGreaterThanOrEqual(0);
      expect(Math.abs(s.energy - first.energy - s.energyGain)).toBeLessThan(0.001);
      expect(s.idealDeltaV).toBeCloseTo(C.isp * C.g0 * Math.log(first.mass / s.mass), 5);
      if (s.engineOn) expect(s.energy).toBeLessThanOrEqual(lastEnergy + 1e-6);
      lastEnergy = s.energy;
      if (!i) continue;
      const previous = p.samples[i - 1];
      expect(previous.mass - s.mass).toBeCloseTo(previous.massFlow * (s.time - previous.time), 5);
    }
    expect(p.summary.propellantUsed).toBeCloseTo(C.thrust / (C.isp * C.g0) * p.summary.actualBurn, 6);
    expect(p.summary.idealDeltaV).toBeGreaterThan(850);
    expect(p.summary.idealDeltaV).toBeLessThan(875);
  });

  it('reaches a computed capture ellipse and coasts around it with the engine off', () => {
    const C = P.loi, p = P.loiProfile(), cut = p.events.cutoff, end = p.samples.at(-1);
    const orbit = P.loiOrbitElements(cut);
    expect(p.summary.outcome).toBe('captured');
    expect(p.summary.bound).toBe(true);
    expect(orbit.perilune).toBeGreaterThan(C.safePerilune);
    expect(orbit.apolune).toBeLessThan(C.maxCaptureApolune);
    expect(p.summary.perilune).toBeCloseTo(orbit.perilune, 3);
    expect(p.summary.apolune).toBeCloseTo(orbit.apolune, 3);
    expect(orbit.perilune).toBeGreaterThan(90000);
    expect(orbit.apolune).toBeLessThan(300000);
    expect(p.summary.duration - cut.time).toBeCloseTo(orbit.period, 4);
    expect(Math.hypot(end.x - cut.x, end.y - cut.y)).toBeLessThan(0.01);
    expect(Math.hypot(end.vx - cut.vx, end.vy - cut.vy)).toBeLessThan(0.0001);
    for (const s of p.samples.filter((s) => s.time > cut.time)) {
      expect(s.engineOn).toBe(false);
      expect(s.propellant).toBe(cut.propellant);
      expect(s.mass).toBe(cut.mass);
    }
  });

  it('distinguishes weak capture outside the corridor from a useful lunar orbit', () => {
    const short = P.loiProfile({ burnDuration: 50 });
    const weak = P.loiProfile({ burnDuration: 200 });
    const useful = P.loiProfile({ burnDuration: 300 });
    expect(short.summary.outcome).toBe('flyby');
    expect(weak.summary.outcome).toBe('hazardous');
    expect(weak.summary.bound).toBe(true);
    expect(weak.summary.apolune).toBeGreaterThan(P.loi.maxCaptureApolune);
    expect(useful.summary.outcome).toBe('captured');
    expect(useful.summary.apolune).toBeLessThan(weak.summary.apolune);
    expect(useful.summary.propellantRemaining).toBeLessThan(weak.summary.propellantRemaining);
  });

  it('follows an overburn into a real surface crossing instead of snapping to orbit', () => {
    const p = P.loiProfile({ burnDuration: 600 }), impact = p.events.impact;
    expect(p.summary.outcome).toBe('impact');
    expect(p.summary.perilune).toBeLessThan(0);
    expect(impact).not.toBeNull();
    expect(impact.radialSpeed).toBeLessThan(0);
    expect(impact.time).toBeGreaterThan(p.events.cutoff.time);
    expect(Math.abs(Math.hypot(impact.x, impact.y) - P.loi.radius)).toBeLessThan(0.001);
    expect(impact.phase).toBe('impact');
    expect(impact.engineOn).toBe(false);
    expect(impact.mass).toBe(p.events.cutoff.mass);
    expect(P.loiSample(p, impact.time + 500)).toEqual(impact);
    expect(p.summary.propellantRemaining).toBeGreaterThan(0);
  });

  it('changes the orbit when the same delta-v is applied at the wrong encounter time', () => {
    const nominal = P.loiProfile(), early = P.loiProfile({ ignitionLead: 600 }), late = P.loiProfile({ ignitionLead: 0 });
    expect(early.summary.outcome).toBe('impact');
    expect(late.summary.outcome).toBe('impact');
    expect(nominal.summary.outcome).toBe('captured');
    expect(early.summary.idealDeltaV).toBe(nominal.summary.idealDeltaV);
    expect(late.summary.idealDeltaV).toBe(nominal.summary.idealDeltaV);
    expect(early.events.ignition.time).toBe(300);
    expect(late.events.ignition.time).toBe(900);
    expect(early.summary.perilune).toBeLessThan(nominal.summary.perilune);
    expect(late.summary.perilune).toBeLessThan(nominal.summary.perilune);
  });

  it('stops an exhausted engine at the fuel boundary and preserves ballistic coast', () => {
    const C = P.loi, p = P.loiProfile({ propellant: 1000 }), cut = p.events.cutoff;
    expect(p.summary.cutoffReason).toBe('fuel');
    expect(p.summary.actualBurn).toBeCloseTo(1000 / (C.thrust / (C.isp * C.g0)), 8);
    expect(cut.propellant).toBeLessThan(1e-8);
    expect(cut.mass).toBeCloseTo(C.dryMass, 6);
    expect(cut.engineOn).toBe(false);
    expect(p.summary.outcome).toBe('flyby');
    const coast = P.loiSample(p, cut.time + 100);
    expect(coast.propellant).toBe(cut.propellant);
    expect(coast.mass).toBe(cut.mass);
    expect(coast.energy).toBeCloseTo(cut.energy, 4);
    expect(coast.x).not.toBe(cut.x);
    const empty = P.loiProfile({ propellant: 0 });
    expect(empty.summary.actualBurn).toBe(0);
    expect(empty.summary.outcome).toBe('flyby');
    expect(empty.samples.every((s) => !s.engineOn)).toBe(true);
  });

  it('derives Earth radio occultation from Moon-centered geometry independently of view size', () => {
    const p = P.loiProfile(), C = P.loi;
    expect(p.events.ignition.radioVisible).toBe(false);
    expect(p.events.cutoff.radioVisible).toBe(false);
    expect(p.samples.some((s) => s.radioVisible)).toBe(true);
    expect(p.samples.some((s) => !s.radioVisible)).toBe(true);
    for (const s of p.samples) {
      expect(s.radioVisible).toBe(s.x <= 0 || Math.abs(s.y) >= C.radius);
      expect(s.earthVisible).toBe(s.radioVisible);
      expect(s.radius).toBeCloseTo(Math.hypot(s.x, s.y), 7);
      expect(s.speed).toBeCloseTo(Math.hypot(s.vx, s.vy), 9);
      expect(s.radialSpeed).toBeCloseTo((s.x * s.vx + s.y * s.vy) / s.radius, 9);
      expect(s.tangentialSpeed).toBeCloseTo((s.x * s.vy - s.y * s.vx) / s.radius, 9);
    }
  });

  it('converges with finer integration and samples curved coast without frame-rate drift', () => {
    const normal = P.loiProfile(), fine = P.loiProfile({ step: 0.25 });
    expect(Math.abs(normal.summary.perilune - fine.summary.perilune)).toBeLessThan(0.01);
    expect(Math.abs(normal.summary.apolune - fine.summary.apolune)).toBeLessThan(0.01);
    expect(Math.abs(normal.summary.period - fine.summary.period)).toBeLessThan(0.001);
    for (const t of [721.23, 1000.125, 2123.45, 6000.123]) {
      const s = P.loiSample(normal, t), q = P.loiSample(fine, t);
      expect(Math.hypot(s.x - q.x, s.y - q.y)).toBeLessThan(0.01);
      expect(s.energy - normal.samples[0].energy - s.energyGain).toBeCloseTo(0, 3);
    }
    for (const fps of [20, 60, 120]) {
      let time = 0;
      for (let i = 0; i < fps * 10; i++) time += 120 / fps;
      const s = P.loiSample(normal, time), reference = P.loiSample(normal, 1200);
      expect(s.altitude).toBeCloseTo(reference.altitude, 5);
      expect(s.mass).toBeCloseTo(reference.mass, 6);
    }
  });

  it('normalizes plans, isolates profiles and returns detached replay samples', () => {
    const C = P.loi, defaults = { ignitionLead: C.defaultLead, burnDuration: C.defaultBurn };
    expect(P.normalizeLoiPlan(null)).toEqual(defaults);
    expect(P.normalizeLoiPlan({ ignitionLead: NaN, burnDuration: Infinity })).toEqual(defaults);
    expect(P.normalizeLoiPlan({ ignitionLead: -20, burnDuration: 800 })).toEqual({ ignitionLead: 0, burnDuration: 600 });
    expect(P.normalizeLoiPlan({ ignitionLead: '180', burnDuration: '0' })).toEqual(defaults);
    const p = P.loiProfile(), flyby = P.loiProfile({ burnDuration: 0 });
    expect(P.loiProfile()).toBe(p);
    expect(flyby).not.toBe(p);
    expect(Object.isFrozen(p)).toBe(true);
    expect(Object.isFrozen(p.controls)).toBe(true);
    expect(Object.isFrozen(p.samples)).toBe(true);
    expect(Object.isFrozen(p.events.cutoff)).toBe(true);
    expect(Object.isFrozen(p.summary)).toBe(true);
    const sample = P.loiSample(p, 1000); sample.mass = 1;
    expect(P.loiSample(p, 1000).mass).toBeGreaterThan(30000);
    expect(P.loiSample(p, -1)).toEqual(p.samples[0]);
    expect(P.loiSample(p, NaN)).toEqual(p.samples[0]);
    for (const row of p.samples) for (const value of Object.values(row)) if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
  });
});
