import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
let engine, config, host, root, latest, latestAll, externalState, announce;
const GROUP = 'saved-three-matches';
const EXPIRED = 'The notebook changed. That observation action is no longer available.';
const record = (trial, experiment = 'brightness', overrides = {}) => ({
  id: `saved-${trial}`, experiment, date: `2026-10-03T14:00:0${trial}.000Z`,
  model: {
    matching: true, reveal: false, prediction: experiment === 'mullerLyer' ? 'Top' : 'Left',
    note: `match ${trial}`, matchValue: experiment === 'brightness' ? [121, 134, 146][trial - 1] : experiment === 'ebbinghaus' ? [44, 50, 53][trial - 1] : [380, 410, 425][trial - 1],
    ...overrides,
  },
  repeat: { id: GROUP, trial, startValue: experiment === 'brightness' ? [72, 184, 100][trial - 1] : experiment === 'ebbinghaus' ? [40, 60, 44][trial - 1] : [325, 475, 362][trial - 1] },
});
const group = (experiment = 'brightness') => [1, 2, 3].map(trial => record(trial, experiment));
const ids = state => state.studies.map(item => item.id);
const row = id => [...host.querySelectorAll('[data-perception-study]')].find(node => node.dataset.perceptionStudy === id);
const review = () => host.querySelector('[data-perception-study-review]');
const summary = () => host.querySelector('[data-perception-study-summary]');

async function mount(seed = {}, { strict = false } = {}) {
  function Harness() {
    const [data, setData] = React.useState({ perceptionLab: seed, otherTool: { preserved: 37 } });
    latest = engine.normalize(data.perceptionLab);
    latestAll = data;
    externalState = value => setData(previous => ({ ...previous, perceptionLab: value }));
    return config.render(makeCtx({ toolData: data, setToolData: setData, activeProfileId: 'learner-a', announceToSR: announce }));
  }
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => root.render(strict ? React.createElement(React.StrictMode, null, React.createElement(Harness)) : React.createElement(Harness)));
}
function button(label, scope = host) {
  const found = [...scope.querySelectorAll('button')].find(node => node.textContent.trim() === label || node.getAttribute('aria-label') === label);
  expect(found, label).toBeTruthy();
  return found;
}
async function click(label, scope = host) { await act(async () => button(label, scope).click()); }

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab();
  config = loadTool('stem_lab/stem_tool_perception.js', 'perceptionLab');
  engine = window.StemLab.PerceptionEngine;
  announce = vi.fn();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  root = host = null;
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('Persisted repeated-study metadata', () => {
  it('preserves legacy observations without inventing a repeated-study association', () => {
    const legacy = record(1);
    delete legacy.repeat;
    const oldShape = { ...record(2), repeat: { id: GROUP, trial1: 121, trial2: 134, trial3: 146, startValue: 72 } };
    const state = engine.normalize({ studies: [legacy, oldShape] });
    expect(state.studies).toHaveLength(2);
    expect(state.studies.every(item => !Object.hasOwn(item, 'repeat'))).toBe(true);
    expect(state.studies.map(item => item.model.note)).toEqual(['match 1', 'match 2']);
    expect(engine.savedStudy(state, GROUP)).toEqual({ count: 0, valid: false, complete: false, study: null });
  });

  it.each([
    ['array', []], ['missing id', { trial: 1, startValue: 72 }],
    ['blank id', { id: '  ', trial: 1, startValue: 72 }],
    ['numeric id', { id: 7, trial: 1, startValue: 72 }],
    ['zero trial', { id: GROUP, trial: 0, startValue: 72 }],
    ['fourth trial', { id: GROUP, trial: 4, startValue: 72 }],
    ['fractional trial', { id: GROUP, trial: 1.5, startValue: 72 }],
    ['string trial', { id: GROUP, trial: '1', startValue: 72 }],
    ['string start', { id: GROUP, trial: 1, startValue: '72' }],
    ['nonfinite start', { id: GROUP, trial: 1, startValue: Infinity }],
    ['NaN start', { id: GROUP, trial: 1, startValue: NaN }],
    ['below adjustment range', { id: GROUP, trial: 1, startValue: 15 }],
    ['above adjustment range', { id: GROUP, trial: 1, startValue: 241 }],
  ])('drops %s repeat metadata while retaining the observation', (_label, repeat) => {
    const normalized = engine.normalize({ studies: [{ ...record(1), repeat }] }).studies[0];
    expect(normalized.id).toBe('saved-1');
    expect(normalized.model.prediction).toBe('Left');
    expect(normalized).not.toHaveProperty('repeat');
  });

  it.each(['brightness', 'ebbinghaus', 'mullerLyer'])('accepts range endpoints for %s and canonicalizes group identity and start precision', experiment => {
    const bounds = engine.matching[experiment];
    const records = [record(1, experiment), record(2, experiment), record(3, experiment)];
    records[0].repeat = { id: '  bounded-group  ', trial: 1, startValue: bounds.min };
    records[1].repeat = { id: 'g'.repeat(120), trial: 2, startValue: bounds.max };
    records[2].repeat.startValue = (bounds.min + bounds.max) / 2 + 0.4;
    const state = engine.normalize({ studies: records });
    expect(state.studies[0].repeat).toEqual({ id: 'bounded-group', trial: 1, startValue: bounds.min });
    expect(state.studies[1].repeat).toEqual({ id: 'g'.repeat(96), trial: 2, startValue: bounds.max });
    expect(state.studies[2].repeat.startValue).toBe(Math.round(records[2].repeat.startValue));
  });

  it('does not associate observation mode or unsupported experiments with matching groups', () => {
    const state = engine.normalize({ studies: [record(1, 'brightness', { matching: false }), { ...record(2), experiment: 'cafeWall', model: { prediction: 'Level', matching: true } }] });
    expect(state.studies).toHaveLength(2);
    expect(state.studies.every(item => !Object.hasOwn(item, 'repeat'))).toBe(true);
  });

  it('repairs duplicate long record IDs independently of their shared group and round-trips the complete block', () => {
    const state = engine.normalize({ studies: group().map(item => ({ ...item, id: 'record-'.repeat(30), repeat: { ...item.repeat, id: 'group-'.repeat(30) } })) });
    const groupId = state.studies[0].repeat.id;
    expect(new Set(ids(state)).size).toBe(3);
    expect(ids(state).every(id => id.length <= 96)).toBe(true);
    expect(new Set(state.studies.map(item => item.repeat.id))).toEqual(new Set([groupId]));
    expect(groupId).toHaveLength(96);
    expect(engine.savedStudy(state, groupId)).toMatchObject({ count: 3, valid: true, complete: true });
    expect(engine.normalize(JSON.parse(JSON.stringify(state)))).toEqual(state);
    const removed = engine.deleteStudy(state, state.studies[1].id);
    expect(engine.savedStudy(removed.state, groupId)).toEqual({ count: 2, valid: true, complete: false, study: null });
    expect(engine.restoreDeleted(removed.state, removed.undo)).toEqual(state);
  });

  it('reports a partial group when the 24-observation cap removes its first trial', () => {
    const unrelated = Array.from({ length: 22 }, (_, index) => ({ ...record(1), id: `legacy-${index}`, repeat: undefined }));
    const state = engine.normalize({ studies: [...group(), ...unrelated] });
    expect(state.studies).toHaveLength(24);
    expect(state.studies.slice(0, 2).map(item => item.repeat.trial)).toEqual([2, 3]);
    expect(engine.savedStudy(state, GROUP)).toEqual({ count: 2, valid: true, complete: false, study: null });
    expect(engine.revealSavedStudy(state, GROUP)).toEqual(state);
    expect(engine.studySummary(engine.savedStudy(state, GROUP).study)).toBeNull();
  });
});

describe('Saved groups validate settings before pooling', () => {
  it('sorts saved trials by their index, keeps hidden values hidden, and reveals only the chosen group', () => {
    const records = group(), other = { ...record(1), id: 'other', repeat: { id: 'another-group', trial: 1, startValue: 72 } };
    const state = engine.normalize({ experiment: 'moire', studies: [records[2], other, records[0], records[1]], models: { moire: { angle: 7.3, note: 'active draft' } }, comparison: { experiment: 'ebbinghaus', model: { matching: true, matchValue: 58, note: 'pin' } } });
    const saved = engine.savedStudy(state, GROUP);
    expect(saved).toMatchObject({ count: 3, valid: true, complete: true, study: { revealed: false } });
    expect(saved.study.trials.map(item => item.id)).toEqual(['saved-1', 'saved-2', 'saved-3']);
    expect(engine.studySummary(saved.study)).toBeNull();
    const revealed = engine.revealSavedStudy(state, GROUP);
    expect(revealed.experiment).toBe('moire');
    expect(revealed.models).toEqual(state.models);
    expect(revealed.comparison).toEqual(state.comparison);
    expect(revealed.studies.find(item => item.id === 'other').model.reveal).toBe(false);
    expect(state.studies.every(item => !item.model.reveal)).toBe(true);
    expect(engine.studySummary(engine.savedStudy(revealed, GROUP).study)).toEqual({ count: 3, reference: 128, values: [121, 134, 146], starts: [72, 184, 100], median: 134, min: 121, max: 146, range: 25, difference: 6, percent: null, unit: 'RGB' });
  });

  it('requires every saved trial to be revealed before exposing a summary', () => {
    const records = group(); records[0].model.reveal = true; records[1].model.reveal = true;
    const state = engine.normalize({ studies: records });
    expect(engine.savedStudy(state, GROUP).study.revealed).toBe(false);
    expect(engine.studySummary(engine.savedStudy(state, GROUP).study)).toBeNull();
  });

  it.each([
    ['mixed experiment', records => { records[2] = record(3, 'ebbinghaus'); }],
    ['changed reference', records => { records[2].model.target = 160; }],
    ['changed surroundings', records => { records[2].model.contrast = 20; }],
    ['changed context', records => { records[2].model.context = false; }],
    ['changed swap', records => { records[2].model.swap = true; }],
    ['duplicate trial', records => { records[2].repeat.trial = 2; }],
    ['missing impression', records => { records[2].model.prediction = ''; }],
    ['four records', records => { records.push({ ...record(3), id: 'fourth' }); }],
  ])('does not summarize or reveal a group with %s', (_label, damage) => {
    const records = group(); damage(records);
    const state = engine.normalize({ studies: records });
    expect(engine.savedStudy(state, GROUP)).toEqual({ count: records.length, valid: false, complete: false, study: null });
    expect(engine.revealSavedStudy(state, GROUP)).toEqual(state);
    expect(engine.studySummary(engine.savedStudy(state, GROUP).study)).toBeNull();
  });

  it('rejects a reconstructed study with duplicate identities or out-of-order trials', () => {
    const saved = engine.savedStudy({ studies: group() }, GROUP).study;
    const duplicate = structuredClone(saved); duplicate.trials[2].id = duplicate.trials[0].id;
    const reordered = { ...saved, trials: [saved.trials[1], saved.trials[0], saved.trials[2]] };
    expect(engine.normalizeStudy(duplicate)).toBeNull();
    expect(engine.normalizeStudy(reordered)).toBeNull();
    expect(engine.normalizeStudy(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
  });
});

describe('Saved repeated-study notebook actions', () => {
  it('reviews without revealing, focuses the review, and returns focus to its opening action', async () => {
    await mount({ studies: group() });
    const opener = button('Review study', row('saved-2'));
    await act(async () => opener.click());
    expect(review().dataset.perceptionStudyReview).toBe(GROUP);
    expect(review().textContent).toContain('Three matches are saved.');
    expect(summary()).toBeNull();
    expect(review().contains(document.activeElement)).toBe(true);
    expect(latest.studies.every(item => !item.model.reveal)).toBe(true);
    await click('Close study review', review());
    expect(review()).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('reveals a saved block while preserving current drafts, the pinned comparison, and unrelated tool data', async () => {
    const seed = engine.normalize({ experiment: 'moire', studies: group(), models: { moire: { angle: 12.3, spacing: 17, note: 'unfinished draft' }, brightness: { target: 190, matchValue: 180, prediction: 'Right', note: 'another draft' } }, comparison: { experiment: 'necker', model: { depth: 75, cue: 'front', note: 'pinned cube' } } });
    await mount(seed);
    await click('Review study', row('saved-1'));
    await click('Reveal saved study', review());
    expect(latest.models).toEqual(seed.models);
    expect(latest.experiment).toBe(seed.experiment);
    expect(latest.comparison).toEqual(seed.comparison);
    expect(latestAll.otherTool).toEqual({ preserved: 37 });
    expect(latest.studies.every(item => item.model.reveal)).toBe(true);
    expect(summary().dataset.perceptionStudySummary).toBe(GROUP);
    expect(summary().textContent).toContain('Median match');
    expect(summary().textContent).toContain('134 RGB');
  });

  it('shows missing matches after deletion and recovers the complete block with Undo', async () => {
    const seed = engine.normalize({ studies: group().map(item => ({ ...item, model: { ...item.model, reveal: true } })) });
    await mount(seed);
    await click('Delete observation', row('saved-2'));
    await click('Review study', row('saved-1'));
    expect(review().textContent).toContain('2 of 3 matches remain');
    expect(summary()).toBeNull();
    expect(review().textContent).not.toContain('Median match');
    await click('Undo deletion');
    expect(latest.studies).toEqual(seed.studies);
    await click('Review study', row('saved-3'));
    expect(summary().textContent).toContain('134 RGB');
  });

  it('explains a conflicting saved block instead of presenting pooled statistics', async () => {
    const records = group(); records[2].model.target = 170;
    await mount({ studies: records });
    await click('Review study', row('saved-1'));
    expect(review().textContent).toContain('cannot form one study summary');
    expect(summary()).toBeNull();
    expect([...review().querySelectorAll('button')].some(node => node.textContent.trim() === 'Reveal saved study')).toBe(false);
  });

  it('restores and pins an individual trial without discarding its persisted group', async () => {
    const seed = engine.normalize({ experiment: 'moire', studies: group('mullerLyer') });
    await mount(seed);
    await click('Pin observation', row('saved-2'));
    expect(latest.comparison).toEqual({ experiment: 'mullerLyer', model: seed.studies[1].model });
    expect(latest.experiment).toBe('moire');
    await click('Restore observation', row('saved-2'));
    expect(latest.experiment).toBe('mullerLyer');
    expect(latest.models.mullerLyer).toEqual(seed.studies[1].model);
    expect(latest.studies).toEqual(seed.studies);
    expect(engine.savedStudy(latest, GROUP).complete).toBe(true);
  });

  it('repeats saved fixed settings in a fresh hidden block with an empty note and preserves the originals', async () => {
    const records = group('mullerLyer').map(item => ({ ...item, model: { ...item.model, context: false, swap: true, angle: 55, fin: 63, reveal: true } }));
    const seed = engine.normalize({ experiment: 'brightness', studies: records, comparison: { experiment: 'brightness', model: { target: 180 } } });
    await mount(seed);
    await click('Repeat these settings', row('saved-2'));
    const active = host.querySelector('[data-perception-repeat-active]');
    expect(active).toBeTruthy();
    expect(active.dataset.perceptionRepeatActive).not.toBe(GROUP);
    expect(active.dataset.perceptionRepeatActive).toBeTruthy();
    expect(latest.experiment).toBe('mullerLyer');
    expect(latest.models.mullerLyer).toMatchObject({ matching: true, reveal: false, context: false, swap: true, angle: 55, fin: 63, note: '', prediction: '' });
    expect(latest.models.mullerLyer.matchValue).not.toBe(seed.studies[1].model.matchValue);
    expect(latest.studies).toEqual(seed.studies);
    expect(latest.comparison).toEqual(seed.comparison);
    expect(summary()).toBeNull();
  });

  it('exports normalized capped observations with their group identities and trial start values', async () => {
    vi.useFakeTimers();
    const create = vi.fn(() => 'blob:repeated-notebook'), revoke = vi.fn(), downloads = [];
    vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { downloads.push({ filename: this.download, href: this.href }); });
    const legacy = Array.from({ length: 25 }, (_, index) => ({ ...record(1), id: `older-${index}`, repeat: undefined }));
    const seed = { studies: [...legacy, ...group()] };
    await mount(seed);
    const blob = vi.spyOn(globalThis, 'Blob');
    await click('Export notebook');
    const [parts, options] = blob.mock.calls.at(-1), payload = JSON.parse(parts.join(''));
    expect(payload).toEqual({ schema: 'alloflow.perception.notebook', version: 1, studies: engine.normalize(seed).studies });
    expect(payload.studies).toHaveLength(24);
    expect(payload.studies.slice(-3).map(item => item.repeat)).toEqual(group().map(item => item.repeat));
    expect(engine.savedStudy(engine.normalize({ studies: payload.studies }), GROUP).complete).toBe(true);
    expect(options.type).toBe('application/json;charset=utf-8');
    expect(downloads).toEqual([{ filename: 'perception-notebook.json', href: 'blob:repeated-notebook' }]);
    expect(revoke).not.toHaveBeenCalled();
    await act(async () => vi.runOnlyPendingTimers());
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:repeated-notebook');
  });

  it.each(['brightness', 'mullerLyer'])('expires a retained Reveal action after batched external replacement of a hidden %s group', async experiment => {
    await mount(engine.normalize({ experiment, studies: group(experiment) }));
    await click('Review study', row('saved-1'));
    const retained = button('Reveal saved study', review());
    const replacement = engine.normalize({});
    await act(async () => { externalState(replacement); retained.click(); });
    expect(latest).toEqual(replacement);
    expect(latest.studies).toHaveLength(0);
    expect(summary()).toBeNull();
    expect(announce.mock.calls.at(-1)?.[0]).toBe(EXPIRED);
    expect(host.querySelector('[role="status"]').textContent).toBe(EXPIRED);
  });

  it('expires saved Reveal success when a later external notebook replacement removes its group', async () => {
    await mount({ studies: group() });
    await click('Review study', row('saved-1'));
    await click('Reveal saved study', review());
    expect(announce).toHaveBeenLastCalledWith('Saved study drawing values revealed.');
    await act(async () => externalState(engine.normalize({ experiment: 'necker' })));
    expect(latest.studies).toEqual([]);
    expect(summary()).toBeNull();
    expect(announce).toHaveBeenLastCalledWith(EXPIRED);
    expect(host.querySelector('[role="status"]').textContent).toBe(EXPIRED);
  });

  it('preserves saved Reveal and complete grouping under StrictMode replay', async () => {
    await mount({ studies: group() }, { strict: true });
    await click('Review study', row('saved-2'));
    await click('Reveal saved study', review());
    expect(engine.savedStudy(latest, GROUP)).toMatchObject({ complete: true, study: { revealed: true } });
    expect(summary().textContent).toContain('134 RGB');
    expect(announce).toHaveBeenLastCalledWith('Saved study drawing values revealed.');
  });
});
