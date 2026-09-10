import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import * as transfer from '../lesson_board_transfer.js';
import * as storage from '../lesson_board_storage.js';
import * as engine from '../lesson_board_engine.js';
const require = createRequire(import.meta.url), { makeBoard, source } = require('../dev-tools/fixtures/lesson_board.cjs');
const pack = () => ({ format: transfer.BOARD_FILE_FORMAT, version: 1, source, language: 'English', board: makeBoard() });
const memory = () => { const values = new Map(); return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) }; };

describe('Portable lesson board files', () => {
  it('round-trips the exact validated board, lesson and language', () => {
    const text = transfer.exportBoardFile(makeBoard(), source, 'English');
    expect(transfer.parseBoardFile('\uFEFF' + text)).toEqual(pack());
    expect(transfer.boardFileCompatibility(pack(), '\n' + source.replaceAll(' ', '  '), 'english')).toBe(true);
    expect(transfer.boardFileCompatibility(pack(), source, 'Spanish')).toBe(false);
    expect(transfer.boardFileCompatibility(pack(), 'Another lesson', 'English')).toBe(false);
  });
  it('excludes learner data, live state and arbitrary executable fields', () => {
    const raw = pack(); raw.roster = { secretUid: { name: 'PRIVATE_NAME' } }; raw.run = { answers: 'PRIVATE_RESPONSE' }; raw.board.script = 'EXECUTABLE_PAYLOAD'; raw.board.locations[0].onClick = 'EXECUTABLE_PAYLOAD';
    const result = JSON.stringify(transfer.prepareBoardFile(raw));
    expect(result).not.toMatch(/PRIVATE_|EXECUTABLE_/);
    expect(Object.keys(JSON.parse(result))).toEqual(['format', 'version', 'source', 'language', 'board']);
  });
  it.each([null, [], {}, { ...pack(), version: 2 }, { ...pack(), format: 'alloflow-connected-escape' }])('rejects unsupported envelopes %#', value => expect(() => transfer.prepareBoardFile(value)).toThrow('board-file-format'));
  it.each([{ source: '' }, { source: 'x'.repeat(12001) }, { language: '' }, { language: 123 }])('requires bounded source context %#', fields => expect(() => transfer.prepareBoardFile({ ...pack(), ...fields })).toThrow('board-file-context'));
  it('rejects false evidence, disconnected boards and malformed options', () => {
    for (const alter of [board => board.locations[0].sourceQuote = 'A fabricated quote.', board => board.edges = [], board => board.locations[0].options = []]) {
      const raw = pack(); alter(raw.board); expect(() => transfer.prepareBoardFile(raw)).toThrow('board-file-invalid');
    }
  });
  it.each(['broken', '<script>alert(1)</script>'])('rejects non-JSON text %#', text => expect(() => transfer.parseBoardFile(text)).toThrow('board-file-format'));
  it('enforces both pre-read byte and post-read character limits', async () => {
    for (const size of [0, -1, NaN, Infinity, 200001]) await expect(transfer.readBoardFile({ size, text: () => Promise.resolve('{}') })).rejects.toThrow('board-file-size');
    await expect(transfer.readBoardFile({ size: 10, text: () => Promise.resolve('x'.repeat(60001)) })).rejects.toThrow('board-file-size');
    await expect(transfer.readBoardFile({ size: 10, text: () => { throw Error('read failed'); } })).rejects.toThrow('read failed');
    await expect(transfer.readBoardFile({ size: 9000, text: () => Promise.resolve(JSON.stringify(pack())) })).resolves.toEqual(pack());
  });
  it('creates safe, bounded filenames', () => {
    expect(transfer.boardFileName('../../A lesson: “Water”')).toBe('lesson-board-A-lesson-Water.alloboard.json');
    expect(transfer.boardFileName('💧')).toBe('lesson-board-export.alloboard.json');
    expect(transfer.boardFileName('x'.repeat(500)).length).toBeLessThan(110);
  });
});

describe('Saved copy replacement and resume descriptions', () => {
  it('replaces an explicitly selected copy in a full library without evicting others', () => {
    const store = memory(); for (let i = 0; i < 4; i++) storage.saveBoard(store, source, 'English', { ...makeBoard(), title: 'Board ' + i });
    const original = storage.readLibrary(store, source, 'English'), result = storage.replaceSavedBoard(store, source, 'English', original[2], makeBoard());
    expect(result).toHaveLength(4); expect(result[0].title).toBe(makeBoard().title);
    expect(result.slice(1).map(board => board.title)).toEqual(original.filter((_, i) => i !== 2).map(board => board.title));
  });
  it('finds the selected copy after another tab reorders the library', () => {
    const store = memory(), old = makeBoard(), another = { ...old, title: 'Another' };
    storage.saveBoard(store, source, 'English', old); storage.saveBoard(store, source, 'English', another);
    expect(storage.replaceSavedBoard(store, source, 'English', old, { ...old, title: 'Revised' }).map(board => board.title)).toEqual(['Revised', 'Another']);
  });
  it('refuses missing replacement targets and stale removal indices without writing', () => {
    const store = memory(), old = makeBoard(), another = { ...old, title: 'Another' }; storage.saveBoard(store, source, 'English', another);
    const key = storage.libraryKey(source, 'English'), before = store.getItem(key);
    expect(() => storage.replaceSavedBoard(store, source, 'English', old, { ...old, title: 'New' })).toThrow('changed');
    expect(() => storage.removeBoard(store, source, 'English', 0, old)).toThrow('changed'); expect(store.getItem(key)).toBe(before);
  });
  it('does not modify the library for invalid replacement content or corrupt data', () => {
    const store = memory(), old = makeBoard(); storage.saveBoard(store, source, 'English', old);
    const key = storage.libraryKey(source, 'English'), before = store.getItem(key);
    expect(() => storage.replaceSavedBoard(store, source, 'English', old, { ...old, edges: [] })).toThrow(); expect(store.getItem(key)).toBe(before);
    store.setItem(key, 'broken'); expect(() => storage.replaceSavedBoard(store, source, 'English', old, old)).toThrow('kept'); expect(store.getItem(key)).toBe('broken');
  });
  it('describes resumed and unreadable saves without changing them', () => {
    const store = memory(), board = makeBoard(), key = storage.soloStorageKey(board, 'app', 'u'), run = engine.merge(engine.emptyRun(), engine.begin(board, engine.emptyRun(), 'heater'));
    expect(storage.soloStatus(store, board, 'app', 'u')).toBeNull();
    const raw = JSON.stringify({ version: 1, board: JSON.stringify(board), run }); store.setItem(key, raw);
    expect(storage.soloStatus(store, board, 'app', 'u')).toEqual({ status: 'resume', turn: 1, concepts: 0, projects: 0 }); expect(store.getItem(key)).toBe(raw);
    expect(storage.soloStatus(store, board, 'app', 'v')).toBeNull(); store.setItem(key, 'corrupt');
    expect(storage.soloStatus(store, board, 'app', 'u')).toEqual({ status: 'unavailable' }); expect(store.getItem(key)).toBe('corrupt');
  });
});
