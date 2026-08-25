import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Behavioural tests for the Be-The-Water physics kernel.
//
// These RUN the shipped kernel rather than grepping for strings in it. That
// matters more here than anywhere else in this tool: the mode's entire claim is
// that piloting it teaches the real mechanism, so the invariants worth pinning
// are physical facts ("vapour cannot condense below the lifting condensation
// level", "vapour cannot condense without a nucleus"), not spellings. A source
// literal pinned against this code would go red the first time a constant was
// retuned while the physics stayed correct, and would stay green if someone
// deleted the nucleus gate.
//
// The kernel is sliced out of the tool instead of being imported, for the same
// reason the other watercycle suites slice: evaluating the whole 22,000-line
// file takes tens of seconds and blows vitest's hook timeout. The slice is pure
// - no DOM, no THREE, no React - so it runs standalone in milliseconds.

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

function loadKernel(filePath) {
  const source = readFileSync(filePath, 'utf8');
  const start = source.indexOf('  var WC_PILOT_UNIT_M =');
  const exportAt = source.indexOf('  window.WaterCyclePilotKernel = {');
  expect(start, `kernel start marker missing in ${filePath}`).toBeGreaterThan(-1);
  expect(exportAt, `kernel export missing in ${filePath}`).toBeGreaterThan(start);
  const end = source.indexOf('\n  };', exportAt);
  expect(end, `kernel export never closes in ${filePath}`).toBeGreaterThan(exportAt);
  const slice = source.slice(start, end + '\n  };'.length);
  const host = {};
  // eslint-disable-next-line no-new-func
  new Function('window', slice)(host);
  expect(host.WaterCyclePilotKernel, `kernel did not export from ${filePath}`).toBeTruthy();
  return host.WaterCyclePilotKernel;
}

// Drives the kernel with a simple autopilot: climb while airborne and
// unsaturated, meet nuclei once above the cloud base, and coalesce steadily.
// Returns the ordered list of forms the parcel actually passed through.
function flyCycle(K, scenarioId, surface, opts) {
  const options = opts || {};
  const env = K.environment(scenarioId);
  let state = K.initialState(scenarioId);
  const forms = [state.form];
  for (let i = 0; i < 60000; i += 1) {
    const input = { dt: 0.016, sunlit: true, thrust: 0, surface };
    if (state.form === 'vapor') {
      input.thrust = 1;
      if (state.altitudeM >= env.lclM && !options.noNuclei) input.nucleusHit = true;
    }
    if (state.form === 'droplet' || state.form === 'cloud' || state.form === 'ice') {
      input.thrust = 0.35;
      if (i % 18 === 0) input.dropletHit = true;
    }
    const next = K.step(state, input);
    if (next.form !== state.form) forms.push(next.form);
    state = next;
    if (state.loops >= 1 && !K.isAirborne(state.form)) break;
  }
  return { forms, state, env };
}

describe.each(WATER_CYCLE_PATHS)('Be the Water kernel (%s)', (filePath) => {
  const K = loadKernel(filePath);

  it('places the cloud base, the level of free convection, and the freezing level in physical order', () => {
    Object.keys(K.scenarios).forEach((id) => {
      const env = K.environment(id);
      // Espy: the cloud base is 125 m per degree of dew-point depression.
      expect(env.lclM).toBeCloseTo(
        Math.min(Math.max(125 * (env.parcelSurfaceC - env.dewPointC), 60), K.CEILING_M - 400), 6);
      // Free convection is never BELOW the cloud base: the parcel only starts
      // winning temperature back once it is saturated and releasing latent heat.
      expect(env.lfcM).toBeGreaterThanOrEqual(env.lclM);
      expect(env.freezingM).toBeGreaterThanOrEqual(0);
      expect(env.freezingM).toBeLessThanOrEqual(K.CEILING_M);
    });
  });

  it('models the three-act buoyancy profile the mode is built to teach', () => {
    const env = K.environment('tropicalOcean');
    // Act 1: warmer than its surroundings at the surface, so it rises.
    expect(K.buoyancyC(env, 0)).toBeGreaterThan(0);
    // Act 2: negatively buoyant partway up, because an unsaturated parcel cools
    // faster than the environment. This is convective inhibition, and without it
    // the climb has no difficulty and the mode teaches nothing.
    expect(K.buoyancyC(env, env.lclM)).toBeLessThan(0);
    // Act 3: positively buoyant again above the level of free convection.
    expect(env.lfcReachable).toBe(true);
    expect(K.buoyancyC(env, env.lfcM + 200)).toBeGreaterThan(0);
    // And the recovery is monotonic above the LCL, so the learner feels the
    // controls progressively stop fighting them rather than flipping at a point.
    const mid = K.buoyancyC(env, env.lclM + 100);
    const high = K.buoyancyC(env, env.lclM + 600);
    expect(high).toBeGreaterThan(mid);
  });

  it('refuses to condense below the lifting condensation level', () => {
    const env = K.environment('temperateCoast');
    const belowBase = Object.assign(K.initialState('temperateCoast'), {
      form: 'vapor', altitudeM: env.lclM - 50, nucleus: true,
    });
    expect(K.nextForm(belowBase, env)).toBe('');
    const atBase = Object.assign({}, belowBase, { altitudeM: env.lclM + 1 });
    expect(K.nextForm(atBase, env)).toBe('droplet');
  });

  it('refuses to condense without a condensation nucleus, however high the parcel climbs', () => {
    const env = K.environment('temperateCoast');
    const cleanAir = Object.assign(K.initialState('temperateCoast'), {
      form: 'vapor', altitudeM: env.lclM + 800, nucleus: false,
    });
    expect(K.nextForm(cleanAir, env)).toBe('');
    // Meeting a nucleus BELOW the cloud base must not arm condensation either:
    // otherwise the mode would teach that a speck of dust is sufficient on its
    // own, when both saturation and a surface are required.
    const armedTooLow = K.step(
      Object.assign(K.initialState('temperateCoast'), { form: 'vapor', altitudeM: env.lclM - 200 }),
      { dt: 0.016, nucleusHit: true },
    );
    expect(armedTooLow.nucleus).toBe(false);
    expect(armedTooLow.form).toBe('vapor');
  });

  it('becomes a cloud before it becomes rain, and stays a cloud long enough to inhabit', () => {
    const { forms } = flyCycle(K, 'tropicalOcean', 'permeable');
    expect(forms).toContain('cloud');
    expect(forms).toContain('rain');
    expect(forms.indexOf('cloud')).toBeLessThan(forms.indexOf('rain'));
    // Rain forms IN clouds. A droplet must never fall straight to rain without
    // the cloud step, which is the ordering the thresholds encode.
    expect(K.MASS_TO_FALL).toBeGreaterThan(0.12 + K.DROPLETS_FOR_CLOUD * 0.11);
  });

  it('completes a full cycle from sea surface back to the ground', () => {
    const { forms, state } = flyCycle(K, 'tropicalOcean', 'permeable');
    expect(forms[0]).toBe('liquid');
    expect(forms).toContain('vapor');
    expect(forms).toContain('droplet');
    expect(state.loops).toBe(1);
    expect(K.isAirborne(state.form)).toBe(false);
  });

  it('sends the parcel down the pathway matching the surface it lands on', () => {
    expect(K.landingForm('water')).toBe('liquid');
    expect(K.landingForm('permeable')).toBe('soil');
    expect(K.landingForm('plant')).toBe('plant');
    expect(K.landingForm('hard')).toBe('runoff');
    ['water', 'permeable', 'plant', 'hard'].forEach((surface) => {
      const { state } = flyCycle(K, 'tropicalOcean', surface);
      expect(state.form).toBe(K.landingForm(surface));
    });
  });

  it('continues every landfall through a reachable watershed pathway', () => {
    expect(K.pathwayNextForm('runoff')).toBe('liquid');
    expect(K.pathwayNextForm('soil')).toBe('groundwater');
    expect(K.pathwayNextForm('groundwater')).toBe('liquid');
    expect(K.pathwayNextForm('plant')).toBe('transpiring');

    const assistedRunoff = K.pathwayRate('runoff', { pathwayDrive: 1 });
    const observedRunoff = K.pathwayRate('runoff', {});
    expect(observedRunoff).toBeGreaterThan(0);
    expect(assistedRunoff).toBeGreaterThan(observedRunoff);
    expect(K.pathwayRate('soil', { thrust: -1 })).toBeGreaterThan(K.pathwayRate('soil', {}));
    expect(K.pathwayRate('plant', { thrust: 1 })).toBeGreaterThan(K.pathwayRate('plant', {}));

    let soil = Object.assign(K.initialState('tropicalOcean'), { form: 'soil' });
    const soilForms = ['soil'];
    for (let i = 0; i < 1400 && soil.form !== 'liquid'; i += 1) {
      const next = K.step(soil, {
        dt: 0.05,
        thrust: soil.form === 'soil' ? -1 : 0,
        pathwayDrive: soil.form === 'groundwater' ? 1 : 0,
      });
      if (next.form !== soil.form) soilForms.push(next.form);
      soil = next;
    }
    expect(soilForms).toEqual(['soil', 'groundwater', 'liquid']);

    let plant = Object.assign(K.initialState('tropicalOcean'), { form: 'plant' });
    const plantForms = ['plant'];
    for (let i = 0; i < 700 && plant.form !== 'vapor'; i += 1) {
      const next = K.step(plant, { dt: 0.05, thrust: plant.form === 'plant' ? 1 : 0 });
      if (next.form !== plant.form) plantForms.push(next.form);
      plant = next;
    }
    expect(plantForms).toEqual(['plant', 'transpiring', 'vapor']);
    expect(plant.altitudeM).toBeGreaterThan(0);
  });

  it('freezes rather than condenses when the freezing level sits below the cloud base', () => {
    const env = K.environment('mountainWinter');
    // In this scenario the parcel is already below 0 C by the time it saturates,
    // so water vapour deposits straight to ice - it never passes through liquid.
    expect(env.freezingM).toBeLessThan(env.lclM);
    const { forms } = flyCycle(K, 'mountainWinter', 'hard');
    expect(forms).toContain('ice');
    expect(forms.indexOf('ice')).toBeLessThan(forms.indexOf('snow'));
    expect(forms).not.toContain('droplet');
  });

  it('melts falling snow into rain below the freezing level', () => {
    const env = K.environment('mountainWinter');
    const snowAloft = Object.assign(K.initialState('mountainWinter'), {
      form: 'snow', altitudeM: env.freezingM + 100,
    });
    expect(K.nextForm(snowAloft, env)).toBe('');
    const snowLow = Object.assign({}, snowAloft, { altitudeM: env.freezingM - 1 });
    expect(K.nextForm(snowLow, env)).toBe('rain');
  });

  it('maps latent-energy direction only to real phase changes', () => {
    expect(K.energyTransfer('liquid', 'vapor')).toBe('absorbed');
    expect(K.energyTransfer('transpiring', 'vapor')).toBe('absorbed');
    expect(K.energyTransfer('droplet', 'vapor')).toBe('absorbed');
    expect(K.energyTransfer('snow', 'rain')).toBe('absorbed');
    expect(K.energyTransfer('snow', 'soil')).toBe('absorbed');

    expect(K.energyTransfer('vapor', 'droplet')).toBe('released');
    expect(K.energyTransfer('vapor', 'ice')).toBe('released');
    expect(K.energyTransfer('droplet', 'ice')).toBe('released');
    expect(K.energyTransfer('rain', 'snow')).toBe('released');

    expect(K.energyTransfer('droplet', 'cloud')).toBe('none');
    expect(K.energyTransfer('cloud', 'rain')).toBe('none');
    expect(K.energyTransfer('plant', 'transpiring')).toBe('none');
    expect(K.energyTransfer('runoff', 'liquid')).toBe('none');
  });

  it('makes snow fall far more slowly than rain', () => {
    const env = K.environment('mountainWinter');
    const rainAccel = K.verticalAccel({ form: 'rain', altitudeM: 500 }, env, 0);
    const snowAccel = K.verticalAccel({ form: 'snow', altitudeM: 500 }, env, 0);
    expect(rainAccel).toBeLessThan(0);
    expect(snowAccel).toBeLessThan(0);
    expect(Math.abs(snowAccel)).toBeLessThan(Math.abs(rainAccel));
  });

  it('drives evaporation with sunlight, dryness, warmth, and wind together', () => {
    const humid = K.environment('tropicalOcean');
    const arid = K.environment('desertBasin');
    // Sunlit water always charges faster than shaded water.
    expect(K.evaporationRate(humid, true)).toBeGreaterThan(K.evaporationRate(humid, false));
    // Dry desert air pulls vapour off the surface faster than saturated tropical
    // air, even though both are hot - dryness, not heat alone, is the control.
    expect(K.evaporationRate(arid, true)).toBeGreaterThan(K.evaporationRate(humid, true));
    // And nothing evaporates instantly: the charge must take real time.
    expect(K.evaporationRate(humid, true)).toBeLessThan(1);
  });

  it('is a pure function of its inputs', () => {
    const before = K.initialState('tropicalOcean');
    const frozenCopy = JSON.parse(JSON.stringify(before));
    const input = { dt: 0.02, sunlit: true, thrust: 1 };
    const a = K.step(before, input);
    const b = K.step(before, input);
    // Same input, same output - no clock read, no Math.random, no shared state.
    expect(JSON.parse(JSON.stringify(a))).toEqual(JSON.parse(JSON.stringify(b)));
    // And the caller's state object is never mutated in place, which is what
    // lets the render loop hold a snapshot while the sim advances.
    expect(JSON.parse(JSON.stringify(before))).toEqual(frozenCopy);
  });

  it('credits all six canonical water-cycle stages across repeated flights', () => {
    const seen = {};
    ['water', 'permeable', 'plant', 'hard'].forEach((surface) => {
      const { state } = flyCycle(K, 'tropicalOcean', surface);
      Object.keys(state.stagesSeen).forEach((stage) => { seen[stage] = true; });
    });
    // Transpiration is only reachable by continuing on from the plant landing,
    // so it is stepped explicitly here rather than being expected from a flight.
    const transpiring = K.step(
      Object.assign(K.initialState('tropicalOcean'), { form: 'transpiring' }),
      { dt: 0.016 },
    );
    Object.keys(transpiring.stagesSeen).forEach((stage) => { seen[stage] = true; });
    K.stageOrder.forEach((stage) => {
      expect(seen[stage], `stage ${stage} unreachable`).toBe(true);
    });
    expect(K.stageOrder).toHaveLength(6);
  });

  it('keeps the parcel inside the modelled column', () => {
    let state = Object.assign(K.initialState('tropicalOcean'), { form: 'vapor' });
    for (let i = 0; i < 4000; i += 1) state = K.step(state, { dt: 0.05, thrust: 1 });
    expect(state.altitudeM).toBeLessThanOrEqual(K.CEILING_M);
    let sinking = Object.assign(K.initialState('tropicalOcean'), { form: 'vapor', altitudeM: 100 });
    for (let i = 0; i < 4000; i += 1) sinking = K.step(sinking, { dt: 0.05, thrust: -1, surface: 'water' });
    expect(sinking.altitudeM).toBeGreaterThanOrEqual(0);
  });
});
