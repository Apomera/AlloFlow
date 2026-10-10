import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const SOURCE = readFileSync('stem_lab/stem_tool_geometryworld.js', 'utf8');
const MATH_SOURCE = SOURCE.slice(SOURCE.indexOf('  function formatVolume(vol)'), SOURCE.indexOf('  var ACHIEVEMENTS = ['));
const math = new Function(MATH_SOURCE + '\nreturn { retrievalMeasurementCount, buildRetrievalCheckpoint };')();
const RETRIEVAL_KEYS = ['retrievalAnswer', 'retrievalResult', 'retrievalAttemptCount'];

function record(overrides) {
  return Object.assign({ L: 2, W: 3, H: 4, occupiedVolume: 24, vol: '24', boundingVolume: 24,
    blocks: 24, isSolidPrism: true, isComplete: true, hasFractions: false, t: 1000 }, overrides);
}

function history(length = 10) {
  return Array.from({ length }, (_, index) => record({ t: index + 1 }));
}

function measurement(overrides) {
  return Object.assign(record(), { count: 24, totalVolume: 24, formattedOccupiedVolume: '24',
    minX: 0, minY: 1, minZ: 0, missingVolume: 0, fillPercent: 100,
    exposedSurfaceArea: 52, surfaceAreaExact: true, shapeCounts: { cube: 24 }, materialCounts: { stone: 24 },
    blocks: [{ x: 0, y: 1, z: 0 }] }, overrides);
}

function checkpoint(engine) {
  return math.buildRetrievalCheckpoint(engine._predictionState.history,
    math.retrievalMeasurementCount(engine._predictionState.history, engine._retrievalMeasurementProgress));
}

// Merge actual native patches into current state, including edits made after installation.
function workspace(records = history(), completeCount = records.filter(item => item.isComplete !== false).length) {
  let state = { measureHistory: records, retrievalAnswer: '', retrievalResult: null, retrievalAttemptCount: 0,
    score: 2, totalQ: 3, answeredNpcs: { 'Layer Counter': true }, npcAnswerDrafts: { 'Layer Counter': 'kept' } };
  const engine = {
    _predictionState: { input: '', strategy: '', reason: '', commitment: null, observedTargetKeys: [], history: records },
    _retrievalMeasurementProgress: { history: records, completeCount },
    blockUnderCrosshair: () => ({ object: { userData: { gridPos: { x: 0, y: 1, z: 0 } } } }),
    measureStructure: vi.fn(() => measurement({ isComplete: false, measurementLimit: 24 })),
    clearLayerFocus: vi.fn(), sessionLog: []
  };
  engine.logEvent = vi.fn((type, data) => engine.sessionLog.push({ type, data }));
  const update = vi.fn((patch, value) => { state = Object.assign({}, state, typeof patch === 'string' ? { [patch]: value } : patch); });
  const awardXP = vi.fn(), noop = () => {};
  const start = SOURCE.indexOf('engine.performMeasurement = function(inputMode) {');
  const end = SOURCE.indexOf('\n        };', start);
  if (start < 0 || end < 0) throw new Error('Missing native Geometry World measurement handler');
  new Function('engine', 'upd', 'setLayerFocus', 'sfxMeasure', 'showDimLines', 'showSelectionGlow',
    'spawnPlaceParticles', 'announceToSR', 'runAchievementCheck', 'awardXP',
    MATH_SOURCE + '\n' + SOURCE.slice(start, end + '\n        };'.length))(
    engine, update, noop, noop, noop, noop, noop, noop, noop, awardXP);
  return { engine, update, awardXP, state: () => state,
    edit(patch) { state = Object.assign({}, state, patch); },
    lastMeasurementPatch() { return update.mock.calls.map(([patch]) => patch).filter(patch => patch && patch.measureHistory).at(-1); } };
}

function expectCleared(view) {
  expect(view.state()).toMatchObject({ retrievalAnswer: '', retrievalResult: null, retrievalAttemptCount: 0 });
  RETRIEVAL_KEYS.forEach(key => expect(view.lastMeasurementPatch()).toHaveProperty(key));
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(2000); });
afterEach(() => { vi.clearAllTimers(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('Geometry World incomplete measurement Practice continuity', () => {
  it.each(['key', 'touch'].flatMap(input => ['draft', 'correct', 'retry'].map(kind => [input, kind])))
  ('retains current %s %s work when an incomplete scan leaves its question unchanged', (input, kind) => {
    const view = workspace(), before = checkpoint(view.engine);
    const result = kind === 'draft' ? null : { checkpointId: before.id, correct: kind === 'correct', valid: true,
      answer: kind === 'correct' ? 8 : 7, expected: 8, attempt: 2,
      feedback: kind === 'correct' ? 'Correct. The new height is 8 units.' : before.hint };
    const work = { retrievalAnswer: kind === 'correct' ? '8' : '7', retrievalResult: result,
      retrievalAttemptCount: kind === 'draft' ? 0 : 2 };
    view.edit(work);
    view.engine.performMeasurement(input);
    expect(checkpoint(view.engine)).toEqual(before);
    expect(view.state()).toMatchObject(work);
    expect(view.state().retrievalResult).toBe(result);
    RETRIEVAL_KEYS.forEach(key => expect(view.lastMeasurementPatch()).not.toHaveProperty(key));
    expect(view.state().measureHistory).toHaveLength(10);
    expect(view.state().measureHistory.filter(item => item.isComplete !== false)).toHaveLength(9);
    expect(view.engine._retrievalMeasurementProgress.completeCount).toBe(10);
    expect(view.state()).toMatchObject({ score: 2, totalQ: 3, answeredNpcs: { 'Layer Counter': true },
      npcAnswerDrafts: { 'Layer Counter': 'kept' } });
    expect(view.engine.sessionLog).toEqual([{ type: 'measurement', data: expect.objectContaining({ isComplete: false, input }) }]);
    expect(view.awardXP).not.toHaveBeenCalled();
  });

  it('retains the odd native cadence after the retained history has reached its cap', () => {
    const view = workspace(history(), 11), before = checkpoint(view.engine);
    expect(before.concept).toBe('layer_area');
    view.edit({ retrievalAnswer: '6', retrievalAttemptCount: 1 });
    view.engine.performMeasurement('touch');
    expect(checkpoint(view.engine)).toEqual(before);
    expect(view.state()).toMatchObject({ retrievalAnswer: '6', retrievalAttemptCount: 1 });
    expect(view.engine._retrievalMeasurementProgress.completeCount).toBe(11);
  });

  it('keeps work through repeated partial scans until fewer than two complete records remain', () => {
    const view = workspace(), before = checkpoint(view.engine);
    const result = { checkpointId: before.id, correct: true, valid: true, answer: 8, expected: 8, feedback: 'Correct.' };
    view.edit({ retrievalAnswer: '8', retrievalResult: result, retrievalAttemptCount: 2 });
    for (let index = 0; index < 8; index += 1) {
      vi.setSystemTime(2000 + index); view.engine.performMeasurement('touch');
      expect(checkpoint(view.engine)).toEqual(before);
      expect(view.state().retrievalResult).toBe(result);
      expect(view.state().retrievalAttemptCount).toBe(2);
    }
    view.engine.performMeasurement('touch');
    expect(checkpoint(view.engine)).toBeNull();
    expectCleared(view);
    expect(view.engine.sessionLog).toHaveLength(9);
  });

  it('clears work when eviction changes a legacy checkpoint identity even if its answer stays equal', () => {
    const records = history(); records[records.length - 1].t = 0;
    const view = workspace(records), before = checkpoint(view.engine);
    view.edit({ retrievalAnswer: '8', retrievalResult: { checkpointId: before.id, correct: true }, retrievalAttemptCount: 1 });
    view.engine.performMeasurement('key');
    const after = checkpoint(view.engine);
    expect(after.expected).toBe(before.expected);
    expect(after.prompt).toBe(before.prompt);
    expect(after.id).not.toBe(before.id);
    expectCleared(view);
  });

  it('clears obsolete work when no eligible Practice question exists before or after the partial scan', () => {
    const view = workspace(history(1));
    view.edit({ retrievalAnswer: 'old draft', retrievalResult: { checkpointId: 'old-question', correct: true }, retrievalAttemptCount: 4 });
    view.engine.performMeasurement('key');
    expect(checkpoint(view.engine)).toBeNull();
    expectCleared(view);
  });

  it('falls back to retained evidence when runtime cadence belongs to a different history array', () => {
    const records = history(), view = workspace(records, 11);
    view.engine._retrievalMeasurementProgress.history = records.slice();
    const before = checkpoint(view.engine);
    expect(before.concept).toBe('scale_height');
    view.edit({ retrievalAnswer: '8', retrievalAttemptCount: 2 });
    view.engine.performMeasurement('key');
    expect(checkpoint(view.engine)).toEqual(before);
    expect(view.state()).toMatchObject({ retrievalAnswer: '8', retrievalAttemptCount: 2 });
    expect(view.engine._retrievalMeasurementProgress.completeCount).toBe(10);
  });

  it('still resets work after a complete scan even when its checkpoint is equivalent', () => {
    const view = workspace([record({ t: 1 }), record({ t: 2, hasFractions: true, blocks: 2,
      occupiedVolume: 1.5, boundingVolume: 2, isSolidPrism: false })]);
    vi.setSystemTime(2);
    const before = checkpoint(view.engine);
    view.edit({ retrievalAnswer: '1/2', retrievalResult: { checkpointId: before.id, correct: true }, retrievalAttemptCount: 2 });
    view.engine.measureStructure.mockReturnValue(measurement({ isComplete: true, hasFractions: true, count: 2,
      occupiedVolume: 1.5, boundingVolume: 2, isSolidPrism: false }));
    view.engine.performMeasurement('key');
    expect(checkpoint(view.engine)).toEqual(before);
    expectCleared(view);
    expect(view.engine._retrievalMeasurementProgress.completeCount).toBe(3);
    expect(view.engine.sessionLog).toEqual([{ type: 'measurement', data: expect.objectContaining({ isComplete: true, input: 'key' }) }]);
    expect(view.state()).toMatchObject({ score: 2, answeredNpcs: { 'Layer Counter': true } });
  });
});
