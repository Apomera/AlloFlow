import { beforeAll, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import * as engine from '../lesson_board_engine.js';
import { encounterDecision } from '../lesson_board_encounter_preview.js';
import { activeAssignments, assignmentItineraries } from '../lesson_board_assignments.js';
import { simulatePlan } from '../lesson_board_sandbox.js';

const require = createRequire(import.meta.url), { makeBoard } = require('../dev-tools/fixtures/lesson_board.cjs');
let forecastTabletopMove;
beforeAll(() => {
  window.React = require('../desktop/web-app/node_modules/react');
  const options = { stdin: { contents: "export {forecastTabletopMove} from './lesson_board_tactical_preview.jsx';", resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', globalName: 'RelayForecast', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment' };
  const script = "process.stdout.write(require('esbuild').buildSync(" + JSON.stringify(options) + ").outputFiles[0].text)";
  const source = require('node:child_process').execFileSync(process.execPath, ['-e', script], { encoding: 'utf8' });
  forecastTabletopMove = new Function(source + ';return RelayForecast.forecastTabletopMove;')();
});
const next = (board, run) => engine.merge(run, engine.advance(board, run));
const choose = (board, run, id) => engine.merge(run, engine.chooseFieldOpportunity(board, run, id));
function move(board, run, id, die = 1) {
  if (engine.stepOf(run).phase === 'review') run = next(board, run);
  run = engine.merge(run, engine.begin(board, run, id));
  if (engine.stepOf(run).phase !== 'answer') return run;
  const node = board.locations.find(node => node.id === id);
  run = engine.merge(run, engine.processAction(board, run, { attemptId: 'relay-strategy', turn: run.turn, requestId: engine.requestId(run), kind: 'answer', targetId: id, value: engine.solution(node) }, 'solo', { attemptId: 'relay-strategy', active: true }));
  return engine.merge(run, engine.resolve(board, run, { solo: {} }, { dice: [die, die] }));
}
function fixture(commission = false) {
  const board = { ...makeBoard(), playStyle: 'tabletop', chance: true, goal: 'expedition', travelLimit: 3 };
  board.edges = board.locations.slice(1).map((node, i) => [board.locations[i].id, node.id]);
  let run = engine.emptyRun();
  for (const [i, id] of ['heater', 'cloud', 'river', 'rain', 'lake'].entries()) {
    run = move(board, run, id, i === 4 ? 11 : i === 1 && commission ? 6 : 1);
    if (i === 1) run = choose(board, run, commission ? 'commission:research' : 'collect');
  }
  const offer = engine.fieldOpportunity(board, run).relays[0];
  return { board, run, offer };
}

describe('Relay strategy integration', () => {
  it('compares both reward schedules privately without collecting their reserved supplies', () => {
    const { board, run } = fixture(), before = JSON.stringify([board, run]);
    const model = encounterDecision(board, run), options = model.groups.find(group => group.id === 'relay').choices;
    expect(options).toHaveLength(2);
    for (const option of options) {
      const preview = encounterDecision(board, run, option.id).preview;
      expect(preview.kind).toBe('relay'); expect(preview.before).toEqual(preview.after);
      expect(preview.spent).toEqual([0, 0]); expect(preview.gain).toEqual([0, 0]);
      expect(preview.reserved).toMatchObject({ trigger: 'relay', reward: option.reward, stops: option.stops });
      expect(preview.inspectIds).toEqual(option.stops.map(stop => stop.targetId));
      preview.reserved.stops[0].reward[0] = 999;
    }
    expect(JSON.stringify([board, run])).toBe(before);
    expect(engine.stepOf(run).result.fieldChoice).toBe('pending');
  });

  it('follows both ordered stops and completes the assignment only after the final handoff', () => {
    const { board, run: pending, offer } = fixture();
    const run = next(board, choose(board, pending, offer.id)), before = JSON.stringify([board, run]);
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw Error('No forecast rolls'); });
    try {
      const assignment = activeAssignments(board, run)[0], plan = assignmentItineraries(board, run).plans[0];
      expect(assignment).toMatchObject({ kind: 'relay', targetId: offer.stops[0].targetId, stage: 0, reward: offer.reward });
      expect(plan.entries).toEqual(offer.stops.map(stop => stop.targetId));
      expect(plan.completed).toEqual([assignment.id]); expect(plan.reward).toEqual(offer.reward);
      expect(plan.result).toEqual(simulatePlan(board, run, plan.entries));
      const first = simulatePlan(board, run, [offer.stops[0].targetId]);
      expect(first.progress.fieldRelay.stage).toBe(1);
      expect(first.progress.fieldDeliveries.at(-1)).toMatchObject({ kind: 'relay-stop', gain: offer.stops[0].reward });
      expect(plan.result.progress.fieldRelay).toBeFalsy();
      expect(JSON.stringify([board, run])).toBe(before);
    } finally { random.mockRestore(); }
  });

  it('keeps the assignment identity after the first handoff and forecasts only the remaining payout', () => {
    const { board, run: pending, offer } = fixture();
    const run = next(board, choose(board, pending, offer.id)), original = activeAssignments(board, run)[0];
    const afterFirst = next(board, move(board, run, offer.stops[0].targetId));
    const assignment = activeAssignments(board, afterFirst)[0], plan = assignmentItineraries(board, afterFirst).plans[0];
    expect(assignment.id).toBe(original.id); expect(assignment.stage).toBe(1);
    expect(assignment.targetId).toBe(offer.stops[1].targetId); expect(assignment.reward).toEqual(offer.stops[1].reward);
    expect(plan.entries).toEqual([offer.stops[1].targetId]); expect(plan.reward).toEqual(offer.stops[1].reward);
    expect(plan.completed).toEqual([assignment.id]);
  });

  it('compares relay and construction priorities through the authoritative simulator', () => {
    const { board, run: pending, offer } = fixture(true), run = next(board, choose(board, pending, offer.id));
    const assignments = activeAssignments(board, run), ids = assignments.map(item => item.id);
    expect(assignments.map(item => item.kind)).toEqual(['relay', 'commission']);
    const report = assignmentItineraries(board, run, ids);
    expect(report.plans).toHaveLength(2);
    for (const plan of report.plans) {
      expect(plan.status).toBe('ready'); expect(plan.completed).toEqual(ids);
      expect(plan.result).toEqual(simulatePlan(board, run, plan.entries));
      expect(plan.reward).toEqual(offer.reward.map((amount, i) => amount + assignments[1].reward[i]));
    }
    expect(report.plans[0].entries).not.toEqual(report.plans[1].entries);
  });

  it('previews the current handoff only; visiting the later station first has no relay income', () => {
    const { board, run: pending, offer } = fixture(), run = next(board, choose(board, pending, offer.id));
    const first = forecastTabletopMove(board, run, offer.stops[0].targetId);
    const wrong = forecastTabletopMove(board, run, offer.stops[1].targetId);
    expect(first.relayGain).toEqual(offer.stops[0].reward); expect(first.deliveryGain).toEqual([0, 0]);
    expect(wrong.relayGain).toEqual([0, 0]);
    const afterFirst = next(board, move(board, run, offer.stops[0].targetId));
    expect(forecastTabletopMove(board, afterFirst, offer.stops[1].targetId).relayGain).toEqual(offer.stops[1].reward);
  });
});
