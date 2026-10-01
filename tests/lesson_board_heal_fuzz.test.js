import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import * as e from '../lesson_board_engine.js';
import * as h from '../lesson_board_heal.js';
const require = createRequire(import.meta.url), { makeBoard, source } = require('../dev-tools/fixtures/lesson_board.cjs');
// Seeded so any failure replays exactly.
const seeded = seed => () => { seed = (Math.imul(seed ^ (seed >>> 15), 2246822507) + 0x6d2b79f5) >>> 0; return seed / 4294967296; };
const board = { ...makeBoard(), chance: true, discoveries: [{ id: 'rain-card', title: 'Rain returns', text: 'Rain brings water back.', sourceQuote: 'Precipitation returns water to the ground.', reward: [1, 1] }] };
const texts = [JSON.stringify(board), JSON.stringify(board, null, 2)];
// A reply is either read into an object or refused with a board-json error; nothing else.
const readOrRefuse = text => { try { return h.readBoardJson(text).value; } catch (error) { expect(error.code).toMatch(/^board-json-/); return null; } };
const healAndCheck = value => {
  const healed = h.healBoard(value, source, { goal: 'expedition', chance: true }), errors = e.validateBoard(healed.board, source);
  expect(Array.isArray(errors)).toBe(true);
  expect(typeof h.editableDraft(healed.board)).toBe('boolean');
  if (!errors.length) expect(() => e.prepareBoard(healed.board, source)).not.toThrow();
  return errors;
};

describe('Self-heal fuzzing', () => {
  it('reads every cut-off prefix without crashing and heals whatever it reads', () => {
    let read = 0;
    for (const text of texts) for (let end = 0; end <= text.length; end += 11) { const value = readOrRefuse(text.slice(0, end)); if (value) { read++; healAndCheck(value); } }
    expect(read).toBeGreaterThan(texts[0].length / 11);
  });
  it('survives random deletions, insertions and swaps', () => {
    const random = seeded(20260928), noise = ['{', '}', '[', ']', '"', "'", ',', ':', '\\', '\n', '\u201c', '/', '*', 'x', '0', ' '];
    let playable = 0;
    for (let round = 0; round < 400; round++) {
      let text = texts[round % 2];
      for (let edits = 1 + Math.floor(random() * 6); edits > 0; edits--) {
        const at = Math.floor(random() * text.length), kind = random();
        text = kind < 0.4 ? text.slice(0, at) + text.slice(at + 1 + Math.floor(random() * 4)) : kind < 0.8 ? text.slice(0, at) + noise[Math.floor(random() * noise.length)] + text.slice(at) : text.slice(0, at) + text.slice(at + 1, at + 2) + text[at] + text.slice(at + 2);
      }
      const value = readOrRefuse(text);
      if (value && !healAndCheck(value).length) playable++;
    }
    // Most light damage should still produce a playable board without any AI call.
    expect(playable).toBeGreaterThan(230);
  });
  it('stays fast on large hostile input', () => {
    const started = Date.now();
    for (const text of ['{'.repeat(5000), '['.repeat(70) + ']'.repeat(70), '"' + 'a'.repeat(150000), '{"a":' + '"x",'.repeat(20000), '/*'.repeat(3000), '{' + '"k":1,'.repeat(20000)]) readOrRefuse(text);
    expect(Date.now() - started).toBeLessThan(5000);
  });
  it('heals any JSON value without throwing', () => {
    for (const value of [null, 1, 'x', [], {}, { locations: 'x' }, { locations: [null, 1, 'x', [], { kind: {} }, { options: [[1], { text: 2 }], answer: {} }] }, { projects: [{ effect: 'path' }, { effect: { targetId: {} } }, { cost: 'lots' }], edges: [1, 'a-b', { from: 1 }], concepts: [{ id: 5 }, null], resources: [{}, 3], discoveries: 'many', starts: {} }]) expect(() => h.healBoard(value, source)).not.toThrow();
  });
});
