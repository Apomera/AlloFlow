import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const MODES = [
  { id: 'brightness', starts: [16, 240, 109], values: [121, 134, 146] },
  { id: 'ebbinghaus', starts: [32, 72, 51], values: [44, 50, 53] },
  { id: 'mullerLyer', starts: [250, 550, 411], values: [380, 410, 425] },
];
let engine, config, host, root, latest, latestAll, externalState, changeProfile, announce, writes, deferred, pending, flush;

function record(id, experiment = 'brightness', changes = {}) {
  return engine.normalize({ studies: [{ id, experiment, date: '2026-10-04T12:00:00.000Z', model: { prediction: experiment === 'moire' ? 'Both' : 'Same', note: 'Saved ' + id, ...changes } }] }).studies[0];
}
function group(id = 'study', experiment = 'brightness', changes = {}) {
  const mode = MODES.find(item => item.id === experiment);
  return mode.values.map((matchValue, index) => ({ ...record(id + '-record-' + (index + 1), experiment, { matching: true, matchValue, ...changes }), repeat: { id, trial: index + 1, startValue: mode.starts[index] } }));
}
const standalone = count => Array.from({ length: count }, (_, index) => record('standalone-' + index));
function seed(studies = []) {
  return engine.normalize({ experiment: 'moire', studies, expanded: true,
    models: { moire: { angle: 13.2, spacing: 18, prediction: 'Both', note: 'current draft' } },
    comparison: { experiment: 'necker', model: { depth: 75, cue: 'front', note: 'pinned cube' } },
  });
}
const ids = state => state.studies.map(item => item.id);
const removeGroup = (state, id = 'study') => engine.deleteSavedStudy(state, id);
const restoreGroup = (state, undo) => engine.restoreDeletedStudy(state, undo);
function interleaved() {
  const a = group('study'), b = group('other', 'ebbinghaus');
  return seed([record('first'), a[0], b[0], record('middle'), a[1], b[1], record('late'), a[2], b[2], record('last')]);
}
async function mount(value = seed(), { strict = false } = {}) {
  writes = 0; deferred = false; pending = [];
  function Harness() {
    const [data, setData] = React.useState({ perceptionLab: value, otherTool: { preserved: 37 } });
    const [profile, setProfile] = React.useState('capacity-learner');
    latest = engine.normalize(data.perceptionLab); latestAll = data; changeProfile = setProfile;
    externalState = update => setData(previous => ({ ...previous, perceptionLab: typeof update === 'function' ? update(previous.perceptionLab) : update }));
    flush = () => pending.splice(0).forEach(setData);
    return config.render(makeCtx({ toolData: data, setToolData: update => { writes++; if (deferred) pending.push(update); else setData(update); }, activeProfileId: profile, announceToSR: announce }));
  }
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  const content = React.createElement(Harness);
  await act(async () => root.render(strict ? React.createElement(React.StrictMode, null, content) : content));
}
function button(label, scope = host) {
  const found = [...scope.querySelectorAll('button')].find(node => (node.getAttribute('aria-label') || node.textContent).trim() === label);
  expect(found, label).toBeTruthy(); return found;
}
const click = async (label, scope = host) => act(async () => button(label, scope).click());
const optionalButton = label => [...host.querySelectorAll('button')].find(node => (node.getAttribute('aria-label') || node.textContent).trim() === label);
const row = id => [...host.querySelectorAll('[data-perception-study]')].find(node => node.dataset.perceptionStudy === id);
const card = id => [...host.querySelectorAll('[data-perception-notebook-group]')].find(node => node.dataset.perceptionNotebookGroup === id);
const preview = () => host.querySelector('[data-perception-group-delete-preview]');
const review = () => host.querySelector('[data-perception-study-review]');
const active = () => host.querySelector('[data-perception-repeat-active]');
const capacityText = () => host.querySelector('[data-perception-notebook-capacity]').textContent;
const notebookHeading = () => host.querySelector('.perception-journal h3');
const statusText = () => host.querySelector('.perception-status').textContent;
const matchingSeed = studies => engine.normalize({ ...seed(studies), experiment: 'brightness', models: { ...seed().models, brightness: { matching: true, prediction: 'Same', note: 'current matching draft', matchValue: 155 } } });
async function openDelete(id = 'study', { fromReview = false } = {}) {
  if (fromReview) {
    await click('Review study', row(id + '-record-1'));
    await act(async () => review().querySelector('[data-perception-delete-group]').click());
  } else {
    await input(host.querySelector('[data-perception-notebook-view]'), 'studies');
    await act(async () => card(id).querySelector('[data-perception-delete-group]').click());
  }
}
async function confirmDelete() {
  expect(preview()).toBeTruthy();
  await act(async () => preview().querySelector('[data-perception-confirm-group-delete]').click());
}
async function input(node, value) {
  expect(node).toBeTruthy(); const select = node instanceof HTMLSelectElement;
  const prototype = select ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event(select ? 'change' : 'input', { bubbles: true }));
  });
}
function expectPreservedDrawing(baseline) {
  expect(latest.experiment).toBe(baseline.experiment); expect(latest.models).toEqual(baseline.models);
  expect(latest.comparison).toEqual(baseline.comparison); expect(latestAll.otherTool).toEqual({ preserved: 37 });
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab(); config = loadTool('stem_lab/stem_tool_perception.js', 'perceptionLab'); engine = window.StemLab.PerceptionEngine; announce = vi.fn();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1); vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); host?.remove(); root = host = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('Perception notebook capacity and grouped deletion engine', () => {
  it.each([0, 1, 21, 22, 23, 24])('reports retained capacity for %s saved observations without mutating them', count => {
    const state = seed(standalone(count)), baseline = structuredClone(state);
    expect(engine.notebookCapacity(state)).toEqual({ limit: 24, saved: count, free: 24 - count });
    expect(state).toEqual(baseline);
  });

  it('normalizes malformed or oversized persisted inputs before calculating capacity', () => {
    expect(engine.notebookCapacity(null)).toEqual({ limit: 24, saved: 0, free: 24 });
    const raw = { studies: [...standalone(30), { id: 'invalid', experiment: 'missing' }] }, original = structuredClone(raw);
    const normalized = engine.normalize(raw);
    expect(engine.notebookCapacity(raw)).toEqual({ limit: 24, saved: normalized.studies.length, free: 24 - normalized.studies.length });
    expect(raw).toEqual(original);
  });

  it.each(MODES)('deletes only the entire interleaved $id group and restores original global positions and reveal flags', mode => {
    const members = group('study', mode.id); members[0].model.reveal = true;
    const state = seed([record('first'), members[2], record('second'), members[0], record('third'), members[1], record('last')]), baseline = structuredClone(state);
    const removed = removeGroup(state);
    expect(ids(removed.state)).toEqual(['first', 'second', 'third', 'last']);
    expect(removed.undo).toEqual({ groupId: 'study', records: [1, 3, 5].map(index => ({ study: state.studies[index], index })) });
    expect(restoreGroup(removed.state, removed.undo)).toEqual(state);
    expect(state).toEqual(baseline);
    removed.undo.records[0].study.model.note = 'mutated undo snapshot';
    expect(state).toEqual(baseline);
  });

  it.each([
    ['one retained member', members => members.slice(0, 1)],
    ['two retained members', members => members.slice(1)],
    ['duplicate trials', members => { members[2].repeat.trial = 2; return members; }],
    ['different fixed settings', members => { members[2].model.contrast = 12; return members; }],
    ['mixed experiments', members => { members[2] = group('study', 'mullerLyer')[2]; return members; }],
    ['four retained members', members => [...members, { ...structuredClone(members[0]), id: 'extra-member' }]],
  ])('can delete and atomically undo a %s group without inventing a valid summary', (_, alter) => {
    const members = alter(group()), state = seed([record('first'), ...members, record('last')]);
    const removed = removeGroup(state);
    expect(ids(removed.state)).toEqual(['first', 'last']); expect(removed.undo.records).toHaveLength(members.length);
    expect(restoreGroup(removed.state, removed.undo)).toEqual(state);
  });

  it.each([['missing', 'missing'], ['blank', '  '], ['nontext', null]])('does nothing for a %s group identity', (_, id) => {
    const state = interleaved(); expect(removeGroup(state, id)).toEqual({ state, undo: null });
  });

  it('trims and bounds group IDs consistently without deleting standalone observations', () => {
    const state = seed([record('study'), ...group('study')]);
    expect(ids(removeGroup(state, '  study  ').state)).toEqual(['study']);
    const id = 's'.repeat(96), long = seed(group(id));
    expect(removeGroup(long, id + 'extra').state.studies).toEqual([]);
  });

  it('preserves independent groups and does not mutate the undo object while restoring', () => {
    const state = interleaved(), removed = removeGroup(state), beforeState = structuredClone(removed.state), beforeUndo = structuredClone(removed.undo);
    const restored = restoreGroup(removed.state, removed.undo);
    expect(restored).toEqual(state); expect(removed.state).toEqual(beforeState); expect(removed.undo).toEqual(beforeUndo);
    restored.studies.find(item => item.id === 'study-record-1').model.note = 'changed restored copy';
    expect(removed.undo).toEqual(beforeUndo); expect(removed.state).toEqual(beforeState);
  });

  it('restores the whole study alongside later saved observations when all of them fit', () => {
    const state = interleaved(), removed = removeGroup(state);
    const current = engine.normalize({ ...removed.state, studies: [...removed.state.studies, record('later-one'), record('later-two')] });
    const restored = restoreGroup(current, removed.undo);
    expect(restored.studies).toEqual([...state.studies, current.studies.at(-2), current.studies.at(-1)]);
    expect(restored.models).toEqual(current.models); expect(restored.comparison).toEqual(current.comparison);
  });

  it.each([22, 23, 24])('refuses all three restored members with only %s current observations rather than evicting or partially restoring', count => {
    const removed = removeGroup(seed(group())); const current = seed(standalone(count)), baseline = structuredClone(current);
    expect(restoreGroup(current, removed.undo)).toEqual(current); expect(current).toEqual(baseline);
    expect(engine.savedStudy(current, 'study').count).toBe(0);
  });

  it('fits an entire three-member undo into exactly three free places', () => {
    const removed = removeGroup(seed(group())), current = seed(standalone(21));
    const restored = restoreGroup(current, removed.undo);
    expect(restored.studies).toHaveLength(24); expect(restored.studies.slice(0, 3)).toEqual(group());
    expect(restored.studies.slice(3)).toEqual(current.studies);
  });

  it.each([
    ['record identity', current => { current.studies[0].id = 'study-record-2'; }],
    ['group identity', current => { current.studies.push(...group('study').slice(0, 1)); }],
  ])('rejects a %s collision without restoring any other member', (_, collide) => {
    const removed = removeGroup(seed(group())), current = seed(standalone(2)); collide(current);
    const canonical = engine.normalize(current); expect(restoreGroup(current, removed.undo)).toEqual(canonical);
  });

  it.each([
    ['null', () => null], ['empty object', () => ({})], ['empty records', undo => { undo.records = []; return undo; }],
    ['missing group', undo => { delete undo.groupId; return undo; }],
    ['wrong group membership', undo => { undo.records[1].study.repeat.id = 'other'; return undo; }],
    ['missing repeat metadata', undo => { delete undo.records[1].study.repeat; return undo; }],
    ['unknown experiment', undo => { undo.records[1].study.experiment = 'missing'; return undo; }],
    ['duplicate record identities', undo => { undo.records[1].study.id = undo.records[0].study.id; return undo; }],
    ['negative position', undo => { undo.records[1].index = -1; return undo; }],
    ['fractional position', undo => { undo.records[1].index = 1.5; return undo; }],
    ['duplicate positions', undo => { undo.records[1].index = undo.records[0].index; return undo; }],
    ['descending positions', undo => { undo.records[1].index = 0; return undo; }],
    ['unreachable position', undo => { undo.records[2].index = 24; return undo; }],
    ['uncanonical group identity', undo => { undo.groupId = ' study '; return undo; }],
    ['overlong group identity', undo => { undo.groupId = 's'.repeat(97); return undo; }],
    ['missing canonical model field', undo => { delete undo.records[1].study.model.context; return undo; }],
    ['uncanonical model value', undo => { undo.records[1].study.model.target = 1.5; return undo; }],
    ['invalid repeat start', undo => { undo.records[1].study.repeat.startValue = 1.5; return undo; }],
  ])('rejects a malformed group undo with %s atomically', (_, damage) => {
    const removed = removeGroup(interleaved()), undo = damage(structuredClone(removed.undo)), current = removed.state;
    expect(restoreGroup(current, undo)).toEqual(current);
  });

  it.each([0, 12, 24])('single-record undo at index %s refuses a full notebook without trading away another trial', index => {
    const state = seed([...group('preserved'), ...standalone(21)]), baseline = structuredClone(state);
    const undo = { study: record('deleted-record'), index };
    expect(engine.restoreDeleted(state, undo)).toEqual(state); expect(state).toEqual(baseline);
    expect(engine.savedStudy(state, 'preserved')).toMatchObject({ count: 3, complete: true });
  });

  it.each(MODES)('records $id matches only into free places and never removes another study', mode => {
    const study = engine.createStudy(mode.id, { matching: true }, 'new-study', mode.starts);
    const submitted = engine.normalize({ experiment: mode.id, studies: [...group('preserved'), ...standalone(21)], models: { [mode.id]: { ...engine.studyModel(study), prediction: 'Same', matchValue: mode.values[0] } } });
    const baseline = structuredClone(submitted), rejected = engine.recordStudyTrial(submitted, study, 1, 'new-match', '');
    expect(rejected.recorded).toBe(false); expect(rejected.state).toEqual(baseline); expect(rejected.study).toEqual(study);
    const available = engine.normalize({ ...submitted, studies: submitted.studies.slice(0, 23) });
    const accepted = engine.recordStudyTrial(available, study, 1, 'new-match', '');
    expect(accepted.recorded).toBe(true); expect(accepted.state.studies.slice(0, 23)).toEqual(available.studies);
    expect(accepted.state.studies.at(-1).id).toBe('new-match'); expect(submitted).toEqual(baseline);
  });

  it.each([21, 22, 23, 24])('guided repeat at %s saved records requires room for the entire new study', count => {
    const state = seed([...standalone(count - 3), ...group('study')]), baseline = structuredClone(state);
    const result = engine.planRepeat(state, 'study', 'contrast', 30);
    expect(result.status).toBe(count === 21 ? 'ready' : 'capacity');
    if (count > 21) expect(result).toMatchObject({ base: null, starts: [] });
    expect(state).toEqual(baseline);
  });
});

describe('Perception notebook capacity and grouped deletion controls', () => {
  it.each([21, 22, 23, 24])('shows unfiltered capacity at %s saved observations and separately gates one-place and three-place actions', async count => {
    const state = matchingSeed([...group(), ...standalone(count - 3)]);
    await mount(state);
    expect(capacityText()).toBe('Saved observations: ' + count + ' of 24. Available spaces: ' + (24 - count) + '.');
    expect(button('Save observation').disabled).toBe(count === 24);
    expect(button('Start three matches').disabled).toBe(count > 21);
    expect(button('Repeat these settings', row('study-record-1')).disabled).toBe(count > 21);
    expect(!!host.querySelector('[data-perception-capacity-reason="save"]')).toBe(count === 24);
    expect(!!host.querySelector('[data-perception-capacity-reason="study"]')).toBe(count > 21);
    await input(host.querySelector('[data-perception-notebook-search]'), 'does not match');
    expect(capacityText()).toBe('Saved observations: ' + count + ' of 24. Available spaces: ' + (24 - count) + '.');
    expect(latest).toEqual(state);
  });

  it('saves into the last available place and preserves every earlier study member', async () => {
    const state = seed([...group(), ...standalone(20)]);
    await mount(state); await click('Save observation');
    expect(latest.studies).toHaveLength(24); expect(latest.studies.slice(0, 23)).toEqual(state.studies);
    expect(engine.savedStudy(latest, 'study')).toMatchObject({ count: 3, complete: true });
    expect(latest.studies.at(-1)).toMatchObject({ experiment: 'moire', model: state.models.moire });
    expect(button('Save observation').disabled).toBe(true); expectPreservedDrawing(state);
  });

  it('handles two activations of the last-place save under StrictMode without evicting or duplicating', async () => {
    const state = seed([...group(), ...standalone(20)]);
    await mount(state, { strict: true }); const save = button('Save observation');
    await act(async () => { save.click(); save.click(); });
    expect(latest.studies).toHaveLength(24); expect(latest.studies.slice(0, 23)).toEqual(state.studies);
    expect(new Set(ids(latest)).size).toBe(24); expectPreservedDrawing(state);
  });

  it('a batched stale Save refuses the latest full notebook without discarding its oldest trial', async () => {
    const state = seed([...group(), ...standalone(20)]); await mount(state);
    const save = button('Save observation'), full = engine.normalize({ ...state, studies: [...state.studies, record('arrived')] });
    await act(async () => { externalState(full); save.click(); });
    expect(latest).toEqual(full); expect(statusText()).toContain('1 available spaces; 0 remain');
    expect(announce).toHaveBeenLastCalledWith(statusText());
  });

  it('a deferred Save refuses capacity filled while its updater was queued', async () => {
    const state = seed([...group(), ...standalone(20)]); await mount(state); deferred = true;
    await click('Save observation'); expect(pending).toHaveLength(1);
    const full = engine.normalize({ ...state, studies: [...state.studies, record('arrived')] });
    await act(async () => externalState(full)); deferred = false; await act(async () => flush());
    expect(latest).toEqual(full); expect(statusText()).toContain('1 available spaces; 0 remain');
  });

  it('a deferred Save cannot cross a learner profile change', async () => {
    const state = seed(standalone(2)); await mount(state); deferred = true; await click('Save observation');
    await act(async () => changeProfile('another learner')); deferred = false; await act(async () => flush());
    expect(latest).toEqual(state); expectPreservedDrawing(state);
  });

  it('a deferred Save cannot write after the tool unmounts', async () => {
    const state = seed(standalone(2)); await mount(state); deferred = true; await click('Save observation');
    const queued = pending[0], previous = structuredClone(latestAll); await act(async () => root.unmount()); root = null;
    const result = queued(previous); expect(result).toEqual(previous);
  });

  it.each([21, 22])('guided repeats require three free places with %s existing observations', async count => {
    const state = seed([...group(), ...standalone(count - 3)]); await mount(state);
    await click('Review study', row('study-record-1')); await click('Plan one-setting repeat');
    await input(host.querySelector('[data-perception-guided-setting]'), 'contrast');
    await input(host.querySelector('[data-perception-guided-value]'), 30);
    expect(host.querySelector('[data-perception-guided-plan]').dataset.perceptionGuidedStatus).toBe(count === 21 ? 'ready' : 'capacity');
    expect(button('Start planned study').disabled).toBe(count !== 21); expect(latest).toEqual(state);
  });

  it('starts and completes all three matches in exactly three free places without removing saved data', async () => {
    const state = matchingSeed(standalone(21)); await mount(state); await click('Start three matches');
    const groupId = active().dataset.perceptionRepeatActive;
    for (const value of [133, 149, 161]) {
      await input(host.querySelector('#perception-match-value'), value); await click('Same'); await click('Record match');
    }
    expect(latest.studies).toHaveLength(24); expect(latest.studies.slice(0, 21)).toEqual(state.studies);
    expect(engine.savedStudy(latest, groupId)).toMatchObject({ count: 3, complete: true });
    expect(latest.studies.slice(21).every(item => !item.model.reveal)).toBe(true);
  });

  it('rejects a queued new study after fewer than three places remain', async () => {
    const state = matchingSeed(standalone(21)); await mount(state); deferred = true;
    await click('Start three matches'); expect(pending).toHaveLength(1);
    const next = engine.normalize({ ...state, studies: [...state.studies, record('arrived')] });
    await act(async () => externalState(next)); deferred = false; await act(async () => flush());
    expect(latest).toEqual(next); expect(active()).toBeNull(); expect(statusText()).toContain('3 available spaces; 2 remain');
  });

  it('rejects a queued repeat of saved settings after fewer than three places remain', async () => {
    const state = seed([...group(), ...standalone(18)]); await mount(state); deferred = true;
    await click('Repeat these settings', row('study-record-1'));
    const next = engine.normalize({ ...state, studies: [...state.studies, record('arrived')] });
    await act(async () => externalState(next)); deferred = false; await act(async () => flush());
    expect(latest).toEqual(next); expect(active()).toBeNull(); expectPreservedDrawing(state);
  });

  it('Review notebook moves focus to the notebook when a new study cannot fit', async () => {
    await mount(matchingSeed(standalone(22))); await click('Review notebook');
    expect(document.activeElement).toBe(notebookHeading()); expect(writes).toBe(0);
  });

  it.each([
    ['complete', members => members, 'Brightness & context'],
    ['partial', members => members.slice(1), 'Brightness & context'],
    ['duplicate trials', members => { members[2].repeat.trial = 2; return members; }, 'Brightness & context'],
    ['mixed settings', members => { members[2].model.contrast = 12; return members; }, 'Brightness & context'],
    ['mixed experiments', members => { members[2] = group('study', 'mullerLyer')[2]; return members; }, 'Mixed experiments'],
    ['four members', members => [...members, { ...structuredClone(members[0]), id: 'extra-member' }], 'Brightness & context'],
  ])('previews the real retained count and title for a %s group before removing it', async (_, alter, title) => {
    const members = alter(group()), state = seed([record('first'), ...members, record('last')]);
    await mount(state); await openDelete();
    expect(preview().textContent).toContain(title); expect(preview().textContent).toContain('all ' + members.length + ' retained observations');
    expect(button('Delete ' + members.length + ' observations', preview())).toBeTruthy();
    expect(document.activeElement).toBe(preview().querySelector('h4')); expect(latest).toEqual(state); expect(writes).toBe(0);
    await confirmDelete(); expect(ids(latest)).toEqual(['first', 'last']); expectPreservedDrawing(state);
    await click('Undo deletion'); expect(latest).toEqual(state);
  });

  it('deletes and restores an interleaved group once, retaining all observations, drafts, pin, flags and original global numbers', async () => {
    const state = interleaved(); state.studies[4].model.reveal = true;
    await mount(state); await openDelete(); await confirmDelete();
    expect(latest).toEqual(removeGroup(state).state); expect(preview()).toBeNull();
    expect(document.activeElement).toBe(button('Undo deletion')); expect(capacityText()).toContain('7 of 24');
    await click('Undo deletion'); expect(latest).toEqual(state); expectPreservedDrawing(state);
    expect(document.activeElement).toBe(notebookHeading()); expect(optionalButton('Undo deletion')).toBeUndefined();
    const details = card('study').querySelector('details'); details.open = true;
    expect([1, 2, 3].map(n => row('study-record-' + n).value)).toEqual([2, 5, 8]);
  });

  it('restores a deleted whole study alongside a later saved observation when it still fits', async () => {
    const state = interleaved(); await mount(state); await openDelete(); await confirmDelete();
    await click('Save observation'); const added = structuredClone(latest.studies.at(-1));
    expect(button('Undo deletion').disabled).toBe(false); await click('Undo deletion');
    expect(latest.studies).toEqual([...state.studies, added]); expectPreservedDrawing(state);
  });

  it('keeps whole-study Undo available but disabled when a later save leaves only two places', async () => {
    const state = seed([...group(), ...standalone(21)]); await mount(state); await openDelete(); await confirmDelete();
    await click('Save observation'); const baseline = structuredClone(latest), writeCount = writes;
    expect(button('Undo deletion').disabled).toBe(true);
    expect(host.querySelector('[data-perception-undo-capacity]').textContent).toBe('Undo needs 3 available spaces; 2 remain. No observations were changed.');
    await click('Undo deletion'); expect(latest).toEqual(baseline); expect(writes).toBe(writeCount);
    expect(optionalButton('Undo deletion')).toBeTruthy(); expectPreservedDrawing(state);
  });

  it('a stale enabled whole-study Undo clicked in the same batch as a save refuses partial restoration and keeps its buffer', async () => {
    const state = seed([...group(), ...standalone(21)]); await mount(state); await openDelete(); await confirmDelete();
    const undo = button('Undo deletion'), save = button('Save observation'), remaining = structuredClone(latest.studies);
    await act(async () => { save.click(); undo.click(); });
    expect(latest.studies).toHaveLength(22); expect(latest.studies.slice(0, 21)).toEqual(remaining);
    expect(latest.studies.some(item => item.repeat?.id === 'study')).toBe(false); expect(button('Undo deletion').disabled).toBe(true);
    expect(statusText()).toBe('Undo needs 3 available spaces; 2 remain. No observations were changed.');
    expect(announce).toHaveBeenLastCalledWith(statusText());
  });

  it('a stale enabled individual Undo cannot replace another retained trial when a save fills the notebook', async () => {
    const state = seed([...group(), ...standalone(21)]); await mount(state); await click('Delete observation', row('study-record-1'));
    const undo = button('Undo deletion'), save = button('Save observation'), remaining = structuredClone(latest.studies);
    await act(async () => { save.click(); undo.click(); });
    expect(latest.studies).toHaveLength(24); expect(latest.studies.slice(0, 23)).toEqual(remaining);
    expect(ids(latest)).toContain('study-record-2'); expect(ids(latest)).toContain('study-record-3'); expect(ids(latest)).not.toContain('study-record-1');
    expect(button('Undo deletion').disabled).toBe(true); expect(statusText()).toBe('Undo needs 1 available spaces; 0 remain. No observations were changed.');
  });

  it('Cancel deletion returns focus to a connected visible card opener without writing state', async () => {
    const state = interleaved(); await mount(state); await openDelete(); const opener = card('study').querySelector('[data-perception-delete-group]');
    await click('Cancel deletion', preview()); expect(preview()).toBeNull(); expect(document.activeElement).toBe(opener);
    expect(latest).toEqual(state); expect(writes).toBe(0);
  });

  it('Cancel deletion returns focus to the visible review opener', async () => {
    const state = interleaved(); await mount(state); await openDelete('study', { fromReview: true });
    const opener = review().querySelector('[data-perception-delete-group]'); await click('Cancel deletion', preview());
    expect(document.activeElement).toBe(opener); expect(review()).toBeTruthy(); expect(latest).toEqual(state);
  });

  it('Cancel deletion uses the notebook heading when filters remove its card opener', async () => {
    const state = interleaved(); await mount(state); await openDelete();
    await input(host.querySelector('[data-perception-notebook-search]'), 'no results'); expect(card('study')).toBeUndefined();
    expect(preview()).toBeTruthy(); await click('Cancel deletion', preview());
    expect(document.activeElement).toBe(notebookHeading()); expect(latest).toEqual(state); expect(writes).toBe(0);
  });

  it('a stale confirmation after external notebook replacement cannot delete that replacement group', async () => {
    await mount(interleaved()); await openDelete(); const confirm = preview().querySelector('[data-perception-confirm-group-delete]');
    const replacement = seed(group('study', 'mullerLyer'));
    await act(async () => { externalState(replacement); confirm.click(); });
    expect(latest).toEqual(replacement); expect(preview()).toBeNull(); expect(optionalButton('Undo deletion')).toBeUndefined();
  });

  it('a deferred group confirmation expires after the notebook changes', async () => {
    await mount(interleaved()); await openDelete(); deferred = true; await confirmDelete();
    const replacement = seed(group('study', 'mullerLyer')); await act(async () => externalState(replacement));
    deferred = false; await act(async () => flush());
    expect(latest).toEqual(replacement); expect(optionalButton('Undo deletion')).toBeUndefined();
  });

  it('a deferred group confirmation cannot cross a learner profile change', async () => {
    const state = interleaved(); await mount(state); await openDelete(); deferred = true; await confirmDelete();
    await act(async () => changeProfile('another learner')); deferred = false; await act(async () => flush());
    expect(latest).toEqual(state); expect(optionalButton('Undo deletion')).toBeUndefined(); expect(preview()).toBeNull();
  });

  it('a deferred group confirmation cannot delete after unmount', async () => {
    await mount(interleaved()); await openDelete(); deferred = true; await confirmDelete();
    const queued = pending[0], previous = structuredClone(latestAll); await act(async () => root.unmount()); root = null;
    expect(queued(previous)).toEqual(previous);
  });

  it('external notebook changes invalidate an open deletion preview even without a confirmation', async () => {
    await mount(interleaved()); await openDelete(); const replacement = seed([record('new')]);
    await act(async () => externalState(replacement)); expect(preview()).toBeNull(); expect(latest).toEqual(replacement);
  });

  it('a stale group Undo cannot restore into an externally changed notebook', async () => {
    await mount(interleaved()); await openDelete(); await confirmDelete(); const undo = button('Undo deletion');
    const replacement = seed([record('new')]); await act(async () => { externalState(replacement); undo.click(); });
    expect(latest).toEqual(replacement); expect(optionalButton('Undo deletion')).toBeUndefined();
  });

  it.each(['group', 'individual'])('queued %s Undo cannot cross profiles even when both notebooks have the same empty fingerprint', async kind => {
    await mount(seed(kind === 'group' ? group() : [record('single')]));
    if (kind === 'group') { await openDelete(); await confirmDelete(); }
    else await click('Delete observation', row('single'));
    expect(latest.studies).toEqual([]); const empty = structuredClone(latest);
    deferred = true; await click('Undo deletion'); expect(pending).toHaveLength(1);
    await act(async () => changeProfile('another empty-notebook learner'));
    deferred = false; await act(async () => flush());
    expect(latest).toEqual(empty); expect(optionalButton('Undo deletion')).toBeUndefined();
  });

  it.each(['group', 'individual'])('queued %s Undo cannot write to an empty notebook after unmount', async kind => {
    await mount(seed(kind === 'group' ? group() : [record('single')]));
    if (kind === 'group') { await openDelete(); await confirmDelete(); }
    else await click('Delete observation', row('single'));
    deferred = true; await click('Undo deletion'); const queued = pending[0], previous = structuredClone(latestAll);
    await act(async () => root.unmount()); root = null;
    expect(queued(previous)).toEqual(previous); expect(previous.perceptionLab.studies).toEqual([]);
  });

  it('automatic preview invalidation returns focus to its still-visible connected opener', async () => {
    const state = interleaved(); await mount(state); await openDelete();
    const opener = card('study').querySelector('[data-perception-delete-group]');
    expect(document.activeElement).toBe(preview().querySelector('h4'));
    const changed = engine.normalize({ ...state, studies: state.studies.map(item => item.id === 'first' ? { ...item, model: { ...item.model, note: 'changed notebook' } } : item) });
    await act(async () => externalState(changed));
    expect(preview()).toBeNull(); expect(document.activeElement).toBe(opener); expect(latest).toEqual(changed);
  });

  it('automatic preview invalidation returns focus to the notebook when its focused opener disappears', async () => {
    await mount(interleaved()); await openDelete(); const changed = seed([record('new')]);
    await act(async () => externalState(changed));
    expect(preview()).toBeNull(); expect(document.activeElement).toBe(notebookHeading()); expect(latest).toEqual(changed);
  });

  it('automatic preview invalidation does not steal focus from a search field outside it', async () => {
    const state = interleaved(); await mount(state); await openDelete();
    const search = host.querySelector('[data-perception-notebook-search]'); await act(async () => search.focus());
    const changed = seed([record('new')]); await act(async () => externalState(changed));
    expect(preview()).toBeNull(); expect(document.activeElement).toBe(search); expect(latest).toEqual(changed);
  });

  it('Escape cancels only the focused deletion preview and returns focus without collapsing the expanded drawing', async () => {
    const state = interleaved(); await mount(state); await openDelete();
    const opener = card('study').querySelector('[data-perception-delete-group]');
    await act(async () => preview().querySelector('h4').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    expect(preview()).toBeNull(); expect(document.activeElement).toBe(opener); expect(latest).toEqual(state); expect(writes).toBe(0);
    expect(host.querySelector('[data-perception-expanded]').dataset.perceptionExpanded).toBe('true');
  });

  it('a queued individual deletion cannot cross profiles when the incoming notebook has the same record', async () => {
    const state = seed([record('single')]); await mount(state); deferred = true;
    await click('Delete observation', row('single')); await act(async () => changeProfile('another learner'));
    deferred = false; await act(async () => flush()); expect(latest).toEqual(state); expect(optionalButton('Undo deletion')).toBeUndefined();
  });

  it('a queued individual deletion cannot write after unmount', async () => {
    await mount(seed([record('single')])); deferred = true; await click('Delete observation', row('single'));
    const queued = pending[0], previous = structuredClone(latestAll); await act(async () => root.unmount()); root = null;
    expect(queued(previous)).toEqual(previous);
  });

  it('the next individual deletion replaces a previous group Undo', async () => {
    await mount(interleaved()); await openDelete(); await confirmDelete();
    await input(host.querySelector('[data-perception-notebook-view]'), 'observations');
    await click('Delete observation', row('first')); await click('Undo deletion');
    expect(ids(latest)).toEqual(ids(removeGroup(interleaved()).state)); expect(engine.savedStudy(latest, 'study').count).toBe(0);
  });

  it('the next group deletion replaces a previous individual Undo', async () => {
    const state = interleaved(); await mount(state); await click('Delete observation', row('first'));
    await openDelete(); await confirmDelete(); await click('Undo deletion');
    expect(latest.studies).toEqual(state.studies.slice(1)); expect(ids(latest)).not.toContain('first');
  });

  it('canceling a later group deletion keeps the previous whole-study Undo', async () => {
    const state = interleaved(); await mount(state); await openDelete(); await confirmDelete();
    await act(async () => card('other').querySelector('[data-perception-delete-group]').click());
    await click('Cancel deletion', preview()); await click('Undo deletion');
    expect(latest).toEqual(state); expectPreservedDrawing(state);
  });

  it('opening and canceling notebook import keeps a whole-study deletion Undo', async () => {
    const state = interleaved(); await mount(state); await openDelete(); await confirmDelete();
    await click('Import notebook'); await click('Cancel import'); await click('Undo deletion');
    expect(latest).toEqual(state); expectPreservedDrawing(state);
  });

  it('a learner profile change clears whole-study Undo and pending deletion previews', async () => {
    await mount(interleaved()); await openDelete(); await confirmDelete();
    await act(async () => card('other').querySelector('[data-perception-delete-group]').click());
    const current = structuredClone(latest); await act(async () => changeProfile('another learner'));
    expect(preview()).toBeNull(); expect(optionalButton('Undo deletion')).toBeUndefined(); expect(latest).toEqual(current);
  });

  it('group deletion is unavailable while a matching study is collecting', async () => {
    const state = matchingSeed(group()); await mount(state); await click('Review study', row('study-record-1'));
    await click('Start three matches'); expect(active()).toBeTruthy();
    expect(host.querySelector('[data-perception-delete-group]')).toBeNull();
    expect(preview()).toBeNull(); expect(latest.studies).toEqual(state.studies);
    await click('End repeated study'); expect(host.querySelector('[data-perception-delete-group]')).toBeTruthy();
  });

  it('whole-study confirmation is idempotent under StrictMode and double activation', async () => {
    const state = interleaved(); await mount(state, { strict: true }); await openDelete(); const confirm = preview().querySelector('[data-perception-confirm-group-delete]');
    await act(async () => { confirm.click(); confirm.click(); }); expect(latest).toEqual(removeGroup(state).state);
    await click('Undo deletion'); expect(latest).toEqual(state); expect(new Set(ids(latest)).size).toBe(state.studies.length);
  });

  it.each(['study', 'other'])('deleting %s applies the correct A/B review cleanup and Undo does not reopen selected views', async groupId => {
    const state = interleaved(); state.studies.filter(item => item.repeat).forEach(item => { item.model.reveal = true; });
    // The second group uses the same experiment so the pair is eligible.
    const other = group('other', 'brightness', { reveal: true });
    state.studies = state.studies.map(item => item.repeat?.id === 'other' ? other[item.repeat.trial - 1] : item);
    await mount(engine.normalize(state)); await click('Review study', row('study-record-1'));
    await input(host.querySelector('[data-perception-study-selector]'), 'other'); expect(host.querySelector('[data-perception-study-pair-results]')).toBeTruthy();
    if (groupId === 'study') await act(async () => review().querySelector('[data-perception-delete-group]').click());
    else { await input(host.querySelector('[data-perception-notebook-view]'), 'studies'); await act(async () => card('other').querySelector('[data-perception-delete-group]').click()); }
    await confirmDelete(); expect(host.querySelector('[data-perception-study-pair-results]')).toBeNull();
    expect(review()?.dataset.perceptionStudyReview || '').toBe(groupId === 'study' ? '' : 'study');
    await click('Undo deletion'); expect(host.querySelector('[data-perception-study-pair-results]')).toBeNull();
    expect(review()?.dataset.perceptionStudyReview || '').toBe(groupId === 'study' ? '' : 'study');
    expect(latest).toEqual(engine.normalize(state));
  });
});
