import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const DATE = '2026-10-04T12:00:00.000Z';
const MODES = {
  brightness: { starts: [16, 240, 109], values: [121, 134, 146] },
  ebbinghaus: { starts: [32, 72, 51], values: [44, 50, 53] },
  mullerLyer: { starts: [250, 550, 411], values: [380, 410, 425] },
};
let engine, config, host, root, latest, latestAll, changeProfile, announce;

function record(id, experiment = 'brightness', model = {}, date = DATE, repeat) {
  return engine.normalize({ studies: [{ id, experiment, date, model: { prediction: 'Same', note: 'learner note', ...model }, ...(repeat ? { repeat } : {}) }] }).studies[0];
}
function group(id, experiment = 'brightness', model = {}) {
  const mode = MODES[experiment];
  return mode.values.map((matchValue, index) => record(id + '-record-' + (index + 1), experiment,
    { matching: true, matchValue, ...model }, DATE, { id, trial: index + 1, startValue: mode.starts[index] }));
}
function seed(studies = []) {
  return engine.normalize({
    experiment: 'moire', studies, expanded: true,
    models: { moire: { angle: 13.2, spacing: 18, prediction: 'Both', note: 'current draft' } },
    comparison: { experiment: 'necker', model: { depth: 75, cue: 'front', note: 'pinned cube' } },
  });
}
const find = (state, filters = {}, labels) => engine.notebookView(state, filters, labels);
const studies = (state, filters = {}, labels) => find(state, { view: 'studies', ...filters }, labels);
const ids = rows => rows.map(item => item.record.id);

function notebookSeed() {
  const complete = group('complete'); complete[0].model.note = 'blue pigment';
  const partial = group('partial').slice(0, 2); partial[0].model.reveal = true;
  const conflict = group('conflict'); conflict[2].repeat.trial = 2;
  return seed([...complete, ...partial, ...conflict, record('standalone', 'necker', { prediction: 'Lower left', note: 'cube note' })]);
}
async function mount(value = notebookSeed(), { translate, strict = false } = {}) {
  function Harness() {
    const [data, setData] = React.useState({ perceptionLab: value, otherTool: { preserved: 37 } });
    const [profile, setProfile] = React.useState('finder-learner');
    latest = engine.normalize(data.perceptionLab); latestAll = data; changeProfile = setProfile;
    return config.render(makeCtx({ toolData: data, setToolData: setData, activeProfileId: profile, announceToSR: announce, ...(translate ? { t: translate } : {}) }));
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
const field = name => host.querySelector('[data-perception-notebook-' + name + ']');
const rows = (scope = host) => [...scope.querySelectorAll('[data-perception-study]')];
const row = id => rows().find(node => node.dataset.perceptionStudy === id);
const cards = () => [...host.querySelectorAll('[data-perception-notebook-group]')];
const card = id => cards().find(node => node.dataset.perceptionNotebookGroup === id);
const notebookHeading = () => host.querySelector('.perception-journal h3');
async function input(node, value) {
  expect(node).toBeTruthy(); const select = node instanceof HTMLSelectElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(select ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event(select ? 'change' : 'input', { bubbles: true }));
  });
}
async function openImportPreview(incoming) {
  vi.stubGlobal('FileReader', vi.fn(function () {
    this.abort = vi.fn();
    this.readAsText = () => { this.result = JSON.stringify({ schema: 'alloflow.perception.notebook', version: 1, studies: incoming }); this.onload(); };
  }));
  await click('Import notebook');
  const file = new window.File(['notebook'], 'perception-notebook.json', { type: 'application/json' });
  const node = host.querySelector('[data-perception-import-file]');
  await act(async () => {
    Object.defineProperty(node, 'files', { configurable: true, value: [file] });
    node.dispatchEvent(new Event('change', { bubbles: true }));
  });
  expect(host.querySelector('[data-perception-import-preview]').dataset.perceptionImportPreview).toBe('preview');
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab(); config = loadTool('stem_lab/stem_tool_perception.js', 'perceptionLab');
  engine = window.StemLab.PerceptionEngine; announce = vi.fn();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('Perception notebook finder engine', () => {
  it('normalizes filters, bounds the controlled query, and keeps default observation order and global numbers', () => {
    const state = seed([record('first'), record('second', 'necker')]);
    const result = find(state, { view: 'invalid', experiment: 'invalid', status: 'invalid', query: 'q'.repeat(130) });
    expect(result.filters).toEqual({ view: 'observations', experiment: 'all', status: 'all', query: 'q'.repeat(120) });
    const all = find(state);
    expect(all.filters).toEqual({ view: 'observations', experiment: 'all', status: 'all', query: '' });
    expect(all).toMatchObject({ total: 2, groupTotal: 0, records: state.studies.map((record, index) => ({ record, number: index + 1 })), groups: [] });
    expect(find(state, { query: 123 }).filters.query).toBe('');
  });

  it('returns stable global record and study ordinals after either filter removes earlier results', () => {
    const a = group('a'), b = group('b', 'mullerLyer'); a[0].model.note = 'blue pigment';
    const state = seed([record('first'), a[0], record('middle'), b[0], a[1], b[1], a[2], b[2], record('last')]);
    const observations = find(state, { query: 'blue' });
    expect(observations.records).toEqual([1, 4, 6].map(index => ({ record: state.studies[index], number: index + 1 })));
    const result = studies(state, { query: 'blue' });
    expect(result).toMatchObject({ total: 9, groupTotal: 2 });
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]).toMatchObject({ groupId: 'a', number: 1, count: 3, status: 'complete' });
    expect(result.groups[0].records.map(item => item.number)).toEqual([2, 5, 7]);
    expect(ids(result.groups[0].records)).toEqual(a.map(item => item.id));
    expect(studies(state).groups.map(item => [item.groupId, item.number])).toEqual([['b', 2], ['a', 1]]);
  });

  it.each(['all', 'complete', 'partial', 'conflict'])('ignores %s status in observation view rather than hiding individual records', status => {
    const state = seed([...group('complete'), ...group('partial').slice(0, 1), record('standalone')]);
    const result = find(state, { view: 'observations', status });
    expect(result.records).toHaveLength(5);
    expect(result.filters.status).toBe(status);
  });

  it('separates complete, partial and conflicted studies while retaining all-record and all-group totals', () => {
    const conflict = group('conflict'); conflict[2].repeat.trial = 2;
    const state = seed([...group('complete'), ...group('partial').slice(0, 2), ...conflict, record('standalone')]);
    const all = studies(state);
    expect(all).toMatchObject({ total: 9, groupTotal: 3 });
    expect(all.groups.map(item => [item.groupId, item.status])).toEqual([['conflict', 'conflict'], ['partial', 'partial'], ['complete', 'complete']]);
    for (const status of ['complete', 'partial', 'conflict']) {
      const result = studies(state, { status });
      expect(result).toMatchObject({ total: 9, groupTotal: 3 });
      expect(result.groups.map(item => item.groupId)).toEqual([status]);
    }
  });

  it.each([
    ['complete', [false, false, false], 'hidden'], ['complete', [true, true, true], 'revealed'],
    ['complete', [true, false, true], 'mixed'], ['partial', [true, true], 'revealed'],
    ['partial', [true, false], 'mixed'], ['conflict', [false, false, false], 'hidden'],
    ['conflict', [true, true, true], 'revealed'], ['conflict', [true, false, true], 'mixed'],
  ])('reports exact %s reveal metadata for %j as %s without relying on pooled results', (status, reveals, expected) => {
    const members = group('reveal').slice(0, reveals.length);
    reveals.forEach((value, index) => { members[index].model.reveal = value; });
    if (status === 'conflict') members[2].repeat.trial = 2;
    const result = studies(seed(members)).groups[0];
    expect(result).toMatchObject({ status, reveal: expected, count: reveals.length });
    expect(result.records.map(item => item.record.model.reveal)).toEqual(reveals);
  });

  it('requires the experiment and query to match the same member and keeps every member of an admitted group', () => {
    const brightness = group('mixed')[0]; brightness.model.note = 'amber pigment';
    const ebbinghaus = group('mixed', 'ebbinghaus')[1]; ebbinghaus.model.note = 'violet pigment';
    const line = group('mixed', 'mullerLyer')[2]; line.model.note = 'indigo pigment';
    const state = seed([brightness, ebbinghaus, line]);
    expect(studies(state, { experiment: 'brightness', query: 'violet' }).groups).toEqual([]);
    const admitted = studies(state, { experiment: 'ebbinghaus', query: 'violet' });
    expect(admitted.groups).toHaveLength(1);
    expect(admitted.groups[0]).toMatchObject({ count: 3, status: 'conflict' });
    expect(ids(admitted.groups[0].records)).toEqual(state.studies.map(item => item.id));
    expect(admitted.groups[0].experiments).toEqual(expect.arrayContaining(['brightness', 'ebbinghaus', 'mullerLyer']));
    expect(admitted.groups[0].experiments).toHaveLength(3);
    expect(find(state, { experiment: 'ebbinghaus', query: 'violet' }).records).toEqual(state.studies.map((record, index) => ({ record, number: index + 1 })));
  });

  it('uses the newest valid date across the whole retained group even when the matching member is older', () => {
    const members = group('dated');
    members[0].model.note = 'unique pigment'; members[0].date = '2026-10-04T14:00:00.000Z';
    members[1].date = 'not-a-date'; members[2].date = '2026-10-04T13:00:00-04:00';
    expect(studies(seed(members), { query: 'unique' }).groups[0].date).toBe('2026-10-04T13:00:00-04:00');
    members.forEach(item => { item.date = 'invalid'; });
    expect(studies(seed(members)).groups[0].date).toBe('');
  });

  it('keeps entered query whitespace but trims and ignores case only while matching literal visible text', () => {
    const state = seed([record('literal', 'brightness', { note: 'Blue pigment and literal a+b [x] .*' }), record('other', 'brightness', { note: 'red pigment' })]);
    const result = find(state, { query: '  BLUE PIGMENT  ' });
    expect(result.filters.query).toBe('  BLUE PIGMENT  ');
    expect(ids(result.records)).toEqual(['literal']);
    expect(ids(find(state, { query: '.*' }).records)).toEqual(['literal']);
    expect(ids(find(state, { query: '[x]' }).records)).toEqual(['literal']);
    expect(find(state, { query: '^blue' }).records).toEqual([]);
    expect(find(state, { query: '   ' }).records).toHaveLength(2);
  });

  it('searches visible experiment titles and impressions with localized replacement and accent-sensitive matching', () => {
    const state = seed([record('localized', 'brightness', { note: '', prediction: 'Same' })]);
    const labels = { brightness: { title: 'Luminosité et contexte', choices: ['Gauche', 'Égal', 'Droite', 'Incertain'] } };
    expect(ids(find(state, { query: 'LUMINOSITÉ' }, labels).records)).toEqual(['localized']);
    expect(ids(find(state, { query: 'Égal' }, labels).records)).toEqual(['localized']);
    for (const query of ['luminosite', 'egal', 'Brightness & context', 'Same']) expect(find(state, { query }, labels).records).toEqual([]);
    expect(ids(find(state, { query: 'Brightness & context' }).records)).toEqual(['localized']);
    expect(ids(find(state, { query: 'Same' }).records)).toEqual(['localized']);
  });

  it('falls back per localized field when the title or selected impression label is missing or invalid', () => {
    const state = seed([record('fallback', 'brightness', { note: '' })]);
    expect(find(state, { query: 'Brightness & context' }, { brightness: { title: null, choices: ['Gauche', 'Égal'] } }).records).toHaveLength(1);
    expect(find(state, { query: 'Same' }, { brightness: { title: 'Luminosité', choices: ['Gauche', null] } }).records).toHaveLength(1);
    expect(find(state, { query: 'Same' }, { brightness: { title: 'Luminosité', choices: [] } }).records).toHaveLength(1);
  });

  it.each(['121', '134', '146', '128', '16', '240', 'private-group', 'private-group-record-1'])('does not index hidden numbers or identity text %j', query => {
    const state = seed(group('private-group', 'brightness', { note: '', prediction: 'Same' }));
    expect(find(state, { query }).records).toEqual([]);
    expect(studies(state, { query }).groups).toEqual([]);
  });

  it('still finds a numeric literal written in a learner note without indexing drawing values', () => {
    const state = seed([record('written', 'brightness', { note: 'I tried this 121 times.' })]);
    expect(ids(find(state, { query: '121' }).records)).toEqual(['written']);
  });

  it('counts only retained groups after the cap removes a member and numbers the retained notebook globally', () => {
    const older = group('older'), later = Array.from({ length: 22 }, (_, index) => record('later-' + index, 'moire', { note: index === 21 ? 'latest pigment' : 'neutral note' }));
    const raw = { studies: [...older, ...later] }, state = seed(raw.studies);
    const result = studies(state);
    expect(result).toMatchObject({ total: 24, groupTotal: 1 });
    expect(result.groups[0]).toMatchObject({ count: 2, status: 'partial', number: 1 });
    expect(result.groups[0].records.map(item => item.number)).toEqual([1, 2]);
    expect(find(state, { query: 'latest pigment' }).records[0].number).toBe(24);
  });

  it('does not mutate any state, query, localization, record metadata, or reveal state', () => {
    const state = seed([...group('source'), record('standalone')]);
    const filters = { view: 'studies', experiment: 'brightness', status: 'complete', query: '  context  ' };
    const labels = { brightness: { title: 'Brightness & context', choices: ['Left', 'Same', 'Right', 'Unsure'] } };
    const before = structuredClone({ state, filters, labels });
    find(state, filters, labels);
    expect({ state, filters, labels }).toEqual(before);
  });
});

describe('Perception notebook finder learner workflow', () => {
  it('keeps the default newest-first observation list, global numbers, and existing actions', async () => {
    const state = notebookSeed(); await mount(state);
    expect(field('view').value).toBe('observations'); expect(field('status').disabled).toBe(true);
    expect(field('search').maxLength).toBe(120);
    expect(field('results').dataset.perceptionNotebookResults).toBe('observations');
    expect(rows().map(node => node.dataset.perceptionStudy)).toEqual(state.studies.slice().reverse().map(item => item.id));
    expect(rows().map(node => Number(node.getAttribute('value')))).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1]);
    expect(cards()).toHaveLength(0);
    expect(field('counts').textContent).toBe('Observations shown: 9 of 9.');
    expect(button('Restore observation', row('complete-record-1'))).toBeTruthy();
    expect(button('Pin observation', row('complete-record-1'))).toBeTruthy();
    expect(button('Review study', row('complete-record-1'))).toBeTruthy();
    expect(button('Clear notebook filters').disabled).toBe(true);
  });

  it('retains all group members when one note matches and does not renumber or reveal their values', async () => {
    const state = notebookSeed(); await mount(state);
    await input(field('search'), 'blue');
    expect(rows().map(node => node.dataset.perceptionStudy)).toEqual(['complete-record-3', 'complete-record-2', 'complete-record-1']);
    expect(rows().map(node => Number(node.getAttribute('value')))).toEqual([3, 2, 1]);
    expect(field('counts').textContent).toBe('Observations shown: 3 of 9.');
    expect(latest).toEqual(state); expect(latestAll.otherTool).toEqual({ preserved: 37 });
    await input(field('search'), '134');
    expect(field('empty')).toBeTruthy(); expect(rows()).toHaveLength(0);
    expect(latest.studies.every((item, index) => item.model.reveal === state.studies[index].model.reveal)).toBe(true);
  });

  it('shows global study cards and original observation actions inside recorded-member details', async () => {
    await mount(); await input(field('view'), 'studies');
    expect(field('status').disabled).toBe(false);
    expect(field('results').dataset.perceptionNotebookResults).toBe('studies');
    expect(cards().map(node => [node.dataset.perceptionNotebookGroup, Number(node.getAttribute('value'))])).toEqual([['conflict', 3], ['partial', 2], ['complete', 1]]);
    expect(field('counts').textContent).toBe('Studies shown: 3 of 3. Retained observations shown: 8.');
    expect(card('partial').querySelector('[data-perception-group-status]').textContent).toBe('Partial · Partly revealed');
    const details = card('complete').querySelector('details');
    expect(details.querySelector('summary').textContent).toBe('Recorded observations'); expect(details.open).toBe(false);
    await act(async () => { details.open = true; });
    expect(rows(card('complete')).map(node => Number(node.getAttribute('value')))).toEqual([3, 2, 1]);
    expect(button('Restore observation', row('complete-record-1'))).toBeTruthy();
    expect(button('Pin observation', row('complete-record-1'))).toBeTruthy();
    expect(button('Repeat these settings', row('complete-record-1'))).toBeTruthy();
  });

  it('filters study status and clears filters while preserving study view and focusing search', async () => {
    const state = notebookSeed(); await mount(state); await input(field('view'), 'studies');
    await input(field('status'), 'complete');
    expect(cards().map(node => node.dataset.perceptionNotebookGroup)).toEqual(['complete']);
    expect(card('complete').querySelector('[data-perception-group-status]').dataset.perceptionGroupStatus).toBe('complete');
    await input(field('experiment'), 'mullerLyer'); await input(field('search'), 'nothing');
    expect(field('empty')).toBeTruthy(); expect(cards()).toHaveLength(0);
    await click('Clear notebook filters');
    expect(field('view').value).toBe('studies'); expect(field('experiment').value).toBe('all');
    expect(field('status').value).toBe('all'); expect(field('search').value).toBe('');
    expect(document.activeElement).toBe(field('search')); expect(cards()).toHaveLength(3);
    expect(latest).toEqual(state);
  });

  it('keeps deletion undo available outside complete-only results and restores the full study', async () => {
    const state = notebookSeed(); await mount(state); await input(field('view'), 'studies'); await input(field('status'), 'complete');
    await act(async () => { card('complete').querySelector('details').open = true; });
    await click('Delete observation', row('complete-record-2'));
    expect(field('empty')).toBeTruthy(); expect(cards()).toHaveLength(0);
    expect(button('Undo deletion').disabled).toBe(false);
    await click('Undo deletion');
    expect(latest).toEqual(state); expect(field('status').value).toBe('complete');
    expect(card('complete').querySelector('[data-perception-group-status]').dataset.perceptionGroupStatus).toBe('complete');
    expect(rows(card('complete')).map(node => Number(node.getAttribute('value')))).toEqual([3, 2, 1]);
  });

  it('keeps review and its one-setting planner outside filtered results, then focuses the notebook when their opener disappears', async () => {
    const state = notebookSeed(); await mount(state);
    await click('Review study', row('complete-record-1')); await click('Plan one-setting repeat');
    await input(field('search'), 'no-visible-result');
    expect(field('empty')).toBeTruthy();
    expect(host.querySelector('[data-perception-study-review]').dataset.perceptionStudyReview).toBe('complete');
    expect(host.querySelector('[data-perception-guided-plan]')).toBeTruthy();
    await click('Close study review');
    expect(document.activeElement).toBe(notebookHeading()); expect(latest).toEqual(state);
  });

  it('keeps import preview and import undo reachable when the finder hides all observation rows', async () => {
    const state = notebookSeed(); await mount(state); await openImportPreview([record('from-import', 'brightness', { note: 'new learner note' })]);
    await input(field('search'), 'no-visible-result');
    expect(field('empty')).toBeTruthy(); expect(host.querySelector('[data-perception-import-preview]')).toBeTruthy();
    await click('Add observations');
    expect(latest.studies).toHaveLength(10); expect(field('search').value).toBe('no-visible-result');
    expect(field('empty')).toBeTruthy(); expect(button('Undo import').disabled).toBe(false);
    await click('Undo import'); expect(latest).toEqual(state); expect(field('empty')).toBeTruthy();
  });

  it('searches translated labels that are actually displayed without changing the recorded canonical impression', async () => {
    const state = seed([record('localized', 'brightness', { note: '', prediction: 'Same' })]);
    const messages = { 'stem.perception.brightness_title': 'Luminosité', 'stem.perception.brightness_choice_1': 'Égal' };
    await mount(state, { translate: (key, fallback) => messages[key] || fallback });
    await input(field('search'), 'Égal');
    expect(rows()).toHaveLength(1); expect(rows()[0].textContent).toContain('Égal');
    await input(field('search'), 'Same'); expect(field('empty')).toBeTruthy();
    expect(latest).toEqual(state); expect(latest.studies[0].model.prediction).toBe('Same');
  });

  it('bounds a programmatic query and resets all finder fields when the learner changes', async () => {
    const state = notebookSeed(); await mount(state); await input(field('view'), 'studies'); await input(field('experiment'), 'brightness');
    await input(field('status'), 'complete'); await input(field('search'), 'q'.repeat(130));
    expect(field('search').value).toBe('q'.repeat(120));
    await act(async () => changeProfile('another-learner'));
    expect(field('view').value).toBe('observations'); expect(field('experiment').value).toBe('all');
    expect(field('status').value).toBe('all'); expect(field('status').disabled).toBe(true); expect(field('search').value).toBe('');
    expect(rows()).toHaveLength(9); expect(latest).toEqual(state);
  });

  it('explains study view when the notebook contains standalone observations but no repeated study', async () => {
    const state = seed([record('standalone')]); await mount(state); await input(field('view'), 'studies');
    expect(field('empty').textContent).toContain('No repeated studies are saved yet.');
    expect(field('counts').textContent).toBe('Studies shown: 0 of 0. Retained observations shown: 0.');
    expect(latest).toEqual(state);
  });

  it.each(['collapsed member details', 'open member details', 'visible card opener'])('returns review focus correctly for %s', async source => {
    await mount(); await input(field('view'), 'studies');
    const targetCard = card('complete'), details = targetCard.querySelector('details');
    let opener;
    if (source === 'visible card opener') opener = button('Review study', targetCard);
    else { await act(async () => { details.open = true; }); opener = button('Review study', row('complete-record-1')); }
    await act(async () => opener.click());
    if (source === 'collapsed member details') await act(async () => { details.open = false; });
    await click('Close study review');
    expect(document.activeElement).toBe(source === 'collapsed member details' ? notebookHeading() : opener);
  });
});
