import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let BH;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive; });

const maneuver = (turn, patch = {}) => ({ turn, action: 'Powered climb', altitudeBefore: 10, altitude: 20, ...patch });
const held = (source, log, index) => ({ source, log, index, entry: log[index] });
const select = (log, source, selection) => BH.bhDroneHistorySelection(log, source, selection);
const expectRecord = (result, log, index, followingLatest = false, reason = '') => {
  expect(result).toEqual({ index, entry: log[index], count: log.length, reason, followingLatest });
  expect(result.entry).toBe(log[index]);
};

describe('Drone retained maneuver history selection', () => {
  it('treats non-array logs as empty without inventing a recorded maneuver', () => {
    const source = {};
    for (const log of [undefined, null, false, 0, 'history', {}, { length: 2 }]) {
      expect(select(log, source, { source, entry: maneuver(1), log, index: 0 })).toEqual({ index: -1, entry: null, count: 0, reason: '', followingLatest: true });
    }
  });

  it('clears a held selection when no records remain', () => {
    const source = {}, original = [maneuver(1)];
    expect(select([], source, held(source, original, 0))).toEqual({ index: -1, entry: null, count: 0, reason: '', followingLatest: true });
  });

  it('starts at the latest record for absent or invalid selection values', () => {
    const source = {}, log = [maneuver(1), maneuver(2), maneuver(3)];
    for (const selection of [undefined, null, false, true, 0, 1, 'first', [], {}]) expectRecord(select(log, source, selection), log, 2, true);
  });

  it('defaults to latest when a new flight source reuses the same record objects', () => {
    const previousSource = { courseSeed: 123 }, nextSource = { courseSeed: 123 };
    const log = [maneuver(1), maneuver(2)];
    expectRecord(select(log, nextSource, held(previousSource, log, 0)), log, 1, true);
  });

  it('follows newly appended records when the local selection explicitly has no held entry', () => {
    const source = {}, initial = [maneuver(1)], selection = { source, log: initial, index: 0, entry: null };
    expectRecord(select(initial, source, selection), initial, 0, true);
    const appended = initial.concat(maneuver(2));
    expectRecord(select(appended, source, selection), appended, 1, true);
  });

  it('holds an exact historical record in an unchanged log', () => {
    const source = {}, log = [maneuver(1), maneuver(2), maneuver(3)];
    expectRecord(select(log, source, held(source, log, 1)), log, 1);
  });

  it('allows a formerly latest record to stay held when another maneuver is appended', () => {
    const source = {}, original = [maneuver(1), maneuver(2)], selection = held(source, original, 1);
    expectRecord(select(original, source, selection), original, 1);
    const appended = original.concat(maneuver(3));
    expectRecord(select(appended, source, selection), appended, 1);
  });

  it('distinguishes records with duplicate and missing maneuver numbers by identity', () => {
    const source = {}, log = [maneuver(4), maneuver(4), { action: 'Turn left' }, { action: 'Turn left' }];
    for (let index = 0; index < log.length; index++) {
      const selection = held(source, log, index), appended = log.concat(maneuver(5));
      expectRecord(select(appended, source, selection), appended, index);
    }
  });

  it('does not confuse distinct objects whose recorded fields are identical', () => {
    const source = {}, first = maneuver(2), second = { ...first }, log = [first, second, maneuver(3)];
    const selection = held(source, log, 1), copiedArray = log.slice();
    expectRecord(select(copiedArray, source, selection), copiedArray, 1);
  });

  it('retains an earlier choice while newly recorded maneuvers append', () => {
    const source = {}, original = [maneuver(1), maneuver(2), maneuver(3)], selection = held(source, original, 0);
    const appended = original.concat(maneuver(4), maneuver(5));
    expectRecord(select(appended, source, selection), appended, 0);
  });

  it('finds a retained entry after the 100-record window drops older records', () => {
    const source = {}, original = Array.from({ length: 100 }, (_, index) => maneuver(index + 1));
    const selection = held(source, original, 17), retained = original.concat(maneuver(101)).slice(-100);
    expectRecord(select(retained, source, selection), retained, 16);
    expect(select(retained, source, selection).entry.turn).toBe(18);
  });

  it('returns to latest with a removed notice when the held entry falls out of retention', () => {
    const source = {}, original = Array.from({ length: 100 }, (_, index) => maneuver(index + 1));
    const selection = held(source, original, 0), retained = original.concat(maneuver(101)).slice(-100);
    expectRecord(select(retained, source, selection), retained, 99, true, 'removed');
  });

  it('preserves the selected occurrence of a repeated reference while the same array is displayed', () => {
    const source = {}, repeated = maneuver(7), log = [repeated, maneuver(8), repeated, maneuver(9)];
    expectRecord(select(log, source, held(source, log, 0)), log, 0);
    expectRecord(select(log, source, held(source, log, 2)), log, 2);
  });

  it('falls back explicitly when a changed array makes the held reference ambiguous', () => {
    const source = {}, repeated = maneuver(7), original = [repeated, maneuver(8), repeated];
    const selection = held(source, original, 2), appended = original.concat(maneuver(9));
    expectRecord(select(appended, source, selection), appended, 3, true, 'ambiguous');
    const copied = original.slice();
    expectRecord(select(copied, source, selection), copied, 2, true, 'ambiguous');
  });

  it('retains a reference when a changed array has exactly one matching occurrence', () => {
    const source = {}, repeated = maneuver(7), original = [repeated, maneuver(8), repeated];
    const selection = held(source, original, 2), retained = original.slice(1);
    expectRecord(select(retained, source, selection), retained, 1);
  });

  it('uses unique identity when the stored index is invalid instead of coercing it', () => {
    const source = {}, log = [maneuver(1), maneuver(2), maneuver(3)];
    for (const index of [undefined, null, -1, 3, 1.5, NaN, Infinity, '1']) {
      expectRecord(select(log, source, { source, log, index, entry: log[1] }), log, 1);
    }
  });

  it('does not use a valid but stale index that now points to another record', () => {
    const source = {}, log = [maneuver(1), maneuver(2), maneuver(3)];
    expectRecord(select(log, source, { source, log, index: 0, entry: log[2] }), log, 2);
  });

  it('does not substitute a new object merely because its turn and measurements match', () => {
    const source = {}, original = [maneuver(1), maneuver(2)], selection = held(source, original, 0);
    const replacement = original.map(entry => ({ ...entry }));
    expectRecord(select(replacement, source, selection), replacement, 1, true, 'removed');
  });

  it('keeps the complete supplied log order and count without sorting or truncating evidence', () => {
    const source = {}, log = Array.from({ length: 105 }, (_, index) => maneuver(105 - index));
    expectRecord(select(log, source), log, 104, true);
    expectRecord(select(log, source, held(source, log, 0)), log, 0);
    expect(log.map(entry => entry.turn)).toEqual(Array.from({ length: 105 }, (_, index) => 105 - index));
  });

  it('does not mutate frozen sources, entries, logs, or local selection and returns fresh result objects', () => {
    const entry = Object.freeze(maneuver(1)), latest = Object.freeze(maneuver(2));
    const log = Object.freeze([entry, latest]), source = Object.freeze({ decisionLog: log, simulationClock: 2 });
    const selection = Object.freeze(held(source, log, 0));
    const first = select(log, source, selection), second = select(log, source, selection);
    expectRecord(first, log, 0);
    expectRecord(second, log, 0);
    expect(first).not.toBe(second);
    first.reason = 'changed by caller';
    expect(second.reason).toBe('');
    expect(source.decisionLog).toBe(log);
    expect(source.simulationClock).toBe(2);
    expect(selection).toEqual({ source, log, index: 0, entry });
    expect(entry).toEqual(maneuver(1));
  });
});
