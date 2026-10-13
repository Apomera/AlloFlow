import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');

// Run the production handler with bounded lab roots and its actual owned-timer
// contract. The test does not replace its guards or focus behavior.
function loadProductionFunction(name, bindings) {
  const matches = [...source.matchAll(new RegExp('^([ \\t]*)function ' + name + '\\(', 'gm'))];
  if (matches.length !== 1) throw new Error('Expected one production function: ' + name);
  const match = matches[0];
  const start = match.index + match[1].length;
  const ending = '\n' + match[1] + '}';
  const end = source.indexOf(ending, start);
  if (end < start) throw new Error('Missing function ending: ' + name);
  return new Function(...Object.keys(bindings), '"use strict"; return (' + source.slice(start, end + ending.length) + ');')(...Object.values(bindings));
}

const shelfPatch = Object.freeze({ toolbarViewOpen: true, toolbarToolsOpen: false, toolbarStudyOpen: false });
const changedContexts = [
  ['quiz assessment', { quizMode: true }],
  ['timed practical', { practicalMode: true }],
  ['specimen', { specimen: 'earthworm' }],
  ['layer', { activeLayer: 'muscle' }],
  ['selected organ', { selectedOrgan: 'liver' }],
  ['pinned organ', { lensPinnedOrganId: 'heart' }],
  ['focus depth', { lensFocusDepth: 'deep' }],
  ['magnification', { lensMagnification: 4 }],
  ['illumination', { lightIntensity: 61 }],
  ['workspace mode', { workspaceMode: 'essentials' }],
];

function opticalReview(options = {}) {
  const saved = Object.freeze({
    specimen: 'frog', activeLayer: 'skin', quizMode: false, practicalMode: false,
    selectedOrgan: 'heart', lensPinnedOrganId: null, lensFocusDepth: 'surface',
    lensMagnification: 2, lightIntensity: 60, workspaceMode: 'advanced',
    toolbarViewOpen: false, toolbarToolsOpen: true, toolbarStudyOpen: false,
    activeInstrument: 'probe', anatomicalView: 'ventral',
    toolCalibration: Object.freeze({ probePressure: 30 }),
    procedureByLayer: Object.freeze({ skin: Object.freeze({ inspected: true, probed: false }) }),
    organNotes: Object.freeze({ heart: 'Retain this observation' }),
    visualEvidence: Object.freeze([Object.freeze({ id: 'saved-capture' })]),
    ...options.data,
  });
  const fieldReadinessContext = Object.freeze({ ...saved });
  const original = JSON.stringify(saved);
  const forbidden = vi.fn(() => { throw new Error('Illumination review must only open its shelf and focus its own slider.'); });
  const root = { name: 'originating lab', isConnected: true };
  const otherRoot = { name: 'other lab', isConnected: true };
  const current = { root };
  const originRoot = { root };
  const document = { body: {}, activeElement: null, querySelector: forbidden, getElementById: forbidden };
  const origin = {
    name: 'Review illumination', ownerDocument: document,
    getClientRects: vi.fn(() => [{ x: 10, y: 100, width: 220, height: 48 }]),
    closest: vi.fn(selector => {
      expect(selector).toBe('[data-dissection-root]');
      return originRoot.root;
    }),
  };
  const otherOrigin = { name: 'Other lab action', ownerDocument: document, closest: vi.fn(() => otherRoot) };
  const localControl = { name: 'Another control in this lab' };
  document.activeElement = origin;
  const canvas = { _drawD: saved };
  const otherCanvas = { _drawD: saved };
  const target = {
    id: 'diss-light-intensity-range', disabled: false,
    getClientRects: vi.fn(() => [{ x: 10, y: 80, width: 220, height: 48 }]),
    scrollIntoView: vi.fn(),
    focus: vi.fn(() => { document.activeElement = target; }),
  };
  const otherTarget = { id: 'diss-light-intensity-range', focus: forbidden, scrollIntoView: forbidden };
  const members = new Set([origin, localControl, canvas, target]);
  root.contains = node => members.has(node);
  otherRoot.contains = node => [otherOrigin, otherCanvas, otherTarget].includes(node);
  const canvases = new Map([[root, canvas], [otherRoot, otherCanvas]]);
  const targets = new Map([[root, target], [otherRoot, otherTarget]]);
  const query = vi.fn((scope, selector) => {
    if (selector === '[data-diss-canvas]') return canvases.get(scope) || null;
    if (selector === '#diss-light-intensity-range') return targets.get(scope) || null;
    throw new Error('Unexpected scoped query: ' + selector);
  });
  const ownedTimers = new Map();
  const schedule = vi.fn((owner, key, callback, delay) => {
    expect(owner).toBe(canvas);
    expect(key).toBe('opticalIlluminationFocus');
    expect(delay).toBe(0);
    ownedTimers.set(key, callback);
  });
  const updMany = vi.fn(patch => {
    expect(patch).toEqual(shelfPatch);
    canvas._drawD = Object.freeze({ ...(canvas._drawD || saved), ...patch });
  });
  const review = loadProductionFunction('reviewOpticalIllumination', {
    fieldReadinessContext,
    // The canvas can normalize its working copy after render; navigation belongs
    // to the captured raw context and live snapshot, not that mutable copy.
    d: { ...saved, selectedOrgan: 'liver', lightIntensity: 68 },
    currentDissectionRootNode: () => current.root, scopedDissectionQuery: query,
    scheduleDissectionCanvasTimer: schedule, updMany,
    document, window: { setTimeout: forbidden },
    upd: forbidden, setProcedureFeedback: forbidden, updateProcedure: forbidden,
    focusDissectionTarget: forbidden, setTimeout: forbidden, clearTimeout: forbidden,
    selectProcedureInstrument: forbidden, changeAnatomicalView: forbidden,
  });
  function flushOne() {
    const callback = ownedTimers.get('opticalIlluminationFocus');
    if (!callback) throw new Error('No owned optical-focus callback is pending');
    ownedTimers.delete('opticalIlluminationFocus');
    callback();
  }
  function expectPreserved() {
    expect(JSON.stringify(saved)).toBe(original);
    expect(otherCanvas._drawD).toBe(saved);
    expect(forbidden).not.toHaveBeenCalled();
  }
  function expectNoFocus() {
    expect(target.focus).not.toHaveBeenCalled();
    expect(target.scrollIntoView).not.toHaveBeenCalled();
    expectPreserved();
  }
  function expectNoActions() {
    expect(updMany).not.toHaveBeenCalled();
    expect(schedule).not.toHaveBeenCalled();
    expectNoFocus();
  }
  function expectFocused() {
    expect(target.focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
    expect(target.scrollIntoView).toHaveBeenCalledExactlyOnceWith({ block: 'center', behavior: 'auto' });
    expect(document.activeElement).toBe(target);
    expect(ownedTimers.size).toBe(0);
    expectPreserved();
  }
  return { saved, fieldReadinessContext, root, otherRoot, current, originRoot,
    origin, otherOrigin, localControl, canvas, otherCanvas, target, members, canvases, targets,
    query, document, ownedTimers, schedule, updMany, review, event: { currentTarget: origin },
    flushOne, expectPreserved, expectNoFocus, expectNoActions, expectFocused };
}

describe('dissection optical illumination destination', () => {
  it('opens only the view shelf and focuses its live illumination slider on the owned callback', () => {
    const h = opticalReview();
    h.review(h.event);
    expect(h.updMany).toHaveBeenCalledExactlyOnceWith(shelfPatch);
    expect(h.schedule).toHaveBeenCalledOnce();
    h.expectNoFocus();
    h.flushOne();
    h.expectFocused();
    expect(h.canvas._drawD).toEqual({ ...h.saved, ...shelfPatch });
    expect(h.query.mock.calls.every(([scope]) => scope === h.root)).toBe(true);
  });

  it('uses captured render context when the canvas has no live snapshot', () => {
    const h = opticalReview();
    delete h.canvas._drawD;
    h.review(h.event);
    delete h.canvas._drawD;
    h.flushOne();
    h.expectFocused();
    expect(h.fieldReadinessContext.selectedOrgan).toBe('heart');
    expect(h.fieldReadinessContext.lightIntensity).toBe(60);
    expect(h.canvas).not.toHaveProperty('_drawD');
  });

  it('preserves newer notes and calibration without changing optical settings or recording work', () => {
    const h = opticalReview();
    const notes = Object.freeze({ ...h.saved.organNotes, liver: 'Later learner note' });
    const calibration = Object.freeze({ probePressure: 25 });
    const latest = Object.freeze({ ...h.saved, organNotes: notes, toolCalibration: calibration });
    h.canvas._drawD = latest;
    h.review(h.event);
    h.flushOne();
    h.expectFocused();
    expect(h.canvas._drawD).toEqual({ ...latest, ...shelfPatch });
    expect(h.canvas._drawD.organNotes).toBe(notes);
    expect(h.canvas._drawD.toolCalibration).toBe(calibration);
    expect(h.canvas._drawD.procedureByLayer).toBe(h.saved.procedureByLayer);
    expect(h.canvas._drawD.visualEvidence).toBe(h.saved.visualEvidence);
  });

  it.each([
    ['missing event', h => { h.event = undefined; }],
    ['missing origin', h => { h.event = {}; }],
    ['origin without a DOM lookup', h => { delete h.origin.closest; }],
    ['origin outside a lab', h => { h.originRoot.root = null; }],
    ['detached origin', h => { h.members.delete(h.origin); }],
    ['hidden origin', h => { h.origin.getClientRects.mockReturnValue([]); }],
    ['detached root', h => { h.root.isConnected = false; }],
    ['missing current root', h => { h.current.root = null; }],
    ['replaced root', h => { h.current.root = h.otherRoot; }],
    ['foreign origin', h => { h.event = { currentTarget: h.otherOrigin }; }],
    ['missing canvas', h => { h.canvases.delete(h.root); }],
  ])('rejects a %s before opening a shelf or scheduling focus', (_label, change) => {
    const h = opticalReview();
    change(h);
    h.review(h.event);
    h.expectNoActions();
    expect(h.query.mock.calls.some(([, selector]) => selector === '#diss-light-intensity-range')).toBe(false);
  });

  it.each(changedContexts)('rejects a changed %s before navigation', (_label, patch) => {
    const h = opticalReview();
    const latest = Object.freeze({ ...h.saved, ...patch });
    h.canvas._drawD = latest;
    h.review(h.event);
    h.expectNoActions();
    expect(h.canvas._drawD).toBe(latest);
  });

  it.each(['quizMode', 'practicalMode'])('keeps the %s guard with no canvas snapshot', flag => {
    const h = opticalReview({ data: { [flag]: true } });
    delete h.canvas._drawD;
    h.review(h.event);
    h.expectNoActions();
  });
});

describe('dissection optical illumination deferred focus ownership', () => {
  it.each([
    ['root detachment', h => { h.root.isConnected = false; }],
    ['root replacement', h => { h.current.root = h.otherRoot; }],
    ['origin detachment', h => { h.members.delete(h.origin); }],
    ['origin hiding', h => { h.origin.getClientRects.mockReturnValue([]); }],
    ['canvas replacement', h => { h.canvases.set(h.root, { _drawD: h.canvas._drawD }); }],
    ['canvas removal', h => { h.canvases.delete(h.root); }],
  ])('abandons focus after %s', (_label, change) => {
    const h = opticalReview();
    h.review(h.event);
    change(h);
    h.flushOne();
    h.expectNoFocus();
    expect(h.schedule).toHaveBeenCalledOnce();
    expect(h.updMany).toHaveBeenCalledOnce();
    expect(h.ownedTimers.size).toBe(0);
  });

  it.each(changedContexts)('abandons focus when %s changes during shelf rendering', (_label, patch) => {
    const h = opticalReview();
    h.review(h.event);
    const latest = Object.freeze({ ...h.canvas._drawD, ...patch });
    h.canvas._drawD = latest;
    h.flushOne();
    h.expectNoFocus();
    expect(h.schedule).toHaveBeenCalledOnce();
    expect(h.ownedTimers.size).toBe(0);
    expect(h.canvas._drawD).toBe(latest);
  });

  it.each(['local', 'foreign'])('respects focus moved to a %s control', location => {
    const h = opticalReview();
    h.review(h.event);
    const chosen = location === 'local' ? h.localControl : h.otherOrigin;
    h.document.activeElement = chosen;
    h.flushOne();
    h.expectNoFocus();
    expect(h.document.activeElement).toBe(chosen);
    expect(h.schedule).toHaveBeenCalledOnce();
    expect(h.ownedTimers.size).toBe(0);
  });

  it.each(['body', 'target'])('permits the %s focus state during the controlled handoff', location => {
    const h = opticalReview();
    h.review(h.event);
    h.document.activeElement = location === 'body' ? h.document.body : h.target;
    h.flushOne();
    h.expectFocused();
  });

  it.each([
    ['disabled', h => { h.target.disabled = true; }],
    ['hidden', h => { h.target.getClientRects.mockReturnValue([]); }],
  ])('stops immediately for a %s slider without retries or focus', (_label, change) => {
    const h = opticalReview();
    h.review(h.event);
    change(h);
    h.flushOne();
    h.expectNoFocus();
    expect(h.schedule).toHaveBeenCalledOnce();
    expect(h.ownedTimers.size).toBe(0);
  });

  it('focuses a slider that appears on the last permitted rendering attempt', () => {
    const h = opticalReview();
    h.targets.delete(h.root);
    h.review(h.event);
    h.document.activeElement = h.document.body;
    h.flushOne();
    h.flushOne();
    h.expectNoFocus();
    h.targets.set(h.root, h.target);
    h.flushOne();
    h.expectFocused();
    expect(h.schedule).toHaveBeenCalledTimes(3);
    expect(h.updMany).toHaveBeenCalledOnce();
  });

  it('stops after two retries if the scoped slider never appears', () => {
    const h = opticalReview();
    h.targets.delete(h.root);
    h.review(h.event);
    h.flushOne();
    h.flushOne();
    h.flushOne();
    h.expectNoFocus();
    expect(h.schedule).toHaveBeenCalledTimes(3);
    expect(h.updMany).toHaveBeenCalledOnce();
    expect(h.ownedTimers.size).toBe(0);
    expect(h.query.mock.calls.every(([scope]) => scope === h.root)).toBe(true);
  });

  it('rechecks focus ownership between retries before looking for a newly mounted slider', () => {
    const h = opticalReview();
    h.targets.delete(h.root);
    h.review(h.event);
    h.flushOne();
    h.document.activeElement = h.localControl;
    h.targets.set(h.root, h.target);
    h.flushOne();
    h.expectNoFocus();
    expect(h.schedule).toHaveBeenCalledTimes(2);
    expect(h.ownedTimers.size).toBe(0);
  });
});
