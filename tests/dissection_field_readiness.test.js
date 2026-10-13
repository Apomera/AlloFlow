import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');

// Run the production functions with two bounded lab roots. A missing or
// ambiguous function fails instead of replacing production behavior.
function loadProductionFunction(name, bindings) {
  const declarations = [...source.matchAll(new RegExp('^([ \\t]*)function ' + name + '\\(', 'gm'))];
  if (declarations.length !== 1) throw new Error('Expected one production function: ' + name);
  const declaration = declarations[0];
  const start = declaration.index + declaration[1].length;
  const ending = '\n' + declaration[1] + '}';
  const end = source.indexOf(ending, start);
  if (end < start) throw new Error('Missing function ending: ' + name);
  return new Function(...Object.keys(bindings), '"use strict"; return (' + source.slice(start, end + ending.length) + ');')(...Object.values(bindings));
}

function field(options = {}) {
  const d = Object.freeze({
    specimen: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal',
    quizMode: false, practicalMode: false,
    procedureByLayer: Object.freeze({ skin: Object.freeze({ inspected: true }) }),
    revealedLayers: Object.freeze({}), procedureScenario: 'standard', procedureMode: 'guided',
    activeInstrument: 'probe', toolCalibration: Object.freeze({ pressure: 40 }),
    workspaceMode: 'advanced', selectedOrgan: null, lensFocusDepth: 50,
    lensMagnification: 2, lightIntensity: 60, specimenCondition: 'preserved',
    organNotes: Object.freeze({ heart: 'Retain this observation' }),
    ...options.data,
  });
  // Canvas drawing may replace the closure's working copy with Essentials
  // defaults. The action belongs to the raw state captured when it rendered.
  const fieldReadinessContext = Object.freeze({ ...d });
  const renderedData = Object.freeze({ ...d, ...options.renderData });
  const forbidden = vi.fn(() => { throw new Error('Field navigation must stay within its own lab and existing planner'); });
  const root = { name: 'originating lab', isConnected: true };
  const foreignRoot = { name: 'other lab', isConnected: true };
  const document = { body: { name: 'body' }, querySelector: forbidden, getElementById: forbidden };
  const origin = { name: 'readiness action', ownerDocument: document };
  const foreignOrigin = { name: 'other readiness action', ownerDocument: document };
  document.activeElement = origin;
  const canvas = { _drawD: d };
  const foreignCanvas = { _drawD: d };
  const current = { root };
  const targetIds = ['diss-view-cycle', 'diss-light-intensity-range', 'diss-lens-focus-depth', 'diss-field-tissue', 'diss-learning-checkpoint', 'diss-instrument-scalpel'];
  const targets = new Map(targetIds.map(id => {
    const target = { id, scrollIntoView: vi.fn() };
    target.focus = vi.fn(() => { document.activeElement = target; });
    return [id, target];
  }));
  root.contains = node => node === origin || node === canvas || [...targets.values()].includes(node);
  foreignRoot.contains = node => node === foreignOrigin || node === foreignCanvas;
  const canvases = new Map([[root, canvas], [foreignRoot, foreignCanvas]]);
  const query = vi.fn((scope, selector) => {
    if (selector === '[data-diss-canvas]') return canvases.get(scope) || null;
    return scope === root && selector.startsWith('#') ? targets.get(selector.slice(1)) || null : null;
  });
  const ownedTimers = new Map();
  const schedule = vi.fn((owner, key, callback, delay) => {
    expect(owner).toBe(canvas);
    expect(key).toBe('fieldReadinessFocus');
    expect(delay).toBe(0);
    ownedTimers.set(key, callback);
  });
  const updMany = vi.fn(patch => { canvas._drawD = { ...(canvas._drawD || d), ...patch }; });
  const upd = vi.fn((key, value) => { canvas._drawD = { ...(canvas._drawD || d), [key]: value }; });
  const feedback = vi.fn();
  const defaultFocus = vi.fn();
  const next = options.next || { action: 'incise', label: 'Open the access route' };
  const gate = options.gate || { required: false };
  const currentProcedure = d.procedureByLayer.skin;
  const gateFor = vi.fn(() => gate);
  const planner = loadProductionFunction('prepareNextProcedureStep', {
    nextProcedureInfo: () => next, procedureLearningGateFor: gateFor, currentProcedure,
    procedureInstrumentForAction: () => 'scalpel', PROCEDURE_INSTRUMENTS: [{ id: 'scalpel', label: 'Scalpel' }],
    focusDissectionTarget: defaultFocus, setProcedureFeedback: feedback, upd,
  });
  const prepare = vi.fn(planner);
  const checks = ['view', 'optics', 'tissue', 'tool'].map(id => ({ id, label: id, ready: options.ready ?? true, detail: id + ' evidence' }));
  const resolve = loadProductionFunction('resolveFieldReadinessIssue', {
    d: renderedData, fieldReadinessContext, specimen: d.specimen, activeLayer: d.activeLayer,
    stageHandoffUsesTool: options.usesTool ?? true,
    fieldReadinessChecks: checks,
    currentDissectionRootNode: () => current.root, scopedDissectionQuery: query,
    procedureProtocol: { recommendedView: 'ventral' },
    currentIllumination: { glareRisk: options.glare ?? 10, score: options.illumination ?? 90 },
    currentOpticalInspection: { suggestion: 'Adjust the focus plane.' },
    prepareNextProcedureStep: prepare, scheduleDissectionCanvasTimer: schedule,
    setProcedureFeedback: feedback, updMany,
    document: { querySelector: forbidden, getElementById: forbidden },
    focusDissectionTarget: forbidden, setTimeout: forbidden, clearTimeout: forbidden,
    changeAnatomicalView: forbidden, selectProcedureInstrument: forbidden,
  });
  function flushOne() {
    const callback = ownedTimers.get('fieldReadinessFocus');
    if (!callback) throw new Error('No owned focus timer is pending');
    ownedTimers.delete('fieldReadinessFocus');
    callback();
  }
  function expectNoActions(label = '') {
    [updMany, upd, feedback, prepare, schedule, defaultFocus, forbidden].forEach(fn => expect(fn, label).not.toHaveBeenCalled());
    expect(foreignCanvas._drawD).toBe(d);
  }
  function expectNoFocus() {
    targets.forEach(target => {
      expect(target.focus).not.toHaveBeenCalled();
      expect(target.scrollIntoView).not.toHaveBeenCalled();
    });
    expect(defaultFocus).not.toHaveBeenCalled();
    expect(forbidden).not.toHaveBeenCalled();
  }
  return { d, renderedData, fieldReadinessContext, root, foreignRoot, origin, foreignOrigin, canvas, foreignCanvas, document, current, canvases,
    targets, query, ownedTimers, schedule, updMany, upd, feedback, defaultFocus, forbidden, prepare, planner,
    gateFor, currentProcedure, checks, resolve, event: { currentTarget: origin }, flushOne, expectNoActions, expectNoFocus };
}

describe('dissection field readiness destinations', () => {
  it.each([
    ['view', 'diss-view-cycle'], ['optics', 'diss-lens-focus-depth'],
    ['tissue', 'diss-field-tissue'], ['tool', 'diss-instrument-scalpel'],
  ])('opens the explicit %s destination even when every check passes', (check, targetId) => {
    const h = field();
    h.resolve(check, h.event);
    h.expectNoFocus();
    h.flushOne();
    const target = h.targets.get(targetId);
    expect(target.focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
    expect(target.scrollIntoView).toHaveBeenCalledExactlyOnceWith({ block: 'center', behavior: 'auto' });
    expect(h.document.activeElement).toBe(target);
    expect(h.query.mock.calls.every(([scope]) => scope === h.root)).toBe(true);
    expect(h.canvas._drawD.procedureByLayer).toBe(h.d.procedureByLayer);
    expect(h.canvas._drawD.toolCalibration).toBe(h.d.toolCalibration);
    expect(h.canvas._drawD.anatomicalView).toBe(h.d.anatomicalView);
    expect(h.canvas._drawD.activeInstrument).toBe(h.d.activeInstrument);
    expect(h.canvas._drawD.organNotes).toBe(h.d.organNotes);
    expect(h.defaultFocus).not.toHaveBeenCalled();
    expect(h.forbidden).not.toHaveBeenCalled();
    if (check === 'view' || check === 'optics') {
      expect(h.updMany).toHaveBeenCalledExactlyOnceWith({ toolbarViewOpen: true, toolbarToolsOpen: false, toolbarStudyOpen: false });
    } else if (check === 'tool') {
      expect(h.prepare).toHaveBeenCalledWith(expect.any(Function));
      expect(h.upd).toHaveBeenCalledExactlyOnceWith('techniquePanelOpen', true);
    }
  });

  it('honors the selected check when a different check fails first', () => {
    const h = field({ ready: false });
    h.resolve('tissue', h.event);
    h.flushOne();
    expect(h.targets.get('diss-field-tissue').focus).toHaveBeenCalledOnce();
    expect(h.targets.get('diss-view-cycle').focus).not.toHaveBeenCalled();
    expect(h.feedback).toHaveBeenCalledWith(expect.stringContaining('tissue evidence'), 'working');
    expect(h.updMany).not.toHaveBeenCalled();
  });

  it.each([
    [58, 90, 'diss-light-intensity-range'],
    [57, 71, 'diss-light-intensity-range'],
    [57, 72, 'diss-lens-focus-depth'],
  ])('uses glare %s and illumination %s to choose the useful optics control', (glare, illumination, targetId) => {
    const h = field({ glare, illumination });
    h.resolve('optics', h.event);
    h.flushOne();
    expect(h.targets.get(targetId).focus).toHaveBeenCalledOnce();
    expect(h.feedback).toHaveBeenCalledWith('Review focus and illumination. Adjust the focus plane.', 'working');
  });

  it.each([
    ['prediction', { action: 'incise', label: 'Incise' }, { required: true, phase: 'plan' }, 'Choose a safe plan'],
    ['reflection', { action: 'incise', label: 'Incise' }, { required: true, phase: 'reflect' }, 'Explain the observed response'],
    ['final reflection', { action: 'complete' }, { required: true, phase: 'reflect' }, 'Explain the final observed response'],
  ])('keeps the %s gate and uses scoped focus through the existing planner', (_label, next, gate, message) => {
    const h = field({ next, gate });
    h.resolve('tool', h.event);
    expect(h.prepare).toHaveBeenCalledExactlyOnceWith(expect.any(Function));
    expect(h.gateFor).toHaveBeenCalledExactlyOnceWith(next.action, h.currentProcedure);
    expect(h.upd).not.toHaveBeenCalled();
    h.flushOne();
    expect(h.targets.get('diss-learning-checkpoint').focus).toHaveBeenCalledOnce();
    expect(h.targets.get('diss-instrument-scalpel').focus).not.toHaveBeenCalled();
    expect(h.feedback).toHaveBeenCalledExactlyOnceWith(expect.stringContaining(message), 'working');
    expect(h.defaultFocus).not.toHaveBeenCalled();
  });

  it('reports an already completed protocol without scheduling a destination', () => {
    const h = field({ next: { action: 'complete' } });
    h.resolve('tool', h.event);
    expect(h.feedback).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('protocol is complete'), 'success');
    expect(h.schedule).not.toHaveBeenCalled();
    expect(h.upd).not.toHaveBeenCalled();
    h.expectNoFocus();
  });

  it('retains the ordinary planner event path and its default focus helper', () => {
    const h = field();
    h.planner(h.event);
    expect(h.defaultFocus).toHaveBeenCalledExactlyOnceWith('diss-instrument-scalpel');
    expect(h.upd).toHaveBeenCalledExactlyOnceWith('techniquePanelOpen', true);
    expect(h.schedule).not.toHaveBeenCalled();
  });
});

describe('dissection field readiness stale control guards', () => {
  it('rejects missing, foreign, detached, and unavailable origins or lab surfaces', () => {
    const cases = [
      ['missing event', h => { h.event = undefined; }],
      ['missing origin', h => { h.event = {}; }],
      ['foreign origin', h => { h.event = { currentTarget: h.foreignOrigin }; }],
      ['missing root', h => { h.current.root = null; }],
      ['detached root', h => { h.root.isConnected = false; }],
      ['replaced root', h => { h.current.root = h.foreignRoot; }],
      ['missing canvas', h => { h.canvases.delete(h.root); }],
    ];
    for (const [label, change] of cases) {
      const h = field();
      change(h);
      h.resolve('view', h.event);
      h.expectNoActions(label);
    }
  });

  it('rejects unavailable checks and non-contact workflow stages', () => {
    for (const check of [undefined, null, 'unknown']) {
      const h = field();
      h.resolve(check, h.event);
      h.expectNoActions(String(check));
    }
    const h = field({ usesTool: false });
    h.resolve('tool', h.event);
    h.expectNoActions();
  });

  it('rejects assessments and changed specimen or layer identities', () => {
    for (const patch of [{ quizMode: true }, { practicalMode: true }, { specimen: 'earthworm' }, { activeLayer: 'muscle' }]) {
      const h = field();
      h.canvas._drawD = { ...h.d, ...patch };
      h.resolve('tool', h.event);
      h.expectNoActions(JSON.stringify(patch));
    }
  });

  it('rejects changes to each field context before taking any action', () => {
    const patches = {
      anatomicalView: 'ventral', procedureByLayer: {}, revealedLayers: {},
      procedureScenario: 'precision', procedureMode: 'free', activeInstrument: 'scalpel',
      toolCalibration: {}, workspaceMode: 'guided', selectedOrgan: 'heart',
      lensFocusDepth: 51, lensMagnification: 3, lightIntensity: 61, specimenCondition: 'fresh',
    };
    for (const [key, value] of Object.entries(patches)) {
      const h = field();
      h.canvas._drawD = { ...h.d, [key]: value };
      h.resolve('optics', h.event);
      h.expectNoActions(key);
    }
  });

  it('permits a newer note and preserves it while opening a destination', () => {
    const h = field();
    const notes = { ...h.d.organNotes, liver: 'A later observation' };
    h.canvas._drawD = { ...h.d, organNotes: notes };
    h.resolve('view', h.event);
    h.flushOne();
    expect(h.canvas._drawD.organNotes).toBe(notes);
    expect(h.targets.get('diss-view-cycle').focus).toHaveBeenCalledOnce();
  });

  it('uses the captured state when the originating canvas has no live snapshot', () => {
    const h = field();
    delete h.canvas._drawD;
    h.resolve('tissue', h.event);
    h.flushOne();
    expect(h.targets.get('diss-field-tissue').focus).toHaveBeenCalledOnce();
  });

  it('keeps Essentials navigation usable when canvas drawing normalizes the working data', () => {
    for (const hasLiveSnapshot of [true, false]) {
      const h = field({
        data: { workspaceMode: 'essentials', procedureMode: 'independent', specimenCondition: 'preserved' },
        renderData: { procedureMode: 'guided', specimenCondition: 'standard' },
      });
      if (!hasLiveSnapshot) delete h.canvas._drawD;
      expect(h.renderedData.procedureMode).toBe('guided');
      expect(h.renderedData.specimenCondition).toBe('standard');
      expect(h.fieldReadinessContext.procedureMode).toBe('independent');
      h.resolve('view', h.event);
      h.flushOne();
      expect(h.targets.get('diss-view-cycle').focus).toHaveBeenCalledOnce();
      expect(h.canvas._drawD.procedureMode).toBe('independent');
      expect(h.canvas._drawD.specimenCondition).toBe('preserved');
      expect(h.canvas._drawD.procedureByLayer).toBe(h.d.procedureByLayer);
      expect(h.defaultFocus).not.toHaveBeenCalled();
      expect(h.forbidden).not.toHaveBeenCalled();
    }
  });
});

describe('dissection field readiness delayed focus ownership', () => {
  it.each([
    ['unmount', h => { h.root.isConnected = false; }],
    ['root replacement', h => { h.current.root = h.foreignRoot; }],
    ['canvas replacement', h => { h.canvases.set(h.root, { _drawD: h.d }); }],
    ['context change', h => { h.canvas._drawD = { ...h.canvas._drawD, anatomicalView: 'ventral' }; }],
    ['assessment entry', h => { h.canvas._drawD = { ...h.canvas._drawD, quizMode: true }; }],
  ])('abandons delayed focus after %s', (_label, change) => {
    const h = field();
    h.resolve('tool', h.event);
    change(h);
    h.flushOne();
    h.expectNoFocus();
    expect(h.ownedTimers.size).toBe(0);
    expect(h.schedule).toHaveBeenCalledOnce();
  });

  it('does not steal focus after the learner chooses another control in either lab', () => {
    for (const destination of ['local', 'foreign']) {
      const h = field();
      h.resolve('view', h.event);
      h.document.activeElement = destination === 'local' ? h.targets.get('diss-field-tissue') : h.foreignOrigin;
      h.flushOne();
      h.expectNoFocus();
      expect(h.schedule).toHaveBeenCalledOnce();
    }
  });

  it('allows the body fallback during a render and focuses a target on the next attempt', () => {
    const h = field();
    const target = h.targets.get('diss-view-cycle');
    h.targets.delete(target.id);
    h.resolve('view', h.event);
    h.document.activeElement = h.document.body;
    h.flushOne();
    expect(target.focus).not.toHaveBeenCalled();
    h.targets.set(target.id, target);
    h.flushOne();
    expect(target.focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
    expect(h.schedule).toHaveBeenCalledTimes(2);
    expect(h.ownedTimers.size).toBe(0);
  });

  it('stops after two render retries when the scoped target stays missing', () => {
    const h = field();
    const target = h.targets.get('diss-view-cycle');
    h.targets.delete(target.id);
    h.resolve('view', h.event);
    h.flushOne();
    h.flushOne();
    h.flushOne();
    expect(h.schedule).toHaveBeenCalledTimes(3);
    expect(h.ownedTimers.size).toBe(0);
    expect(target.focus).not.toHaveBeenCalled();
    expect(h.query.mock.calls.every(([scope]) => scope === h.root)).toBe(true);
    h.expectNoFocus();
  });
});
