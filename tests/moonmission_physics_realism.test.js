// Physical invariants for the exact integrator used by the Moon Mission controls.
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let P;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
});

function state(extra = {}) {
  return { alt: 300, vVel: -9, hVel: 4, fuel: 110, thrust: 0, tilt: 0, ...extra };
}

describe('Moon Mission physical descent model', () => {
  it('uses inverse-square lunar gravity and conserves vacuum coast energy', () => {
    const D = P.descent;
    expect(P.lunarGravity(0)).toBe(1.624);
    expect(P.lunarGravity(D.radius)).toBeCloseTo(D.g / 4, 12);
    const st = state({ alt: 15000, vVel: -90, hVel: 8, fuel: 0 });
    const mu = D.g * D.radius * D.radius;
    const energy = (s) => s.vVel * s.vVel / 2 - mu / (D.radius + s.alt);
    const before = energy(st);
    P.descentStep(st, { right: true }, 20);
    expect(Math.abs((energy(st) - before) / before)).toBeLessThan(1e-8);
    expect(st.hVel).toBe(8);
    expect(st.x).toBeCloseTo(160, 7);
  });

  it('burns mass at thrust / exhaust velocity and gets lighter as fuel is used', () => {
    const D = P.descent, ve = D.isp * D.earthG;
    const st = state({ thrust: 0.4 });
    const before = P.descentGuidance(st);
    P.descentStep(st, { throttle: 0.4 }, 2);
    const after = P.descentGuidance(st);
    expect(before.massKg - after.massKg).toBeCloseTo(D.maxThrust * 0.4 * 2 / ve, 7);
    expect(after.propellantKg).toBeGreaterThan(0);
    expect(after.massKg).toBeLessThan(before.massKg);
    expect(after.thrustToWeight).toBeGreaterThan(before.thrustToWeight);
    expect(after.deltaV).toBeCloseTo(ve * Math.log(after.massKg / D.dryMass), 9);
    expect(after.deltaV).toBeCloseTo(D.g * st.fuel, 9);
  });

  it('applies the same controls consistently across frame rates and long updates', () => {
    const results = [1 / 30, 1 / 60, 1 / 120, 2].map((dt) => {
      const st = state();
      for (let i = 0; i < Math.round(2 / dt); i++) P.descentStep(st, { thrust: true, left: true }, dt);
      return st;
    });
    for (const result of results.slice(1)) {
      for (const key of ['alt', 'vVel', 'hVel', 'fuel', 'thrust', 'tilt', 'elapsed', 'x']) {
        expect(result[key], key).toBeCloseTo(results[0][key], 7);
      }
    }
  });

  it('ignores invalid elapsed time and opposite steering commands cancel', () => {
    const st = state(), initial = { ...st };
    for (const dt of [0, -1, NaN, Infinity, undefined]) P.descentStep(st, { thrust: true, left: true }, dt);
    expect(st).toEqual(initial);
    P.descentStep(st, { throttle: 0.5, left: true, right: true }, 1);
    expect(st.tilt).toBe(0);
    expect(st.hVel).toBe(4);
  });

  it('cannot create more impulse than the remaining propellant supplies', () => {
    const st = state({ alt: 3000, vVel: 0, hVel: 0, fuel: 0.001, thrust: 1 });
    const availableDv = P.descentGuidance(st).deltaV;
    const gravity = P.lunarGravity(st.alt);
    P.descentStep(st, { thrust: true }, 0.1);
    expect(st.fuel).toBe(0);
    expect(st.thrust).toBe(0);
    expect(st.vVel + gravity * 0.1).toBeCloseTo(availableDv, 7);
    const empty = P.descentGuidance(st);
    expect(empty.thrustN).toBe(0);
    expect(empty.thrustToWeight).toBe(0);
    expect(empty.canBrake).toBe(false);
  });

  it('locates ground contact and retains impact speed without using time after impact', () => {
    const st = state({ alt: 10, vVel: -2, hVel: 0, fuel: 0 });
    const g = P.descent.g;
    const impactSpeed = Math.sqrt(4 + 2 * g * 10);
    const contactTime = (impactSpeed - 2) / g;
    P.descentStep(st, {}, 10);
    expect(st.contact).toBe(true);
    expect(st.alt).toBe(0);
    expect(st.vVel).toBeCloseTo(-impactSpeed, 4);
    expect(st.elapsed).toBeCloseTo(contactTime, 4);
    const atContact = { ...st };
    P.descentStep(st, { thrust: true }, 1);
    expect(st).toEqual(atContact);
  });

  it('shows tilt costs, engine response and insufficient braking fuel in guidance', () => {
    const upright = P.descentGuidance(state({ thrust: 1 }));
    const cold = P.descentGuidance(state());
    const tilted = P.descentGuidance(state({ thrust: 1, tilt: P.descent.maxTilt }));
    expect(upright.brakingAltitude).toBeCloseTo(upright.stopAltitude, 10);
    expect(cold.brakingAltitude).toBeGreaterThan(cold.stopAltitude);
    expect(tilted.hoverThrottle).toBeGreaterThan(upright.hoverThrottle);
    expect(tilted.stopAltitude).toBeGreaterThan(upright.stopAltitude);
    expect(upright.brakingMargin).toBeGreaterThan(0);
    expect(upright.canBrake).toBe(true);
    const depleted = P.descentGuidance(state({ fuel: 0.01 }));
    expect(depleted.brakingMargin).toBeGreaterThan(0);
    expect(depleted.canBrake).toBe(false);
  });
});

describe('Moon Mission coast trajectories', () => {
  it('moves continuously between return samples instead of waiting for the next minute', () => {
    const start = P.returnCoast(0), seconds = start.totalDays * 86400;
    const oneSecond = P.returnCoast(1 / seconds);
    const twoSeconds = P.returnCoast(2 / seconds);
    const initialSpeed = start.speedKmh / 3600;
    expect(start.distKm - oneSecond.distKm).toBeCloseTo(initialSpeed, 4);
    expect(oneSecond.distKm - twoSeconds.distKm).toBeGreaterThan(initialSpeed);
    expect(P.returnCoast(1).distKm).toBeCloseTo(122, 8);
  });

  it('return closing speed equals the derivative of distance and follows energy conservation', () => {
    const seconds = P.returnCoast(0).totalDays * 86400, dt = 0.1;
    for (const fraction of [0.0003, 0.1, 0.5, 0.9, 0.99, 0.99999]) {
      const sample = P.returnCoast(fraction);
      const before = P.returnCoast(fraction - dt / seconds);
      const after = P.returnCoast(fraction + dt / seconds);
      const derivative = (before.distKm - after.distKm) / (2 * dt);
      const speed = sample.speedKmh / 3600;
      const initialSpeed = P.returnCoast(0).speedKmh / 3600;
      const energySpeed = Math.sqrt(initialSpeed * initialSpeed + 2 * 398600 * (1 / (sample.distKm + 6378) - 1 / 384400));
      expect(Math.abs(derivative - speed) / speed).toBeLessThan(2e-6);
      expect(Math.abs(energySpeed - speed) / speed).toBeLessThan(2e-6);
    }
  });

  it('outbound position, speed and model clock agree near both bodies and between them', () => {
    const start = P.coastAt(0), end = P.coastAt(1), dt = 0.1;
    expect(start.r).toBe(6712);
    expect(end.r).toBeCloseTo(384400 - 1737.4 - 110, 8);
    expect(end.elapsedSeconds).toBe(end.totalSeconds);
    expect(end.days).toBeCloseTo(end.totalDays, 12);
    let covered = 0, previous = start;
    for (let i = 1; i <= 10000; i++) {
      const sample = P.coastAt(i / 10000);
      expect(sample.r).toBeGreaterThan(previous.r);
      covered += (previous.v + sample.v) / 2 * (sample.elapsedSeconds - previous.elapsedSeconds);
      previous = sample;
    }
    expect(Math.abs(covered - (end.r - start.r)) / covered).toBeLessThan(2e-5);
    for (const fraction of [0.0003, 0.1, 0.5, 0.9, 0.99, 0.99999]) {
      const sample = P.coastAt(fraction);
      const before = P.coastAt(fraction - dt / end.totalSeconds);
      const after = P.coastAt(fraction + dt / end.totalSeconds);
      const derivative = (after.r - before.r) / (2 * dt);
      expect(Math.abs(derivative - sample.v) / sample.v).toBeLessThan(2e-6);
      expect(Math.abs(P.coastSpeed(sample.r) - sample.v) / sample.v).toBeLessThan(2e-6);
    }
  });
});
