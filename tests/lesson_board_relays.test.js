import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import * as engine from '../lesson_board_engine.js';
import { isRelayChoice, isFieldChoice } from '../lesson_board_encounters.js';
import { isRelayEncounter, relayOptionsFor } from '../lesson_board_relays.js';
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
function answer(b, run, { dice = [1, 1], correct = true } = {}) {
  const node = b.locations.find(item => item.id === engine.stepOf(run).targetId), solution = engine.solution(node);
  const value = correct ? solution : node.kind === 'choice' ? String((node.answer + 1) % node.options.length) : solution.split(',').reverse().join(',');
  run = engine.merge(run, engine.processAction(b, run, { attemptId: 'relay-test', turn: run.turn, requestId: engine.requestId(run), kind: 'answer', targetId: node.id, value }, 'solo', { attemptId: 'relay-test', active: true }));
  return engine.merge(run, engine.resolve(b, run, { solo: {} }, { dice }));
}
function move(b, run, id, options = {}) {
  if (engine.stepOf(run).phase === 'review') run = next(b, run);
  run = engine.merge(run, engine.begin(b, run, id, options.funding || 'standard', options.route || 'shortest'));
  return engine.stepOf(run).phase === 'answer' ? answer(b, run, options) : run;
}
const second = b => move(b, move(b, engine.emptyRun(), 'heater'), 'cloud');
function pending(b, die = 11, initialChoice = 'collect') {
  let run = second(b);
  if (engine.fieldOpportunity(b, run)?.pending) run = choose(b, run, initialChoice);
  return ['river', 'rain', 'lake'].reduce((current, id) => move(b, current, id, { dice: [die, die] }), run);
}
const accepted = (b, index = 0) => { const run = pending(b); return choose(b, run, engine.fieldOpportunity(b, run).relays[index].id); };
const restored = (b, run) => expect(engine.derive(b, engine.restoreRun(b, run))).toEqual(engine.derive(b, run));
const storage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; };

describe('Ordered two-stop relay dispatches', () => {
  it('accepts only two distinct canonical safe station IDs', () => {
    for (const choice of ['relay:station-a:station_b', 'relay:a:' + 'b'.repeat(40)]) {
      expect(isRelayChoice(choice)).toBe(true); expect(isFieldChoice(choice)).toBe(true);
    }
    for (const choice of ['relay:a:a', 'relay:a', 'relay:a:b:c', 'relay:A:b', 'relay:a:b ', 'relay:constructor:b', 'relay:a:prototype', 'relay:a:__proto__', 'relay:a:' + 'b'.repeat(41), {}, null]) {
      expect(isRelayChoice(choice)).toBe(false); expect(isFieldChoice(choice)).toBe(false);
    }
    expect(isRelayEncounter('passage')).toBe(true);
    for (const id of ['survey', 'supplies', 'rendezvous']) expect(isRelayEncounter(id)).toBe(false);
  });

  it('uses the saved first die to offer reversed canonical routes with distinct staged rewards', () => {
    const b = board(), progress = engine.derive(b, pending(b));
    for (const die of [11, 12, 13, 14, 15]) {
      const offers = relayOptionsFor(b, progress, [die]);
      expect(offers).toHaveLength(2);
      expect(offers[0].stops.map(stop => stop.targetId)).toEqual(offers[1].stops.map(stop => stop.targetId).reverse());
      expect(offers.map(offer => offer.reward)).toEqual([[1, 3], [3, 1]]);
      expect(offers[0].stops.map(stop => stop.reward)).toEqual([[1, 0], [0, 3]]);
      expect(offers[1].stops.map(stop => stop.reward)).toEqual([[0, 1], [3, 0]]);
      expect(offers).toEqual(relayOptionsFor({ ...b, locations: b.locations.slice().reverse(), edges: b.edges.slice().reverse() }, { ...progress, visited: progress.visited.slice().reverse() }, [die, 20]));
      expect(offers).toEqual(relayOptionsFor(b, { ...progress, fieldRelay: { stage: 0 }, fieldDelivery: { targetId: 'cloud' } }, [die]));
      for (const offer of offers) for (const stop of offer.stops) {
        expect(progress.visited).toContain(stop.targetId);
        expect([b.starts[0], progress.position]).not.toContain(stop.targetId);
      }
    }
    expect(relayOptionsFor(b, progress, [11])).not.toEqual(relayOptionsFor(b, progress, [12]));
    const changed = relayOptionsFor(b, progress, [11]); changed[0].stops[0].reward[0] = 100; changed[0].reward[1] = 100;
    expect(relayOptionsFor(b, progress, [11])[0]).toMatchObject({ reward: [1, 3], stops: [{ reward: [1, 0] }, { reward: [0, 3] }] });
  });

  it('requires two cleared stations and legal capped travel for both orders, never home', () => {
    const b = board({ travelLimit: 3 }), early = engine.derive(b, second(b));
    expect(relayOptionsFor(b, early, [11])).toEqual([]);
    const progress = engine.derive(b, pending(b));
    for (const offer of relayOptionsFor(b, progress, [11])) {
      let position = progress.position;
      for (const stop of offer.stops) {
        const route = engine.resolveTravelRoute(b, { ...progress, position }, stop.targetId);
        expect(route.length).toBeLessThanOrEqual(4); position = stop.targetId;
      }
    }
    const disconnected = { ...b, edges: b.edges.filter(edge => !edge.includes('rain')) };
    expect(relayOptionsFor(disconnected, progress, [11])).toEqual([]);
    // Both endpoints are individually in range, but cannot reach one another
    // in a single capped travel move. Such a pair cannot be offered.
    const branch = { ...b, edges: [['lake', 'rain'], ['rain', 'cloud'], ['lake', 'sequence'], ['sequence', 'river']] };
    const middle = { visited: ['sequence', 'cloud', 'river', 'rain', 'lake'], built: [], position: 'lake' };
    for (const offer of relayOptionsFor(branch, middle, [11])) expect(offer.stops.map(stop => stop.targetId).sort()).not.toEqual(['cloud', 'river']);
    expect(relayOptionsFor(b, { ...progress, complete: true }, [11])).toEqual([]);
    for (const dice of [[], [0], [21], ['11'], [11, 11, 11], [1], [6], [16]]) expect(relayOptionsFor(b, progress, dice)).toEqual([]);
  });

  it('reserves a complete receipt without spending, travelling, rolling, or advancing', () => {
    const b = board(), waiting = pending(b), before = engine.derive(b, waiting), card = engine.fieldOpportunity(b, waiting), offer = card.relays[0];
    expect(card).toMatchObject({ canRelay: true, selectedRelay: null, pending: true });
    const run = choose(b, waiting, offer.id), progress = engine.derive(b, run);
    expect(progress.fieldRelay).toEqual({ turn: waiting.turn, id: 'passage', stops: offer.stops, stage: 0, targetId: offer.stops[0].targetId, reward: [1, 3] });
    for (const key of ['balance', 'fortune', 'position', 'fieldGains', 'fieldDeliveries']) expect(progress[key]).toEqual(before[key]);
    expect(progress.fieldEvents.at(-1).relay).toEqual(offer);
    expect(run.turn).toBe(waiting.turn); expect(engine.stepOf(run).result.dice).toEqual(engine.stepOf(waiting).result.dice);
    expect(engine.fieldOpportunity(b, run)).toMatchObject({ pending: false, canRelay: false, canDelivery: false, selectedRelay: offer, relays: card.relays });
    expect(engine.stepOf(waiting).result.fieldChoice).toBe('pending'); restored(b, run);
    expect(() => next(b, waiting)).toThrow(/opportunity/);
    for (const choice of [offer.id, 'collect', 'delivery:cloud']) expect(() => choose(b, run, choice)).toThrow();
  });

  it('pays only ordered travel endpoints and pays each stage exactly once', () => {
    const b = board(); let run = accepted(b), initial = engine.derive(b, run), relay = initial.fieldRelay;
    const [first, secondStop] = relay.stops;
    run = move(b, run, secondStop.targetId); // Out-of-order stop.
    expect(engine.derive(b, run).fieldRelay.stage).toBe(0);
    run = move(b, run, 'heater'); // Pass through the first required station.
    expect(engine.derive(b, run).fieldRelay.stage).toBe(0);
    run = move(b, run, 'research'); // Construction cannot deliver a dispatch.
    expect(engine.derive(b, run).fieldRelay.stage).toBe(0);
    const before = engine.derive(b, run); run = move(b, run, first.targetId);
    const partial = engine.derive(b, run);
    expect(partial.balance).toEqual(before.balance.map((value, i) => value + first.reward[i]));
    expect(partial.fieldRelay).toMatchObject({ stage: 1, targetId: secondStop.targetId, reward: secondStop.reward });
    expect(partial.fieldDeliveries.at(-1)).toEqual({ turn: run.turn, originTurn: relay.turn, gain: first.reward, kind: 'relay-stop', stage: 1, targetId: first.targetId }); restored(b, run);
    run = move(b, move(b, run, 'heater'), first.targetId); // Repeating the paid stop.
    expect(engine.derive(b, run).fieldGains).toEqual(partial.fieldGains);
    run = move(b, run, secondStop.targetId);
    const completed = engine.derive(b, run);
    expect(completed).not.toHaveProperty('fieldRelay');
    expect(completed.fieldGains).toEqual(initial.fieldGains.map((value, i) => value + relay.reward[i]));
    expect(completed.fieldDeliveries.at(-1)).toEqual({ turn: run.turn, originTurn: relay.turn, gain: secondStop.reward, kind: 'relay', stage: 2, targetId: secondStop.targetId }); restored(b, run);
    run = move(b, move(b, run, first.targetId), secondStop.targetId);
    expect(engine.derive(b, run).fieldGains).toEqual(completed.fieldGains);
    expect(engine.derive(b, run).fieldDeliveries.filter(item => item.originTurn === relay.turn)).toHaveLength(2);
  });

  it('preserves its next stop through a failed investigation and retry', () => {
    const b = board(); let run = accepted(b, 1), relay = engine.derive(b, run).fieldRelay;
    run = move(b, run, 'sequence', { correct: false });
    expect(engine.stepOf(run).result.success).toBe(false); expect(engine.derive(b, run).fieldRelay).toEqual(relay);
    run = answer(b, engine.merge(run, engine.retry(b, run)));
    expect(engine.derive(b, run).fieldRelay).toEqual(relay); restored(b, run);
    for (const stop of relay.stops) run = move(b, run, stop.targetId);
    expect(engine.derive(b, run).fieldGains).toEqual([4, 1]); // Earlier collect plus the reverse relay.
  });

  it('shares one active dispatch slot with ordinary deliveries without replacing either', () => {
    const b = board(); let delivery = pending(b, 11, 'delivery:heater');
    expect(engine.fieldOpportunity(b, delivery)).toMatchObject({ canDelivery: false, canRelay: false });
    const relayChoice = engine.fieldOpportunity(b, delivery).relays[0].id;
    expect(() => choose(b, delivery, relayChoice)).toThrow();
    const forged = copy(delivery); engine.stepOf(forged).result.fieldChoice = relayChoice;
    expect(engine.derive(b, forged)).not.toHaveProperty('fieldRelay'); expect(() => engine.restoreRun(b, forged)).toThrow();
    let relay = accepted(b);
    for (const id of ['sequence', 'cooler', 'weather']) relay = move(b, relay, id, { dice: [11, 11] });
    const card = engine.fieldOpportunity(b, relay);
    expect(card).toMatchObject({ canDelivery: false, canRelay: false });
    for (const choice of [card.relays[0].id, 'delivery:' + card.deliveries[0].targetId]) {
      expect(() => choose(b, relay, choice)).toThrow();
      const altered = copy(relay); engine.stepOf(altered).result.fieldChoice = choice;
      expect(engine.derive(b, altered).fieldRelay.turn).toBe(4); expect(() => engine.restoreRun(b, altered)).toThrow();
    }
    restored(b, choose(b, relay, 'collect'));
  });

  it('rejects forged, unoffered, wrong-family, home, and duplicate relay choices on restore', () => {
    const b = board();
    for (const [run, choices] of [[pending(b), ['relay:cloud:rain', 'relay:heater:cloud', 'relay:lake:cloud', 'relay:cloud:cloud', 'relay:missing:cloud']], [pending(b, 6), ['relay:cloud:river']], [second(b), ['relay:cloud:river']]]) {
      for (const choice of choices) {
        expect(() => choose(b, run, choice)).toThrow();
        const forged = copy(run); engine.stepOf(forged).result.fieldChoice = choice;
        expect(engine.derive(b, forged)).not.toHaveProperty('fieldRelay'); expect(() => engine.restoreRun(b, forged)).toThrow();
      }
    }
  });

  it('requires two remaining turns and can pay its final stop on the last permitted turn', () => {
    const b = board();
    for (const targetTurn of [engine.MAX_TURNS - 3, engine.MAX_TURNS - 2]) {
      let run = choose(b, second(b), 'collect');
      for (let index = 0; index < targetTurn - 4; index++) run = move(b, run, index % 2 ? 'cloud' : 'heater');
      for (const id of ['river', 'rain', 'lake']) run = move(b, run, id, { dice: [11, 11] });
      expect(run.turn).toBe(targetTurn);
      const card = engine.fieldOpportunity(b, run), offer = card.relays[0];
      expect(card.canRelay).toBe(targetTurn < engine.MAX_TURNS - 2);
      if (card.canRelay) {
        run = choose(b, run, offer.id);
        for (const stop of offer.stops) run = move(b, run, stop.targetId);
        expect(run.turn).toBe(engine.MAX_TURNS - 1); expect(engine.derive(b, run)).not.toHaveProperty('fieldRelay'); restored(b, run);
      } else {
        expect(() => choose(b, run, offer.id)).toThrow();
        const forged = copy(run); engine.stepOf(forged).result.fieldChoice = offer.id;
        expect(engine.derive(b, forged)).not.toHaveProperty('fieldRelay'); expect(() => engine.restoreRun(b, forged)).toThrow();
      }
    }
  });

  it('round-trips both stages through solo storage and simulates exact future payouts privately', () => {
    const b = board(), store = storage(); let run = accepted(b, 1), relay = engine.derive(b, run).fieldRelay;
    const saved = saveSolo(store, b, 'relay', 'solo', { run }); expect(saved.status).toBe('saved');
    run = readSolo(store, b, 'relay', 'solo').run; restored(b, run);
    expect(planningBase(run).steps.t4.result.fieldChoice).toBe('relay:river:cloud');
    const base = next(b, run), snapshot = JSON.stringify(base), plan = simulatePlan(b, base, relay.stops.map(stop => stop.targetId));
    expect(plan.steps).toHaveLength(2); expect(plan.progress.fieldEvents).toHaveLength(2);
    expect(plan.steps.map(step => step.change)).toEqual([[0, 1], [3, 0]]);
    expect(plan.progress).not.toHaveProperty('fieldRelay'); expect(JSON.stringify(base)).toBe(snapshot);
    run = move(b, run, relay.stops[0].targetId);
    const partial = saveSolo(store, b, 'relay', 'solo', { run, expectedRevision: saved.revision }); expect(partial.status).toBe('saved');
    run = readSolo(store, b, 'relay', 'solo').run; expect(engine.derive(b, run).fieldRelay.stage).toBe(1); restored(b, run);
    run = move(b, run, relay.stops[1].targetId);
    expect(plan.progress.balance).toEqual(engine.derive(b, run).balance); restored(b, run);
  });

  it('leaves an optional relay unfinished on homecoming and offers no home relay endpoint', () => {
    const b = board({ goal: 'core' }); let run = accepted(b), relay = engine.derive(b, run).fieldRelay;
    run = move(b, run, 'heater'); run = move(b, run, 'research'); run = move(b, run, 'bridge');
    run = move(b, run, 'sequence'); run = move(b, run, 'heater');
    expect(engine.derive(b, run)).toMatchObject({ complete: true, fieldRelay: relay });
    expect(engine.derive(b, run).fieldDeliveries.some(item => item.kind === 'relay' || item.kind === 'relay-stop')).toBe(false); restored(b, run);
    expect(relay.stops.every(stop => stop.targetId !== b.starts[0])).toBe(true);
  });

  it('keeps legacy choices and chance-free or classic games unchanged', () => {
    const b = board();
    for (const choice of ['collect', 'prepare', 'crew', 'delivery:heater']) {
      const run = choose(b, second(b), choice); expect(engine.derive(b, run)).not.toHaveProperty('fieldRelay'); restored(b, run);
    }
    for (const disabled of [{ ...b, chance: false }, { ...b, playStyle: 'exploration' }]) {
      const run = pending(disabled);
      expect(engine.fieldOpportunity(disabled, run)).toBeNull(); expect(engine.derive(disabled, run)).not.toHaveProperty('fieldRelay');
      expect(relayOptionsFor(disabled, engine.derive(disabled, run), [11])).toEqual([]);
      expect(() => choose(disabled, run, 'relay:cloud:river')).toThrow();
    }
  });
});
