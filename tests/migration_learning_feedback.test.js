import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const roots = new Set();
const clone = value => JSON.parse(JSON.stringify(value));
const baselineMessage = 'Baseline captured. Change only your chosen flight variable, then record a trial.';
const loadedMessage = 'Starting flight loaded. Change only the named control. Earlier attempts and other investigations are still saved.';
let tool;
function walk(node, predicate, found = []) {
  if (!node || typeof node !== 'object') return found;
  if (Array.isArray(node)) { node.forEach(child => walk(child, predicate, found)); return found; }
  if (predicate(node)) found.push(node);
  walk(node.props?.children, predicate, found); return found;
}
function reactProps(element) {
  const key = Object.keys(element).find(name => name.startsWith('__reactProps$'));
  expect(key).toBeTruthy(); return element[key];
}
function authored() {
  return {
    flightStudyObservations: { drafts: { 'canada_goose:head': 'Keep the shape observation.' }, records: {}, comparison: { draft: 'Keep the comparison.' } },
    flightInvestigation: { variable: 'wind', prediction: 'A tailwind may increase ground speed.', baseline: null, trials: [], evidence: 'Keep my investigation evidence.', explanation: 'Keep my model limitation.' },
    flightChallenges: { selectedId: 'wind', work: { wind: { prediction: 'Change only the wind.', notes: 'Keep my challenge explanation.', attempts: [] } } },
    inquiry: { hypothesis: 'Keep independent inquiry work.' }
  };
}
function fixture(seed = {}, options = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightPaused: true,
    flightSpecies: 'canada_goose', flightFormation: 'natural', flightSeason: 'fall', flightWind: 0,
    flightStudyYaw: 45, flightStudyPitch: 20, flightStudyZoom: 1.2, flightStudyBird: 1,
    flightWingStep: 11, flightShowAnatomy: true, flightStudyObservationOpen: true,
    flightStudyRegion: 'head', ...authored(), ...seed }, tree, refresh, renderCount = 0;
  const refs = [], writes = [], queued = [], announce = vi.fn();
  const tracedReact = { ...React, useRef(value) {
    const ref = React.useRef(value); if (!refs.includes(ref)) refs.push(ref); return ref;
  } };
  function update(patch) {
    writes.push(patch);
    if (options.delayWrites) { queued.push(patch); return; }
    state = { ...state, ...patch }; refresh(n => n + 1);
  }
  const ctx = makeCtx({ React: tracedReact,
    announceToSR: options.hostAnnouncer ? announce : null,
    t: options.t || ((_key, fallback) => fallback),
    update: (_bucket, key, value) => update({ [key]: value }),
    updateMulti: (_bucket, patch) => update(patch)
  });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); roots.add(root);
  function View() { renderCount++; refresh = React.useState(0)[1]; ctx.toolData = { migration: state }; tree = tool.render(ctx); return tree; }
  act(() => root.render(React.createElement(View)));
  const liveRef = refs.find(ref => ref.current && typeof ref.current === 'object' && 'flightSpeedValues' in ref.current);
  const ui = {
    host, root, writes, queued, announce, liveRef,
    get state() { return state; }, get live() { return liveRef.current; }, get renderCount() { return renderCount; },
    status(context) { return host.querySelector('[data-learning-feedback="' + context + '"]'); },
    owner(context) { return refs.find(ref => ref.current?.node === ui.status(context) && typeof ref.current.report === 'function'); },
    element(context) { return walk(tree, node => typeof node.type === 'function' && node.props.context === context && node.type.name === 'MigrationSceneFeedback')[0]; },
    action(context, name) { return host.querySelector(context === 'challenge' ? '[data-flight-challenge-action="' + name + '"]' : '[data-experiment-action="' + name + '"]'); },
    open() { host.querySelectorAll('details').forEach(details => { details.open = true; }); },
    click(button) { expect(button).not.toBeNull(); expect(button.disabled).toBe(false); ui.open(); button.focus(); act(() => button.click()); ui.open(); },
    edit(selector, value) { const field = host.querySelector(selector); expect(field).not.toBeNull(); act(() => reactProps(field).onChange({ target: { value }, currentTarget: field })); ui.open(); },
    set(patch) { act(() => { state = { ...state, ...patch }; refresh(n => n + 1); }); ui.open(); },
    flush() { act(() => { state = { ...state, ...queued.shift() }; refresh(n => n + 1); }); ui.open(); },
    unmount() { act(() => root.unmount()); roots.delete(root); }
  };
  ui.open(); return ui;
}
function expectOtherWork(ui, before) {
  expect(ui.state.flightStudyObservations).toEqual(before.flightStudyObservations);
  expect(ui.state.inquiry).toEqual(before.inquiry);
  expect(ui.state.flightInvestigation.evidence).toBe(before.flightInvestigation.evidence);
  expect(ui.state.flightInvestigation.explanation).toBe(before.flightInvestigation.explanation);
  expect(ui.state.flightChallenges.work.wind.notes).toBe(before.flightChallenges.work.wind.notes);
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  resetStemLab(); tool = loadTool('stem_lab/stem_tool_migration.js', 'migration');
});
afterEach(async () => {
  await act(async () => { roots.forEach(root => root.unmount()); roots.clear(); });
  window.dispatchEvent(new Event('blur')); document.body.innerHTML = '';
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Owned local confirmations for migration learning activities', () => {
  it.each(['challenge', 'investigation'])('starts %s with an empty polite atomic status independent from the scene', context => {
    const ui = fixture(), status = ui.status(context);
    expect(status).not.toBeNull(); expect(status.textContent).toBe('');
    expect(status.getAttribute('role')).toBe('status'); expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('aria-atomic')).toBe('true'); expect(status.hasAttribute('data-scene-feedback')).toBe(false);
    expect(ui.host.querySelectorAll('[data-scene-feedback]')).toHaveLength(1); expect(ui.writes).toEqual([]);
  });

  it.each([
    ['investigation', 'baseline', baselineMessage], ['challenge', 'load', loadedMessage]
  ])('announces %s %s without a host callback and preserves the activated control and drafts', (context, action, message) => {
    const ui = fixture(), before = clone(ui.state), button = ui.action(context, action), status = ui.status(context);
    ui.click(button);
    expect(ui.status(context)).toBe(status); expect(status.textContent).toBe(message);
    expect(document.activeElement).toBe(button); expectOtherWork(ui, before);
    expect(ui.status(context === 'challenge' ? 'investigation' : 'challenge').textContent).toBe('');
    expect(ui.host.querySelector('[data-scene-feedback]').textContent).toBe('');
  });

  it.each([
    ['investigation', 'baseline', baselineMessage], ['challenge', 'load', loadedMessage]
  ])('reannounces repeated %s %s through a new keyed status child', (context, action, message) => {
    const ui = fixture(), status = ui.status(context); ui.click(ui.action(context, action));
    const child = status.firstChild; ui.click(ui.action(context, action));
    expect(ui.status(context)).toBe(status); expect(status.textContent).toBe(message); expect(status.firstChild).not.toBe(child);
  });

  it('announces two saved trials even when their comparison result is identical', () => {
    const ui = fixture(), before = clone(ui.state); ui.click(ui.action('investigation', 'baseline'));
    const button = ui.action('investigation', 'record'), status = ui.status('investigation'); ui.click(button);
    const first = status.firstChild, text = status.textContent; ui.click(button);
    expect(text).toMatch(/^Trial recorded\./); expect(status.textContent).toBe(text); expect(status.firstChild).not.toBe(first);
    expect(ui.state.flightInvestigation.trials).toHaveLength(2); expect(document.activeElement).toBe(button); expectOtherWork(ui, before);
  });

  it('announces two saved challenge attempts even when their model outcome is identical', () => {
    const ui = fixture(), before = clone(ui.state); ui.click(ui.action('challenge', 'load'));
    const button = ui.action('challenge', 'check'), status = ui.status('challenge'); ui.click(button);
    const first = status.firstChild, text = status.textContent; ui.click(button);
    expect(text).toMatch(/^Attempt saved\./); expect(status.textContent).toBe(text); expect(status.firstChild).not.toBe(first);
    expect(ui.state.flightChallenges.work.wind.attempts).toHaveLength(2); expect(document.activeElement).toBe(button); expectOtherWork(ui, before);
  });

  it.each([
    ['investigation', 'baseline'], ['challenge', 'load']
  ])('uses one local sink when a host announcer is available for %s', (context, action) => {
    const ui = fixture({}, { hostAnnouncer: true }); ui.announce.mockClear(); ui.click(ui.action(context, action));
    expect(ui.status(context).textContent).not.toBe(''); expect(ui.announce).not.toHaveBeenCalled();
  });

  it('announces baseline restoration without changing investigation evidence or the selected camera', () => {
    const ui = fixture(), before = clone(ui.state); ui.click(ui.action('investigation', 'baseline'));
    ui.set({ flightWind: 6 }); const button = ui.action('investigation', 'restore'); ui.click(button);
    expect(ui.status('investigation').textContent).toBe('Baseline flight controls restored. Your investigation notes and trials are still saved.');
    expect(ui.state.flightWind).toBe(0); expect(ui.state.flightCamera).toBe('study'); expect(document.activeElement).toBe(button); expectOtherWork(ui, before);
  });

  it('announces investigation reset locally while preserving other activities', () => {
    const ui = fixture(), before = clone(ui.state), button = ui.action('investigation', 'reset'); ui.click(button);
    expect(ui.state).toEqual(before); expect(document.activeElement).toBe(ui.action('investigation', 'reset-cancel'));
    ui.click(ui.action('investigation', 'reset-confirm'));
    expect(ui.status('investigation').textContent).toBe('Flight investigation cleared. Flight settings and other activities are unchanged.');
    expect(ui.state.flightInvestigation).toEqual({ variable: 'wind', prediction: '', baseline: null, trials: [], evidence: '', explanation: '' });
    expect(ui.state.flightStudyObservations).toEqual(before.flightStudyObservations); expect(ui.state.flightChallenges).toEqual(before.flightChallenges);
    expect(ui.state.inquiry).toEqual(before.inquiry); expect(ui.state.flightStudyZoom).toBe(1.2); expect(document.activeElement).toBe(button);
  });

  it('reports a blocked notebook download locally without changing evidence or leaving a temporary link', () => {
    const ui = fixture(), before = clone(ui.state), button = ui.action('investigation', 'export-csv');
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => { throw new Error('Blocked download'); }), revokeObjectURL: vi.fn() });
    ui.click(button);
    expect(ui.status('investigation').textContent).toBe('Download was blocked by this browser.');
    expect(ui.state).toEqual(before); expect(ui.writes).toEqual([]); expect(document.querySelector('a[download]')).toBeNull();
    expect(document.activeElement).toBe(button); expect(ui.status('challenge').textContent).toBe('');
  });

  it('announces challenge removal through its own sink after moving focus safely', () => {
    const ui = fixture(); ui.click(ui.action('challenge', 'load')); ui.click(ui.action('challenge', 'check'));
    ui.click(ui.host.querySelector('[data-challenge-remove="1"]'));
    expect(ui.status('challenge').textContent).toBe('Attempt 1 removed'); expect(ui.state.flightChallenges.work.wind.attempts).toHaveLength(0);
    expect(document.activeElement).toBe(ui.action('challenge', 'check')); expect(ui.status('investigation').textContent).toBe('');
  });

  it('announces reflection cancellation locally while retaining saved predictions and explanations', () => {
    const ui = fixture(); ui.click(ui.action('challenge', 'load')); ui.click(ui.action('challenge', 'check'));
    const saved = clone(ui.state.flightChallenges); ui.click(ui.host.querySelector('[data-flight-reflection-action="edit"]'));
    ui.click(ui.host.querySelector('[data-flight-reflection-action="cancel"]'));
    expect(ui.status('challenge').textContent).toBe('Unsaved reflection closed. Saved work is unchanged.');
    expect(ui.state.flightChallenges).toEqual(saved); expect(document.activeElement).toBe(ui.host.querySelector('[data-flight-reflection-action="edit"]'));
  });

  it.each([
    ['investigation', 'baseline'], ['challenge', 'load']
  ])('keeps %s confirmation updates isolated while a host save is delayed', (context, action) => {
    const ui = fixture({}, { delayWrites: true }), before = clone(ui.state), button = ui.action(context, action);
    ui.live.flightStudyZoom = 1.7; ui.live.flightStudyYaw = 135; ui.live.flightWingStep = 29;
    const live = { ...ui.live, flightSpeedValues: { ...ui.live.flightSpeedValues } }, renders = ui.renderCount; ui.click(button);
    expect(ui.renderCount).toBe(renders); expect(ui.live).toEqual(live); expect(ui.state).toEqual(before);
    expect(ui.writes).toHaveLength(1); expect(ui.status(context).textContent).not.toBe(''); expect(document.activeElement).toBe(button);
  });

  it.each(['challenge', 'investigation'])('rejects disconnected and obsolete %s writers', context => {
    const ui = fixture(), owner = ui.owner(context), old = owner.current;
    const renders = ui.renderCount, state = clone(ui.state); act(() => old.report('First local status.'));
    expect(ui.renderCount).toBe(renders); expect(ui.status(context).textContent).toBe('First local status.');
    act(() => old.report('An obsolete writer must not speak.'));
    expect(ui.status(context).textContent).toBe('First local status.');
    const current = owner.current, detached = ui.status(context); detached.remove();
    act(() => current.report('A disconnected status must not speak.'));
    expect(detached.textContent).toBe('First local status.'); expect(ui.state).toEqual(state); expect(ui.writes).toEqual([]);
  });

  it.each(['challenge', 'investigation'])('keeps %s ownership on commit and ignores abandoned-render cleanup', context => {
    const ui = fixture(), element = ui.element(context), owner = element.props.owner, current = owner.current;
    const abandoned = element.type({ ...element.props, React: { ...React, useState: initial => [initial, vi.fn()] } });
    expect(owner.current).toBe(current); act(() => current.report('Committed confirmation.'));
    const newer = owner.current; abandoned.ref(null); expect(owner.current).toBe(newer);
    expect(ui.status(context).textContent).toBe('Committed confirmation.');
  });

  it.each(['challenge', 'investigation'])('clears departed %s feedback and rejects late writes after unmount', context => {
    const ui = fixture(), owner = ui.owner(context), writer = owner.current;
    act(() => writer.report('Earlier activity confirmation.')); ui.set({ tab: 'world' });
    expect(owner.current).toBeNull(); expect(ui.status(context)).toBeNull(); const renders = ui.renderCount;
    act(() => writer.report('Late confirmation.')); expect(ui.renderCount).toBe(renders);
    ui.set({ tab: 'flight3d' }); expect(ui.status(context).textContent).toBe('');
    const freshOwner = ui.owner(context), fresh = freshOwner.current; ui.unmount(); expect(freshOwner.current).toBeNull();
    act(() => fresh.report('Unmounted confirmation.'));
  });

  it('keeps two mounted tools and all three feedback contexts independent', () => {
    const first = fixture(), second = fixture(), secondBefore = clone(second.state);
    first.click(first.action('investigation', 'baseline')); expect(first.status('investigation').textContent).toBe(baselineMessage);
    expect(second.status('investigation').textContent).toBe(''); expect(second.status('challenge').textContent).toBe('');
    second.click(second.action('challenge', 'load')); expect(second.status('challenge').textContent).toBe(loadedMessage);
    expect(first.status('challenge').textContent).toBe(''); expect(first.status('investigation').textContent).toBe(baselineMessage);
    expect(second.state.flightInvestigation).toEqual(secondBefore.flightInvestigation);
  });
});
