import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let P;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
});

describe('Moon Mission numerical atmospheric entry', () => {
  it('uses a continuous standard lower atmosphere with explicit SI outputs', () => {
    const sea = P.entryAtmosphere(0);
    expect(sea.temperature).toBe(288.15);
    expect(sea.pressure).toBe(101325);
    expect(sea.density).toBeCloseTo(1.225, 4);
    expect(sea.soundSpeed).toBeCloseTo(340.294, 2);
    expect(P.entryAtmosphere(10000).density).toBeCloseTo(0.4135, 3);
    let last = sea.density;
    for (let h = 1000; h <= 122000; h += 1000) {
      const at = P.entryAtmosphere(h);
      expect(at.density).toBeGreaterThan(0);
      expect(at.density).toBeLessThan(last);
      last = at.density;
    }
    for (const geopotential of [11000, 20000, 32000, 47000, 51000, 71000, 84852]) {
      const z = geopotential * 6356766 / (6356766 - geopotential);
      const a = P.entryAtmosphere(z - 0.01), b = P.entryAtmosphere(z + 0.01);
      expect(Math.abs(b.density / a.density - 1)).toBeLessThan(0.00001);
    }
  });

  it('starts from the selected angle and predicts a complete nominal entry', () => {
    const profile = P.entryProfile(-6.5), initial = profile.samples[0], E = P.entry;
    expect(initial.altitude).toBe(122000);
    expect(initial.speed).toBe(11030);
    expect(initial.gamma).toBeCloseTo(-6.5 * Math.PI / 180, 12);
    expect(initial.heatLoad).toBe(0);
    expect(profile.summary.outcome).toBe('nominal');
    // Apollo 11 measured 6.51 g. The simplified constant-aerodynamics/bank model
    // should have that scale, without manufacturing an exact historical answer.
    expect(profile.summary.peakG).toBeGreaterThan(5.5);
    expect(profile.summary.peakG).toBeLessThan(8);
    expect(profile.summary.duration).toBeGreaterThan(600);
    expect(profile.summary.duration).toBeLessThan(1100);
    expect(profile.summary.peakHeatFlux).toBeGreaterThan(1e6);
    expect(profile.summary.peakHeatFlux).toBeLessThan(3e6);
    const { drogue, main, splash, skip } = profile.events;
    expect(skip).toBeNull();
    expect(drogue.time).toBeLessThan(main.time);
    expect(main.time).toBeLessThan(splash.time);
    expect(drogue.altitude).toBeLessThanOrEqual(E.drogueAltitude);
    expect(drogue.mach).toBeLessThanOrEqual(E.drogueMaxMach);
    expect(drogue.dynamicPressure).toBeLessThanOrEqual(E.drogueMaxPressure);
    expect(main.altitude).toBeLessThanOrEqual(E.mainAltitude);
    expect(main.speed).toBeLessThanOrEqual(E.mainMaxSpeed);
    expect(main.dynamicPressure).toBeLessThanOrEqual(E.mainMaxPressure);
    expect(main.time - drogue.time).toBeGreaterThan(E.drogueInflationSeconds + 2);
    expect(splash.altitude).toBe(0);
    expect(profile.summary.splashSpeed).toBeGreaterThan(8);
    expect(profile.summary.splashSpeed).toBeLessThan(12);
  });

  it('ties altitude, speed, deceleration and heat to the same physical trajectory', () => {
    const profile = P.entryProfile(-6.5), E = P.entry, rows = profile.samples;
    const energy = (s) => s.speed * s.speed / 2 - E.mu / (E.radius + s.altitude);
    const initialEnergy = energy(rows[0]);
    let integratedHeat = 0;
    for (let i = 0; i < rows.length; i++) {
      const s = rows[i];
      expect(Math.abs(energy(s) + s.energyLost - initialEnergy)).toBeLessThan(20);
      expect(s.dynamicPressure).toBeCloseTo(0.5 * s.density * s.speed * s.speed, 7);
      expect(s.dragG).toBeCloseTo(s.dynamicPressure * s.dragArea / (E.mass * E.g0), 10);
      expect(s.loadG).toBeGreaterThanOrEqual(s.dragG);
      expect(s.loadG).toBeLessThanOrEqual(s.dragG * Math.sqrt(1 + E.liftToDrag ** 2) + 1e-10);
      expect(s.heatFlux).toBeCloseTo(E.heatCoefficient * Math.sqrt(s.density / E.noseRadius) * s.speed ** 3, 6);
      if (i > 0) {
        const previous = rows[i - 1];
        integratedHeat += (s.time - previous.time) * (s.heatFlux + previous.heatFlux) / 2;
        expect(s.heatLoad).toBeGreaterThanOrEqual(previous.heatLoad);
        expect(s.energyLost).toBeGreaterThanOrEqual(previous.energyLost);
      }
      if (i > 0 && i < rows.length - 1 && rows[i - 1].stage === s.stage && rows[i + 1].stage === s.stage) {
        const verticalRate = (rows[i + 1].altitude - rows[i - 1].altitude) / (rows[i + 1].time - rows[i - 1].time);
        expect(Math.abs(verticalRate - s.speed * Math.sin(s.gamma))).toBeLessThan(0.4);
      }
    }
    expect(Math.abs(integratedHeat / profile.summary.heatLoad - 1)).toBeLessThan(0.0001);
    expect(profile.summary.peakG).toBe(Math.max(...rows.map((s) => s.loadG)));
    expect(profile.summary.peakHeatFlux).toBe(Math.max(...rows.map((s) => s.heatFlux)));
  });

  it('gets stronger peak loads and heating from steeper trajectories', () => {
    const mild = P.entryProfile(-6), nominal = P.entryProfile(-6.5), steep = P.entryProfile(-8.5);
    expect(mild.summary.peakG).toBeLessThan(nominal.summary.peakG);
    expect(steep.summary.peakG).toBeGreaterThan(nominal.summary.peakG * 2);
    expect(steep.summary.peakHeatFlux).toBeGreaterThan(nominal.summary.peakHeatFlux);
    expect(steep.summary.peakHeatTime).toBeLessThan(nominal.summary.peakHeatTime);
    // A shorter, sharper heat pulse can have a smaller integrated heat load.
    expect(steep.summary.heatLoad).toBeLessThan(nominal.summary.heatLoad);
    expect(steep.summary.outcome).toBe('steep');
    expect(steep.summary.peakG).toBeGreaterThan(P.entry.cautionG);
    expect(P.entryPeakG(-6.5)).toBe(Math.round(nominal.summary.peakG * 10) / 10);
  });

  it('ends an actual skip at the upward interface crossing without deploying chutes', () => {
    const profile = P.entryProfile(-4.5), last = profile.samples.at(-1);
    expect(profile.summary.outcome).toBe('skip');
    expect(profile.events.drogue).toBeNull();
    expect(profile.events.main).toBeNull();
    expect(profile.events.splash).toBeNull();
    expect(profile.summary.splashSpeed).toBeNull();
    expect(last.stage).toBe('skip');
    expect(last.altitude).toBe(P.entry.interfaceAltitude);
    expect(last.gamma).toBeGreaterThan(0);
    expect(Math.min(...profile.samples.map((s) => s.altitude))).toBeLessThan(last.altitude - 30000);
    expect(P.entrySample(profile, 100000)).toEqual(last);
  });

  it('inflates each parachute gradually and uses that same fraction for drag', () => {
    const profile = P.entryProfile(-6.5), E = P.entry;
    for (const stage of ['drogue', 'main']) {
      const event = profile.events[stage];
      const duration = stage === 'drogue' ? E.drogueInflationSeconds : E.mainInflationSeconds;
      expect(P.entrySample(profile, event.time).chuteFraction).toBe(0);
      expect(P.entrySample(profile, event.time + duration / 2).chuteFraction).toBeCloseTo(0.5, 8);
      expect(P.entrySample(profile, event.time + duration).chuteFraction).toBe(1);
      let lastFraction = 0;
      for (const s of profile.samples.filter((row) => row.stage === stage)) {
        expect(s.chuteFraction).toBeGreaterThanOrEqual(lastFraction);
        const area = stage === 'drogue' ? E.capsuleDragArea + E.drogueDragArea * s.chuteFraction
          : E.capsuleDragArea + E.drogueDragArea * (1 - s.chuteFraction) + E.mainDragArea * s.chuteFraction;
        expect(s.dragArea).toBeCloseTo(area, 8);
        lastFraction = s.chuteFraction;
      }
    }
    const beforeMain = P.entrySample(profile, profile.events.main.time - 0.001);
    expect(beforeMain.stage).toBe('drogue');
    expect(beforeMain.chuteFraction).toBe(1);
  });

  it('converges when the numerical step is halved', () => {
    for (const angle of [-4.5, -6.5, -8.5]) {
      const coarse = P.entryProfile(angle), fine = P.entryProfile(angle, { step: 0.125 });
      expect(fine.summary.outcome).toBe(coarse.summary.outcome);
      expect(Math.abs(fine.summary.peakG / coarse.summary.peakG - 1)).toBeLessThan(0.002);
      expect(Math.abs(fine.summary.peakHeatFlux / coarse.summary.peakHeatFlux - 1)).toBeLessThan(0.0002);
      expect(Math.abs(fine.summary.heatLoad / coarse.summary.heatLoad - 1)).toBeLessThan(0.0002);
      expect(Math.abs(fine.summary.duration - coarse.summary.duration)).toBeLessThan(0.5);
    }
  });

  it('keeps cached profiles immutable and samples detached, with bounded cache retention', () => {
    const profile = P.entryProfile(-6.5);
    expect(P.entryProfile(6.5)).toBe(profile);
    expect(P.entryProfile(NaN)).toBe(profile);
    expect(Object.isFrozen(profile)).toBe(true);
    expect(Object.isFrozen(profile.samples)).toBe(true);
    expect(Object.isFrozen(profile.samples[10])).toBe(true);
    expect(Object.isFrozen(profile.events.main)).toBe(true);
    expect(Object.isFrozen(profile.summary)).toBe(true);
    const sampled = P.entrySample(profile, 10);
    sampled.speed = -100;
    expect(P.entrySample(profile, 10).speed).toBeGreaterThan(10000);
    expect(P.entrySample(profile, -10)).toEqual(profile.samples[0]);
    for (const angle of [-4, -4.1, -4.2, -4.3, -4.4, -4.5]) P.entryProfile(angle);
    expect(P.entryProfile(-6.5)).not.toBe(profile);
    expect(P.entryProfile(-6.5).summary).toEqual(profile.summary);
  });

  it('finishes every selectable angle with finite bounded data and a physical terminal event', () => {
    for (let angle = 4; angle <= 9.001; angle += 0.1) {
      const profile = P.entryProfile(-angle), last = profile.samples.at(-1);
      expect(profile.summary.outcome).not.toBe('incomplete');
      expect(['splash', 'skip']).toContain(last.stage);
      expect(profile.samples.length).toBeLessThanOrEqual(P.entry.maxTime / P.entry.step + 2);
      for (const value of Object.values(profile.summary)) {
        if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
      }
      expect(last.speed).toBeGreaterThan(0);
      expect(last.altitude).toBeGreaterThanOrEqual(0);
    }
  });
});
