import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let P;
beforeEach(() => {
  resetStemLab();
  loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
});

const slab = (patch = {}) => ({ version: 1, thickness: 0.05, conductivity: 0.12, emissivity: 0.85, ...patch });
const source = (flux = 0, duration = 120) => Object.freeze({ version: 1, angle: -6.5,
  samples: Object.freeze([Object.freeze({ time: 0, heatFlux: flux, heatLoad: 0 }),
    Object.freeze({ time: duration, heatFlux: flux, heatLoad: flux * duration })]),
  summary: Object.freeze({ duration }) });
const entry = (plan = { version: 2, mode: 'guided', bank: 0 }) => P.entryProfile(-6.5, { plan });
function capacityWeightedMean(temperatures) {
  const intervals = temperatures.length - 1;
  let total = 0;
  for (let i = 0; i <= intervals; i++) total += temperatures[i] * (i === 0 || i === intervals ? 0.5 : 1);
  return total / intervals;
}
function storedFromTemperatures(sample, plan) {
  return P.thermalConstants.density * P.thermalConstants.cp * plan.thickness *
    (capacityWeightedMean(sample.temperatures) - P.thermalConstants.initialTemperature);
}

describe('Moon Mission hypothetical entry thermal slab', () => {
  it('normalizes bounded material choices without treating strings or unknown versions as measurements', () => {
    const raw = slab({ thickness: 0.0536, conductivity: 0.127, emissivity: 0.846, samples: [1] });
    const clean = P.entryThermalPlan(raw);
    expect(clean).toEqual(slab({ thickness: 0.054, conductivity: 0.13 }));
    expect(Object.isFrozen(clean)).toBe(true);
    raw.thickness = 0.1;
    expect(clean.thickness).toBe(0.054);
    expect(P.entryThermalPlan({ thickness: -1, conductivity: -1, emissivity: -1 })).toEqual(slab({ thickness: 0.01, conductivity: 0.04, emissivity: 0 }));
    expect(P.entryThermalPlan({ thickness: 99, conductivity: 99, emissivity: 99 })).toEqual(slab({ thickness: 0.1, conductivity: 1.2, emissivity: 1 }));
    for (const value of [null, [], 'material', { version: 2, thickness: 0.1 },
      { thickness: '0.1', conductivity: Infinity, emissivity: NaN }]) expect(P.entryThermalPlan(value)).toEqual(slab());
    expect(P.thermalConstants).toMatchObject({ density: 500, cp: 1500, initialTemperature: 293.15,
      environmentTemperature: 293.15, sigma: 5.670374419e-8, intervals: 32, step: 0.5, cooldown: 300 });
    expect(Object.isFrozen(P.thermalConstants)).toBe(true);
  });

  it('holds a uniform slab in equilibrium with zero input at its specified radiation environment', () => {
    const p = P.entryThermalProfile(source(), slab());
    expect(p.summary.duration).toBe(420);
    expect(p.summary.entryDuration).toBe(120);
    expect(p.samples[0].temperatures).toHaveLength(33);
    for (const s of p.samples) {
      for (const temperature of s.temperatures) expect(temperature).toBeCloseTo(293.15, 7);
      expect(Math.abs(s.storedEnergy)).toBeLessThan(0.01);
      expect(Math.abs(s.fluxRadiated)).toBeLessThan(1e-7);
      expect(Math.abs(s.fluxConducted)).toBeLessThan(1e-7);
    }
    expect(p.summary.heatIn).toBe(0);
    expect(Math.abs(p.summary.heatRadiated)).toBeLessThan(0.01);
    expect(p.summary.maxEnergyResidual).toBeLessThan(0.01);
  });

  it('uses the full prescribed convective input and the analytic areal heat capacity when emissivity is zero', () => {
    const flux = 20000, duration = 120, material = slab({ thickness: 0.02, conductivity: 0.8, emissivity: 0 });
    const p = P.entryThermalProfile(source(flux, duration), material), C = P.thermalConstants;
    expect(p.summary.heatIn).toBe(flux * duration);
    expect(p.summary.heatRadiated).toBe(0);
    for (let i = 0; i < p.samples.length; i += 73) {
      const s = p.samples[i], input = flux * Math.min(s.time, duration);
      // Half control volumes at the boundaries must sum to rho*cp*L, rather
      // than adding an extra full cell of fictitious storage capacity.
      expect(capacityWeightedMean(s.temperatures)).toBeCloseTo(C.initialTemperature + input / (C.density * C.cp * material.thickness), 7);
      expect(s.storedEnergy).toBeCloseTo(input, 4);
      expect(s.fluxRadiated).toBe(0);
    }
    expect(p.summary.storedEnergy).toBeCloseTo(flux * duration, 4);
    expect(p.summary.maxEnergyResidual).toBeLessThan(0.01);
  });

  it('closes the radiative energy budget with the actual immutable entry heat integral', () => {
    const e = entry(), original = JSON.stringify(e), material = slab({ thickness: 0.02, conductivity: 0.8 });
    const receipt = P.entryRecordedResult(e), p = P.entryThermalProfile(e, material), C = P.thermalConstants;
    expect(p.summary.heatIn).toBe(e.summary.heatLoad);
    expect(p.summary.heatRadiated).toBeGreaterThan(0);
    expect(p.summary.storedEnergy).toBeGreaterThan(0);
    expect(p.summary.maxEnergyResidual).toBeLessThan(0.1);
    for (let i = 0; i < p.samples.length; i += 67) {
      const s = p.samples[i], input = P.entrySample(e, Math.min(s.time, e.summary.duration));
      expect(s.heatIn).toBeCloseTo(input.heatLoad, 5);
      expect(Math.abs(s.heatIn - s.heatRadiated - s.storedEnergy)).toBeLessThan(0.1);
      expect(s.storedEnergy).toBeCloseTo(storedFromTemperatures(s, material), 5);
      expect(s.fluxRadiated).toBeCloseTo(material.emissivity * C.sigma * (s.surfaceT ** 4 - C.environmentTemperature ** 4), 6);
      expect(s.fluxConducted).toBeCloseTo(material.conductivity / (material.thickness / 32) * (s.temperatures[0] - s.temperatures[1]), 8);
      expect(s.fluxIn).toBe(s.time < e.summary.duration ? input.heatFlux : 0);
    }
    expect(JSON.stringify(e)).toBe(original);
    expect(P.entryRecordedResult(e)).toEqual(receipt);
  });

  it('returns detached interpolated temperatures and conservative budgets with Kelvin-based flux readouts', () => {
    const e = entry(), p = P.entryThermalProfile(e, slab({ thickness: 0.02, conductivity: 0.8 }));
    const time = 137.125, a = p.samples.findLast(s => s.time <= time), b = p.samples.find(s => s.time > time);
    const f = (time - a.time) / (b.time - a.time), sample = P.entryThermalSample(p, time), C = P.thermalConstants;
    expect(sample.time).toBe(time);
    for (let i = 0; i < sample.temperatures.length; i++) expect(sample.temperatures[i]).toBe(a.temperatures[i] + (b.temperatures[i] - a.temperatures[i]) * f);
    expect(sample.heatIn).toBe(a.heatIn + (b.heatIn - a.heatIn) * f);
    expect(sample.heatRadiated).toBe(a.heatRadiated + (b.heatRadiated - a.heatRadiated) * f);
    expect(Math.abs(sample.energyResidual)).toBeLessThan(0.1);
    expect(sample.fluxIn).toBe(P.entrySample(e, time).heatFlux);
    expect(sample.fluxRadiated).toBeCloseTo(p.plan.emissivity * C.sigma * (sample.surfaceT ** 4 - C.environmentTemperature ** 4), 6);
    sample.temperatures[0] = -1;
    expect(P.entryThermalSample(p, time).surfaceT).toBeGreaterThan(C.initialTemperature);
    expect(P.entryThermalSample(p, -100).time).toBe(0);
    expect(P.entryThermalSample(p, Infinity).time).toBe(0);
    expect(P.entryThermalSample(p, 1e9).time).toBe(p.summary.duration);
  });

  it('exposes delayed back-face warming during an explicitly assumed zero-input cooldown', () => {
    const material = slab({ thickness: 0.02, conductivity: 1.2 });
    const p = P.entryThermalProfile(source(150000, 40), material), last = p.samples.at(-1);
    const boundary = p.samples.find(s => s.time === 40);
    expect(boundary.phase).toBe('cooling');
    expect(last.time).toBe(340);
    expect(last.backT).toBeGreaterThan(boundary.backT + 5);
    expect(p.summary.peakBackTime).toBeGreaterThan(p.summary.peakSurfaceTime);
    for (const s of p.samples.filter(row => row.phase === 'cooling')) {
      expect(s.heatIn).toBe(6000000);
      expect(s.fluxIn).toBe(0);
    }
    expect(last.heatRadiated).toBeGreaterThan(boundary.heatRadiated);
    expect(last.storedEnergy).toBeLessThan(boundary.storedEnergy);
    expect(last.surfaceT).toBeLessThan(boundary.surfaceT);
  });

  it('changes front and rear response through conductivity, rather than changing the entry heat input', () => {
    const e = source(100000, 80);
    const low = P.entryThermalProfile(e, slab({ thickness: 0.03, conductivity: 0.08 }));
    const high = P.entryThermalProfile(e, slab({ thickness: 0.03, conductivity: 0.8 }));
    expect(high.summary.heatIn).toBe(low.summary.heatIn);
    expect(high.summary.peakSurfaceT).toBeLessThan(low.summary.peakSurfaceT);
    expect(high.summary.peakBackT).toBeGreaterThan(low.summary.peakBackT + 10);
  });

  it('delays heat reaching the rear with added thickness while accounting for the extra areal mass and capacity', () => {
    const e = source(100000, 80), thinPlan = slab({ thickness: 0.02, conductivity: 0.8 });
    const thickPlan = slab({ thickness: 0.04, conductivity: 0.8 });
    const thin = P.entryThermalProfile(e, thinPlan), thick = P.entryThermalProfile(e, thickPlan);
    expect(thick.summary.heatIn).toBe(thin.summary.heatIn);
    expect(thick.summary.peakBackT).toBeLessThan(thin.summary.peakBackT - 5);
    expect(thick.summary.peakBackTime).toBeGreaterThan(thin.summary.peakBackTime);
    const massThin = P.thermalConstants.density * thinPlan.thickness, massThick = P.thermalConstants.density * thickPlan.thickness;
    expect(massThick).toBe(massThin * 2);
    expect(storedFromTemperatures(thick.samples.at(-1), thickPlan)).toBeCloseTo(thick.summary.storedEnergy, 5);
  });

  it('approaches the Stefan–Boltzmann equilibrium under a long constant input and insulated rear face', () => {
    const flux = 50000, material = slab({ thickness: 0.01, conductivity: 1.2, emissivity: 0.9 });
    const p = P.entryThermalProfile(source(flux, 2400), material), C = P.thermalConstants;
    const equilibrium = (flux / (material.emissivity * C.sigma) + C.environmentTemperature ** 4) ** 0.25;
    const heated = p.samples.find(s => s.time === 2400);
    expect(heated.surfaceT).toBeCloseTo(equilibrium, 2);
    expect(heated.backT).toBeCloseTo(equilibrium, 2);
    expect(heated.fluxRadiated).toBeCloseTo(flux, 1);
    expect(Math.abs(heated.fluxConducted)).toBeLessThan(0.1);
  });

  it.each([{ version: 2, mode: 'guided', bank: 0 }, { version: 2, mode: 'bank', bank: 180 }])(
    'converges with a halved time step for the same heat pulse: %j', (controller) => {
      const e = entry(controller), material = slab({ thickness: 0.02, conductivity: 0.8 });
      const coarse = P.entryThermalProfile(e, material), fine = P.entryThermalProfile(e, material, { step: 0.25 });
      expect(fine.summary.heatIn).toBe(coarse.summary.heatIn);
      expect(Math.abs(fine.summary.peakSurfaceT - coarse.summary.peakSurfaceT)).toBeLessThan(15);
      expect(Math.abs(fine.summary.peakBackT - coarse.summary.peakBackT)).toBeLessThan(6);
      expect(Math.abs(fine.summary.peakBackTime - coarse.summary.peakBackTime)).toBeLessThan(2);
      expect(fine.summary.maxEnergyResidual).toBeLessThan(0.1);
    },
  );

  it('converges in depth while preserving the total finite-volume heat capacity', () => {
    const e = entry(), material = slab({ thickness: 0.02, conductivity: 0.8 });
    const coarse = P.entryThermalProfile(e, material), fine = P.entryThermalProfile(e, material, { intervals: 64 });
    expect(fine.samples[0].temperatures).toHaveLength(65);
    expect(fine.summary.heatIn).toBe(coarse.summary.heatIn);
    expect(Math.abs(fine.summary.peakSurfaceT - coarse.summary.peakSurfaceT)).toBeLessThan(3);
    expect(Math.abs(fine.summary.peakBackT - coarse.summary.peakBackT)).toBeLessThan(3);
    expect(Math.abs(fine.summary.heatRadiated - coarse.summary.heatRadiated) / coarse.summary.heatIn).toBeLessThan(0.002);
    expect(fine.summary.maxEnergyResidual).toBeLessThan(0.1);
  });

  it.each([
    slab({ thickness: 0.01, conductivity: 0.04, emissivity: 0 }),
    slab({ thickness: 0.01, conductivity: 1.2, emissivity: 1 }),
    slab({ thickness: 0.1, conductivity: 0.04, emissivity: 1 }),
    slab({ thickness: 0.1, conductivity: 1.2, emissivity: 0 }),
  ])('remains finite and conserves energy at the supported material bounds: %j', (material) => {
    const p = P.entryThermalProfile(entry({ version: 2, mode: 'bank', bank: 180 }), material);
    expect(p.summary.maxEnergyResidual).toBeLessThan(0.1);
    for (let i = 0; i < p.samples.length; i += 113) {
      const s = p.samples[i];
      expect(s.temperatures.every(value => Number.isFinite(value) && value > 0)).toBe(true);
      for (const [key, value] of Object.entries(s)) if (typeof value === 'number') expect(Number.isFinite(value), key).toBe(true);
      expect(Math.abs(s.energyResidual)).toBeLessThan(0.1);
    }
  });

  it('retains immutable source/controller identity and plan settings without altering flight evidence', () => {
    const e1 = P.entryProfile(-6.5), e2 = entry(), selected = slab({ conductivity: 0.8 });
    const p1 = P.entryThermalProfile(e1, selected), p2 = P.entryThermalProfile(e2, selected);
    expect(p1).not.toBe(p2);
    expect(p1.source).toEqual({ modelVersion: 1, angle: -6.5 });
    expect(p2.source).toEqual({ modelVersion: 2, angle: -6.5, plan: { version: 2, mode: 'guided', bank: 0 } });
    expect(p1.summary.heatIn).toBe(p2.summary.heatIn);
    for (const value of [p2, p2.source, p2.source.plan, p2.plan, p2.summary, p2.samples, p2.samples[1], p2.samples[1].temperatures]) expect(Object.isFrozen(value)).toBe(true);
    selected.conductivity = 1.2;
    expect(p2.plan.conductivity).toBe(0.8);
    expect(P.entryThermalProfile(e2, slab({ conductivity: 0.8 }))).toBe(p2);
    expect(P.entryThermalProfile(e2, slab({ conductivity: 0.9 }))).not.toBe(p2);
  });

  it('bounds default cache retention and keeps custom numerical resolutions independent', () => {
    const e = source(10000, 5), first = P.entryThermalProfile(e, slab({ thickness: 0.01 }));
    for (let millimeters = 11; millimeters <= 17; millimeters++) P.entryThermalProfile(e, slab({ thickness: millimeters / 1000 }));
    expect(P.entryThermalProfile(e, slab({ thickness: 0.01 }))).toBe(first);
    P.entryThermalProfile(e, slab({ thickness: 0.018 }));
    expect(P.entryThermalProfile(e, slab({ thickness: 0.01 }))).not.toBe(first);
    const custom = P.entryThermalProfile(e, slab(), { intervals: 1000, step: 99 });
    expect(custom.samples[0].temperatures).toHaveLength(97);
    expect(custom.samples[1].time).toBe(2);
    const small = P.entryThermalProfile(source(0, 1), slab(), { intervals: 1, step: -1 });
    expect(small.samples[0].temperatures).toHaveLength(17);
    expect(small.samples[1].time).toBe(0.1);
    expect(P.entryThermalProfile(e, slab()).samples[0].temperatures).toHaveLength(33);
  });

  it('rejects invalid source versions or nonfinite heating instead of manufacturing a thermal result', () => {
    for (const bad of [null, { ...source(), version: 3 }, { ...source(), summary: { duration: Infinity } },
      { ...source(), samples: [] }, { ...source(), version: 2, plan: { version: 2, mode: 'bank', bank: '90' } },
      source(-1), { ...source(), samples: [{ time: 0, heatLoad: 0, heatFlux: 0 }, { time: 120, heatLoad: Infinity, heatFlux: 0 }] }]) {
      expect(P.entryThermalProfile(bad, slab())).toBeNull();
    }
    expect(P.entryThermalSample(null, 0)).toBeNull();
  });
});
