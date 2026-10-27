import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const { flushSync } = createRequire(import.meta.url)(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom'));
const roots = new Set();
const clone = value => JSON.parse(JSON.stringify(value));
let tool;

function snapshot(values = {}) {
  return { speciesId: 'canada_goose', season: 'fall', formationMode: 'natural', wind: 0, ...values };
}
function attempt(index = 0) {
  return { baseline: snapshot({ speciesId: 'monarch', wind: -15 }),
    snapshot: snapshot({ speciesId: 'monarch', wind: index + 1 }), prediction: 'Saved prediction ' + index,
    notes: 'Saved challenge evidence ' + index };
}
function trial(index = 0) {
  return { variable: 'wind', prediction: 'Saved trial prediction ' + index,
    baseline: snapshot(), snapshot: snapshot({ wind: index + 10 }) };
}
function record(region, note) {
  return { speciesId: 'canada_goose', region, note, bird: 0, yaw: 35, pitch: 15,
    zoom: 1, wingStep: 0, paused: true, motionReduced: true };
}
function seed(values = {}) {
  return { tab: 'flight3d', flightCamera: 'study', flightSpecies: 'canada_goose', flightPaused: true,
    flightStudyRegion: 'head', flightStudyObservationOpen: true,
    flightStudyObservations: { drafts: { 'canada_goose:head': 'Keep the unfinished head draft.', 'canada_goose:tail': 'Keep the tail draft.' },
      records: { 'canada_goose:head': record('head', 'Recorded head evidence.'), 'canada_goose:tail': record('tail', 'Recorded tail evidence.') } },
    flightChallenges: { selectedId: 'wind', work: {
      wind: { prediction: 'Keep the current challenge prediction.', notes: 'Keep the current challenge notes.',
        setup: snapshot({ speciesId: 'monarch', wind: -15 }), attempts: [attempt(0), attempt(1), attempt(2)] },
      formation: { prediction: 'Keep the other goal prediction.', notes: 'Keep the other goal evidence.', attempts: [] }
    } },
    flightInvestigation: { variable: 'wind', prediction: 'Keep the investigation prediction.', baseline: snapshot(),
      evidence: 'Keep the investigation evidence.', explanation: 'Keep the investigation explanation.', trials: [trial(0), trial(1), trial(2)] },
    inquiry: { hypothesis: 'Keep the independent hypothesis.', explanation: 'Keep the independent explanation.' }, ...values };
}
function committedHandler(element) {
  const key = Object.keys(element).find(name => name.startsWith('__reactProps$'));
  expect(key).toBeTruthy(); return element[key].onClick;
}
function fixture(values = {}, options = {}) {
  let state = seed(values), refresh;
  const writes = [], queued = [];
  function write(patch) {
    writes.push(patch);
    if (options.delayed) { queued.push(patch); return; }
    state = { ...state, ...patch }; refresh(number => number + 1);
  }
  const ctx = makeCtx({ update: (_, key, value) => write({ [key]: value }), updateMulti: (_, patch) => write(patch) });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); roots.add(root);
  function Component() {
    refresh = React.useState(0)[1]; ctx.toolData = { migration: state }; return tool.render(ctx);
  }
  act(() => root.render(React.createElement(Component)));
  const ui = {
    host, writes, queued,
    get state() { return state; },
    open() {
      for (const selector of ['[data-study-observation]', '[data-migration-flight-challenges]', '[data-flight-challenge-history]']) {
        const details = host.querySelector(selector); if (details) details.open = true;
      }
    },
    remove(kind, index = 1) {
      return host.querySelector(kind === 'observation' ? '[data-study-remove]' :
        kind === 'challenge' ? '[data-challenge-remove="' + index + '"]' : '[data-trial-remove="' + index + '"]');
    },
    field(id) { return host.querySelector('[data-migration-id="' + id + '"]'); },
    fallback(kind) {
      return kind === 'observation' ? ui.field('migration-study-observation-note') :
        host.querySelector(kind === 'challenge' ? '[data-flight-challenge-action="check"]' : '[data-experiment-action="record"]');
    },
    activate(button) {
      expect(button).not.toBeNull(); let during;
      act(() => { button.focus(); button.click(); during = document.activeElement; });
      ui.open(); return during;
    },
    invoke(handler, button) { act(() => handler({ currentTarget: button })); ui.open(); },
    set(patch) { act(() => { state = { ...state, ...patch }; refresh(number => number + 1); }); ui.open(); },
    commit(patch) { flushSync(() => { state = { ...state, ...patch }; refresh(number => number + 1); }); ui.open(); },
    flush() { act(() => { state = { ...state, ...queued.shift() }; refresh(number => number + 1); }); ui.open(); },
    unmount() { act(() => root.unmount()); roots.delete(root); host.remove(); }
  };
  ui.open(); return ui;
}
function remaining(ui, kind) {
  if (kind === 'observation') return Object.keys(ui.state.flightStudyObservations.records).length;
  return kind === 'challenge' ? ui.state.flightChallenges.work.wind.attempts.length : ui.state.flightInvestigation.trials.length;
}
function expectOtherWork(ui, before, kind) {
  const changed = kind === 'observation' ? 'flightStudyObservations' : kind === 'challenge' ? 'flightChallenges' : 'flightInvestigation';
  for (const key of Object.keys(before)) if (key !== changed) expect(ui.state[key], key).toEqual(before[key]);
  expect(ui.writes).toHaveLength(1); expect(Object.keys(ui.writes[0])).toEqual([changed]);
  if (kind === 'observation') {
    expect(ui.state.flightStudyObservations.drafts).toEqual(before.flightStudyObservations.drafts);
    expect(ui.state.flightStudyObservations.records['canada_goose:tail']).toEqual(before.flightStudyObservations.records['canada_goose:tail']);
  } else if (kind === 'challenge') {
    expect(ui.state.flightChallenges.work.formation).toMatchObject(before.flightChallenges.work.formation);
    expect(ui.state.flightChallenges.work.wind.prediction).toBe(before.flightChallenges.work.wind.prediction);
    expect(ui.state.flightChallenges.work.wind.notes).toBe(before.flightChallenges.work.wind.notes);
  } else {
    for (const key of ['prediction', 'evidence', 'explanation']) expect(ui.state.flightInvestigation[key]).toBe(before.flightInvestigation[key]);
  }
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('matchMedia', query => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} }));
  resetStemLab(); tool = loadTool('stem_lab/stem_tool_migration.js', 'migration');
});
afterEach(() => {
  act(() => { roots.forEach(root => root.unmount()); roots.clear(); });
  document.body.innerHTML = ''; vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Migration removal focus ownership', () => {
  it('moves directly to the retained observation draft before removing its saved record', () => {
    const ui = fixture(), before = clone(ui.state), input = ui.field('migration-study-observation-note');
    const during = ui.activate(ui.remove('observation'));
    expect(during).toBe(input); expect(document.activeElement).toBe(input);
    expect(ui.field('migration-study-observation-note')).toBe(input); expect(input.value).toBe('Keep the unfinished head draft.');
    expect(ui.state.flightStudyObservations.records['canada_goose:head']).toBeUndefined(); expectOtherWork(ui, before, 'observation');
  });

  it('retains the saved note as an editable draft when no newer observation draft exists', () => {
    const saved = seed().flightStudyObservations; delete saved.drafts['canada_goose:head'];
    const ui = fixture({ flightStudyObservations: saved }), input = ui.field('migration-study-observation-note');
    expect(ui.activate(ui.remove('observation'))).toBe(input); expect(input.value).toBe('Recorded head evidence.');
    expect(ui.state.flightStudyObservations.drafts['canada_goose:head']).toBe('Recorded head evidence.');
  });

  it.each(['challenge', 'trial'])('keeps the index-keyed %s button focused when the next saved row takes its place', kind => {
    const ui = fixture(), before = clone(ui.state), action = ui.remove(kind, 2);
    expect(ui.activate(action)).toBe(action); expect(document.activeElement).toBe(action);
    expect(ui.remove(kind, 2)).toBe(action); expect(remaining(ui, kind)).toBe(2); expectOtherWork(ui, before, kind);
    const rows = kind === 'challenge' ? ui.state.flightChallenges.work.wind.attempts : ui.state.flightInvestigation.trials;
    expect(rows.map(row => row.prediction)).toEqual(kind === 'challenge'
      ? ['Saved prediction 0', 'Saved prediction 2'] : ['Saved trial prediction 0', 'Saved trial prediction 2']);
  });

  it.each(['challenge', 'trial'])('focuses the surviving previous control before removing the last %s row', kind => {
    const ui = fixture(), previous = ui.remove(kind, 2), action = ui.remove(kind, 3);
    expect(ui.activate(action)).toBe(previous); expect(document.activeElement).toBe(previous);
    expect(ui.remove(kind, 2)).toBe(previous); expect(action.isConnected).toBe(false); expect(remaining(ui, kind)).toBe(2);
  });

  it.each(['challenge', 'trial'])('focuses an enabled stable action when removing the only %s row', kind => {
    const initial = seed(); initial.flightChallenges.work.wind.attempts = [attempt()]; initial.flightInvestigation.trials = [trial()];
    const ui = fixture(initial), fallback = ui.fallback(kind);
    expect(fallback.disabled).toBe(false); expect(ui.activate(ui.remove(kind))).toBe(fallback);
    expect(document.activeElement).toBe(fallback); expect(remaining(ui, kind)).toBe(0);
  });

  it.each(['challenge', 'trial'])('falls back to the prediction when the stable %s action is disabled', kind => {
    const initial = seed(); initial.flightChallenges.work.wind.attempts = [attempt()]; initial.flightChallenges.work.wind.prediction = '';
    initial.flightInvestigation.trials = [trial()]; initial.flightInvestigation.baseline = null;
    const ui = fixture(initial), field = ui.field(kind === 'challenge' ? 'migration-mission-prediction' : 'migration-experiment-prediction');
    expect(ui.fallback(kind).disabled).toBe(true); expect(ui.activate(ui.remove(kind))).toBe(field);
    expect(document.activeElement).toBe(field); expect(field.disabled).toBe(false); expect(remaining(ui, kind)).toBe(0);
  });

  it.each(['observation', 'challenge', 'trial'])('sets %s focus before a delayed host commit and preserves a later deliberate focus choice', kind => {
    const ui = fixture({}, { delayed: true }), action = ui.remove(kind, kind === 'observation' ? 1 : 3);
    const target = kind === 'observation' ? ui.fallback(kind) : ui.remove(kind, 2);
    expect(ui.activate(action)).toBe(target); expect(ui.queued).toHaveLength(1); expect(document.activeElement).toBe(target);
    const other = ui.field('migration-experiment-explanation'); other.focus(); ui.flush();
    act(() => vi.runOnlyPendingTimers()); expect(document.activeElement).toBe(other); expect(ui.queued).toHaveLength(0);
  });

  it.each(['observation', 'challenge', 'trial'])('does not move an existing external focus when a current %s action is invoked programmatically', kind => {
    const ui = fixture(), action = ui.remove(kind), handler = committedHandler(action);
    const other = document.createElement('button'); document.body.append(other); other.focus();
    ui.invoke(handler, action); act(() => vi.runOnlyPendingTimers());
    expect(document.activeElement).toBe(other); expect(ui.writes).toHaveLength(1);
  });

  it.each(['observation', 'challenge', 'trial'])('cannot deliver deferred %s focus after the learner changes tabs', kind => {
    const ui = fixture(); ui.activate(ui.remove(kind));
    const tab = ui.host.querySelector('[data-migration-tab="world"]'); tab.focus(); ui.set({ tab: 'world' });
    act(() => vi.runOnlyPendingTimers()); expect(document.activeElement).toBe(tab); expect(ui.state.tab).toBe('world');
  });

  it('does not refocus a newly selected observation region after removal', () => {
    const ui = fixture(); ui.activate(ui.remove('observation'));
    const region = ui.host.querySelector('[data-study-region="tail"]'); region.focus(); ui.set({ flightStudyRegion: 'tail' });
    act(() => vi.runOnlyPendingTimers()); expect(document.activeElement).toBe(region);
    expect(ui.field('migration-study-observation-note').getAttribute('data-study-observation-key')).toBe('canada_goose:tail');
  });

  it('does not refocus another challenge goal after removal', () => {
    const ui = fixture(); ui.activate(ui.remove('challenge'));
    const goal = ui.host.querySelector('[data-flight-challenge="formation"]'); goal.focus();
    ui.set({ flightChallenges: { ...ui.state.flightChallenges, selectedId: 'formation' } });
    act(() => vi.runOnlyPendingTimers()); expect(document.activeElement).toBe(goal);
  });

  it.each(['observation', 'challenge', 'trial'])('keeps %s focus and mutation inside the activated tool instance', kind => {
    const first = fixture(), second = fixture(), before = clone(first.state);
    const target = kind === 'observation' ? second.fallback(kind) : second.remove(kind, 2);
    expect(second.activate(second.remove(kind, kind === 'observation' ? 1 : 3))).toBe(target);
    expect(document.activeElement).toBe(target); expect(first.state).toEqual(before); expect(first.writes).toEqual([]);
    expect(first.host.contains(document.activeElement)).toBe(false);
  });

  it.each(['observation', 'challenge', 'trial'])('rejects duplicate, retained, and detached %s handlers without extra writes or focus changes', kind => {
    const ui = fixture(), action = ui.remove(kind), handler = committedHandler(action); action.focus();
    act(() => { handler({ currentTarget: action }); handler({ currentTarget: action }); });
    expect(ui.writes).toHaveLength(1); const after = clone(ui.state);
    const other = ui.field('migration-experiment-explanation'); other.focus(); ui.invoke(handler, action);
    expect(ui.writes).toHaveLength(1); expect(ui.state).toEqual(after); expect(document.activeElement).toBe(other);
    ui.set({ tab: 'world' }); const tab = ui.host.querySelector('[data-migration-tab="world"]'); tab.focus();
    ui.invoke(handler, action); expect(ui.writes).toHaveLength(1); expect(document.activeElement).toBe(tab);
  });

  it('does not apply a removal after its focus target synchronously unmounts the tool', () => {
    const ui = fixture(), before = clone(ui.state), target = ui.fallback('observation');
    target.addEventListener('focus', () => ui.unmount(), { once: true });
    ui.activate(ui.remove('observation'));
    expect(ui.writes).toEqual([]); expect(ui.state).toEqual(before); expect(ui.host.isConnected).toBe(false);
  });

  it('does not overwrite a newer observation context committed by a focus listener', () => {
    const ui = fixture(), records = clone(ui.state.flightStudyObservations.records), target = ui.fallback('observation');
    target.addEventListener('focus', () => ui.commit({ flightStudyRegion: 'tail' }), { once: true });
    ui.activate(ui.remove('observation'));
    expect(ui.writes).toEqual([]); expect(ui.state.flightStudyRegion).toBe('tail');
    expect(ui.state.flightStudyObservations.records).toEqual(records);
    expect(ui.field('migration-study-observation-note').getAttribute('data-study-observation-key')).toBe('canada_goose:tail');
  });
});
