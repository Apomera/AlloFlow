import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const paths = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

function loadKernel(path) {
  const source = readFileSync(path, 'utf8'), host = {};
  const start = source.indexOf('  var WC_PILOT_UNIT_M =');
  const exportAt = source.indexOf('  window.WaterCyclePilotKernel = {');
  const end = source.indexOf('\n  };', exportAt);
  new Function('window', source.slice(start, end + 5))(host);
  return host.WaterCyclePilotKernel;
}

describe.each(paths)('Be the Water snowpack (%s)', (path) => {
  const K = loadKernel(path), env = K.environment('mountainWinter');
  const stored = (extra = {}) => ({ ...K.initialState('mountainWinter'), form: 'snowpack',
    snowLandingSurface: 'permeable', snowTempC: -6, snowHumidity: 70, ...extra });
  const rates = (extra = {}, environment = env) => K.snowRates(environment,
    K.snowConditions(stored(), extra, environment));

  it('stores a snowflake on each actual land type and collects open-water snow as liquid', () => {
    for (const surface of ['permeable', 'plant', 'hard']) {
      const falling = { ...K.initialState('mountainWinter'), form: 'snow', altitudeM: 0.1, vy: -4 };
      const next = K.step(falling, { dt: 0.05, surface });
      expect(next.form).toBe('snowpack');
      expect(next.snowLandingSurface).toBe(surface);
      expect(next.altitudeM).toBe(0);
      expect(next.loops).toBe(0);
      expect(next.pathwayProgress).toBe(0);
      expect(next.meltProgress).toBe(0);
      expect(next.sublimationProgress).toBe(0);
      expect(K.forms[next.form].stage).toBe('collection');
      expect(K.isAirborne(next.form)).toBe(false);
    }
    const water = K.step({ ...K.initialState('mountainWinter'), form: 'snow', altitudeM: 0.1, vy: -4 },
      { dt: 0.05, surface: 'water' });
    expect(water.form).toBe('liquid');
    expect(water.loops).toBe(1);
  });

  it('resolves bounded near-snow air inputs with saved state and scenario fallbacks', () => {
    const defaults = K.snowConditions(K.initialState('mountainWinter'), {}, env);
    expect(defaults.tempC).toBe(env.surfaceTempC);
    expect(defaults.humidity).toBe(env.surfaceRH);
    expect(defaults.available).toBe(false);
    expect(K.snowRates(env, defaults)).toEqual({ melt: 0, sublimation: 0 });
    const bounded = K.snowConditions(stored(), { snowTempC: 999, snowHumidity: -40 }, env);
    expect(bounded.tempC).toBe(15);
    expect(bounded.humidity).toBe(0);
    const fallback = K.snowConditions(stored(), { snowTempC: NaN, snowHumidity: Infinity }, env);
    expect(fallback.tempC).toBe(-6);
    expect(fallback.humidity).toBe(70);
    expect(K.snowConditions(stored(), { snowTempC: -999, snowHumidity: 999 }, env))
      .toMatchObject({ tempC: -20, humidity: 100 });
  });

  it('makes warmth drive modeled melt while dryness, sunlight, and wind drive sublimation', () => {
    expect(rates({ snowTempC: -5 }).melt).toBe(0);
    expect(rates({ snowTempC: 0 }).melt).toBe(0);
    expect(rates({ snowTempC: 8 }).melt).toBeGreaterThan(rates({ snowTempC: 3 }).melt);
    expect(rates({ snowHumidity: 15 }).sublimation).toBeGreaterThan(rates({ snowHumidity: 80 }).sublimation);
    expect(rates({ snowHumidity: 100 }).sublimation).toBe(0);
    expect(rates({}, { ...env, windMs: 12 }).sublimation).toBeGreaterThan(rates({}, { ...env, windMs: 0 }).sublimation);
    expect(rates({}, { ...env, solar: 1.4 }).sublimation).toBeGreaterThan(rates({}, { ...env, solar: 0 }).sublimation);
    // Dry snow may sublime with above-freezing air too; both routes can compete.
    expect(rates({ snowTempC: 6, snowHumidity: 15 }).sublimation).toBeGreaterThan(0);
  });

  it('integrates deterministic independent exposure without mutating the parcel or controls', () => {
    const state = stored({ meltProgress: 0.2, sublimationProgress: 0.4 });
    Object.freeze(state.formsSeen); Object.freeze(state.stagesSeen); Object.freeze(state);
    const input = Object.freeze({ dt: 0.1, snowTempC: 5, snowHumidity: 30 });
    const before = JSON.stringify(state), c = K.snowConditions(state, input, env), rate = K.snowRates(env, c);
    const first = K.step(state, input), second = K.step(state, input);
    expect(first).toEqual(second);
    expect(first.meltProgress).toBeCloseTo(0.2 + rate.melt * 0.1, 10);
    expect(first.sublimationProgress).toBeCloseTo(0.4 + rate.sublimation * 0.1, 10);
    expect(JSON.stringify(state)).toBe(before);
    const paused = K.step(state, { ...input, dt: 0 });
    expect(paused.meltProgress).toBe(0.2);
    expect(paused.sublimationProgress).toBe(0.4);
    expect(paused.form).toBe('snowpack');
    expect(paused.elapsed).toBe(state.elapsed);
    // Two half steps of constant conditions have the same exposure.
    const split = K.step(K.step(state, { ...input, dt: 0.05 }), { ...input, dt: 0.05 });
    expect(split.meltProgress).toBeCloseTo(first.meltProgress, 10);
    expect(split.sublimationProgress).toBeCloseTo(first.sublimationProgress, 10);
  });

  it('can remain stored indefinitely without a modeled phase-change driver', () => {
    let state = stored({ snowTempC: -10, snowHumidity: 100 });
    for (let i = 0; i < 10000; i++) state = K.step(state, { dt: 0.12, thrust: 1, pathwayDrive: 1 });
    expect(state.form).toBe('snowpack');
    expect(state.meltProgress).toBe(0);
    expect(state.sublimationProgress).toBe(0);
    expect(state.loops).toBe(0);
    expect(state.altitudeM).toBe(0);
  });

  it.each([['hard', 'runoff'], ['permeable', 'soil'], ['plant', 'plant']])(
    'releases melt onto its original %s surface without granting a cycle', (surface, form) => {
      const state = stored({ snowLandingSurface: surface, snowTempC: 12, snowHumidity: 100, meltProgress: 0.999 });
      const next = K.step(state, { dt: 0.12, surface: 'water', pathwayDrive: 1 });
      expect(next.form).toBe(form);
      expect(next.note).toBe('snowmelt');
      expect(next.meltProgress).toBe(1);
      expect(next.pathwayProgress).toBe(0);
      expect(next.loops).toBe(0);
      expect(K.energyTransfer('snowpack', form)).toBe('absorbed');
      expect(K.step(next, { dt: 0.05 }).meltProgress).toBe(0);
      const mission = K.startMission('runoff', state);
      expect(K.advanceMission(mission, state, { ...next, reason: 'form' }).status).toBe('active');
    });

  it('sublimates directly to vapour at the ground with cleared condensate and no cycle credit', () => {
    const state = stored({ sublimationProgress: 0.999, snowHumidity: 0, droplets: 12, mass: 3, nucleus: true });
    const next = K.step(state, { dt: 0.12 });
    expect(next.form).toBe('vapor');
    expect(next.note).toBe('sublimation');
    expect(next.sublimationProgress).toBe(1);
    expect(next.altitudeM).toBe(0);
    expect(next.vy).toBe(0);
    expect(next.nucleus).toBe(false);
    expect(next.droplets).toBe(0);
    expect(next.mass).toBe(0.12);
    expect(next.loops).toBe(0);
    expect(K.energyTransfer('snowpack', 'vapor')).toBe('absorbed');
    expect(K.step(next, { dt: 0.05 }).sublimationProgress).toBe(0);
  });

  it('chooses the first threshold when warm dry conditions advance both routes in one step', () => {
    const state = stored({ snowTempC: 10, snowHumidity: 0 });
    const rate = rates({ snowTempC: 10, snowHumidity: 0 });
    const meltWins = K.step({ ...state, meltProgress: 1 - rate.melt * 0.02,
      sublimationProgress: 1 - rate.sublimation * 0.08 }, { dt: 0.1 });
    expect(meltWins.form).toBe('soil');
    const sublimationWins = K.step({ ...state, meltProgress: 1 - rate.melt * 0.08,
      sublimationProgress: 1 - rate.sublimation * 0.02 }, { dt: 0.1 });
    expect(sublimationWins.form).toBe('vapor');
    for (const next of [meltWins, sublimationWins]) {
      expect(next.meltProgress).toBeGreaterThanOrEqual(0); expect(next.meltProgress).toBeLessThanOrEqual(1);
      expect(next.sublimationProgress).toBeGreaterThanOrEqual(0); expect(next.sublimationProgress).toBeLessThanOrEqual(1);
      expect(next.loops).toBe(0);
    }
  });

  it('starts six distinct practice processes without manufacturing observation credit', () => {
    expect(Object.keys(K.practices)).toEqual(['surface', 'cloud', 'rain', 'snow', 'soil', 'plant']);
    expect(Object.isFrozen(K.practices)).toBe(true);
    for (const [id, definition] of Object.entries(K.practices)) {
      expect(Object.isFrozen(definition)).toBe(true);
      const state = K.practiceState(id, 'temperateCoast');
      expect(state.form).toBe(definition.form);
      expect(state.practiceOrigin).toBe(id);
      expect(state.practiceUnobserved).toBe(true);
      expect(state.stagesSeen).toEqual({});
      expect(state.formsSeen).toEqual({ [definition.form]: true });
      expect(state.nucleus).toBe(false);
      expect(state.loops).toBe(0);
    }
    const cloud = K.practiceState('cloud', 'temperateCoast'), cloudEnv = K.environment(cloud.scenario);
    expect(K.parcelRH(cloudEnv, cloud.altitudeM)).toBe(100);
    expect(K.step(cloud, { dt: 0.05 }).stagesSeen).toEqual({});
    const condensed = K.step(cloud, { dt: 0.05, nucleusHit: true });
    expect(condensed.form).toBe('droplet');
    expect(condensed.practiceUnobserved).toBe(false);
    expect(condensed.stagesSeen).toEqual({ condensation: true });
    const snow = K.practiceState('snow', 'tropicalOcean');
    expect(snow.scenario).toBe('frozenHighlands');
    expect(snow.altitudeM).toBe(80);
    let falling = snow;
    for (let i = 0; i < 1000 && falling.form === 'snow'; i++) falling = K.step(falling, { dt: 0.05, surface: 'permeable' });
    expect(falling.form).toBe('snowpack');
    expect(falling.stagesSeen).toEqual({ collection: true });
    expect(K.practiceState('unknown', 'temperateCoast').form).toBe('liquid');
  });

  it.each(['snowmelt', 'sublimation'])('records %s only from new physical events in order', (id) => {
    let state = K.practiceState('snow'), mission = K.startMission(id, state);
    const tick = (input) => {
      const previous = state;
      state = { ...K.step(state, { dt: 0.1, surface: 'permeable', ...input }), reason: 'tick', surface: 'permeable' };
      if (state.form !== previous.form) state.reason = 'form';
      mission = K.advanceMission(mission, previous, state);
    };
    for (let i = 0; i < 1000 && state.form === 'snow'; i++) tick({ snowTempC: -8, snowHumidity: 70 });
    expect(state.form).toBe('snowpack');
    expect(mission.events.map((event) => event.from + '>' + event.to)).toEqual(['snow>snowpack']);
    expect(mission.status).toBe('active');
    expect(K.missionHint(mission, state, 'permeable').code).toBe(id);
    const conditions = id === 'snowmelt' ? { snowTempC: 12, snowHumidity: 100 } : { snowTempC: -8, snowHumidity: 0 };
    for (let i = 0; i < 3000 && state.form === 'snowpack'; i++) tick(conditions);
    expect(state.form).toBe(id === 'snowmelt' ? 'soil' : 'vapor');
    expect(mission.events).toHaveLength(2);
    expect(mission.events[1].snowTempC).toBe(conditions.snowTempC);
    expect(mission.events[1].snowHumidity).toBe(conditions.snowHumidity);
    expect(mission.events[1].energyDirection).toBe('absorbed');
    expect(state.loops).toBe(0);
    if (id === 'snowmelt') {
      expect(mission.status).toBe('active');
      for (let i = 0; i < 1000 && state.form === 'soil'; i++) tick({ thrust: -1 });
      expect(state.form).toBe('groundwater');
    }
    expect(mission.status).toBe('complete');
    expect(state.loops).toBe(0);
    const ignored = K.advanceMission(K.startMission(id, state), state, { ...state, reason: 'restore', form: 'snowpack' });
    expect(ignored.status).toBe('interrupted');
    expect(ignored.events).toEqual([]);
  });

  it.each([['runoff', 'hard', 'runoff'], ['infiltration', 'permeable', 'soil'], ['plant', 'plant', 'plant']])(
    'recognizes liquid released from stored snow for the existing %s investigation', (id, surface, form) => {
      const state = stored({ snowTempC: 12, snowHumidity: 100, snowLandingSurface: surface, meltProgress: 0.999 });
      const mission = K.startMission(id, state);
      expect(K.missionHint(mission, state, surface).code).toBe('snowmelt');
      const next = { ...K.step(state, { dt: 0.12 }), reason: 'form', surface };
      expect(next.form).toBe(form);
      const observed = K.advanceMission(mission, state, next);
      expect(observed.status).toBe('active');
      expect(observed.events.map((event) => event.from + '>' + event.to)).toEqual([`snowpack>${form}`]);
      expect(K.advanceMission(mission, state, { ...next, reason: 'restore' }).events).toEqual([]);
      expect(next.loops).toBe(0);
    });
});
