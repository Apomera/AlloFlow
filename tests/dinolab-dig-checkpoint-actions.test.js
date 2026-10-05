import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync(process.env.DINOLAB_CHECKPOINT_SOURCE || 'stem_lab/stem_tool_dinolab.js', 'utf8');
function between(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  if (a < 0 || b < 0) throw Error('Actual checkpoint source marker missing');
  return source.slice(a + start.length, b);
}
const model = between('// DINO_VOXEL_CHECKPOINT_MODEL_START', '// DINO_VOXEL_CHECKPOINT_MODEL_END');
const actions = between('// DINO_VOXEL_CHECKPOINT_ACTIONS_START', '// DINO_VOXEL_CHECKPOINT_ACTIONS_END');
const factory = new Function('survey', 'saved', 'rawNotes', 'inspectFind', 'upd', model + '\n' +
  'var checkpointComparison = digVoxelCheckpoint(survey,saved);\n' +
  'var checkpointNotes = digVoxelCheckpointNotes(checkpointComparison,rawNotes);\n' + actions + '\n' +
  'return { recordCheckpoint,clearCheckpoint,setCheckpointGuides,setCheckpointNote,comparison:checkpointComparison,notes:checkpointNotes,record:digVoxelCheckpointRecord };');

function survey(overrides = {}, seed = 1) {
  const columns = Array.from({ length: 24 }, (_, index) => {
    const change = overrides[index] || {}, removed = change.removed ?? 0;
    const status = change.status || (removed === 4 ? 'cleared' : removed ? 'partial' : 'covered');
    return { index, row: Math.floor(index / 6), col: index % 6, coord: String.fromCharCode(65 + index % 6) + (Math.floor(index / 6) + 1), removed, remaining: 4 - removed, status, shape: status === 'exposed' ? ['curved','elongate','compact'][index % 3] : null };
  });
  return { seed, focus: 0, selected: columns[0], columns };
}
function run(current = survey(), saved = null, rawNotes = null, find = false) {
  const writes = [];
  const api = factory(current, saved, rawNotes, find, (...args) => writes.push(args));
  return { ...api, writes };
}
function baseline() { return run().record(survey()); }

describe('Dino checkpoint actual root action scope', () => {
  it('records all current public surfaces without copying shape or hidden payloads', () => {
    const current = survey({ 0: { removed: 2, status: 'exposed' }, 1: { removed: 1, status: 'contact' } });
    current.hiddenLayout = 'never copy this'; current.columns[0].identity = 'private identity';
    const original = JSON.stringify(current), api = run(current);
    api.recordCheckpoint();
    expect(api.writes).toHaveLength(1);
    const patch = api.writes[0][0];
    expect(Object.keys(patch).sort()).toEqual(['digVoxelCheckpoint','digVoxelCheckpointNotes']);
    expect(patch.digVoxelCheckpointNotes).toBeNull();
    expect(patch.digVoxelCheckpoint.columns).toHaveLength(24);
    expect(patch.digVoxelCheckpoint.columns[0]).toEqual({ index: 0, removed: 2, status: 'exposed' });
    expect(patch.digVoxelCheckpoint.columns.every(c => Object.keys(c).sort().join(',') === 'index,removed,status')).toBe(true);
    expect(JSON.stringify(patch)).not.toContain('never copy this');
    expect(JSON.stringify(patch)).not.toContain('private identity');
    expect(JSON.stringify(current)).toBe(original);
  });
  it('replaces an earlier checkpoint with the current observations and clears its reflection', () => {
    const old = baseline(), current = survey({ 0: { removed: 1 }, 8: { removed: 2 } });
    const api = run(current, old, { key: run(survey(),old).comparison.baselineKey, observation: 'Old note' });
    api.recordCheckpoint();
    expect(api.writes[0][0].digVoxelCheckpoint.columns[8].removed).toBe(2);
    expect(api.writes[0][0].digVoxelCheckpointNotes).toBeNull();
    expect(old.columns.every(c => c.removed === 0)).toBe(true);
  });
  it('does not record malformed current observations', () => {
    const current = survey(); current.columns[3].remaining = 9;
    const api = run(current); api.recordCheckpoint(); expect(api.writes).toEqual([]);
  });
  it('clears only the checkpoint and its reflection', () => {
    const api = run(survey(),baseline()); api.clearCheckpoint();
    expect(api.writes).toEqual([[{ digVoxelCheckpoint: null, digVoxelCheckpointNotes: null }]]);
  });
  it('changes only the guide preference for exact boolean values and a ready comparison', () => {
    const api = run(survey({ 0: { removed: 1 } }),baseline());
    api.setCheckpointGuides(true); api.setCheckpointGuides(false);
    for (const bad of ['true', 1, null, undefined, {}]) api.setCheckpointGuides(bad);
    expect(api.writes).toEqual([['digVoxelCheckpointGuides',true],['digVoxelCheckpointGuides',false]]);
  });
  it('rejects guide toggles without a valid checkpoint', () => {
    const api = run(); api.setCheckpointGuides(true); expect(api.writes).toEqual([]);
  });
  it('rejects guide and note edits after Undo retreats behind the baseline', () => {
    const saved = run().record(survey({ 0: { removed: 2 } }));
    const api = run(survey({ 0: { removed: 1 } }), saved);
    expect(api.comparison.kind).toBe('ahead');
    api.setCheckpointGuides(true); api.setCheckpointNote('observation','A misleading note');
    expect(api.writes).toEqual([]);
  });
  it('can explicitly replace an invalidated baseline with the current public survey', () => {
    const saved = run().record(survey({ 0: { removed: 2 } })), current = survey({ 0: { removed: 1 } });
    const api = run(current,saved); api.recordCheckpoint();
    expect(api.writes[0][0].digVoxelCheckpoint.columns[0].removed).toBe(1);
    expect(run(current,api.writes[0][0].digVoxelCheckpoint).comparison.kind).toBe('ready');
  });
  it('preserves the other two reflection fields while editing a known field', () => {
    const saved = baseline(), key = run(survey(),saved).comparison.baselineKey;
    const api = run(survey({ 0: { removed: 1 } }),saved,{ key, observation: 'One layer removed', interpretation: 'More searching is needed', next: 'Compare B1' });
    api.setCheckpointNote('observation','Two observations');
    expect(api.writes).toEqual([['digVoxelCheckpointNotes',{ key, observation: 'Two observations', interpretation: 'More searching is needed', next: 'Compare B1' }]]);
  });
  it('bounds reflection to400characters without writing any excavation or notebook state', () => {
    const api = run(survey(),baseline()); api.setCheckpointNote('interpretation','x'.repeat(900));
    expect(api.writes).toHaveLength(1);
    expect(api.writes[0][0]).toBe('digVoxelCheckpointNotes');
    expect(api.writes[0][1].interpretation).toHaveLength(400);
    expect(Object.keys(api.writes[0][1]).sort()).toEqual(['interpretation','key','next','observation']);
  });
  it('rejects unknown reflection fields and nonstring values', () => {
    const api = run(survey(),baseline());
    api.setCheckpointNote('score','100'); api.setCheckpointNote('key','forged');
    for (const bad of [true, 1, null, undefined, {}]) api.setCheckpointNote('next',bad);
    expect(api.writes).toEqual([]);
  });
  it('retains reflection across compatible digging while the current comparison key changes', () => {
    const saved = baseline(), before = run(survey(),saved), key = before.comparison.baselineKey;
    const after = run(survey({ 0: { removed: 1 }, 9: { removed: 1 } }),saved,{ key, observation: 'My saved observation' });
    expect(after.comparison.key).not.toBe(before.comparison.key);
    expect(after.comparison.baselineKey).toBe(key);
    expect(after.notes.observation).toBe('My saved observation');
  });
  it('ignores a reflection restored with a different baseline key', () => {
    const api = run(survey(),baseline(),{ key: 'forged', observation: 'Must not appear' });
    expect(api.notes.observation).toBe('');
    api.setCheckpointNote('next','Inspect the current surface');
    expect(api.writes[0][1].observation).toBe('');
  });
  it('keeps all checkpoint actions unavailable in exposed-find inspection', () => {
    const api = run(survey(),baseline(),null,true);
    api.recordCheckpoint(); api.clearCheckpoint(); api.setCheckpointGuides(true); api.setCheckpointNote('observation','Text');
    expect(api.writes).toEqual([]);
  });
});
