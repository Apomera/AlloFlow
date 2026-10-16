import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import * as engine from '../lesson_board_engine.js';
import { activeAssignments, assignmentItineraries } from '../lesson_board_assignments.js';
import { simulatePlan, PLAN_LIMIT } from '../lesson_board_sandbox.js';

const { makeBoard } = createRequire(import.meta.url)('../dev-tools/fixtures/lesson_board.cjs');
const copy = value => JSON.parse(JSON.stringify(value));
function board(options = {}) {
  const b = { ...makeBoard(), playStyle: 'tabletop', chance: true, goal: 'expedition', ...options };
  b.edges = b.locations.slice(1).map((node, index) => [b.locations[index].id, node.id]);
  return b;
}
const next = (b, run) => engine.merge(run, engine.advance(b, run));
const choose = (b, run, choice) => engine.merge(run, engine.chooseFieldOpportunity(b, run, choice));
function move(b, run, id, die = 1) {
  if (engine.stepOf(run).phase === 'review') run = next(b, run);
  run = engine.merge(run, engine.begin(b, run, id));
  if (engine.stepOf(run).phase !== 'answer') return run;
  const node = b.locations.find(item => item.id === id);
  run = engine.merge(run, engine.processAction(b, run, { attemptId: 'assignment-test', requestId: engine.requestId(run), turn: run.turn, kind: 'answer', targetId: id, value: engine.solution(node) }, 'solo', { attemptId: 'assignment-test', active: true }));
  return engine.merge(run, engine.resolve(b, run, { solo: {} }, { dice: [die, die] }));
}
const pending = (b, die = 1) => move(b, move(b, engine.emptyRun(), 'heater'), 'cloud', die);
function pair(b, first = 'delivery:heater', second = 'commission:network') {
  let run = choose(b, pending(b), first);
  for (const id of ['river', 'rain']) run = move(b, run, id);
  run = move(b, run, 'lake', 7);
  return next(b, choose(b, run, second));
}
const idsByKind = (b, run) => Object.fromEntries(activeAssignments(b, run).map(item => [item.kind, item.id]));
const entryId = entry => typeof entry === 'string' ? entry : entry.id;
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }

describe('Saved assignment itineraries', () => {
  it('lists only active named commitments with stable origin IDs and detached rewards', () => {
    const b = board(), run = pair(b), assignments = activeAssignments(b, run);
    expect(assignments).toEqual([
      { id: 'delivery:1:heater', kind: 'delivery', originTurn: 1, eventId: 'survey', targetId: 'heater', reward: [3, 0] },
      { id: 'commission:4:network', kind: 'commission', originTurn: 4, eventId: 'supplies', projectId: 'network', reward: [1, 3] }
    ]);
    assignments[0].reward[0] = 999;
    expect(activeAssignments(b, run)[0].reward).toEqual([3, 0]);
    expect(activeAssignments(b, next(b, choose(b, pending(b), 'crew')))).toEqual([]);
    expect(activeAssignments(b, next(b, choose(b, pending(b), 'prepare')))).toEqual([]);
    expect(activeAssignments({ ...b, chance: false }, run)).toEqual([]);
  });

  it('waits until a move can be chosen and rejects invalid or repeated assignment selections', () => {
    const b = board(), waiting = choose(b, pending(b), 'lead:cooler'), run = next(b, waiting), id = activeAssignments(b, run)[0].id;
    expect(assignmentItineraries({ ...b, playStyle: 'learning' }, run)).toBeNull();
    expect(assignmentItineraries({ ...b, chance: false }, run)).toBeNull();
    expect(assignmentItineraries(b, waiting)).toMatchObject({ status: 'finish-move', plans: [] });
    expect(assignmentItineraries(b, engine.emptyRun())).toMatchObject({ status: 'none', plans: [] });
    expect(assignmentItineraries(b, run, [])).toMatchObject({ status: 'none', plans: [] });
    for (const invalid of [[id, id], ['missing'], [id, 'missing', 'third'], id, null]) expect(assignmentItineraries(b, run, invalid)).toMatchObject({ status: 'invalid-selection', plans: [] });
  });

  it('constructs one legal investigation itinerary without rolling or anticipating future encounters', () => {
    const b = board(), run = next(b, choose(b, pending(b), 'lead:cooler')), random = vi.spyOn(Math, 'random').mockImplementation(() => { throw Error('Do not roll a projection'); });
    try {
      const report = assignmentItineraries(b, run), plan = report.plans[0];
      expect(report.status).toBe('ready'); expect(report.plans).toHaveLength(1);
      expect(plan.status).toBe('ready'); expect(plan.reason).toBeNull();
      expect(plan.entries.map(entryId)).toEqual(['river', 'rain', 'lake', 'sequence', 'cooler']);
      expect(plan.completed).toEqual(['lead:1:cooler']); expect(plan.reward).toEqual([2, 1]);
      expect(plan.segments).toBe(5); expect(plan.firstMove).toBe('river');
      expect(plan.result.progress.fortune).toEqual(engine.derive(b, run).fortune);
      expect(plan.result.progress.fieldEvents).toEqual(engine.derive(b, run).fieldEvents);
      expect(plan.result).toEqual(simulatePlan(b, run, plan.entries));
    } finally { random.mockRestore(); }
  });

  it('compares delivery-first with build-first and preserves actual segment and payment differences', () => {
    const b = board(), run = pair(b), ids = idsByKind(b, run), report = assignmentItineraries(b, run, [ids.delivery, ids.commission]);
    const [deliver, build] = report.plans;
    expect(deliver.order).toEqual([ids.delivery, ids.commission]); expect(build.order).toEqual([ids.commission, ids.delivery]);
    expect(deliver.entries).toEqual(['heater', 'cloud', { id: 'network', funding: 'standard' }]);
    expect(build.entries).toEqual(['cloud', { id: 'network', funding: 'standard' }, 'heater']);
    expect(deliver.segments).toBe(5); expect(build.segments).toBe(4);
    for (const plan of report.plans) {
      expect(plan.status).toBe('ready'); expect(plan.completed).toEqual([ids.delivery, ids.commission]);
      expect(plan.reward).toEqual([4, 3]); expect(plan.result.steps.find(step => step.id === 'network').payment).toEqual([1, 3]);
    }
  });

  it('lets an earned delivery fund construction while the opposite order stops before borrowing the reserved reward', () => {
    const b = board(); b.locations.forEach((node, index) => { node.reward = index < 5 ? [0, 1] : [3, 3]; }); b.projects.find(project => project.id === 'network').cost = [3, 5];
    const run = pair(b), before = engine.derive(b, run), ids = idsByKind(b, run), [deliver, build] = assignmentItineraries(b, run, [ids.delivery, ids.commission]).plans;
    expect(engine.validateBoard(b)).toEqual([]); expect(before.balance).toEqual([0, 6]);
    expect(deliver.status).toBe('ready'); expect(deliver.result.steps.find(step => step.id === 'network').payment).toEqual([3, 5]);
    expect(deliver.result.progress.balance).toEqual([1, 4]); expect(deliver.reward).toEqual([4, 3]);
    expect(build).toMatchObject({ status: 'blocked', reason: 'unaffordable', entries: ['cloud'], completed: [], reward: [0, 0] });
    expect(build.result.progress.balance).toEqual(before.balance);
  });

  it('uses a legal alternate construction payment only after paying its full upfront cost', () => {
    const b = board(); b.projects.find(project => project.id === 'research').cost = [6, 0];
    const run = next(b, choose(b, pending(b, 6), 'commission:research')), plan = assignmentItineraries(b, run).plans[0];
    expect(plan.status).toBe('ready'); expect(plan.entries).toEqual(['heater', { id: 'research', funding: 'build' }]);
    expect(plan.result.steps.at(-1).payment).toEqual([5, 2]);
    expect(plan.result.progress.balance).toEqual([3, 1]); expect(plan.reward).toEqual([3, 1]);
  });

  it('skips a second assignment already completed incidentally along the first journey', () => {
    const b = board({ starts: ['heater', 'weather'] });
    let run = choose(b, pending(b), 'lead:cooler');
    for (const id of ['river', 'rain']) run = move(b, run, id);
    run = next(b, choose(b, move(b, run, 'lake', 6), 'commission:research'));
    const ids = idsByKind(b, run);
    expect(engine.buildSite(b, 'research')).toBe('weather');
    const report = assignmentItineraries(b, run, [ids.commission, ids.lead]);
    const plan = report.plans[0];
    expect(plan.status).toBe('ready');
    expect(plan.entries.map(entryId).filter(id => id === 'cooler')).toHaveLength(1);
    expect(plan.completed).toEqual([ids.lead, ids.commission]);
    expect(plan.result.steps.at(-1).kind).toBe('build');
  });

  it('splits cleared routes into legal waypoints and does not deliver while merely crossing the station', () => {
    const b = board({ travelLimit: 3 }), run = pair(b), ids = idsByKind(b, run), [deliver] = assignmentItineraries(b, run, [ids.delivery, ids.commission]).plans;
    expect(deliver.entries).toEqual(['cloud', 'heater', 'cloud', { id: 'network', funding: 'standard' }]);
    expect(deliver.result.steps.filter(step => step.path).every(step => step.path.length - 1 <= 3)).toBe(true);
    expect(deliver.result.progress.fieldDeliveries.find(item => item.kind === 'delivery').turn).toBe(run.turn + 1);
    expect(deliver.segments).toBe(5);
  });

  it('stops cleanly at the remaining move limit without attempting unpaid construction', () => {
    const b = board(); let run = next(b, choose(b, pending(b, 7), 'commission:network'));
    while (run.turn < engine.MAX_TURNS - 1) {
      const target = engine.derive(b, run).position === 'heater' ? 'cloud' : 'heater';
      run = move(b, run, target); if (run.turn < engine.MAX_TURNS - 1) run = next(b, run);
    }
    const plan = assignmentItineraries(b, run).plans[0];
    expect(plan.status).toBe('blocked'); expect(plan.reason).toBe('turn-limit');
    expect(plan.entries).toHaveLength(1); expect(plan.result.steps[0].kind).toBe('travel');
    expect(plan.completed).toEqual([]); expect(plan.reward).toEqual([0, 0]);
  });

  it('shows an early home delivery ending the mission before an optional commission, while the reverse order completes both', () => {
    const b = board(); let run = choose(b, pending(b, 7), 'commission:network');
    for (const id of ['heater', 'research', 'river', 'heater', 'bridge', 'rain']) run = move(b, run, id);
    run = choose(b, move(b, run, 'lake', 2), 'delivery:heater');
    for (const id of ['sequence', 'cooler', 'weather']) run = move(b, run, id);
    run = next(b, choose(b, run, 'collect'));
    expect(engine.derive(b, run)).toMatchObject({ objectiveReady: true, complete: false });
    const ids = idsByKind(b, run), [home, build] = assignmentItineraries(b, run, [ids.delivery, ids.commission]).plans;
    expect(home).toMatchObject({ status: 'blocked', reason: 'mission-complete', completed: [ids.delivery], reward: [3, 0] });
    expect(home.result.progress.complete).toBe(true); expect(home.entries).toEqual(['heater']);
    expect(build.status).toBe('complete'); expect(build.reason).toBeNull();
    expect(build.entries).toEqual(['cloud', { id: 'network', funding: 'standard' }, 'heater']);
    expect(build.completed).toEqual([ids.delivery, ids.commission]); expect(build.reward).toEqual([4, 3]);
    expect(assignmentItineraries(b, build.result.run)).toMatchObject({ status: 'complete', assignments: [], plans: [] });
  });

  it('keeps keyed drafts independent from responses and invalidates them when board or history changes', () => {
    const b = board(), run = pair(b), original = assignmentItineraries(b, run), answers = copy(run);
    answers.steps.t0.answers = { learner: 'private response' }; answers.steps.t0.result.marks = { learner: false };
    expect(assignmentItineraries(b, answers).key).toBe(original.key);
    const changed = copy(b); changed.projects[0].cost[0] += 1;
    expect(assignmentItineraries(changed, run).key).not.toBe(original.key);
    const history = copy(run); history.steps.t0.result.dice = [2];
    expect(assignmentItineraries(b, history).key).not.toBe(original.key);
    expect(original.key).not.toContain('private response');
  });

  it('leaves frozen boards and histories unchanged and counts only named commitment payouts', () => {
    const b = board({ expeditionKit: 'builder' }), run = pair(b), original = JSON.stringify([b, run]);
    freeze(b); freeze(run);
    const result = assignmentItineraries(b, run);
    expect(JSON.stringify([b, run])).toBe(original);
    for (const plan of result.plans) {
      expect(plan.entries.length).toBeLessThanOrEqual(PLAN_LIMIT);
      expect(plan.reward).toEqual([4, 3]);
      expect(plan.result.progress.kitGains).toEqual([0, 2]);
      expect(plan.result).toEqual(simulatePlan(b, run, plan.entries));
    }
  });
});
