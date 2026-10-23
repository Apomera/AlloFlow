import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
let tool;
const mounts = [];
const clone = value => JSON.parse(JSON.stringify(value));
const fields = ['yaw', 'pitch', 'zoom', 'bird', 'wingStep', 'paused', 'motionReduced'];
function record(speciesId, region, patch = {}) {
  return { speciesId, region, note: speciesId + ' captured observation.', yaw: 35, pitch: 15, zoom: 1.2,
    bird: 0, wingStep: 7, paused: true, motionReduced: false, ...patch };
}
function notebook(secondPatch = {}, saved = true) {
  const first = record('canada_goose', 'head'), second = record('peregrine', 'head', secondPatch);
  return { drafts: { 'canada_goose:head': 'Unrecorded shape note.' }, records: {
    'canada_goose:head': first, 'peregrine:head': second, 'monarch:whole-wing': record('monarch', 'whole-wing', { yaw: 90 }) },
    comparison: { firstKey: 'canada_goose:head', secondKey: 'peregrine:head', draft: 'My unfinished comparison.',
      saved: saved ? { firstKey: 'canada_goose:head', secondKey: 'peregrine:head', first: clone(first), second: clone(second), claim: 'My original recorded claim.' } : null }
  };
}
function walk(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const hit = walk(child, predicate); if (hit) return hit; } return null; }
  return predicate(node) ? node : walk(node.props?.children, predicate);
}
function committedProps(element) {
  const key = Object.keys(element).find(name => name.startsWith('__reactProps$'));
  if (!key) throw Error('Expected committed React DOM event props');
  return element[key];
}
function enterText(element, value) {
  Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}
function fixture(book = notebook(), seed = {}, ctxPatch = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightPaused: true, flightSpecies: 'canada_goose',
    flightStudyObservationOpen: true, flightShowAnatomy: true, flightStudyRegion: 'head', flightStudyObservations: book,
    flightChallenges: { selectedId: 'wind', work: { wind: { prediction: 'Challenge prediction', notes: 'Challenge note' } } },
    flightInvestigation: { prediction: 'Investigation prediction', evidence: 'Investigation evidence', trials: [] }, inquiry: { hypothesis: 'Independent question' }, ...seed }, refresh, tree;
  const refs = [], writes = [], announce = vi.fn(), awardXP = vi.fn();
  const tracedReact = { ...React, useRef(value) { const ref = React.useRef(value); if (!refs.includes(ref)) refs.push(ref); return ref; } };
  const ctx = makeCtx({ ...ctxPatch, React: tracedReact, announceToSR: announce, awardXP,
    update: (_, key, value) => { writes.push({ [key]: value }); state = { ...state, [key]: value }; refresh(n => n + 1); },
    updateMulti: (_, patch) => { writes.push(patch); state = { ...state, ...patch }; refresh(n => n + 1); }
  });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); mounts.push(root);
  function Component() { refresh = React.useState(0)[1]; ctx.toolData = { migration: state }; tree = tool.render(ctx); return tree; }
  act(() => root.render(React.createElement(Component)));
  const ui = {
    host, writes, announce, awardXP, refs, get state() { return state; },
    panel(source = 'selected') { return host.querySelector('[data-study-view-check="' + source + '"]'); },
    button(source = 'selected') { return ui.panel(source)?.querySelector('[data-study-view-check-action="check"]'); },
    result(source = 'selected') { return ui.panel(source)?.querySelector('[data-study-view-check-result]'); },
    status(source = 'selected') { return ui.panel(source)?.querySelector('[data-study-view-check-status]').textContent; },
    row(key, source = 'selected') { return ui.result(source)?.querySelector('[data-view-condition="' + key + '"]'); },
    field() { return host.querySelector('textarea[aria-label="My observation comparison"]'); },
    click(source = 'selected') { act(() => { ui.button(source).focus(); ui.button(source).click(); }); },
    set(patch) { act(() => { state = { ...state, ...patch }; refresh(n => n + 1); }); },
    edit(value) { act(() => enterText(ui.field(), value)); },
    changeBook(change) { const book = clone(state.flightStudyObservations); change(book); ui.set({ flightStudyObservations: book }); },
    select(which, value) { act(() => { const input = host.querySelector('select[aria-label="' + which + ' recorded observation"]'); input.value = value; input.dispatchEvent(new Event('change', { bubbles: true })); }); },
    matched(source, which) { act(() => host.querySelector('[data-study-matched-comparison="' + source + '"] [data-study-matched="' + which + '"]').click()); },
    invoke(props, element) { act(() => props.onClick({ currentTarget: element })); },
    child(source = 'selected') { return walk(tree, node => node.type?.name === 'MigrationRecordedViewCheck' && node.props.source === source); }
  };
  return ui;
}
function expectReadOnly(ui, before) {
  expect(ui.state).toBe(before); expect(ui.writes).toEqual([]); expect(ui.awardXP).not.toHaveBeenCalled();
}
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn()); resetStemLab(); tool = loadTool('stem_lab/stem_tool_migration.js', 'migration'); });
afterEach(() => { act(() => mounts.splice(0).forEach(root => root.unmount())); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Recorded view condition checks', () => {
  it('offers explicit native actions with source-specific names and 44px targets, without checking or writing on mount', () => {
    const ui = fixture(), before = ui.state;
    for (const source of ['selected', 'saved']) {
      const button = ui.button(source); expect(button.type).toBe('button'); expect(button.textContent).toBe('Check recorded view conditions');
      expect(button.getAttribute('aria-label')).toContain(source === 'saved' ? 'Saved comparison captures' : 'Selected recorded observations');
      expect(button.getAttribute('aria-describedby')).toBe('migration-study-matched-help-' + source); expect(getComputedStyle(button).minHeight).toBe('44px');
      expect(button.hasAttribute('role')).toBe(false); expect(button.hasAttribute('tabindex')).toBe(false); expect(committedProps(button).onKeyDown).toBeUndefined();
      expect(ui.result(source)).toBeNull(); expect(ui.status(source)).toBe('');
    }
    expectReadOnly(ui, before);
  });
  it('checks all seven captured values explicitly without grading the explanation or asserting an identical pose', () => {
    const ui = fixture(), before = ui.state; ui.click();
    expect(ui.status()).toContain('All seven recorded settings match.'); expect(ui.result().querySelectorAll('[data-view-condition]')).toHaveLength(7);
    for (const key of fields) expect(ui.row(key).dataset.viewConditionMatch).toBe('true');
    expect(ui.result().textContent).toContain('does not establish equal physical size'); expect(ui.result().textContent).toContain('same individual across species');
    expect(ui.result().textContent).toContain('step counter is not a recorded animation frame'); expect(ui.result().textContent).toContain('does not grade your explanation');
    expect(document.activeElement).toBe(ui.button()); expect(ui.announce).toHaveBeenLastCalledWith(ui.status()); expectReadOnly(ui, before);
  });
  it.each([
    ['yaw', 90, 'Horizontal angle', '90°'], ['pitch', -5, 'Vertical angle', '-5°'], ['zoom', 1.45, 'Zoom multiplier', '1.45×'],
    ['bird', 4, 'Individual number', '5'], ['wingStep', 15, 'Recorded step counter', '15'],
    ['paused', false, 'Pause control', 'Off'], ['motionReduced', true, 'Reduce motion', 'On']
  ])('identifies only the captured %s difference', (key, value, label, second) => {
    const ui = fixture(notebook({ [key]: value })), before = ui.state; ui.click();
    expect(ui.status()).toContain('1 of 7 recorded settings differ.'); expect(ui.row(key).querySelector('dt').textContent).toBe(label);
    expect(ui.row(key).textContent).toContain('Second: ' + second); expect(ui.row(key).dataset.viewConditionMatch).toBe('false');
    for (const other of fields.filter(field => field !== key)) expect(ui.row(other).dataset.viewConditionMatch).toBe('true'); expectReadOnly(ui, before);
  });
  it('preserves enough zoom precision to explain a real captured mismatch', () => {
    const ui = fixture(notebook({ zoom: 1.2001 })); ui.click(); expect(ui.row('zoom').textContent).toContain('First: 1.2×; Second: 1.2001×');
    expect(ui.row('zoom').dataset.viewConditionMatch).toBe('false');
  });
  it('compares raw step counters even when they differ by one eight-step cycle, without inferring wing phase', () => {
    const ui = fixture(notebook({ wingStep: 15 })); ui.click(); expect(ui.row('wingStep').textContent).toContain('First: 7; Second: 15');
    expect(ui.row('wingStep').dataset.viewConditionMatch).toBe('false'); expect(ui.result().textContent).toContain('or the same wing pose');
  });
  it('reports pause and reduced-motion controls independently rather than labeling a still frame as running', () => {
    const book = notebook({ paused: false, motionReduced: true }); const ui = fixture(book); ui.click();
    expect(ui.row('paused').textContent).toContain('Second: Off'); expect(ui.row('motionReduced').textContent).toContain('Second: On');
    expect(ui.result().textContent).toContain('Pause and Reduce motion are separate captured controls.'); expect(ui.result().textContent).not.toContain('Running');
  });
  it('keeps selected records and historical captured records independently checkable', () => {
    const book = notebook(); book.records['peregrine:head'].yaw = 110; const ui = fixture(book), before = ui.state;
    ui.click('selected'); expect(ui.result('saved')).toBeNull(); expect(ui.row('yaw').textContent).toContain('110°');
    ui.click('saved'); expect(ui.row('yaw', 'saved').textContent).toContain('Second: 35°'); expect(ui.row('yaw', 'saved').dataset.viewConditionMatch).toBe('true');
    expect(ui.status('selected')).toContain('Selected recorded observations'); expect(ui.status('saved')).toContain('Saved comparison captures'); expectReadOnly(ui, before);
  });
  it('uses captured records after current camera, wing counter, individual or pause controls change', () => {
    const ui = fixture(notebook({ yaw: 90, wingStep: 15 })); ui.click(); const text = ui.result().textContent;
    ui.set({ flightStudyYaw: -180, flightStudyPitch: 60, flightStudyZoom: .65, flightStudyBird: 9, flightWingStep: 400, flightPaused: false });
    expect(ui.result().textContent).toBe(text); expect(ui.writes).toEqual([]);
  });
  it('retains the captured check through both matched-view actions without replacing source notes or the comparison draft', () => {
    const ui = fixture(notebook({ yaw: 90, wingStep: 15 })), book = ui.state.flightStudyObservations; ui.click(); const text = ui.result().textContent;
    const field = ui.field(); field.setSelectionRange(3, 14, 'backward');
    ui.matched('selected', 'first'); ui.matched('selected', 'second'); expect(ui.result().textContent).toBe(text);
    expect(ui.state.flightStudyObservations).toBe(book); expect(ui.field()).toBe(field);
    expect([field.selectionStart, field.selectionEnd, field.selectionDirection]).toEqual([3, 14, 'backward']);
    expect(ui.writes.every(patch => !('flightStudyObservations' in patch))).toBe(true); expect(ui.awardXP).not.toHaveBeenCalled();
  });
  it('invalidates the selected check when a captured setting changes and leaves the saved-source check intact', () => {
    const ui = fixture(); ui.click(); ui.click('saved'); ui.changeBook(book => { book.records['peregrine:head'].pitch = 55; });
    expect(ui.result()).toBeNull(); expect(ui.status()).toBe(''); expect(ui.result('saved')).not.toBeNull();
    ui.click(); expect(ui.row('pitch').textContent).toContain('Second: 55°'); expect(ui.row('pitch', 'saved').dataset.viewConditionMatch).toBe('true');
  });
  it('invalidates on an exact source-note replacement even if every view value remains the same', () => {
    const ui = fixture(); ui.click(); ui.changeBook(book => { book.records['peregrine:head'].note = 'A newly recorded observation.'; });
    expect(ui.result()).toBeNull(); ui.changeBook(book => { book.records['peregrine:head'].note = 'peregrine captured observation.'; }); expect(ui.result()).toBeNull();
  });
  it('preserves comparison field identity, caret and draft while checking and while unrelated drafts change', () => {
    const ui = fixture(), field = ui.field(); ui.edit('My revised but unrecorded comparison.'); field.setSelectionRange(4, 17, 'backward'); field.scrollTop = 6;
    ui.writes.length = 0; const before = ui.state; ui.click(); expectReadOnly(ui, before); expect(ui.field()).toBe(field);
    expect([field.selectionStart, field.selectionEnd, field.selectionDirection, field.scrollTop]).toEqual([4, 17, 'backward', 6]);
    ui.changeBook(book => { book.drafts['canada_goose:head'] = 'New unrecorded shape idea.'; }); expect(ui.result()).not.toBeNull(); expect(ui.field()).toBe(field);
    expect(field.value).toBe('My revised but unrecorded comparison.'); expect(ui.state.flightStudyObservations.comparison.saved.claim).toBe('My original recorded claim.');
  });
  it('does not discard a check merely because the comparison claim changes without changing its captured pair', () => {
    const ui = fixture(); ui.click('saved'); ui.changeBook(book => { book.comparison.saved.claim = 'Reworded claim with the same captured sources.'; });
    expect(ui.result('saved')).not.toBeNull(); expect(ui.status('saved')).toContain('All seven recorded settings match.');
  });
  it('resets only selected-source checks when the native observation selector changes', () => {
    const ui = fixture(); ui.click(); ui.click('saved'); ui.select('Second', 'monarch:whole-wing');
    expect(ui.result()).toBeNull(); expect(ui.result('saved')).not.toBeNull(); ui.click(); expect(ui.row('yaw').textContent).toContain('Second: 90°');
  });
  it('resets only saved-source checks when a saved captured pair is replaced', () => {
    const ui = fixture(); ui.click(); ui.click('saved'); ui.changeBook(book => { book.comparison.saved.second.yaw = 60; });
    expect(ui.result('saved')).toBeNull(); expect(ui.result()).not.toBeNull(); ui.click('saved'); expect(ui.row('yaw', 'saved').textContent).toContain('Second: 60°');
  });
  it('can still check immutable saved captures after their current source observations were removed', () => {
    const ui = fixture(); ui.changeBook(book => { book.records = {}; }); expect(ui.button()).toBeUndefined();
    const before = ui.state; ui.click('saved'); expect(ui.status('saved')).toContain('All seven recorded settings match.'); expectReadOnly(ui, before);
  });
  it('invalidates a selected check and reverses First/Second values after source ordering changes', () => {
    const ui = fixture(notebook({ yaw: 90 })); ui.click(); ui.changeBook(book => { [book.comparison.firstKey, book.comparison.secondKey] = [book.comparison.secondKey, book.comparison.firstKey]; });
    expect(ui.result()).toBeNull(); ui.click(); expect(ui.row('yaw').textContent).toContain('First: 90°; Second: 35°');
  });
  it('rejects retained handlers after a newer committed render even when the DOM button is reused', () => {
    const ui = fixture(), button = ui.button(), props = committedProps(button); ui.set({ flightWind: 11 }); expect(ui.button()).toBe(button);
    ui.invoke(props, button); expect(ui.result()).toBeNull(); expect(ui.announce).not.toHaveBeenCalled(); ui.click(); expect(ui.result()).not.toBeNull();
  });
  it('rejects detached handlers after a record replacement and after leaving the Study view', () => {
    const ui = fixture(), button = ui.button(), props = committedProps(button); ui.changeBook(book => { book.records['peregrine:head'].yaw = 65; });
    ui.invoke(props, button); expect(ui.result()).toBeNull(); expect(ui.announce).not.toHaveBeenCalled();
    const current = ui.button(), handler = committedProps(current); ui.set({ flightCamera: 'chase' }); ui.invoke(handler, current); expect(ui.announce).not.toHaveBeenCalled();
  });
  it('cannot use another source group or another mounted tool instance as event authority', () => {
    const first = fixture(), second = fixture(), props = committedProps(first.button());
    first.invoke(props, first.button('saved')); first.invoke(props, second.button());
    expect(first.result()).toBeNull(); expect(first.result('saved')).toBeNull(); expect(second.result()).toBeNull();
    expect(first.announce).not.toHaveBeenCalled(); expect(first.writes).toEqual([]); expect(second.writes).toEqual([]);
  });
  it('does not publish authority from an abandoned child render', () => {
    const ui = fixture(), button = ui.button(), handler = committedProps(button), child = ui.child();
    const ref = ui.refs.find(value => value.current?.panel === ui.panel()), owner = ref.current;
    const replay = { ...React, useRef: () => ref, useState: () => [false, vi.fn()] };
    child.type({ ...child.props, React: replay, first: { ...child.props.first, yaw: -120 }, signature: 'abandoned source' });
    expect(ref.current).toBe(owner); ui.invoke(handler, button); expect(ui.result()).not.toBeNull(); expect(ui.row('yaw').textContent).toContain('First: 35°');
  });
  it('omits checks when no usable selected or saved pair exists', () => {
    const book = notebook({}, false); book.records = {}; const ui = fixture(book); expect(ui.panel()).toBeNull(); expect(ui.panel('saved')).toBeNull(); expect(ui.writes).toEqual([]);
  });
  it('uses translated action, source, field, status, values and limitations labels', () => {
    const ui = fixture(notebook({ paused: false }), {}, { t: (_, fallback) => 'translated ' + fallback });
    expect(ui.button().textContent).toBe('translated Check recorded view conditions'); ui.click();
    expect(ui.status()).toContain('translated Selected recorded observations'); expect(ui.row('paused').textContent).toContain('translated Pause control');
    expect(ui.row('paused').textContent).toContain('translated Off'); expect(ui.row('paused').textContent).toContain('translated Differs');
    expect(ui.result().textContent).toContain('translated Matching recorded settings does not establish');
  });
});
