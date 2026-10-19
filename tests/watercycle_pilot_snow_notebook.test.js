import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

function loadPilot() {
  const source = readFileSync('stem_lab/stem_tool_watercycle.js', 'utf8');
  const start = source.indexOf('  var WC_PILOT_UNIT_M =');
  const exportAt = source.indexOf('  window.WaterCyclePilotKernel = {');
  const end = source.indexOf('\n  };', exportAt);
  expect(start).toBeGreaterThan(-1);
  expect(exportAt).toBeGreaterThan(start);
  expect(end).toBeGreaterThan(exportAt);
  const host = {};
  // Execute the shipped pure model and notebook, without a renderer or clock.
  // eslint-disable-next-line no-new-func
  new Function('window', source.slice(start, end + '\n  };'.length))(host);
  return { K: host.WaterCyclePilotKernel, N: host.WaterCyclePilotNotebook };
}

function snowJourney() {
  return {
    pilot: {
      scenario: 'mountainWinter', practiceOrigin: 'snow', cameraMode: 'water',
      snapshot: {
        scenario: 'mountainWinter', form: 'snowpack', altitudeM: 0,
        energy: 0, meltProgress: 0.43, sublimationProgress: 0.17,
        snowLandingSurface: 'permeable', snowTempC: 4, snowHumidity: 38,
        practiceOrigin: 'snow', surface: 'permeable', elapsed: 21,
        formsSeen: { snow: true, snowpack: true }, stagesSeen: { collection: true },
      },
      notebookChanges: [{
        id: 'snow-landed', sequence: 1, scenario: 'mountainWinter',
        from: 'snow', to: 'snowpack', surface: 'permeable',
        snowLandingSurface: 'permeable', meltProgress: 0, sublimationProgress: 0,
        snowTempC: -3, snowHumidity: 45, practiceOrigin: 'snow', elapsed: 8,
      }],
    },
  };
}

describe('Be the Water snow and practice notebook recovery', () => {
  const { K, N } = loadPilot();

  it('keeps ordinary full journeys distinct from an explicitly selected surface practice', () => {
    const ordinary = K.initialState('tropicalOcean');
    const record = N.capture({ pilot: { scenario: ordinary.scenario, snapshot: ordinary } }, 12000, 'manual');
    expect(ordinary.practiceOrigin).toBe('');
    expect(record.checkpoint.practiceOrigin).toBe('');
    expect(record.checkpoint.practiceUnobserved).toBe(false);
    expect(K.practiceState('surface', 'tropicalOcean').practiceOrigin).toBe('surface');
  });

  it('restores a partially processed snowpack with its chosen conditions and landing route', () => {
    const record = N.capture(snowJourney(), 12345, 'manual');
    expect(record.checkpoint).toMatchObject({
      form: 'snowpack', meltProgress: 0.43, sublimationProgress: 0.17,
      snowLandingSurface: 'permeable', snowTempC: 4, snowHumidity: 38,
      practiceOrigin: 'snow',
    });
    const restored = N.restore({ pilot: {
      practiceOrigin: 'rain', paused: false, snowTempC: -16, snowHumidity: 99,
    } }, record);
    expect(restored.pilot.paused).toBe(true);
    expect(restored.pilot.practiceOrigin).toBe('snow');
    expect(restored.pilot.snowTempC).toBe(4);
    expect(restored.pilot.snowHumidity).toBe(38);
    expect(restored.pilot.resumeCheckpoint).toEqual(record.checkpoint);
    expect(restored.pilot.snapshot).toEqual(record.checkpoint);
    const controls = { dt: 0.12, snowTempC: 4, snowHumidity: 38 };
    const original = K.step(Object.assign(K.initialState('mountainWinter'), record.checkpoint), controls);
    const resumed = K.step(Object.assign(K.initialState('mountainWinter'), restored.pilot.resumeCheckpoint), controls);
    expect(resumed).toEqual(original);
    expect(record.checkpoint.meltProgress).toBe(0.43);
  });

  it('keeps zero-degree and zero-humidity overrides distinct from unspecified legacy conditions', () => {
    const legacy = N.normalizeSnapshot({ scenario: 'mountainWinter', form: 'snow' });
    expect(legacy).toMatchObject({
      meltProgress: 0, sublimationProgress: 0, snowTempC: null,
      snowHumidity: null, snowLandingSurface: '', practiceOrigin: '', practiceUnobserved: false,
    });
    const zero = N.normalizeSnapshot({ snowTempC: 0, snowHumidity: 0 });
    expect(zero.snowTempC).toBe(0);
    expect(zero.snowHumidity).toBe(0);
    const malformed = N.normalizeSnapshot({ snowTempC: Infinity, snowHumidity: 'not a number' });
    expect(malformed.snowTempC).toBeNull();
    expect(malformed.snowHumidity).toBeNull();
  });

  it('bounds independent exposure indices without treating them as fractions of removed water', () => {
    const snapshot = N.normalizeSnapshot({
      meltProgress: 0.8, sublimationProgress: 0.6,
      snowTempC: -999, snowHumidity: 400, snowLandingSurface: 'invented', practiceOrigin: 'teleport',
    });
    expect(snapshot).toMatchObject({
      meltProgress: 0.8, sublimationProgress: 0.6, snowTempC: -20,
      snowHumidity: 100, snowLandingSurface: '', practiceOrigin: '',
    });
    expect(N.normalizeSnapshot({ meltProgress: 8, sublimationProgress: -2, snowTempC: 100 })).toMatchObject({
      meltProgress: 1, sublimationProgress: 0, snowTempC: 15,
    });
  });

  it('keeps transition conditions detached from subsequent live snow lab changes', () => {
    const journey = snowJourney();
    const transition = {
      id: 'snow-melted', sequence: 2, scenario: 'mountainWinter',
      from: 'snowpack', to: 'soil', elapsed: 40, surface: 'permeable',
      meltProgress: 1, sublimationProgress: 0.17, snowLandingSurface: 'permeable',
      snowTempC: 6, snowHumidity: 52, practiceOrigin: 'snow',
    };
    journey.pilot.notebookChanges.push(transition);
    journey.pilot.lastChange = transition;
    const record = N.capture(journey, 23456, 'transition');
    transition.snowTempC = -20;
    transition.snowHumidity = 0;
    journey.pilot.snapshot.snowTempC = -15;
    const selected = N.selectChange({ notebookChanges: record.evidence.changes }, 'snow-melted');
    expect(selected).toMatchObject({
      snowTempC: 6, snowHumidity: 52, meltProgress: 1,
      sublimationProgress: 0.17, snowLandingSurface: 'permeable', practiceOrigin: 'snow',
    });
    selected.snowTempC = 12;
    expect(record.evidence.lastChange.snowTempC).toBe(6);
    expect(record.evidence.changes[1].snowTempC).toBe(6);
    expect(record.checkpoint.snowTempC).toBe(4);
  });

  it('round trips snow state and evidence through bounded device storage', () => {
    const values = new Map();
    const storage = {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: key => values.delete(key),
    };
    const record = N.capture(snowJourney(), 34567, 'pagehide');
    expect(N.write(record, storage)).toEqual(record);
    expect(N.read(storage)).toEqual(record);
    const restored = N.restore({}, N.read(storage));
    expect(restored.pilot.snapshot.snowLandingSurface).toBe('permeable');
    expect(restored.pilot.notebookChanges[0].snowTempC).toBe(-3);
    expect(restored.pilot.notebookChanges[0].practiceOrigin).toBe('snow');
  });

  it('retains all mission results and the measured conditions behind snow mission evidence', () => {
    const results = {};
    Object.entries(K.missions).forEach(([id, definition]) => {
      let mission = K.startMission(id, { scenario: 'frozenHighlands', elapsed: 0 });
      definition.steps.forEach((alternatives, index) => {
        const [from, to] = alternatives[0].split('>');
        const previous = { scenario: 'frozenHighlands', form: from };
        const next = {
          scenario: 'frozenHighlands', form: to, reason: 'form', elapsed: index + 1,
          snowTempC: id === 'snowmelt' ? 6 : -8, snowHumidity: 22,
          snowLandingSurface: 'permeable', meltProgress: from === 'snowpack' && to !== 'vapor' ? 1 : 0,
          sublimationProgress: from === 'snowpack' && to === 'vapor' ? 1 : 0,
          practiceOrigin: 'snow',
        };
        mission = K.advanceMission(mission, previous, next);
      });
      expect(mission.status).toBe('complete');
      results[id] = mission;
    });
    const journey = snowJourney();
    journey.pilot.scenario = 'frozenHighlands';
    journey.pilot.snapshot.scenario = 'frozenHighlands';
    journey.pilot.missionResults = results;
    const record = N.capture(journey, 40000, 'transition');
    expect(Object.keys(record.evidence.missionResults)).toEqual(Object.keys(K.missions));
    expect(record.evidence.missionResults.snowmelt.events[1]).toMatchObject({
      snowTempC: 6, snowHumidity: 22, snowLandingSurface: 'permeable', meltProgress: 1,
    });
    expect(record.evidence.missionResults.sublimation.events[1]).toMatchObject({
      snowTempC: -8, snowHumidity: 22, sublimationProgress: 1,
    });
    const restored = N.restore({}, record);
    expect(Object.keys(restored.pilot.missionResults)).toEqual(Object.keys(K.missions));
    expect(restored.pilot.scenario).toBe('frozenHighlands');
  });

  it.each(['surface', 'cloud', 'rain', 'snow', 'soil', 'plant'])('retains the %s practice origin without manufacturing earlier stage evidence', origin => {
    const seeded = K.practiceState(origin, 'tropicalOcean');
    const record = N.capture({ pilot: {
      scenario: seeded.scenario, practiceOrigin: origin, snapshot: seeded,
    } }, 45678, 'manual');
    expect(record.checkpoint.practiceOrigin).toBe(origin);
    expect(record.checkpoint.practiceUnobserved).toBe(true);
    expect(record.checkpoint.stagesSeen).toEqual({});
    expect(record.evidence.stagesSeen).toEqual({});
    expect(record.evidence.changes).toEqual([]);
    expect(record.evidence.loopsCompleted).toBe(0);
    const restored = N.restore({}, record);
    expect(restored.pilot.practiceOrigin).toBe(origin);
    expect(restored.pilot.resumeCheckpoint.practiceUnobserved).toBe(true);
    const firstTick = K.step(restored.pilot.resumeCheckpoint, { dt: 0.016 });
    // The near-ground snow seed may really land during this step. That new
    // collection event is creditable; merely dwelling in a seeded form is not.
    expect(Object.keys(firstTick.stagesSeen)).toEqual(firstTick.form === seeded.form
      ? [] : [K.forms[firstTick.form].stage]);
  });
});
