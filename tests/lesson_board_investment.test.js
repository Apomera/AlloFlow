import {describe, it, expect, vi} from 'vitest';
import {createRequire} from 'node:module';
import * as engine from '../lesson_board_engine.js';
import {simulatePlan} from '../lesson_board_sandbox.js';
import {investmentPreview, investmentComparisons} from '../lesson_board_investment.js';

const {makeBoard} = createRequire(import.meta.url)('../dev-tools/fixtures/lesson_board.cjs');
const board = options => ({...makeBoard(), playStyle: 'tabletop', goal: 'expedition', ...options});
const baseFor = (b, ids = ['heater', 'cloud', 'heater']) => simulatePlan(b, engine.emptyRun(), ids).run;
function longBridgeBoard(options = {}) {
  const b = board(options), path = ['cloud', 'rain', 'sequence', 'weather', 'cooler', 'lake', 'heater', 'river'];
  b.edges = path.slice(1).map((id, index) => [path[index], id]);
  b.projects.find(project => project.id === 'bridge').effect.targetId = 'lake';
  return b;
}
const longBridgeRun = b => baseFor(b, ['heater', 'lake', 'cooler', 'weather', 'sequence', 'rain', 'cloud']);
const mechanics = ({performance, ...progress}) => progress;
function execute(b, base, entries) {
  let run = base;
  for (const entry of entries) {
    const id = typeof entry === 'string' ? entry : entry.id;
    run = engine.merge(run, engine.begin(b, run, id, typeof entry === 'string' ? undefined : entry.funding));
    if (engine.stepOf(run).phase === 'answer') {
      const node = b.locations.find(item => item.id === id);
      run = engine.merge(run, engine.processAction(b, run, {attemptId: 'test', turn: run.turn, requestId: engine.requestId(run), kind: 'answer', targetId: id, value: engine.solution(node)}, 'solo', {attemptId: 'test', active: true}));
      run = engine.merge(run, engine.resolve(b, run, {solo: {}}));
    }
    if (!engine.derive(b, run).complete && run.turn < engine.MAX_TURNS - 1) run = engine.merge(run, engine.advance(b, run));
  }
  return engine.derive(b, run);
}
function freezeDeep(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freezeDeep); Object.freeze(value); } return value; }

describe('Construction investment previews', () => {
  it('shows the paid resource component and bounded yield without claiming the other component is recovered', () => {
    const b = board(), run = baseFor(b);
    expect(investmentPreview(b, run, 'research')).toEqual({projectId: 'research', siteId: 'heater', funding: 'standard', payment: [3, 1], remainingInvestigations: 6,
      yield: {resource: 0, costToRecover: 3, investigationsToRecover: 3, maximum: 6, canRecover: true, otherResourceCost: 1}, bridge: null});
    const richer = baseFor(b, ['heater', 'cloud', 'river', 'heater']);
    expect(investmentPreview(b, richer, 'research', 'research')).toMatchObject({payment: [5, 0], yield: {costToRecover: 5, maximum: 5, otherResourceCost: 0}});
  });

  it('does not subtract a Builder refund from the printed recovery threshold', () => {
    const b = board({expeditionKit: 'builder'}), run = baseFor(b, ['heater', 'cloud']);
    expect(investmentPreview(b, run, 'network')).toBeNull();
    expect(investmentPreview(b, run, 'network', 'research')).toMatchObject({payment: [3, 2], yield: {resource: 1, costToRecover: 2, maximum: 6, otherResourceCost: 3}});
  });

  it('shows new bridge frontier separately from an unearned crossing bonus', () => {
    const b = board({expeditionKit: 'pathfinder'}), run = baseFor(b);
    expect(investmentPreview(b, run, 'bridge')).toMatchObject({yield: null, bridge: {newlyReachableIds: ['sequence'], pathfinderPotential: [2, 2]}});
    const reachable = baseFor(b, ['heater', 'cloud', 'rain', 'heater']);
    expect(investmentPreview(b, reachable, 'bridge')).toMatchObject({bridge: {newlyReachableIds: [], pathfinderPotential: [2, 2]}});
    expect(investmentPreview(board(), run, 'bridge').bridge.pathfinderPotential).toEqual([0, 0]);
  });

  it('shows onward bridge savings with home camp first and legal tactical move counts', () => {
    const b = longBridgeBoard({travelLimit: 3}), run = longBridgeRun(b);
    expect(engine.validateBoard(b)).toEqual([]);
    expect(engine.derive(b, run).position).toBe('cloud');
    const routes = investmentPreview(b, run, 'bridge').bridge.routeSavings;
    expect(routes).toEqual([
      {id: 'heater', beforeSegments: 6, afterSegments: 2, beforeMoves: 2, afterMoves: 1, visited: true},
      {id: 'river', beforeSegments: 7, afterSegments: 3, beforeMoves: 3, afterMoves: 1, visited: false},
      {id: 'cooler', beforeSegments: 4, afterSegments: 2, beforeMoves: 2, afterMoves: 1, visited: true}
    ]);
    const built = simulatePlan(b, run, ['bridge']);
    for (const route of routes) {
      const path = engine.routeTo(b, built.progress, route.id), waypoints = [];
      for (let step = 3; step < path.length - 1; step += 3) waypoints.push(path[step]);
      waypoints.push(route.id);
      const journey = simulatePlan(b, built.run, waypoints);
      expect(journey.steps).toHaveLength(route.afterMoves);
      expect(journey.progress.position).toBe(route.id);
      expect(journey.status).not.toBe('invalid');
    }
  });

  it('distinguishes physical shortening from move savings and keeps a sole endpoint comparison', () => {
    const b = board({travelLimit: 3}), run = baseFor(b, ['heater', 'cloud', 'rain', 'heater']);
    expect(investmentPreview(b, run, 'bridge').bridge.routeSavings).toEqual([
      {id: 'sequence', beforeSegments: 3, afterSegments: 1, beforeMoves: 1, afterMoves: 1, visited: false}
    ]);
    const unlimited = longBridgeBoard(), unlimitedRun = longBridgeRun(unlimited);
    expect(investmentPreview(unlimited, unlimitedRun, 'bridge').bridge.routeSavings.every(route => route.beforeMoves === 1 && route.afterMoves === 1)).toBe(true);
  });

  it('does not claim savings through unresolved intermediate spaces or for newly connected destinations', () => {
    const b = board({travelLimit: 3}), run = baseFor(b);
    const preview = investmentPreview(b, run, 'bridge').bridge;
    expect(preview.newlyReachableIds).toEqual(['sequence']);
    expect(preview.routeSavings).toEqual([]);
    expect(preview.routeSavings.some(route => ['sequence', 'weather'].includes(route.id))).toBe(false);
  });

  it('only offers onward routes that fit the move slots left after construction', () => {
    const b = longBridgeBoard({travelLimit: 3}), base = longBridgeRun(b);
    const finalRun = {...base, turn: engine.MAX_TURNS - 1, steps: {...base.steps, ['t' + (engine.MAX_TURNS - 1)]: engine.emptyStep()}};
    expect(investmentPreview(b, finalRun, 'bridge').bridge.routeSavings).toEqual([]);
    // Make the shortcut less powerful: the river still needs two moves.
    b.projects.find(project => project.id === 'bridge').effect.targetId = 'cooler';
    const oneLeft = {...base, turn: engine.MAX_TURNS - 2, steps: {...base.steps, ['t' + (engine.MAX_TURNS - 2)]: engine.emptyStep()}};
    const routes = investmentPreview(b, oneLeft, 'bridge').bridge.routeSavings;
    expect(routes.length).toBeGreaterThan(0);
    expect(routes.every(route => route.afterMoves <= 1)).toBe(true);
    expect(routes.some(route => route.id === 'river')).toBe(false);
  });

  it('keeps bridge route projections independent of answers, random rolls, and mutable input', () => {
    const b = longBridgeBoard({travelLimit: 3, chance: true}), run = longBridgeRun(b);
    run.steps.t0.answers = {privateStudent: {value: '1', correct: true}};
    const snapshot = JSON.stringify({b, run});
    for (const node of b.locations) for (const field of ['answer', 'order', 'controls', 'explanation']) Object.defineProperty(node, field, {get() { throw Error('Read a solution'); }});
    freezeDeep(run);
    const random = vi.spyOn(Math, 'random');
    try {
      const routes = investmentPreview(b, run, 'bridge').bridge.routeSavings;
      expect(routes).toHaveLength(3);
      expect(JSON.stringify(routes)).not.toContain('privateStudent');
      expect(JSON.stringify(run)).toBe(JSON.stringify(JSON.parse(snapshot).run));
      expect(random).not.toHaveBeenCalled();
    } finally { random.mockRestore(); }
  });

  it('never repeats Pathfinder potential after another bridge has already earned it', () => {
    const b = board({expeditionKit: 'pathfinder'});
    b.projects.find(project => project.id === 'network').effect = {kind: 'path', targetId: 'weather'};
    b.projects.find(project => project.id === 'network').cost = [1, 1];
    let run = baseFor(b, ['heater', 'cloud', 'heater', 'bridge', 'sequence']);
    const site = engine.buildSite(b, 'network');
    run = simulatePlan(b, run, [site]).run;
    expect(engine.derive(b, run).kitCount).toBe(1);
    expect(investmentPreview(b, run, 'network').bridge.pathfinderPotential).toEqual([0, 0]);
  });

  it('caps yield and bridge opportunities by move slots after paying for construction', () => {
    const b = board({expeditionKit: 'pathfinder'}), base = baseFor(b);
    for (const slots of [0, 1, 2]) {
      const turn = engine.MAX_TURNS - 1 - slots, run = {...base, turn, steps: {...base.steps, ['t' + turn]: engine.emptyStep()}};
      expect(investmentPreview(b, run, 'research')).toMatchObject({remainingInvestigations: slots, yield: {maximum: slots, canRecover: false}});
      expect(investmentPreview(b, run, 'bridge').bridge.pathfinderPotential).toEqual(slots ? [2, 2] : [0, 0]);
      if (!slots) expect(investmentPreview(b, run, 'bridge').bridge.newlyReachableIds).toEqual([]);
    }
  });

  it('rejects wrong phases, sites, unaffordable or invalid payment, locations, and non-tabletop boards', () => {
    const b = board(), base = baseFor(b), review = engine.merge(base, engine.begin(b, base, 'research'));
    const active = engine.merge(base, engine.begin(b, base, 'river'));
    for (const [current, id, funding] of [[engine.emptyRun(), 'research'], [baseFor(b, ['heater', 'cloud']), 'research'], [base, 'network'], [base, 'research', 'research'], [base, 'research', 'invalid'], [base, 'river'], [review, 'bridge'], [active, 'bridge']]) {
      expect(investmentPreview(b, current, id, funding)).toBeNull();
      expect(investmentComparisons(b, current, id, funding)).toEqual([]);
    }
    expect(investmentPreview(makeBoard(), base, 'research')).toBeNull();
    expect(investmentPreview(b, {...base, turn: engine.MAX_TURNS}, 'research')).toBeNull();
  });
});

describe('Build now and prepare first comparisons', () => {
  it('compares complete legal routes and matches independent engine play', () => {
    const b = board(), base = baseFor(b), options = investmentComparisons(b, base, 'research');
    expect(options.map(item => item.locationId)).toEqual(['river', 'rain']);
    for (const option of options) for (const plan of option.plans) {
      expect(plan.result.steps).toHaveLength(3);
      expect(mechanics(plan.result.progress)).toEqual(mechanics(execute(b, base, plan.entries)));
    }
    const [a, second] = options[0].plans;
    expect(a.entries).toEqual([{id: 'research', funding: 'standard'}, 'river', 'heater']);
    expect(second.entries).toEqual(['river', 'heater', {id: 'research', funding: 'standard'}]);
    expect(a.result.progress.balance).toEqual([4, 2]);
    expect(second.result.progress.balance).toEqual([3, 2]);
    expect(a.result.steps.map(step => step.kind)).toEqual(['build', 'explore', 'travel']);
    expect(second.result.steps.map(step => step.kind)).toEqual(['explore', 'travel', 'build']);
  });

  it('preserves an intentional exchange in A while using a newly affordable printed payment in B', () => {
    const b = board(), base = baseFor(b, ['heater', 'cloud']), options = investmentComparisons(b, base, 'network', 'research');
    const {plans} = options.find(item => item.locationId === 'rain');
    expect(plans[0].entries[0]).toEqual({id: 'network', funding: 'research'});
    expect(plans[1].entries.at(-1)).toEqual({id: 'network', funding: 'standard'});
    expect(plans[0].result.progress.balance).toEqual([3, 2]);
    expect(plans[1].result.progress.balance).toEqual([5, 0]);
  });

  it('uses the first legal exchanged payment in B when preparing still cannot fund the printed cost', () => {
    const b = board(), base = baseFor(b, ['heater', 'cloud']);
    b.locations.find(node => node.id === 'rain').reward = [2, 0];
    const {plans} = investmentComparisons(b, base, 'network', 'research').find(item => item.locationId === 'rain');
    expect(plans[1].entries.at(-1)).toEqual({id: 'network', funding: 'research'});
    expect(plans[1].result.steps.at(-1).payment).toEqual([3, 2]);
  });

  it('does not suggest currently unreachable investigations or more than three comparisons', () => {
    const b = board(), run = baseFor(b);
    expect(investmentComparisons(b, run, 'bridge').map(item => item.locationId)).not.toContain('sequence');
    b.edges.push(['heater', 'lake'], ['heater', 'cooler'], ['heater', 'weather']);
    const comparisons = investmentComparisons(b, run, 'research');
    expect(comparisons).toHaveLength(3);
    expect(new Set(comparisons.map(item => item.locationId)).size).toBe(3);
  });

  it('includes contract and kit rewards once and never rewards the return journey', () => {
    const b = board({expeditionKit: 'builder', contracts: [{id: 'survey', title: 'River survey', description: 'Visit the river.', locations: ['heater', 'river'], reward: [0, 3]}]}), base = baseFor(b);
    const {plans} = investmentComparisons(b, base, 'research').find(item => item.locationId === 'river');
    for (const plan of plans) {
      expect(plan.result.progress).toMatchObject({completedContracts: ['survey'], contractGains: [0, 3], kitCount: 1, kitGains: [0, 2]});
      expect(plan.result.steps.filter(step => step.kind === 'travel')[0].change).toEqual([0, 0]);
      expect(mechanics(plan.result.progress)).toEqual(mechanics(execute(b, base, plan.entries)));
    }
  });

  it('retains a completed A return while B still needs to use its construction and deliver', () => {
    const b = board({goal: 'core'}); b.locations[0].reward = [3, 2];
    const base = baseFor(b, ['heater', 'cloud', 'heater', 'bridge']);
    const {plans} = investmentComparisons(b, base, 'research').find(item => item.locationId === 'river');
    expect(plans[0].result.status).toBe('complete');
    expect(plans[0].result.progress).toMatchObject({returned: true, complete: true});
    expect(plans[1].result.progress).toMatchObject({returned: false, complete: false});
    expect(investmentPreview(b, plans[0].result.run, 'network')).toBeNull();
    expect(investmentComparisons(b, plans[0].result.run, 'network')).toEqual([]);
  });

  it('omits alternatives whose preparation completes the game before its proposed build', () => {
    const b = board({goal: 'core'}); b.locations[0].reward = [3, 3]; b.locations[1].reward = [3, 3];
    const base = baseFor(b, ['heater', 'cloud', {id: 'network', funding: 'standard'}, 'rain', 'heater', {id: 'bridge', funding: 'standard'}]);
    expect(investmentPreview(b, base, 'research')).not.toBeNull();
    expect(investmentComparisons(b, base, 'research')).toEqual([]);
  });

  it('requires three real remaining slots and accepts a full route ending in the final slot', () => {
    const b = board(), base = baseFor(b);
    for (const slots of [1, 2, 3]) {
      const turn = engine.MAX_TURNS - slots, run = {...base, turn, steps: {...base.steps, ['t' + turn]: engine.emptyStep()}};
      const comparisons = investmentComparisons(b, run, 'research');
      if (slots < 3) expect(comparisons).toEqual([]);
      else {
        expect(comparisons.length).toBeGreaterThan(0);
        expect(comparisons[0].plans.every(plan => plan.result.steps.length === 3 && plan.result.status === 'turn-limit')).toBe(true);
      }
    }
  });

  it('preserves frozen inputs and strips real answers, names, votes, and future fortune from simulations', () => {
    const b = board({chance: true}), base = baseFor(b);
    base.steps.t0.answers = {privateStudent: {value: '1', correct: true}};
    base.steps.t0.result.marks = {privateStudent: true};
    base.steps['t' + base.turn].votes = {privateStudent: 'river'};
    const snapshot = JSON.stringify({b, base}); freezeDeep(b); freezeDeep(base);
    const random = vi.spyOn(Math, 'random');
    try {
      const preview = investmentPreview(b, base, 'research'), comparisons = investmentComparisons(b, base, 'research');
      expect(preview).not.toBeNull();
      expect(comparisons.length).toBeGreaterThan(0);
      expect(JSON.stringify(comparisons)).not.toContain('privateStudent');
      for (const comparison of comparisons) for (const plan of comparison.plans) {
        expect(Object.values(plan.result.run.steps).every(step => !Object.keys(step.answers || {}).length && !Object.keys(step.votes || {}).length)).toBe(true);
        expect(plan.result.progress.performance).toEqual({});
        expect(plan.result.progress.fortune).toEqual([0, 0]);
        expect(plan.result.steps).toHaveLength(3);
      }
      expect(JSON.stringify({b, base})).toBe(snapshot);
      expect(random).not.toHaveBeenCalled();
    } finally { random.mockRestore(); }
  });

  it('never reads challenge answer keys when computing either choice', () => {
    const b = board(), base = baseFor(b);
    for (const node of b.locations) for (const field of ['answer', 'order', 'controls', 'explanation']) Object.defineProperty(node, field, {get() { throw Error('Read a solution'); }});
    expect(investmentPreview(b, base, 'research')).not.toBeNull();
    expect(investmentComparisons(b, base, 'research')).toHaveLength(2);
  });
});
