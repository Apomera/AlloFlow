import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const SCHEMA = 'alloflow.perception.notebook';
const DATE = '2026-10-04T12:00:00.000Z';
const MODES = [
  { id: 'brightness', starts: [16, 240, 109], values: [121, 134, 146] },
  { id: 'ebbinghaus', starts: [32, 72, 51], values: [44, 50, 53] },
  { id: 'mullerLyer', starts: [250, 550, 411], values: [380, 410, 425] },
];
let engine, config, host, root, latest, latestAll, externalState, changeProfile, announce, deferUpdates, pendingUpdates, flushUpdates;

function record(id = 'incoming', experiment = 'brightness', model = {}, repeat) {
  return engine.normalize({ studies: [{ id, experiment, date: DATE, model: { prediction: 'Same', note: id, ...model }, ...(repeat ? { repeat } : {}) }] }).studies[0];
}
function group(id = 'source-group', mode = MODES[0], model = {}) {
  return mode.values.map((matchValue, index) => record(id + '-record-' + (index + 1), mode.id,
    { matching: true, matchValue, note: 'match ' + (index + 1), ...model },
    { id, trial: index + 1, startValue: mode.starts[index] }));
}
const payload = studies => ({ schema: SCHEMA, version: 1, studies });
const parse = studies => engine.parseNotebook(JSON.stringify(payload(studies)));
const plan = (state, records) => engine.planNotebookImport(state, records);
function seed(studies = []) {
  return engine.normalize({
    experiment: 'moire', studies, expanded: true,
    models: { moire: { angle: 13.2, spacing: 18, prediction: 'Both', note: 'current draft' } },
    comparison: { experiment: 'necker', model: { depth: 75, cue: 'front', note: 'pinned cube' } },
  });
}

async function mount(value = seed(), { strict = false } = {}) {
  function Harness() {
    const [data, setData] = React.useState({ perceptionLab: value, otherTool: { preserved: 37 } });
    const [profile, setProfile] = React.useState('import-learner');
    latest = engine.normalize(data.perceptionLab); latestAll = data;
    externalState = next => setData(previous => ({ ...previous, perceptionLab: next }));
    changeProfile = setProfile;
    flushUpdates = () => pendingUpdates.splice(0).forEach(setData);
    return config.render(makeCtx({
      toolData: data, activeProfileId: profile, announceToSR: announce,
      setToolData: update => deferUpdates ? pendingUpdates.push(update) : setData(update),
    }));
  }
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  const content = React.createElement(Harness);
  await act(async () => root.render(strict ? React.createElement(React.StrictMode, null, content) : content));
}
function button(label, scope = host) {
  const found = [...scope.querySelectorAll('button')].find(node => (node.getAttribute('aria-label') || node.textContent).trim() === label);
  expect(found, label).toBeTruthy(); return found;
}
const click = async (label, scope = host) => act(async () => button(label, scope).click());
const preview = () => host.querySelector('[data-perception-import-preview]');
const importFile = () => host.querySelector('[data-perception-import-file]');
const status = () => host.querySelector('[role="status"]').textContent;
const count = name => Number(host.querySelector('[data-perception-import-' + name + ']').textContent);
async function chooseFile(text, { name = 'perception-notebook.json', wait = true } = {}) {
  const file = new window.File([text], name, { type: 'application/json' });
  const input = importFile(); expect(input).toBeTruthy();
  await act(async () => {
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  if (wait) for (let attempt = 0; attempt < 20 && preview()?.dataset.perceptionImportPreview === 'reading'; attempt++) {
    await act(async () => new Promise(resolve => setTimeout(resolve, 5)));
  }
  return file;
}
async function openPreview(incoming = group()) {
  await click('Import notebook');
  await chooseFile(JSON.stringify(payload(incoming)));
  expect(preview().dataset.perceptionImportPreview).toBe('preview');
}
function deferredReaders() {
  const readers = [];
  vi.stubGlobal('FileReader', vi.fn(function () {
    this.result = null; this.readAsText = vi.fn(); this.abort = vi.fn(); readers.push(this);
  }));
  return readers;
}
async function finishRead(reader, incoming = group()) {
  await act(async () => { reader.result = JSON.stringify(payload(incoming)); reader.onload(); });
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

describe('Bounded exported-notebook parsing', () => {
  it('round-trips canonical exported records from every experiment with independent reveal states', () => {
    const studies = engine.experiments.map((meta, index) => record('exported-' + index, meta.id, { reveal: index % 2 === 0 }));
    expect(parse(studies)).toEqual({ status: 'ready', records: studies });
    const reversed = structuredClone(studies);
    reversed.forEach(item => { item.model = Object.fromEntries(Object.entries(item.model).reverse()); });
    expect(parse(reversed)).toEqual({ status: 'ready', records: studies });
  });

  it('accepts the character limit and rejects longer input before attempting JSON parsing', () => {
    const text = JSON.stringify(payload([record()]));
    const padded = text + ' '.repeat(512 * 1024 - text.length);
    expect(engine.parseNotebook(padded).status).toBe('ready');
    expect(engine.parseNotebook(padded + ' ')).toEqual({ status: 'large', records: [] });
    expect(engine.parseNotebook('x'.repeat(512 * 1024 + 1))).toEqual({ status: 'large', records: [] });
  });

  it.each(['', '{', 'not JSON'])('rejects malformed JSON %j', text => {
    expect(engine.parseNotebook(text)).toEqual({ status: 'json', records: [] });
  });

  it.each([
    null, [], 1, {}, { schema: 'other', version: 1, studies: [] },
    { schema: SCHEMA, version: '1', studies: [] }, { schema: SCHEMA, version: 2, studies: [] },
    { schema: SCHEMA, version: 1 }, { schema: SCHEMA, version: 1, studies: {} },
  ])('rejects incompatible schema %j', value => {
    expect(engine.parseNotebook(JSON.stringify(value))).toEqual({ status: 'schema', records: [] });
  });

  it('distinguishes an empty notebook from an oversized observation collection', () => {
    expect(parse([])).toEqual({ status: 'empty', records: [] });
    expect(parse(Array.from({ length: 24 }, (_, index) => record('full-' + index))).status).toBe('ready');
    expect(parse(Array.from({ length: 25 }, (_, index) => record('too-many-' + index)))).toEqual({ status: 'records', records: [] });
  });

  it.each([
    ['missing identity', item => { delete item.id; }], ['empty identity', item => { item.id = ''; }],
    ['untrimmed identity', item => { item.id = ' incoming '; }], ['long identity', item => { item.id = 'i'.repeat(97); }],
    ['numeric identity', item => { item.id = 7; }], ['unknown experiment', item => { item.experiment = 'unknown'; }],
    ['missing date', item => { delete item.date; }], ['numeric date', item => { item.date = 123; }],
    ['long date', item => { item.date = 'd'.repeat(41); }], ['missing model', item => { delete item.model; }],
    ['array model', item => { item.model = []; }], ['missing model key', item => { delete item.model.context; }],
    ['missing matching key', item => { delete item.model.matchValue; }], ['string control', item => { item.model.contrast = '80'; }],
    ['out-of-range control', item => { item.model.contrast = 101; }], ['fractional control', item => { item.model.contrast = 80.5; }],
    ['nonboolean context', item => { item.model.context = 1; }], ['nonboolean reveal', item => { item.model.reveal = 'true'; }],
    ['nonboolean matching', item => { item.model.matching = 'false'; }], ['unknown prediction', item => { item.model.prediction = 'Correct'; }],
    ['nonstring note', item => { item.model.note = null; }], ['long note', item => { item.model.note = 'n'.repeat(501); }],
  ])('rejects the whole file for a %s without repairing the record', (_, damage) => {
    const broken = record('broken'); damage(broken);
    expect(parse([record('good'), broken])).toEqual({ status: 'records', records: [] });
  });

  it('rejects duplicate record IDs while accepting canonical empty dates and bounded identities', () => {
    expect(parse([record('same'), record('same', 'necker')])).toEqual({ status: 'records', records: [] });
    const bounded = record('i'.repeat(96)); bounded.date = '';
    expect(parse([bounded])).toEqual({ status: 'ready', records: [bounded] });
  });

  it('strips unknown fields while keeping them inert and retaining only canonical exported values', () => {
    const original = record('__proto__');
    const text = JSON.stringify({ ...payload([{ ...original, extraRecord: true, model: { ...original.model, extraModel: { polluted: true } } }]), extraTop: true });
    expect(engine.parseNotebook(text)).toEqual({ status: 'ready', records: [original] });
    expect(Object.prototype).not.toHaveProperty('polluted');
  });

  it.each(MODES)('retains $id integer start endpoints and every saved group reveal state', mode => {
    const studies = group('range-group', mode).map((item, index) => ({ ...item, model: { ...item.model, reveal: index === 1 } }));
    expect(parse(studies)).toEqual({ status: 'ready', records: studies });
  });

  it.each([
    ['missing group', repeat => { delete repeat.id; }], ['untrimmed group', repeat => { repeat.id = ' group '; }],
    ['long group', repeat => { repeat.id = 'g'.repeat(97); }], ['zero trial', repeat => { repeat.trial = 0; }],
    ['fourth trial', repeat => { repeat.trial = 4; }], ['string trial', repeat => { repeat.trial = '1'; }],
    ['fractional trial', repeat => { repeat.trial = 1.5; }], ['string start', repeat => { repeat.startValue = '72'; }],
    ['fractional start', repeat => { repeat.startValue = 72.5; }], ['low start', repeat => { repeat.startValue = 15; }],
    ['high start', repeat => { repeat.startValue = 241; }],
  ])('rejects a %s repeat association rather than converting it into a standalone observation', (_, damage) => {
    const item = group()[0]; damage(item.repeat);
    expect(parse([item])).toEqual({ status: 'records', records: [] });
  });

  it('rejects unsupported or observation-mode repeat associations', () => {
    const observation = group()[0]; observation.model.matching = false;
    const unsupported = record('cube', 'necker'); unsupported.repeat = { id: 'cube-group', trial: 1, startValue: 72 };
    expect(parse([observation])).toEqual({ status: 'records', records: [] });
    expect(parse([unsupported])).toEqual({ status: 'records', records: [] });
  });

  it('accepts valid partial and conflicted exported groups without inventing a complete pooled study', () => {
    const partial = group('partial').slice(0, 2);
    const conflict = group('conflict'); conflict[1].model.contrast = 30; conflict[2].repeat.trial = 2;
    const parsed = parse([...partial, ...conflict]);
    expect(parsed).toEqual({ status: 'ready', records: [...partial, ...conflict] });
    expect(engine.savedStudy({ studies: parsed.records }, 'partial')).toMatchObject({ count: 2, complete: false });
    expect(engine.savedStudy({ studies: parsed.records }, 'conflict')).toMatchObject({ valid: false, complete: false });
  });
});

describe('Additive notebook import planning', () => {
  it('merges a ready plan without changing either input or current drawing, pin, and expansion state', () => {
    const state = seed([record('existing')]), incoming = group();
    const original = structuredClone(state), source = structuredClone(incoming);
    const result = plan(state, incoming);
    expect(result).toMatchObject({ status: 'ready', added: 3, skipped: 0, free: 23, remappedRecords: 0, remappedGroups: 0 });
    expect(result.additions).toEqual(incoming);
    expect(result.state).toEqual({ ...state, studies: [...state.studies, ...incoming] });
    expect(result.fingerprint).toBeTruthy();
    expect(state).toEqual(original); expect(incoming).toEqual(source);
  });

  it('deduplicates standalone snapshots by date, experiment, and full model while ignoring their identity', () => {
    const existing = record('existing'), incoming = { ...structuredClone(existing), id: 'from-file' };
    const state = seed([existing]), result = plan(state, [incoming]);
    expect(result).toMatchObject({ status: 'unchanged', added: 0, skipped: 1, free: 23, additions: [] });
    expect(result.state).toEqual(state);
    for (const change of [{ date: DATE + 'x' }, { model: { ...incoming.model, reveal: true } }, { model: { ...incoming.model, note: 'different note' } }]) {
      expect(plan(state, [{ ...incoming, ...change }])).toMatchObject({ status: 'ready', added: 1, skipped: 0 });
    }
  });

  it('matches complete groups as whole semantic units regardless of their IDs and record order', () => {
    const existing = group('already-here'), incoming = group('from-file').reverse();
    const state = seed(existing), result = plan(state, incoming);
    expect(result).toMatchObject({ status: 'unchanged', added: 0, skipped: 3, additions: [] });
    expect(result.state).toEqual(state);
  });

  it.each(['incoming complete', 'incoming partial'])('imports the whole group when retained membership differs: %s', variation => {
    const whole = group('same-group');
    const existing = variation === 'incoming complete' ? whole.slice(0, 2) : whole;
    const incoming = variation === 'incoming complete' ? whole : whole.slice(0, 2);
    const state = seed(existing), result = plan(state, incoming);
    expect(result).toMatchObject({ status: 'ready', added: incoming.length, skipped: 0, remappedRecords: 2, remappedGroups: 1 });
    expect(result.additions.map(item => item.repeat.id)).toEqual(Array(incoming.length).fill('import-study-1'));
    expect(result.state.studies.slice(0, existing.length)).toEqual(existing);
    expect(engine.savedStudy(result.state, 'same-group').count).toBe(existing.length);
    expect(engine.savedStudy(result.state, 'import-study-1').count).toBe(incoming.length);
  });

  it('imports an entire new group when a single saved reveal or starting value differs', () => {
    const state = seed(group('existing'));
    const reveal = group('incoming'); reveal[1].model.reveal = true;
    const starts = group('incoming'); starts[1].repeat.startValue = 239;
    for (const incoming of [reveal, starts]) expect(plan(state, incoming)).toMatchObject({ status: 'ready', added: 3, skipped: 0 });
  });

  it('deduplicates exact conflicted memberships but never drops part of a different conflicted group', () => {
    const existing = group('conflict'); existing[2].repeat.trial = 2;
    const same = structuredClone(existing).reverse().map((item, index) => ({ ...item, id: 'copy-' + index, repeat: { ...item.repeat, id: 'copy-group' } }));
    expect(plan(seed(existing), same)).toMatchObject({ status: 'unchanged', added: 0, skipped: 3 });
    same[0].model.note = 'different observation';
    expect(plan(seed(existing), same)).toMatchObject({ status: 'ready', added: 3, skipped: 0 });
  });

  it('preserves distinct incoming row and group multiplicity on the first import and skips them on re-import', () => {
    const first = record('first'), second = { ...structuredClone(first), id: 'second' };
    const incoming = [first, second, ...group('group-a'), ...group('group-b')];
    const result = plan(seed(), incoming);
    expect(result).toMatchObject({ status: 'ready', added: 8, skipped: 0 });
    expect(result.additions).toEqual(incoming);
    expect(plan(result.state, incoming)).toMatchObject({ status: 'unchanged', added: 0, skipped: 8 });
  });

  it.each(['standalone', 'group'])('matches each saved %s unit only once when the file contains another identical copy', kind => {
    const existing = kind === 'standalone' ? [record('saved')] : group('saved-group');
    const first = kind === 'standalone' ? [{ ...structuredClone(existing[0]), id: 'first-copy' }] : group('first-copy');
    const second = kind === 'standalone' ? [{ ...structuredClone(existing[0]), id: 'second-copy' }] : group('second-copy');
    const incoming = [...first, ...second], result = plan(seed(existing), incoming);
    expect(result).toMatchObject({ status: 'ready', added: second.length, skipped: first.length });
    expect(result.additions).toEqual(second);
    expect(plan(result.state, incoming)).toMatchObject({ status: 'unchanged', added: 0, skipped: incoming.length });
  });

  it('remaps colliding record IDs deterministically while reserving every current and incoming record identity', () => {
    const state = seed([record('same', 'brightness', { note: 'old' }), record('import-observation-2')]);
    const incoming = [record('same', 'brightness', { note: 'new' }), record('import-observation-1')];
    const result = plan(state, incoming);
    expect(result).toMatchObject({ status: 'ready', remappedRecords: 1, remappedGroups: 0 });
    expect(result.additions.map(item => item.id)).toEqual(['import-observation-3', 'import-observation-1']);
    expect(plan(state, incoming)).toEqual(result);
    expect(new Set(result.state.studies.map(item => item.id)).size).toBe(4);
  });

  it('remaps a colliding group once and preserves the entire source membership without merging it into the old group', () => {
    const state = seed([...group('same'), ...group('import-study-2').slice(0, 1)]);
    const incoming = [...group('same', MODES[0], { contrast: 30 }).map((item, index) => ({ ...item, id: 'new-' + index })), ...group('import-study-1', MODES[0], { contrast: 20 }).slice(0, 1)];
    const result = plan(state, incoming);
    expect(result).toMatchObject({ status: 'ready', added: 4, skipped: 0, remappedRecords: 0, remappedGroups: 1 });
    expect(result.additions.slice(0, 3).map(item => item.repeat.id)).toEqual(['import-study-3', 'import-study-3', 'import-study-3']);
    expect(engine.savedStudy(result.state, 'same')).toMatchObject({ count: 3, complete: true });
    expect(engine.savedStudy(result.state, 'import-study-3')).toMatchObject({ count: 3, complete: true });
    expect(result.additions.slice(0, 3).map(item => item.repeat.startValue)).toEqual(MODES[0].starts);
  });

  it('plans over-capacity additions without evicting an observation or truncating a group', () => {
    const state = seed(Array.from({ length: 22 }, (_, index) => record('existing-' + index)));
    const incoming = group(), result = plan(state, incoming);
    expect(result).toMatchObject({ status: 'capacity', added: 3, skipped: 0, free: 2, additions: incoming });
    expect(result.state).toEqual(state);
    const fits = plan(seed(state.studies.slice(0, 21)), incoming);
    expect(fits.status).toBe('ready'); expect(fits.state.studies).toHaveLength(24);
  });

  it('counts duplicate skips before checking capacity', () => {
    const incoming = group('already-here'), other = Array.from({ length: 21 }, (_, index) => record('old-' + index));
    const state = seed([...other, ...incoming]);
    expect(plan(state, group('copy'))).toMatchObject({ status: 'unchanged', added: 0, skipped: 3, free: 0 });
  });

  it('rejects invalid direct records without producing additions or mutating the normalized notebook', () => {
    const state = seed([record('existing')]), bad = record(); delete bad.model.note;
    const result = plan(state, [bad]);
    expect(result).toMatchObject({ status: 'records', additions: [], added: 0 });
    expect(result.state).toEqual(state);
  });

  it('uses only the current notebook in its baseline fingerprint while keeping drawing edits in the result', () => {
    const state = seed([record('existing')]), incoming = [record('incoming')];
    const changed = engine.normalize({ ...state, experiment: 'necker', models: { ...state.models, moire: { ...state.models.moire, angle: 19.3 } }, comparison: null });
    expect(plan(changed, incoming).fingerprint).toBe(plan(state, incoming).fingerprint);
    const notebookChanged = structuredClone(state); notebookChanged.studies[0].model.note = 'edited notebook observation';
    expect(plan(notebookChanged, incoming).fingerprint).not.toBe(plan(state, incoming).fingerprint);
  });
});

describe('Previewed notebook import learner workflow', () => {
  it('previews without changes, adds once, and undoes only the imported observations while retaining later drawing edits', async () => {
    const state = seed([record('existing')]), incoming = group();
    incoming[1].model.reveal = true;
    await mount(state);
    const opener = button('Import notebook');
    await act(async () => opener.click());
    expect(document.activeElement).toBe(importFile());
    await chooseFile(JSON.stringify(payload(incoming)));
    expect(preview().dataset.perceptionImportPreview).toBe('preview');
    expect(document.activeElement).toBe(preview().querySelector('h4'));
    expect([count('added'), count('skipped'), count('free')]).toEqual([3, 0, 23]);
    expect(preview().textContent).not.toContain('134');
    expect(latest).toEqual(state);
    await click('Add observations');
    expect(preview()).toBeNull();
    expect(latest).toEqual({ ...state, studies: [...state.studies, ...incoming] });
    expect(latestAll.otherTool).toEqual({ preserved: 37 });
    expect(document.activeElement).toBe(button('Undo import'));
    expect(status()).toBe('Import complete. Added to your notebook: 3. Undo import is available.');
    const edited = engine.normalize({ ...latest, models: { ...latest.models, moire: { ...latest.models.moire, angle: 19.3, note: 'later draft' } }, comparison: null });
    await act(async () => externalState(edited));
    await click('Undo import');
    expect(latest).toEqual({ ...edited, studies: state.studies });
    expect(status()).toBe('Imported observations removed. The previous notebook is restored.');
    expect(document.activeElement).toBe(host.querySelector('.perception-journal h3'));
  });

  it('recognizes a re-imported group and allows cancellation without discarding the available import undo', async () => {
    const state = seed(); await mount(state); await openPreview(); await click('Add observations');
    await openPreview(group('renamed-copy'));
    expect([count('added'), count('skipped'), count('free')]).toEqual([0, 3, 21]);
    expect(button('Add observations').disabled).toBe(true);
    expect(preview().textContent).toContain('All observations in this file are already saved.');
    await click('Cancel import');
    expect(preview()).toBeNull(); expect(document.activeElement).toBe(button('Import notebook'));
    await click('Undo import'); expect(latest).toEqual(state);
  });

  it('explains an over-capacity preview without evicting existing observations', async () => {
    const state = seed(Array.from({ length: 22 }, (_, index) => record('existing-' + index)));
    await mount(state); await openPreview();
    expect([count('added'), count('skipped'), count('free')]).toEqual([3, 0, 2]);
    expect(button('Add observations').disabled).toBe(true);
    expect(preview().textContent).toContain('This import needs 3 spaces; 2 are available.');
    expect(latest).toEqual(state);
  });

  it('reports invalid observations without partially adding valid records and can retry a valid file', async () => {
    const state = seed([record('existing')]), broken = record('broken'); delete broken.model.context;
    await mount(state); await click('Import notebook');
    await chooseFile(JSON.stringify(payload([record('good'), broken])));
    expect(preview().dataset.perceptionImportPreview).toBe('error');
    expect(document.activeElement).toBe(preview().querySelector('h4'));
    expect(status()).toBe('This notebook contains invalid observations or more than 24 records. No observations were added.');
    expect(latest).toEqual(state);
    await chooseFile(JSON.stringify(payload(group())));
    expect(preview().dataset.perceptionImportPreview).toBe('preview');
    expect(count('added')).toBe(3);
  });

  it('rejects a UTF-8 file over the byte limit before starting a reader even when its character count is smaller', async () => {
    const readers = deferredReaders(); await mount(); await click('Import notebook');
    const file = await chooseFile('é'.repeat(262145), { wait: false });
    expect(file.size).toBeGreaterThan(512 * 1024);
    expect(readers).toHaveLength(0);
    expect(preview().dataset.perceptionImportPreview).toBe('error');
    expect(status()).toBe('Choose a notebook file of 512 KiB or less.');
    expect(latest.studies).toHaveLength(0);
  });

  it('cancels a deferred read, ignores its later completion, and keeps cancellation feedback and focus', async () => {
    const readers = deferredReaders(), state = seed();
    await mount(state); await click('Import notebook');
    await chooseFile(JSON.stringify(payload(group())), { wait: false });
    expect(preview().dataset.perceptionImportPreview).toBe('reading');
    expect(readers).toHaveLength(1);
    await click('Cancel import');
    expect(readers[0].abort).toHaveBeenCalledOnce();
    await finishRead(readers[0]);
    expect(preview()).toBeNull(); expect(latest).toEqual(state);
    expect(status()).toBe('Notebook import canceled.');
    expect(announce).toHaveBeenLastCalledWith('Notebook import canceled.');
    expect(document.activeElement).toBe(button('Import notebook'));
  });

  it('expires a deferred read when the notebook changes and supports a fresh preview afterward', async () => {
    const readers = deferredReaders(); await mount(); await click('Import notebook');
    await chooseFile(JSON.stringify(payload(group())), { wait: false });
    const replacement = seed([record('later')]);
    await act(async () => externalState(replacement));
    await finishRead(readers[0]);
    expect(preview()).toBeNull(); expect(latest).toEqual(replacement);
    expect(status()).toBe('The notebook changed. Preview the file again before adding observations.');
    await click('Import notebook'); await chooseFile(JSON.stringify(payload(group())), { wait: false });
    await finishRead(readers[1]);
    expect(preview().dataset.perceptionImportPreview).toBe('preview'); expect(count('free')).toBe(23);
  });

  it('rejects an old read after a learner switch', async () => {
    const readers = deferredReaders(), state = seed();
    await mount(state); await click('Import notebook'); await chooseFile(JSON.stringify(payload(group())), { wait: false });
    await act(async () => changeProfile('another-learner'));
    await finishRead(readers[0]);
    expect(preview()).toBeNull(); expect(latest).toEqual(state);
    expect(announce).not.toHaveBeenCalledWith('Notebook preview ready. Review the counts before adding observations.');
  });

  it('aborts an unmounted read and ignores a late completion without updating state', async () => {
    const readers = deferredReaders(), state = seed();
    await mount(state); await click('Import notebook'); await chooseFile(JSON.stringify(payload(group())), { wait: false });
    await act(async () => root.unmount()); root = null;
    expect(readers[0].abort).toHaveBeenCalledOnce();
    await finishRead(readers[0]);
    expect(host.innerHTML).toBe(''); expect(latest).toEqual(state);
    expect(announce).not.toHaveBeenCalledWith('Notebook preview ready. Review the counts before adding observations.');
  });

  it('cancels a deferred Add and never lets its queued updater replace the cancellation message', async () => {
    const state = seed([record('existing')]); await mount(state); await openPreview();
    deferUpdates = true; await click('Add observations');
    expect(pendingUpdates).toHaveLength(1);
    await click('Cancel import');
    deferUpdates = false; await act(async () => flushUpdates());
    expect(latest).toEqual(state); expect(preview()).toBeNull();
    expect(status()).toBe('Notebook import canceled.');
    expect(announce).toHaveBeenLastCalledWith('Notebook import canceled.');
  });

  it('rejects a deferred Add after external notebook replacement without silently replanning', async () => {
    await mount(seed([record('existing')])); await openPreview();
    deferUpdates = true; await click('Add observations');
    const replacement = seed([record('replacement')]);
    await act(async () => externalState(replacement));
    deferUpdates = false; await act(async () => flushUpdates());
    expect(latest).toEqual(replacement); expect(preview()).toBeNull();
    expect(status()).toBe('The notebook changed. Preview the file again before adding observations.');
    expect([...host.querySelectorAll('button')].some(node => node.textContent === 'Undo import')).toBe(false);
  });

  it('checks the latest notebook when a replacement and retained Add occur in the same React batch', async () => {
    await mount(); await openPreview(); const retained = button('Add observations');
    const replacement = seed([record('newest')]);
    await act(async () => { externalState(replacement); retained.click(); });
    expect(latest).toEqual(replacement); expect(preview()).toBeNull();
    expect(status()).toBe('The notebook changed. Preview the file again before adding observations.');
  });

  it('rejects a deferred Add after the learner profile changes', async () => {
    const state = seed(); await mount(state); await openPreview();
    deferUpdates = true; await click('Add observations');
    await act(async () => changeProfile('another-learner'));
    deferUpdates = false; await act(async () => flushUpdates());
    expect(latest).toEqual(state); expect(preview()).toBeNull();
    expect([...host.querySelectorAll('button')].some(node => node.textContent === 'Undo import')).toBe(false);
  });

  it('rejects a deferred Undo after the notebook gains a newer observation', async () => {
    await mount(seed([record('existing')])); await openPreview(); await click('Add observations');
    deferUpdates = true; await click('Undo import');
    const replacement = engine.normalize({ ...latest, studies: [...latest.studies, record('newest')] });
    await act(async () => externalState(replacement));
    deferUpdates = false; await act(async () => flushUpdates());
    expect(latest).toEqual(replacement);
    expect(status()).toBe('The notebook changed. Preview the file again before adding observations.');
  });

  it('preserves a newer notebook when a deferred Undo belongs to an earlier learner', async () => {
    await mount(); await openPreview(); await click('Add observations');
    const state = structuredClone(latest);
    deferUpdates = true; await click('Undo import');
    await act(async () => changeProfile('another-learner'));
    deferUpdates = false; await act(async () => flushUpdates());
    expect(latest).toEqual(state);
  });

  it('adds and undoes exactly once under StrictMode and repeated activations', async () => {
    const state = seed([record('existing')]); await mount(state, { strict: true }); await openPreview();
    const add = button('Add observations'); await act(async () => { add.click(); add.click(); });
    expect(latest.studies).toHaveLength(4);
    const undo = button('Undo import'); await act(async () => { undo.click(); undo.click(); });
    expect(latest).toEqual(state);
  });

  it('blocks import while a three-match study is collecting and enables it after the study ends', async () => {
    const state = engine.normalize({ experiment: 'brightness', models: { brightness: { matching: true } } });
    await mount(state); await click('Start three matches');
    expect(button('Import notebook').disabled).toBe(true);
    expect(preview()).toBeNull();
    await click('End repeated study');
    expect(button('Import notebook').disabled).toBe(false);
    await click('Import notebook'); expect(preview().dataset.perceptionImportPreview).toBe('choose');
  });

  it('renders a filename and observation note containing markup as literal text', async () => {
    const markup = '<img src=x onerror="window.importExecuted=true">';
    const incoming = [record('markup', 'brightness', { note: markup })];
    await mount(); await click('Import notebook');
    await chooseFile(JSON.stringify(payload(incoming)), { name: markup + '.json' });
    expect(preview().textContent).toContain(markup + '.json'); expect(host.querySelector('img')).toBeNull();
    await click('Add observations');
    expect(host.textContent).toContain(markup); expect(host.querySelector('img')).toBeNull();
    expect(window.importExecuted).toBeUndefined();
  });
});
