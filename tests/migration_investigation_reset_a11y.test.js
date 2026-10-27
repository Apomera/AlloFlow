import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const { act } = React;
const roots = new Set();
const clone = value => JSON.parse(JSON.stringify(value));
const empty = { variable: 'wind', prediction: '', baseline: null, trials: [], evidence: '', explanation: '' };
let tool;
function props(node) { const key = Object.keys(node).find(key => key.startsWith('__reactProps$')); expect(key).toBeTruthy(); return node[key]; }
function authored() {
  const baseline = { speciesId: 'canada_goose', season: 'fall', wind: 0, formationMode: 'natural' };
  return { variable: 'wind', prediction: 'A tailwind may increase speed.', baseline,
    trials: [{ variable: 'wind', prediction: 'My saved prediction.', baseline, snapshot: { ...baseline, wind: 8 } }],
    evidence: 'My recorded measurements.', explanation: 'The model has limits.' };
}
function fixture(options = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightPaused: true, flightMotionReduced: true,
    flightSpecies: 'canada_goose', flightWind: 8, flightFormation: 'natural', flightSeason: 'fall',
    flightStudyYaw: 75, flightStudyPitch: 20, flightStudyZoom: 1.2, flightStudyBird: 1, flightWingStep: 11,
    flightInvestigation: authored(), flightStudyObservations: { drafts: { 'canada_goose:head': 'Keep my Study note.' } },
    flightChallenges: { selectedId: 'wind', work: { wind: { prediction: 'Keep challenge.', notes: 'Keep explanation.', attempts: [] } } },
    inquiry: { hypothesis: 'Keep inquiry.' }, ...options.seed }, refresh;
  const writes = [], queued = [], announce = vi.fn();
  function update(patch) { writes.push(clone(patch)); if (options.delay) { queued.push(patch); return; } state = { ...state, ...patch }; refresh(n => n + 1); }
  const ctx = makeCtx({ announceToSR: announce, t: options.t || ((_key, fallback) => fallback),
    update: (_bucket, key, value) => update({ [key]: value }), updateMulti: (_bucket, patch) => update(patch) });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); roots.add(root);
  function View() { refresh = React.useState(0)[1]; ctx.toolData = { migration: state }; return tool.render(ctx); }
  act(() => root.render(React.createElement(View)));
  const ui = { host, root, writes, queued, announce, get state() { return state; },
    action(name) { return host.querySelector('[data-experiment-action="' + name + '"]'); },
    review() { return host.querySelector('[data-investigation-reset-review]'); },
    field() { return host.querySelector('[data-migration-id="migration-experiment-evidence"]'); },
    status() { return host.querySelector('[data-learning-feedback="investigation"]'); },
    open() { host.querySelectorAll('details').forEach(node => { node.open = true; }); },
    click(button) { expect(button).not.toBeNull(); ui.open(); button.focus(); act(() => button.click()); ui.open(); },
    edit(value) { const field = ui.field(); field.focus(); act(() => props(field).onChange({ currentTarget: field, target: { value } })); },
    set(patch) { act(() => { state = { ...state, ...patch }; refresh(n => n + 1); }); ui.open(); },
    flush() { act(() => { state = { ...state, ...queued.shift() }; refresh(n => n + 1); }); ui.open(); },
    unmount() { act(() => root.unmount()); roots.delete(root); }
  };
  ui.open(); return ui;
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  resetStemLab(); tool = loadTool(process.env.MIGRATION_RESET_REVIEW_CANDIDATE || 'stem_lab/stem_tool_migration.js', 'migration');
});
afterEach(() => {
  act(() => { roots.forEach(root => root.unmount()); roots.clear(); });
  window.dispatchEvent(new Event('blur')); document.body.innerHTML = '';
  delete document.fullscreenElement; vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Investigation reset review preserves learner ownership', () => {
  it('keeps a named local review hidden until an explicit reset request, then focuses Cancel without changing work', () => {
    const ui = fixture(), before = clone(ui.state), origin = ui.action('reset'), review = ui.review();
    expect(review.hidden).toBe(true); expect(origin.getAttribute('aria-expanded')).toBe('false');
    expect(document.getElementById(origin.getAttribute('aria-controls'))).toBe(review);
    ui.click(origin);
    expect(ui.review()).toBe(review); expect(review.hidden).toBe(false); expect(review.getAttribute('role')).toBe('group');
    expect(review.hasAttribute('aria-modal')).toBe(false); expect(ui.host.querySelector('[role="dialog"]')).toBeNull();
    for (const attr of ['aria-labelledby', 'aria-describedby']) expect(review.contains(document.getElementById(review.getAttribute(attr)))).toBe(true);
    expect(document.activeElement).toBe(ui.action('reset-cancel')); expect(origin.disabled).toBe(true);
    expect(ui.state).toEqual(before); expect(ui.writes).toEqual([]);
  });
  it('cancels with the native button, restores the initiating control, and preserves all investigation data', () => {
    const ui = fixture(), before = clone(ui.state), origin = ui.action('reset'); ui.click(origin); ui.click(ui.action('reset-cancel'));
    expect(ui.review().hidden).toBe(true); expect(origin.disabled).toBe(false); expect(document.activeElement).toBe(origin);
    expect(ui.state).toEqual(before); expect(ui.writes).toEqual([]); expect(ui.status().textContent).toContain('Reset cancelled');
  });
  it.each(['reset-cancel', 'reset-confirm'])('Escape from %s cancels locally and restores the reset control', name => {
    const ui = fixture(), before = clone(ui.state), origin = ui.action('reset'); ui.click(origin);
    const action = ui.action(name); action.focus(); const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    act(() => action.dispatchEvent(event));
    expect(event.defaultPrevented).toBe(true); expect(ui.review().hidden).toBe(true); expect(document.activeElement).toBe(origin);
    expect(ui.state).toEqual(before); expect(ui.writes).toEqual([]);
  });
  it('confirms exactly one investigation reset while preserving flight settings and every other activity', () => {
    const ui = fixture(), before = clone(ui.state), origin = ui.action('reset'); ui.click(origin);
    const confirm = ui.action('reset-confirm'), retained = props(confirm);
    act(() => { confirm.focus(); confirm.click(); retained.onClick({ currentTarget: confirm }); });
    expect(ui.writes).toEqual([{ flightInvestigation: empty }]); expect(ui.state).toEqual({ ...before, flightInvestigation: empty });
    expect(ui.review().hidden).toBe(true); expect(document.activeElement).toBe(origin);
    expect(ui.status().textContent).toBe('Flight investigation cleared. Flight settings and other activities are unchanged.');
  });
  it('does not submit a second reset while the host acknowledgement is delayed', () => {
    const ui = fixture({ delay: true }), before = clone(ui.state); ui.click(ui.action('reset'));
    const confirm = ui.action('reset-confirm'), retained = props(confirm); ui.click(confirm);
    act(() => retained.onClick({ currentTarget: confirm }));
    expect(ui.writes).toEqual([{ flightInvestigation: empty }]); expect(ui.state).toEqual(before); expect(ui.review().hidden).toBe(true);
    ui.flush(); expect(ui.state).toEqual({ ...before, flightInvestigation: empty });
  });
  it('invalidates a reset immediately on an own edit even before a delayed host commit', () => {
    const ui = fixture({ delay: true }); ui.click(ui.action('reset')); ui.edit('New evidence that must survive.');
    expect(ui.review().textContent).toContain('This investigation changed'); expect(ui.action('reset-confirm').getAttribute('aria-disabled')).toBe('true');
    ui.click(ui.action('reset-confirm')); expect(ui.writes).toHaveLength(1); expect(ui.writes[0].flightInvestigation.evidence).toBe('New evidence that must survive.');
    ui.click(ui.action('reset-cancel')); ui.flush(); expect(ui.state.flightInvestigation.evidence).toBe('New evidence that must survive.');
  });
  it('permanently invalidates a review when external investigation data changes, even if it later returns to its earlier value', () => {
    const ui = fixture(), original = clone(ui.state.flightInvestigation); ui.click(ui.action('reset'));
    ui.set({ flightInvestigation: { ...original, evidence: 'Changed externally.' } });
    expect(ui.review().textContent).toContain('Nothing has been cleared'); ui.set({ flightInvestigation: original });
    expect(ui.action('reset-confirm').getAttribute('aria-disabled')).toBe('true'); ui.click(ui.action('reset-confirm'));
    expect(ui.writes).toEqual([]); expect(ui.state.flightInvestigation).toEqual(original);
    ui.click(ui.action('reset-cancel')); expect(document.activeElement).toBe(ui.action('reset'));
  });
  it('keeps the review valid through flight-only changes and clears only the reviewed investigation', () => {
    const ui = fixture(); ui.click(ui.action('reset')); ui.set({ flightWind: -7, flightStudyYaw: -45 });
    expect(ui.action('reset-confirm').getAttribute('aria-disabled')).toBe('false'); ui.click(ui.action('reset-confirm'));
    expect(ui.state.flightInvestigation).toEqual(empty); expect(ui.state.flightWind).toBe(-7); expect(ui.state.flightStudyYaw).toBe(-45);
  });
  it('closes its ephemeral review on tab leave and rejects the retained confirmation after return', () => {
    const ui = fixture(), before = clone(ui.state); ui.click(ui.action('reset'));
    const oldConfirm = ui.action('reset-confirm'), retained = props(oldConfirm);
    const otherTab = ui.host.querySelector('[data-migration-tab="inquiry"]'); ui.click(otherTab);
    expect(document.activeElement).toBe(otherTab); expect(ui.review()).toBeNull();
    const flightTab = ui.host.querySelector('[data-migration-tab="flight3d"]'); ui.click(flightTab);
    expect(ui.review().hidden).toBe(true); expect(ui.action('reset').disabled).toBe(false); expect(document.activeElement).toBe(flightTab);
    act(() => retained.onClick({ currentTarget: oldConfirm }));
    expect(ui.state.flightInvestigation).toEqual(before.flightInvestigation); expect(ui.writes.every(write => !('flightInvestigation' in write))).toBe(true);
  });
  it('rejects an old confirmation callback when a later review uses the same button element', () => {
    const ui = fixture(), before = clone(ui.state); ui.click(ui.action('reset'));
    const button = ui.action('reset-confirm'), retained = props(button); ui.click(ui.action('reset-cancel')); ui.click(ui.action('reset'));
    expect(ui.action('reset-confirm')).toBe(button); act(() => retained.onClick({ currentTarget: button }));
    expect(ui.writes).toEqual([]); expect(ui.state).toEqual(before); expect(ui.review().hidden).toBe(false);
  });
  it('does not borrow another mounted tool’s reset controls, review IDs, or learner work', () => {
    const first = fixture(), second = fixture({ seed: { flightInvestigation: { ...authored(), evidence: 'Second tool evidence.' } } });
    const beforeFirst = clone(first.state), beforeSecond = clone(second.state); first.click(first.action('reset')); second.click(second.action('reset'));
    expect(first.review().id).not.toBe(second.review().id); expect(document.getElementById(second.action('reset').getAttribute('aria-controls'))).toBe(second.review());
    const retained = props(second.action('reset-confirm')); act(() => retained.onClick({ currentTarget: first.action('reset-confirm') }));
    expect(first.state).toEqual(beforeFirst); expect(second.state).toEqual(beforeSecond);
    second.click(second.action('reset-confirm')); expect(second.state.flightInvestigation).toEqual(empty); expect(first.state).toEqual(beforeFirst);
  });
  it.each(['hidden', 'inert', 'aria-hidden'])('rejects a reset request in an unavailable %s instance', attribute => {
    const ui = fixture(), before = clone(ui.state), origin = ui.action('reset'); ui.host.setAttribute(attribute, attribute === 'aria-hidden' ? 'true' : '');
    act(() => origin.click()); expect(ui.review().hidden).toBe(true); expect(ui.writes).toEqual([]); expect(ui.state).toEqual(before);
  });
  it('rejects confirmation while another native fullscreen root excludes this investigation', () => {
    const ui = fixture(), before = clone(ui.state); ui.click(ui.action('reset'));
    const other = document.createElement('div'); document.body.append(other); Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => other });
    act(() => ui.action('reset-confirm').click()); expect(ui.state).toEqual(before); expect(ui.writes).toEqual([]);
    delete document.fullscreenElement; ui.click(ui.action('reset-cancel')); expect(ui.review().hidden).toBe(true);
  });
  it('rejects a detached retained reset control', () => {
    const ui = fixture(), before = clone(ui.state), button = ui.action('reset'), retained = props(button); ui.unmount();
    act(() => retained.onClick({ currentTarget: button })); expect(ui.state).toEqual(before); expect(ui.writes).toEqual([]);
  });
  it('does not steal focus when focus moves after the request or during cancellation', () => {
    const ui = fixture(), outside = document.createElement('input'); document.body.append(outside);
    const origin = ui.action('reset'); origin.focus(); act(() => { origin.click(); outside.focus(); });
    expect(ui.review().hidden).toBe(false); expect(document.activeElement).toBe(outside);
    act(() => ui.action('reset-cancel').click()); expect(ui.review().hidden).toBe(true); expect(document.activeElement).toBe(outside); expect(ui.writes).toEqual([]);
  });
  it('keeps translated review instructions and its labelled relationships local', () => {
    const ui = fixture({ t: (_key, fallback) => '«' + fallback + '»' }); ui.click(ui.action('reset'));
    const group = ui.review(), title = document.getElementById(group.getAttribute('aria-labelledby')), help = document.getElementById(group.getAttribute('aria-describedby'));
    expect(group.contains(title)).toBe(true); expect(group.contains(help)).toBe(true); expect(title.textContent).toBe('«Clear this investigation?»');
    expect(help.textContent).toContain('«This clears your prediction'); expect(ui.action('reset-cancel').textContent).toBe('«Cancel reset»');
  });
});
