import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let P;
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_moonmission.js', 'moonMission'); P = window.MoonMissionPure; });
const start = (extra = {}) => ({ alt: 300, vVel: -9, hVel: 4, fuel: 110, thrust: 0, tilt: 0, x: 12, elapsed: 8, ...extra });
const predict = (extra = {}, command = {}) => P.descentPredictionProfile(start(extra), command);

describe('finite-propellant landing predictions', () => {
  it('advances detached frozen predictions without changing the inspected state or commands', () => {
    const state = start(), commands = { throttle: .3, left: true }, before = JSON.stringify([state, commands]);
    const p = P.descentPredictionProfile(state, commands);
    expect(JSON.stringify([state, commands])).toBe(before);
    for (const value of [p, p.initial, p.options, p.held, p.burn, p.held.commands, p.held.summary, p.held.samples,
      p.burn.commands, p.burn.summary, p.burn.samples, ...p.held.samples, ...p.burn.samples]) expect(Object.isFrozen(value)).toBe(true);
    expect(p.initial).not.toBe(state);
    expect(p.held.commands).toEqual({ throttle: .3, left: true, right: false });
    expect(p.burn.commands).toEqual({ throttle: 1, left: false, right: false });
  });

  it('matches an independent ballistic time and impact speed while retaining horizontal momentum', () => {
    const p = predict({ fuel: 0, hVel: 6 }), s = p.held.summary, D = P.descent;
    const time = (-9 + Math.sqrt(81 + 2 * D.g * 300)) / D.g;
    expect(s.kind).toBe('contact'); expect(s.altitude).toBe(0);
    expect(s.time).toBeCloseTo(time, 2); // spherical gravity varies slightly over 300 m
    expect(s.vertical).toBeCloseTo(-Math.sqrt(81 + 2 * D.g * 300), 2);
    expect(s.lateral).toBe(6); expect(s.displacement).toBeCloseTo(6 * s.time, 9);
    expect(s.propellantUsed).toBe(0); expect(s.fuelRemaining).toBe(0); expect(s.exhaustionTime).toBe(0);
    expect(p.burn.summary).toEqual(p.held.summary);
    expect(p.held.samples.every(row => row.alt >= 0 && row.fuel === 0)).toBe(true);
  });

  it('finds full-thrust vertical arrest above the ground without reporting a completed landing', () => {
    const p = predict(), s = p.burn.summary, last = p.burn.samples.at(-1);
    expect(p.held.summary.kind).toBe('contact'); expect(s.kind).toBe('arrest');
    expect(s.altitude).toBeGreaterThan(280); expect(s.altitude).toBeLessThan(300);
    expect(s.time).toBeGreaterThan(1); expect(s.time).toBeLessThan(3);
    expect(Math.abs(last.vVel)).toBeLessThan(1e-7);
    expect(s.lateral).toBe(4); expect(s.displacement).toBeCloseTo(4 * s.time, 9);
    expect(s.propellantUsed).toBeGreaterThan(20); expect(s.propellantUsed).toBeLessThan(40);
    expect(s.arrestBeforeContact).toBe(true);
    expect(s).not.toHaveProperty('landed'); expect(s).not.toHaveProperty('score');
    expect(s).not.toHaveProperty('grade');
  });

  it('accounts for changing mass with the rocket equation and gravity impulse', () => {
    const p = predict({ thrust: 1 }), s = p.burn.summary, D = P.descent;
    const ve = D.isp * D.earthG, m0 = P.descentMass(110), m1 = P.descentMass(s.fuelRemaining);
    const idealDv = ve * Math.log(m0 / m1);
    const averageG = (P.lunarGravity(300) + P.lunarGravity(s.altitude)) / 2;
    expect(idealDv).toBeCloseTo(9 + averageG * s.time, 4);
    expect(s.propellantUsed).toBeCloseTo(m0 - m1, 9);
    expect(m1).toBeLessThan(m0); expect(m1).toBeGreaterThan(D.dryMass);
    expect(p.burn.samples.every((row, i, rows) => i === 0 || row.massKg <= rows[i - 1].massKg)).toBe(true);
  });

  it('carries throttle response into a cold versus already-firing braking projection', () => {
    const cold = predict().burn.summary, warm = predict({ thrust: 1 }).burn.summary;
    expect(cold.time).toBeGreaterThan(warm.time);
    expect(cold.altitude).toBeLessThan(warm.altitude);
    expect(cold.propellantUsed).toBeGreaterThan(warm.propellantUsed);
  });

  it('retains the remaining impulse during throttle shutdown instead of instantly deleting thrust', () => {
    const cold = predict().held.summary, firing = predict({ thrust: 1 }).held.summary;
    expect(firing.propellantUsed).toBeGreaterThan(0);
    expect(firing.time).toBeGreaterThan(cold.time);
    expect(Math.abs(firing.vertical)).toBeLessThan(Math.abs(cold.vertical));
  });

  it('centers initial tilt through its real response lag and preserves the transient lateral impulse', () => {
    const left = predict({ thrust: 1, tilt: -.35, hVel: 0 }).burn;
    const right = predict({ thrust: 1, tilt: .35, hVel: 0 }).burn;
    expect(left.summary.lateral).toBeLessThan(0); expect(right.summary.lateral).toBeGreaterThan(0);
    expect(left.summary.altitude).toBeCloseTo(right.summary.altitude, 10);
    expect(left.summary.time).toBeCloseTo(right.summary.time, 10);
    expect(left.summary.lateral).toBeCloseTo(-right.summary.lateral, 10);
    expect(left.summary.displacement).toBeCloseTo(-right.summary.displacement, 10);
    expect(left.samples[0].tilt).toBe(-.35); expect(Math.abs(left.samples.at(-1).tilt)).toBeLessThan(.001);
    const upright = predict({ thrust: 1, hVel: 0 }).burn.summary;
    expect(left.summary.altitude).toBeLessThan(upright.altitude);
  });

  it('holds the specified tilt command and spends fuel to alter drift', () => {
    const tilted = predict({ thrust: 1 }, { throttle: 1, left: true }).held.summary;
    const upright = predict({ thrust: 1 }, { throttle: 1 }).held.summary;
    expect(tilted.lateral).toBeLessThan(upright.lateral);
    expect(tilted.propellantUsed).toBeGreaterThan(upright.propellantUsed);
    expect(tilted.altitude).toBeLessThan(upright.altitude);
  });

  it('continues a fuel-exhausted projection to contact and records exhaustion before its endpoint', () => {
    const s = predict({ fuel: .01 }).burn.summary;
    expect(s.kind).toBe('contact'); expect(s.arrestBeforeContact).toBe(false);
    expect(s.exhaustionTime).toBeGreaterThan(0); expect(s.exhaustionTime).toBeLessThan(.1);
    expect(s.exhaustionTime).toBeLessThan(s.time); expect(s.fuelRemaining).toBe(0);
    expect(s.vertical).toBeLessThan(-30); expect(s.propellantUsed).toBeCloseTo(P.descentMass(.01) - P.descent.dryMass, 8);
  });

  it('finds a brief arrest before a near-empty burn expires inside one physics slice', () => {
    const state = start({ alt: 1, vVel: -.001, hVel: 0, fuel: .001, thrust: 1 }), before = JSON.stringify(state);
    const p = P.descentPredictionProfile(state, { throttle: 1 }), s = p.burn.summary, D = P.descent;
    const exhaustion = (P.descentMass(.001) - D.dryMass) * D.isp * D.earthG / D.maxThrust;
    expect(s.kind).toBe('arrest'); expect(s.time).toBeGreaterThan(0); expect(s.time).toBeLessThan(exhaustion);
    expect(s.altitude).toBeGreaterThan(.999999); expect(Math.abs(s.vertical)).toBeLessThan(1e-8);
    expect(s.fuelRemaining).toBeGreaterThan(0); expect(s.exhaustionTime).toBeNull();
    expect(s.propellantUsed).toBeLessThan(P.descentMass(.001) - D.dryMass);
    expect(JSON.stringify(state)).toBe(before);
    const fine = { ...state, elapsed: 0 };
    while (fine.vVel < 0 && fine.elapsed < .001) P.descentStep(fine, { throttle: 1 }, .00001);
    expect(fine.vVel).toBeGreaterThanOrEqual(0); expect(s.time).toBeCloseTo(fine.elapsed, 4);
  });

  it('detects a brief arrest during throttle shutdown between two physics slice endpoints', () => {
    const D = P.descent, ve = D.isp * D.earthG, m0 = P.descentMass(110), g = P.lunarGravity(300);
    // An independent constant-gravity rocket/engine-response solution places
    // the speed maximum between slices. Only a small positive margin remains.
    const q = g * (m0 - D.maxThrust * D.engineLag / ve) / (D.maxThrust * (1 - g * D.engineLag / ve));
    const peakTime = -D.engineLag * Math.log(q), m1 = m0 - D.maxThrust * D.engineLag * (1 - q) / ve;
    const vVel = -(ve * Math.log(m0 / m1) - g * peakTime) + .000002;
    const state = start({ vVel, thrust: 1 }), p = P.descentPredictionProfile(state, { throttle: 0 });
    expect(p.held.summary.kind).toBe('arrest'); expect(p.held.summary.time).toBeLessThan(peakTime);
    expect(p.held.summary.time).toBeGreaterThan(peakTime - .005);
    expect(Math.abs(p.held.summary.vertical)).toBeLessThan(1e-8); expect(p.held.summary.fuelRemaining).toBeGreaterThan(100);
    const fine = P.descentPredictionProfile(state, { throttle: 0 }, { step: 1 / 240 });
    expect(fine.held.summary.kind).toBe('arrest'); expect(fine.held.summary.time).toBeCloseTo(p.held.summary.time, 5);
  });

  it('locates contact before arrest in a late braking attempt without extending below the surface', () => {
    const p = predict({ alt: 1, vVel: -20 }), s = p.burn.summary;
    expect(s.kind).toBe('contact'); expect(s.time).toBeLessThan(.06); expect(s.altitude).toBe(0);
    expect(s.vertical).toBeLessThan(-19); expect(s.arrestBeforeContact).toBe(false);
    expect(p.burn.samples.at(-1).time).toBe(s.time);
    expect(p.burn.samples.every(row => row.alt >= 0)).toBe(true);
  });

  it('labels bounded forecasts that establish neither contact nor arrest', () => {
    const p = predict({ alt: 15000, vVel: -2, fuel: 0 });
    expect(p.held.summary.kind).toBe('horizon'); expect(p.held.summary.time).toBeCloseTo(90, 9);
    expect(p.held.summary.altitude).toBeGreaterThan(8000);
    expect(p.held.summary.arrestBeforeContact).toBe(false);
    expect(p.held.samples.length).toBeLessThanOrEqual(182); expect(p.held.summary.steps).toBeLessThanOrEqual(1801);
  });

  it.each([0, 2])('does not imply a future landing once vertical descent is already arrested: %s', vVel => {
    const p = predict({ vVel });
    for (const plan of [p.held, p.burn]) {
      expect(plan.summary.kind).toBe('already-arrested'); expect(plan.summary.time).toBe(0);
      expect(plan.summary.propellantUsed).toBe(0); expect(plan.samples).toHaveLength(1);
    }
  });

  it('treats a recorded contact as a terminal inspected state', () => {
    const p = predict({ alt: 0, contact: true, vVel: -4 });
    expect(p.burn.summary.kind).toBe('contact'); expect(p.burn.summary.time).toBe(0);
    expect(p.burn.summary.vertical).toBe(-4); expect(p.burn.summary.propellantUsed).toBe(0);
  });

  it('keeps projections invariant under absolute time and ground-position translations', () => {
    const a = predict({ elapsed: 0, x: 0 }), b = predict({ elapsed: 1e15, x: 1e15 });
    expect(b.held).toEqual(a.held); expect(b.burn).toEqual(a.burn);
    expect(b.initial.elapsed).toBe(1e15); expect(b.initial.x).toBe(1e15);
  });

  it('refines consistently with the existing substep dynamics', () => {
    const state = start({ thrust: .4, tilt: -.2 });
    const coarse = P.descentPredictionProfile(state, { throttle: .5, left: true }, { step: .1 });
    const fine = P.descentPredictionProfile(state, { throttle: .5, left: true }, { step: 1 / 240 });
    for (const key of ['held', 'burn']) {
      expect(coarse[key].summary.kind).toBe(fine[key].summary.kind);
      expect(coarse[key].summary.time).toBeCloseTo(fine[key].summary.time, 3);
      expect(coarse[key].summary.altitude).toBeCloseTo(fine[key].summary.altitude, 3);
      expect(coarse[key].summary.fuelRemaining).toBeCloseTo(fine[key].summary.fuelRemaining, 3);
    }
  });

  it('bounds experimental time/step inputs and caches by complete snapshot and command values', () => {
    const state = start(), a = P.descentPredictionProfile(state, { throttle: .3 });
    expect(P.descentPredictionProfile({ ...state }, { throttle: .3 })).toBe(a);
    expect(P.descentPredictionProfile({ ...state, thrust: .2 }, { throttle: .3 })).not.toBe(a);
    const bounded = P.descentPredictionProfile(state, {}, { horizon: 1e9, step: -1 });
    expect(bounded.options).toEqual({ horizon: 90, step: 1 / 240 });
    const short = P.descentPredictionProfile(state, {}, { horizon: .3 });
    expect(short.held.summary.kind).toBe('horizon'); expect(short.held.summary.time).toBeCloseTo(.3, 8);
  });

  it.each([null, {}, [], 'flight', start({ alt: -1 }), start({ fuel: -1 }), start({ thrust: 2 }),
    start({ tilt: 1 }), start({ hVel: NaN }), start({ x: '12' }), start({ elapsed: -1 }),
    start({ contact: true }), start({ contact: 'true' })])(
    'rejects invalid source states instead of inventing measurements: %s', raw => {
      expect(P.descentPredictionProfile(raw, {})).toBeNull();
    });
});
