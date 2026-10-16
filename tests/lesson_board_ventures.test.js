import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import * as engine from '../lesson_board_engine.js';
import { isVentureChoice, isFieldChoice } from '../lesson_board_encounters.js';
import { isVentureEncounter, ventureOptionsFor, ventureOutcome } from '../lesson_board_ventures.js';
import { saveSolo, readSolo } from '../lesson_board_storage.js';

const { makeBoard } = createRequire(import.meta.url)('../dev-tools/fixtures/lesson_board.cjs');
const copy = value => JSON.parse(JSON.stringify(value));
function board(options = {}) {
  const b = { ...makeBoard(), playStyle: 'tabletop', goal: 'expedition', chance: true, ...options };
  b.edges = b.locations.slice(1).map((node, i) => [b.locations[i].id, node.id]);
  return b;
}
const next = (b, run) => engine.merge(run, engine.advance(b, run));
const choose = (b, run, choice) => engine.merge(run, engine.chooseFieldOpportunity(b, run, choice));
function responded(b, run, correct = true) {
  const node = b.locations.find(item => item.id === engine.stepOf(run).targetId);
  const value = correct ? engine.solution(node) : node.kind === 'choice' ? String((node.answer + 1) % node.options.length) : node.kind === 'settings' ? node.controls.map(control => (control.answer + 1) % control.options.length).join(',') : node.order.slice().reverse().join(',');
  return engine.merge(run, engine.processAction(b, run, { attemptId: 'venture', turn: run.turn, requestId: engine.requestId(run), kind: 'answer', targetId: node.id, value }, 'solo', { attemptId: 'venture', active: true }));
}
function answer(b, run, dice = [1, 1], correct = true) {
  run = responded(b, run, correct);
  return engine.merge(run, engine.resolve(b, run, { solo: {} }, { dice }));
}
function move(b, run, id, dice = [1, 1], correct = true) {
  if (engine.stepOf(run).phase === 'review') run = next(b, run);
  run = engine.merge(run, engine.begin(b, run, id));
  return engine.stepOf(run).phase === 'answer' ? answer(b, run, dice, correct) : run;
}
const pending = (b, die = 1) => move(b, move(b, engine.emptyRun(), 'heater'), 'cloud', [die, die]);
const accepted = (b, resource = 0) => choose(b, pending(b), 'venture:' + resource);
const restored = (b, run) => expect(engine.derive(b, engine.restoreRun(b, run))).toEqual(engine.derive(b, run));

describe('Exploration ventures', () => {
  it('offers canonical resource choices only in survey encounters with a future investigation', () => {
    const b = board(), progress = engine.derive(b, pending(b));
    for (const choice of ['venture:0', 'venture:1']) { expect(isVentureChoice(choice)).toBe(true); expect(isFieldChoice(choice)).toBe(true); }
    for (const choice of ['venture:2', 'venture:-1', 'venture:01', 'venture:0 ', {}, null]) { expect(isVentureChoice(choice)).toBe(false); expect(isFieldChoice(choice)).toBe(false); }
    expect(isVentureEncounter('survey')).toBe(true);
    expect(ventureOptionsFor(b, progress, 'survey')).toEqual([{ id: 'venture:0', resource: 0, reward: [4, 0], threshold: 11 }, { id: 'venture:1', resource: 1, reward: [0, 4], threshold: 11 }]);
    for (const family of ['supplies', 'passage', 'rendezvous']) expect(ventureOptionsFor(b, progress, family)).toEqual([]);
    for (const changed of [{ ...b, chance: false }, { ...b, playStyle: 'classic' }]) expect(ventureOptionsFor(changed, progress, 'survey')).toEqual([]);
    expect(ventureOptionsFor(b, { ...progress, complete: true }, 'survey')).toEqual([]);
    expect(ventureOptionsFor(b, { ...progress, visited: b.locations.map(node => node.id) }, 'survey')).toEqual([]);
    const options = ventureOptionsFor(b, progress, 'survey'); options[0].reward[0] = 100;
    expect(ventureOptionsFor(b, progress, 'survey')[0].reward).toEqual([4, 0]);
  });

  it('reserves a future chance without spending, awarding, moving, or rerolling', () => {
    const b = board(), waiting = pending(b), before = engine.derive(b, waiting), card = engine.fieldOpportunity(b, waiting);
    expect(card).toMatchObject({ canVenture: true, canPrepare: true, selectedVenture: null });
    const run = choose(b, waiting, 'venture:1'), progress = engine.derive(b, run);
    expect(progress.fieldVenture).toEqual({ turn: 1, id: 'survey', resource: 1, reward: [0, 4], threshold: 11 });
    for (const key of ['balance', 'fieldGains', 'position', 'fortune', 'fieldDeliveries']) expect(progress[key]).toEqual(before[key]);
    expect(engine.fieldOpportunity(b, run)).toMatchObject({ canVenture: false, pending: false, selectedVenture: card.ventures[1] });
    expect(run.turn).toBe(1); expect(engine.stepOf(run).result.dice).toEqual([1]);
    expect(engine.stepOf(waiting).result.fieldChoice).toBe('pending');
    for (const choice of ['venture:1', 'venture:0', 'prepare']) expect(() => choose(b, run, choice)).toThrow();
    expect(() => next(b, waiting)).toThrow(/opportunity/); restored(b, run);
  });

  it.each([[1, 20, 'empty'], [10, 20, 'empty'], [11, 1, 'found'], [20, 1, 'found']])('resolves first die %s independently of momentum die %s', (first, second, outcome) => {
    const b = board(), selected = accepted(b), run = move(b, selected, 'river', [first, second]), progress = engine.derive(b, run);
    const gain = outcome === 'found' ? [4, 0] : [0, 0];
    expect(progress).not.toHaveProperty('fieldVenture');
    expect(progress.fieldDeliveries.at(-1)).toEqual({ turn: 2, originTurn: 1, kind: 'venture', targetId: 'river', resource: 0, reward: [4, 0], threshold: 11, firstDie: first, outcome, gain });
    const baseline = copy(run); baseline.steps.t1.result.fieldChoice = 'pending';
    expect(progress.balance).toEqual(engine.derive(b, baseline).balance.map((value, i) => value + gain[i]));
    const later = move(b, move(b, run, 'heater'), 'rain', [20, 20]);
    expect(engine.derive(b, later).fieldGains).toEqual(gain);
    expect(engine.derive(b, later).fieldDeliveries.filter(item => item.kind === 'venture')).toHaveLength(1);
    restored(b, run); restored(b, later);
  });

  it('has ten paying faces per resource and cannot override the fixed threshold', () => {
    for (const resource of [0, 1]) {
      const venture = { resource, reward: resource ? [0, 4] : [4, 0], threshold: 1 };
      const results = Array.from({ length: 20 }, (_, index) => ventureOutcome(venture, [index + 1, 20], 2));
      expect(results.filter(result => result.outcome === 'found')).toHaveLength(10);
      expect(results.reduce((sum, result) => sum + result.gain[resource], 0) / 20).toBe(2);
    }
  });

  it('survives travel, construction and failed answers, then resolves a retry once', () => {
    const b = board(); let run = accepted(b, 1); const venture = engine.derive(b, run).fieldVenture;
    run = move(b, move(b, run, 'heater'), 'research');
    expect(engine.derive(b, run).fieldVenture).toEqual(venture);
    run = move(b, run, 'river', [20, 20], false);
    expect(engine.stepOf(run).result.dice).toBeUndefined(); expect(engine.derive(b, run).fieldVenture).toEqual(venture); restored(b, run);
    run = answer(b, engine.merge(run, engine.retry(b, run)), [11, 1]);
    expect(engine.derive(b, run).fieldDeliveries.at(-1)).toMatchObject({ outcome: 'found', firstDie: 11, gain: [0, 4] });
    expect(engine.derive(b, run)).not.toHaveProperty('fieldVenture'); restored(b, run);
  });

  it('requires the future roll for actual successful resolution and solo restore', () => {
    const b = board(), start = next(b, accepted(b));
    const run = responded(b, engine.merge(start, engine.begin(b, start, 'river')));
    for (const dice of [undefined, [], [11], [21, 1], [11, '1']]) expect(() => engine.resolve(b, run, { solo: {} }, { dice })).toThrow(/roll/);
    const success = engine.merge(run, engine.resolve(b, run, { solo: {} }, { dice: [11, 1] }));
    for (const dice of [undefined, [], [11], [21, 1], [11, '1'], [11, 1, 1]]) {
      const altered = copy(success); if (dice === undefined) delete engine.stepOf(altered).result.dice; else engine.stepOf(altered).result.dice = dice;
      expect(() => engine.restoreRun(b, altered)).toThrow(/roll/);
      expect(engine.derive(b, altered).fieldDeliveries.at(-1)).toMatchObject({ outcome: 'unknown', gain: [0, 0] });
      expect(engine.derive(b, altered)).not.toHaveProperty('fieldVenture');
    }
    restored(b, success);
  });

  it('rejects forged or wrong-family reservations and never awards edited result metadata', () => {
    const b = board();
    for (const [run, choices] of [[pending(b), ['venture:2', 'venture:01']], [pending(b, 6), ['venture:0', 'venture:1']]]) for (const choice of choices) {
      expect(() => choose(b, run, choice)).toThrow();
      const altered = copy(run); engine.stepOf(altered).result.fieldChoice = choice;
      expect(engine.derive(b, altered)).not.toHaveProperty('fieldVenture'); expect(() => engine.restoreRun(b, altered)).toThrow();
    }
    const run = move(b, accepted(b), 'river', [1, 20]);
    engine.stepOf(run).result.venture = { outcome: 'found', gain: [999, 999] };
    expect(engine.derive(b, run).fieldGains).toEqual([0, 0]); restored(b, run);
  });

  it('allows a final-turn payout but offers nothing without a future move or investigation', () => {
    const b = board(); let run = choose(b, pending(b), 'collect');
    for (let index = 0; index < engine.MAX_TURNS - 6; index++) run = move(b, run, index % 2 ? 'cloud' : 'heater');
    for (const id of ['river', 'rain', 'lake']) run = move(b, run, id);
    expect(run.turn).toBe(engine.MAX_TURNS - 2); expect(engine.fieldOpportunity(b, run).canVenture).toBe(true);
    run = move(b, choose(b, run, 'venture:0'), 'sequence', [11, 1]);
    expect(run.turn).toBe(engine.MAX_TURNS - 1); expect(engine.derive(b, run).fieldDeliveries.at(-1)).toMatchObject({ outcome: 'found' }); restored(b, run);
    let all = choose(b, pending(b), 'collect');
    for (const node of b.locations.slice(2)) { all = move(b, all, node.id); if (engine.fieldOpportunity(b, all)?.pending && node.id !== b.locations.at(-1).id) all = choose(b, all, 'collect'); }
    expect(engine.fieldOpportunity(b, all)).toMatchObject({ canVenture: false, ventures: [] }); expect(() => choose(b, all, 'venture:0')).toThrow();
  });

  it('round-trips reserved, found and empty states through the solo save envelope', () => {
    const b = board(), values = new Map(), storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
    for (const run of [accepted(b), move(b, accepted(b, 1), 'river', [11, 1]), move(b, accepted(b), 'river', [1, 20])]) {
      values.clear(); expect(saveSolo(storage, b, 'venture', 'solo', { run }).status).toBe('saved');
      expect(engine.derive(b, readSolo(storage, b, 'venture', 'solo').run)).toEqual(engine.derive(b, run));
    }
  });
});
