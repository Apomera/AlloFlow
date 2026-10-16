import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import * as engine from '../lesson_board_engine.js';
import { leadOptionsFor, isLeadChoice } from '../lesson_board_encounters.js';
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
function answer(b, run, correct = true, dice = [1, 1]) {
  const node = b.locations.find(item => item.id === engine.stepOf(run).targetId);
  const value = correct ? engine.solution(node) : node.kind === 'choice' ? String((node.answer + 1) % node.options.length) : node.kind === 'settings' ? node.controls.map(control => (control.answer + 1) % control.options.length).join(',') : node.order.slice().reverse().join(',');
  const action = { attemptId: 'destination-test', turn: run.turn, requestId: engine.requestId(run), kind: 'answer', targetId: node.id, value };
  const responded = engine.merge(run, engine.processAction(b, run, action, 'solo', { attemptId: 'destination-test', active: true }));
  return engine.merge(responded, engine.resolve(b, responded, { solo: {} }, { dice }));
}
function move(b, run, id, options = {}) {
  if (engine.stepOf(run).phase === 'review') run = next(b, run);
  run = engine.merge(run, engine.begin(b, run, id));
  return engine.stepOf(run).phase === 'answer' ? answer(b, run, options.correct !== false, options.dice || [1, 1]) : run;
}
const pending = (b, dice = [1, 1]) => move(b, move(b, engine.emptyRun(), 'heater'), 'cloud', { dice });
const storage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; };
const mechanics = progress => ({ balance: progress.balance, fieldLead: progress.fieldLead, fieldCrew: progress.fieldCrew, fieldPreparation: progress.fieldPreparation, fieldEvents: progress.fieldEvents, fieldGains: progress.fieldGains, fieldDeliveries: progress.fieldDeliveries });

describe('Destination encounter leads', () => {
  it('offers two distinct unvisited destinations and opposing three-token rewards from the first saved die', () => {
    const b = board(), visited = ['heater', 'cloud'];
    const offered = leadOptionsFor(b, [1], visited);
    expect(offered).toEqual([{ targetId: 'cooler', reward: [2, 1] }, { targetId: 'river', reward: [1, 2] }]);
    for (let die = 1; die <= 20; die++) {
      const choices = leadOptionsFor(b, [die], visited);
      expect(choices).toEqual(leadOptionsFor(b, [die, 20], visited));
      expect(choices).toEqual(leadOptionsFor({ ...b, locations: b.locations.slice().reverse() }, [die], visited));
      expect(new Set(choices.map(item => item.targetId)).size).toBe(2);
      expect(choices.every(item => !visited.includes(item.targetId) && item.reward.reduce((sum, value) => sum + value, 0) === 3)).toBe(true);
    }
    expect(leadOptionsFor(b, [2], visited)).not.toEqual(offered);
    offered[0].reward[0] = 100;
    expect(leadOptionsFor(b, [1], visited)[0].reward).toEqual([2, 1]);
  });

  it('commits only an offered destination without granting supplies or changing the route immediately', () => {
    const b = board(), waiting = pending(b), before = engine.derive(b, waiting);
    expect(engine.fieldOpportunity(b, waiting)).toMatchObject({ canLead: true, selectedLead: null, leads: [{ targetId: 'cooler', reward: [2, 1] }, { targetId: 'river', reward: [1, 2] }] });
    const run = choose(b, waiting, 'lead:cooler'), progress = engine.derive(b, run);
    expect(progress).toMatchObject({ balance: before.balance, fieldLead: { turn: 1, id: 'survey', targetId: 'cooler', reward: [2, 1] }, fieldGains: [0, 0], fieldDeliveries: [] });
    expect(engine.tabletopState(b, run).routes).toEqual(engine.tabletopState(b, waiting).routes);
    expect(engine.fieldOpportunity(b, run)).toMatchObject({ choice: 'lead:cooler', pending: false, canLead: false, selectedLead: { targetId: 'cooler', reward: [2, 1] } });
    expect(engine.turnLimit(b, run).canAdvance).toBe(true);
    expect(() => choose(b, run, 'lead:river')).toThrow();
    expect(engine.stepOf(waiting).result.fieldChoice).toBe('pending');
  });

  it('rejects unknown, already-cleared, unoffered, and malformed lead choices', () => {
    const b = board(), waiting = pending(b);
    for (const choice of ['lead:heater', 'lead:lake', 'lead:missing', 'lead:', 'lead:Cooler', 'lead:cooler:again', 'lead:constructor', 'lead:__proto__', {}, null]) {
      expect(() => choose(b, waiting, choice)).toThrow();
      const forged = copy(waiting); engine.stepOf(forged).result.fieldChoice = choice;
      expect(engine.derive(b, forged)).toMatchObject({ fieldLead: null, fieldGains: [0, 0], fieldEvents: [] });
      expect(() => engine.restoreRun(b, forged)).toThrow();
    }
    expect(isLeadChoice('lead:' + 'a'.repeat(41))).toBe(false);
  });

  it('keeps a distant lead through travel, paid construction, other investigations and a failed target, then rewards once', () => {
    const b = board();
    let run = choose(b, pending(b), 'lead:cooler');
    run = move(b, move(b, run, 'heater'), 'research');
    for (const id of ['river', 'rain', 'lake']) run = move(b, run, id);
    expect(engine.fieldOpportunity(b, run)).toMatchObject({ pending: true, canLead: false });
    expect(engine.derive(b, run)).toMatchObject({ fieldLead: { targetId: 'cooler' }, fieldGains: [0, 0], fieldDeliveries: [] });
    run = choose(b, run, 'collect');
    run = move(b, move(b, run, 'sequence'), 'cooler', { correct: false });
    const before = engine.derive(b, run);
    expect(before.fieldLead.targetId).toBe('cooler');
    run = answer(b, engine.merge(run, engine.retry(b, run)));
    expect(engine.derive(b, run)).toMatchObject({ fieldLead: null, fieldGains: [3, 1], fieldDeliveries: [{ turn: run.turn, originTurn: 1, gain: [2, 1], kind: 'destination', targetId: 'cooler' }] });
    const restored = engine.restoreRun(b, run);
    expect(mechanics(engine.derive(b, restored))).toEqual(mechanics(engine.derive(b, run)));
    run = move(b, move(b, run, 'sequence'), 'cooler');
    expect(engine.derive(b, run).fieldGains).toEqual([3, 1]);
    expect(engine.derive(b, run).fieldDeliveries).toHaveLength(1);
  });

  it('awards the chosen second resource mix only at that destination', () => {
    const b = board(), ready = choose(b, pending(b), 'lead:river');
    const result = move(b, ready, 'river');
    expect(engine.derive(b, result)).toMatchObject({ fieldLead: null, fieldGains: [1, 2], fieldDeliveries: [{ turn: 2, originTurn: 1, gain: [1, 2], kind: 'destination', targetId: 'river' }] });
    expect(engine.derive(b, result).balance).toEqual([7, 5]);
  });

  it('does not replace an active lead at a later opportunity, but allows a separate construction crew', () => {
    const b = board();
    let run = choose(b, pending(b), 'lead:cooler');
    for (const id of ['river', 'rain', 'lake']) run = move(b, run, id);
    const offer = engine.fieldOpportunity(b, run);
    expect(offer.canLead).toBe(false);
    expect(offer.leads.length).toBe(2);
    expect(() => choose(b, run, 'lead:' + offer.leads[0].targetId)).toThrow();
    const forged = copy(run); engine.stepOf(forged).result.fieldChoice = 'lead:' + offer.leads[0].targetId;
    expect(engine.derive(b, forged)).toMatchObject({ fieldLead: { turn: 1, targetId: 'cooler' }, fieldEvents: [{ turn: 1, choice: 'lead:cooler' }] });
    expect(() => engine.restoreRun(b, forged)).toThrow();
    run = choose(b, run, 'crew');
    expect(engine.derive(b, run)).toMatchObject({ fieldLead: { turn: 1, targetId: 'cooler' }, fieldCrew: { turn: 4 } });
    run = move(b, move(b, run, 'sequence'), 'cooler');
    expect(engine.derive(b, run)).toMatchObject({ fieldLead: null, fieldCrew: { turn: 4 }, fieldGains: [2, 1] });
    expect(mechanics(engine.derive(b, engine.restoreRun(b, run)))).toEqual(mechanics(engine.derive(b, run)));
  });

  it('keeps investigation preparation and a destination lead on independent triggers', () => {
    const b = board();
    let run = choose(b, pending(b), 'lead:cooler');
    for (const id of ['river', 'rain', 'lake']) run = move(b, run, id);
    run = choose(b, run, 'prepare');
    expect(engine.derive(b, run)).toMatchObject({ fieldLead: { targetId: 'cooler' }, fieldPreparation: { turn: 4 } });
    run = move(b, run, 'sequence');
    expect(engine.derive(b, run)).toMatchObject({ fieldLead: { targetId: 'cooler' }, fieldPreparation: null, fieldGains: [2, 0] });
    run = move(b, run, 'cooler');
    expect(engine.derive(b, run)).toMatchObject({ fieldLead: null, fieldPreparation: null, fieldGains: [4, 1] });
    expect(engine.derive(b, run).fieldDeliveries).toHaveLength(2);
  });

  it('preserves the exact choice and reward through solo storage, without rewriting older choices', () => {
    const b = board(), store = storage(), run = choose(b, pending(b), 'lead:cooler');
    const saved = saveSolo(store, b, 'destination', 'solo', { run });
    expect(saved.status).toBe('saved');
    const restored = readSolo(store, b, 'destination', 'solo').run;
    expect(engine.stepOf(restored).result.fieldChoice).toBe('lead:cooler');
    expect(mechanics(engine.derive(b, restored))).toEqual(mechanics(engine.derive(b, run)));
    for (const choice of ['collect', 'prepare', 'crew']) {
      const old = choose(b, pending(b), choice), restoredOld = engine.restoreRun(b, old);
      expect(engine.stepOf(restoredOld).result.fieldChoice).toBe(choice);
      expect(engine.derive(b, restoredOld).fieldLead).toBeNull();
    }
    const old = pending(b); delete engine.stepOf(old).result.fieldChoice;
    expect(engine.derive(b, engine.restoreRun(b, old))).toMatchObject({ fieldLead: null, fieldEvents: [], fieldGains: [0, 0] });
  });

  it('projects a confirmed lead only when its destination is solved, without inventing future offers or borrowing its reward', () => {
    const b = board(), base = next(b, choose(b, pending(b), 'lead:cooler'));
    expect(planningBase(base).steps.t1.result).toMatchObject({ fieldChoice: 'lead:cooler', marks: {} });
    expect(planningBase(base).steps.t1).not.toHaveProperty('answers');
    expect(simulatePlan(b, base, [{ id: 'network', funding: 'standard' }]).status).toBe('invalid');
    const plan = simulatePlan(b, base, ['river', 'rain', 'lake', 'sequence', 'cooler']);
    expect(plan.status).toBe('ready');
    expect(plan.steps.slice(0, 4).every(step => step.change[0] === 2 && step.change[1] === 1)).toBe(true);
    expect(plan.steps[4].change).toEqual([4, 2]);
    expect(plan.progress).toMatchObject({ fieldLead: null, fieldGains: [2, 1], fieldEvents: [{ turn: 1, choice: 'lead:cooler' }], fieldDeliveries: [{ turn: 6, originTurn: 1, gain: [2, 1], kind: 'destination', targetId: 'cooler' }] });
    expect(engine.derive(b, base)).toMatchObject({ fieldLead: { targetId: 'cooler' }, fieldGains: [0, 0] });
  });

  it('keeps the lead in forecasts after a retried investigation resets the encounter dice count', () => {
    const b = board();
    let run = choose(b, pending(b), 'collect');
    run = move(b, run, 'river', { correct: false });
    run = answer(b, engine.merge(run, engine.retry(b, run)));
    run = move(b, move(b, run, 'rain'), 'lake');
    expect(engine.stepOf(run).result.dice).toEqual([1]);
    run = next(b, choose(b, run, 'lead:cooler'));
    const plan = simulatePlan(b, run, ['sequence', 'cooler']);
    for (const id of ['sequence', 'cooler']) run = move(b, run, id);
    expect(mechanics(plan.progress)).toEqual(mechanics(engine.derive(b, run)));
  });

  it('offers a single remaining destination and no lead after the final new space', () => {
    const b = board(), extended = copy(b);
    extended.locations.push({ ...copy(b.locations.at(-1)), id: 'zenith', name: 'Final station' });
    extended.edges.push(['weather', 'zenith']);
    expect(leadOptionsFor(extended, [20], extended.locations.slice(0, 8).map(node => node.id))).toEqual([{ targetId: 'zenith', reward: [2, 1] }]);
    let run = engine.emptyRun();
    for (const node of b.locations) {
      run = move(b, run, node.id);
      if (engine.fieldOpportunity(b, run)?.pending && node.id !== 'weather') run = choose(b, run, 'collect');
    }
    expect(engine.fieldOpportunity(b, run)).toMatchObject({ canLead: false, leads: [], selectedLead: null });
    expect(() => choose(b, run, 'lead:weather')).toThrow();
  });

  it('does not add leads or payout fields on chance-off or classic boards', () => {
    for (const b of [board({ chance: false }), board({ playStyle: undefined })]) {
      const run = pending(b);
      expect(engine.fieldOpportunity(b, run)).toBeNull();
      expect(leadOptionsFor(b, [1], ['heater', 'cloud'])).toEqual([]);
      expect(engine.derive(b, run)).not.toHaveProperty('fieldLead');
      expect(() => choose(b, run, 'lead:cooler')).toThrow();
      const forged = copy(run); engine.stepOf(forged).result.fieldChoice = 'lead:cooler';
      expect(() => engine.restoreRun(b, forged)).toThrow();
    }
  });
});
