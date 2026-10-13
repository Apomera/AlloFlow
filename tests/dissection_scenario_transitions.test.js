import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');
const startedAt = 1800000000000;

// Exercise the actual handler. The surrounding lab and browser are bounded
// fixtures; a missing or ambiguous production declaration fails closed.
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

function transition(overrides = {}, workspaceMode = 'advanced') {
  const d = Object.freeze({
    specimen: 'frog', activeLayer: 'skin', workspaceMode: 'advanced', quizMode: false, practicalMode: false,
    procedureScenario: 'timed-practical', scenarioStartedAt: 0, scenarioTimeRemaining: 0,
    procedureByLayer: Object.freeze({ skin: Object.freeze({ history: Object.freeze(['inspect']) }) }),
    ...overrides,
  });
  const events = [], pending = [];
  const document = {
    body: { name: 'body' }, activeElement: null,
    querySelector: () => { throw new Error('Timer focus must remain scoped to its originating lab'); },
    getElementById: () => { throw new Error('Timer focus must remain scoped to its originating lab'); },
  };
  const root = { name: 'originating lab', isConnected: true, ownerDocument: document };
  const foreignRoot = { name: 'other lab', isConnected: true, ownerDocument: document };
  const current = { root };
  const origin = { id: 'diss-scenario-start', isConnected: true, ownerDocument: document, closest: () => root };
  const canvas = { isConnected: true, _drawD: d, closest: () => root };
  const foreignCanvas = { isConnected: true, _drawD: d, closest: () => foreignRoot };
  const timer = {
    id: 'diss-scenario-time', isConnected: true, ownerDocument: document, closest: () => root,
    scrollIntoView: vi.fn(options => events.push(['scroll', options])),
    focus: vi.fn(options => { events.push(['focus', options]); document.activeElement = timer; }),
  };
  const foreignTimer = { focus: vi.fn(), scrollIntoView: vi.fn() };
  const otherControl = { id: 'diss-scenario-select', isConnected: true, ownerDocument: document, closest: () => root };
  const nodes = new Map([['[data-diss-canvas]', canvas], ['#diss-scenario-time', timer]]);
  root.contains = node => [origin, canvas, timer, otherControl].includes(node);
  foreignRoot.contains = node => [foreignCanvas, foreignTimer].includes(node);
  document.activeElement = origin;
  const query = vi.fn((scope, selector) => scope === root ? nodes.get(selector) || null : selector === '[data-diss-canvas]' ? foreignCanvas : foreignTimer);
  const definition = Object.freeze({ id: 'timed-practical', label: '4-minute technique challenge' });
  const activate = vi.fn(() => {
    canvas._drawD = { ...canvas._drawD, scenarioStartedAt: startedAt, scenarioTimeRemaining: 240 };
    origin.isConnected = false;
    document.activeElement = document.body;
    return startedAt;
  });
  const mutation = vi.fn(() => { throw new Error('The focus handoff must not mutate lab data or feedback'); });
  const setTimeout = vi.fn((callback, delay) => { pending.push({ callback, delay }); return pending.length; });
  const start = loadProductionFunction('startProcedureScenarioTimer', {
    d, specimen: 'frog', activeLayer: 'skin', workspaceMode, advancedWorkspace: workspaceMode === 'advanced',
    procedureScenario: 'timed-practical', canvasRefNode: canvas, document,
    currentDissectionRootNode: () => current.root,
    scopedDissectionQuery: query,
    currentScenarioDefinition: () => definition,
    activateProcedureScenario: activate, setTimeout,
    upd: mutation, updMany: mutation, setProcedureFeedback: mutation,
  });
  function tick() {
    const job = pending.shift();
    if (!job) throw new Error('No queued focus callback');
    job.callback();
  }
  function flush() {
    let count = 0;
    while (pending.length) {
      if (++count > 5) throw new Error('Timer focus scheduled an unbounded retry');
      tick();
    }
  }
  function expectNoFocus() {
    expect(events).toEqual([]);
    expect(timer.focus).not.toHaveBeenCalled();
    expect(foreignTimer.focus).not.toHaveBeenCalled();
    expect(mutation).not.toHaveBeenCalled();
  }
  return { d, start, event: { currentTarget: origin }, root, foreignRoot, current, origin, canvas, foreignCanvas,
    timer, foreignTimer, otherControl, document, nodes, query, activate, mutation, setTimeout, definition,
    events, pending, tick, flush, expectNoFocus };
}

describe('dissection scenario timer transition', () => {
  it('starts the current attempt and hands focus to its rendered timer exactly once', () => {
    const h = transition();
    h.start(h.event);
    expect(h.activate).toHaveBeenCalledExactlyOnceWith(h.definition, false);
    expect(h.events).toEqual([]);
    expect(h.pending).toHaveLength(1);
    h.flush();
    expect(h.events).toEqual([
      ['scroll', { block: 'nearest', behavior: 'auto' }],
      ['focus', { preventScroll: true }],
    ]);
    expect(h.document.activeElement).toBe(h.timer);
    expect(h.mutation).not.toHaveBeenCalled();
    expect(h.d.scenarioStartedAt).toBe(0);
    expect(h.canvas._drawD.procedureByLayer).toBe(h.d.procedureByLayer);
  });

  it.each([undefined, null, 'legacy'])('uses the rendered advanced preference when state workspace mode is %s', workspaceMode => {
    const h = transition({ workspaceMode });
    h.start(h.event);
    h.flush();
    expect(h.activate).toHaveBeenCalledExactlyOnceWith(h.definition, false);
    expect(h.timer.focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
  });

  it.each([undefined, 'legacy'])('rejects an essentials preference when state workspace mode is %s', workspaceMode => {
    const h = transition({ workspaceMode }, 'essentials');
    h.start(h.event);
    h.flush();
    expect(h.activate).not.toHaveBeenCalled();
    h.expectNoFocus();
  });

  it('keeps a queued handoff when the live mode falls back to the same advanced preference', () => {
    const h = transition();
    h.start(h.event);
    h.canvas._drawD = { ...h.canvas._drawD, workspaceMode: undefined };
    h.flush();
    expect(h.timer.focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
  });

  it('waits for a delayed timer render within its two retries', () => {
    const h = transition();
    h.nodes.delete('#diss-scenario-time');
    h.start(h.event);
    h.tick();
    h.tick();
    h.expectNoFocus();
    h.nodes.set('#diss-scenario-time', h.timer);
    h.flush();
    expect(h.timer.focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
    expect(h.activate).toHaveBeenCalledTimes(1);
  });

  it('stops retrying when the timer never renders', () => {
    const h = transition();
    h.nodes.delete('#diss-scenario-time');
    h.start(h.event);
    h.flush();
    h.expectNoFocus();
    expect(h.pending).toEqual([]);
    expect(h.setTimeout).toHaveBeenCalledTimes(3);
    expect(h.activate).toHaveBeenCalledTimes(1);
  });

  it('preserves a learner focus change made while the timer renders', () => {
    const h = transition();
    h.start(h.event);
    h.document.activeElement = h.otherControl;
    h.flush();
    h.expectNoFocus();
    expect(h.document.activeElement).toBe(h.otherControl);
  });

  it('rechecks learner focus between render retries', () => {
    const h = transition();
    h.nodes.delete('#diss-scenario-time');
    h.start(h.event);
    h.tick();
    h.nodes.set('#diss-scenario-time', h.timer);
    h.document.activeElement = h.otherControl;
    h.flush();
    h.expectNoFocus();
  });

  it.each([
    ['another specimen', { specimen: 'worm' }],
    ['another layer', { activeLayer: 'muscle' }],
    ['another scenario', { procedureScenario: 'preservation' }],
    ['a running timer', { scenarioStartedAt: startedAt - 1000 }],
    ['essential workspace', { workspaceMode: 'essentials' }],
    ['quiz mode', { quizMode: true }],
    ['identification practical', { practicalMode: true }],
  ])('does not start from %s in live canvas data', (_label, patch) => {
    const h = transition();
    h.canvas._drawD = { ...h.d, ...patch };
    h.start(h.event);
    h.flush();
    expect(h.activate).not.toHaveBeenCalled();
    h.expectNoFocus();
  });

  it('uses a current unstarted canvas state when the rendered timer state is stale', () => {
    const h = transition({ scenarioStartedAt: startedAt - 1000 });
    h.canvas._drawD = { ...h.d, scenarioStartedAt: 0 };
    h.start(h.event);
    h.flush();
    expect(h.activate).toHaveBeenCalledExactlyOnceWith(h.definition, false);
    expect(h.timer.focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
    expect(h.d.scenarioStartedAt).toBe(startedAt - 1000);
  });

  it.each(['missing event', 'foreign control', 'disconnected lab', 'missing canvas'])('does not start from a %s', invalid => {
    const h = transition();
    let event = h.event;
    if (invalid === 'missing event') event = undefined;
    if (invalid === 'foreign control') event = { currentTarget: h.foreignTimer };
    if (invalid === 'disconnected lab') h.root.isConnected = false;
    if (invalid === 'missing canvas') h.nodes.delete('[data-diss-canvas]');
    h.start(event);
    h.flush();
    expect(h.activate).not.toHaveBeenCalled();
    h.expectNoFocus();
  });

  it.each([
    ['specimen', { specimen: 'worm' }],
    ['layer', { activeLayer: 'muscle' }],
    ['scenario', { procedureScenario: 'preservation' }],
    ['replacement timer', { scenarioStartedAt: startedAt + 1000 }],
    ['cleared timer', { scenarioStartedAt: 0 }],
    ['workspace', { workspaceMode: 'essentials' }],
    ['quiz', { quizMode: true }],
    ['identification practical', { practicalMode: true }],
  ])('abandons a queued handoff when the %s changes', (_label, patch) => {
    const h = transition();
    h.start(h.event);
    h.canvas._drawD = { ...h.canvas._drawD, ...patch };
    h.flush();
    h.expectNoFocus();
    expect(h.activate).toHaveBeenCalledTimes(1);
  });

  it('abandons a handoff after its original lab disconnects', () => {
    const h = transition();
    h.start(h.event);
    h.root.isConnected = false;
    h.flush();
    h.expectNoFocus();
  });

  it('abandons a handoff after the current lab root changes', () => {
    const h = transition();
    h.start(h.event);
    h.current.root = h.foreignRoot;
    h.flush();
    h.expectNoFocus();
  });

  it.each(['removed', 'replaced'])('abandons a handoff when the original canvas is %s', state => {
    const h = transition();
    h.start(h.event);
    if (state === 'removed') h.nodes.delete('[data-diss-canvas]');
    else h.nodes.set('[data-diss-canvas]', { ...h.canvas });
    h.flush();
    h.expectNoFocus();
  });

  it('keeps every lookup and focus operation within the captured lab', () => {
    const h = transition();
    h.start(h.event);
    h.flush();
    expect(h.query).toHaveBeenCalled();
    for (const [scope] of h.query.mock.calls) expect(scope).toBe(h.root);
    expect(h.foreignTimer.focus).not.toHaveBeenCalled();
    expect(h.foreignTimer.scrollIntoView).not.toHaveBeenCalled();
  });
});
