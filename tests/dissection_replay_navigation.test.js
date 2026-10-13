import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');

// Run the actual navigation handler with its production context lookup.
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

function freezeDeep(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}

function replay(overrides = {}) {
  return {
    specimen: 'frog', layer: 'muscle', paused: true, elapsed: 1400,
    duration: 2800, startedAt: 1000, returnFocusId: 'diss-review-actions',
    actions: [
      { action: 'dropper', label: 'Hydrated', point: { x: 0.4, y: 0.6 } },
      { action: 'probe', label: 'Probed', outcome: 'Recorded response' },
    ],
    ...overrides,
  };
}

function navigation({ record = replay(), state, canvasPresent = true } = {}) {
  const d = state || { specimen: 'frog', quizMode: false, _procedureReplay: record };
  const canvasRefNode = canvasPresent ? { _drawD: d } : null;
  const root = { isConnected: true, name: 'current lab' };
  const foreignRoot = { isConnected: true, name: 'other lab' };
  const current = { root };
  const events = [];
  const pending = [];
  function target(name) {
    return {
      isConnected: true,
      scrollIntoView: vi.fn(options => events.push(['scroll', name, options])),
      focus: vi.fn(options => events.push(['focus', name, options])),
    };
  }
  const specimen = target('specimen section');
  const returnButton = target('return button');
  const viewButton = target('view button');
  const canvas = target('live canvas');
  const foreignButton = target('other lab button');
  const nodes = new Map([
    ['#diss-replay-specimen', specimen], ['#diss-replay-return', returnButton],
    ['#diss-replay-view-specimen', viewButton], ['[data-diss-canvas]', canvas],
  ]);
  const query = vi.fn((queryRoot, selector) => queryRoot === root ? (nodes.get(selector) || null) : foreignButton);
  const mutation = vi.fn(() => { throw new Error('Navigation must not write learning state or feedback'); });
  const live = loadProductionFunction('liveProcedureReplay', {
    canvasRefNode, d, specimen: 'frog', activeLayer: 'muscle',
  });
  const navigate = loadProductionFunction('focusProcedureReplaySurface', {
    canvasRefNode, d,
    liveProcedureReplay: live,
    currentDissectionRootNode: () => current.root,
    scopedDissectionQuery: query,
    setTimeout: (callback, delay) => { pending.push({ callback, delay }); return pending.length; },
    upd: mutation, updMany: mutation, setProcedureFeedback: mutation,
    document: {
      querySelector: () => { throw new Error('Navigation must stay scoped to its lab'); },
      getElementById: () => { throw new Error('Navigation must stay scoped to its lab'); },
    },
  });
  function flush() {
    let count = 0;
    while (pending.length) {
      if (++count > 10) throw new Error('Navigation scheduled an unbounded retry');
      pending.shift().callback();
    }
  }
  function expectUntouched() {
    expect(events).toEqual([]);
    expect(mutation).not.toHaveBeenCalled();
    expect(foreignButton.focus).not.toHaveBeenCalled();
  }
  return { navigate, flush, expectUntouched, d, canvasRefNode, root, foreignRoot, current,
    events, pending, specimen, returnButton, viewButton, canvas, foreignButton, nodes, query, mutation };
}

describe('dissection replay navigation', () => {
  it('moves to the held specimen action and focuses its dedicated return control', () => {
    const h = navigation();
    h.navigate(true);
    expect(h.events).toEqual([]);
    expect(h.pending.length).toBeGreaterThan(0);
    h.flush();
    expect(h.events).toEqual([
      ['scroll', 'specimen section', { block: 'start', behavior: 'auto' }],
      ['focus', 'return button', { preventScroll: true }],
    ]);
    expect(h.canvas.focus).not.toHaveBeenCalled();
    expect(h.canvas.scrollIntoView).not.toHaveBeenCalled();
    expect(h.mutation).not.toHaveBeenCalled();
  });

  it('returns to the same review control without focusing the live specimen', () => {
    const h = navigation();
    h.navigate(false);
    h.flush();
    expect(h.events).toEqual([
      ['scroll', 'view button', { block: 'center', behavior: 'auto' }],
      ['focus', 'view button', { preventScroll: true }],
    ]);
    expect(h.canvas.focus).not.toHaveBeenCalled();
    expect(h.returnButton.focus).not.toHaveBeenCalled();
    expect(h.mutation).not.toHaveBeenCalled();
  });

  it.each([true, false])('keeps every navigation lookup inside its own lab (%s)', showSpecimen => {
    const h = navigation();
    h.navigate(showSpecimen);
    h.flush();
    expect(h.query).toHaveBeenCalled();
    for (const [queryRoot] of h.query.mock.calls) expect(queryRoot).toBe(h.root);
    expect(h.foreignButton.focus).not.toHaveBeenCalled();
    expect(h.foreignButton.scrollIntoView).not.toHaveBeenCalled();
  });

  it.each([
    ['absent replay', null, false],
    ['playing replay', replay({ paused: false }), false],
    ['quiz mode', replay(), true],
  ])('does not navigate from %s', (_label, record, quizMode) => {
    const h = navigation({ state: { specimen: 'frog', quizMode, _procedureReplay: record } });
    h.navigate(true);
    h.navigate(false);
    h.flush();
    h.expectUntouched();
  });

  it('uses the live canvas state instead of a stale rendered quiz state', () => {
    const record = replay();
    const h = navigation({ state: { specimen: 'frog', quizMode: true, _procedureReplay: null } });
    h.canvasRefNode._drawD = { specimen: 'frog', quizMode: false, _procedureReplay: record };
    h.navigate(true);
    h.flush();
    expect(h.returnButton.focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
    expect(h.d.quizMode).toBe(true);
    expect(h.d._procedureReplay).toBeNull();
  });

  it('uses the rendered context when no canvas has mounted', () => {
    const h = navigation({ canvasPresent: false });
    h.navigate(false);
    h.flush();
    expect(h.viewButton.focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
  });

  it('abandons a queued jump when the review is replaced, even by equal-looking data', () => {
    const h = navigation();
    h.navigate(true);
    h.canvasRefNode._drawD = { ...h.d, _procedureReplay: { ...h.d._procedureReplay } };
    h.flush();
    h.expectUntouched();
  });

  it('abandons a queued jump when the review ends', () => {
    const h = navigation();
    h.navigate(false);
    h.canvasRefNode._drawD = { ...h.d, _procedureReplay: null };
    h.flush();
    h.expectUntouched();
  });

  it('abandons a queued jump when its existing replay resumes', () => {
    const h = navigation();
    h.navigate(true);
    h.d._procedureReplay.paused = false;
    h.flush();
    h.expectUntouched();
  });

  it('abandons a queued jump when quiz mode begins', () => {
    const h = navigation();
    h.navigate(false);
    h.canvasRefNode._drawD = { ...h.d, quizMode: true };
    h.flush();
    h.expectUntouched();
  });

  it.each([
    ['specimen', latest => ({ ...latest, specimen: 'fish' })],
    ['replay specimen', latest => ({ ...latest, _procedureReplay: { ...latest._procedureReplay, specimen: 'fish' } })],
    ['layer', latest => ({ ...latest, _procedureReplay: { ...latest._procedureReplay, layer: 'skin' } })],
  ])('abandons a queued jump after the %s changes', (_label, change) => {
    const h = navigation();
    h.navigate(true);
    h.canvasRefNode._drawD = change(h.d);
    h.flush();
    h.expectUntouched();
  });

  it('does not focus a disconnected lab after a queued jump', () => {
    const h = navigation();
    h.navigate(true);
    h.root.isConnected = false;
    h.flush();
    h.expectUntouched();
  });

  it('does not focus an old lab after the current lab root changes', () => {
    const h = navigation();
    h.navigate(false);
    h.current.root = h.foreignRoot;
    h.flush();
    h.expectUntouched();
  });

  it.each([true, false])('does not redirect focus when its destination is absent (%s)', showSpecimen => {
    const h = navigation();
    h.nodes.delete(showSpecimen ? '#diss-replay-return' : '#diss-replay-view-specimen');
    h.navigate(showSpecimen);
    h.flush();
    h.expectUntouched();
    expect(h.pending).toEqual([]);
  });

  it('does not focus a return control when its specimen section is absent', () => {
    const h = navigation();
    h.nodes.delete('#diss-replay-specimen');
    h.navigate(true);
    h.flush();
    h.expectUntouched();
  });

  it('preserves frozen replay, saved work, history selection and feedback across both directions', () => {
    const state = freezeDeep({
      specimen: 'frog', quizMode: false, _procedureReplay: replay(),
      procedures: { muscle: { actionLog: [{ action: 'dropper', at: 42 }], inspected: true } },
      selectedTechniqueActionIndex: 1, notebook: ['Saved observation'],
      procedureFeedback: 'Reviewing the saved action', score: 35,
    });
    const before = JSON.stringify(state);
    const h = navigation({ state });
    h.navigate(true);
    h.flush();
    h.navigate(false);
    h.flush();
    expect(h.returnButton.focus).toHaveBeenCalledOnce();
    expect(h.viewButton.focus).toHaveBeenCalledOnce();
    expect(h.canvasRefNode._drawD).toBe(state);
    expect(JSON.stringify(state)).toBe(before);
    expect(h.mutation).not.toHaveBeenCalled();
  });
});
