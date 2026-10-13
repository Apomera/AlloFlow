import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');

// Exercise production functions together and fail closed if their anchors change.
function loadProductionFunction(name, bindings = {}) {
  const declarations = [...source.matchAll(new RegExp('^([ \\t]*)function ' + name + '\\(', 'gm'))];
  if (declarations.length !== 1) throw new Error('Expected one production function: ' + name);
  const declaration = declarations[0];
  const start = declaration.index + declaration[1].length;
  const ending = '\n' + declaration[1] + '}';
  const end = source.indexOf(ending, start);
  if (start < 0 || end < start) throw new Error('Missing function ending: ' + name);
  return new Function(...Object.keys(bindings), '"use strict"; return (' + source.slice(start, end + ending.length) + ');')(...Object.values(bindings));
}

function freezeDeep(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}

const historyIndex = loadProductionFunction('procedureReplayHistoryIndex');
const position = loadProductionFunction('procedureReplayPosition');
const reviewStep = loadProductionFunction('procedureReplayReviewStep', { procedureReplayPosition: position });
const now = 10000;
const actionsOfLength = length => Array.from({ length }, (_, index) => ({
  action: 'dropper', label: 'Hydrated', at: 100,
  outcome: 'Recorded result ' + index,
  point: { x: 0.3 + index / 100, y: 0.4 },
  toolCalibration: { salineDose: 1 + index % 3 },
}));

function replayController(currentProcedure, selected = {}) {
  const calls = { clears: [], writes: [], schedules: [], focus: [], feedback: [] };
  const canvas = {};
  const start = loadProductionFunction('startProcedureReplay', {
    currentProcedure, specimen: 'frog', activeLayer: 'muscle', canvasRefNode: canvas,
    Date: { now: () => now },
    procedureActionLabel: action => 'Label ' + action,
    procedureReplayReviewStep: reviewStep,
    clearDissectionCanvasTimer: (...args) => calls.clears.push(args),
    updMany: value => calls.writes.push(value),
    scheduleProcedureReplayFinish: replay => calls.schedules.push(replay),
    focusProcedureReplayControl: (...args) => calls.focus.push(args),
    setProcedureFeedback: (...args) => calls.feedback.push(args),
  });
  const reviewSelected = loadProductionFunction('reviewSelectedProcedureAction', {
    currentProcedure,
    procedureTimelineEntries: selected.timeline ?? currentProcedure.actionLog?.slice(-18) ?? [],
    selectedTechniqueActionIndex: selected.index ?? 0,
    selectedTechniqueActionIsLatest: selected.latest ?? false,
    procedureReplayHistoryIndex: historyIndex,
    startProcedureReplay: selected.start ?? start,
    procedureActionLabel: action => 'Label ' + action,
    setProcedureFeedback: (...args) => calls.feedback.push(args),
  });
  return { start, reviewSelected, calls, canvas };
}

function focusReturn({ open = false, containsOrigin = true, panelPresent = true, originPresent = true, monitorOpen = null, responseOpen = null } = {}) {
  const root = {};
  const origin = {};
  const calls = { queries: [], contains: [], focus: [] };
  const panel = { open, contains: node => { calls.contains.push(node); return containsOrigin; } };
  const restore = loadProductionFunction('returnProcedureReplayFocus', {
    currentDissectionRootNode: () => root,
    scopedDissectionQuery: (queryRoot, selector) => {
      calls.queries.push([queryRoot, selector]);
      if (selector === '.diss-field-monitor') return monitorOpen === null ? null : { open: monitorOpen };
      if (selector === '.diss-stage__telemetry-detail') return responseOpen === null ? null : { open: responseOpen };
      return selector === '#diss-procedure-panel' ? (panelPresent ? panel : null) : (originPresent ? origin : null);
    },
    focusDissectionTarget: (...args) => calls.focus.push(args),
  });
  return { restore, calls, root, origin };
}

describe('dissection history replay', () => {
  it('maps a complete short history directly into the full saved log', () => {
    const actions = freezeDeep(actionsOfLength(4));
    expect(actions.map((_, index) => historyIndex(actions, actions.slice(), index))).toEqual([0, 1, 2, 3]);
  });

  it('adds the full-log offset for every entry in the latest eighteen actions', () => {
    const actions = freezeDeep(actionsOfLength(30));
    const timeline = Object.freeze(actions.slice(-18));
    expect(timeline.map((_, index) => historyIndex(actions, timeline, index)))
      .toEqual(Array.from({ length: 18 }, (_, index) => index + 12));
  });

  it('distinguishes equal labels and timestamps by their recorded positions', () => {
    const actions = freezeDeep(actionsOfLength(20));
    const timeline = actions.slice(-18);
    expect(historyIndex(actions, timeline, 0)).toBe(2);
    expect(historyIndex(actions, timeline, 8)).toBe(10);
    expect(historyIndex(actions, timeline, 17)).toBe(19);
  });

  it('preserves the position when the same record object appears more than once', () => {
    const repeated = freezeDeep(actionsOfLength(1)[0]);
    const actions = Object.freeze(Array(24).fill(repeated));
    const timeline = Object.freeze(actions.slice(-18));
    expect([0, 8, 17].map(index => historyIndex(actions, timeline, index))).toEqual([6, 14, 23]);
  });

  it('rejects unavailable or incompatible lists and noninteger indices', () => {
    const actions = actionsOfLength(3);
    for (const invalid of [undefined, null, {}, 'actions', []]) {
      expect(historyIndex(invalid, actions, 0)).toBeNull();
      expect(historyIndex(actions, invalid, 0)).toBeNull();
    }
    expect(historyIndex(actions, actions.concat(actions[0]), 0)).toBeNull();
    for (const invalid of [undefined, null, '0', false, NaN, Infinity, -Infinity, -1, 0.5, 3]) {
      expect(historyIndex(actions, actions, invalid)).toBeNull();
    }
  });

  it('rejects stale or reordered suffixes even when record fields still match', () => {
    const actions = actionsOfLength(24);
    const timeline = actions.slice(-18);
    const replaced = actions.slice();
    replaced[8] = { ...replaced[8] };
    expect(historyIndex(replaced, timeline, 0)).toBeNull();
    expect(historyIndex(actions.concat(actionsOfLength(1)), timeline, 8)).toBeNull();
    expect(historyIndex(actions, timeline.slice().reverse(), 8)).toBeNull();
    expect(historyIndex(actions, actions.slice(0, 18), 8)).toBeNull();
  });

  it('rejects missing records and sparse suffixes rather than exposing unavailable actions', () => {
    for (const missing of [undefined, null, 'dropper', 42, true]) {
      const actions = [actionsOfLength(1)[0], missing];
      expect(historyIndex(actions, actions.slice(), 0)).toBeNull();
    }
    const sparse = Array(3);
    sparse[0] = actionsOfLength(1)[0];
    expect(historyIndex(sparse, sparse.slice(), 1)).toBeNull();
    expect(historyIndex(sparse, sparse.slice(), 0)).toBeNull();
    const inherited = Array(1);
    Object.setPrototypeOf(inherited, Object.assign(Object.create(Array.prototype), { 0: actionsOfLength(1)[0] }));
    expect(historyIndex([inherited[0]], inherited, 0)).toBeNull();
    expect(historyIndex(inherited, [inherited[0]], 0)).toBeNull();
  });

  it('opens a selected history response at its full-log index and preserves its origin', () => {
    const current = freezeDeep({ actionLog: actionsOfLength(30), history: ['inspect'] });
    const controller = replayController(current, { index: 8 });
    controller.reviewSelected('diss-layer-replay-response');
    const replay = controller.calls.writes[0]._procedureReplay;
    expect(position(replay, now + 20000).index).toBe(20);
    expect(replay.actions).toHaveLength(30);
    expect(replay.returnFocusId).toBe('diss-layer-replay-response');
    expect(controller.calls.feedback.at(-1)).toEqual([
      'Selected response replay started: Recorded result 20. This saved action is paused for review. Resume continues through the attempt.', 'working',
    ]);
  });

  it('uses the latest-response wording and action label when the outcome is absent', () => {
    const actions = actionsOfLength(2);
    delete actions[1].outcome;
    const controller = replayController(freezeDeep({ actionLog: actions }), { index: 1, latest: true });
    controller.reviewSelected('diss-monitor-response');
    expect(controller.calls.writes[0]._procedureReplay.returnFocusId).toBe('diss-monitor-response');
    expect(controller.calls.feedback.at(-1)).toEqual([
      'Last response replay started: Label dropper. This saved action is paused for review. Resume continues through the attempt.', 'working',
    ]);
  });

  it('leaves timers, replay state and focus untouched when the selection is stale or invalid', () => {
    const actions = freezeDeep(actionsOfLength(24));
    const scenarios = [
      { index: -1 }, { index: 18 }, { index: 0.5 },
      { index: 0, timeline: actions.slice(0, 18) },
      { index: 0, timeline: actions.slice(-18).map(entry => ({ ...entry })) },
      { index: 0, timeline: [] },
    ];
    for (const selected of scenarios) {
      const controller = replayController({ actionLog: actions }, selected);
      controller.reviewSelected('diss-layer-replay-response');
      expect(controller.calls.clears).toEqual([]);
      expect(controller.calls.writes).toEqual([]);
      expect(controller.calls.schedules).toEqual([]);
      expect(controller.calls.focus).toEqual([]);
      expect(controller.calls.feedback).toEqual([['Choose an available action in the history before opening its replay.']]);
    }
  });

  it('does not announce a selected replay if its launch fails', () => {
    const launches = [];
    const controller = replayController({ actionLog: actionsOfLength(24) }, {
      index: 3, start: (...args) => { launches.push(args); return null; },
    });
    controller.reviewSelected('diss-monitor-response');
    expect(launches).toEqual([[true, 9, 'diss-monitor-response']]);
    expect(controller.calls.feedback).toEqual([]);
    expect(controller.calls.writes).toEqual([]);
  });

  it('holds the selected action in a complete immutable snapshot without discarding earlier records', () => {
    const current = freezeDeep({ actionLog: actionsOfLength(30), history: ['inspect'], tissueState: { clarity: 72 } });
    const before = JSON.stringify(current);
    const controller = replayController(current);
    const replay = controller.start(true, 20, 'diss-layer-replay-response');
    expect(replay.actions).not.toBe(current.actionLog);
    expect(replay.actions).toEqual(current.actionLog);
    expect(replay.actions[20]).toBe(current.actionLog[20]);
    expect(replay).toMatchObject({ specimen: 'frog', layer: 'muscle', startedAt: now, duration: 19500, paused: true });
    expect(position(replay, now + 100000)).toMatchObject({ active: true, index: 20, localProgress: 0.5 });
    expect(controller.calls.clears).toEqual([[controller.canvas, 'procedureReplay'], [controller.canvas, 'procedureDemo']]);
    expect(controller.calls.writes).toEqual([{ _procedureReplay: replay, _procedureDemo: null }]);
    expect(controller.calls.schedules).toEqual([]);
    expect(controller.calls.focus).toEqual([['diss-replay-toggle', true]]);
    expect(JSON.stringify(current)).toBe(before);
  });

  it.each([undefined, null])('defaults an omitted review index (%s) to the first saved action', selectedIndex => {
    const controller = replayController(freezeDeep({ actionLog: actionsOfLength(4) }));
    const replay = controller.start(true, selectedIndex);
    expect(position(replay, now + 20000)).toMatchObject({ active: true, index: 0, localProgress: 0.5 });
    expect(replay.returnFocusId).toBe('diss-review-actions');
    expect(replay.duration).toBe(2800);
  });

  it('starts automatic playback at the beginning and schedules its completion', () => {
    const controller = replayController(freezeDeep({ actionLog: actionsOfLength(24) }));
    const replay = controller.start(false, 14);
    expect(replay).toMatchObject({ paused: false, elapsed: 0, returnFocusId: 'diss-replay-attempt' });
    expect(position(replay, now)).toMatchObject({ active: true, index: 0, localProgress: 0 });
    expect(controller.calls.schedules).toEqual([replay]);
    expect(controller.calls.focus).toEqual([['diss-replay-toggle', true]]);
    expect(controller.calls.feedback[0][0]).toContain('Attempt replay started.');
  });

  it('retains the legacy history fallback without fabricating saved evidence', () => {
    const current = freezeDeep({ history: ['inspect', 'scalpel', 'dropper'] });
    const replay = replayController(current).start(true, 2);
    expect(replay.actions).toEqual([
      { action: 'inspect', label: 'Label inspect', at: 0 },
      { action: 'scalpel', label: 'Label scalpel', at: 1 },
      { action: 'dropper', label: 'Label dropper', at: 2 },
    ]);
    expect(position(replay, now).index).toBe(2);
    expect(current.history).toEqual(['inspect', 'scalpel', 'dropper']);
  });

  it('does not start a replay or clear timers for an empty attempt', () => {
    const controller = replayController(freezeDeep({ actionLog: [], history: [] }));
    expect(controller.start(true)).toBeUndefined();
    expect(controller.calls).toEqual({
      clears: [], writes: [], schedules: [], focus: [],
      feedback: [['Complete at least one technique action before replaying the attempt.']],
    });
  });

  it('returns focus to the technique summary when its origin is inside the closed panel', () => {
    const { restore, calls, root, origin } = focusReturn();
    restore({ returnFocusId: 'diss-review-actions' });
    expect(calls.contains).toEqual([origin]);
    expect(calls.focus).toEqual([['diss-procedure-summary', null, root]]);
    expect(calls.queries).toEqual([[root, '#diss-procedure-panel'], [root, '#diss-review-actions']]);
  });

  it('returns focus to the original control inside an open technique panel', () => {
    const { restore, calls, root } = focusReturn({ open: true });
    restore({ returnFocusId: 'diss-review-actions' });
    expect(calls.focus).toEqual([['diss-review-actions', null, root]]);
  });

  it('preserves external response origins even when the technique panel is closed', () => {
    for (const returnFocusId of ['diss-monitor-response', 'diss-layer-replay-response']) {
      const { restore, calls, root } = focusReturn({ containsOrigin: false });
      restore({ returnFocusId });
      expect(calls.focus).toEqual([[returnFocusId, null, root]]);
    }
  });

  it.each([
    ['outer monitor', false, true, 'diss-field-monitor-summary'],
    ['inner response', true, false, 'diss-monitor-response-summary'],
    ['both disclosures', false, false, 'diss-field-monitor-summary'],
  ])('returns monitor replay focus to the visible summary when %s is closed', (_, monitorOpen, responseOpen, targetId) => {
    const { restore, calls, root } = focusReturn({ containsOrigin: false, monitorOpen, responseOpen });
    restore({ returnFocusId: 'diss-monitor-response' });
    expect(calls.focus).toEqual([[targetId, null, root]]);
    expect(calls.queries).toContainEqual([root, '.diss-field-monitor']);
    expect(calls.queries).toContainEqual([root, '.diss-stage__telemetry-detail']);
  });

  it('returns focus to the monitor action when both disclosures remain open', () => {
    const { restore, calls, root } = focusReturn({ containsOrigin: false, monitorOpen: true, responseOpen: true });
    restore({ returnFocusId: 'diss-monitor-response' });
    expect(calls.focus).toEqual([['diss-monitor-response', null, root]]);
  });

  it('preserves the requested or default return target when a panel or origin is unavailable', () => {
    for (const options of [{ panelPresent: false }, { originPresent: false }]) {
      for (const returnFocusId of [undefined, 'diss-monitor-response']) {
        const { restore, calls, root } = focusReturn(options);
        restore({ returnFocusId });
        expect(calls.focus).toEqual([[returnFocusId || 'diss-replay-attempt', null, root]]);
      }
    }
  });
});
