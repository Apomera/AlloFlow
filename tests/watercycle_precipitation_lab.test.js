import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

function loadPrecipitationKernel(filePath = WATER_CYCLE_PATHS[0]) {
  const source = readFileSync(filePath, 'utf8');
  const makeElement = () => ({
    appendChild() {},
    setAttribute() {},
    style: {},
    className: '',
    id: '',
    textContent: '',
  });
  const document = {
    body: { appendChild() {} },
    head: { appendChild() {} },
    createElement: makeElement,
    getElementById() { return null; },
  };
  const window = {
    StemLab: { registerTool() {} },
  };
  vm.runInNewContext(source, {
    window,
    document,
    console,
    Math,
    Date,
    Object,
    Array,
    Number,
    String,
    Boolean,
    JSON,
    isFinite,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
  }, { filename: filePath });
  return window.WaterCyclePrecipitationKernel;
}

describe('Water Cycle Precipitation Lab', () => {

  it('server-renders the expanded lab without mounting canvas refs', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_watercycle.js', 'waterCycle');
    const html = renderTool('waterCycle', {
      waterCycle: { wcMode: 'precipHunt', precipHunt: { preset: 'mountainSnow' } },
    });

    expect(html).toContain('Interactive storm chamber');
    expect(html).toContain('View this setup in 3D');
    expect(html).toContain('Vertical lift / updraft');
    expect(html).toContain('Qualitative teaching model');
  });

  it('renders a phase-coded HUD, intensity meter, and connected atmospheric pathway', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_watercycle.js', 'waterCycle');
    const html = renderTool('waterCycle', {
      waterCycle: {
        wcMode: 'precipHunt',
        precipHunt: {
          preset: 'hailstorm',
          moisture: 96,
          tempC: -14,
          midLevelTempC: -8,
          lowLevelHumidity: 78,
          surfaceTempC: 24,
          wind: 26,
          windDirection: 'east',
          updraft: 96,
          cloudDepth: 12,
          terrain: 'plains',
        },
      },
    });

    expect(html).toContain('data-precipitation-kind="hail"');
    expect(html).toContain('data-precipitation-reach="ground"');
    expect(html).toContain('wc-precip-live-outcome');
    expect(html).toContain('Intensity index');
    expect(html).toContain('<meter');
    expect(html).toContain('data-path-step="cloud"');
    expect(html).toContain('data-path-step="air-column"');
    expect(html).toContain('data-path-step="surface"');

    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('function drawPrecipThermalRail(ctx2, w, cloudBase, groundY)');
      expect(source).toContain("canvasEl.dataset.temperatureRail = 'cloud-middle-surface';");
      expect(source).toContain('drawPrecipThermalRail(context, w, cloudBase, groundY);');
      expect(source).toContain('.wc-precip-live-meter meter');
      expect(source).toContain('@media(max-width:560px){.wc-precip-canvas-dock{grid-template-columns:minmax(0,1fr) auto}');
      expect(source).toContain('.wc-precip-live-meter{grid-column:1/-1');
    });
  });

  it('keeps the source and deploy mirror byte-identical', () => {
    expect(readFileSync(WATER_CYCLE_PATHS[0]).equals(readFileSync(WATER_CYCLE_PATHS[1]))).toBe(true);
  }, 15000);

  it('classifies the six investigation presets with the shared science kernel', () => {
    const kernel = loadPrecipitationKernel();
    const expectedTypes = {
      gentleRain: 'rain',
      summerStorm: 'rain',
      mountainSnow: 'snow',
      virga: 'virga',
      freezingRain: 'freezing-rain',
      hailstorm: 'hail',
    };

    Object.entries(expectedTypes).forEach(([presetId, expectedType]) => {
      expect(kernel.compute(kernel.presets[presetId]).visualType).toBe(expectedType);
    });
  });

  it('uses the vertical profile for phase and lower-air humidity for virga', () => {
    const kernel = loadPrecipitationKernel();
    const base = {
      moisture: 90,
      tempC: -10,
      lowLevelHumidity: 85,
      surfaceTempC: -5,
      wind: 10,
      updraft: 70,
      cloudDepth: 9,
      terrain: 'plains',
    };

    expect(kernel.compute(base).visualType).toBe('snow');
    expect(kernel.compute({ ...base, surfaceTempC: 2 }).visualType).toBe('mix');
    expect(kernel.compute({ ...base, surfaceTempC: 12 }).visualType).toBe('rain');
    expect(kernel.compute({ ...base, tempC: 5, surfaceTempC: -3 }).visualType).toBe('freezing-rain');
    expect(kernel.compute({ ...base, tempC: 3, surfaceTempC: 18, lowLevelHumidity: 10 }).visualType).toBe('virga');
  });

  it('separates horizontal drift from vertical precipitation growth over plains', () => {
    const kernel = loadPrecipitationKernel();
    const base = {
      moisture: 80,
      tempC: 4,
      lowLevelHumidity: 80,
      surfaceTempC: 15,
      updraft: 55,
      cloudDepth: 7,
      terrain: 'plains',
      windDirection: 'east',
    };
    const calm = kernel.compute({ ...base, wind: 0 });
    const windy = kernel.compute({ ...base, wind: 40 });
    const reversed = kernel.compute({ ...base, wind: 40, windDirection: 'west' });

    expect(windy.growthIndex).toBe(calm.growthIndex);
    expect(windy.liftIndex).toBe(calm.liftIndex);
    expect(windy.relativeIntensity).toBe(calm.relativeIntensity);
    expect(windy.driftDirection).toBe('left to right');
    expect(reversed.driftDirection).toBe('right to left');
  });

  it('provides a lifecycle-safe 2.5D chamber and a bridge to the existing 3D journey', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("window.WaterCyclePrecipitationKernel = {");
      expect(source).toContain("'data-precipitation-chamber': '2.5d'");
      expect(source).toContain("canvasEl.dataset.precipitationType = model.visualType;");
      expect(source).toContain("window.matchMedia('(prefers-reduced-motion: reduce)').matches");
      expect(source).toContain('function cleanupPrecipCanvas()');
      expect(source).toContain('if (resizeObserver) resizeObserver.disconnect();');
      expect(source).toContain("document.removeEventListener('visibilitychange', onPrecipVisibilityChange);");
      expect(source).toContain("journeyView: '3d'");
      expect(source).toContain("journeyState: 'precipitating'");
      expect(source).toContain('View this setup in 3D');
    });
  });

  it('exposes a dedicated 3D cloud chamber without changing the default 2D lab', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_watercycle.js', 'waterCycle');
    const html = renderTool('waterCycle', {
      waterCycle: {
        wcMode: 'precipHunt',
        precipHunt: { viewMode: '3d', preset: 'summerStorm' },
      },
    });
    expect(html).toContain('wc-precip-3d-canvas');
    expect(html).toContain('3D cloud chamber');
    expect(html).toContain('Nuclei + droplets');
    expect(html).toContain('0°C layers');
    expect(html).toContain('Reset the 3D cloud chamber camera');

    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain("viewMode: '2d'");
      expect(source).toContain('var precip3dRef = function(canvasEl)');
      expect(source).toContain('canvasEl._wcPrecip3dCleanup = function()');
      expect(source).toContain('canvasEl.dataset.precipitationView = \'3d-cloud-chamber\';');
      expect(source).toContain('precipLineGeometry3d.setDrawRange(0, activeCount3d * 2);');
    });
  });

  it('labels the expanded controls and dynamic result for assistive technology', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("label: 'Cloud moisture'");
      expect(source).toContain("label: 'Cloud depth'");
      expect(source).toContain("label: 'Vertical lift / updraft'");
      expect(source).toContain("label: 'Cloud temperature'");
      expect(source).toContain("label: 'Middle-atmosphere temperature'");
      expect(source).toContain("label: 'Surface temperature'");
      expect(source).toContain("label: 'Below-cloud humidity'");
      expect(source).toContain("label: 'Horizontal wind / drift'");
      expect(source).toContain("'aria-valuetext': spec.aria(value)");
      expect(source).toContain("role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
      expect(source).toContain("'Qualitative teaching model, not a weather measurement or forecast.");
    });
  });
  it('models phase changes by fall height and exposes the schematic thermal layer', () => {
    const kernel = loadPrecipitationKernel();
    const meltingRain = {
      moisture: 90,
      tempC: -10,
      lowLevelHumidity: 85,
      surfaceTempC: 12,
      wind: 10,
      updraft: 70,
      cloudDepth: 9,
      terrain: 'plains',
    };
    const wintryMix = { ...meltingRain, surfaceTempC: 2 };
    const freezingRain = { ...meltingRain, tempC: 5, surfaceTempC: -4 };

    const meltingModel = kernel.compute(meltingRain);
    expect(meltingModel.thermalLayers.transitionKind).toBe('melting');
    expect(meltingModel.freezingLevel).toBeGreaterThan(0);
    expect(meltingModel.freezingLevel).toBeLessThan(1);
    expect(kernel.phaseAt(meltingRain, 0.1)).toBe('snow');
    expect(kernel.phaseAt(meltingRain, 0.9)).toBe('rain');
    expect(kernel.phaseAt(wintryMix, 0.1)).toBe('snow');
    expect(kernel.phaseAt(wintryMix, 0.9)).toBe('mix');
    expect(kernel.phaseAt(freezingRain, 0.1)).toBe('rain');
    expect(kernel.phaseAt(freezingRain, 0.9)).toBe('freezing-rain');
  });

  it('supports a warm inversion with separate melting and refreezing layers', () => {
    const kernel = loadPrecipitationKernel();
    const inversion = {
      moisture: 90,
      tempC: -12,
      midLevelTempC: 8,
      lowLevelHumidity: 90,
      surfaceTempC: -4,
      wind: 10,
      updraft: 68,
      cloudDepth: 8,
      terrain: 'plains',
    };

    const model = kernel.compute(inversion);
    expect(model.visualType).toBe('freezing-rain');
    expect(model.thermalLayers.transitionKind).toBe('layered');
    expect(model.thermalLayers.crossings).toHaveLength(2);
    expect(model.thermalLayers.crossings.map((crossing) => crossing.kind)).toEqual(['melting', 'freezing']);
    expect(kernel.temperatureAt(inversion, 0)).toBe(-12);
    expect(kernel.temperatureAt(inversion, 0.55)).toBe(8);
    expect(kernel.temperatureAt(inversion, 1)).toBe(-4);
    expect(kernel.phaseAt(inversion, 0.1)).toBe('snow');
    expect(kernel.phaseAt(inversion, 0.6)).toBe('rain');
    expect(kernel.phaseAt(inversion, 0.95)).toBe('freezing-rain');
  });

  it('server-renders the interactive three-point temperature profile', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_watercycle.js', 'waterCycle');
    const html = renderTool('waterCycle', {
      waterCycle: {
        wcMode: 'precipHunt',
        precipHunt: {
          moisture: 90,
          tempC: -12,
          midLevelTempC: 8,
          lowLevelHumidity: 90,
          surfaceTempC: -4,
          wind: 10,
          updraft: 68,
          cloudDepth: 8,
          terrain: 'plains',
        },
      },
    });

    expect(html).toContain('data-temperature-profile-editor="three-point"');
    expect(html).toContain('Middle-atmosphere temperature');
    // Pinned without the trailing punctuation: the invariant is that the hint
    // explains what a crossing means, not exactly where the sentence ends.
    expect(html).toContain('Each 0\u00B0C crossing becomes a visible phase-change layer');
  });
  it('checks flash-to-thunder distance estimates with qualitative feedback', () => {
    const kernel = loadPrecipitationKernel();
    const storm = { ...kernel.presets.summerStorm, stormDistanceKm: 3, thunderEstimateKm: 3 };
    const close = kernel.compute(storm);
    expect(close.thunderEstimate.band).toBe('close');
    expect(close.thunderEstimate.errorKm).toBe(0);

    const near = kernel.compute({ ...storm, thunderEstimateKm: 4 });
    expect(near.thunderEstimate.band).toBe('near');
    expect(near.thunderEstimate.errorKm).toBe(1);

    const recheck = kernel.compute({ ...storm, thunderEstimateKm: 15 });
    expect(recheck.thunderEstimate.band).toBe('recheck');
    expect(recheck.thunderEstimate.feedback).toContain('0.343');

    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('evaluateWcThunderEstimate');
      expect(source).toContain("id: 'wcPrecipThunderEstimate'");
      expect(source).toContain('thunderEstimateBand');
      expect(source).toContain('Measure the storm');
    });
  });
  it('limits lightning to cold mixed-phase deep convection', () => {
    const kernel = loadPrecipitationKernel();

    expect(kernel.compute(kernel.presets.summerStorm).lightningEligible).toBe(true);
    expect(kernel.compute(kernel.presets.hailstorm).lightningEligible).toBe(true);
    expect(kernel.compute(kernel.presets.gentleRain).lightningEligible).toBe(false);
    expect(kernel.compute(kernel.presets.mountainSnow).lightningEligible).toBe(false);

    const energeticColumn = {
      moisture: 100,
      midLevelTempC: 6,
      lowLevelHumidity: 92,
      surfaceTempC: 26,
      wind: 24,
      windDirection: 'east',
      updraft: 100,
      cloudDepth: 12,
      stormTime: 52,
      terrain: 'plains',
    };
    const warmCloud = kernel.compute({ ...energeticColumn, tempC: 8 });
    const coldCloud = kernel.compute({ ...energeticColumn, tempC: -8 });

    expect(warmCloud.electrificationIndex).toBeGreaterThanOrEqual(72);
    expect(warmCloud.reachesGround).toBe(true);
    expect(warmCloud.lightningEligible).toBe(false);
    expect(coldCloud.lightningEligible).toBe(true);
  });

  it('bridges the complete hail profile into the existing 3D renderer', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_watercycle.js', 'waterCycle');
    const html = renderTool('waterCycle', {
      waterCycle: {
        wcMode: 'explorer',
        journeyView: '3d',
        journeyActive: true,
        journeyState: 'precipitating',
        precipLab3dActive: true,
        precipHunt: {
          preset: 'hailstorm',
          moisture: 96,
          tempC: -14,
          lowLevelHumidity: 78,
          surfaceTempC: 24,
          wind: 26,
          windDirection: 'east',
          updraft: 96,
          cloudDepth: 12,
          terrain: 'plains',
          lightningStudyStep: 'pressure-wave',
        },
      },
    });

    expect(html).toContain('data-precipitation-source="lab"');
    expect(html).toContain('data-precipitation-type="hail"');
    expect(html).toContain('data-precipitation-updraft="96"');
    expect(html).toContain('data-precipitation-cloud-depth="12"');
    expect(html).toContain('data-precipitation-lower-humidity="78"');
    expect(html).toContain('data-precipitation-cloud-temp="-14"');
    expect(html).toContain('data-precipitation-wind-direction="east"');
    expect(html).toContain('data-precipitation-lightning-eligible="true"');
    expect(html).toContain('data-lightning-study-step="pressure-wave"');
  });

  it('models developing, mature, and weakening stages with cumulative ground effects', () => {
    const kernel = loadPrecipitationKernel();
    const storm = { ...kernel.presets.summerStorm, preset: 'summerStorm' };
    const developing = kernel.lifecycle({ ...storm, stormTime: 12 });
    const mature = kernel.lifecycle({ ...storm, stormTime: 52 });
    const weakening = kernel.lifecycle({ ...storm, stormTime: 90 });

    expect(developing.stageKey).toBe('developing');
    expect(mature.stageKey).toBe('mature');
    expect(weakening.stageKey).toBe('weakening');
    expect(mature.effectiveIntensity).toBeGreaterThan(developing.effectiveIntensity);
    expect(mature.effectiveIntensity).toBeGreaterThan(weakening.effectiveIntensity);
    expect(developing.accumulation.puddling).toBeLessThan(mature.accumulation.puddling);
    expect(mature.accumulation.puddling).toBeLessThan(weakening.accumulation.puddling);
    expect(weakening.accumulation.runoff).toBeGreaterThan(mature.accumulation.runoff);

    const snowEarly = kernel.lifecycle({ ...kernel.presets.mountainSnow, stormTime: 16 });
    const snowLate = kernel.lifecycle({ ...kernel.presets.mountainSnow, stormTime: 90 });
    expect(snowLate.accumulation.snow).toBeGreaterThan(snowEarly.accumulation.snow);
  });

  it('explains the flash-to-thunder delay and keeps sound optional', () => {
    const kernel = loadPrecipitationKernel();
    const storm = kernel.compute({ ...kernel.presets.summerStorm, stormDistanceKm: 3, soundEnabled: false });
    expect(storm.lightningEligible).toBe(true);
    expect(storm.thunder.distanceKm).toBe(3);
    expect(storm.thunder.speedOfSoundKmPerSecond).toBeCloseTo(0.343, 3);
    expect(storm.thunder.delaySeconds).toBeCloseTo(8.7, 1);
    expect(storm.thunder.soundEnabled).toBe(false);
    expect(storm.thunder.caption).toMatch(/thunder in about 8\.7 seconds/i);
    expect(storm.thunder.explanation).toMatch(/pressure wave/i);

    const muted = kernel.compute({ ...kernel.presets.gentleRain, stormDistanceKm: 12, soundEnabled: true });
    expect(muted.lightningEligible).toBe(false);
    expect(muted.thunder.caption).toMatch(/no lightning flash/i);
  });

  it('offers normalized, accessible guided lightning snapshots without changing the weather setup', () => {
    const kernel = loadPrecipitationKernel();
    expect(kernel.defaults.lightningStudyStep).toBe('auto');
    expect(Array.from(kernel.lightningStudySteps, (step) => step.key)).toEqual([
      'auto',
      'charge-separation',
      'stepped-leader',
      'upward-streamer',
      'return-stroke',
      'pressure-wave',
    ]);
    expect(kernel.normalize({ lightningStudyStep: 'pressure-wave' }).lightningStudyStep).toBe('pressure-wave');
    expect(kernel.normalize({ lightningStudyStep: 'not-a-phase' }).lightningStudyStep).toBe('auto');
    expect(kernel.normalize({ lightningStudyStep: 'constructor' }).lightningStudyStep).toBe('auto');
    expect(kernel.normalize({ lightningStudyStep: 'toString' }).lightningStudyStep).toBe('auto');
    expect(kernel.normalize({ lightningStudyStep: '__proto__' }).lightningStudyStep).toBe('auto');

    const chargeOnly = kernel.compute({ ...kernel.presets.hailstorm, stormTime: 26 });
    expect(chargeOnly.stormAnatomy.chargeSeparation.index).toBeGreaterThanOrEqual(8);
    expect(chargeOnly.lightningEligible).toBe(false);
    expect(kernel.studyStepAvailable(chargeOnly, 'auto')).toBe(true);
    expect(kernel.studyStepAvailable(chargeOnly, 'charge-separation')).toBe(true);
    expect(kernel.studyStepAvailable(chargeOnly, 'stepped-leader')).toBe(false);
    expect(kernel.studyStepAvailable(chargeOnly, 'pressure-wave')).toBe(false);

    const completePathway = kernel.compute(kernel.presets.hailstorm);
    ['charge-separation', 'stepped-leader', 'upward-streamer', 'return-stroke', 'pressure-wave']
      .forEach((stepKey) => expect(kernel.studyStepAvailable(completePathway, stepKey)).toBe(true));

    resetStemLab();
    loadTool('stem_lab/stem_tool_watercycle.js', 'waterCycle');
    const guidedHtml = renderTool('waterCycle', {
      waterCycle: {
        wcMode: 'precipHunt',
        precipHunt: {
          ...kernel.presets.hailstorm,
          preset: 'hailstorm',
          lightningStudyStep: 'pressure-wave',
          soundEnabled: true,
        },
      },
    });
    expect(guidedHtml).toContain('data-lightning-study-step="pressure-wave"');
    expect(guidedHtml).toContain('data-lightning-study-mode="guided"');
    expect(guidedHtml).toContain('aria-labelledby="wcLightningStudyTitle"');
    expect(guidedHtml).toContain('data-lightning-study-choice="pressure-wave" aria-label="Step 5: Thunder wave" aria-pressed="true"');
    expect(guidedHtml).toContain('Study snapshots are static and silent');

    const unavailableHtml = renderTool('waterCycle', {
      waterCycle: {
        wcMode: 'precipHunt',
        precipHunt: {
          ...kernel.presets.gentleRain,
          preset: 'gentleRain',
          lightningStudyStep: 'return-stroke',
        },
      },
    });
    expect(unavailableHtml).toContain('data-lightning-study-mode="unavailable"');
    expect(unavailableHtml).toContain('data-lightning-study-choice="return-stroke" aria-label="Step 4: Return stroke" aria-pressed="true"');
    expect(unavailableHtml).toContain('This current cloud is not electrically active enough to produce this step');

    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('canvasEl.dataset.lightningStudyStep = canvasStudyStep;');
      expect(source).toContain('var canvasStudyActive = canvasStudyRequested && model.config.showStormAnatomy;');
      expect(source).toContain('var precipLightningStudyActive3d = precipLightningStudyRequested3d && precipStormAnatomy3d;');
      expect(source).toContain("var stormLightningStudyPhysical3d = precipLightningStudyStep3d === 'charge-separation'");
      expect(source).toContain("var stormPressureWaveStatic3d = stormLightningStudyAvailable3d &&");
      expect(source).toContain("canvasEl.dataset.thunderStatus = 'suppressed-study';");
    });
  });
  it('models storm charge anatomy and deterministic thunder-wave travel', () => {
    const kernel = loadPrecipitationKernel();
    const hailstorm = { ...kernel.presets.hailstorm, preset: 'hailstorm' };
    const developing = kernel.compute({ ...hailstorm, stormTime: 12 });
    const mature = kernel.compute({ ...hailstorm, stormTime: 52 });
    const weakening = kernel.compute({ ...hailstorm, stormTime: 90 });

    expect(mature.stormAnatomy.chargeSeparation).toMatchObject({
      state: 'strong',
      upperPolarity: 'positive',
      upperCarrier: 'small ice crystals',
      lowerPolarity: 'negative',
      lowerCarrier: 'graupel and larger ice',
    });
    expect(mature.stormAnatomy.chargeSeparation.index)
      .toBeGreaterThan(developing.stormAnatomy.chargeSeparation.index);
    expect(mature.stormAnatomy.chargeSeparation.index)
      .toBeGreaterThan(weakening.stormAnatomy.chargeSeparation.index);
    expect(mature.stormAnatomy.lightningPathway).toMatchObject({
      active: true,
      type: 'cloud-to-ground',
      steps: ['stepped-leader', 'upward-streamer', 'return-stroke'],
    });
    const gentle = kernel.compute(kernel.presets.gentleRain);
    expect(gentle.stormAnatomy.chargeSeparation).toMatchObject({ active: false, state: 'inactive', index: 0 });
    expect(gentle.stormAnatomy.lightningPathway.active).toBe(false);
    expect(gentle.stormAnatomy.instruments.find((instrument) => instrument.id === 'delay').value).toBeNull();
    expect(gentle.stormAnatomy.instruments.find((instrument) => instrument.id === 'distance').value).toBeNull();

    const halfway = kernel.thunderWaveAt(mature.thunder, mature.thunder.delaySeconds / 2);
    expect(halfway.radiusKm).toBeCloseTo(mature.thunder.distanceKm / 2, 1);
    expect(halfway.progress).toBeCloseTo(0.5, 1);
    expect(halfway.state).toBe('expanding');
    expect(kernel.thunderWaveAt(mature.thunder, mature.thunder.delaySeconds * 2)).toMatchObject({
      radiusKm: mature.thunder.distanceKm,
      progress: 1,
      state: 'arrived',
    });

    const muted = kernel.compute({ ...hailstorm, soundEnabled: false });
    expect(muted.stormAnatomy.thunderWave.active).toBe(true);
    expect(muted.stormAnatomy.instruments.map((instrument) => instrument.id))
      .toEqual(['charge', 'updraft', 'delay', 'distance']);
    muted.stormAnatomy.instruments.forEach((instrument) => {
      expect(Number.isFinite(instrument.value)).toBe(true);
      expect(instrument.unit.length).toBeGreaterThan(0);
    });
  });

  it('server-renders non-color storm anatomy, pathway, and instrument semantics', () => {
    const kernel = loadPrecipitationKernel();
    resetStemLab();
    loadTool('stem_lab/stem_tool_watercycle.js', 'waterCycle');
    const html = renderTool('waterCycle', {
      waterCycle: {
        wcMode: 'precipHunt',
        precipHunt: { ...kernel.presets.hailstorm, preset: 'hailstorm', soundEnabled: false },
      },
    });

    expect(html).toContain('role="region" aria-labelledby="wcStormAnatomyTitle"');
    expect(html).toContain('<h4 id="wcStormAnatomyTitle">Storm anatomy</h4>');
    expect(html).toContain('data-storm-anatomy="strong"');
    expect(html).toContain('Upper cloud: positive small ice crystals (+)');
    expect(html).toContain('Lower cloud: negative graupel and larger ice (\u2212)');
    expect(html).toContain('Stepped leader -&gt; upward streamer -&gt; return stroke');
    expect(html).toContain('aria-label="Storm instrument readouts"');
    ['charge', 'updraft', 'delay', 'distance'].forEach((instrumentId) => {
      expect(html).toContain(`data-storm-instrument="${instrumentId}"`);
    });
    expect(html).toContain('Sound is muted; follow the captioned delay');
    expect(html).toContain('pressure wave');
  });

  it('keeps one causal flash event active until the modeled thunder wave arrives', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const lifecycleScheduler = source.slice(
        source.indexOf('function scheduleStormLifecycleTick()'),
        source.indexOf('function scheduleThunderAfterFlash()'),
      );
      const thunderScheduler = source.slice(
        source.indexOf('function scheduleThunderAfterFlash()'),
        source.indexOf('function drawArrow('),
      );

      expect(lifecycleScheduler).not.toContain('clearTimeout(thunderTimer)');
      expect(thunderScheduler).toContain("model.config.showStormAnatomy && model.config.lightningStudyStep !== 'auto'");
      expect(thunderScheduler).toContain('thunderEventActive');
      expect(source).toContain('var lightningCadence = Math.max(5.8, model.thunder.delaySeconds + 1.15);');
      expect(source).toContain('var waveState = wcThunderWaveAt(model.thunder, waveElapsed);');
      expect(source).toContain('var stormLightningCadence3d = Math.max(5.8, precipThunderDelay3d + 1.15);');
      expect(source).toContain("canvasEl.dataset.thunderSound === 'enabled'");
    });
  });
  it('keeps enhanced storm cues semantic, pooled, and reduced-motion safe', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const chamberStart = source.indexOf('var precipCanvasRef');
      const chamberEnd = source.indexOf('var precipCanvasLabel');
      const chamberSource = source.slice(chamberStart, chamberEnd);
      const stormSequenceSource = source.slice(
        source.indexOf('var stormLightningCadence3d'),
        source.indexOf('canvasEl.dataset.stormColumnAlignment'),
      );

      expect(chamberSource).toContain("canvasEl.dataset.thermalProfile = model.thermalLayers.transitionKind;");
      expect(chamberSource).toContain('canvasEl.dataset.freezingLevel = model.freezingLevel == null');
      expect(source).toContain("canvasEl.dataset.orographicFlow = model.config.terrain === 'mountains'");
      expect(chamberSource).toContain('var lightningAnimationEligible = model.lightningEligible && !motionReduced && !lightningStudyActive;');
      expect(source).toContain('function wcPrecipPhaseFromModel(model, fallProgress)');
      expect(source).toContain("'WINDWARD LIFT'");
      expect(source).toContain("'LEEWARD DRYING'");
      expect(source).toContain("'wc-precip-path-strip'");
      expect(source).toContain("className: \"wc-viewport-choice\" + (precipJourneyModel ? \" wc-precip-journey-choice\" : \"\")");
      expect(source).toContain("'.wc-precip-journey-choice{left:auto;right:12px");
      expect(source).toContain("var precipLabSource3d = canvasEl.dataset.precipitationSource === 'lab';");
      expect(source).toContain("precipType3d === 'mix'");
      expect(source).toContain("precipType3d === 'freezing-rain'");
      expect(source).toContain("precipType3d === 'hail'");
      expect(source).toContain("precipType3d === 'virga'");
      expect(source).toContain("canvasEl.dataset.hydrometeorMode = precipitationFieldActive3d ? precipType3d : 'hidden';");
      expect(source).toContain("canvasEl.dataset.lightningMode = precipLightningStudyActive3d");
      expect(source).toContain('var stormUpdraft3d = new THREE.Line(');
      expect(source).toContain('var stormUpdraftMarkerCount3d = 18;');
      expect(source).toContain('var stormThermalLayer3d = new THREE.Mesh(');
      expect(source).toContain('var stormThermalLayerSecondary3d = new THREE.Mesh(');
      expect(source).toContain('var freezingGlaze3d = new THREE.Mesh(');
      expect(source).toContain('var stormCenterX3d = 1.2 + cloudGroup3d.position.x - 0.5;');
      expect(source).toContain('rain3d.geometry.setDrawRange(0, snowDriftActive3d');
      expect(source).toContain('rainCurtainGeometry3d.setDrawRange(0, liquidRainActive3d');
      expect(source).toContain("var hailImpactActive3d = precipitationFieldActive3d && precipLabSource3d && precipType3d === 'hail';");
      expect(source).toContain('stormThermalLayer3d.position.y = 2.65 - precipTransitionProgress3d * 3.6;');
      expect(stormSequenceSource).toContain('var stormLightningEventDue3d = stormProfileEligible3d');
      expect(stormSequenceSource).toContain('!precipLightningStudyActive3d');
      expect(source).toContain("canvasEl.dataset.stormColumnAlignment = stormProfileVisible3d ? 'cloud-to-ground-synced' : 'legacy';");
      expect(source).toContain("canvasEl.dataset.altitudePhaseMode = precipitationFieldActive3d ? 'thermal-profile-resolved' : 'hidden';");
      expect(source).toContain('wcPrecipPhaseAtTransitions(');
      expect(source).toContain("precipConfig.windDirection === 'calm' ? 0");
      expect(source).toContain("model.config.windDirection !== 'calm' && model.config.wind >= 2");
      expect(source).toContain('function rainShadowFactorAt(sampleX, width, windSign)');
      expect(source).toContain("? 'Evaporates aloft - does not reach surface'");
      expect(source).toContain('rain3d.geometry.translate(0, 0.49, 0);');
      expect(source).toContain("precipWindDirection3d === 'calm' ? 0");
      expect(source).toContain('var pointFrameScale3d = frameDelta3d * 60;');
      expect(source).toContain('rainImpactMist3d.position.x = hailImpactActive3d ? stormLandingX3d : stormCenterX3d;');
      expect(source).toContain('visualTime3d * (0.06 + precipLifecycleUpdraft3d / 900)) % 1;');
      expect(source).toContain("id: 'wcPrecipStormTime', type: 'range'");
      expect(source).toContain('function scheduleStormLifecycleTick()');
      expect(source).toContain("canvasEl.dataset.stormLifecycleStage = precipLabSource3d");
      expect(source).toContain("canvasEl.dataset.groundAccumulationMode = precipLabSource3d");
    });
  });
});
