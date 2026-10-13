import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');

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

// Execute the production handler against two independent mounted labs. Every
// state mutation, global query, and timer fails so review remains navigation.
function exposureReview(options = {}) {
  const saved = Object.freeze({
    specimen: 'frog', activeLayer: 'skin', workspaceMode: 'advanced',
    quizMode: false, practicalMode: false, activeInstrument: 'probe',
    selectedOrgan: 'heart', lensFocusDepth: 'surface', lensMagnification: 2,
    lightIntensity: 60, toolCalibration: Object.freeze({ probePressure: 30 }),
    procedureByLayer: Object.freeze({ skin: Object.freeze({ inspected: true, probed: false }) }),
    organNotes: Object.freeze({ heart: 'Keep this observation' }),
    visualEvidence: Object.freeze([Object.freeze({ id: 'saved-capture' })]),
    ...options.data,
  });
  const fieldReadinessContext = Object.freeze({ ...saved });
  const savedJSON = JSON.stringify(saved);
  const forbidden = vi.fn(() => { throw new Error('Protocol review must only navigate within the live lab.'); });
  const root = { name: 'originating lab', isConnected: true };
  const siblingRoot = { name: 'sibling lab', isConnected: true };
  const current = { root }, originRoot = { root };
  const document = { activeElement: null, querySelector: forbidden, getElementById: forbidden };
  const origin = {
    ownerDocument: document,
    getClientRects: vi.fn(() => [{ x: 8, y: 400, width: 200, height: 48 }]),
    closest: vi.fn(selector => {
      expect(selector).toBe('[data-dissection-root]');
      return originRoot.root;
    }),
  };
  const siblingOrigin = { closest: vi.fn(() => siblingRoot), getClientRects: vi.fn(() => [{}]) };
  document.activeElement = origin;
  const canvas = { _drawD: saved }, siblingCanvas = { _drawD: saved };
  const target = {
    id: 'diss-protocol', getClientRects: vi.fn(() => [{ x: 8, y: 80, width: 280, height: 350 }]),
    focus: vi.fn(() => { document.activeElement = target; }), scrollIntoView: vi.fn(),
  };
  const siblingTarget = { id: 'diss-protocol', focus: forbidden, scrollIntoView: forbidden };
  const members = new Set([origin, canvas, target]);
  root.contains = node => members.has(node);
  siblingRoot.contains = node => [siblingOrigin, siblingCanvas, siblingTarget].includes(node);
  const canvases = new Map([[root, canvas], [siblingRoot, siblingCanvas]]);
  const targets = new Map([[root, target], [siblingRoot, siblingTarget]]);
  const nextAction = { current: null };
  const query = vi.fn((scope, selector) => {
    if (selector === '[data-diss-canvas]') return canvases.get(scope) || null;
    if (selector === '#diss-protocol') return targets.get(scope) || null;
    if (selector === '.diss-next-action') return scope === root ? nextAction.current : null;
    throw new Error('Unexpected scoped navigation query: ' + selector);
  });
  const review = loadProductionFunction('reviewExposureProtocol', {
    fieldReadinessContext,
    d: Object.freeze({ ...saved, workspaceMode: 'essentials', activeLayer: 'muscle' }),
    currentDissectionRootNode: () => current.root, scopedDissectionQuery: query,
    document, window: { setTimeout: forbidden },
    upd: forbidden, updMany: forbidden, updateProcedure: forbidden, setProcedureFeedback: forbidden,
    focusDissectionTarget: forbidden, setTimeout: forbidden, clearTimeout: forbidden,
    scheduleDissectionCanvasTimer: forbidden, selectProcedureInstrument: forbidden,
  });
  function expectPreserved() {
    expect(JSON.stringify(saved)).toBe(savedJSON);
    expect(siblingCanvas._drawD).toBe(saved);
    expect(forbidden).not.toHaveBeenCalled();
  }
  function expectNoNavigation() {
    expect(target.focus).not.toHaveBeenCalled();
    expect(target.scrollIntoView).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(origin);
    expectPreserved();
  }
  function expectNavigation() {
    expect(target.focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
    expect(target.scrollIntoView).toHaveBeenCalledExactlyOnceWith({ block: 'start', behavior: 'auto' });
    expect(target.focus.mock.invocationCallOrder[0]).toBeLessThan(target.scrollIntoView.mock.invocationCallOrder[0]);
    expect(document.activeElement).toBe(target);
    expectPreserved();
  }
  return { saved, fieldReadinessContext, root, siblingRoot, current, originRoot,
    origin, siblingOrigin, canvas, siblingCanvas, target, members, canvases, targets,
    nextAction, query, document, review, event: { currentTarget: origin }, expectPreserved, expectNoNavigation, expectNavigation };
}

function withHeader(h, options = {}) {
  const { position = 'sticky', height = 170, top = '16px', computedMargin = '80px', value = '', priority = '' } = options;
  const properties = new Map([['color', { value: 'navy', priority: '' }]]);
  if (value) properties.set('scroll-margin-top', { value, priority });
  const before = new Map(properties);
  const style = {
    getPropertyValue: key => properties.get(key)?.value || '',
    getPropertyPriority: key => properties.get(key)?.priority || '',
    setProperty: vi.fn((key, nextValue, nextPriority) => { properties.set(key, { value: nextValue, priority: nextPriority }); }),
    removeProperty: vi.fn(key => { const previous = properties.get(key)?.value || ''; properties.delete(key); return previous; }),
  };
  const header = { getBoundingClientRect: vi.fn(() => ({ height })) };
  h.nextAction.current = header;
  h.members.add(header);
  h.target.style = style;
  h.document.defaultView = { getComputedStyle: vi.fn(node => {
    if (node === header) return { position, top };
    if (node === h.target) return { scrollMarginTop: computedMargin };
    throw new Error('Computed style requested outside the reviewed field.');
  }) };
  return { properties, before, style, header };
}

describe('dissection exposure protocol review', () => {
  it('focuses the originating lab protocol before scrolling without changing saved work', () => {
    const h = exposureReview();
    h.review(h.event);
    h.expectNavigation();
    expect(h.canvas._drawD).toBe(h.saved);
    expect(h.query.mock.calls).toEqual([[h.root, '[data-diss-canvas]'], [h.root, '#diss-protocol']]);
  });

  it('uses captured render context when the live canvas snapshot is unavailable', () => {
    const h = exposureReview();
    delete h.canvas._drawD;
    h.review(h.event);
    h.expectNavigation();
    expect(h.canvas).not.toHaveProperty('_drawD');
  });

  it('preserves newer observations, procedure readings, and tool settings in the same context', () => {
    const h = exposureReview();
    const latest = Object.freeze({ ...h.saved, activeInstrument: 'dropper',
      toolCalibration: Object.freeze({ probePressure: 25, salineDose: 1 }),
      organNotes: Object.freeze({ ...h.saved.organNotes, liver: 'A later note' }),
      procedureByLayer: Object.freeze({ skin: Object.freeze({ inspected: true, probed: true }) }),
    });
    h.canvas._drawD = latest;
    h.review(h.event);
    h.expectNavigation();
    expect(h.canvas._drawD).toBe(latest);
  });

  it('uses the current canvas within the same live lab for immediate navigation', () => {
    const h = exposureReview();
    const replacement = { _drawD: Object.freeze({ ...h.saved }) };
    h.canvases.set(h.root, replacement);
    h.review(h.event);
    h.expectNavigation();
    expect(replacement._drawD).toEqual(h.saved);
  });

  it.each([
    ['missing event', h => { h.event = undefined; }],
    ['missing origin', h => { h.event = {}; }],
    ['origin without a DOM lookup', h => { delete h.origin.closest; }],
    ['origin outside a lab', h => { h.originRoot.root = null; }],
    ['hidden origin', h => { h.origin.getClientRects.mockReturnValue([]); }],
    ['detached origin', h => { h.members.delete(h.origin); }],
    ['detached root', h => { h.root.isConnected = false; }],
    ['missing current root', h => { h.current.root = null; }],
    ['replaced current root', h => { h.current.root = h.siblingRoot; }],
    ['sibling-lab origin', h => { h.event = { currentTarget: h.siblingOrigin }; }],
    ['missing canvas', h => { h.canvases.delete(h.root); }],
  ])('does nothing for a %s', (_name, change) => {
    const h = exposureReview();
    change(h);
    h.review(h.event);
    h.expectNoNavigation();
    expect(h.query.mock.calls.some(([, selector]) => selector === '#diss-protocol')).toBe(false);
  });

  it.each([
    ['quiz assessment', { quizMode: true }],
    ['timed practical', { practicalMode: true }],
    ['another specimen', { specimen: 'earthworm' }],
    ['another layer', { activeLayer: 'muscle' }],
    ['another workspace', { workspaceMode: 'essentials' }],
  ])('rejects a stale review after entering %s', (_name, patch) => {
    const h = exposureReview();
    const latest = Object.freeze({ ...h.saved, ...patch });
    h.canvas._drawD = latest;
    h.review(h.event);
    h.expectNoNavigation();
    expect(h.canvas._drawD).toBe(latest);
  });

  it.each(['quizMode', 'practicalMode'])('preserves the %s guard without a live snapshot', flag => {
    const h = exposureReview({ data: { [flag]: true } });
    delete h.canvas._drawD;
    h.review(h.event);
    h.expectNoNavigation();
  });

  it.each([
    ['missing protocol', h => { h.targets.delete(h.root); }],
    ['hidden protocol', h => { h.target.getClientRects.mockReturnValue([]); }],
  ])('does not focus or scroll a %s', (_name, change) => {
    const h = exposureReview();
    change(h);
    h.review(h.event);
    h.expectNoNavigation();
  });

  it('tolerates unavailable host focus and scroll methods without introducing a fallback mutation', () => {
    const h = exposureReview();
    delete h.target.focus;
    delete h.target.scrollIntoView;
    expect(() => h.review(h.event)).not.toThrow();
    expect(h.document.activeElement).toBe(h.origin);
    expect(h.canvas._drawD).toBe(h.saved);
    h.expectPreserved();
  });
});

describe('dissection exposure protocol scroll clearance', () => {
  it('temporarily clears a sticky action and removes the temporary inline margin', () => {
    const h = exposureReview();
    const geometry = withHeader(h);
    h.target.scrollIntoView.mockImplementation(() => {
      expect(geometry.style.getPropertyValue('scroll-margin-top')).toBe('198px');
      expect(geometry.style.getPropertyPriority('scroll-margin-top')).toBe('important');
      expect(h.document.activeElement).toBe(h.target);
    });
    h.review(h.event);
    h.expectNavigation();
    expect(geometry.style.setProperty).toHaveBeenCalledExactlyOnceWith('scroll-margin-top', '198px', 'important');
    expect(geometry.style.removeProperty).toHaveBeenCalledExactlyOnceWith('scroll-margin-top');
    expect(geometry.properties).toEqual(geometry.before);
    expect(h.query.mock.calls.every(([scope]) => scope === h.root)).toBe(true);
  });

  it('keeps a larger existing margin for a fixed action and restores its inline value and priority', () => {
    const h = exposureReview();
    const geometry = withHeader(h, { position: 'fixed', height: 90, top: '8px', computedMargin: '128px', value: '2em', priority: 'important' });
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

  it('leaves inline styling untouched for an action in normal flow', () => {
    const h = exposureReview();
    const geometry = withHeader(h, { position: 'static', value: '3rem' });
    h.review(h.event);
    h.expectNavigation();
    expect(geometry.header.getBoundingClientRect).not.toHaveBeenCalled();
    expect(geometry.style.setProperty).not.toHaveBeenCalled();
    expect(geometry.style.removeProperty).not.toHaveBeenCalled();
    expect(geometry.properties).toEqual(geometry.before);
  });

  it('scrolls normally when no next-action element is mounted', () => {
    const h = exposureReview();
    const geometry = withHeader(h);
    h.nextAction.current = null;
    h.review(h.event);
    h.expectNavigation();
    expect(geometry.style.setProperty).not.toHaveBeenCalled();
    expect(geometry.properties).toEqual(geometry.before);
  });

  it.each([
    ['inline style interface', h => { delete h.target.style; }],
    ['document view', h => { delete h.document.defaultView; }],
    ['computed-style interface', h => { delete h.document.defaultView.getComputedStyle; }],
  ])('can navigate when the host lacks its %s', (_name, change) => {
    const h = exposureReview();
    const geometry = withHeader(h);
    change(h);
    h.review(h.event);
    h.expectNavigation();
    expect(geometry.style.setProperty).not.toHaveBeenCalled();
    expect(geometry.properties).toEqual(geometry.before);
  });

  it.each([
    ['no existing override', '', ''],
    ['an existing important override', '6rem', 'important'],
  ])('restores %s even when host scrolling throws', (_name, value, priority) => {
    const h = exposureReview();
    const geometry = withHeader(h, { value, priority });
    const failure = new Error('Host scroll failed');
    h.target.scrollIntoView.mockImplementation(() => {
      expect(geometry.style.getPropertyValue('scroll-margin-top')).toBe('198px');
      throw failure;
    });
    expect(() => h.review(h.event)).toThrow(failure);
    expect(geometry.properties).toEqual(geometry.before);
    expect(h.document.activeElement).toBe(h.target);
    expect(h.canvas._drawD).toBe(h.saved);
    h.expectPreserved();
  });
});
