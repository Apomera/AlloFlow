import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import * as engine from '../lesson_board_engine.js';
import { isDeliveryChoice, isFieldChoice } from '../lesson_board_encounters.js';
import { deliveryOptionsFor, deliveryRoute } from '../lesson_board_courier.js';
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
  run = engine.merge(run, engine.processAction(b, run, { attemptId: 'parcel-test', turn: run.turn, requestId: engine.requestId(run), kind: 'answer', targetId: id, value: engine.solution(node) }, 'solo', { attemptId: 'parcel-test', active: true }));
  return engine.merge(run, engine.resolve(b, run, { solo: {} }, { dice }));
}
const pending = (b, die = 1) => move(b, move(b, engine.emptyRun(), 'heater'), 'cloud', [die, die]);
const fifth = (b, run, die = 1) => ['river', 'rain', 'lake'].reduce((current, id) => move(b, current, id, [die, die]), run);
const storage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; };

describe('Thematic return deliveries', () => {
  it('accepts only canonical safe destination choices', () => {
    for (const choice of ['delivery:heater', 'delivery:station-2', 'delivery:' + 'a'.repeat(40)]) {
      expect(isDeliveryChoice(choice)).toBe(true); expect(isFieldChoice(choice)).toBe(true);
    }
    for (const choice of ['delivery:', 'delivery:Heater', 'delivery:heater:again', 'delivery:heater ', 'delivery:constructor', 'delivery:prototype', 'delivery:__proto__', 'delivery:' + 'a'.repeat(41), {}, null]) {
      expect(isDeliveryChoice(choice)).toBe(false); expect(isFieldChoice(choice)).toBe(false);
    }
  });

  it('draws stable explored targets and thematic rewards from the first saved die', () => {
    const b = board(), progress = { position: 'lake', visited: b.locations.slice(0, 5).map(node => node.id), built: [], requirementsMet: false };
    for (const die of [1, 2, 5, 11, 12, 15]) {
      const offers = deliveryOptionsFor(b, progress, [die]);
      expect(offers).toHaveLength(2);
      expect(offers).toEqual(deliveryOptionsFor(b, { ...progress, fieldDelivery: { targetId: 'heater' } }, [die, 20]));
      expect(offers).toEqual(deliveryOptionsFor({ ...b, locations: b.locations.slice().reverse(), edges: b.edges.slice().reverse() }, progress, [die]));
      expect(new Set(offers.map(item => item.targetId)).size).toBe(2);
      expect(offers.map(item => item.reward)).toEqual(die < 6 ? [[3, 0], [2, 1]] : [[0, 3], [1, 2]]);
      expect(offers.every(item => item.targetId !== progress.position && progress.visited.includes(item.targetId) && item.path.at(-1) === item.targetId)).toBe(true);
    }
    expect(deliveryOptionsFor(b, progress, [1])).not.toEqual(deliveryOptionsFor(b, progress, [2]));
    const offers = deliveryOptionsFor(b, progress, [1]); offers[0].reward[0] = 900; offers[0].path[0] = 'missing';
    expect(deliveryOptionsFor(b, progress, [1])[0]).toEqual({ targetId: 'cloud', reward: [3, 0], path: ['lake', 'rain', 'river', 'cloud'] });
  });

  it('offers only in-range cleared travel and omits a terminal home target', () => {
    const b = board({ travelLimit: 3 }), progress = { position: 'lake', visited: b.locations.slice(0, 5).map(node => node.id), built: [], requirementsMet: false };
    const offers = deliveryOptionsFor(b, progress, [1]);
    expect(offers.every(item => item.path.length <= 4 && item.targetId !== 'heater')).toBe(true);
    const early = { ...progress, position: 'cloud', visited: ['heater', 'cloud'] };
    expect(deliveryOptionsFor(b, early, [1])).toHaveLength(1);
    expect(deliveryOptionsFor(b, { ...early, requirementsMet: true, objectiveReady: false }, [1])).toEqual([]);
    const disconnected = { ...b, edges: b.edges.filter(edge => !edge.includes('cloud')) };
    expect(deliveryOptionsFor(disconnected, early, [1])).toEqual([]);
  });

  it.each([[1, 'survey', [3, 0]], [11, 'passage', [0, 3]]])('reserves the %s family without paying, moving, or rerolling', (die, id, reward) => {
    const b = board(), waiting = pending(b, die), before = engine.derive(b, waiting), offer = engine.fieldOpportunity(b, waiting);
    expect(offer).toMatchObject({ id, canDelivery: true, selectedDelivery: null, deliveries: [{ targetId: 'heater', reward, path: ['cloud', 'heater'] }] });
    const run = choose(b, waiting, 'delivery:heater'), progress = engine.derive(b, run);
    expect(progress).toMatchObject({ balance: before.balance, position: before.position, fieldGains: [0, 0], fieldDelivery: { turn: 1, id, targetId: 'heater', reward }, fieldEvents: [{ delivery: { targetId: 'heater', reward }, gain: [0, 0] }] });
    expect(run.turn).toBe(waiting.turn); expect(engine.stepOf(run).result.dice).toEqual([die]);
    expect(engine.fieldOpportunity(b, run)).toMatchObject({ pending: false, canDelivery: false, deliveries: offer.deliveries, selectedDelivery: { targetId: 'heater', reward } });
    expect(engine.derive(b, engine.restoreRun(b, run))).toEqual(progress);
    expect(() => choose(b, run, 'collect')).toThrow();
    expect(engine.stepOf(waiting).result.fieldChoice).toBe('pending');
  });

  it('pays only at a travel endpoint, survives crossing and building, and pays exactly once', () => {
    const b = board(); let run = fifth(b, choose(b, pending(b), 'crew'));
    run = choose(b, run, 'delivery:cloud');
    const reserved = engine.derive(b, run);
    expect(reserved).toMatchObject({ fieldDelivery: { targetId: 'cloud' }, fieldCrew: { turn: 1 }, fieldGains: [0, 0] });
    run = move(b, run, 'heater'); // Cross cloud without ending there.
    expect(engine.derive(b, run)).toMatchObject({ fieldDelivery: { targetId: 'cloud' }, fieldDeliveries: [] });
    run = move(b, run, 'research');
    expect(engine.derive(b, run)).toMatchObject({ fieldDelivery: { targetId: 'cloud' }, fieldGains: [1, 1], fieldCrew: null });
    run = move(b, run, 'cloud');
    const delivered = engine.derive(b, run);
    expect(delivered).not.toHaveProperty('fieldDelivery');
    expect(delivered.fieldGains).toEqual([4, 1]);
    expect(delivered.fieldDeliveries.at(-1)).toEqual({ turn: run.turn, originTurn: 4, kind: 'delivery', targetId: 'cloud', gain: [3, 0] });
    expect(engine.derive(b, engine.restoreRun(b, run))).toEqual(delivered);
    run = move(b, move(b, run, 'heater'), 'cloud');
    expect(engine.derive(b, run).fieldGains).toEqual(delivered.fieldGains);
    expect(engine.derive(b, run).fieldDeliveries).toEqual(delivered.fieldDeliveries);
  });

  it('does not pay during inspection, a failed travel result, or an unfinished travel step', () => {
    const b = board(), run = choose(b, pending(b), 'delivery:heater'), before = copy(run);
    deliveryRoute(b, engine.derive(b, run), 'heater'); engine.fieldOpportunity(b, run); engine.tabletopState(b, run);
    expect(run).toEqual(before);
    const arrived = move(b, run, 'heater');
    for (const variant of ['failed', 'unfinished']) {
      const forged = copy(arrived), step = engine.stepOf(forged);
      if (variant === 'failed') step.result.success = false; else step.phase = 'answer';
      expect(engine.derive(b, forged)).toMatchObject({ fieldDelivery: { targetId: 'heater' }, fieldGains: [0, 0], fieldDeliveries: [] });
      expect(() => engine.restoreRun(b, forged)).toThrow();
    }
  });

  it('rejects wrong families, unknown, unexplored, current, and malformed destinations', () => {
    const b = board();
    for (const die of [6, 16]) {
      const run = pending(b, die);
      expect(engine.fieldOpportunity(b, run)).not.toHaveProperty('deliveries');
      expect(() => choose(b, run, 'delivery:heater')).toThrow();
      const forged = copy(run); engine.stepOf(forged).result.fieldChoice = 'delivery:heater';
      expect(engine.derive(b, forged)).not.toHaveProperty('fieldDelivery');
      expect(() => engine.restoreRun(b, forged)).toThrow();
    }
    const waiting = pending(b);
    for (const choice of ['delivery:cloud', 'delivery:river', 'delivery:missing', 'delivery:constructor', 'delivery:', 'delivery:heater:again', null, {}]) {
      expect(() => choose(b, waiting, choice)).toThrow();
      const forged = copy(waiting); engine.stepOf(forged).result.fieldChoice = choice;
      expect(engine.derive(b, forged)).toMatchObject({ fieldGains: [0, 0], fieldEvents: [] });
      expect(engine.derive(b, forged)).not.toHaveProperty('fieldDelivery');
      expect(() => engine.restoreRun(b, forged)).toThrow();
    }
  });

  it('keeps one active parcel while a separate destination lead rewards a new investigation', () => {
    const b = board(); let run = fifth(b, choose(b, pending(b), 'delivery:heater'));
    const offer = engine.fieldOpportunity(b, run);
    expect(offer.canDelivery).toBe(false); expect(offer.deliveries.length).toBeGreaterThan(0);
    expect(() => choose(b, run, 'delivery:' + offer.deliveries[0].targetId)).toThrow();
    const forged = copy(run); engine.stepOf(forged).result.fieldChoice = 'delivery:' + offer.deliveries[0].targetId;
    expect(engine.derive(b, forged).fieldDelivery).toMatchObject({ turn: 1, targetId: 'heater' });
    expect(() => engine.restoreRun(b, forged)).toThrow();
    run = choose(b, run, 'lead:cooler');
    run = move(b, move(b, run, 'sequence'), 'cooler');
    expect(engine.derive(b, run)).toMatchObject({ fieldDelivery: { targetId: 'heater' }, fieldLead: null, fieldGains: [2, 1] });
    run = move(b, run, 'heater');
    expect(engine.derive(b, run)).toMatchObject({ fieldLead: null, fieldGains: [5, 1] });
    expect(engine.derive(b, run)).not.toHaveProperty('fieldDelivery');
  });

  it('retains a parcel independently of preparation for the next new investigation', () => {
    const b = board(); let run = fifth(b, choose(b, pending(b), 'delivery:heater'));
    run = choose(b, run, 'prepare');
    expect(engine.derive(b, run)).toMatchObject({ fieldDelivery: { targetId: 'heater' }, fieldPreparation: { turn: 4 } });
    run = move(b, run, 'sequence');
    expect(engine.derive(b, run)).toMatchObject({ fieldDelivery: { targetId: 'heater' }, fieldPreparation: null, fieldGains: [2, 0] });
    run = move(b, run, 'heater');
    expect(engine.derive(b, run).fieldGains).toEqual([5, 0]);
  });

  it('preserves encoded choices and derived rewards through solo save and restore', () => {
    const b = board(), run = choose(b, pending(b, 11), 'delivery:heater'), store = storage();
    expect(saveSolo(store, b, 'parcel', 'solo', { run }).status).toBe('saved');
    const restored = readSolo(store, b, 'parcel', 'solo');
    expect(restored.status).toBe('saved'); expect(engine.stepOf(restored.run).result.fieldChoice).toBe('delivery:heater');
    expect(engine.derive(b, restored.run)).toEqual(engine.derive(b, run));
    const finished = move(b, restored.run, 'heater');
    expect(engine.derive(b, finished).fieldGains).toEqual([0, 3]);
    expect(engine.derive(b, engine.restoreRun(b, finished))).toEqual(engine.derive(b, finished));
  });

  it('projects a committed delivery on travel without borrowing it before arrival or inventing new offers', () => {
    const b = board(), base = next(b, choose(b, pending(b), 'delivery:heater')), initial = engine.derive(b, base);
    expect(planningBase(base).steps.t1.result).toMatchObject({ fieldChoice: 'delivery:heater', marks: {} });
    expect(planningBase(base).steps.t1).not.toHaveProperty('answers');
    const plan = simulatePlan(b, base, ['heater', 'research', 'river', 'rain', 'lake']);
    expect(plan.status).toBe('ready'); expect(plan.steps[0]).toMatchObject({ kind: 'travel', change: [3, 0] });
    expect(plan.progress.fieldEvents).toHaveLength(1);
    expect(plan.progress.fieldDeliveries).toEqual([{ turn: 2, originTurn: 1, kind: 'delivery', targetId: 'heater', gain: [3, 0] }]);
    expect(plan.progress).not.toHaveProperty('fieldDelivery');
    expect(engine.derive(b, base)).toEqual(initial);
  });

  it('requires two future moves before allowing a new commitment', () => {
    const b = board();
    for (const targetTurn of [engine.MAX_TURNS - 3, engine.MAX_TURNS - 2]) {
      let run = choose(b, pending(b), 'collect');
      for (let index = 0; index < targetTurn - 4; index++) run = move(b, run, index % 2 ? 'cloud' : 'heater');
      run = fifth(b, run);
      expect(run.turn).toBe(targetTurn);
      expect(engine.fieldOpportunity(b, run).canDelivery).toBe(targetTurn < engine.MAX_TURNS - 2);
      const choice = 'delivery:' + engine.fieldOpportunity(b, run).deliveries[0].targetId;
      if (targetTurn < engine.MAX_TURNS - 2) expect(engine.derive(b, choose(b, run, choice))).toHaveProperty('fieldDelivery');
      else {
        expect(() => choose(b, run, choice)).toThrow();
        const forged = copy(run); engine.stepOf(forged).result.fieldChoice = choice;
        expect(engine.derive(b, forged)).not.toHaveProperty('fieldDelivery'); expect(() => engine.restoreRun(b, forged)).toThrow();
        expect(() => choose(b, run, 'collect')).not.toThrow();
      }
    }
  });

  it('settles an earlier home delivery before the same return completes the mission', () => {
    const b = board({ goal: 'core', starts: ['cloud', 'heater'] });
    let run = move(b, move(b, engine.emptyRun(), 'cloud'), 'heater');
    run = choose(b, run, 'delivery:cloud');
    run = move(b, move(b, run, 'river'), 'heater'); // Both routes cross cloud.
    expect(engine.derive(b, run)).toHaveProperty('fieldDelivery');
    expect(engine.buildSite(b, 'research')).toBe('heater'); expect(engine.buildSite(b, 'bridge')).toBe('heater');
    run = move(b, move(b, run, 'bridge'), 'research');
    expect(engine.derive(b, run)).toMatchObject({ requirementsMet: true, objectiveReady: false, usedProjects: [] });
    run = move(b, run, 'sequence');
    expect(deliveryRoute(b, engine.derive(b, run), 'cloud')).toMatchObject({ nextId: 'cloud', finishes: true });
    run = move(b, run, 'cloud');
    const progress = engine.derive(b, run);
    expect(progress).toMatchObject({ complete: true, returned: true, fieldGains: [3, 0] });
    expect(progress).not.toHaveProperty('fieldDelivery');
    expect(progress.fieldDeliveries.at(-1)).toMatchObject({ turn: run.turn, kind: 'delivery', targetId: 'cloud', gain: [3, 0] });
    expect(engine.derive(b, engine.restoreRun(b, run))).toEqual(progress);
  });

  it('describes a cleared route and stops before a terminal home waypoint', () => {
    const b = board({ travelLimit: 3, starts: ['rain', 'cloud'] }), progress = { position: 'heater', visited: b.locations.map(node => node.id), built: [], requirementsMet: true, usedProjects: ['research'] };
    const route = deliveryRoute(b, progress, 'weather');
    expect(route).toEqual({ path: b.locations.map(node => node.id), segments: 7, nextId: 'river', nextPath: ['heater', 'cloud', 'river'], withinRange: false, finishes: false });
    expect(deliveryRoute(b, { ...progress, requirementsMet: false }, 'weather')).toMatchObject({ nextId: 'rain', finishes: false });
    expect(deliveryRoute(b, progress, 'rain')).toMatchObject({ nextId: 'rain', withinRange: true, finishes: true });
    for (const target of ['heater', 'missing']) expect(deliveryRoute(b, progress, target)).toBeNull();
    expect(deliveryRoute(b, { ...progress, visited: ['heater'] }, 'weather')).toBeNull();
    expect(deliveryRoute(b, { ...progress, complete: true }, 'weather')).toBeNull();
  });

  it('predicts mission completion on the first genuine bridge use, but not a duplicate printed edge', () => {
    const b = board(), progress = { position: 'sequence', visited: b.locations.map(node => node.id), built: ['bridge'], requirementsMet: true, usedProjects: [] };
    expect(deliveryRoute(b, progress, 'heater')).toEqual({ path: ['sequence', 'heater'], segments: 1, nextId: 'heater', nextPath: ['sequence', 'heater'], withinRange: true, finishes: true });
    expect(deliveryRoute(b, { ...progress, requirementsMet: false }, 'heater').finishes).toBe(false);
    const duplicate = { ...b, edges: [...b.edges, ['heater', 'sequence']] };
    expect(deliveryRoute(duplicate, progress, 'heater').finishes).toBe(false);
    expect(deliveryRoute(duplicate, { ...progress, usedProjects: ['research'] }, 'heater').finishes).toBe(true);
  });

  it('keeps old choices, chance-off, and classic boards free of active parcel state', () => {
    const b = board();
    for (const choice of ['collect', 'prepare', 'crew', 'lead:cooler']) {
      const run = choose(b, pending(b), choice);
      expect(engine.derive(b, run)).not.toHaveProperty('fieldDelivery');
      expect(engine.derive(b, engine.restoreRun(b, run))).toEqual(engine.derive(b, run));
    }
    for (const disabled of [{ ...b, chance: false }, { ...b, playStyle: 'exploration' }]) {
      const run = pending(disabled);
      expect(engine.fieldOpportunity(disabled, run)).toBeNull();
      expect(deliveryOptionsFor(disabled, engine.derive(disabled, run), [1])).toEqual([]);
      expect(engine.derive(disabled, run)).not.toHaveProperty('fieldDelivery');
      expect(() => choose(disabled, run, 'delivery:heater')).toThrow();
    }
  });
});
