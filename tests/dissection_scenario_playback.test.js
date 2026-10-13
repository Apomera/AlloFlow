import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');
const now = 1800000000000;
const playbackNames = ['procedureReplay', 'procedureDemo', 'compareReplay'];

// Extract uniquely anchored declarations so missing or moved production
// behavior fails closed rather than silently running a replacement fixture.
function loadProductionFunction(name, bindings = {}) {
  const declarations = [...source.matchAll(new RegExp('^([ \\t]*)function ' + name + '\\(', 'gm'))];
  if (declarations.length !== 1) throw new Error('Expected one production function: ' + name);
  const declaration = declarations[0];
  const start = declaration.index + declaration[1].length;
  const ending = '\n' + declaration[1] + '}';
  const end = source.indexOf(ending, start);
  if (end < start) throw new Error('Missing function ending: ' + name);
  return new Function(...Object.keys(bindings), '"use strict"; return (' + source.slice(start, end + ending.length) + ');')(...Object.values(bindings));
}

const scenarioDeclarations = [...source.matchAll(/^([ \t]*)var ADVANCED_SCENARIOS = \[/gm)];
if (scenarioDeclarations.length !== 1) throw new Error('Expected one advanced scenario declaration');
const scenarioStart = scenarioDeclarations[0].index + scenarioDeclarations[0][0].length - 1;
const scenarioEnd = source.indexOf('\n' + scenarioDeclarations[0][1] + '];', scenarioStart);
if (scenarioEnd < scenarioStart) throw new Error('Missing advanced scenario declaration ending');
const scenarios = new Function('"use strict"; return (' + source.slice(scenarioStart, scenarioEnd) + '\n]);')();

function freezeDeep(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}

function fixture(overrides = {}, { canvasPresent = true, recommendedView = 'dorsal', nextAction = 'scalpel' } = {}) {
  const d = freezeDeep({
    specimen: 'frog', activeLayer: 'skin', workspaceMode: 'advanced', quizMode: false, practicalMode: false,
    procedureScenario: 'precision-access', scenarioStartedAt: now - 30000, scenarioTimeRemaining: 210, scenarioCompletedAt: now - 1000,
    activeInstrument: 'probe', anatomicalView: 'dorsal', specimenCondition: 'standard', variationSeed: 1,
    procedureByLayer: {
      skin: { inspected: true, incisionStarted: true, errors: 2, pins: [{ x: 0.4, y: 0.5 }], history: ['inspect', 'scalpel'],
        actionLog: [{ action: 'scalpel', at: 123, outcome: 'Saved cut' }], cautionLog: [{ reason: 'Saved caution' }],
        learningChecks: { inspect: true, incision: true }, tissueState: { clarity: 80, moisture: 66, stability: 70, risk: 20 },
        incisionPath: [{ x: 0.4, y: 0.3 }, { x: 0.5, y: 0.6 }] },
      organs: { inspected: true, history: ['inspect'], actionLog: [{ action: 'inspect', at: 120 }] },
    },
    exploredOrgans: { 'frog|heart': true, 'frog|skin': true, 'pig|heart': true }, selectedOrgan: 'heart',
    relationshipTraceIndex: 2, relationshipTraceCount: 3, compareTechniqueAttempts: true,
    compareReplayPlaying: true, compareReplayProgress: 0.42,
    _procedureReplay: { paused: true, layer: 'skin', actions: [{ action: 'scalpel' }], elapsed: 500 },
    _procedureDemo: { layer: 'skin', startedAt: now - 200 },
    organNotes: { 'frog|heart': 'Keep this observation.' }, notebook: ['Saved learning note'],
    attemptArchive: { skin: [{ id: 7, history: ['inspect'], score: 80 }] }, savedFrames: [{ id: 'saved-frame' }],
    selectedTechniqueActionIndex: 1, procedureFeedback: { message: 'Previous feedback', tone: 'working' },
    largeText: true, highContrast: true, reducedMotion: true,
    ...overrides,
  });
  let state = d;
  const events = [];
  const pending = new Map();
  let nextTimer = 1;
  const clearTimeout = vi.fn(id => events.push(['clear', id]));
  const clearTimer = loadProductionFunction('clearDissectionCanvasTimer', { clearTimeout });
  const schedule = loadProductionFunction('scheduleDissectionCanvasTimer', {
    clearDissectionCanvasTimer: clearTimer,
    setTimeout: (callback, delay) => { const id = nextTimer++; pending.set(id, { callback, delay }); return id; },
  });
  const canvas = { _drawD: d };
  const otherCanvas = { _drawD: { specimen: 'pig' } };
  const callbacks = Object.fromEntries([...playbackNames, 'layerTransition'].map(name => [name, vi.fn()]));
  const timers = Object.fromEntries(Object.entries(callbacks).map(([name, callback]) => [name, schedule(canvas, name, callback, 2000)]));
  const otherCallback = vi.fn();
  const otherTimer = schedule(otherCanvas, 'procedureReplay', otherCallback, 2000);
  events.length = 0;
  clearTimeout.mockClear();
  const reviews = Object.create(null);
  reviews['other-owner'] = { scope: 'other lab scope' };
  const updMany = vi.fn(patch => {
    events.push(['patch', patch]);
    state = { ...state, ...patch };
    canvas._drawD = state;
  });
  const feedback = vi.fn();
  const focus = vi.fn();
  const bindings = {
    d, specimen: 'frog', activeLayer: 'skin', workspaceMode: d.workspaceMode,
    advancedWorkspace: d.workspaceMode === 'advanced', canvasRefNode: canvasPresent ? canvas : null,
    activeInstrument: d.activeInstrument, currentProcedure: d.procedureByLayer.skin,
    procedureScenario: d.procedureScenario, procedureProtocol: { recommendedView },
    ADVANCED_SCENARIOS: scenarios, _disScenarioRestartReviews: reviews, dissectionSaveOwner: 'this-owner',
    Date: { now: () => now }, updMany, setProcedureFeedback: feedback, focusDissectionTarget: focus,
    queryDissectionNode: selector => selector === '[data-diss-canvas]' && canvasPresent ? canvas : null,
    clearDissectionCanvasTimer: clearTimer,
    nextProcedureInfo: () => ({ action: nextAction }), procedureInstrumentForAction: action => action,
    procedureGuidePoints: () => [{ x: 0.5, y: 0.3 }, { x: 0.5, y: 0.5 }, { x: 0.5, y: 0.7 }],
    specimenCondition: d.specimenCondition, variationSeed: d.variationSeed, currentLayerIdx: 0,
    spec: { bodyShape: 'frog', layers: [{ id: 'skin' }, { id: 'organs' }] },
  };
  for (const name of ['clampTissueMetric', 'tissueVariantDefinition', 'defaultTissueState', 'normalizeTissueState',
    'procedureScenarioRestartScope', 'currentScenarioDefinition', 'activateProcedureScenario',
    'requestProcedureScenarioRestart', 'cancelProcedureScenarioRestart', 'confirmProcedureScenarioRestart',
    'handleProcedureScenarioRestartKey']) {
    bindings[name] = loadProductionFunction(name, bindings);
  }
  function fire(id) { pending.get(id).callback(); }
  function expectPlaybackUnchanged() {
    for (const name of playbackNames) expect(canvas._dissTimers[name]).toBe(timers[name]);
    expect(clearTimeout).not.toHaveBeenCalled();
    expect(state._procedureReplay).toBe(d._procedureReplay);
    expect(state._procedureDemo).toBe(d._procedureDemo);
    expect(state.compareReplayPlaying).toBe(d.compareReplayPlaying);
    expect(state.compareReplayProgress).toBe(d.compareReplayProgress);
  }
  return { d, get state() { return state; }, bindings, canvas, otherCanvas, callbacks, timers,
    otherCallback, otherTimer, reviews, updMany, feedback, focus, clearTimeout, events, fire, schedule,
    expectPlaybackUnchanged,
    activate: bindings.activateProcedureScenario, request: bindings.requestProcedureScenarioRestart,
    cancel: bindings.cancelProcedureScenarioRestart, confirm: bindings.confirmProcedureScenarioRestart,
    escape: bindings.handleProcedureScenarioRestartKey,
    scenario: id => scenarios.find(scenario => scenario.id === id),
  };
}

describe('scenario playback lifecycle', () => {
  it.each([false, true])('stops all presentation playback in one atomic scenario update (restart %s)', restart => {
    const h = fixture();
    h.activate(h.scenario('precision-access'), restart);
    expect(h.updMany).toHaveBeenCalledOnce();
    expect(h.updMany.mock.calls[0][0]).toMatchObject({ _procedureReplay: null, _procedureDemo: null, compareReplayPlaying: false });
    expect(h.state.compareReplayProgress).toBe(0.42);
    expect(h.events.slice(0, 3)).toEqual(playbackNames.map(name => ['clear', h.timers[name]]));
    expect(h.events[3][0]).toBe('patch');
    expect(h.events).toHaveLength(4);
  });

  it('blocks already queued callbacks from the previous attempt but preserves unrelated timers and owners', () => {
    const h = fixture();
    h.activate(h.scenario('precision-access'), true);
    for (const name of playbackNames) {
      expect(h.canvas._dissTimers).not.toHaveProperty(name);
      // Run the callback even after cancellation to model an already queued task.
      h.fire(h.timers[name]);
      expect(h.callbacks[name]).not.toHaveBeenCalled();
    }
    expect(h.canvas._dissTimers.layerTransition).toBe(h.timers.layerTransition);
    expect(h.otherCanvas._dissTimers.procedureReplay).toBe(h.otherTimer);
    h.fire(h.timers.layerTransition);
    h.fire(h.otherTimer);
    expect(h.callbacks.layerTransition).toHaveBeenCalledOnce();
    expect(h.otherCallback).toHaveBeenCalledOnce();
    expect(h.reviews['other-owner']).toEqual({ scope: 'other lab scope' });
  });

  it('does not let an old callback consume a new replay timer with the same name', () => {
    const h = fixture();
    h.activate(h.scenario('precision-access'), false);
    const replacement = vi.fn();
    const replacementTimer = h.schedule(h.canvas, 'procedureReplay', replacement, 2500);
    h.fire(h.timers.procedureReplay);
    expect(h.callbacks.procedureReplay).not.toHaveBeenCalled();
    expect(replacement).not.toHaveBeenCalled();
    expect(h.canvas._dissTimers.procedureReplay).toBe(replacementTimer);
    h.fire(replacementTimer);
    expect(replacement).toHaveBeenCalledOnce();
  });

  it('selects a scenario while retaining all recorded work, selections and accessibility settings', () => {
    const h = fixture();
    h.activate(h.scenario('preservation'), false);
    expect(h.state).toEqual({ ...h.d,
      procedureScenario: 'preservation', scenarioStartedAt: now, scenarioTimeRemaining: 0, scenarioCompletedAt: 0,
      _procedureReplay: null, _procedureDemo: null, compareReplayPlaying: false,
    });
    expect(h.state.procedureByLayer).toBe(h.d.procedureByLayer);
    expect(h.feedback).toHaveBeenCalledExactlyOnceWith('Scenario selected: Preservation challenge. ' + h.scenario('preservation').prompt, 'working');
  });

  it('restarts only the active layer and current specimen inspections, retaining notes, archive and comparison position', () => {
    const h = fixture();
    h.activate(h.scenario('precision-access'), true);
    const fresh = h.state.procedureByLayer.skin;
    expect(fresh).toEqual({
      inspected: false, incisionStarted: false, incisionExtended: false, retracted: false,
      pins: [], probed: false, errors: 0, protocolDeviations: 0,
      history: [], actionLog: [], cautionLog: [], learningChecks: {}, tissueState: h.bindings.defaultTissueState(),
    });
    expect(h.state).toEqual({ ...h.d,
      procedureScenario: 'precision-access', scenarioStartedAt: now, scenarioTimeRemaining: 0, scenarioCompletedAt: 0,
      _procedureReplay: null, _procedureDemo: null, compareReplayPlaying: false,
      procedureByLayer: { ...h.d.procedureByLayer, skin: fresh },
      exploredOrgans: { 'pig|heart': true }, selectedOrgan: null,
      relationshipTraceIndex: 0, relationshipTraceCount: 0, compareTechniqueAttempts: false,
    });
    expect(h.state.procedureByLayer.organs).toBe(h.d.procedureByLayer.organs);
    expect(h.feedback.mock.calls[0][0]).toMatch(/^Scenario restarted:/);
  });

  it('uses the default scenario and clears obsolete playback even before the canvas mounts', () => {
    const h = fixture({}, { canvasPresent: false });
    h.activate(null, false);
    expect(h.state.procedureScenario).toBe('precision-access');
    expect(h.state._procedureReplay).toBeNull();
    expect(h.state._procedureDemo).toBeNull();
    expect(h.state.compareReplayPlaying).toBe(false);
    expect(h.clearTimeout).not.toHaveBeenCalled();
    expect(h.updMany).toHaveBeenCalledOnce();
  });

  it.each(['dorsal', 'ventral'])('retains saved technique while requiring a new observation for orientation rescue (%s target)', recommendedView => {
    const h = fixture({}, { recommendedView });
    h.activate(h.scenario('orientation-rescue'), false);
    expect(h.state.anatomicalView).toBe(recommendedView === 'dorsal' ? 'ventral' : 'dorsal');
    expect(h.state.procedureByLayer.skin).toEqual({ ...h.d.procedureByLayer.skin,
      orientationRecheckRequired: true, learningChecks: { incision: true },
    });
    expect(h.state.procedureByLayer.skin.actionLog).toBe(h.d.procedureByLayer.skin.actionLog);
    expect(h.state._procedureReplay).toBeNull();
  });

  it.each([false, true])('applies obscured field conditions after selection or restart (%s)', restart => {
    const h = fixture();
    h.activate(h.scenario('obscured-field'), restart);
    const fresh = h.state.procedureByLayer.skin;
    expect(fresh.tissueState).toMatchObject({ clarity: 32, moisture: 78, salineDrops: 3, risk: 48 });
    expect(fresh.tissueState.stability).toBe(restart ? 18 : 44);
    expect(fresh.dropperPoint).toEqual({ x: 0.5, y: 0.5 });
    expect(fresh.fieldWicked).toBe(false);
    expect(fresh.actionLog).toEqual(restart ? [] : h.d.procedureByLayer.skin.actionLog);
    expect(h.d.procedureByLayer.skin.tissueState).toEqual({ clarity: 80, moisture: 66, stability: 70, risk: 20 });
    expect(h.state._procedureDemo).toBeNull();
  });

  it.each([false, true])('starts the four-minute clock with playback stopped (restart %s)', restart => {
    const h = fixture();
    h.activate(h.scenario('timed-practical'), restart);
    expect(h.state.scenarioStartedAt).toBe(now);
    expect(h.state.scenarioTimeRemaining).toBe(240);
    expect(h.state.scenarioCompletedAt).toBe(0);
    expect(h.state.compareReplayPlaying).toBe(false);
    expect(h.state.compareReplayProgress).toBe(0.42);
  });

  it.each([
    ['dropper', 'scalpel', 'scalpel'], ['wick', 'complete', 'probe'], ['probe', 'scalpel', 'probe'],
  ])('keeps restricted tray instrument selection coherent (%s, next %s)', (activeInstrument, nextAction, expected) => {
    const h = fixture({ activeInstrument }, { nextAction });
    h.activate(h.scenario('restricted-tray'), false);
    expect(h.state.activeInstrument).toBe(expected);
    expect(h.state.procedureByLayer).toBe(h.d.procedureByLayer);
    expect(h.state._procedureReplay).toBeNull();
  });

  it('opens and cancels restart review without stopping playback or changing saved work', () => {
    const h = fixture();
    h.request();
    const review = h.reviews['this-owner'];
    expect(review).toBeDefined();
    h.expectPlaybackUnchanged();
    expect(h.state).toEqual(h.d);
    h.cancel(review);
    expect(h.reviews['this-owner']).toBeUndefined();
    h.expectPlaybackUnchanged();
    expect(h.state).toEqual(h.d);
    expect(h.updMany.mock.calls).toEqual([[{}], [{}]]);
    expect(h.feedback).not.toHaveBeenCalled();
    expect(h.focus.mock.calls).toEqual([['diss-scenario-restart-cancel'], ['diss-scenario-restart']]);
  });

  it('Escape cancels a restart review without affecting any playback', () => {
    const h = fixture();
    h.request();
    const event = { key: 'Escape', preventDefault: vi.fn(), stopPropagation: vi.fn() };
    h.escape(event, h.reviews['this-owner']);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
    expect(h.reviews['this-owner']).toBeUndefined();
    h.expectPlaybackUnchanged();
    expect(h.state).toEqual(h.d);
  });

  it('ignores queued confirm, cancel and Escape handlers from a replaced review', () => {
    const h = fixture();
    h.request();
    const oldReview = h.reviews['this-owner'];
    h.cancel(oldReview);
    h.request();
    const currentReview = h.reviews['this-owner'];
    h.updMany.mockClear();
    h.focus.mockClear();
    h.confirm(oldReview);
    h.cancel(oldReview);
    const event = { key: 'Escape', preventDefault: vi.fn(), stopPropagation: vi.fn() };
    h.escape(event, oldReview);
    expect(h.reviews['this-owner']).toBe(currentReview);
    expect(h.updMany).not.toHaveBeenCalled();
    expect(h.focus).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
    h.expectPlaybackUnchanged();
  });

  it.each([
    ['specimen', { specimen: 'pig' }], ['layer', { activeLayer: 'organs' }],
    ['scenario', { procedureScenario: 'preservation' }], ['workspace', { workspaceMode: 'essentials' }],
    ['quiz mode', { quizMode: true }], ['practical mode', { practicalMode: true }],
    ['recorded technique', { procedureByLayer: { skin: { history: ['probe'] } } }],
  ])('rejects stale restart confirmation after the live %s changes without canceling playback', (_label, patch) => {
    const h = fixture();
    h.request();
    const review = h.reviews['this-owner'];
    h.canvas._drawD = { ...h.state, ...patch };
    h.confirm(review);
    expect(h.reviews['this-owner']).toBeUndefined();
    h.expectPlaybackUnchanged();
    expect(h.state).toEqual(h.d);
    expect(h.updMany.mock.calls).toEqual([[{}], [{}]]);
    expect(h.feedback).not.toHaveBeenCalled();
  });

  it('only stops playback after a current restart review is confirmed', () => {
    const h = fixture();
    h.request();
    h.expectPlaybackUnchanged();
    h.confirm(h.reviews['this-owner']);
    expect(h.reviews['this-owner']).toBeUndefined();
    expect(h.state._procedureReplay).toBeNull();
    expect(h.state._procedureDemo).toBeNull();
    expect(h.state.compareReplayPlaying).toBe(false);
    expect(h.state.procedureByLayer.skin.actionLog).toEqual([]);
    expect(h.updMany).toHaveBeenCalledTimes(2);
    for (const name of playbackNames) h.fire(h.timers[name]);
    for (const name of playbackNames) expect(h.callbacks[name]).not.toHaveBeenCalled();
    expect(h.focus).toHaveBeenLastCalledWith('diss-scenario-restart');
  });

  it.each([{ workspaceMode: 'essentials' }, { quizMode: true }, { practicalMode: true }])('does not open restart review when unavailable (%j)', overrides => {
    const h = fixture(overrides);
    h.request();
    expect(h.reviews['this-owner']).toBeUndefined();
    expect(h.updMany).not.toHaveBeenCalled();
    expect(h.focus).not.toHaveBeenCalled();
    h.expectPlaybackUnchanged();
  });
});
