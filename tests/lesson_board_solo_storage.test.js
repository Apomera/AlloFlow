import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import * as e from '../lesson_board_engine.js';
import * as s from '../lesson_board_storage.js';
const require = createRequire(import.meta.url), { makeBoard } = require('../dev-tools/fixtures/lesson_board.cjs');
const memory = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; };
const opened = (board, id = 'heater') => e.merge(e.emptyRun(), e.begin(board, e.emptyRun(), id));
const save = (storage, board, run, options = {}) => s.saveSolo(storage, board, 'app', 'u', { run, ...options });
describe('Durable board solo storage', () => {
  it('saves a run and the final unfinished settings together for a future tab', () => {
    const storage = memory(), board = makeBoard(), run = opened(board, 'cloud');
    const result = save(storage, board, run, { workspace: { selected: 'cloud', view: 'list', drafts: { '0:cloud': '1,' } } });
    expect(result.status).toBe('saved');
    const loaded = s.readSolo(storage, board, 'app', 'u');
    expect(e.stepOf(loaded.run).phase).toBe('answer');
    expect(loaded.workspace).toEqual({ selected: 'cloud', view: 'list', drafts: { '0:cloud': '1,' } });
    expect(loaded.savedAt).toBeGreaterThan(0);
  });
  it('isolates users, apps, changed boards and identities containing separators', () => {
    const storage = memory(), board = makeBoard(); save(storage, board, opened(board));
    expect(s.readSolo(storage, board, 'app', 'v').status).toBe('empty');
    expect(s.readSolo(storage, board, 'other', 'u').status).toBe('empty');
    expect(s.readSolo(storage, { ...board, mission: board.mission + ' Updated.' }, 'app', 'u').status).toBe('empty');
    expect(s.soloStorageKey(board, 'a:b', 'c')).not.toBe(s.soloStorageKey(board, 'a', 'b:c'));
  });
  it('reads legacy tab progress without mutating either store and migrates only into an empty device slot', () => {
    const storage = memory(), legacy = memory(), board = makeBoard(), key = s.legacySoloStorageKey(board, 'app', 'u'), run = opened(board);
    legacy.setItem(key, JSON.stringify({ version: 1, board: JSON.stringify(board), run }));
    legacy.setItem(key + ':draft', JSON.stringify({ board: JSON.stringify(board), drafts: { '0:heater': '1' } }));
    const found = s.readSolo(storage, board, 'app', 'u', legacy);
    expect(found.status).toBe('legacy'); expect(storage.getItem(s.soloStorageKey(board, 'app', 'u'))).toBeNull();
    expect(save(storage, board, found.run, { workspace: found.workspace, expectedRevision: found.revision }).status).toBe('saved');
    expect(s.readSolo(storage, board, 'app', 'u', legacy).status).toBe('saved');
    expect(save(storage, board, run, { expectedRevision: null }).status).toBe('conflict');
  });
  it('restarts with an empty envelope so old tab drafts cannot resurrect when removal fails', () => {
    const storage = memory(), legacy = memory(), board = makeBoard(), key = s.legacySoloStorageKey(board, 'app', 'u');
    legacy.setItem(key, JSON.stringify({ version: 1, board: JSON.stringify(board), run: opened(board) }));
    legacy.setItem(key + ':draft', JSON.stringify({ board: JSON.stringify(board), drafts: { '0:heater': '1' } }));
    const first = save(storage, board, opened(board));
    legacy.removeItem = () => { throw Error('denied'); };
    expect(save(storage, board, e.emptyRun(), { workspace: {}, expectedRevision: first.revision }).status).toBe('saved');
    const restored = s.readSolo(storage, board, 'app', 'u', legacy);
    expect(e.stepOf(restored.run).phase).toBe('choose'); expect(restored.workspace.drafts).toEqual({});
  });
  it('preserves corrupt data and requires its exact revision before explicit replacement', () => {
    const storage = memory(), board = makeBoard(), key = s.soloStorageKey(board, 'app', 'u'); storage.setItem(key, '{broken');
    const found = s.readSolo(storage, board, 'app', 'u'); expect(found).toEqual({ status: 'corrupt', revision: '{broken' });
    expect(save(storage, board, e.emptyRun()).status).toBe('conflict'); expect(storage.getItem(key)).toBe('{broken');
    expect(save(storage, board, e.emptyRun(), { expectedRevision: found.revision }).status).toBe('saved');
  });
  it('does not overwrite a newer tab or report a quota failure as saved', () => {
    const storage = memory(), board = makeBoard(), first = save(storage, board, opened(board));
    const second = save(storage, board, opened(board, 'cloud'), { expectedRevision: first.revision });
    expect(save(storage, board, e.emptyRun(), { expectedRevision: first.revision }).status).toBe('conflict');
    expect(s.readSolo(storage, board, 'app', 'u').revision).toBe(second.revision);
    storage.setItem = () => { throw Error('quota'); };
    expect(save(storage, board, e.emptyRun(), { expectedRevision: second.revision }).status).toBe('unavailable');
    expect(s.readSolo(storage, board, 'app', 'u').revision).toBe(second.revision);
  });
  it('detects a competing write after setItem', () => {
    const storage = memory(), board = makeBoard(), original = storage.setItem;
    storage.setItem = (key, value) => { original(key, value); original(key, 'another revision'); };
    expect(save(storage, board, e.emptyRun())).toEqual({ status: 'conflict', revision: 'another revision' });
  });
  it('drops unsafe or stale workspace fields and rejects forged run progress', () => {
    const storage = memory(), board = makeBoard(), run = opened(board);
    const result = save(storage, board, run, { workspace: { selected: '__proto__', view: 'bad', drafts: { '0:heater': '999', '99:heater': '1', '0:cloud': '1,' }, injected: 'no' } });
    expect(result.workspace).toEqual({ selected: board.starts[0], view: 'board', drafts: { '0:cloud': '1,' } });
    const bad = { turn: 0, steps: { t0: { phase: 'review', targetId: 'heater', result: { success: true, marks: { solo: false } } } } };
    expect(save(storage, board, bad, { expectedRevision: result.revision }).status).toBe('invalid');
    expect(s.readSolo(storage, board, 'app', 'u').revision).toBe(result.revision);
  });
  it('reports denied reads without guessing that no save exists', () => {
    expect(s.readSolo({ getItem() { throw Error('denied'); } }, makeBoard(), 'app', 'u')).toEqual({ status: 'unavailable', revision: undefined });
  });
});
