import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const BUILDER_SOURCE = readFileSync('stem_lab/stem_tool_geometryworld_builder.js', 'utf8');
const CORE_SOURCE = readFileSync('stem_lab/stem_tool_geometryworld.js', 'utf8');
const MATH_SOURCE = CORE_SOURCE.slice(CORE_SOURCE.indexOf('  function formatVolume(vol)'), CORE_SOURCE.indexOf('  var ACHIEVEMENTS = ['));
const math = new Function(MATH_SOURCE + '\nreturn { retrievalMeasurementCount, buildRetrievalCheckpoint };')();

function builderHelper(name) {
  const result = BUILDER_SOURCE.match(new RegExp('  function ' + name + '\\([^)]*\\) \\{[\\s\\S]*?\\n  \\}'))?.[0];
  if (!result) throw new Error('Missing builder helper: ' + name);
  return result;
}

const restoreRetrievalCadence = new Function(builderHelper('validRetrievalCadenceCount') + '\n'
  + builderHelper('restoreRetrievalCadence') + '\nreturn restoreRetrievalCadence;')();

function record(overrides) {
  return Object.assign({ L: 1, W: 1, H: 1, occupiedVolume: 1, vol: '1', boundingVolume: 1,
    blocks: 1, isSolidPrism: true, isComplete: true, t: 1000 }, overrides);
}

function history(length) {
  return Array.from({ length }, (_, index) => record({ t: index + 1000 }));
}

function engine() {
  const previousHistory = history(9), commitment = { targetKey: 'different-target', input: '3/2', prediction: 1.5 };
  return {
    _predictionState: { history: previousHistory, input: '3/2', strategy: 'layers', reason: 'Keep this reasoning.',
      commitment, observedTargetKeys: [] },
    _retrievalMeasurementProgress: { history: previousHistory, completeCount: 17 },
    sessionLog: [], blocks: {}, clearLayerFocus() {},
    blockUnderCrosshair: () => ({ object: { userData: { gridPos: { x: 0, y: 1, z: 0 } } } }),
    measureStructure: () => ({ count: 1, L: 1, W: 1, H: 1, occupiedVolume: 1, formattedOccupiedVolume: '1',
      boundingVolume: 1, fillPercent: 100, hasFractions: false, isSolidPrism: true, isComplete: true,
      minX: 0, minY: 1, minZ: 0, blocks: [{ x: 0, y: 1, z: 0 }], materialCounts: { stone: 1 } })
  };
}

function installNativeMeasurement(target, update) {
  const start = CORE_SOURCE.indexOf('engine.performMeasurement = function(inputMode) {');
  const end = CORE_SOURCE.indexOf('\n        };', start);
  if (start < 0 || end < 0) throw new Error('Missing native measurement handler');
  const noop = () => {};
  new Function('engine', 'upd', 'setLayerFocus', 'sfxMeasure', 'showDimLines', 'showSelectionGlow',
    'spawnPlaceParticles', 'announceToSR', 'runAchievementCheck', 'awardXP',
    MATH_SOURCE + '\n' + CORE_SOURCE.slice(start, end + '\n        };'.length))
  (target, update, noop, noop, noop, noop, noop, noop, noop, noop);
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('Geometry World recovery cadence validation', () => {
  it.each([undefined, null, NaN, Infinity, -1, 2, 3.5, '11'])
  ('aligns restored history before rejecting missing or invalid cadence (%s)', count => {
    const target = engine(), restored = history(3), before = target._predictionState;
    restoreRetrievalCadence(target, restored, count);
    expect(target._predictionState.history).toBe(restored);
    expect(target._predictionState.commitment).toBe(before.commitment);
    expect(target._predictionState.observedTargetKeys).toBe(before.observedTargetKeys);
    expect(target._predictionState).toMatchObject({ input: '3/2', strategy: 'layers', reason: 'Keep this reasoning.' });
    expect(target._retrievalMeasurementProgress).toBeUndefined();
    expect(math.retrievalMeasurementCount(restored, target._retrievalMeasurementProgress)).toBe(3);
  });

  it('reattaches valid native cadence to the exact restored array', () => {
    const target = engine(), restored = history(3);
    restoreRetrievalCadence(target, restored, 11);
    expect(target._predictionState.history).toBe(restored);
    expect(target._retrievalMeasurementProgress).toEqual({ history: restored, completeCount: 11 });
    expect(math.buildRetrievalCheckpoint(restored,
      math.retrievalMeasurementCount(restored, target._retrievalMeasurementProgress))).toMatchObject({ concept: 'layer_area', expected: 1 });
  });

  it.each([undefined, null, {}, 'authored-history'])('does not borrow native progress for non-array history (%s)', restored => {
    const target = engine(), before = target._predictionState;
    restoreRetrievalCadence(target, restored, 11);
    expect(target._retrievalMeasurementProgress).toBeUndefined();
    expect(target._predictionState).toBe(before);
  });

  it.each([
    ['missing', undefined, 3, 4, 'scale_height'],
    ['nonfinite', NaN, 3, 4, 'scale_height'],
    ['string', '11', 3, 4, 'scale_height'],
    ['stale', 1, 2, 3, 'layer_area']
  ])('immediately appends native measurement to restored %s-metadata history before rendering', (_label, count, retained, expectedCount, concept) => {
    const target = engine(), restored = history(retained), update = vi.fn();
    installNativeMeasurement(target, update);
    restoreRetrievalCadence(target, restored, count);
    target.performMeasurement('key');
    const measured = target._predictionState.history;
    expect(measured).toHaveLength(retained + 1);
    expect(measured.slice(0, -1)).toEqual(restored);
    expect(target._retrievalMeasurementProgress).toEqual({ history: measured, completeCount: expectedCount });
    expect(math.buildRetrievalCheckpoint(measured,
      math.retrievalMeasurementCount(measured, target._retrievalMeasurementProgress))).toMatchObject({ concept });
    expect(update.mock.calls.find(([patch]) => patch && patch.measureHistory)?.[0].measureHistory).toBe(measured);
    expect(update.mock.calls.some(([patch]) => patch && typeof patch === 'object' && ('score' in patch || 'answeredNpcs' in patch))).toBe(false);
  });

  it('counts only restored complete records when invalid metadata precedes an immediate native scan', () => {
    const target = engine(), restored = [record(), record({ isComplete: false }), record({ t: 2000 })];
    installNativeMeasurement(target, vi.fn());
    restoreRetrievalCadence(target, restored, 1);
    target.performMeasurement('touch');
    expect(target._predictionState.history).toHaveLength(4);
    expect(target._retrievalMeasurementProgress.completeCount).toBe(3);
    expect(math.buildRetrievalCheckpoint(target._predictionState.history, 3)).toMatchObject({ concept: 'layer_area' });
  });

  it('publishes restored cadence before state in both complete-workspace recovery paths', () => {
    const returning = BUILDER_SOURCE.slice(BUILDER_SOURCE.indexOf('  function restoreProject('), BUILDER_SOURCE.indexOf('  function restoreDraft('));
    const rollback = BUILDER_SOURCE.slice(BUILDER_SOURCE.indexOf('  function restoreEditableImportRecovery('), BUILDER_SOURCE.indexOf('  function restoreEditableWorld('));
    expect(returning.indexOf('restoreRetrievalCadence(engine,patch.measureHistory,saved.retrievalMeasurementCount);')).toBeGreaterThanOrEqual(0);
    expect(rollback.indexOf('restoreRetrievalCadence(engine,restoredState.measureHistory,saved.retrievalMeasurementCount);')).toBeGreaterThanOrEqual(0);
    expect(returning.indexOf('restoreRetrievalCadence(engine,patch.measureHistory,saved.retrievalMeasurementCount);'))
      .toBeLessThan(returning.indexOf('patchGeometryState(ctx, patch);'));
    expect(rollback.indexOf('restoreRetrievalCadence(engine,restoredState.measureHistory,saved.retrievalMeasurementCount);'))
      .toBeLessThan(rollback.indexOf('patchGeometryState(ctx,restoredState);'));
  });
});
