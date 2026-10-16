import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import * as engine from '../lesson_board_engine.js';
import { encounterFor } from '../lesson_board_encounters.js';
import { planningBase, simulatePlan } from '../lesson_board_sandbox.js';
import { saveSolo, readSolo } from '../lesson_board_storage.js';

const { makeBoard } = createRequire(import.meta.url)('../dev-tools/fixtures/lesson_board.cjs');
function board(options = {}) {
  const result = { ...makeBoard(), playStyle: 'tabletop', goal: 'expedition', chance: true, ...options };
  result.edges = result.locations.slice(1).map((node, index) => [result.locations[index].id, node.id]);
  return result;
}
const copy = value => JSON.parse(JSON.stringify(value));
const next = (b, run) => engine.merge(run, engine.advance(b, run));
const choose = (b, run, choice) => engine.merge(run, engine.chooseFieldOpportunity(b, run, choice));
function answer(b, run, correct = true, dice = [1, 1]) {
  const node = b.locations.find(item => item.id === engine.stepOf(run).targetId);
  const value = correct ? engine.solution(node) : node.kind === 'choice' ? String((node.answer + 1) % node.options.length) : node.kind === 'settings' ? node.controls.map(control => (control.answer + 1) % control.options.length).join(',') : node.order.slice().reverse().join(',');
  const action = { attemptId: 'field-test', turn: run.turn, requestId: engine.requestId(run), kind: 'answer', targetId: node.id, value };
  const responded = engine.merge(run, engine.processAction(b, run, action, 'solo', { attemptId: 'field-test', active: true }));
  return engine.merge(responded, engine.resolve(b, responded, { solo: {} }, { dice }));
}
function move(b, run, id, options = {}) {
  if (engine.stepOf(run).phase === 'review') run = next(b, run);
  run = engine.merge(run, engine.begin(b, run, id));
  return engine.stepOf(run).phase === 'answer' ? answer(b, run, options.correct !== false, options.noDice ? [] : options.dice || [1, 1]) : run;
}
function clear(b, count, options = {}) {
  let run = engine.emptyRun();
  for (const node of b.locations.slice(0, count)) {
    run = move(b, run, node.id, options);
    if (engine.fieldOpportunity(b, run)?.pending && options.choice) run = choose(b, run, options.choice);
  }
  return run;
}
function expectRestored(b, run) {
  const restored = engine.restoreRun(b, run);
  expect(engine.derive(b, restored)).toEqual(engine.derive(b, run));
  expect(restored.turn).toBe(run.turn);
  for (let turn = 0; turn <= run.turn; turn++) expect(restored.steps['t' + turn].result).toEqual(run.steps['t' + turn].result);
  return restored;
}
const storage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; };

describe('Thematic field opportunities', () => {
  it('maps the first die into four equal five-face groups without a momentum bias', () => {
    const b = board(), counts = {};
    for (let die = 1; die <= 20; die++) {
      const event = encounterFor(b, [die, 20], 2);
      counts[event.id] = (counts[event.id] || 0) + 1;
      expect(encounterFor(b, [die], 2)).toEqual(event);
    }
    expect(counts).toEqual({ survey: 5, supplies: 5, passage: 5, rendezvous: 5 });
    expect(encounterFor(b, [1], 2)).toEqual({ id: 'survey', immediate: [1, 0], prepared: [2, 0] });
    expect(encounterFor(b, [6], 5)).toEqual({ id: 'supplies', immediate: [0, 1], prepared: [0, 2] });
    expect(encounterFor(b, [11], 8)).toEqual({ id: 'passage', immediate: [1, 0], prepared: [0, 2] });
    expect(encounterFor(b, [16], 8)).toEqual({ id: 'rendezvous', immediate: [0, 1], prepared: [2, 0] });
    const event = encounterFor(b, [1], 2); event.immediate[0] = 100;
    expect(encounterFor(b, [1], 2).immediate).toEqual([1, 0]);
  });

  it('only offers on tabletop chance boards at successful exploration counts 2, 5, and 8', () => {
    const b = board();
    for (const count of [0, 1, 3, 4, 6, 7, 9, 10, 11, 14, 2.5]) expect(encounterFor(b, [20], count)).toBeNull();
    for (const dice of [undefined, [], [0], [21], [2.5], ['2'], [1, 2, 3]]) expect(encounterFor(b, dice, 2)).toBeNull();
    expect(encounterFor(board({ chance: false }), [20], 2)).toBeNull();
    expect(encounterFor(board({ playStyle: 'exploration' }), [20], 2)).toBeNull();
    const run = clear(b, 8, { choice: 'collect' });
    expect(engine.derive(b, run).fieldEvents.map(event => event.turn)).toEqual([1, 4, 7]);
    expect(engine.derive(b, run).fieldGains).toEqual([3, 0]);
    expectRestored(b, run);
  });

  it('requires an explicit choice and awards the selected immediate grant once', () => {
    const b = board(), pending = clear(b, 2), before = engine.derive(b, pending);
    expect(engine.fieldOpportunity(b, pending)).toMatchObject({ id: 'survey', immediate: [1, 0], prepared: [2, 0], crew: [1, 1], choice: 'pending', pending: true, canPrepare: true, canCrew: true, canLead: true, selectedLead: null, turn: 1 });
    expect(before.fieldEvents).toEqual([{ turn: 1, targetId: 'cloud', id: 'survey', choice: 'pending', gain: [0, 0] }]);
    expect(before.balance).toEqual([4, 2]);
    expect(engine.turnLimit(b, pending).canAdvance).toBe(false);
    expect(() => engine.advance(b, pending)).toThrow(/field opportunity/i);
    for (const invalid of ['', 'reroll', 'pending', null]) expect(() => engine.chooseFieldOpportunity(b, pending, invalid)).toThrow();
    const collected = choose(b, pending, 'collect'), progress = engine.derive(b, collected);
    expect(progress.balance).toEqual([5, 2]);
    expect(progress.fieldGains).toEqual([1, 0]);
    expect(progress.fortune).toEqual([0, 0]);
    expect(engine.turnLimit(b, collected).canAdvance).toBe(true);
    expect(engine.fieldOpportunity(b, collected)).toMatchObject({ pending: false, choice: 'collect' });
    for (const value of ['collect', 'prepare']) expect(() => engine.chooseFieldOpportunity(b, collected, value)).toThrow();
    const advanced = next(b, collected);
    expect(engine.fieldOpportunity(b, advanced)).toBeNull();
    expect(() => engine.chooseFieldOpportunity(b, advanced, 'collect')).toThrow();
    expect(engine.derive(b, advanced).balance).toEqual(progress.balance);
    expect(engine.stepOf(pending).result.fieldChoice).toBe('pending');
  });

  it('keeps prepared supplies through travel, construction, and failed attempts, then grants once on success', () => {
    const b = board(), prepared = choose(b, clear(b, 2), 'prepare');
    expect(engine.derive(b, prepared)).toMatchObject({ balance: [4, 2], fieldPreparation: { turn: 1, id: 'survey', reward: [2, 0] }, fieldGains: [0, 0] });
    let run = move(b, prepared, 'heater');
    expect(engine.derive(b, run).fieldPreparation).not.toBeNull();
    run = move(b, run, 'research');
    expect(engine.derive(b, run)).toMatchObject({ balance: [1, 1], fieldPreparation: { turn: 1 }, fieldDeliveries: [] });
    run = move(b, run, 'river', { correct: false });
    expect(engine.stepOf(run).result.fieldChoice).toBeUndefined();
    expect(engine.derive(b, run).fieldPreparation).not.toBeNull();
    run = engine.merge(run, engine.retry(b, run));
    run = answer(b, run);
    expect(engine.derive(b, run)).toMatchObject({ balance: [6, 2], fieldPreparation: null, fieldGains: [2, 0], fieldDeliveries: [{ turn: 4, originTurn: 1, gain: [2, 0] }] });
    expect(engine.fieldOpportunity(b, run)).toBeNull();
    expectRestored(b, run);
    run = move(b, run, 'heater');
    expect(engine.derive(b, run).fieldGains).toEqual([2, 0]);
    expect(engine.derive(b, run).fieldEvents).toHaveLength(1);
  });

  it('creates an opportunity when an eligible investigation succeeds after a retry', () => {
    const b = board();
    let run = move(b, clear(b, 1), 'cloud', { correct: false, dice: [20, 20] });
    expect(engine.fieldOpportunity(b, run)).toBeNull();
    run = answer(b, engine.merge(run, engine.retry(b, run)), true, [16, 16]);
    expect(engine.fieldOpportunity(b, run)).toMatchObject({ id: 'rendezvous', pending: true });
    expectRestored(b, run);
  });

  it('keeps a crew through travel and investigations, then reimburses one paid construction exactly once', () => {
    const b = board(), pending = clear(b, 2), reserved = choose(b, pending, 'crew');
    expect(engine.derive(b, reserved)).toMatchObject({ balance: [4, 2], fieldCrew: { turn: 1, id: 'survey', reward: [1, 1] }, fieldGains: [0, 0], fieldDeliveries: [] });
    expect(engine.fieldOpportunity(b, reserved)).toMatchObject({ choice: 'crew', pending: false, canCrew: false });
    expect(() => choose(b, reserved, 'crew')).toThrow();
    let run = move(b, reserved, 'heater');
    run = move(b, run, 'river', { correct: false });
    expect(engine.derive(b, run).fieldCrew).toEqual({ turn: 1, id: 'survey', reward: [1, 1] });
    run = answer(b, engine.merge(run, engine.retry(b, run)));
    expect(engine.derive(b, run)).toMatchObject({ balance: [6, 3], fieldCrew: { turn: 1 }, fieldGains: [0, 0], fieldDeliveries: [] });
    run = move(b, move(b, run, 'heater'), 'research');
    expect(engine.derive(b, run)).toMatchObject({ balance: [4, 3], built: ['research'], fieldCrew: null, fieldGains: [1, 1], fieldDeliveries: [{ turn: 5, originTurn: 1, gain: [1, 1], kind: 'construction', projectId: 'research' }] });
    expectRestored(b, run);
    const advanced = next(b, run), forged = engine.merge(advanced, { ['steps.t' + advanced.turn]: copy(engine.stepOf(run)) });
    expect(engine.derive(b, forged)).toEqual(engine.derive(b, run));
    expect(() => engine.restoreRun(b, forged)).toThrow();
    expect(() => choose(b, advanced, 'crew')).toThrow();
  });

  it('preserves a reserved crew through solo storage and pays the actual exchanged cost before reimbursement', () => {
    const b = board(), store = storage(), reserved = choose(b, clear(b, 2), 'crew');
    const saved = saveSolo(store, b, 'crew', 'solo', { run: reserved });
    expect(saved.status).toBe('saved');
    const restored = readSolo(store, b, 'crew', 'solo').run;
    expect(engine.derive(b, restored).fieldCrew).toEqual({ turn: 1, id: 'survey', reward: [1, 1] });
    const run = next(b, restored);
    expect(engine.constructionFunding(b, run, 'network').find(option => option.id === 'research')).toMatchObject({ cost: [3, 2], legal: true });
    const built = engine.merge(run, engine.begin(b, run, 'network', 'research'));
    expect(engine.derive(b, built)).toMatchObject({ balance: [2, 1], built: ['network'], fieldCrew: null, fieldGains: [1, 1] });
    expectRestored(b, built);
    expect(saveSolo(store, b, 'crew', 'solo', { run: built, expectedRevision: saved.revision }).status).toBe('saved');
    expect(engine.derive(b, readSolo(store, b, 'crew', 'solo').run)).toEqual(engine.derive(b, built));
  });

  it('never spends a future crew reimbursement to make the upfront payment affordable', () => {
    const b = board();
    b.locations.find(node => node.id === 'cloud').reward = [0, 1];
    const run = next(b, choose(b, clear(b, 2), 'crew'));
    expect(engine.derive(b, run).balance).toEqual([2, 2]);
    expect(engine.constructionFunding(b, run, 'network').every(option => !option.affordable && !option.legal)).toBe(true);
    expect(() => engine.begin(b, run, 'network', 'research')).toThrow();
    const forged = engine.merge(run, { ['steps.t' + run.turn]: { phase: 'review', targetId: 'network', funding: 'research', result: { success: true, marks: {} } } });
    expect(engine.derive(b, forged)).toMatchObject({ balance: [2, 2], built: [], fieldCrew: { turn: 1 }, fieldGains: [0, 0], fieldDeliveries: [] });
    expect(() => engine.restoreRun(b, forged)).toThrow();
  });

  it('rejects duplicate crew reservations without replacing or granting the existing one', () => {
    const b = board();
    let run = choose(b, clear(b, 2), 'crew');
    for (const id of ['river', 'rain', 'lake']) run = move(b, run, id);
    expect(engine.fieldOpportunity(b, run)).toMatchObject({ pending: true, canCrew: false, canPrepare: true });
    expect(() => choose(b, run, 'crew')).toThrow();
    const forged = copy(run); engine.stepOf(forged).result.fieldChoice = 'crew';
    expect(engine.derive(b, forged)).toMatchObject({ fieldCrew: { turn: 1 }, fieldEvents: [{ turn: 1, choice: 'crew' }], fieldGains: [0, 0] });
    expect(() => engine.restoreRun(b, forged)).toThrow();
    run = choose(b, run, 'prepare');
    expect(engine.derive(b, run)).toMatchObject({ fieldCrew: { turn: 1 }, fieldPreparation: { turn: 4 }, fieldGains: [0, 0] });
    run = move(b, run, 'sequence');
    expect(engine.derive(b, run)).toMatchObject({ fieldCrew: { turn: 1 }, fieldPreparation: null, fieldGains: [2, 0], fieldDeliveries: [{ turn: 5, originTurn: 4, gain: [2, 0] }] });
    expectRestored(b, run);
  });

  it('does not reserve a crew when every project is already built', () => {
    const b = board(); b.projects.forEach(project => { project.cost = [0, 0]; });
    let run = choose(b, clear(b, 2), 'collect');
    for (const id of ['heater', 'research', 'bridge', 'cloud', 'network', 'river', 'rain', 'lake']) run = move(b, run, id);
    expect(engine.derive(b, run).built).toHaveLength(3);
    expect(engine.fieldOpportunity(b, run)).toMatchObject({ pending: true, canCrew: false });
    expect(() => choose(b, run, 'crew')).toThrow();
    const forged = copy(run); engine.stepOf(forged).result.fieldChoice = 'crew';
    expect(engine.derive(b, forged)).toMatchObject({ fieldCrew: null, fieldGains: [1, 0] });
    expect(() => engine.restoreRun(b, forged)).toThrow();
  });

  it('includes a confirmed crew reimbursement in completion reserves without guessing future chance', () => {
    const b = board({ goal: 'architect' });
    b.projects.find(project => project.id === 'bridge').cost = [4, 1];
    b.projects.find(project => project.id === 'research').cost = [5, 3];
    b.projects.find(project => project.id === 'network').cost = [6, 4];
    const pending = clear(b, 2);
    const ready = run => next(b, move(b, move(b, run, 'river'), 'heater'));
    const reserved = ready(choose(b, pending, 'crew')), legacy = copy(pending);
    delete engine.stepOf(legacy).result.fieldChoice;
    const unreserved = ready(legacy);
    expect(engine.constructionFunding(b, reserved, 'bridge').find(option => option.id === 'research')).toMatchObject({ cost: [6, 0], affordable: true, safe: true, legal: true });
    expect(engine.derive(b, unreserved).balance).toEqual([6, 3]);
    expect(engine.constructionFunding(b, unreserved, 'bridge').find(option => option.id === 'research')).toMatchObject({ affordable: true, safe: false, legal: false, reason: 'completion-reserve' });
    const built = engine.merge(reserved, engine.begin(b, reserved, 'bridge', 'research'));
    expect(engine.derive(b, built)).toMatchObject({ balance: [1, 4], built: ['bridge'], fieldCrew: null, fieldGains: [1, 1] });
    expectRestored(b, built);
  });

  it('projects a confirmed crew reimbursement without inventing additional encounters', () => {
    const b = board(), base = next(b, choose(b, clear(b, 2), 'crew'));
    const plan = simulatePlan(b, base, [{ id: 'network', funding: 'research' }, 'river']);
    expect(plan.status).toBe('ready');
    expect(plan.steps[0]).toMatchObject({ kind: 'build', payment: [3, 2], change: [-2, -1], balance: [2, 1] });
    expect(plan.progress).toMatchObject({ fieldCrew: null, fieldGains: [1, 1], fieldEvents: [{ turn: 1, choice: 'crew' }], fieldDeliveries: [{ turn: 2, originTurn: 1, gain: [1, 1], kind: 'construction', projectId: 'network' }] });
    expect(engine.derive(b, base)).toMatchObject({ fieldCrew: { turn: 1 }, fieldGains: [0, 0] });
  });

  it.each(['collect', 'prepare', 'crew'])('preserves a later %s encounter in forecasts after a retried investigation', choice => {
    const b = board();
    let run = choose(b, clear(b, 2), 'collect');
    run = move(b, run, 'river', { correct: false });
    run = answer(b, engine.merge(run, engine.retry(b, run)));
    run = move(b, move(b, run, 'rain'), 'lake');
    expect(engine.stepOf(run).result.dice).toEqual([1]);
    run = next(b, choose(b, run, choice));
    const initial = engine.derive(b, run), stripped = planningBase(run);
    expect(stripped.steps.t2.retryRound).toBe(1);
    expect(stripped.steps.t2.result.marks).toEqual({});
    for (const key of ['answers', 'responseRounds', 'retryStats']) expect(stripped.steps.t2).not.toHaveProperty(key);
    expect(stripped.steps.t2.result).not.toHaveProperty('attempts');
    const plan = simulatePlan(b, run, ['cloud', 'network', 'sequence']);
    const mechanics = progress => ({ balance: progress.balance, fieldGains: progress.fieldGains, fieldEvents: progress.fieldEvents, fieldCrew: progress.fieldCrew, fieldPreparation: progress.fieldPreparation, fieldDeliveries: progress.fieldDeliveries });
    expect(mechanics(plan.initial)).toEqual(mechanics(initial));
    expect(plan.initial.fieldEvents).toHaveLength(2);
    for (const id of ['cloud', 'network', 'sequence']) run = move(b, run, id);
    expect(plan.status).toBe('ready');
    expect(mechanics(plan.progress)).toEqual(mechanics(engine.derive(b, run)));
    expectRestored(b, run);
  });

  it('keeps fortune rewards separate and neither doubles nor consumes a discovery card', () => {
    const b = board({ discoveries: [{ id: 'cycle-card', title: 'Cycle', text: 'Water collects.', sourceQuote: 'Water collects in rivers and lakes.', reward: [1, 2] }] });
    let run = clear(b, 1);
    run = move(b, run, 'cloud', { dice: [20, 20] });
    const before = engine.derive(b, run);
    expect(before.fortune).toEqual([2, 3]);
    const after = engine.derive(b, choose(b, run, 'collect'));
    expect(after.fortune).toEqual(before.fortune);
    expect(after.discovered).toEqual(['cycle-card']);
    expect(after.balance).toEqual([6, 6]);
    expect(after.fieldGains).toEqual([0, 1]);
  });

  it('preserves pending and committed choices through actual solo storage normalization', () => {
    const b = board(), store = storage(), pending = clear(b, 2);
    const saved = saveSolo(store, b, 'field', 'solo', { run: pending });
    expect(saved.status).toBe('saved');
    expect(readSolo(store, b, 'field', 'solo').run).toEqual(engine.restoreRun(b, pending));
    const prepared = choose(b, pending, 'prepare');
    const changed = saveSolo(store, b, 'field', 'solo', { run: prepared, expectedRevision: saved.revision });
    expect(changed.status).toBe('saved');
    expect(engine.derive(b, readSolo(store, b, 'field', 'solo').run).fieldPreparation).toEqual({ turn: 1, id: 'survey', reward: [2, 0] });
  });

  it('does not invent events for old dice-only saves, including a continued history', () => {
    const b = board(), legacy = clear(b, 2);
    delete legacy.steps.t1.result.fieldChoice;
    const restored = engine.restoreRun(b, legacy);
    expectRestored(b, legacy);
    expect(restored.steps.t1.result).not.toHaveProperty('fieldChoice');
    expect(engine.fieldOpportunity(b, restored)).toBeNull();
    expect(engine.derive(b, restored).fieldEvents).toEqual([]);
    expectRestored(b, move(b, restored, 'river'));
  });

  it('rejects forged, misplaced, or unresolved historical opportunity choices', () => {
    const b = board(), pending = clear(b, 2);
    for (const mutation of [
      run => { run.steps.t1.result.fieldChoice = 'free'; },
      run => { run.steps.t1.result.dice = undefined; },
      run => { run.steps.t1.result.dice = [1, 1]; },
      run => { run.steps.t0.result.fieldChoice = 'collect'; },
      run => { run.steps.t1.result.success = false; run.steps.t1.result.marks.solo = false; },
      run => { run.steps.t1.phase = 'answer'; },
      run => { run.turn = 2; run.steps.t2 = engine.emptyStep(); }
    ]) { const invalid = copy(pending); mutation(invalid); expect(() => engine.restoreRun(b, invalid)).toThrow(); }
    const history = move(b, choose(b, pending, 'collect'), 'heater');
    history.steps.t2.result.fieldChoice = 'collect';
    expect(() => engine.restoreRun(b, history)).toThrow();
    const built = move(b, move(b, choose(b, pending, 'collect'), 'heater'), 'research');
    engine.stepOf(built).result.fieldChoice = 'collect';
    expect(() => engine.restoreRun(b, built)).toThrow();
  });

  it('never grants malformed markers during derivation, even before saved-run validation', () => {
    const b = board(), pending = clear(b, 2);
    for (const mutation of [
      run => { run.steps.t1.result.fieldChoice = 'free'; },
      run => { run.steps.t1.result.dice = [0]; },
      run => { run.steps.t1.result.dice = [1, 1]; },
      run => { delete run.steps.t1.result.dice; },
      run => { delete run.steps.t1.result.fieldChoice; run.steps.t0.result.fieldChoice = 'collect'; }
    ]) {
      const invalid = copy(pending); invalid.steps.t1.result.fieldChoice = 'collect'; mutation(invalid);
      expect(engine.derive(b, invalid)).toMatchObject({ fieldEvents: [], fieldPreparation: null, fieldGains: [0, 0], fieldDeliveries: [] });
    }
  });

  it('does not create opportunities when successful resolutions have no valid supplied dice', () => {
    const b = board(), run = clear(b, 8, { noDice: true });
    expect(engine.derive(b, run)).toMatchObject({ fieldEvents: [], fieldGains: [0, 0], fieldPreparation: null });
    expect(Object.values(run.steps).some(step => step.result?.fieldChoice !== undefined)).toBe(false);
    expectRestored(b, run);
  });

  it('disables investigation preparation after the final new space while keeping a construction crew available', () => {
    const b = board(), run = clear(b, 7, { choice: 'collect' });
    const final = move(b, run, 'weather');
    expect(engine.fieldOpportunity(b, final)).toMatchObject({ pending: true, canPrepare: false, canCrew: true });
    expect(() => engine.chooseFieldOpportunity(b, final, 'prepare')).toThrow();
    const forged = copy(final); forged.steps.t7.result.fieldChoice = 'prepare';
    expect(() => engine.restoreRun(b, forged)).toThrow();
    expect(engine.restoreRun(b, choose(b, final, 'collect')).steps.t7.result.fieldChoice).toBe('collect');
    expectRestored(b, choose(b, final, 'crew'));
  });

  it('does not open a new opportunity on the final allowed move', () => {
    const b = board();
    let run = clear(b, 4, { choice: 'collect' });
    while (run.turn < engine.MAX_TURNS - 2) run = move(b, run, engine.derive(b, run).position === 'heater' ? 'cloud' : 'heater');
    run = move(b, run, 'lake');
    expect(run.turn).toBe(engine.MAX_TURNS - 1);
    expect(engine.derive(b, run).visited).toHaveLength(5);
    expect(engine.stepOf(run).result.fieldChoice).toBeUndefined();
    expect(engine.fieldOpportunity(b, run)).toBeNull();
    expect(() => choose(b, run, 'crew')).toThrow();
    expectRestored(b, run);
    const invalid = copy(run); invalid.steps.t47.result.fieldChoice = 'collect';
    expect(() => engine.restoreRun(b, invalid)).toThrow();
  });

  it('preserves existing preparation in deterministic plans without inventing future chance', () => {
    const b = board(), base = next(b, choose(b, clear(b, 2), 'prepare'));
    const plan = simulatePlan(b, base, ['river', 'rain', 'lake']);
    expect(plan.status).toBe('ready');
    expect(plan.progress.fieldGains).toEqual([2, 0]);
    expect(plan.progress.fieldPreparation).toBeNull();
    expect(plan.progress.fieldEvents).toHaveLength(1);
    expect(plan.progress.balance).toEqual([12, 5]);
    expect(plan.progress.fieldDeliveries).toEqual([{ turn: 2, originTurn: 1, gain: [2, 0] }]);
    expect(engine.derive(b, base).fieldPreparation).not.toBeNull();
  });

  it('does not add choices or progress fields to chance-off or open-exploration games', () => {
    for (const b of [board({ chance: false }), board({ playStyle: 'exploration' })]) {
      const run = clear(b, 2);
      expect(engine.fieldOpportunity(b, run)).toBeNull();
      expect(engine.stepOf(run).result.fieldChoice).toBeUndefined();
      expect(engine.derive(b, run)).not.toHaveProperty('fieldEvents');
      expectRestored(b, run);
      const forged = copy(run); forged.steps.t1.result.fieldChoice = 'collect';
      expect(() => engine.restoreRun(b, forged)).toThrow();
    }
  });
});
