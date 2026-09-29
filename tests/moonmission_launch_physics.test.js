import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let P;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
});

describe('Moon Mission coupled Saturn V ascent', () => {
  it('starts at liftoff with co-rotating air and a fueled, thrusting vehicle', () => {
    const profile = P.launchProfile(), initial = profile.samples[0], C = P.launch;
    expect(initial.altitude).toBe(0);
    expect(initial.radialSpeed).toBe(0);
    expect(initial.speed).toBe(C.rotationSpeed);
    expect(initial.airSpeed).toBeLessThan(1e-9);
    expect(initial.dynamicPressure).toBeLessThan(1e-15);
    expect(initial.mass).toBe(C.payloadMass + C.lesMass + C.stages.reduce((m, s) => m + s.dryMass + s.propellant, 0));
    expect(initial.totalPropellant).toBe(C.stages.reduce((m, s) => m + s.propellant, 0));
    expect(initial.thrust).toBe(C.stages[0].seaLevelThrust);
    expect(initial.loadG).toBeGreaterThan(1.1);
    expect(initial.loadG).toBeLessThan(1.3);
  });

  it('conserves vehicle mass through propellant flow and instantaneous jettisons', () => {
    const p = P.launchProfile(), initialMass = p.samples[0].mass;
    for (let i = 0; i < p.samples.length; i++) {
      const row = p.samples[i];
      expect(Math.abs(row.mass + row.propellantUsed + row.jettisonedMass - initialMass)).toBeLessThan(1e-5);
      expect(row.propellant).toBeGreaterThanOrEqual(0);
      if (i === 0) continue;
      const before = p.samples[i - 1], dt = row.time - before.time;
      expect(dt).toBeGreaterThanOrEqual(0);
      expect(row.mass).toBeLessThanOrEqual(before.mass + 1e-8);
      if (dt > 0) {
        expect(row.jettisonedMass).toBe(before.jettisonedMass);
        expect(Math.abs(before.mass - row.mass - before.massFlow * dt)).toBeLessThan(1e-5);
      } else {
        expect(row.altitude).toBe(before.altitude);
        expect(row.radialSpeed).toBe(before.radialSpeed);
        expect(row.tangentialSpeed).toBe(before.tangentialSpeed);
      }
    }
    expect(p.events.stage1.jettisonedMass).toBeCloseTo(P.launch.stages[0].dryMass + P.launch.stages[0].reserve, 5);
    expect(p.events.les.jettisonedMass - p.events.stage1.jettisonedMass).toBe(P.launch.lesMass);
    expect(p.summary.propellantRemaining).toBeGreaterThan(60000); // S-IVB must retain fuel for TLI.
  });

  it('uses pressure-dependent thrust and rocket-equation mass flow, with center-engine shutdowns', () => {
    const p = P.launchProfile(), C = P.launch;
    for (const row of p.samples) {
      const s = C.stages[row.stage - 1], fraction = row.engineCount / s.engines;
      const expectedThrust = (s.vacuumThrust - (s.vacuumThrust - s.seaLevelThrust) * row.pressure / 101325) * fraction;
      expect(row.thrust).toBeCloseTo(expectedThrust, 6);
      expect(row.massFlow).toBeCloseTo(s.vacuumThrust * fraction / (s.vacuumIsp * C.g0), 8);
      expect(row.engineOn).toBe(row.thrust > 0);
    }
    const before = P.launchSample(p, C.stages[0].centerCutoff - 0.001);
    const after = P.launchSample(p, C.stages[0].centerCutoff);
    expect(before.engineCount).toBe(5);
    expect(after.engineCount).toBe(4);
    expect(after.thrust / before.thrust).toBeCloseTo(0.8, 5);
    expect(after.mass).toBeCloseTo(before.mass - before.massFlow * 0.001, 5);
  });

  it('derives motion and felt load from the same forces, with a numerical energy balance', () => {
    const p = P.launchProfile(), C = P.launch;
    const initialEnergy = p.samples[0].speed ** 2 / 2 - C.mu / C.radius;
    let integratedHeight = 0;
    for (let i = 0; i < p.samples.length; i++) {
      const row = p.samples[i], r = C.radius + row.altitude;
      expect(Math.abs(row.speed ** 2 / 2 - C.mu / r - initialEnergy - row.energyGain)).toBeLessThan(0.05);
      const relT = row.tangentialSpeed - C.rotationSpeed * r / C.radius;
      const dragR = row.airSpeed ? -row.drag * row.radialSpeed / row.airSpeed : 0;
      const dragT = row.airSpeed ? -row.drag * relT / row.airSpeed : 0;
      const felt = Math.hypot(row.thrust * Math.cos(row.pitch) + dragR, row.thrust * Math.sin(row.pitch) + dragT) / (row.mass * C.g0);
      expect(row.loadG).toBeCloseTo(felt, 8);
      if (i) {
        const before = p.samples[i - 1];
        integratedHeight += (before.radialSpeed + row.radialSpeed) / 2 * (row.time - before.time);
      }
    }
    expect(Math.abs(integratedHeight - p.summary.cutoffAltitude)).toBeLessThan(1);
    expect(p.events.stage2.loadG).toBeLessThan(1e-6);
    // Near-zero felt acceleration during staging occurs despite strong gravity.
    expect(C.mu / (C.radius + p.events.stage2.altitude) ** 2 / C.g0).toBeGreaterThan(0.9);
  });

  it('derives Mach and Max Q from atmosphere-relative speed, including sampled instants', () => {
    const p = P.launchProfile();
    for (const row of [p.samples[0], p.events.mach1, p.events.maxQ, P.launchSample(p, 80.123)]) {
      const at = P.entryAtmosphere(row.altitude);
      expect(row.dynamicPressure).toBeCloseTo(0.5 * at.density * row.airSpeed ** 2, 6);
      expect(row.dynamicPressure).toBeCloseTo(P.dynamicPressure(row.altitude / 1000, row.airSpeed), 6);
      expect(row.mach).toBeCloseTo(row.airSpeed / at.soundSpeed, 10);
    }
    const mach = p.events.mach1, q = p.events.maxQ;
    expect(mach.time).toBeLessThan(q.time);
    expect(mach.mach).toBeGreaterThanOrEqual(1);
    expect(P.launchSample(p, mach.time - P.launch.step).mach).toBeLessThan(1);
    expect(q.dynamicPressure).toBe(Math.max(...p.samples.map((s) => s.dynamicPressure)));
    expect(q.altitude).toBeGreaterThan(9000);
    expect(q.altitude).toBeLessThan(15000);
    expect(q.dynamicPressure).toBeGreaterThan(25000);
    expect(q.dynamicPressure).toBeLessThan(45000);
    expect(P.launchSample(p, q.time + 30).dynamicPressure).toBeLessThan(q.dynamicPressure * 0.6);
  });

  it('keeps stage events causal with ballistic ignition gaps and continuous velocity', () => {
    const p = P.launchProfile(), { stage1, stage2, les, cutoff } = p.events;
    expect(stage1.time).toBeGreaterThan(150);
    expect(stage1.time).toBeLessThan(180);
    expect(stage2.time).toBeGreaterThan(500);
    expect(stage2.time).toBeLessThan(580);
    expect(les.time).toBeGreaterThan(stage1.time);
    expect(les.time).toBeLessThan(stage2.time);
    expect(cutoff.time).toBeGreaterThan(stage2.time);
    for (const event of [stage1, stage2]) {
      const actual = P.launchSample(p, event.time);
      expect(actual.stage).toBe(event.stage);
      expect(actual.mass).toBe(event.mass);
      expect(actual.thrust).toBe(0);
      const ignitionDelay = P.launch.stages[event.stage - 1].ignitionDelay;
      const coast = P.launchSample(p, event.time + ignitionDelay / 2);
      expect(coast.engineOn).toBe(false);
      expect(coast.mass).toBe(event.mass);
      expect(P.launchSample(p, event.time + ignitionDelay).engineOn).toBe(true);
    }
  });

  it('cuts off only into a bound parking orbit and retains an honest orbital summary', () => {
    const p = P.launchProfile(), end = p.events.cutoff, elements = P.launchOrbitElements(end);
    expect(p.summary.outcome).toBe('orbit');
    expect(end.engineOn).toBe(false);
    expect(end.orbit).toBe(true);
    expect(end.loadG).toBeLessThan(1e-6);
    expect(elements.bound).toBe(true);
    expect(elements.perigee).toBeGreaterThanOrEqual(P.launch.targetPerigee);
    expect(elements.perigee).toBeCloseTo(p.summary.perigee, 8);
    expect(elements.apogee).toBeCloseTo(p.summary.apogee, 8);
    expect(elements.apogee).toBeLessThan(230000);
    expect(elements.eccentricity).toBeLessThan(0.004);
    expect(elements.period / 60).toBeGreaterThan(85);
    expect(elements.period / 60).toBeLessThan(95);
    expect(end.speed).toBeGreaterThan(7700);
    expect(end.speed).toBeLessThan(7900);
    expect(Math.abs(end.radialSpeed)).toBeLessThan(30);
    // The former altitude/total-speed endpoint could falsely classify a vertical
    // trajectory as orbit. Angular momentum now exposes its Earth-crossing path.
    const falseOrbit = P.launchOrbitElements({ altitude: 185000, radialSpeed: 7800, tangentialSpeed: 0 });
    expect(falseOrbit.bound).toBe(true);
    expect(falseOrbit.perigee).toBeLessThan(0);
  });

  it('converges when the integration step is halved instead of depending on frame rate', () => {
    const normal = P.launchProfile(), finer = P.launchProfile({ step: P.launch.step / 2 });
    expect(finer).not.toBe(normal);
    expect(finer.summary.outcome).toBe(normal.summary.outcome);
    expect(Math.abs(finer.summary.duration - normal.summary.duration)).toBeLessThan(0.1);
    expect(Math.abs(finer.summary.cutoffAltitude - normal.summary.cutoffAltitude)).toBeLessThan(20);
    expect(Math.abs(finer.summary.apogee - normal.summary.apogee)).toBeLessThan(100);
    expect(Math.abs(finer.summary.peakQ / normal.summary.peakQ - 1)).toBeLessThan(0.001);
    for (const fps of [20, 60, 120]) {
      let time = 0;
      for (let frame = 0; frame < fps * 10; frame++) time += 30 / fps;
      const sample = P.launchSample(normal, time), reference = P.launchSample(normal, 300);
      expect(sample.altitude).toBeCloseTo(reference.altitude, 6);
      expect(sample.mass).toBeCloseTo(reference.mass, 6);
    }
  });

  it('bounds computation and protects the cached trajectory from caller edits', () => {
    const p = P.launchProfile();
    expect(p).toBe(P.launchProfile());
    expect(p.samples.length).toBeLessThan(5000);
    expect(p.summary.duration).toBeLessThan(P.launch.maxTime);
    expect(Object.isFrozen(p)).toBe(true);
    expect(Object.isFrozen(p.samples)).toBe(true);
    expect(Object.isFrozen(p.events.stage1)).toBe(true);
    expect(Object.isFrozen(p.summary)).toBe(true);
    const sample = P.launchSample(p, 50), altitude = sample.altitude;
    sample.altitude = -999;
    expect(P.launchSample(p, 50).altitude).toBe(altitude);
    expect(P.launchSample(p, -100).time).toBe(0);
    expect(P.launchSample(p, NaN).time).toBe(0);
    expect(P.launchSample(p, 1e6)).toEqual(p.events.cutoff);
    expect(P.launchDisplay(NaN).altKm).toBe(0);
  });
});
