import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const MODES = [
  { id: 'brightness', a: [121, 134, 146], b: [128, 142, 150], starts: [72, 184, 100], reference: 128, shift: 8, percent: null, unit: 'RGB' },
  { id: 'ebbinghaus', a: [44, 50, 53], b: [48, 52, 56], starts: [40, 60, 44], reference: 48, shift: 2, percent: 100 / 24, unit: 'units' },
  { id: 'mullerLyer', a: [380, 410, 425], b: [390, 430, 445], starts: [325, 475, 363], reference: 400, shift: 20, percent: 5, unit: 'units' },
];
let engine, config, host, root, latest, latestAll, externalState, changeProfile, announce, deferUpdates, pendingUpdates, flushUpdates;

function group(groupId, mode = MODES[0], values = mode.a, model = {}, starts = mode.starts) {
  return values.map((matchValue, index) => ({
    id: groupId + '-record-' + (index + 1), experiment: mode.id,
    date: '2026-10-03T12:00:0' + (index + 1) + '.000Z',
    model: { matching: true, reveal: true, prediction: 'Same', note: groupId + ' note ' + (index + 1), matchValue, ...model },
    repeat: { id: groupId, trial: index + 1, startValue: starts[index] },
  }));
}
const pairState = (mode = MODES[0], a = {}, b = {}) => engine.normalize({ studies: [...group('group-a', mode, mode.a, a), ...group('group-b', mode, mode.b, b)] });
const compare = state => engine.compareStudies(state, 'group-a', 'group-b');
function expectHiddenStatistics(result) {
  for (const key of ['experiment', 'reference', 'summaryA', 'summaryB', 'medianShift', 'percentShift', 'startsDiffer']) expect(result[key], key).toBeNull();
  expect(result.changes).toEqual([]);
}

async function mount(seed = {}, { strict = false } = {}) {
  function Harness() {
    const [data, setData] = React.useState({ perceptionLab: seed, otherTool: { preserved: 37 } });
    const [profile, setProfile] = React.useState('comparison-learner');
    latest = engine.normalize(data.perceptionLab);
    latestAll = data;
    changeProfile = setProfile;
    externalState = value => setData(previous => ({ ...previous, perceptionLab: value }));
    flushUpdates = () => pendingUpdates.splice(0).forEach(setData);
    return config.render(makeCtx({
      toolData: data, activeProfileId: profile, announceToSR: announce,
      setToolData: update => deferUpdates ? pendingUpdates.push(update) : setData(update),
    }));
  }
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  const content = React.createElement(Harness);
  await act(async () => root.render(strict ? React.createElement(React.StrictMode, null, content) : content));
}
function button(label, scope = host) {
  const found = [...scope.querySelectorAll('button')].find(node => (node.getAttribute('aria-label') || node.textContent).trim() === label);
  expect(found, label).toBeTruthy();
  return found;
}
const click = async (label, scope = host) => act(async () => button(label, scope).click());
const row = id => [...host.querySelectorAll('[data-perception-study]')].find(node => node.dataset.perceptionStudy === id);
const review = () => host.querySelector('[data-perception-study-review]');
const selector = () => host.querySelector('[data-perception-study-selector]');
const results = () => host.querySelector('[data-perception-study-pair-results]');
const unavailable = () => host.querySelector('[data-perception-study-pair-unavailable]')?.dataset.perceptionStudyPairUnavailable;
async function select(id, node = selector()) {
  expect(node).toBeTruthy();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(node, id);
    node.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
async function openPair(seed = pairState(), options) {
  await mount(seed, options);
  await click('Review study', row('group-a-record-1'));
  await select('group-b');
}
function resultRow(label) {
  const found = [...results().querySelectorAll('tbody tr')].find(node => node.querySelector('th')?.textContent === label);
  expect(found, label).toBeTruthy();
  return [...found.querySelectorAll('td')].map(node => node.textContent);
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab();
  config = loadTool('stem_lab/stem_tool_perception.js', 'perceptionLab');
  engine = window.StemLab.PerceptionEngine;
  announce = vi.fn();
  deferUpdates = false;
  pendingUpdates = [];
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  root = host = null;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('Saved matching-study comparison engine', () => {
  it.each(MODES)('$id keeps the groups separate and reports a signed B-minus-A shift against the common reference', mode => {
    const result = compare(pairState(mode));
    expect(result.status).toBe('ready');
    expect(result.reference).toBe(mode.reference);
    expect(result.experiment).toBe(mode.id);
    expect(result.summaryA).toMatchObject({ count: 3, values: mode.a, starts: mode.starts, median: [...mode.a].sort((a, b) => a - b)[1], range: Math.max(...mode.a) - Math.min(...mode.a), unit: mode.unit });
    expect(result.summaryB).toMatchObject({ count: 3, values: mode.b, starts: mode.starts, median: [...mode.b].sort((a, b) => a - b)[1], range: Math.max(...mode.b) - Math.min(...mode.b), unit: mode.unit });
    expect(result.medianShift).toBe(mode.shift);
    if (mode.percent === null) expect(result.percentShift).toBeNull();
    else expect(result.percentShift).toBeCloseTo(mode.percent, 10);
    expect(result.startsDiffer).toBe(false);
  });

  it('does not pool six measurements into a single misleading median', () => {
    const state = engine.normalize({ studies: [...group('group-a', MODES[0], [16, 17, 18]), ...group('group-b', MODES[0], [238, 239, 240])] });
    const result = compare(state);
    expect(result.summaryA.median).toBe(17);
    expect(result.summaryB.median).toBe(239);
    expect(result.medianShift).toBe(222);
    expect(result.summaryA.count).toBe(3);
    expect(result.summaryB.count).toBe(3);
  });

  it('rejects comparing a saved group with itself', () => {
    const result = engine.compareStudies(pairState(), 'group-a', 'group-a');
    expect(result.status).toBe('same');
    expectHiddenStatistics(result);
  });

  it('reports missing or partial groups without presenting partial statistics', () => {
    const missing = engine.compareStudies(pairState(), 'group-a', 'missing');
    expect(missing.status).toBe('incomplete');
    expect(missing.b).toMatchObject({ count: 0, complete: false, valid: false });
    expectHiddenStatistics(missing);
    const state = pairState();
    state.studies = state.studies.filter(item => item.id !== 'group-b-record-3');
    const partial = compare(state);
    expect(partial.status).toBe('incomplete');
    expect(partial.b).toMatchObject({ count: 2, valid: true, complete: false });
    expectHiddenStatistics(partial);
  });

  it.each(['duplicate trial', 'conflicting surroundings', 'mixed experiment'])('reports %s as a conflicting group', reason => {
    const state = pairState();
    const record = state.studies.find(item => item.id === 'group-b-record-3');
    if (reason === 'duplicate trial') record.repeat.trial = 2;
    if (reason === 'conflicting surroundings') record.model.contrast = 31;
    if (reason === 'mixed experiment') {
      record.experiment = 'mullerLyer';
      record.model.matchValue = 400;
      record.repeat.startValue = 363;
    }
    const result = compare(state);
    expect(result.status).toBe('conflict');
    expectHiddenStatistics(result);
  });

  it('rejects complete groups from different experiments even when their units have the same name', () => {
    const state = engine.normalize({ studies: [...group('group-a', MODES[1]), ...group('group-b', MODES[2])] });
    const result = compare(state);
    expect(result.status).toBe('experiment');
    expectHiddenStatistics(result);
  });

  it('rejects brightness groups with different fixed gray references', () => {
    const result = compare(pairState(MODES[0], { target: 128 }, { target: 160 }));
    expect(result.status).toBe('reference');
    expectHiddenStatistics(result);
  });

  it.each(['both hidden', 'A hidden', 'B hidden', 'one hidden trial'])('withholds all pair statistics while %s', visibility => {
    const state = pairState(MODES[0], { reveal: !['both hidden', 'A hidden'].includes(visibility) }, { reveal: !['both hidden', 'B hidden'].includes(visibility) });
    if (visibility === 'one hidden trial') state.studies.find(item => item.id === 'group-b-record-2').model.reveal = false;
    const result = compare(state);
    expect(result.status).toBe('hidden');
    expectHiddenStatistics(result);
  });

  it('independent group reveals expose only their own records and require both groups before comparison', () => {
    const state = pairState(MODES[0], { reveal: false }, { reveal: false });
    const aOnly = engine.revealSavedStudy(state, 'group-a');
    expect(aOnly.studies.filter(item => item.repeat.id === 'group-a').every(item => item.model.reveal)).toBe(true);
    expect(aOnly.studies.filter(item => item.repeat.id === 'group-b').every(item => !item.model.reveal)).toBe(true);
    expect(compare(aOnly).status).toBe('hidden');
    expect(compare(engine.revealSavedStudy(aOnly, 'group-b')).status).toBe('ready');
    expect(state.studies.every(item => !item.model.reveal)).toBe(true);
  });

  it('reports changed visible surroundings without treating notes, impressions or match values as controlled settings', () => {
    const result = compare(pairState(MODES[0], { contrast: 80, note: 'A note', prediction: 'Left' }, { contrast: 31, swap: true, note: 'B note', prediction: 'Right' }));
    expect(result.status).toBe('ready');
    expect(result.changes).toEqual([
      { key: 'contrast', before: 80, after: 31, active: true },
      { key: 'swap', before: false, after: true, active: true },
    ]);
  });

  it('marks surrounding settings as inactive when both groups removed their context', () => {
    const result = compare(pairState(MODES[0], { context: false, contrast: 80 }, { context: false, contrast: 31, swap: true }));
    expect(result.status).toBe('ready');
    expect(result.changes).toEqual([
      { key: 'contrast', before: 80, after: 31, active: false },
      { key: 'swap', before: false, after: true, active: false },
    ]);
    const visibilityChange = compare(pairState(MODES[0], { context: false }, { context: true, contrast: 31 }));
    expect(visibilityChange.changes.find(item => item.key === 'context').active).toBe(true);
    expect(visibilityChange.changes.find(item => item.key === 'contrast').active).toBe(true);
  });

  it('retains differing start sequences so the pair does not imply an identical procedure', () => {
    const different = [73, 180, 101];
    const state = engine.normalize({ studies: [...group('group-a'), ...group('group-b', MODES[0], MODES[0].b, {}, different)] });
    const result = compare(state);
    expect(result.startsDiffer).toBe(true);
    expect(result.summaryA.starts).toEqual(MODES[0].starts);
    expect(result.summaryB.starts).toEqual(different);
  });

  it('lists each group once in order of its latest notebook entry, including incomplete groups', () => {
    const records = [...group('group-a'), ...group('group-b')];
    const partial = group('partial').slice(0, 1);
    const state = engine.normalize({ studies: [...records, ...partial] });
    const listed = engine.savedStudies(state);
    expect(listed.map(item => item.groupId)).toEqual(['partial', 'group-b', 'group-a']);
    expect(listed[0]).toMatchObject({ count: 1, valid: true, complete: false, revealed: false });
    expect(listed[1]).toMatchObject({ count: 3, valid: true, complete: true, experiment: 'brightness', revealed: true });
  });

  it('reverses the signed shift when the pair order changes and never mutates input data', () => {
    const state = pairState(MODES[1], { gap: 12 }, { gap: 20 });
    const before = structuredClone(state);
    const forward = compare(state);
    const reverse = engine.compareStudies(state, 'group-b', 'group-a');
    expect(reverse.medianShift).toBe(-forward.medianShift);
    expect(reverse.percentShift).toBeCloseTo(-forward.percentShift, 10);
    expect(reverse.summaryA).toEqual(forward.summaryB);
    expect(reverse.changes).toEqual([{ key: 'gap', before: 20, after: 12, active: true }]);
    forward.summaryA.values[0] = -100;
    expect(state).toEqual(before);
  });

  it('invalidates a deleted or evicted group and recovers the pair only when Undo restores a complete group', () => {
    const state = pairState();
    const deletion = engine.deleteStudy(state, 'group-a-record-1');
    expect(compare(deletion.state).status).toBe('incomplete');
    expectHiddenStatistics(compare(deletion.state));
    expect(compare(engine.restoreDeleted(deletion.state, deletion.undo)).status).toBe('ready');
    const unrelated = Array.from({ length: 19 }, (_, index) => ({ id: 'other-' + index, experiment: 'brightness', model: { prediction: 'Same' }, date: '' }));
    const capped = engine.normalize({ studies: [...group('group-a'), ...unrelated, ...group('group-b')] });
    expect(capped.studies).toHaveLength(24);
    expect(compare(capped)).toMatchObject({ status: 'incomplete', a: { count: 2 }, b: { count: 3 } });
  });
});

describe('Saved matching-study comparison learner workflow', () => {
  it('keeps both studies hidden on selection and reveals B independently before A', async () => {
    await openPair(pairState(MODES[0], { reveal: false }, { reveal: false }));
    expect(unavailable()).toBe('hidden');
    expect(results()).toBeNull();
    expect(host.querySelector('[data-perception-study-plot]')).toBeNull();
    expect(latest.studies.every(item => !item.model.reveal)).toBe(true);
    expect(selector().textContent).not.toContain('134');
    await click('Reveal comparison study');
    expect(latest.studies.filter(item => item.repeat.id === 'group-a').every(item => !item.model.reveal)).toBe(true);
    expect(latest.studies.filter(item => item.repeat.id === 'group-b').every(item => item.model.reveal)).toBe(true);
    expect(unavailable()).toBe('hidden');
    expect(results()).toBeNull();
    expect(document.activeElement.id).toContain('-pair-heading');
    expect(announce).toHaveBeenLastCalledWith('Comparison study drawing values revealed.');
    await click('Reveal saved study', review());
    expect(results()).toBeTruthy();
    expect(latest.studies.every(item => item.model.reveal)).toBe(true);
    expect(resultRow('Median match')).toEqual(['134 RGB', '142 RGB']);
  });

  it.each(MODES)('$id presents two separate results and an accessible shared-scale plot after explicit reveal', async mode => {
    await openPair(pairState(mode, {}, { reveal: false }));
    expect(unavailable()).toBe('hidden');
    expect(results()).toBeNull();
    await click('Reveal comparison study');
    expect(unavailable()).toBeUndefined();
    expect(document.activeElement.id).toContain('-pair-results');
    expect(resultRow('Recorded matches')).toEqual([mode.a.join(', '), mode.b.join(', ')]);
    expect(resultRow('Starting positions')).toEqual([mode.starts.join(', '), mode.starts.join(', ')]);
    const shift = results().querySelector('[data-perception-median-shift]').textContent;
    expect(shift).toContain('Median shift · B minus A: +' + mode.shift);
    if (mode.id === 'brightness') expect(shift).not.toContain('%');
    else expect(shift).toContain('% of the fixed reference');
    const plot = results().querySelector('svg[data-perception-study-plot]');
    expect(plot.getAttribute('role')).toBe('img');
    expect(document.getElementById(plot.getAttribute('aria-labelledby')).textContent).toContain('one shared drawing-value scale');
    expect(plot.querySelectorAll('circle')).toHaveLength(6);
    expect(plot.querySelectorAll('[data-perception-pair-median]')).toHaveLength(2);
    expect(plot.querySelector('[data-perception-pair-reference]').dataset.perceptionPairReference).toBe(String(mode.reference));
    const series = [...plot.querySelectorAll('[data-perception-pair-series]')];
    expect(series.map(node => [...node.querySelectorAll('circle')].map(dot => Number(dot.dataset.perceptionPairValue)))).toEqual([mode.a, mode.b]);
    expect([...plot.querySelectorAll('circle')].every(dot => Number.isFinite(Number(dot.getAttribute('cx'))))).toBe(true);
  });

  it.each(MODES)('$id uses identical plot coordinates for identical values and remains finite for zero-range studies', async mode => {
    const values = Array(3).fill(mode.reference);
    await openPair({ studies: [...group('group-a', mode, values), ...group('group-b', mode, values)] });
    const plot = results().querySelector('[data-perception-study-plot]');
    const coordinates = [...plot.querySelectorAll('circle')].map(dot => Number(dot.getAttribute('cx')));
    expect(coordinates).toHaveLength(6);
    expect(coordinates.every(Number.isFinite)).toBe(true);
    expect(new Set(coordinates).size).toBe(1);
    const medians = [...plot.querySelectorAll('[data-perception-pair-median]')];
    expect(medians.map(node => Number(node.getAttribute('x1')))).toEqual([coordinates[0], coordinates[0]]);
    expect(Number(plot.querySelector('[data-perception-pair-reference]').getAttribute('x1'))).toBe(coordinates[0]);
    expect(results().querySelector('[data-perception-median-shift]').textContent).toContain('B minus A: 0');
    expect(resultRow('Match range')).toEqual(Array(2).fill(mode.reference + '–' + mode.reference + ' (0 ' + (mode.id === 'brightness' ? 'RGB-code steps' : 'units') + ')'));
  });

  it('offers newest compatible groups without leaking values and disables incomplete or incompatible options', async () => {
    const conflict = group('conflict'); conflict[2].model.contrast = 31;
    await mount({ studies: [...group('group-a', MODES[0], MODES[0].a, { reveal: false }), ...group('other-experiment', MODES[1]), ...group('other-reference', MODES[0], MODES[0].a, { target: 160 }), ...conflict, ...group('partial').slice(0, 2), ...group('group-b', MODES[0], MODES[0].b, { reveal: false })] });
    await click('Review study', row('group-a-record-1'));
    const options = [...selector().options];
    expect(options.map(option => option.value)).toEqual(['', 'group-b', 'partial', 'conflict', 'other-reference', 'other-experiment']);
    expect(options.find(option => option.value === 'group-b')).toMatchObject({ disabled: false });
    for (const id of ['partial', 'conflict', 'other-reference', 'other-experiment']) expect(options.find(option => option.value === id).disabled, id).toBe(true);
    expect(options.find(option => option.value === 'other-reference').textContent).toContain('different fixed references');
    expect(options.find(option => option.value === 'other-experiment').textContent).toContain('same experiment');
    expect(options.find(option => option.value === 'conflict').textContent).toContain('conflicting settings');
    expect(selector().textContent).not.toContain('134 RGB');
    expect(results()).toBeNull();
  });

  it('explains inactive surroundings and different start sequences beside the separate results', async () => {
    const seed = { studies: [...group('group-a', MODES[0], MODES[0].a, { context: false, contrast: 80 }), ...group('group-b', MODES[0], MODES[0].b, { context: false, contrast: 31, swap: true }, [73, 180, 101])] };
    await openPair(seed);
    expect(results().querySelectorAll('[data-perception-pair-setting]')).toHaveLength(2);
    expect([...results().querySelectorAll('[data-perception-pair-setting]')].every(node => node.textContent.includes('Inactive'))).toBe(true);
    expect(results().textContent).toContain('Surroundings were removed in both studies.');
    expect(results().textContent).toContain('different starting positions');
    expect(results().textContent).not.toContain('Several surrounding settings differ.');
    expect(resultRow('Starting positions')).toEqual(['72, 184, 100', '73, 180, 101']);
  });

  it('explains when several displayed surrounding settings changed rather than attributing a single effect', async () => {
    await openPair(pairState(MODES[0], {}, { contrast: 31, swap: true }));
    expect(results().textContent).toContain('Several surrounding settings differ.');
    expect(results().textContent).toContain('does not isolate the effect of one variable');
  });

  it('preserves drafts, notes and the pinned drawing through reveal, an unrelated save and clearing the pair', async () => {
    const seed = engine.normalize({
      experiment: 'moire', studies: pairState(MODES[0], {}, { reveal: false }).studies,
      models: { moire: { angle: 12.3, spacing: 17, prediction: 'Bands', note: 'unfinished moire draft' }, brightness: { target: 190, matching: true, matchValue: 180, prediction: 'Right', note: 'another draft' } },
      comparison: { experiment: 'necker', model: { depth: 75, cue: 'front', note: 'pinned cube' } },
    });
    // Use a valid impression from metadata for the unrelated observation.
    seed.models.moire.prediction = engine.experiments.find(item => item.id === 'moire').choices[0];
    await openPair(seed);
    const notes = seed.studies.map(item => item.model.note);
    await click('Reveal comparison study');
    expect(latest.models).toEqual(seed.models);
    expect(latest.experiment).toBe(seed.experiment);
    expect(latest.comparison).toEqual(seed.comparison);
    expect(latest.studies.map(item => item.model.note)).toEqual(notes);
    expect(latestAll.otherTool).toEqual({ preserved: 37 });
    await click('Save observation');
    expect(latest.studies).toHaveLength(7);
    expect(results()).toBeTruthy();
    expect(selector().value).toBe('group-b');
    await click('Clear study comparison');
    expect(results()).toBeNull();
    expect(selector().value).toBe('');
    expect(document.activeElement).toBe(selector());
    expect(review().dataset.perceptionStudyReview).toBe('group-a');
    expect(latest.comparison).toEqual(seed.comparison);
    expect(latest.models).toEqual(seed.models);
  });

  it('removes a deleted B trial from the live pair immediately and recovers the same selected pair on Undo', async () => {
    await openPair();
    expect(results()).toBeTruthy();
    await click('Delete observation', row('group-b-record-2'));
    expect(selector().value).toBe('group-b');
    expect(unavailable()).toBe('incomplete');
    expect(results()).toBeNull();
    expect(host.querySelector('[data-perception-study-plot]')).toBeNull();
    expect(document.activeElement).toBe(button('Undo deletion'));
    await click('Undo deletion');
    expect(selector().value).toBe('group-b');
    expect(unavailable()).toBeUndefined();
    expect(results()).toBeTruthy();
    expect(resultRow('Recorded matches')).toEqual([MODES[0].a.join(', '), MODES[0].b.join(', ')]);
  });

  it('keeps the A/C results and deletion feedback after revealing B, selecting C and deleting an unselected B trial', async () => {
    const cValues = [120, 132, 144];
    await openPair({ studies: [...group('group-a'), ...group('group-b', MODES[0], MODES[0].b, { reveal: false }), ...group('group-c', MODES[0], cValues)] });
    await click('Reveal comparison study');
    expect(announce).toHaveBeenLastCalledWith('Comparison study drawing values revealed.');
    await select('group-c');
    expect(resultRow('Recorded matches')).toEqual([MODES[0].a.join(', '), cValues.join(', ')]);
    await click('Delete observation', row('group-b-record-2'));
    expect(selector().value).toBe('group-c');
    expect(results()).toBeTruthy();
    expect(unavailable()).toBeUndefined();
    expect(resultRow('Recorded matches')).toEqual([MODES[0].a.join(', '), cValues.join(', ')]);
    expect(latest.studies.some(item => item.id === 'group-b-record-2')).toBe(false);
    expect(button('Undo deletion').disabled).toBe(false);
    const deleted = 'Observation deleted. Undo deletion is available.';
    expect(announce).toHaveBeenLastCalledWith(deleted);
    expect(host.querySelector('[role="status"]').textContent).toBe(deleted);
  });

  it('retains an unavailable selected group after every B record is removed without recreating statistics on a partial Undo', async () => {
    await openPair();
    for (let trial = 1; trial <= 3; trial++) await click('Delete observation', row('group-b-record-' + trial));
    expect(selector().value).toBe('group-b');
    const missing = [...selector().options].find(option => option.value === 'group-b');
    expect(missing.disabled).toBe(true);
    expect(missing.textContent).toContain('no longer in the notebook');
    expect(unavailable()).toBe('incomplete');
    expect(results()).toBeNull();
    await click('Undo deletion');
    expect(latest.studies.filter(item => item.repeat.id === 'group-b')).toHaveLength(1);
    expect(selector().value).toBe('group-b');
    expect(unavailable()).toBe('incomplete');
    expect(results()).toBeNull();
  });

  it('invalidates cached pair statistics when an ordinary save evicts an A trial at the notebook limit', async () => {
    const older = Array.from({ length: 18 }, (_, index) => ({ id: 'older-' + index, experiment: 'brightness', model: { prediction: 'Same' } }));
    await openPair({ studies: [...group('group-a'), ...older, ...group('group-b')], models: { brightness: { prediction: 'Same', note: 'unrelated' } } });
    expect(results()).toBeTruthy();
    await click('Save observation');
    expect(latest.studies).toHaveLength(24);
    expect(latest.studies.some(item => item.id === 'group-a-record-1')).toBe(false);
    expect(selector().value).toBe('group-b');
    expect(unavailable()).toBe('incomplete');
    expect(results()).toBeNull();
    expect(review().querySelector('[data-perception-study-summary]')).toBeNull();
  });

  it('expires a retained B reveal when an external notebook replacement reuses the same group IDs', async () => {
    await openPair(pairState(MODES[0], {}, { reveal: false }));
    const retained = button('Reveal comparison study');
    const replacement = pairState(MODES[0], { note: 'replacement A' }, { reveal: false, note: 'replacement B' });
    await act(async () => { externalState(replacement); retained.click(); });
    expect(latest).toEqual(replacement);
    expect(latest.studies.filter(item => item.repeat.id === 'group-b').every(item => !item.model.reveal)).toBe(true);
    expect(review()).toBeNull();
    expect(results()).toBeNull();
    expect(announce).toHaveBeenLastCalledWith('The notebook changed. That observation action is no longer available.');
  });

  it('rejects a deferred reveal after the learner selects a different comparison group', async () => {
    await openPair({ studies: [...group('group-a'), ...group('group-b', MODES[0], MODES[0].b, { reveal: false }), ...group('group-c', MODES[0], [120, 132, 144], { reveal: false })] });
    deferUpdates = true;
    await click('Reveal comparison study');
    expect(pendingUpdates).toHaveLength(1);
    await select('group-c');
    deferUpdates = false;
    await act(async () => flushUpdates());
    expect(selector().value).toBe('group-c');
    expect(results()).toBeNull();
    expect(latest.studies.filter(item => item.repeat.id !== 'group-a').every(item => !item.model.reveal)).toBe(true);
    const selected = 'Comparison study selected. Each study keeps its own reveal state.';
    expect(announce).toHaveBeenLastCalledWith(selected);
    expect(host.querySelector('[role="status"]').textContent).toBe(selected);
  });

  it('drops profile-local selection and rejects an old deferred reveal after a profile switch', async () => {
    await openPair(pairState(MODES[0], {}, { reveal: false }));
    const original = structuredClone(latest);
    deferUpdates = true;
    await click('Reveal comparison study');
    await act(async () => changeProfile('another-learner'));
    expect(review()).toBeNull();
    deferUpdates = false;
    await act(async () => flushUpdates());
    expect(latest).toEqual(original);
    expect(review()).toBeNull();
    expect(results()).toBeNull();
  });

  it('keeps independent reveal and group membership stable under StrictMode and repeated activations', async () => {
    await openPair(pairState(MODES[0], {}, { reveal: false }), { strict: true });
    const reveal = button('Reveal comparison study');
    await act(async () => { reveal.click(); reveal.click(); });
    expect(latest.studies).toHaveLength(6);
    expect(new Set(latest.studies.map(item => item.id)).size).toBe(6);
    expect(latest.studies.every(item => item.model.reveal)).toBe(true);
    expect(results()).toBeTruthy();
    expect(document.activeElement.id).toContain('-pair-results');
    expect(announce).toHaveBeenLastCalledWith('Comparison study drawing values revealed.');
  });

  it('uses a labeled native selector and keeps saved comparisons independent of the mobile experiment picker', async () => {
    await openPair();
    const chooser = selector();
    expect(chooser.tagName).toBe('SELECT');
    expect(host.querySelector('label[for="' + chooser.id + '"]').textContent).toContain('Compare with another study');
    expect(document.getElementById(chooser.getAttribute('aria-describedby')).textContent).toContain('drawing values stay hidden');
    chooser.focus();
    expect(document.activeElement).toBe(chooser);
    await select('moire', host.querySelector('#perception-experiment-picker'));
    expect(latest.experiment).toBe('moire');
    expect(selector().value).toBe('group-b');
    expect(results()).toBeTruthy();
    await click('Clear study comparison');
    expect(document.activeElement).toBe(selector());
    const opener = button('Review study', row('group-a-record-1'));
    await click('Close study review');
    expect(review()).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
