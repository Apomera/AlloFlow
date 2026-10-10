import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');

// Exercise the production helpers with their real replay-position dependency.
function loadProductionFunction(name, bindings = {}) {
  const declaration = new RegExp('^([ \\t]*)function ' + name + '\\(', 'm').exec(source);
  if (!declaration) throw new Error('Missing production function: ' + name);
  const start = declaration.index + declaration[1].length;
  const ending = '\n' + declaration[1] + '}';
  const end = source.indexOf(ending, start);
  if (end < 0) throw new Error('Missing function ending: ' + name);
  return new Function(...Object.keys(bindings), 'return (' + source.slice(start, end + ending.length) + ');')(...Object.values(bindings));
}

const replayContact = loadProductionFunction('procedureReplayContact');
const replayContactLabel = loadProductionFunction('procedureReplayContactLabel');
const replayPosition = loadProductionFunction('procedureReplayPosition');
const replayIsActive = loadProductionFunction('procedureReplayIsActive', {
  procedureReplayPosition: replayPosition,
});

function freezeDeep(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}

const replay = freezeDeep({
  specimen: 'frog',
  layer: 'muscle',
  startedAt: 1000,
  duration: 4000,
  actions: [{ action: 'dropper', point: { x: 0.2, y: 0.3 } }],
});

// Keep the action and log writers real; isolate unrelated simulation feedback.
function makeActionWriter({ organPoint = { x: 0.3, y: 0.4 }, exposure = 'visible' } = {}) {
  const organ = freezeDeep({ id: 'test-structure', name: 'Test structure' });
  const currentProcedure = freezeDeep({
    inspected: false, pins: [{ x: 0.4, y: 0.2 }, { x: 0.6, y: 0.8 }],
    history: [], actionLog: [], tissueState: { clarity: 70 }, calibrationScores: {},
  });
  const d = freezeDeep({ anatomicalView: 'dorsal', procedureByLayer: { muscle: currentProcedure }, exploredOrgans: {} });
  const toolCalibration = freezeDeep({ probePressure: 35 });
  let updated;
  const ignore = () => {};
  const calibratedActionPatch = loadProductionFunction('calibratedActionPatch', {
    currentProcedure, toolCalibration, toolCalibrationScore: () => 100,
  });
  const updateProcedure = loadProductionFunction('updateProcedure', {
    d, currentProcedure, activeLayer: 'muscle', specimen: 'frog', organs: [organ],
    normalizeTissueState: value => ({ ...value }),
    evolveTissueState: (action, patch, value) => ({ ...value }),
    procedureOutcomeFeedbackData: () => ({ label: 'Recorded', detail: '', tone: 'success' }),
    procedureActionLabel: action => action,
    procedureActionUndoState: () => ({}),
    procedureTactile: ignore, queueProcedureOutcomeFeedback: ignore,
    procedureScenarioStatus: () => ({ complete: false, progress: 0 }),
    procedureActionContinuation: () => '', procedureScenarioGuidance: () => '',
    scenarioCompletionTimestamp: () => null,
    updMany: updater => { updated = updater(d); },
  });
  const perform = loadProductionFunction('performProcedureAction', {
    currentProcedure, d, toolCalibration, organs: [organ], specimen: 'frog',
    activeLayer: 'muscle', anatomicalView: 'dorsal', revealedLayers: {},
    procedureProtocol: { recommendedView: 'dorsal', title: 'Test protocol' },
    stopProcedureReplay: ignore, timedProcedureScenarioExpired: () => false,
    currentScenarioDefinition: () => ({ id: 'precision-access' }),
    nextProcedureInfo: () => ({ action: 'complete' }),
    procedureLearningGateFor: () => ({ required: false }),
    setProcedureFeedback: ignore, procedureMistake: ignore,
    structureExposureState: () => exposure,
    chooseOrganFromDirectory: ignore, sfxDisProbe: ignore,
    procedureReplayContact: replayContact, calibratedActionPatch, updateProcedure,
    toolCalibrationScore: () => 100, variedOrganPoint: () => organPoint,
  });
  return {
    perform, organ, currentProcedure,
    record: () => updated?.procedureByLayer.muscle.actionLog.at(-1),
  };
}

describe('dissection replay contact', () => {
  it('keeps recorded zero, one, and fractional coordinates without fallback', () => {
    for (const point of [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 0 }, { x: 0.25, y: 0.75 }]) {
      expect(replayContact(freezeDeep({ point }))).toEqual(point);
    }
  });

  it('returns a new coordinate copy and leaves a frozen record unchanged', () => {
    const entry = freezeDeep({ action: 'dropper', point: { x: 0.2, y: 0.3, pressure: 0.6 }, outcome: 'Hydrated' });
    const before = JSON.stringify(entry);
    const contact = replayContact(entry);
    expect(contact).toEqual({ x: 0.2, y: 0.3 });
    expect(contact).not.toBe(entry.point);
    contact.x = 0.9;
    expect(JSON.stringify(entry)).toBe(before);
    expect(replayContact(entry)).toEqual({ x: 0.2, y: 0.3 });
  });

  it('uses each repeated action record independently', () => {
    const first = freezeDeep({ action: 'wick', point: { x: 0.15, y: 0.25 } });
    const second = freezeDeep({ action: 'wick', point: { x: 0.8, y: 0.7 } });
    expect(replayContact(first)).toEqual({ x: 0.15, y: 0.25 });
    expect(replayContact(second)).toEqual({ x: 0.8, y: 0.7 });
  });

  it('returns no saved contact when either coordinate is missing', () => {
    for (const entry of [undefined, null, {}, { point: null }, { point: {} }, { point: { x: 0.5 } }, { point: { y: 0.5 } }]) {
      expect(replayContact(entry)).toBeNull();
    }
  });

  it('rejects coercible and nonnumeric coordinates on either axis', () => {
    for (const coordinate of ['0', '0.5', '1', false, true, null, undefined, {}, [], new Number(0.5)]) {
      expect(replayContact({ point: { x: coordinate, y: 0.5 } })).toBeNull();
      expect(replayContact({ point: { x: 0.5, y: coordinate } })).toBeNull();
    }
  });

  it('rejects nonfinite and out-of-range coordinates on either axis', () => {
    for (const coordinate of [NaN, Infinity, -Infinity, -0.001, 1.001]) {
      expect(replayContact({ point: { x: coordinate, y: 0.5 } })).toBeNull();
      expect(replayContact({ point: { x: 0.5, y: coordinate } })).toBeNull();
    }
  });

  it('labels absent or invalid contact as a teaching position even for supported input', () => {
    for (const entry of [undefined, null, {}, { assistance: 'motor-neutral' }, { assistance: 'supported' }, { inputType: 'button' }, { inputType: 'pen', point: { x: NaN, y: 0.5 } }]) {
      expect(replayContactLabel(entry, replayContact(entry))).toBe('TEACHING POSITION');
    }
  });

  it('labels recorded motor-neutral and button contacts as supported positions', () => {
    for (const input of [{ assistance: 'motor-neutral' }, { assistance: 'supported' }, { inputType: 'motor-neutral' }, { inputType: 'button' }]) {
      const entry = freezeDeep({ ...input, point: { x: 0, y: 1 } });
      expect(replayContactLabel(entry, replayContact(entry))).toBe('SUPPORTED POSITION');
    }
  });

  it('labels other recorded contacts as saved positions without assuming input fidelity', () => {
    for (const input of [{}, { inputType: 'unknown' }, { inputType: 'mouse' }, { inputType: 'pen' }, { inputType: 'touch' }, { assistance: 'none' }]) {
      const entry = freezeDeep({ ...input, point: { x: 0.2, y: 0.3 } });
      expect(replayContactLabel(entry, replayContact(entry))).toBe('SAVED POSITION');
    }
  });

  it('reads contact labels without altering saved input or coordinates', () => {
    const entry = freezeDeep({ assistance: 'motor-neutral', point: { x: 0, y: 1 } });
    const contact = freezeDeep(replayContact(entry));
    const before = JSON.stringify({ entry, contact });
    expect(replayContactLabel(entry, contact)).toBe('SUPPORTED POSITION');
    expect(JSON.stringify({ entry, contact })).toBe(before);
  });

  it('recognizes a matching replay while it is playing', () => {
    expect(replayIsActive(replay, 1000, 'frog', 'muscle', false)).toBe(true);
    expect(replayIsActive(replay, 4999, 'frog', 'muscle', false)).toBe(true);
  });

  it('accepts a legacy replay without a specimen', () => {
    const legacy = freezeDeep({ ...replay, specimen: undefined });
    expect(replayIsActive(legacy, 2000, 'frog', 'muscle', false)).toBe(true);
    expect(replayIsActive(legacy, 2000, 'fish', 'muscle', false)).toBe(true);
  });

  it('rejects a replay for a different specimen or layer', () => {
    expect(replayIsActive(replay, 2000, 'fish', 'muscle', false)).toBe(false);
    expect(replayIsActive(replay, 2000, 'frog', 'skin', false)).toBe(false);
    expect(replayIsActive(replay, 2000, 'fish', 'skin', false)).toBe(false);
  });

  it('excludes replay overlays in assessment mode even when paused', () => {
    expect(replayIsActive(replay, 2000, 'frog', 'muscle', true)).toBe(false);
    expect(replayIsActive({ ...replay, paused: true, elapsed: 2000 }, 100000, 'frog', 'muscle', true)).toBe(false);
  });

  it('does not treat expired playback as an active overlay', () => {
    for (const now of [5000, 100000]) {
      expect(replayIsActive(replay, now, 'frog', 'muscle', false)).toBe(false);
    }
  });

  it('keeps a valid paused review active after its original playback end', () => {
    const paused = freezeDeep({ ...replay, paused: true, elapsed: 2000 });
    expect(replayIsActive(paused, 100000, 'frog', 'muscle', false)).toBe(true);
    expect(replayIsActive({ ...paused, elapsed: 4000 }, 100000, 'frog', 'muscle', false)).toBe(true);
  });

  it('rejects missing and malformed replay records', () => {
    const invalid = [undefined, null, {}, { ...replay, actions: [] }, { ...replay, duration: 0 }, { ...replay, duration: '4000' }, { ...replay, startedAt: NaN }, { ...replay, paused: true, elapsed: Infinity }];
    for (const record of invalid) {
      expect(replayIsActive(record, 2000, 'frog', 'muscle', false)).toBe(false);
    }
  });

  it('checks overlay activity without modifying frozen replay evidence', () => {
    const before = JSON.stringify(replay);
    replayIsActive(replay, 2000, 'frog', 'muscle', false);
    replayIsActive(replay, 6000, 'frog', 'muscle', false);
    replayIsActive(replay, 2000, 'frog', 'muscle', true);
    expect(JSON.stringify(replay)).toBe(before);
  });
});

describe('dissection replay contact action writers', () => {
  it('saves pointer inspection contact as a fresh record without losing zero coordinates', () => {
    const writer = makeActionWriter();
    const payload = freezeDeep({ point: { x: 0, y: 1 }, inputType: 'pointer' });
    const before = JSON.stringify({ payload, procedure: writer.currentProcedure });
    expect(writer.perform('inspect', payload)).toEqual({ ok: true });
    const record = writer.record();
    expect(record).toMatchObject({ action: 'inspect', inputType: 'pointer', point: { x: 0, y: 1 } });
    expect(record.point).not.toBe(payload.point);
    expect(replayContactLabel(record, replayContact(record))).toBe('SAVED POSITION');
    expect(JSON.stringify({ payload, procedure: writer.currentProcedure })).toBe(before);
  });

  it('does not invent an inspection contact when the supplied point is absent or invalid', () => {
    for (const point of [undefined, null, { x: '0.5', y: 0.5 }, { x: 0.5, y: NaN }]) {
      const writer = makeActionWriter();
      expect(writer.perform('inspect', freezeDeep({ point, inputType: 'pointer' }))).toEqual({ ok: true });
      const record = writer.record();
      expect(replayContact(record)).toBeNull();
      expect(replayContactLabel(record, replayContact(record))).toBe('TEACHING POSITION');
    }
  });

  it('records the direct probe contact independently of the organ center', () => {
    const writer = makeActionWriter();
    const payload = freezeDeep({ organ: writer.organ, point: { x: 0.8, y: 0.6 }, inputType: 'pen' });
    const before = JSON.stringify(payload);
    expect(writer.perform('probe', payload)).toMatchObject({ ok: true });
    const record = writer.record();
    expect(record).toMatchObject({ action: 'probe', inputType: 'pen', point: { x: 0.8, y: 0.6 } });
    expect(record.point).not.toBe(payload.point);
    expect(replayContactLabel(record, replayContact(record))).toBe('SAVED POSITION');
    expect(JSON.stringify(payload)).toBe(before);
  });

  it('records an organ-center fallback only with supported probe provenance', () => {
    for (const inputType of ['button', 'motor-neutral']) {
      const center = freezeDeep({ x: 0.3, y: 0.4 });
      const writer = makeActionWriter({ organPoint: center });
      expect(writer.perform('probe', freezeDeep({ organ: writer.organ, inputType }))).toMatchObject({ ok: true });
      const record = writer.record();
      expect(record).toMatchObject({ inputType, point: center });
      expect(record.point).not.toBe(center);
      expect(replayContactLabel(record, replayContact(record))).toBe('SUPPORTED POSITION');
    }
  });

  it('does not replace absent or invalid direct probe contact with a fabricated organ center', () => {
    for (const point of [undefined, null, { x: '0.5', y: 0.5 }, { x: 0.5, y: Infinity }, { x: -0.1, y: 0.5 }]) {
      const writer = makeActionWriter();
      expect(writer.perform('probe', freezeDeep({ organ: writer.organ, point, inputType: 'touch' }))).toMatchObject({ ok: true });
      const record = writer.record();
      expect(record.inputType).toBe('touch');
      expect(replayContact(record)).toBeNull();
      expect(replayContactLabel(record, replayContact(record))).toBe('TEACHING POSITION');
    }
  });

  it('keeps direct input provenance inferred from probe metrics when contact is missing', () => {
    const writer = makeActionWriter();
    expect(writer.perform('probe', freezeDeep({ organ: writer.organ, probeDragMetrics: { inputType: 'pen' } }))).toMatchObject({ ok: true });
    const record = writer.record();
    expect(record.inputType).toBe('pen');
    expect(replayContact(record)).toBeNull();
    expect(replayContactLabel(record, replayContact(record))).toBe('TEACHING POSITION');
  });

  it('rejects an invalid supported organ-center point rather than recording unusable coordinates', () => {
    const writer = makeActionWriter({ organPoint: freezeDeep({ x: 0.5, y: NaN }) });
    expect(writer.perform('probe', freezeDeep({ organ: writer.organ, inputType: 'button' }))).toMatchObject({ ok: true });
    const record = writer.record();
    expect(replayContact(record)).toBeNull();
    expect(replayContactLabel(record, replayContact(record))).toBe('TEACHING POSITION');
  });

  it('saves the actual final drag contact through the production probe caller and action-log writer', () => {
    const writer = makeActionWriter();
    const finalContact = freezeDeep({ x: 0.48, y: 0.42 });
    const drag = {
      active: true, pointerId: 42, inputType: 'pen', target: writer.organ,
      start: freezeDeep({ x: 0.4, y: 0.4 }), current: finalContact,
      targetPoint: freezeDeep({ x: 0.3, y: 0.4 }), samples: freezeDeep([]),
    };
    const canvas = { _probeDrag: drag };
    const finishProbeDrag = loadProductionFunction('finishProbeDrag', {
      directGestureContextIsCurrent: () => true,
      probeDragAssessment: () => ({ key: 'ready', distance: 0.1, elapsed: 800, peakSpeed: 0.02, pressure: 0.35, resistanceValue: 50, deformation: 0, contactPercent: 100, alignment: 100, control: 100 }),
      syncCanvasPointerPresentation: () => {}, setProcedureFeedback: () => {},
      procedureMistake: () => {}, queueProcedureInstrumentReplay: () => {},
      performProcedureAction: writer.perform,
    });
    expect(finishProbeDrag({ currentTarget: canvas, pointerId: 42 }, false)).toBe(true);
    const record = writer.record();
    expect(record).toMatchObject({ action: 'probe', inputType: 'pen', point: finalContact });
    expect(record.point).not.toBe(finalContact);
    expect(record.point).not.toEqual(drag.start);
    expect(record.point).not.toEqual(drag.targetPoint);
    expect(replayContactLabel(record, replayContact(record))).toBe('SAVED POSITION');
    expect(finalContact).toEqual({ x: 0.48, y: 0.42 });
  });
});
