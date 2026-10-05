import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let P;
beforeEach(() => {
  resetStemLab();
  loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
});

const sourceFor = (plan = { mode: 'guided' }, angle = -6.5, step) =>
  P.entryProfile(angle, step == null ? { plan } : { plan, step });
const inspect = (source, time) => P.entryDynamicsSample(P.entryDynamicsProfile(source), time);
const dot = (a, b) => a.x * b.x + a.y * b.y;

describe('Moon Mission independent entry force and mechanical-energy inspection', () => {
  it('derives a frozen detached history without changing its trajectory or receipt', () => {
    const source = sourceFor(), before = JSON.stringify(source);
    const profile = P.entryDynamicsProfile(source);
    expect(profile.version).toBe(1);
    expect(profile.source).toEqual({ modelVersion: 2, angle: -6.5, plan: P.entryPlan({ mode: 'guided' }) });
    expect(profile.source).not.toBe(source);
    expect(profile.source.plan).not.toBe(source.plan);
    expect(profile.samples).toHaveLength(source.samples.length);
    expect(profile.samples.map((s) => s.time)).toEqual(source.samples.map((s) => s.time));
    expect(Object.isFrozen(profile)).toBe(true);
    expect(Object.isFrozen(profile.samples)).toBe(true);
    expect(Object.isFrozen(profile.summary)).toBe(true);
    expect(Object.isFrozen(profile.source)).toBe(true);
    expect(Object.isFrozen(profile.source.plan)).toBe(true);
    const row = profile.samples[137];
    for (const object of [row, row.energy, row.velocity, row.forces, ...Object.values(row.forces)]) {
      expect(Object.isFrozen(object)).toBe(true);
    }
    const sample = P.entryDynamicsSample(profile, row.time);
    expect(sample).toEqual(row);
    expect(sample).not.toBe(row);
    expect(sample.energy).not.toBe(row.energy);
    expect(sample.forces.drag).not.toBe(row.forces.drag);
    expect(JSON.stringify(source)).toBe(before);
  });

  it('caches by source identity and evicts the oldest of eight diagnostics histories', () => {
    const sources = Array.from({ length: 9 }, (_, i) => sourceFor({ mode: 'ballistic' }, -5 - i / 10, .5));
    const first = P.entryDynamicsProfile(sources[0]);
    expect(P.entryDynamicsProfile(sources[0])).toBe(first);
    const remaining = sources.slice(1).map((source) => P.entryDynamicsProfile(source));
    expect(P.entryDynamicsProfile(sources[8])).toBe(remaining[7]);
    expect(P.entryDynamicsProfile(sources[0])).not.toBe(first);
    // A retained view remains usable after it leaves the bounded cache.
    expect(P.entryDynamicsSample(first, 30).time).toBe(30);
  });

  it.each([null, [], 'entry', {}, { version: 99 }, { version: 1, samples: [] }])(
    'rejects malformed sources without inventing an entry trajectory: %s', (raw) => {
      expect(P.entryDynamicsProfile(raw)).toBeNull();
      expect(P.entryDynamicsSample(raw, 0)).toBeNull();
    });

  it('rejects mutable or malformed copied histories and clamps only its inspection clock', () => {
    const source = sourceFor(), profile = P.entryDynamicsProfile(source);
    expect(P.entryDynamicsProfile({ ...source })).toBeNull();
    expect(P.entryDynamicsProfile(Object.freeze({ ...source, samples: Object.freeze([
      Object.freeze({ ...source.samples[0], speed: 0 }), source.samples.at(-1),
    ]) }))).toBeNull();
    for (const time of [NaN, Infinity, -99, '50', null]) {
      expect(P.entryDynamicsSample(profile, time).time).toBe(0);
    }
    expect(P.entryDynamicsSample(profile, source.summary.duration + 999).time).toBe(source.summary.duration);
    expect(P.entryDynamicsSample({ ...profile }, 50)).toBeNull();
    expect(P.entryDynamicsSample(profile, 50.137).time).toBe(50.137);
  });

  it('resolves drag opposite velocity, lift perpendicular, and gravity toward Earth', () => {
    const source = sourceFor(), E = P.entry;
    for (const t of [0, 45.137, 71.091, 101.117, 177.183, 250.077]) {
      const row = inspect(source, t), { drag, lift, gravity, netPlane } = row.forces;
      expect(dot(drag, row.velocity)).toBeCloseTo(-drag.magnitude * row.speed, 7);
      expect(dot(lift, row.velocity)).toBeCloseTo(0, 7);
      expect(gravity.x).toBe(0);
      expect(gravity.y).toBeCloseTo(-E.mu / (E.radius + row.altitude) ** 2, 12);
      expect(netPlane.x).toBeCloseTo(drag.x + lift.x, 12);
      expect(netPlane.y).toBeCloseTo(drag.y + lift.y + gravity.y, 12);
      for (const vector of Object.values(row.forces)) {
        expect(vector.forceX).toBe(vector.x * E.mass);
        expect(vector.forceY).toBe(vector.y * E.mass);
        expect(vector.forceMagnitude).toBe(vector.magnitude * E.mass);
      }
      expect(row.reportedLoadG).toBe(P.entrySample(source, t).loadG);
      expect(row.aeroLoadG).toBeCloseTo(row.reportedLoadG, 12);
      expect(row.aeroLoadG).toBeCloseTo(Math.hypot(drag.magnitude, row.liftMagnitude) / E.g0, 12);
    }
  });

  it('matches spherical equations through rotation of the local horizontal/up basis', () => {
    const source = sourceFor(), E = P.entry;
    for (const t of [0, 50.113, 101.071, 189.217, 301.093]) {
      const row = inspect(source, t), v = row.speed, r = E.radius + row.altitude;
      const gammaRate = row.liftPlane / v + (v / r + row.forces.gravity.y / v) * Math.cos(row.gamma);
      expect(row.flightPathRate).toBeCloseTo(gammaRate, 13);
      expect(row.speedRate).toBeCloseTo(dot(row.forces.netPlane, row.velocity) / v, 12);
      const horizontalDerivative = row.speedRate * Math.cos(row.gamma) - v * Math.sin(row.gamma) * gammaRate;
      const verticalDerivative = row.speedRate * Math.sin(row.gamma) + v * Math.cos(row.gamma) * gammaRate;
      expect(row.horizontalRate).toBeCloseTo(horizontalDerivative, 10);
      expect(row.verticalRate).toBeCloseTo(verticalDerivative, 10);
      expect(row.forces.netPlane.y).toBeCloseTo(row.verticalRate - row.velocity.x ** 2 / r, 12);
    }
  });

  it('retains full aerodynamic load at 90 degree bank while exposing its unresolved lateral lift', () => {
    const banked = sourceFor({ mode: 'bank', bank: 90 }), ballistic = sourceFor({ mode: 'ballistic' });
    const t = 90.137, b = inspect(banked, t), zero = inspect(ballistic, t);
    expect(b.liftMagnitude).toBeGreaterThan(1);
    expect(Math.abs(b.liftPlane)).toBeLessThan(1e-12);
    expect(b.liftLateral).toBeCloseTo(b.liftMagnitude, 12);
    expect(b.liftLateralForce).toBe(b.liftLateral * P.entry.mass);
    expect(b.aeroLoadG).toBeGreaterThan(zero.aeroLoadG);
    expect(b.altitude).toBeCloseTo(zero.altitude, 6);
    expect(b.speed).toBeCloseTo(zero.speed, 6);
    expect(b.forces.netPlane.x).toBeCloseTo(zero.forces.netPlane.x, 6);
    expect(b.forces.netPlane.y).toBeCloseTo(zero.forces.netPlane.y, 6);
    expect(b.aeroLoadG).toBeCloseTo(Math.hypot(b.forces.drag.magnitude, b.liftMagnitude) / P.entry.g0, 12);
    // Gravity contributes to the plane resultant but not the aerodynamic g meter.
    expect(b.forces.netPlane.magnitude / P.entry.g0).not.toBeCloseTo(b.aeroLoadG, 3);
  });

  it.each([0, 60, 120, 180])('projects lift at %s degree bank without assigning crossrange motion', (bank) => {
    const row = inspect(sourceFor({ mode: 'bank', bank }), 60.137);
    expect(row.bank).toBe(bank);
    expect(row.liftPlane).toBeCloseTo(row.liftMagnitude * Math.cos(bank * Math.PI / 180), 12);
    expect(row.liftLateral).toBeCloseTo(row.liftMagnitude * Math.abs(Math.sin(bank * Math.PI / 180)), 12);
    expect(row.forces.lift.magnitude).toBeCloseTo(Math.abs(row.liftPlane), 12);
    expect(row).not.toHaveProperty('crossrange');
    if (bank === 180) expect(row.forces.lift.y).toBeLessThan(0);
    if (bank === 0) expect(row.forces.lift.y).toBeGreaterThan(0);
  });

  it('keeps the v1 signed lift and g receipt without inventing a bank angle', () => {
    const source = P.entryProfile(-6.5), profile = P.entryDynamicsProfile(source), E = P.entry;
    expect(profile.source).toEqual({ modelVersion: 1, angle: -6.5 });
    for (const t of [20.137, 70.091, 120.117, 190.137]) {
      const row = P.entryDynamicsSample(profile, t), sourceRow = P.entrySample(source, t);
      const drag = row.forces.drag.magnitude, v = row.speed, r = E.radius + row.altitude;
      const desired = v * (-.05 * row.gamma - (v / r - E.mu / r ** 2 / v) * Math.cos(row.gamma));
      const expected = v > 3000 ? Math.max(-drag * E.liftToDrag, Math.min(drag * E.liftToDrag, desired)) : 0;
      expect(row.liftPlane).toBeCloseTo(expected, 11);
      expect(row.liftMagnitude).toBeCloseTo(Math.abs(expected), 11);
      expect(row.bank).toBeNull();
      expect(row.liftLateral).toBe(0);
      expect(row.reportedLoadG).toBe(sourceRow.loadG);
    }
  });

  it('uses exact canopy event times and smooth pointwise inflation across stage boundaries', () => {
    const source = sourceFor(), E = P.entry;
    expect(source.events.drogue).not.toBeNull();
    expect(source.events.main).not.toBeNull();
    for (const kind of ['drogue', 'main']) {
      const event = source.events[kind], before = inspect(source, event.time - .001);
      const at = inspect(source, event.time), middle = inspect(source, event.time + (kind === 'main' ? 3 : 1));
      expect(before[`${kind}Deployed`]).toBe(false);
      expect(at[`${kind}Deployed`]).toBe(true);
      expect(at.chuteFraction).toBe(0);
      expect(middle.chuteFraction).toBeCloseTo(.5, 12);
      const area = kind === 'main' ? E.capsuleDragArea + E.drogueDragArea * .5 + E.mainDragArea * .5
        : E.capsuleDragArea + E.drogueDragArea * .5;
      expect(middle.dragArea).toBeCloseTo(area, 12);
      expect(middle.forces.drag.magnitude).toBeCloseTo(middle.dynamicPressure * area / E.mass, 11);
      expect(middle.liftMagnitude).toBe(0);
      expect(middle.bank).toBeNull();
    }
  });

  it('accounts for drag work with surface-zero spherical potential and honest numerical residuals', () => {
    const source = sourceFor(), profile = P.entryDynamicsProfile(source), E = P.entry;
    const expectedInitial = E.interfaceSpeed ** 2 / 2 + E.mu * (1 / E.radius - 1 / (E.radius + E.interfaceAltitude));
    expect(profile.summary.initialEnergy).toBeCloseTo(expectedInitial, 7);
    let previous = 0;
    for (let i = 0; i < 35; i++) {
      const t = source.summary.duration * i / 34 + (i > 0 && i < 34 ? .037 : 0);
      const row = P.entryDynamicsSample(profile, t), energy = row.energy;
      expect(energy.kinetic).toBe(row.speed ** 2 / 2);
      expect(energy.potential).toBeCloseTo(E.mu * (1 / E.radius - 1 / (E.radius + row.altitude)), 9);
      expect(energy.dragWork).toBe(P.entrySample(source, t).energyLost);
      expect(energy.dragWork).toBeGreaterThanOrEqual(previous);
      expect(energy.dragPower).toBeCloseTo(-dot(row.forces.drag, row.velocity), 7);
      expect(energy.dragPower).toBeGreaterThanOrEqual(0);
      expect(energy.totalDragWork).toBe(energy.dragWork * E.mass);
      expect(energy.residual).toBeCloseTo(expectedInitial - energy.kinetic - energy.potential - energy.dragWork, 7);
      expect(Math.abs(energy.residual) / expectedInitial).toBeLessThan(1e-5);
      previous = energy.dragWork;
    }
    const last = profile.samples.at(-1);
    expect(last.energy.potential).toBe(0);
    expect(profile.summary.finalEnergy).toBe(last.energy.kinetic);
    expect(profile.summary.finalDragWork).toBe(last.energy.dragWork);
    expect(profile.summary.peakDragPower).toBeGreaterThan(1e5);
    expect(profile.samples.find((s) => s.time === profile.summary.peakDragPowerTime).energy.dragPower)
      .toBe(profile.summary.peakDragPower);
    for (const row of profile.samples) {
      expect(Math.abs(row.energy.residual)).toBeLessThanOrEqual(profile.summary.maxAbsEnergyResidual);
      for (const vector of Object.values(row.forces)) expect(vector.magnitude).toBeLessThanOrEqual(profile.summary.maxPlaneAcceleration);
      expect(row.liftMagnitude).toBeLessThanOrEqual(profile.summary.maxLiftAcceleration);
    }
  });

  it('reduces fractional-time mechanical-energy residuals when source integration steps shrink', () => {
    const coarse = P.entryDynamicsProfile(sourceFor({ mode: 'ballistic' }, -6.5, .5));
    const fine = P.entryDynamicsProfile(sourceFor({ mode: 'ballistic' }, -6.5, .1));
    const times = [40.17, 65.27, 91.23, 126.17, 170.27, 215.23];
    const maximum = (profile) => Math.max(...times.map((t) => Math.abs(P.entryDynamicsSample(profile, t).energy.residual)));
    expect(maximum(fine)).toBeLessThan(maximum(coarse) * .5);
    expect(maximum(fine) / fine.summary.initialEnergy).toBeLessThan(1e-6);
  });

  it('stops at preimpact or the outgoing interface without inventing water or skip continuation forces', () => {
    const splashSource = sourceFor(), splash = inspect(splashSource, splashSource.summary.duration + 100);
    expect(splash.phase).toBe('splash');
    expect(splash.endpointNote).toBe('preimpact');
    expect(splash.terminal).toBe(true);
    expect(splash.speed).toBe(splashSource.summary.splashSpeed);
    expect(splash.speed).toBeGreaterThan(0);
    expect(splash.mainDeployed).toBe(true);
    expect(splash.forces.gravity.magnitude).toBeGreaterThan(9);
    expect(splash.forces).not.toHaveProperty('water');
    const skipSource = sourceFor({ mode: 'bank', bank: 0 });
    const skip = inspect(skipSource, skipSource.summary.duration + 100);
    expect(skip.phase).toBe('skip');
    expect(skip.endpointNote).toBe('outgoing-interface');
    expect(skip.terminal).toBe(true);
    expect(skip.altitude).toBe(P.entry.interfaceAltitude);
    expect(skip.velocity.y).toBeGreaterThan(0);
    expect(skip.mainDeployed).toBe(false);
    expect(skip.drogueDeployed).toBe(false);
    expect(skip.time).toBe(skipSource.summary.duration);
  });
});
