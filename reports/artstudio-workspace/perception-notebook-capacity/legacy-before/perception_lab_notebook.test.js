import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
let engine, config, host, root, latest, latestAll, externalState, changeProfile, announce;
const study = (id, experiment = 'brightness', model = {}) => ({
  id, experiment, date: '2026-10-03T14:00:00.000Z',
  model: { prediction: 'Left', note: String(id || 'legacy'), ...model },
});
const ids = state => state.studies.map(record => record.id);
const row = id => [...host.querySelectorAll('[data-perception-study]')].find(node => node.dataset.perceptionStudy === id);

async function mount(seed = {}, { strict = false } = {}) {
  function Harness() {
    const [data, setData] = React.useState({ perceptionLab: seed, otherTool: { preserved: 37 } });
    const [profile, setProfile] = React.useState('learner-a');
    latest = engine.normalize(data.perceptionLab);
    latestAll = data;
    externalState = value => setData(previous => ({ ...previous, perceptionLab: value }));
    changeProfile = setProfile;
    return config.render(makeCtx({ toolData: data, setToolData: setData, activeProfileId: profile, announceToSR: announce }));
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

describe('Perception notebook identities and editing', () => {
  it('repairs missing, whitespace, duplicate, and hostile IDs without losing valid observations', () => {
    const raw = { studies: [study('same'), study('same', 'cafeWall', { note: 'second' }), study(''), study('   '), study('__proto__'), { id: 'bad', experiment: 'missing' }] };
    const normalized = engine.normalize(raw);
    expect(normalized.studies).toHaveLength(5);
    expect(ids(normalized).every(id => typeof id === 'string' && id.trim())).toBe(true);
    expect(new Set(ids(normalized)).size).toBe(5);
    expect(normalized.studies.map(record => record.model.note)).toEqual(['same', 'second', 'legacy', '   ', '__proto__']);
    expect(engine.normalize(raw)).toEqual(normalized);
    expect(engine.normalize(JSON.parse(JSON.stringify(normalized)))).toEqual(normalized);
  });

  it('keeps repaired long duplicate identities stable when the earlier record is removed', () => {
    const long = 'identity-'.repeat(40);
    const state = engine.normalize({ studies: [study(long, 'brightness', { note: 'first' }), study(long, 'brightness', { note: 'second' })] });
    const first = state.studies[0].id, second = state.studies[1].id;
    expect(second).not.toBe(first);
    const removed = engine.deleteStudy(state, first);
    expect(engine.normalize(removed.state).studies[0]).toMatchObject({ id: second, model: { note: 'second' } });
    expect(ids(engine.restoreDeleted(removed.state, removed.undo))).toEqual([first, second]);
  });

  it('deletes only the chosen identity and returns an immutable record with its original position', () => {
    const original = engine.normalize({ studies: [study('a'), study('b', 'brightness', { matching: true, swap: true, matchValue: 184 }), study('c')] });
    const snapshot = structuredClone(original);
    const result = engine.deleteStudy(original, 'b');
    expect(ids(result.state)).toEqual(['a', 'c']);
    expect(result.undo).toEqual({ study: snapshot.studies[1], index: 1 });
    expect(original).toEqual(snapshot);
    expect(engine.restoreDeleted(result.state, result.undo)).toEqual(snapshot);
    expect(result.state.studies).toHaveLength(2);
  });

  it('treats a missing deletion and invalid undo as no-ops', () => {
    const state = engine.normalize({ studies: [study('a')] });
    expect(engine.deleteStudy(state, 'missing')).toEqual({ state, undo: null });
    for (const undo of [null, [], {}, { study: { experiment: 'missing' }, index: 0 }]) {
      expect(engine.restoreDeleted(state, undo)).toEqual(state);
    }
  });

  it('does not duplicate a restored identity if its record already exists', () => {
    const state = engine.normalize({ studies: [study('a'), study('b')] });
    const result = engine.deleteStudy(state, 'a');
    const restored = engine.restoreDeleted(result.state, result.undo);
    expect(engine.restoreDeleted(restored, result.undo)).toEqual(restored);
    expect(ids(restored)).toEqual(['a', 'b']);
  });

  it.each([0, 12, 24])('undo keeps the restored record and bounds a full notebook at insertion position %s', index => {
    const state = engine.normalize({ studies: Array.from({ length: 24 }, (_, i) => study('retained-' + i)) });
    const restored = engine.restoreDeleted(state, { study: study('undo-record', 'mullerLyer', { matching: true, swap: true, matchValue: 475 }), index });
    expect(restored.studies).toHaveLength(24);
    expect(new Set(ids(restored)).size).toBe(24);
    expect(restored.studies.find(record => record.id === 'undo-record').model).toMatchObject({ matching: true, swap: true, matchValue: 475 });
    expect(state.studies).toHaveLength(24);
    expect(ids(restored).filter(id => id.startsWith('retained-'))).toEqual(ids(state).filter(id => ids(restored).includes(id)));
  });

  it('limits damaged persisted notebooks before repairing identity and model values', () => {
    const state = engine.normalize({ studies: Array.from({ length: 30 }, (_, index) => study('duplicate', 'brightness', { note: 'entry-' + index, matching: true, matchValue: 999, swap: true })) });
    expect(state.studies).toHaveLength(24);
    expect(state.studies.map(record => record.model.note)).toEqual(Array.from({ length: 24 }, (_, index) => 'entry-' + (index + 6)));
    expect(new Set(ids(state)).size).toBe(24);
    expect(engine.normalize(state)).toEqual(state);
    expect(state.studies.every(record => record.model.matching && record.model.swap && record.model.matchValue < 999)).toBe(true);
  });
});

describe('Perception comparisons record visible changes', () => {
  it('returns no visual delta without a reference or when the reference belongs to a different experiment', () => {
    expect(engine.comparisonChanges(engine.normalize())).toEqual([]);
    expect(engine.comparisonChanges({ experiment: 'brightness', comparison: { experiment: 'cafeWall', model: { offset: 0 } } })).toEqual([]);
  });

  it('ignores observation prose, guesses, and an inactive matching value', () => {
    const before = engine.normalizeModel('brightness', { prediction: 'Left', note: 'before', matchValue: 140 });
    const after = { ...before, prediction: 'Right', note: 'after', matchValue: 190 };
    expect(engine.comparisonChanges({ experiment: 'brightness', models: { brightness: after }, comparison: { experiment: 'brightness', model: before } })).toEqual([]);
  });

  it('reports previous and current numeric, context, and matching changes against a frozen reference', () => {
    const before = engine.normalizeModel('brightness', { contrast: 30, matching: true, matchValue: 140, swap: false });
    const after = { ...before, contrast: 70, context: false, matchValue: 181, swap: true };
    const state = engine.normalize({ experiment: 'brightness', models: { brightness: after }, comparison: { experiment: 'brightness', model: before } });
    const snapshot = structuredClone(state);
    expect(engine.comparisonChanges(state)).toEqual(expect.arrayContaining([
      { key: 'contrast', before: 30, after: 70 },
      { key: 'context', before: true, after: false },
      { key: 'swap', before: false, after: true },
      { key: 'matchValue', before: 140, after: 181 },
    ]));
    expect(engine.comparisonChanges(state)).toHaveLength(4);
    expect(state).toEqual(snapshot);
  });

  it('includes added depth cues and measurement reveal state in cube comparisons', () => {
    const before = engine.normalizeModel('necker', {});
    const after = { ...before, cue: 'front', reveal: true };
    expect(engine.comparisonChanges({ experiment: 'necker', models: { necker: after }, comparison: { experiment: 'necker', model: before } })).toEqual([
      { key: 'reveal', before: false, after: true },
      { key: 'cue', before: 'none', after: 'front' },
    ]);
  });
});

describe('Perception notebook controls', () => {
  it('shows newest records first, deletes by identity, and restores their original order once', async () => {
    const seed = engine.normalize({ studies: [study('a'), study('b'), study('c')] });
    await mount(seed);
    expect([...host.querySelectorAll('[data-perception-study]')].map(node => node.dataset.perceptionStudy)).toEqual(['c', 'b', 'a']);
    await click('Delete observation', row('b'));
    expect(ids(latest)).toEqual(['a', 'c']);
    expect(row('b')).toBeUndefined();
    expect(row('a')).toBeTruthy();
    expect(row('c')).toBeTruthy();
    expect(button('Undo deletion').disabled).toBe(false);
    expect(document.activeElement).toBe(button('Undo deletion'));
    await click('Undo deletion');
    expect(latest.studies).toEqual(seed.studies);
    expect(document.activeElement).toBe(host.querySelector('.perception-journal h3'));
    const undo = [...host.querySelectorAll('button')].find(node => node.textContent.trim() === 'Undo deletion');
    expect(!undo || undo.disabled).toBe(true);
    expect(latestAll.otherTool).toEqual({ preserved: 37 });
  });

  it('replaces the one-step undo record when another observation is deleted', async () => {
    await mount({ studies: [study('a'), study('b'), study('c')] });
    await click('Delete observation', row('a'));
    await click('Delete observation', row('b'));
    await click('Undo deletion');
    expect(ids(latest)).toEqual(['b', 'c']);
    expect(row('a')).toBeUndefined();
    expect(row('b')).toBeTruthy();
  });

  it('captures the latest record position when two deletions are batched before rendering', async () => {
    await mount({ studies: [study('a'), study('b'), study('c')] });
    const deleteA = button('Delete observation', row('a'));
    const deleteB = button('Delete observation', row('b'));
    await act(async () => {
      deleteA.click();
      deleteB.click();
    });
    expect(ids(latest)).toEqual(['c']);
    await click('Undo deletion');
    expect(ids(latest)).toEqual(['b', 'c']);
    expect(row('a')).toBeUndefined();
  });

  it('does not create undo when a stale deletion follows an external replacement in one batch', async () => {
    await mount({ studies: [study('a'), study('b'), study('c')] });
    const staleDelete = button('Delete observation', row('a'));
    await act(async () => {
      externalState(engine.normalize({ studies: [study('x')] }));
      staleDelete.click();
    });
    expect(ids(latest)).toEqual(['x']);
    expect([...host.querySelectorAll('button')].find(node => node.textContent.trim() === 'Undo deletion')).toBeUndefined();
    expect(row('x')).toBeTruthy();
  });

  it('clears earlier undo when an external replacement and Save are queued in the same batch', async () => {
    await mount({ studies: [study('a'), study('b')], models: { brightness: { prediction: 'Left', matching: true, swap: true, matchValue: 171 } } });
    await click('Delete observation', row('a'));
    expect(button('Undo deletion')).toBeTruthy();
    const save = button('Save observation');
    const replacement = engine.normalize({ ...latest, studies: [study('x')] });
    await act(async () => {
      externalState(replacement);
      save.click();
    });
    expect(latest.studies).toHaveLength(2);
    expect(latest.studies[0].id).toBe('x');
    expect(latest.studies[1].model).toMatchObject({ prediction: 'Left', matching: true, swap: true, matchValue: 171 });
    expect(ids(latest)).not.toContain('a');
    expect(ids(latest)).not.toContain('b');
    expect([...host.querySelectorAll('button')].find(node => node.textContent.trim() === 'Undo deletion')).toBeUndefined();
  });

  it('prevents a stale Undo click from restoring into an external notebook replacement', async () => {
    await mount({ studies: [study('a'), study('b')] });
    await click('Delete observation', row('a'));
    const staleUndo = button('Undo deletion');
    await act(async () => {
      externalState(engine.normalize({ studies: [study('x')] }));
      staleUndo.click();
    });
    expect(ids(latest)).toEqual(['x']);
    expect(row('a')).toBeUndefined();
    expect([...host.querySelectorAll('button')].find(node => node.textContent.trim() === 'Undo deletion')).toBeUndefined();
  });

  it('preserves one deletion undo while a new matching observation is saved', async () => {
    const seed = engine.normalize({ studies: [study('a'), study('b')], models: { brightness: { prediction: 'Left', matching: true, swap: true, matchValue: 171 } } });
    await mount(seed);
    await click('Delete observation', row('a'));
    await click('Save observation');
    const added = structuredClone(latest.studies.at(-1));
    expect(added.model).toMatchObject({ prediction: 'Left', matching: true, swap: true, matchValue: 171 });
    expect(button('Undo deletion').disabled).toBe(false);
    await click('Undo deletion');
    expect(latest.studies).toEqual([seed.studies[0], seed.studies[1], added]);
    expect(latest.models.brightness).toEqual(seed.models.brightness);
  });

  it('preserves valid deletion undo across StrictMode updater replay and a later matching save', async () => {
    const seed = engine.normalize({ studies: [study('a'), study('b')], models: { brightness: { prediction: 'Left', matching: true, swap: true, matchValue: 171 } } });
    await mount(seed, { strict: true });
    await click('Delete observation', row('a'));
    expect(ids(latest)).toEqual(['b']);
    expect(button('Undo deletion').disabled).toBe(false);
    await click('Save observation');
    const added = structuredClone(latest.studies.at(-1));
    expect(added.model).toMatchObject({ prediction: 'Left', matching: true, swap: true, matchValue: 171 });
    expect(button('Undo deletion').disabled).toBe(false);
    await click('Undo deletion');
    expect(latest.studies).toEqual([seed.studies[0], seed.studies[1], added]);
    expect(latest.models.brightness).toEqual(seed.models.brightness);
    expect(latestAll.otherTool).toEqual({ preserved: 37 });
  });

  it('pins a saved observation without overwriting the active experiment or saved record', async () => {
    const seed = engine.normalize({ experiment: 'cafeWall', models: { cafeWall: { offset: 74 } }, studies: [study('saved', 'brightness', { contrast: 21, matching: true, matchValue: 180, swap: true })] });
    await mount(seed);
    await click('Pin observation', row('saved'));
    expect(latest.experiment).toBe('cafeWall');
    expect(latest.models.cafeWall.offset).toBe(74);
    expect(latest.comparison).toEqual({ experiment: 'brightness', model: seed.studies[0].model });
    expect(latest.studies).toEqual(seed.studies);
    expect(host.querySelector('#perception-stage-reference')).toBeTruthy();
  });

  it('restores all captured matching settings without changing unrelated experiment drafts', async () => {
    const seed = engine.normalize({ experiment: 'cafeWall', models: { cafeWall: { offset: 74 } }, studies: [study('saved', 'brightness', { contrast: 21, context: false, reveal: true, matching: true, matchValue: 180, swap: true })] });
    await mount(seed);
    await click('Restore observation', row('saved'));
    expect(latest.experiment).toBe('brightness');
    expect(latest.models.brightness).toEqual(seed.studies[0].model);
    expect(latest.models.cafeWall.offset).toBe(74);
    expect(latest.studies).toEqual(seed.studies);
  });

  it('clears deletion undo across profile changes', async () => {
    await mount({ studies: [study('a'), study('b')] });
    await click('Delete observation', row('a'));
    await act(async () => changeProfile('learner-b'));
    const undo = [...host.querySelectorAll('button')].find(node => node.textContent.trim() === 'Undo deletion');
    expect(!undo || undo.disabled).toBe(true);
    expect(ids(latest)).toEqual(['b']);
  });

  it('clears stale undo when the host replaces persisted state', async () => {
    await mount({ studies: [study('a'), study('b')] });
    await click('Delete observation', row('a'));
    await act(async () => externalState(engine.normalize({ studies: [study('external')] })));
    const undo = [...host.querySelectorAll('button')].find(node => node.textContent.trim() === 'Undo deletion');
    expect(!undo || undo.disabled).toBe(true);
    expect(ids(latest)).toEqual(['external']);
    expect(row('external')).toBeTruthy();
  });
});

describe('Perception notebook JSON export', () => {
  const installDownloads = () => {
    const create = vi.fn(() => 'blob:perception-notebook'), revoke = vi.fn(), downloads = [];
    vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { downloads.push({ href: this.href, filename: this.download }); });
    return { create, revoke, downloads, click };
  };

  it('disables export for an empty notebook', async () => {
    const { create } = installDownloads();
    await mount();
    expect(button('Export notebook').disabled).toBe(true);
    await click('Export notebook');
    expect(create).not.toHaveBeenCalled();
  });

  it('exports only the normalized latest 24 records with a schema, version, and matching settings', async () => {
    vi.useFakeTimers();
    const { create, revoke, downloads } = installDownloads();
    const seed = { studies: Array.from({ length: 30 }, (_, i) => study('duplicate', 'brightness', { note: 'entry-' + i, matching: true, swap: true, matchValue: 180 })) };
    await mount(seed);
    const expected = structuredClone(latest.studies);
    const blob = vi.spyOn(globalThis, 'Blob');
    await click('Export notebook');
    expect(create).toHaveBeenCalledOnce();
    const [parts, options] = blob.mock.calls.at(-1);
    const payload = JSON.parse(parts.join(''));
    expect(payload).toEqual({ schema: 'alloflow.perception.notebook', version: 1, studies: expected });
    expect(payload.studies).toHaveLength(24);
    expect(new Set(payload.studies.map(record => record.id)).size).toBe(24);
    expect(payload.studies[0].model).toMatchObject({ matching: true, swap: true, matchValue: 180 });
    expect(options.type).toMatch(/^application\/json/);
    expect(downloads).toHaveLength(1);
    expect(downloads[0]).toMatchObject({ href: 'blob:perception-notebook', filename: expect.stringMatching(/\.json$/) });
    expect(document.querySelectorAll('a[download$=".json"]')).toHaveLength(0);
    expect(announce.mock.calls.some(([message]) => /exported/i.test(message))).toBe(true);
    await act(async () => vi.runOnlyPendingTimers());
    expect(revoke).toHaveBeenCalledWith('blob:perception-notebook');
    expect(latest.studies).toEqual(expected);
    expect(latestAll.otherTool).toEqual({ preserved: 37 });
  });

  it('announces URL creation failure without claiming the notebook was exported', async () => {
    const { create, downloads } = installDownloads();
    create.mockImplementation(() => { throw new Error('Object URLs unavailable'); });
    await mount({ studies: [study('saved')] });
    await click('Export notebook');
    expect(downloads).toHaveLength(0);
    expect(announce.mock.calls.some(([message]) => /could not|unavailable|failed/i.test(message))).toBe(true);
    expect(announce.mock.calls.some(([message]) => /exported/i.test(message))).toBe(false);
    expect(ids(latest)).toEqual(['saved']);
  });

  it('cleans the download anchor and allocated URL when starting a download throws', async () => {
    vi.useFakeTimers();
    const downloads = installDownloads();
    downloads.click.mockImplementation(() => { throw new Error('Download blocked'); });
    await mount({ studies: [study('saved')] });
    await click('Export notebook');
    expect(document.querySelectorAll('a[download$=".json"]')).toHaveLength(0);
    await act(async () => vi.runOnlyPendingTimers());
    expect(downloads.revoke).toHaveBeenCalledWith('blob:perception-notebook');
    expect(announce.mock.calls.some(([message]) => /could not|unavailable|failed/i.test(message))).toBe(true);
    expect(announce.mock.calls.some(([message]) => /exported/i.test(message))).toBe(false);
    expect(ids(latest)).toEqual(['saved']);
  });
});
