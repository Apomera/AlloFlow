import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import * as e from '../lesson_board_engine.js';
const require = createRequire(import.meta.url), { makeBoard, source } = require('../dev-tools/fixtures/lesson_board.cjs');
const cards = [{ id: 'rain-card', title: 'Rain returns', text: 'Rain brings water back down.', sourceQuote: 'Precipitation returns water to the ground.', reward: [2, 0] }, { id: 'lake-card', title: 'Lakes gather', text: 'Rivers and lakes hold water.', sourceQuote: 'Water collects in rivers and lakes.', reward: [0, 2] }];
const lucky = () => e.prepareBoard({ ...makeBoard(), chance: true, discoveries: cards }, source);
const respond = (board, run, value) => e.merge(run, e.processAction(board, run, { attemptId: 'attempt', turn: run.turn, requestId: e.requestId(run, 'answer'), kind: 'answer', targetId: e.stepOf(run).targetId, value }, 'solo', { attemptId: 'attempt', active: true }));
const wrong = node => String((node.answer + 1) % node.options.length);
function play(board, run, id, dice, correct = true) {
  let next = e.merge(run, e.begin(board, run, id));
  const node = board.locations.find(item => item.id === id);
  next = respond(board, next, correct ? e.solution(node) : wrong(node));
  return e.merge(next, e.resolve(board, next, { solo: {} }, { dice }));
}
const advance = (board, run) => e.merge(run, e.advance(board, run));

describe('Fortune dice', () => {
  it('never rolls on boards without fortune dice or after an unsuccessful answer', () => {
    const plain = e.prepareBoard(makeBoard(), source), run = play(plain, e.emptyRun(), 'heater', [20, 20]);
    expect(e.stepOf(run).result.dice).toBeUndefined();
    expect(e.derive(plain, run).fortune).toEqual([0, 0]);
    const board = lucky(), missed = play(board, e.emptyRun(), 'heater', [20, 20], false);
    expect(e.stepOf(missed).result).toEqual({ success: false, marks: { solo: false } });
    expect(e.derive(board, missed).balance).toEqual([0, 0]);
  });
  it('maps every roll to an outcome that only adds resources', () => {
    const board = lucky();
    expect([3, 8, 9, 14].map(roll => e.fortuneOf(board, [roll]).gain)).toEqual([[0, 0], [1, 0], [0, 1], [1, 1]]);
    expect(e.fortuneOf(board, [18], 0)).toMatchObject({ outcome: 'discovery', cardId: 'rain-card', gain: [2, 0] });
    expect(e.fortuneOf(board, [20], 1)).toMatchObject({ outcome: 'jackpot', cardId: 'lake-card', gain: [1, 3] });
    expect(e.fortuneOf(board, [18], 2)).toEqual({ roll: 18, dice: [18], outcome: 'discovery', gain: [1, 1] });
    expect(e.fortuneOf(board, [20], 2).gain).toEqual([2, 2]);
    for (let roll = 1; roll <= 20; roll++) expect(e.fortuneOf(board, [roll]).gain.every(value => value >= 0)).toBe(true);
    for (const dice of [[0], [21], [1.5], [], [1, 2, 3], 'x']) expect(e.fortuneOf(board, dice)).toBeNull();
    expect(e.fortuneOf(e.prepareBoard(makeBoard(), source), [20])).toBeNull();
  });
  it('adds the rolled bonus and draws discovery cards in order', () => {
    const board = lucky();
    let run = play(board, e.emptyRun(), 'heater', [18, 1]);
    expect(e.stepOf(run).result.dice).toEqual([18]);
    let progress = e.derive(board, run);
    expect(progress.balance).toEqual([4, 1]);
    expect(progress.discovered).toEqual(['rain-card']);
    expect(progress.luck).toEqual([{ turn: 0, targetId: 'heater', roll: 18, dice: [18], outcome: 'discovery', gain: [2, 0], cardId: 'rain-card' }]);
    run = play(board, advance(board, run), 'cloud', [20, 1]);
    progress = e.derive(board, run);
    expect(progress.discovered).toEqual(['rain-card', 'lake-card']);
    expect(progress.fortune).toEqual([3, 3]);
    expect(progress.balance).toEqual([4 + 2 + 1, 1 + 1 + 3]);
  });
  it('rewards momentum with a second die and resets it after a retry', () => {
    const board = lucky();
    let run = play(board, e.emptyRun(), 'heater', [5, 20]);
    run = play(board, advance(board, run), 'cloud', [5, 20]);
    run = advance(board, run);
    expect(e.momentum(board, run)).toBe(2);
    expect(e.diceNeeded(board, run)).toBe(2);
    run = play(board, run, 'river', [4, 19]);
    expect(e.stepOf(run).result.dice).toEqual([4, 19]);
    expect(e.derive(board, run).luck.at(-1)).toMatchObject({ roll: 19, outcome: 'discovery' });
    run = play(board, advance(board, run), 'rain', [10, 10], false);
    run = e.merge(run, e.retry(board, run));
    run = respond(board, run, e.solution(board.locations.find(item => item.id === 'rain')));
    run = e.merge(run, e.resolve(board, run, { solo: {} }, { dice: [10, 12] }));
    expect(e.stepOf(run).result.dice).toEqual([10, 12]);
    run = advance(board, run);
    expect(e.momentum(board, run)).toBe(0);
    run = play(board, run, 'lake', [7, 20]);
    expect(e.stepOf(run).result.dice).toEqual([7]);
  });
  it('restores saved rolls and rejects forged ones', () => {
    const board = lucky();
    let run = play(board, e.emptyRun(), 'heater', [18, 1]);
    run = play(board, advance(board, run), 'cloud', [9, 1]);
    const saved = JSON.parse(JSON.stringify(run));
    expect(e.derive(board, e.restoreRun(board, saved))).toEqual(e.derive(board, run));
    const forge = change => { const copy = JSON.parse(JSON.stringify(run)); change(copy.steps.t0.result); return () => e.restoreRun(board, copy); };
    expect(forge(result => { result.dice = [25]; })).toThrow('Invalid saved fortune roll');
    expect(forge(result => { result.dice = [3, 20]; })).toThrow('Invalid saved fortune roll');
    expect(forge(result => { result.dice = '20'; })).toThrow('Invalid saved fortune roll');
    expect(() => e.restoreRun(e.prepareBoard(makeBoard(), source), saved)).toThrow('Invalid saved fortune roll');
    const failed = play(board, e.emptyRun(), 'heater', [5], false); failed.steps.t0.result.dice = [5];
    expect(() => e.restoreRun(board, failed)).toThrow();
  });
  it('rolls fair twenty-sided dice without modulo bias', () => {
    const bytes = [250, 239, 0, 19], random = { getRandomValues: buffer => { buffer[0] = bytes.shift(); return buffer; } };
    expect(e.rollDice(2, random)).toEqual([20, 1]);
    for (const value of e.rollDice(200)) expect(value >= 1 && value <= 20 && Number.isInteger(value)).toBe(true);
    for (const value of e.rollDice(50, null)) expect(value >= 1 && value <= 20).toBe(true);
  });
  it('sums up highlights and badges at the end of a game', () => {
    const board = lucky();
    let run = play(board, e.emptyRun(), 'heater', [20, 1]);
    run = play(board, advance(board, run), 'cloud', [5, 1]);
    run = play(board, advance(board, run), 'river', [18, 1]);
    run = play(board, advance(board, run), 'rain', [9, 9], false);
    run = e.merge(run, e.retry(board, run));
    run = respond(board, run, e.solution(board.locations.find(item => item.id === 'rain')));
    run = e.merge(run, e.resolve(board, run, { solo: {} }, { dice: [3, 2] }));
    expect(e.highlights(board, run)).toEqual({ rolls: 4, best: 20, twenties: 1, fortune: [3, 3], cards: 2, totalCards: 2, bestStreak: 3, comebacks: 1, badges: ['natural20', 'collector', 'momentum', 'persistent', 'lucky'] });
    const plain = e.prepareBoard(makeBoard(), source), quiet = play(plain, e.emptyRun(), 'heater', [20, 20]);
    expect(e.highlights(plain, quiet)).toMatchObject({ rolls: 0, best: 0, bestStreak: 1, badges: [] });
  });
});
