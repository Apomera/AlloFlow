import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let P;
beforeEach(() => {
  resetStemLab();
  loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
});

const bankPlan = (bank) => ({ version: 2, mode: 'bank', bank });
const profile = (plan, angle = -6.5, step) => P.entryProfile(angle, step == null ? { plan } : { plan, step });

describe('Moon Mission entry bank and lift physics', () => {
  it('normalizes finite constant-bank plans into detached immutable settings', () => {
    const raw = { version: 99, mode: 'bank', bank: 72.36, samples: [1] };
    const plan = P.entryPlan(raw);
    expect(plan).toEqual({ version: 2, mode: 'bank', bank: 72.4 });
    expect(Object.isFrozen(plan)).toBe(true);
    raw.bank = 180;
    expect(plan.bank).toBe(72.4);
    expect(P.entryPlan({ mode: 'bank', bank: -1 }).bank).toBe(0);
    expect(P.entryPlan({ mode: 'bank', bank: 999 }).bank).toBe(180);
    for (const bank of [NaN, Infinity, '90', null]) {
      expect(P.entryPlan({ mode: 'bank', bank }).bank).toBe(0);
    }
    for (const rawPlan of [null, [], 'bank', { mode: 'unknown', bank: 90 },
      { mode: 'guided', bank: 90 }, { mode: 'ballistic', bank: 90 }]) {
      const clean = P.entryPlan(rawPlan);
      expect(clean.version).toBe(2);
      expect(clean.bank).toBe(0);
      expect(['guided', 'ballistic']).toContain(clean.mode);
    }
  });

  it('preserves v1 trajectories and measurements while making guided v2 total lift load explicit', () => {
    const old = P.entryProfile(-6.5), guided = profile({ mode: 'guided' });
    expect(old.version).toBe(1);
    expect(old.plan).toBeUndefined();
    expect(guided.version).toBe(2);
    expect(guided.plan).toEqual({ version: 2, mode: 'guided', bank: 0 });
    expect(guided.samples).toHaveLength(old.samples.length);
    for (const key of ['outcome', 'duration', 'peakHeatFlux', 'heatLoad', 'downrange', 'splashSpeed', 'peakHeatTime']) {
      expect(guided.summary[key], key).toBe(old.summary[key]);
    }
    for (let i = 0; i < old.samples.length; i += 97) {
      for (const key of ['time', 'altitude', 'speed', 'gamma', 'downrange', 'energyLost', 'heatLoad']) {
        expect(guided.samples[i][key], `${i}:${key}`).toBe(old.samples[i][key]);
      }
      expect(guided.samples[i].loadG).toBeGreaterThanOrEqual(old.samples[i].loadG);
    }
    expect(guided.summary.peakG).toBeGreaterThanOrEqual(old.summary.peakG);
    expect(guided.summary.peakG).toBeLessThan(8);
  });

  it.each([0, 60, 90, 120, 180])('rotates full lift at %s degrees without treating its projection as total load', (bank) => {
    const p = profile(bankPlan(bank)), E = P.entry;
    const active = p.samples.filter((s) => s.speed > 3000 && s.stage === 'entry');
    expect(active.length).toBeGreaterThan(100);
    for (let i = 0; i < active.length; i += 71) {
      const s = active[i], drag = s.dragG * E.g0;
      expect(s.bank).toBe(bank);
      expect(s.liftMagnitude).toBeCloseTo(drag * E.liftToDrag, 10);
      expect(s.liftAcceleration).toBeCloseTo(s.liftMagnitude * Math.cos(bank * Math.PI / 180), 10);
      expect(s.loadG).toBeCloseTo(Math.hypot(drag, s.liftMagnitude) / E.g0, 10);
      expect(s.verticalSpeed).toBeCloseTo(s.speed * Math.sin(s.gamma), 10);
    }
    for (const s of p.samples.filter((s) => s.speed <= 3000 || s.stage === 'drogue' || s.stage === 'main' || s.stage === 'splash')) {
      expect(s.bank).toBeNull();
      expect(s.liftMagnitude).toBe(0);
      expect(s.liftAcceleration).toBe(0);
      expect(s.loadG).toBeCloseTo(s.dragG, 10);
    }
  });

  it('distinguishes zero-lift ballistic flight from lateral lift at 90 degrees', () => {
    const ballistic = profile({ mode: 'ballistic' }), lateral = profile(bankPlan(90));
    for (let i = 0; i < ballistic.samples.length; i += 89) {
      const b = ballistic.samples[i], l = lateral.samples[i];
      expect(b.liftMagnitude).toBe(0);
      expect(b.liftAcceleration).toBe(0);
      expect(b.bank).toBeNull();
      expect(b.loadG).toBeCloseTo(b.dragG, 10);
      expect(l.altitude).toBeCloseTo(b.altitude, 6);
      expect(l.speed).toBeCloseTo(b.speed, 6);
    }
    expect(lateral.summary.duration).toBeCloseTo(ballistic.summary.duration, 6);
    expect(lateral.summary.downrange).toBeCloseTo(ballistic.summary.downrange, 6);
    expect(lateral.summary.peakG / ballistic.summary.peakG).toBeCloseTo(Math.sqrt(1 + P.entry.liftToDrag ** 2), 10);
  });

  it('changes capture, range and load through physical lift orientation', () => {
    const guided = profile({ mode: 'guided' }), ballistic = profile({ mode: 'ballistic' });
    const up = profile(bankPlan(0)), down = profile(bankPlan(180));
    expect(guided.summary.outcome).toBe('nominal');
    expect(ballistic.summary.outcome).toBe('steep');
    expect(ballistic.summary.peakG).toBeGreaterThan(guided.summary.peakG * 1.8);
    expect(guided.summary.downrange).toBeGreaterThan(ballistic.summary.downrange * 1.4);
    expect(up.summary.outcome).toBe('skip');
    expect(up.events.splash).toBeNull();
    expect(up.events.skip.altitude).toBe(P.entry.interfaceAltitude);
    expect(up.events.skip.verticalSpeed).toBeGreaterThan(0);
    expect(down.summary.peakG).toBeGreaterThan(ballistic.summary.peakG * 2);
    expect(down.summary.duration).toBeLessThan(ballistic.summary.duration);
  });

  it.each([{ mode: 'guided' }, { mode: 'ballistic' }, bankPlan(0), bankPlan(90), bankPlan(180)])(
    'preserves the mechanical energy balance when lift changes orientation: %j', (plan) => {
      const p = profile(plan), E = P.entry;
      const energy = (s) => s.speed * s.speed / 2 - E.mu / (E.radius + s.altitude);
      const initial = energy(p.samples[0]);
      let peakError = 0, previousLoss = 0;
      for (const s of p.samples) {
        peakError = Math.max(peakError, Math.abs(energy(s) + s.energyLost - initial));
        expect(s.energyLost).toBeGreaterThanOrEqual(previousLoss);
        previousLoss = s.energyLost;
      }
      // Lift is perpendicular to velocity: it changes the path, without adding
      // work to the drag-only dissipation integral. Tolerance allows RK4 error.
      expect(peakError).toBeLessThan(20);
    },
  );

  it.each([{ mode: 'guided' }, { mode: 'ballistic' }, bankPlan(0), bankPlan(90), bankPlan(180)])(
    'converges with a halved numerical step: %j', (plan) => {
      const coarse = profile(plan), fine = profile(plan, -6.5, 0.125);
      expect(fine.summary.outcome).toBe(coarse.summary.outcome);
      expect(Math.abs(fine.summary.peakG / coarse.summary.peakG - 1)).toBeLessThan(0.003);
      expect(Math.abs(fine.summary.peakHeatFlux / coarse.summary.peakHeatFlux - 1)).toBeLessThan(0.001);
      expect(Math.abs(fine.summary.heatLoad / coarse.summary.heatLoad - 1)).toBeLessThan(0.001);
      expect(Math.abs(fine.summary.duration - coarse.summary.duration)).toBeLessThan(1);
      expect(Math.abs(fine.summary.downrange / coarse.summary.downrange - 1)).toBeLessThan(0.001);
    },
  );

  it('separates cached versions and plans, retaining immutable settings and detached samples', () => {
    const old = P.entryProfile(-6.5), raw = bankPlan(72.36), planned = profile(raw);
    expect(profile(bankPlan(72.4))).toBe(planned);
    expect(profile(bankPlan(90))).not.toBe(planned);
    expect(profile({ mode: 'guided' })).not.toBe(old);
    expect(profile({ mode: 'ballistic' })).not.toBe(profile({ mode: 'guided' }));
    expect(P.entryProfile(-6.5)).toBe(old);
    raw.bank = 180;
    expect(planned.plan.bank).toBe(72.4);
    for (const value of [planned, planned.plan, planned.summary, planned.samples, planned.samples[0], planned.events.skip || planned.events.splash]) {
      expect(Object.isFrozen(value)).toBe(true);
    }
    const sample = P.entrySample(planned, 10);
    sample.liftMagnitude = -100;
    expect(P.entrySample(planned, 10).liftMagnitude).toBeGreaterThanOrEqual(0);
    const first = profile(bankPlan(10.1));
    for (let bank = 20.1; bank < 121; bank += 10) profile(bankPlan(bank));
    expect(profile(bankPlan(10.1))).toBe(first);
    profile(bankPlan(130.1));
    expect(profile(bankPlan(10.1))).not.toBe(first);
    expect(P.entryProfile(-6.5)).toBe(old);
  });

  it('recomputes sampled forces consistently and retains an inactive bank at the lift cutoff', () => {
    const p = profile(bankPlan(90)), E = P.entry;
    const lower = p.samples.findIndex(s => s.speed <= 3000);
    const a = p.samples[lower - 1], b = p.samples[lower];
    const crossing = a.time + (b.time - a.time) * (a.speed - 3000) / (a.speed - b.speed);
    const before = P.entrySample(p, crossing - 0.0001), after = P.entrySample(p, crossing + 0.0001);
    expect(before.bank).toBe(90);
    expect(after.bank).toBeNull();
    expect(after.liftMagnitude).toBe(0);
    for (const seconds of [25.137, 90.173, crossing + 0.01, p.events.main.time + 1.123]) {
      const s = P.entrySample(p, seconds);
      expect(s.dynamicPressure).toBeCloseTo(0.5 * s.density * s.speed ** 2, 7);
      expect(s.loadG).toBeCloseTo(Math.hypot(s.dragG, s.liftMagnitude / E.g0), 10);
      expect(s.verticalSpeed).toBeCloseTo(s.speed * Math.sin(s.gamma), 10);
    }
  });
});
