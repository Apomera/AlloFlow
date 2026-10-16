import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import * as engine from '../lesson_board_engine.js';
import { isCommissionChoice, isFieldChoice } from '../lesson_board_encounters.js';
import { commissionOptionsFor } from '../lesson_board_commissions.js';
import { planningBase, simulatePlan } from '../lesson_board_sandbox.js';
import { saveSolo, readSolo } from '../lesson_board_storage.js';

const { makeBoard } = createRequire(import.meta.url)('../dev-tools/fixtures/lesson_board.cjs');
const copy = value => JSON.parse(JSON.stringify(value));
function board(options = {}) {
  const result = { ...makeBoard(), playStyle: 'tabletop', goal: 'expedition', chance: true, ...options };
  result.edges = result.locations.slice(1).map((node, index) => [result.locations[index].id, node.id]);
  return result;
}
const next = (b, run) => engine.merge(run, engine.advance(b, run));
const choose = (b, run, choice) => engine.merge(run, engine.chooseFieldOpportunity(b, run, choice));
function answer(b, run, correct = true, dice = [1, 1]) {
  const node = b.locations.find(item => item.id === engine.stepOf(run).targetId);
  const value = correct ? engine.solution(node) : node.kind === 'choice' ? String((node.answer + 1) % node.options.length) : node.kind === 'settings' ? node.controls.map(control => (control.answer + 1) % control.options.length).join(',') : node.order.slice().reverse().join(',');
  run = engine.merge(run, engine.processAction(b, run, { attemptId: 'commission-test', turn: run.turn, requestId: engine.requestId(run), kind: 'answer', targetId: node.id, value }, 'solo', { attemptId: 'commission-test', active: true }));
  return engine.merge(run, engine.resolve(b, run, { solo: {} }, { dice }));
}
function move(b, run, id, { dice = [1, 1], correct = true, funding } = {}) {
  if (engine.stepOf(run).phase === 'review') run = next(b, run);
  run = engine.merge(run, engine.begin(b, run, id, funding));
  return engine.stepOf(run).phase === 'answer' ? answer(b, run, correct, dice) : run;
}
const pending = (b, die = 6) => move(b, move(b, engine.emptyRun(), 'heater'), 'cloud', { dice: [die, die] });
const storage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; };
function expectRestored(b, run) {
  const restored = engine.restoreRun(b, run);
  expect(engine.derive(b, restored)).toEqual(engine.derive(b, run));
  expect(restored.turn).toBe(run.turn);
  return restored;
}

describe('Named construction commissions', () => {
  it('recognizes only safe named project choices', () => {
    for (const id of ['commission:research', 'commission:field-lab', 'commission:a_2']) {
      expect(isCommissionChoice(id)).toBe(true); expect(isFieldChoice(id)).toBe(true);
    }
    for (const id of ['commission', 'commission:', 'commission:constructor', 'commission:prototype', 'commission:__proto__', 'commission:a.b', 'commission:a/b', 'commission:Research', ' commission:research', 'commission:' + 'a'.repeat(41), 0, {}, null]) {
      expect(isCommissionChoice(id)).toBe(false); expect(isFieldChoice(id)).toBe(false);
    }
  });

  it('offers two distinct unbuilt projects in canonical saved-die order only for supplies and rendezvous', () => {
    const b = board();
    for (const die of [6, 7, 8, 9, 10, 16, 17, 18, 19, 20]) {
      const run = pending(b, die), progress = engine.derive(b, run), card = engine.fieldOpportunity(b, run);
      const expected = commissionOptionsFor(b, progress, [die]);
      expect(card).toMatchObject({ canCommission: true, selectedCommission: null, commissions: expected });
      expect(expected).toHaveLength(2); expect(new Set(expected.map(item => item.projectId)).size).toBe(2);
      expect(expected.map(item => item.reward)).toEqual([[3, 1], [1, 3]]);
      expect(commissionOptionsFor({ ...b, projects: b.projects.slice().reverse() }, progress, [die, 20])).toEqual(expected);
      expected[0].reward[0] = 100;
      expect(commissionOptionsFor(b, progress, [die])[0].reward).toEqual([3, 1]);
    }
    for (const die of [1, 11]) expect(engine.fieldOpportunity(b, pending(b, die))).not.toHaveProperty('commissions');
    const progress = { visited: ['heater', 'cloud'], built: ['research', 'bridge'] };
    expect(commissionOptionsFor(b, progress, [6])).toEqual([{ projectId: 'network', reward: [3, 1] }]);
    expect(commissionOptionsFor(b, { ...progress, built: b.projects.map(project => project.id) }, [6])).toEqual([]);
    for (const invalid of [[], [0], [21], ['6'], [6, 6, 6]]) expect(commissionOptionsFor(b, progress, invalid)).toEqual([]);
  });

  it('accepts only an offered project without changing supplies, fortune, position, turn, or other plans', () => {
    const b = board(), waiting = pending(b), before = engine.derive(b, waiting), offers = engine.fieldOpportunity(b, waiting).commissions;
    const run = choose(b, waiting, 'commission:research'), progress = engine.derive(b, run);
    expect(progress.fieldCommission).toEqual({ turn: 1, id: 'supplies', projectId: 'research', reward: [3, 1] });
    for (const key of ['balance', 'fortune', 'position', 'fieldCrew', 'fieldPreparation', 'fieldLead']) expect(progress[key]).toEqual(before[key]);
    expect(progress.fieldGains).toEqual([0, 0]); expect(progress.fieldDeliveries).toEqual([]); expect(run.turn).toBe(waiting.turn);
    expect(engine.fieldOpportunity(b, run)).toMatchObject({ canCommission: false, pending: false, commissions: offers, selectedCommission: { projectId: 'research', reward: [3, 1] } });
    expect(engine.stepOf(waiting).result.fieldChoice).toBe('pending'); expectRestored(b, run);
    for (const value of ['commission:research', 'collect', 'crew']) expect(() => choose(b, run, value)).toThrow();
  });

  it('rejects off-offer, unknown, wrong-family, already-built, and forged commission choices', () => {
    const b = board();
    for (const [run, choices] of [[pending(b), ['commission:network', 'commission:missing', 'commission:heater']], [pending(b, 1), ['commission:research']], [pending(b, 11), ['commission:research']]]) {
      for (const choice of choices) {
        expect(() => choose(b, run, choice)).toThrow();
        const forged = copy(run); engine.stepOf(forged).result.fieldChoice = choice;
        expect(engine.derive(b, forged)).not.toHaveProperty('fieldCommission');
        expect(engine.derive(b, forged).balance).toEqual(engine.derive(b, run).balance);
        expect(() => engine.restoreRun(b, forged)).toThrow();
      }
    }
    let built = choose(b, pending(b), 'collect'); built = move(b, move(b, built, 'heater'), 'research');
    for (const id of ['river', 'rain', 'lake']) built = move(b, built, id, { dice: [6, 6] });
    expect(engine.fieldOpportunity(b, built).commissions.every(item => item.projectId !== 'research')).toBe(true);
    expect(() => choose(b, built, 'commission:research')).toThrow();
  });

  it('keeps the named commission through another build, travel, failed investigation, and retry, then pays once', () => {
    const b = board(); let run = choose(b, pending(b), 'commission:research');
    run = move(b, run, 'network', { funding: 'research' });
    expect(engine.derive(b, run).fieldCommission?.projectId).toBe('research');
    run = move(b, run, 'river', { correct: false });
    expect(engine.derive(b, run).fieldCommission?.projectId).toBe('research');
    run = answer(b, engine.merge(run, engine.retry(b, run)));
    run = move(b, run, 'heater');
    const before = engine.derive(b, run), paid = move(b, run, 'research'), progress = engine.derive(b, paid);
    expect(progress.balance).toEqual(before.balance.map((value, i) => value - b.projects.find(project => project.id === 'research').cost[i] + [3, 1][i]));
    expect(progress).not.toHaveProperty('fieldCommission');
    expect(progress.fieldDeliveries).toEqual([{ turn: paid.turn, originTurn: 1, gain: [3, 1], kind: 'commission', projectId: 'research' }]);
    expect(progress.fieldGains).toEqual([3, 1]); expectRestored(b, paid);
    run = move(b, paid, 'cloud'); expect(engine.derive(b, run).fieldGains).toEqual([3, 1]);
    expect(() => engine.begin(b, next(b, run), 'research')).toThrow();
  });

  it('stacks an existing crew and Builder kit with the commission after paying the full matching cost', () => {
    const b = board({ expeditionKit: 'builder' }); let run = choose(b, pending(b), 'commission:research');
    for (const id of ['river', 'rain', 'lake']) run = move(b, run, id);
    run = choose(b, run, 'crew'); run = move(b, run, 'heater');
    const before = engine.derive(b, run); run = move(b, run, 'research'); const after = engine.derive(b, run);
    expect(after.balance).toEqual(before.balance.map((value, i) => value - [3, 1][i] + [3, 1][i] + [1, 1][i] + [0, 2][i]));
    expect(after.fieldDeliveries.filter(item => item.turn === run.turn).map(item => item.kind)).toEqual(['construction', 'commission']);
    expect(after.fieldGains).toEqual([4, 2]); expect(after.kitGains).toEqual([0, 2]); expect(after.fieldCrew).toBeNull();
    expect(after).not.toHaveProperty('fieldCommission'); expectRestored(b, run);
  });

  it('allows a commission while a crew is already reserved, but never replaces a prior commission', () => {
    const b = board(); let run = choose(b, pending(b, 1), 'crew');
    for (const id of ['river', 'rain', 'lake']) run = move(b, run, id, { dice: [6, 6] });
    expect(engine.fieldOpportunity(b, run)).toMatchObject({ canCrew: false, canCommission: true });
    run = choose(b, run, 'commission:research'); expect(engine.derive(b, run)).toMatchObject({ fieldCrew: { turn: 1 }, fieldCommission: { turn: 4, projectId: 'research' } });
    for (const id of ['sequence', 'cooler', 'weather']) run = move(b, run, id, { dice: [6, 6] });
    expect(engine.fieldOpportunity(b, run).canCommission).toBe(false);
    expect(() => choose(b, run, 'commission:bridge')).toThrow();
    const forged = copy(run); engine.stepOf(forged).result.fieldChoice = 'commission:bridge';
    expect(engine.derive(b, forged).fieldCommission).toMatchObject({ turn: 4, projectId: 'research' });
    expect(() => engine.restoreRun(b, forged)).toThrow(); expectRestored(b, choose(b, run, 'collect'));
  });

  it('never borrows the commission or crew reward to fund the upfront payment', () => {
    const b = board(); b.projects.find(project => project.id === 'research').cost = [6, 3];
    const run = next(b, move(b, choose(b, pending(b), 'commission:research'), 'heater'));
    expect(engine.derive(b, run).balance).toEqual([5, 2]);
    expect(engine.constructionFunding(b, run, 'research').every(option => !option.affordable && !option.legal)).toBe(true);
    expect(() => engine.begin(b, run, 'research')).toThrow();
    const forged = engine.merge(run, { ['steps.t' + run.turn]: { phase: 'review', targetId: 'research', result: { success: true, marks: {} } } });
    expect(engine.derive(b, forged)).toMatchObject({ built: [], balance: [5, 2], fieldCommission: { projectId: 'research' }, fieldGains: [0, 0] });
    expect(() => engine.restoreRun(b, forged)).toThrow();
  });

  it('counts a confirmed commission in the exchange reserve only for its named build', () => {
    const b = board({ goal: 'architect' });
    b.projects.find(project => project.id === 'bridge').cost = [4, 1];
    b.projects.find(project => project.id === 'research').cost = [6, 4];
    b.projects.find(project => project.id === 'network').cost = [6, 4];
    const waiting = pending(b, 7), ready = base => next(b, move(b, move(b, base, 'river'), 'heater'));
    const named = ready(choose(b, waiting, 'commission:bridge'));
    const other = ready(choose(b, waiting, 'commission:network'));
    expect(engine.constructionFunding(b, named, 'bridge').find(option => option.id === 'research')).toMatchObject({ cost: [6, 0], affordable: true, safe: true, legal: true });
    expect(engine.constructionFunding(b, other, 'bridge').find(option => option.id === 'research')).toMatchObject({ affordable: true, safe: false, legal: false, reason: 'completion-reserve' });
    const run = engine.merge(named, engine.begin(b, named, 'bridge', 'research'));
    expect(engine.derive(b, run).balance).toEqual([3, 5]); expectRestored(b, run);
  });

  it('preserves the exact commission through solo storage and future successful projections without inventing offers', () => {
    const b = board(), store = storage(), accepted = choose(b, pending(b), 'commission:research');
    const saved = saveSolo(store, b, 'commission', 'solo', { run: accepted }); expect(saved.status).toBe('saved');
    const restored = readSolo(store, b, 'commission', 'solo').run; expectRestored(b, restored);
    expect(planningBase(restored).steps.t1.result.fieldChoice).toBe('commission:research');
    const base = next(b, restored), snapshot = JSON.stringify(base), plan = simulatePlan(b, base, ['heater', { id: 'research', funding: 'standard' }]);
    expect(plan.steps).toHaveLength(2); expect(plan.progress.fieldGains).toEqual([3, 1]);
    expect(plan.progress.fieldDeliveries).toEqual([{ turn: base.turn + 1, originTurn: 1, gain: [3, 1], kind: 'commission', projectId: 'research' }]);
    expect(plan.progress.fieldEvents).toHaveLength(1); expect(JSON.stringify(base)).toBe(snapshot);
    let actual = move(b, restored, 'heater'); actual = move(b, actual, 'research');
    expect(plan.progress.balance).toEqual(engine.derive(b, actual).balance);
    expect(saveSolo(store, b, 'commission', 'solo', { run: actual, expectedRevision: saved.revision }).status).toBe('saved');
    expect(engine.derive(b, readSolo(store, b, 'commission', 'solo').run)).toEqual(engine.derive(b, actual));
  });

  it('leaves an unfulfilled commission optional when the party completes its mission', () => {
    const b = board({ goal: 'core' }); let run = choose(b, pending(b), 'commission:research');
    for (const id of ['river', 'rain', 'lake']) run = move(b, run, id);
    run = choose(b, run, 'collect');
    for (const id of ['heater', 'bridge', 'cloud', 'network', 'sequence', 'heater']) run = move(b, run, id);
    expect(engine.derive(b, run)).toMatchObject({ complete: true, fieldCommission: { projectId: 'research' } });
    expect(engine.derive(b, run).fieldDeliveries.some(item => item.kind === 'commission')).toBe(false); expectRestored(b, run);
  });

  it('keeps legacy choices and chance-free boards unchanged', () => {
    const b = board();
    for (const choice of ['collect', 'prepare', 'crew', 'trade:0']) {
      const run = choose(b, pending(b), choice); expectRestored(b, run); expect(engine.derive(b, run)).not.toHaveProperty('fieldCommission');
    }
    const old = pending(b); delete engine.stepOf(old).result.fieldChoice;
    expect(engine.stepOf(expectRestored(b, old)).result).not.toHaveProperty('fieldChoice');
    for (const options of [{ chance: false }, { playStyle: 'exploration' }]) {
      const disabled = board(options), run = pending(disabled);
      expect(engine.derive(disabled, run)).not.toHaveProperty('fieldCommission');
      expect(commissionOptionsFor(disabled, { visited: ['heater', 'cloud'], built: [] }, [6])).toEqual([]);
      expect(() => choose(disabled, run, 'commission:research')).toThrow();
    }
  });
});
