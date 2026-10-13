import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');

// Execute the production helpers and handler. A missing or ambiguous function
// is an error; these checks do not substitute a second implementation.
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

const defaultTissue = Object.freeze({
  moisture: 76, tension: 40, exposure: 8, trauma: 0, clarity: 84,
  stability: 18, risk: 8, salineDrops: 0, variantId: 'standard',
  variantLabel: 'Standard', lastAction: 'prepared', lastUpdatedAt: 1000,
  consequences: Object.freeze([]),
});
const clampTissueMetric = loadProductionFunction('clampTissueMetric');
const normalizeTissueState = loadProductionFunction('normalizeTissueState', {
  defaultTissueState: () => defaultTissue, clampTissueMetric,
});
const observationFieldData = loadProductionFunction('observationFieldData', {
  normalizeTissueState, clampTissueMetric,
});

function observationNavigation(options = {}) {
  const saved = Object.freeze({
    specimen: 'frog', activeLayer: 'skin', quizMode: false, practicalMode: false,
    activeInstrument: 'probe', workspaceMode: 'essentials',
    procedureByLayer: Object.freeze({ skin: Object.freeze({ inspected: true, tissueState: defaultTissue }) }),
    organNotes: Object.freeze({ heart: 'Retain this observation' }),
    toolCalibration: Object.freeze({ pressure: 40 }),
    visualEvidence: Object.freeze([Object.freeze({ id: 'capture-1', note: 'Keep the saved image' })]),
    ...options.data,
  });
  const fieldReadinessContext = Object.freeze({ ...saved });
  const forbidden = vi.fn(() => { throw new Error('Observation review must only navigate the current DOM.'); });
  const root = { name: 'originating lab', isConnected: true };
  const otherRoot = { name: 'another lab', isConnected: true };
  const current = { root };
  const originRoot = { root };
  const monitor = { open: options.open ?? false };
  const otherMonitor = { open: false };
  const targetMonitor = { monitor };
  const document = { activeElement: null, querySelector: forbidden, getElementById: forbidden };
  const origin = { closest: vi.fn(selector => {
    expect(selector).toBe('[data-dissection-root]');
    return originRoot.root;
  }) };
  const otherOrigin = { closest: vi.fn(() => otherRoot) };
  document.activeElement = origin;
  const target = {
    id: 'diss-field-tissue',
    closest: vi.fn(selector => {
      expect(selector).toBe('details.diss-field-monitor');
      return targetMonitor.monitor;
    }),
    focus: vi.fn(() => {
      expect(monitor.open).toBe(true);
      document.activeElement = target;
    }),
    scrollIntoView: vi.fn(),
  };
  const canvas = { _drawD: saved };
  const otherCanvas = { _drawD: saved };
  const members = new Set([origin, canvas, target, monitor]);
  root.contains = node => members.has(node);
  otherRoot.contains = node => [otherOrigin, otherCanvas, otherMonitor].includes(node);
  const canvases = new Map([[root, canvas], [otherRoot, otherCanvas]]);
  const targets = new Map([[root, target]]);
  const nextAction = { current: null };
  const query = vi.fn((scope, selector) => {
    if (selector === '[data-diss-canvas]') return canvases.get(scope) || null;
    if (selector === '#diss-field-tissue') return targets.get(scope) || null;
    if (selector === '.diss-next-action') return scope === root ? nextAction.current : null;
    throw new Error('Unexpected navigation query: ' + selector);
  });
  const review = loadProductionFunction('reviewObservationField', {
    fieldReadinessContext,
    // Canvas drawing can normalize d; the action must use its rendered snapshot.
    d: Object.freeze({ ...saved, specimen: 'earthworm', activeLayer: 'muscle', ...options.renderData }),
    currentDissectionRootNode: () => current.root, scopedDissectionQuery: query,
    document, window: { setTimeout: forbidden },
    upd: forbidden, updMany: forbidden, setProcedureFeedback: forbidden,
    focusDissectionTarget: forbidden, setTimeout: forbidden, clearTimeout: forbidden,
    scheduleDissectionCanvasTimer: forbidden, selectProcedureInstrument: forbidden,
  });
  const originalSnapshot = JSON.stringify(saved);
  function expectSavedWork() {
    expect(JSON.stringify(saved)).toBe(originalSnapshot);
    expect(otherCanvas._drawD).toBe(saved);
    expect(otherMonitor.open).toBe(false);
    expect(forbidden).not.toHaveBeenCalled();
  }
  function expectNoNavigation() {
    expect(monitor.open).toBe(options.open ?? false);
    expect(target.focus).not.toHaveBeenCalled();
    expect(target.scrollIntoView).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(origin);
    expectSavedWork();
  }
  function expectNavigation() {
    expect(monitor.open).toBe(true);
    expect(target.focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
    expect(target.scrollIntoView).toHaveBeenCalledExactlyOnceWith({ block: 'start', behavior: 'auto' });
    expect(target.focus.mock.invocationCallOrder[0]).toBeLessThan(target.scrollIntoView.mock.invocationCallOrder[0]);
    expect(document.activeElement).toBe(target);
    expectSavedWork();
  }
  return { saved, fieldReadinessContext, root, otherRoot, current, originRoot, origin, otherOrigin,
    monitor, otherMonitor, target, targetMonitor, canvas, otherCanvas, members, canvases, targets, nextAction,
    query, document, forbidden, review, event: { currentTarget: origin }, expectSavedWork, expectNoNavigation, expectNavigation };
}

function withHeaderGeometry(h, options = {}) {
  const { position = 'sticky', height = 170, top = '16px', computedMargin = '80px', value = '', priority = '' } = options;
  const properties = new Map([['color', { value: 'navy', priority: '' }]]);
  if (value) properties.set('scroll-margin-top', { value, priority });
  const before = new Map(properties);
  const style = {
    getPropertyValue: key => properties.get(key)?.value || '',
    getPropertyPriority: key => properties.get(key)?.priority || '',
    setProperty: vi.fn((key, nextValue, nextPriority) => { properties.set(key, { value: nextValue, priority: nextPriority }); }),
    removeProperty: vi.fn(key => {
      const previous = properties.get(key)?.value || '';
      properties.delete(key);
      return previous;
    }),
  };
  const header = { getBoundingClientRect: vi.fn(() => ({ height })) };
  h.nextAction.current = header;
  h.members.add(header);
  h.target.style = style;
  h.origin.ownerDocument = h.document;
  h.document.defaultView = { getComputedStyle: vi.fn(node => {
    if (node === header) return { position, top };
    if (node === h.target) return { scrollMarginTop: computedMargin };
    throw new Error('Computed style requested outside the reviewed field.');
  }) };
  return { properties, before, style, header };
}

describe('dissection observation field review navigation', () => {
  it.each([false, true])('opens the live monitor and focuses its tissue section when already open is %s', open => {
    const h = observationNavigation({ open });
    h.review(h.event);
    h.expectNavigation();
    expect(h.query.mock.calls).toEqual([
      [h.root, '[data-diss-canvas]'], [h.root, '#diss-field-tissue'],
    ]);
    expect(h.canvas._drawD).toBe(h.saved);
  });

  it('preserves newer readings, notes, and tool settings while reviewing the same layer', () => {
    const h = observationNavigation();
    const latest = Object.freeze({ ...h.saved,
      procedureByLayer: Object.freeze({ skin: Object.freeze({ inspected: true, tissueState: Object.freeze({ ...defaultTissue, risk: 67 }) }) }),
      organNotes: Object.freeze({ ...h.saved.organNotes, liver: 'A later observation' }),
      activeInstrument: 'dropper', toolCalibration: Object.freeze({ pressure: 25 }),
    });
    h.canvas._drawD = latest;
    h.review(h.event);
    h.expectNavigation();
    expect(h.canvas._drawD).toBe(latest);
    expect(h.canvas._drawD.procedureByLayer.skin.tissueState.risk).toBe(67);
  });

  it('uses the rendered context when the live canvas has no state snapshot', () => {
    const h = observationNavigation();
    delete h.canvas._drawD;
    h.review(h.event);
    h.expectNavigation();
    expect(h.canvas).not.toHaveProperty('_drawD');
  });

  it('uses the current canvas inside the same live lab without scheduling deferred focus', () => {
    const h = observationNavigation();
    const replacement = { _drawD: Object.freeze({ ...h.saved }) };
    h.canvases.set(h.root, replacement);
    h.members.delete(h.canvas);
    h.members.add(replacement);
    h.review(h.event);
    h.expectNavigation();
    expect(replacement._drawD).toEqual(h.saved);
    expect(h.canvas._drawD).toBe(h.saved);
  });

  it.each([
    ['missing event', h => { h.event = undefined; }],
    ['missing origin', h => { h.event = {}; }],
    ['origin without a DOM ancestor lookup', h => { delete h.origin.closest; }],
    ['origin outside a lab', h => { h.originRoot.root = null; }],
    ['detached lab', h => { h.root.isConnected = false; }],
    ['detached origin', h => { h.members.delete(h.origin); }],
    ['unmounted current lab', h => { h.current.root = null; }],
    ['replaced current lab', h => { h.current.root = h.otherRoot; }],
    ['event from another lab', h => { h.event = { currentTarget: h.otherOrigin }; }],
    ['missing canvas', h => { h.canvases.delete(h.root); }],
  ])('does nothing for a %s', (_label, change) => {
    const h = observationNavigation();
    change(h);
    h.review(h.event);
    h.expectNoNavigation();
    expect(h.query.mock.calls.some(([, selector]) => selector === '#diss-field-tissue')).toBe(false);
  });

  it.each([
    ['quiz', { quizMode: true }],
    ['timed practical', { practicalMode: true }],
    ['another specimen', { specimen: 'earthworm' }],
    ['another layer', { activeLayer: 'muscle' }],
  ])('rejects a stale review after entering %s', (_label, patch) => {
    const h = observationNavigation();
    const latest = Object.freeze({ ...h.saved, ...patch });
    h.canvas._drawD = latest;
    h.review(h.event);
    h.expectNoNavigation();
    expect(h.canvas._drawD).toBe(latest);
  });

  it.each(['quizMode', 'practicalMode'])('keeps the %s guard when falling back to the rendered state', assessment => {
    const h = observationNavigation({ data: { [assessment]: true } });
    delete h.canvas._drawD;
    h.review(h.event);
    h.expectNoNavigation();
  });

  it.each([
    ['missing section', h => { h.targets.delete(h.root); }],
    ['section without its ancestor lookup', h => { delete h.target.closest; }],
    ['missing native monitor', h => { h.targetMonitor.monitor = null; }],
    ['monitor outside the originating lab', h => { h.targetMonitor.monitor = h.otherMonitor; }],
    ['detached monitor', h => { h.members.delete(h.monitor); }],
  ])('leaves the interface unchanged for a %s', (_label, change) => {
    const h = observationNavigation();
    change(h);
    h.review(h.event);
    h.expectNoNavigation();
  });

  it('opens the monitor when the host does not expose focus or scrolling methods', () => {
    const h = observationNavigation();
    delete h.target.focus;
    delete h.target.scrollIntoView;
    expect(() => h.review(h.event)).not.toThrow();
    expect(h.monitor.open).toBe(true);
    expect(h.document.activeElement).toBe(h.origin);
    h.expectSavedWork();
  });

  it('temporarily clears the sticky action height while scrolling and removes the temporary margin', () => {
    const h = observationNavigation();
    const geometry = withHeaderGeometry(h);
    h.target.scrollIntoView.mockImplementation(() => {
      expect(geometry.style.getPropertyValue('scroll-margin-top')).toBe('198px');
      expect(geometry.style.getPropertyPriority('scroll-margin-top')).toBe('important');
    });
    h.review(h.event);
    h.expectNavigation();
    expect(geometry.style.setProperty).toHaveBeenCalledExactlyOnceWith('scroll-margin-top', '198px', 'important');
    expect(geometry.style.removeProperty).toHaveBeenCalledExactlyOnceWith('scroll-margin-top');
    expect(geometry.properties).toEqual(geometry.before);
    expect(h.query.mock.calls.every(([scope]) => scope === h.root)).toBe(true);
  });

  it('keeps a larger computed margin for a fixed action and restores the original inline value and priority', () => {
    const h = observationNavigation();
    const geometry = withHeaderGeometry(h, {
      position: 'fixed', height: 90, top: '8px', computedMargin: '128px', value: '2em', priority: 'important',
    });
    h.target.scrollIntoView.mockImplementation(() => {
      expect(geometry.style.getPropertyValue('scroll-margin-top')).toBe('128px');
    });
    h.review(h.event);
    h.expectNavigation();
    expect(geometry.style.setProperty.mock.calls).toEqual([
      ['scroll-margin-top', '128px', 'important'], ['scroll-margin-top', '2em', 'important'],
    ]);
    expect(geometry.style.removeProperty).not.toHaveBeenCalled();
    expect(geometry.properties).toEqual(geometry.before);
  });

  it('leaves inline styling alone when the action is in ordinary document flow', () => {
    const h = observationNavigation();
    const geometry = withHeaderGeometry(h, { position: 'static', value: '3rem' });
    h.target.scrollIntoView.mockImplementation(() => {
      expect(geometry.properties).toEqual(geometry.before);
    });
    h.review(h.event);
    h.expectNavigation();
    expect(geometry.header.getBoundingClientRect).not.toHaveBeenCalled();
    expect(geometry.style.setProperty).not.toHaveBeenCalled();
    expect(geometry.style.removeProperty).not.toHaveBeenCalled();
    expect(geometry.properties).toEqual(geometry.before);
  });

  it.each([
    ['no previous override', '', ''],
    ['an existing important override', '6rem', 'important'],
  ])('restores styling after scrolling throws with %s', (_label, value, priority) => {
    const h = observationNavigation();
    const geometry = withHeaderGeometry(h, { value, priority });
    const scrollFailure = new Error('Host scroll failed');
    h.target.scrollIntoView.mockImplementation(() => {
      expect(geometry.style.getPropertyValue('scroll-margin-top')).toBe('198px');
      throw scrollFailure;
    });
    expect(() => h.review(h.event)).toThrow(scrollFailure);
    expect(geometry.properties).toEqual(geometry.before);
    expect(h.monitor.open).toBe(true);
    expect(h.document.activeElement).toBe(h.target);
    h.expectSavedWork();
  });
});

describe('dissection observation field score preservation', () => {
  it('retains the known default field score and opening guidance', () => {
    expect(observationFieldData(defaultTissue)).toEqual({
      quality: 46, label: 'Limited observation field', tone: 'restricted',
      limiter: 'Access width', guidance: 'Extend and retract only along the established corridor.',
      aperture: 8, clarity: 84, stability: 18,
    });
  });

  it('keeps a working field distinct from its individual tissue readings', () => {
    const state = Object.freeze({ ...defaultTissue, exposure: 70, clarity: 84, stability: 66, risk: 25 });
    expect(observationFieldData(state)).toEqual({
      quality: 75, label: 'Clear field', tone: 'clear',
      limiter: 'No major limiter', guidance: 'The field supports confident structure observation.',
      aperture: 70, clarity: 84, stability: 66,
    });
  });

  it.each([
    ['clarity', { clarity: 100 }, 36],
    ['exposure', { exposure: 100 }, 32],
    ['stability', { stability: 100 }, 22],
    ['lower risk', { risk: 0 }, 10],
  ])('preserves the %s contribution to observation quality', (_name, patch, quality) => {
    const leastVisible = { ...defaultTissue, clarity: 0, exposure: 0, stability: 0, risk: 100 };
    expect(observationFieldData(leastVisible).quality).toBe(0);
    expect(observationFieldData({ ...leastVisible, ...patch }).quality).toBe(quality);
  });

  it.each([
    [47, 'Limited observation field', 'restricted'],
    [48, 'Developing field', 'developing'],
    [64, 'Developing field', 'developing'],
    [65, 'Clear field', 'clear'],
    [79, 'Clear field', 'clear'],
    [80, 'High-definition field', 'clear'],
  ])('preserves the existing description at quality %s', (quality, label, tone) => {
    // Equal component quality yields this score without duplicating the model.
    const tissue = { ...defaultTissue, clarity: quality, exposure: quality, stability: quality, risk: 100 - quality };
    expect(observationFieldData(tissue)).toMatchObject({ quality, label, tone });
  });

  it('retains the five-point probing contribution and caps the result at 100', () => {
    expect(observationFieldData({ tissueState: defaultTissue, probed: true }).quality).toBe(51);
    const almostComplete = { ...defaultTissue, clarity: 97, exposure: 97, stability: 97, risk: 3 };
    expect(observationFieldData({ tissueState: almostComplete, probed: false }).quality).toBe(97);
    expect(observationFieldData({ tissueState: almostComplete, probed: true }).quality).toBe(100);
  });

  it('normalizes invalid bounds before presenting the field', () => {
    expect(observationFieldData({ clarity: -20, exposure: 150, stability: 130, risk: -10 }))
      .toMatchObject({ quality: 64, aperture: 100, clarity: 0, stability: 100 });
  });

  it('reads a frozen saved procedure without changing evidence or adding probing credit', () => {
    const consequence = Object.freeze({ action: 'retract', message: 'Keep this observation', at: 1200 });
    const tissueState = Object.freeze({ ...defaultTissue, consequences: Object.freeze([consequence]) });
    const state = Object.freeze({ tissueState, probed: false, inspected: true,
      pins: Object.freeze([Object.freeze({ x: 0.2, y: 0.4 })]), note: 'Recorded by the learner' });
    const before = JSON.stringify(state);
    expect(observationFieldData(state).quality).toBe(46);
    expect(JSON.stringify(state)).toBe(before);
    expect(state.tissueState).toBe(tissueState);
    expect(state.tissueState.consequences[0]).toBe(consequence);
  });
});
