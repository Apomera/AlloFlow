import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');

// Exercise the production event handler with bounded lab roots. Missing or
// ambiguous declarations fail closed instead of substituting test behavior.
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

function preparation(options = {}) {
  const specimen = options.specimen || 'frog';
  const activeLayer = options.layer || 'skin';
  const anatomicalView = options.view || 'dorsal';
  const recommendedView = options.recommended || 'ventral';
  const d = Object.freeze({
    specimen, activeLayer, anatomicalView, quizMode: false, practicalMode: false,
    procedureByLayer: Object.freeze({ skin: Object.freeze({ inspected: true, history: Object.freeze(['inspect']) }) }),
    organNotes: Object.freeze({ 'frog|heart': 'Evidence to retain' }),
    ...options.data,
  });
  const forbidden = vi.fn(() => { throw new Error('Alignment must use the existing view-change operation without direct state, focus, or timer work'); });
  const document = { querySelector: forbidden, getElementById: forbidden };
  const root = { name: 'originating lab', isConnected: true };
  const foreignRoot = { name: 'another lab', isConnected: true };
  const origin = { name: 'alignment control', isConnected: true, focus: forbidden, scrollIntoView: forbidden };
  const foreignOrigin = { name: 'other alignment control', isConnected: true, focus: forbidden };
  const canvas = { _drawD: d };
  const foreignCanvas = { _drawD: Object.freeze({ ...d }) };
  root.contains = node => [origin, canvas].includes(node);
  foreignRoot.contains = node => [foreignOrigin, foreignCanvas].includes(node);
  const current = { root };
  const nodes = new Map([[root, canvas], [foreignRoot, foreignCanvas]]);
  const query = vi.fn((scope, selector) => selector === '[data-diss-canvas]' ? nodes.get(scope) || null : null);
  const changeView = vi.fn(nextView => { canvas._drawD = { ...(canvas._drawD || d), anatomicalView: nextView }; });
  const align = loadProductionFunction('alignProcedureView', {
    d, specimen, activeLayer, anatomicalView,
    procedureProtocol: Object.freeze({ recommendedView }),
    currentDissectionRootNode: () => current.root,
    scopedDissectionQuery: query,
    changeAnatomicalView: changeView,
    document, setTimeout: forbidden, clearTimeout: forbidden,
    upd: forbidden, updMany: forbidden, setProcedureFeedback: forbidden,
    focusDissectionTarget: forbidden,
  });
  function expectNoAction() {
    expect(changeView).not.toHaveBeenCalled();
    expect(forbidden).not.toHaveBeenCalled();
    expect(foreignCanvas._drawD).toEqual(d);
  }
  return { align, event: { currentTarget: origin }, d, root, foreignRoot, origin, foreignOrigin,
    canvas, foreignCanvas, current, nodes, query, changeView, forbidden, expectNoAction, recommendedView };
}

describe('dissection protocol preparation alignment', () => {
  it.each([
    ['frog', 'dorsal', 'ventral'],
    ['earthworm', 'ventral', 'dorsal'],
    ['sheepEye', 'dorsal', 'lateral'],
  ])('delegates the current %s recommendation once and preserves the originating control', (specimen, view, recommended) => {
    const h = preparation({ specimen, view, recommended });
    h.align(h.event);
    expect(h.changeView).toHaveBeenCalledExactlyOnceWith(recommended, 'procedure alignment');
    expect(h.query).toHaveBeenCalledExactlyOnceWith(h.root, '[data-diss-canvas]');
    expect(h.origin.isConnected).toBe(true);
    expect(h.forbidden).not.toHaveBeenCalled();
    expect(h.d.anatomicalView).toBe(view);
    expect(h.canvas._drawD.procedureByLayer).toBe(h.d.procedureByLayer);
    expect(h.canvas._drawD.organNotes).toBe(h.d.organNotes);
    expect(h.foreignCanvas._drawD).toEqual(h.d);
  });

  it('does not repeat alignment when the live view has already changed', () => {
    const h = preparation();
    h.align(h.event);
    h.align(h.event);
    h.align(h.event);
    expect(h.changeView).toHaveBeenCalledExactlyOnceWith('ventral', 'procedure alignment');
    expect(h.forbidden).not.toHaveBeenCalled();
  });

  it('keeps an already aligned control inert', () => {
    const h = preparation({ view: 'ventral' });
    h.align(h.event);
    h.expectNoAction();
  });

  it.each([undefined, null, {}, { currentTarget: null }])('rejects an unavailable event origin: %j', event => {
    const h = preparation();
    h.align(event);
    h.expectNoAction();
  });

  it('rejects an unavailable lab root', () => {
    const h = preparation();
    h.current.root = null;
    h.align(h.event);
    h.expectNoAction();
  });

  it('rejects a detached lab', () => {
    const h = preparation();
    h.root.isConnected = false;
    h.align(h.event);
    h.expectNoAction();
  });

  it('rejects an event from another lab even when its saved data matches', () => {
    const h = preparation();
    h.align({ currentTarget: h.foreignOrigin });
    h.expectNoAction();
  });

  it('rejects a callback after the current root has been replaced', () => {
    const h = preparation();
    h.current.root = h.foreignRoot;
    h.align(h.event);
    h.expectNoAction();
  });

  it('does not borrow another lab canvas when the originating canvas is unavailable', () => {
    const h = preparation();
    h.nodes.delete(h.root);
    h.align(h.event);
    h.expectNoAction();
    expect(h.query.mock.calls.every(([scope]) => scope === h.root)).toBe(true);
  });

  it.each([
    ['another specimen', { specimen: 'earthworm' }],
    ['another layer', { activeLayer: 'muscle' }],
    ['an assessment', { quizMode: true }],
    ['a timed identification practical', { practicalMode: true }],
    ['a different unaligned view', { anatomicalView: 'lateral' }],
    ['the recommended view', { anatomicalView: 'ventral' }],
  ])('ignores a stale control after the live lab changes to %s', (_name, patch) => {
    const h = preparation();
    const latest = Object.freeze({ ...h.d, ...patch });
    h.canvas._drawD = latest;
    h.align(h.event);
    h.expectNoAction();
    expect(h.canvas._drawD).toBe(latest);
  });

  it.each([
    ['assessment', { quizMode: true }],
    ['practical', { practicalMode: true }],
  ])('also rejects a control originally rendered during %s', (_name, data) => {
    const h = preparation({ data });
    h.align(h.event);
    h.expectNoAction();
  });

  it('uses the rendered data when the originating canvas has no live snapshot', () => {
    const h = preparation();
    delete h.canvas._drawD;
    h.align(h.event);
    expect(h.changeView).toHaveBeenCalledExactlyOnceWith('ventral', 'procedure alignment');
    expect(h.forbidden).not.toHaveBeenCalled();
  });

  it('permits newer notes without overwriting them or changing recorded preparation', () => {
    const h = preparation();
    const notes = Object.freeze({ ...h.d.organNotes, 'frog|liver': 'New observation' });
    h.canvas._drawD = Object.freeze({ ...h.d, organNotes: notes });
    h.align(h.event);
    expect(h.changeView).toHaveBeenCalledExactlyOnceWith('ventral', 'procedure alignment');
    expect(h.canvas._drawD.organNotes).toBe(notes);
    expect(h.canvas._drawD.procedureByLayer).toBe(h.d.procedureByLayer);
    expect(h.forbidden).not.toHaveBeenCalled();
  });
});
