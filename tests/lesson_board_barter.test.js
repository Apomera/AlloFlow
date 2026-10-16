import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import * as engine from '../lesson_board_engine.js';
import { isFieldChoice, isTradeChoice } from '../lesson_board_encounters.js';
import { tradeOptionsFor } from '../lesson_board_barter.js';
import { planningBase, simulatePlan } from '../lesson_board_sandbox.js';
import { saveSolo, readSolo } from '../lesson_board_storage.js';

const { makeBoard } = createRequire(import.meta.url)('../dev-tools/fixtures/lesson_board.cjs');
const copy = value => JSON.parse(JSON.stringify(value));
function board(options = {}) {
  const result = { ...makeBoard(), playStyle: 'tabletop', goal: 'expedition', chance: true, ...options };
  result.edges = result.locations.slice(1).map((node, index) => [result.locations[index].id, node.id]);
  return result;
}
const choose = (b, run, choice) => engine.merge(run, engine.chooseFieldOpportunity(b, run, choice));
const next = (b, run) => engine.merge(run, engine.advance(b, run));
function move(b, run, id, dice = [1, 1]) {
  if (engine.stepOf(run).phase === 'review') run = next(b, run);
  run = engine.merge(run, engine.begin(b, run, id));
  if (engine.stepOf(run).phase !== 'answer') return run;
  const node = b.locations.find(item => item.id === id);
  run = engine.merge(run, engine.processAction(b, run, { attemptId: 'barter-test', turn: run.turn, requestId: engine.requestId(run), kind: 'answer', targetId: id, value: engine.solution(node) }, 'solo', { attemptId: 'barter-test', active: true }));
  return engine.merge(run, engine.resolve(b, run, { solo: {} }, { dice }));
}
const pending = (b, die = 6) => move(b, move(b, engine.emptyRun(), 'heater'), 'cloud', [die, die]);
const storage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; };
function expectInvalid(b, run, choice) {
  expect(() => choose(b, run, choice)).toThrow();
  const forged = copy(run); engine.stepOf(forged).result.fieldChoice = choice;
  expect(engine.derive(b, forged).balance).toEqual(engine.derive(b, run).balance);
  expect(engine.derive(b, forged).fieldEvents).toEqual([]);
  expect(engine.derive(b, forged)).not.toHaveProperty('fieldSpent');
  expect(() => engine.restoreRun(b, forged)).toThrow();
}

describe('Thematic supply exchanges', () => {
  it('recognizes only the two exact encoded directions', () => {
    for (const id of ['trade:0', 'trade:1']) { expect(isTradeChoice(id)).toBe(true); expect(isFieldChoice(id)).toBe(true); }
    for (const id of ['trade', 'trade:', 'trade:2', 'trade:-1', 'trade:01', 'trade:0:1', 'Trade:0', ' trade:0', 0, {}, null]) { expect(isTradeChoice(id)).toBe(false); expect(isFieldChoice(id)).toBe(false); }
  });

  it('offers both directions only for supplies and rendezvous without changing the first-die draw', () => {
    const b = board();
    for (const [die, id] of [[6, 'supplies'], [16, 'rendezvous']]) {
      const run = pending(b, die), progress = engine.derive(b, run), offer = engine.fieldOpportunity(b, run);
      expect(offer).toMatchObject({ id, selectedTrade: null, pending: true });
      expect(offer.trades).toEqual([0, 1].map(give => ({ id: 'trade:' + give, give, take: 1 - give, cost: give ? [0, 1] : [1, 0], gain: give ? [2, 0] : [0, 2], after: progress.balance.map((value, resource) => value + (resource === give ? -1 : 2)), affordable: true, safe: true, legal: true, reason: null })));
      expect(engine.stepOf(run).result.dice).toEqual([die]);
    }
    for (const die of [1, 11]) {
      const run = pending(b, die);
      expect(engine.fieldOpportunity(b, run)).not.toHaveProperty('trades');
      for (const choice of ['trade:0', 'trade:1']) expectInvalid(b, run, choice);
    }
  });

  it.each([0, 1])('spends direction %s once and records received and spent supplies separately', give => {
    const b = board(), waiting = pending(b), before = engine.derive(b, waiting), offer = engine.fieldOpportunity(b, waiting), selected = offer.trades[give];
    const run = choose(b, waiting, selected.id), progress = engine.derive(b, run);
    expect(progress).toMatchObject({ balance: selected.after, fieldGains: selected.gain, fieldSpent: selected.cost, fieldEvents: [{ choice: selected.id, gain: selected.gain, trade: selected }] });
    expect(progress.balance.reduce((sum, value) => sum + value, 0)).toBe(before.balance.reduce((sum, value) => sum + value, 0) + 1);
    expect(progress.fortune).toEqual(before.fortune);
    expect(progress.fieldPreparation).toBeNull(); expect(progress.fieldCrew).toBeNull(); expect(progress.fieldLead).toBeNull();
    expect(engine.tabletopState(b, run).routes).toEqual(engine.tabletopState(b, waiting).routes);
    expect(engine.fieldOpportunity(b, run)).toMatchObject({ pending: false, selectedTrade: selected, trades: offer.trades });
    for (const choice of ['trade:0', 'trade:1', 'collect', 'prepare', 'crew']) expect(() => choose(b, run, choice)).toThrow();
    expect(engine.derive(b, next(b, run))).toEqual(progress);
    expect(engine.derive(b, engine.restoreRun(b, run))).toEqual(progress);
    expect(engine.stepOf(waiting).result.fieldChoice).toBe('pending');
  });

  it('never lets a receipt turn collected supplies into a newly affordable trade', () => {
    const b = board(); b.locations.slice(0, 2).forEach(node => { node.reward = [2, 0]; });
    const waiting = pending(b, 6), before = engine.fieldOpportunity(b, waiting).trades;
    expect(before[1]).toMatchObject({ affordable: false, legal: false, reason: 'insufficient' });
    const collected = choose(b, waiting, 'collect');
    expect(engine.derive(b, collected).balance[1]).toBe(1);
    expect(engine.fieldOpportunity(b, collected).trades).toEqual(before);
    expect(() => choose(b, collected, 'trade:1')).toThrow();
  });

  it('requires an owned token before exchange and rejects forged unaffordable choices', () => {
    const b = board(); b.locations.slice(0, 2).forEach(node => { node.reward = [0, 1]; });
    const waiting = pending(b, 7), progress = engine.derive(b, waiting);
    expect(progress.balance).toEqual([0, 3]);
    expect(engine.fieldOpportunity(b, waiting).trades[0]).toMatchObject({ after: [-1, 5], affordable: false, legal: false, reason: 'insufficient' });
    expectInvalid(b, waiting, 'trade:0');
    expect(engine.fieldOpportunity(b, waiting).trades[1].legal).toBe(true);
  });

  it('spends a contract earned by this investigation consistently in choice, replay and restore', () => {
    const b = board({ contracts: [{ id: 'first-pair', title: 'First pair', description: 'Compare the first two stations.', locations: ['heater', 'cloud'], reward: [1, 0] }] });
    b.locations.slice(0, 2).forEach(node => { node.reward = [0, 1]; });
    const waiting = pending(b, 7), before = engine.derive(b, waiting);
    expect(before).toMatchObject({ balance: [1, 3], completedContracts: ['first-pair'], contractGains: [1, 0] });
    expect(engine.fieldOpportunity(b, waiting).trades[0]).toMatchObject({ legal: true, after: [0, 5] });
    const run = choose(b, waiting, 'trade:0'), progress = engine.derive(b, run);
    expect(progress).toMatchObject({ balance: [0, 5], fieldSpent: [1, 0], fieldGains: [0, 2], contractGains: [1, 0] });
    expect(engine.derive(b, engine.restoreRun(b, run))).toEqual(progress);
  });

  it('keeps a base-funded path to all required construction without counting unearned chance or contracts', () => {
    const b = board({ goal: 'architect', contracts: [{ id: 'future', title: 'Future bonus', description: 'A later investigation pair.', locations: ['cooler', 'weather'], reward: [3, 0] }] });
    b.projects[0].cost = [5, 3]; b.projects[1].cost = [6, 2]; b.projects[2].cost = [5, 3];
    const waiting = pending(b, 7), trades = engine.fieldOpportunity(b, waiting).trades;
    expect(trades[0]).toMatchObject({ affordable: true, safe: false, legal: false, reason: 'completion-reserve' });
    expect(trades[1]).toMatchObject({ affordable: true, safe: true, legal: true });
    expectInvalid(b, waiting, 'trade:0');
    const run = choose(b, waiting, 'trade:1');
    expect(engine.derive(b, engine.restoreRun(b, run))).toEqual(engine.derive(b, run));
  });

  it('reserves an unused bridge after investigations finish, but releases that requirement after project use', () => {
    const b = board(), progress = { visited: b.locations.map(node => node.id), built: ['research', 'network'], balance: [3, 2], bonus: [1, 1], usedProjects: [] };
    expect(tradeOptionsFor(b, progress, 'supplies')[1]).toMatchObject({ affordable: true, safe: false, legal: false, reason: 'completion-reserve' });
    expect(tradeOptionsFor(b, progress, 'supplies')[0].legal).toBe(true);
    expect(tradeOptionsFor(b, { ...progress, usedProjects: ['research'] }, 'supplies')[1].legal).toBe(true);
  });

  it('counts existing workshop yields while keeping future kit and prepared bonuses outside the reserve', () => {
    const b = board({ goal: 'architect' }), progress = { visited: b.locations.slice(0, 2).map(node => node.id), built: [], balance: [4, 3], bonus: [0, 0], usedProjects: [], fieldPreparation: { reward: [9, 9] }, fieldCrew: { reward: [9, 9] }, fieldLead: { reward: [9, 9] } };
    b.projects[0].cost = [5, 3]; b.projects[1].cost = [6, 2]; b.projects[2].cost = [5, 3];
    expect(tradeOptionsFor(b, progress, 'supplies')[0].safe).toBe(false);
    const existingWorkshop = { ...progress, built: ['research'], bonus: [1, 0] };
    expect(tradeOptionsFor(b, existingWorkshop, 'supplies')[0].legal).toBe(true);
  });

  it('does not count a future workshop whose first affordable build comes after the last investigation', () => {
    const b = board({ goal: 'core' });
    b.projects[0].cost = [3, 0]; b.projects[1].cost = [1, 2]; b.projects[2].cost = [1, 2];
    b.locations.at(-1).reward = [2, 2];
    const progress = { visited: b.locations.slice(0, -1).map(node => node.id), built: [], balance: [1, 0], bonus: [0, 0], usedProjects: [] };
    // The final reward could pay for both workshops, but then neither could
    // ever yield and a workshop-plus-bridge route would remain unaffordable.
    expect(tradeOptionsFor(b, progress, 'supplies')[0]).toMatchObject({ after: [0, 2], affordable: true, safe: false, legal: false, reason: 'completion-reserve' });
    // One extra owned token allows a workshop now and leaves its use intact.
    expect(tradeOptionsFor(b, { ...progress, balance: [2, 0] }, 'supplies')[0]).toMatchObject({ after: [1, 2], safe: true, legal: true });
    const unvisitedSites = { ...progress, balance: [2, 0], visited: progress.visited.filter(id => !b.starts.includes(id)) };
    b.locations.slice(0, 2).forEach(node => { node.reward = [0, 1]; });
    expect(tradeOptionsFor(b, unvisitedSites, 'supplies')[0].safe).toBe(false);
  });

  it('rejects malformed persisted exchanges and returns independently derived descriptors', () => {
    const b = board(), waiting = pending(b);
    for (const choice of ['trade:2', 'trade:-1', 'trade:01', 'trade:0:1', 'trade:0 ', { give: 0 }, null]) expectInvalid(b, waiting, choice);
    const offer = engine.fieldOpportunity(b, waiting); offer.trades[0].cost[0] = 900; offer.trades[0].gain[1] = 900; offer.trades[0].after[0] = 900;
    expect(engine.fieldOpportunity(b, waiting).trades[0]).toMatchObject({ cost: [1, 0], gain: [0, 2], after: [4, 4] });
  });

  it('accumulates two trades separately and preserves them through a solo save', () => {
    const b = board(); let run = choose(b, pending(b), 'trade:0');
    for (const id of ['river', 'rain', 'lake']) run = move(b, run, id, [16, 16]);
    run = choose(b, run, 'trade:1');
    expect(engine.derive(b, run)).toMatchObject({ fieldSpent: [1, 1], fieldGains: [2, 2] });
    const store = storage(), saved = saveSolo(store, b, 'barter', 'solo', { run });
    expect(saved.status).toBe('saved');
    const restored = readSolo(store, b, 'barter', 'solo');
    expect(restored.status).toBe('saved');
    expect(engine.derive(b, restored.run)).toEqual(engine.derive(b, run));
  });

  it('carries only committed trades into planning and does not invent later exchanges', () => {
    const b = board(), committed = next(b, choose(b, pending(b), 'trade:0')), initial = engine.derive(b, committed), base = planningBase(committed);
    expect(base.steps.t1.result.fieldChoice).toBe('trade:0');
    expect(engine.derive(b, base)).toMatchObject({ balance: initial.balance, fieldGains: initial.fieldGains, fieldSpent: initial.fieldSpent });
    const plan = simulatePlan(b, committed, ['river', 'rain', 'lake']);
    expect(plan.status).toBe('ready');
    expect(plan.progress.fieldEvents).toHaveLength(1);
    expect(plan.progress.fieldSpent).toEqual([1, 0]);
    expect(plan.progress.balance).toEqual(initial.balance.map((value, i) => value + b.locations.slice(2, 5).reduce((sum, node) => sum + node.reward[i], 0)));
    expect(engine.derive(b, committed)).toEqual(initial);
  });

  it('keeps old saves and chance-free/classic boards free of exchange mechanics', () => {
    const b = board(), old = pending(b); delete engine.stepOf(old).result.fieldChoice;
    expect(engine.derive(b, engine.restoreRun(b, old))).not.toHaveProperty('fieldSpent');
    for (const disabled of [{ ...b, chance: false }, { ...b, playStyle: 'exploration' }]) {
      expect(tradeOptionsFor(disabled, engine.derive(b, old), 'supplies')).toEqual([]);
      const run = pending(disabled);
      expect(engine.fieldOpportunity(disabled, run)).toBeNull();
      expect(() => choose(disabled, run, 'trade:0')).toThrow();
      const forged = copy(run); engine.stepOf(forged).result.fieldChoice = 'trade:0';
      expect(engine.derive(disabled, forged)).not.toHaveProperty('fieldSpent');
      expect(() => engine.restoreRun(disabled, forged)).toThrow();
    }
  });
});
