import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(process.env.DINOLAB_CHECKPOINT_SOURCE || 'stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
const start = source.indexOf('// DINO_VOXEL_CHECKPOINT_MODEL_START');
const end = source.indexOf('// DINO_VOXEL_CHECKPOINT_MODEL_END', start);
if (start < 0 || end <= start || source.indexOf('// DINO_VOXEL_CHECKPOINT_MODEL_START', start + 1) >= 0) throw Error('Missing or ambiguous checkpoint model seam');
const H = new Function(source.slice(start, end) + '\nreturn {digVoxelCheckpointRecord,digVoxelCheckpoint,digVoxelCheckpointNotes};')();
function column(index, removed = 0, status = removed ? 'partial' : 'covered') {
  return { index, row: Math.floor(index / 6), col: index % 6, coord: String.fromCharCode(65 + index % 6) + (Math.floor(index / 6) + 1), removed, remaining: 4 - removed, status, shape: status === 'exposed' ? ['curved','elongate','compact'][index % 3] : null };
}
function survey(patches = {}, seed = 42, focus = 0) {
  const columns = Array.from({ length: 24 }, (_, index) => column(index, ...(patches[index] || [])));
  return { seed, focus, selected: columns[focus], columns };
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function keysDeep(value) { return value && typeof value === 'object' ? Object.entries(value).flatMap(([key, child]) => [key, ...keysDeep(child)]) : []; }
const recordKeys = ['version','seed','columns'].sort();
const columnKeys = ['index','removed','status'].sort();
const comparisonKeys = ['kind','seed','key','baselineKey','baseline','columns','changedColumns','layersRemoved','newContacts','newExposed'].sort();
function blank(kind, seed = 42) {
  return { kind, seed, key: null, baselineKey: null, baseline: null, columns: [], changedColumns: [], layersRemoved: 0, newContacts: 0, newExposed: 0 };
}
function expectPublic(value) {
  for (const key of ['shape','hasBone','burial','fossilY','coverRemaining','chosen','boneCells','clues','species','anatomy','age','association']) expect(keysDeep(value)).not.toContain(key);
}

describe('manual public excavation checkpoints', () => {
  it('copies exactly the observed counts/statuses and sorts arbitrary input order without mutating it', () => {
    const observed = survey({ 2: [2,'contact'], 4: [3,'exposed'], 6: [4,'cleared'] }, 71, 4);
    observed.columns.reverse();
    const saved = H.digVoxelCheckpointRecord(freeze(observed));
    expect(Object.keys(saved).sort()).toEqual(recordKeys);
    expect(saved).toMatchObject({ version: 1, seed: 71 });
    saved.columns.forEach((entry, index) => { expect(Object.keys(entry).sort()).toEqual(columnKeys); expect(entry.index).toBe(index); });
    expect(saved.columns[2]).toEqual({ index: 2, removed: 2, status: 'contact' });
    expect(saved.columns[4]).toEqual({ index: 4, removed: 3, status: 'exposed' });
    expect(saved.columns[6]).toEqual({ index: 6, removed: 4, status: 'cleared' });
    expect(saved.columns).not.toBe(observed.columns);
    expect(saved.columns[4]).not.toBe(observed.selected);
    expectPublic(saved);
  });

  it('does not read or retain unrelated properties on observations or restored baselines', () => {
    const observed = survey(), raw = H.digVoxelCheckpointRecord(observed);
    for (const target of [observed, observed.columns[0], raw, raw.columns[0]]) {
      for (const key of ['shape','chosen','burial','hasBone','species','boneCells']) Object.defineProperty(target, key, { configurable: true, get() { throw Error('Unrelated property read: ' + key); } });
    }
    const saved = H.digVoxelCheckpointRecord(observed), compared = H.digVoxelCheckpoint(observed, raw);
    expect(saved.columns[0]).toEqual({ index: 0, removed: 0, status: 'covered' });
    expect(compared.kind).toBe('ready'); expectPublic(compared);
  });

  it('compares all 24 matching coordinates and counts actual new observations without a hidden-site input', () => {
    const baseline = H.digVoxelCheckpointRecord(survey({ 1: [1,'partial'], 7: [2,'contact'], 12: [3,'exposed'], 20: [4,'cleared'] }));
    const current = freeze(survey({ 1: [2,'partial'], 3: [2,'contact'], 7: [3,'exposed'], 12: [3,'exposed'], 20: [4,'cleared'] }, 42, 7));
    const compared = H.digVoxelCheckpoint(current, freeze(baseline));
    expect(Object.keys(compared).sort()).toEqual(comparisonKeys);
    expect(compared).toMatchObject({ kind: 'ready', seed: 42, layersRemoved: 4, newContacts: 1, newExposed: 1 });
    expect(compared.columns).toHaveLength(24);
    expect(compared.changedColumns.map(entry => entry.index)).toEqual([1,3,7]);
    expect(compared.columns[7]).toEqual({ index: 7, row: 1, col: 1, coord: 'B2', beforeRemoved: 2, removed: 3, beforeRemaining: 2, remaining: 1, beforeStatus: 'contact', status: 'exposed', delta: 1, changed: true });
    expect(compared.columns[12]).toMatchObject({ changed: false, delta: 0 });
    expect(compared.key).toMatch(/^checkpoint:42:\d{48}:\d{48}$/);
    expect(compared.baselineKey).toMatch(/^checkpoint:42:\d{48}$/);
    expectPublic(compared);
  });

  it('records a newly observed trowel contact even when no layer was removed there', () => {
    const baseline = H.digVoxelCheckpointRecord(survey({ 9: [2,'partial'] }));
    const compared = H.digVoxelCheckpoint(survey({ 9: [2,'contact'] }), baseline);
    expect(compared).toMatchObject({ kind: 'ready', layersRemoved: 0, newContacts: 1, newExposed: 0 });
    expect(compared.changedColumns).toHaveLength(1);
    expect(compared.changedColumns[0]).toMatchObject({ index: 9, delta: 0, changed: true });
  });

  it('has a stable baseline key, while current observation changes affect only the comparison key', () => {
    const baseline = H.digVoxelCheckpointRecord(survey());
    const first = H.digVoxelCheckpoint(survey({ 2: [1,'partial'] }), baseline);
    const later = H.digVoxelCheckpoint(survey({ 2: [2,'partial'], 14: [1,'partial'] }, 42, 14), baseline);
    expect(first.baselineKey).toBe(later.baselineKey); expect(first.key).not.toBe(later.key);
    const focusOnly = H.digVoxelCheckpoint(survey({ 2: [2,'partial'], 14: [1,'partial'] }, 42, 23), baseline);
    expect(focusOnly.key).toBe(later.key);
    expect(H.digVoxelCheckpoint(survey(), baseline)).toMatchObject({ kind: 'ready', changedColumns: [], layersRemoved: 0, newContacts: 0, newExposed: 0 });
  });

  it('hides every historical comparison field after Undo, contact reversal or exposure reversal', () => {
    const pairs = [
      [survey({ 2: [2,'partial'] }), survey({ 2: [1,'partial'] })],
      [survey({ 2: [2,'contact'] }), survey({ 2: [2,'partial'] })],
      [survey({ 2: [2,'contact'] }), survey({ 2: [2,'exposed'] })],
      [survey({ 2: [3,'exposed'] }), survey({ 2: [3,'partial'] })],
      [survey({ 2: [2,'exposed'] }), survey({ 2: [3,'exposed'] })],
      [survey({ 2: [2,'contact'] }), survey({ 2: [4,'cleared'] })],
      [survey({ 2: [4,'cleared'] }), survey({ 2: [3,'partial'] })]
    ];
    for (const [before, current] of pairs) expect(H.digVoxelCheckpoint(current, H.digVoxelCheckpointRecord(before))).toEqual(blank('ahead'));
  });

  it('distinguishes missing, malformed and different-site checkpoints without leaking stored records', () => {
    const observed = survey(), baseline = H.digVoxelCheckpointRecord(observed);
    for (const raw of [undefined, null]) expect(H.digVoxelCheckpoint(observed, raw)).toEqual(blank('missing'));
    for (const raw of [false, true, 1, '', [], {}, { ...baseline, version: 2 }, { ...baseline, columns: baseline.columns.slice(1) }, { ...baseline, columns: Array(24).fill(baseline.columns[0]) }]) expect(H.digVoxelCheckpoint(observed, raw)).toEqual(blank('invalid'));
    expect(H.digVoxelCheckpoint(observed, { ...baseline, seed: 71 })).toEqual(blank('stale'));
    for (const status of ['', 'unknown', 'exposed', 'partial', 'contact', 'cleared']) {
      const corrupted = { ...baseline, columns: baseline.columns.map(entry => entry.index === 0 ? { ...entry, status } : entry) };
      expect(H.digVoxelCheckpoint(observed, corrupted)).toEqual(blank('invalid'));
    }
  });

  it('rejects incoherent public survey records and selected references before saving or comparing', () => {
    const mutations = [
      value => { value.seed = 0; }, value => { value.seed = '42'; }, value => { value.columns.pop(); },
      value => { value.columns[1] = value.columns[0]; }, value => { value.columns[0].row = 1; },
      value => { value.columns[0].col = 5; }, value => { value.columns[0].coord = 'F4'; },
      value => { value.columns[0].removed = '0'; }, value => { value.columns[0].remaining = 3; },
      value => { value.columns[0].status = 'exposed'; }, value => { value.focus = 24; },
      value => { value.selected = { ...value.selected, status: 'contact' }; }, value => { value.selected = null; }
    ];
    for (const mutate of mutations) {
      const observed = survey(); mutate(observed);
      expect(H.digVoxelCheckpointRecord(observed)).toBeNull();
      expect(H.digVoxelCheckpoint(observed, H.digVoxelCheckpointRecord(survey()))).toEqual(blank('invalid', null));
    }
  });
});

describe('reflection notes bound to one valid saved baseline', () => {
  it('retains bounded string answers across later observations without coercion or trimming writing', () => {
    const baseline = H.digVoxelCheckpointRecord(survey());
    const first = H.digVoxelCheckpoint(survey({ 2: [1,'partial'] }), baseline);
    const later = H.digVoxelCheckpoint(survey({ 2: [2,'partial'] }), baseline);
    const raw = freeze({ key: first.baselineKey, observation: '  A1 changed  ', interpretation: 'x'.repeat(410), next: '\nTry row 2\n', score: 10 });
    const notes = H.digVoxelCheckpointNotes(later, raw);
    expect(notes).toEqual({ key: first.baselineKey, observation: '  A1 changed  ', interpretation: 'x'.repeat(400), next: '\nTry row 2\n' });
    expect(Object.keys(notes).sort()).toEqual(['key','observation','interpretation','next'].sort());
  });

  it('rejects wrong keys, invalid baselines, ahead comparisons and nonstring values', () => {
    const comparison = H.digVoxelCheckpoint(survey(), H.digVoxelCheckpointRecord(survey()));
    const blankNotes = { key: comparison.baselineKey, observation: '', interpretation: '', next: '' };
    expect(H.digVoxelCheckpointNotes(comparison, { key: comparison.key, observation: 'wrong current key' })).toEqual(blankNotes);
    const hostile = { toString() { throw Error('coerced'); } };
    for (const value of [null, undefined, 0, false, [], {}, hostile, new String('wrapped')]) expect(H.digVoxelCheckpointNotes(comparison, { key: comparison.baselineKey, observation: value, interpretation: value, next: value })).toEqual(blankNotes);
    for (const value of [null, { ...comparison, kind: 'ahead' }, { ...comparison, baselineKey: 'bad' }, { ...comparison, baseline: { ...comparison.baseline, seed: 71 } }, { ...comparison, baseline: { version: 1, seed: 42, columns: [] } }]) expect(H.digVoxelCheckpointNotes(value, { key: comparison.baselineKey, observation: 'old exposed find' })).toEqual({ key: null, observation: '', interpretation: '', next: '' });
  });
});
