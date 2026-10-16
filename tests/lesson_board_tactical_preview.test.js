import { beforeAll, describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import * as engine from '../lesson_board_engine.js';
import {planningBase,simulatePlan} from '../lesson_board_sandbox.js';
const require = createRequire(import.meta.url), { makeBoard } = require('../dev-tools/fixtures/lesson_board.cjs');
let forecastTabletopMove;
const board = expeditionKit => ({ ...makeBoard(), playStyle: 'tabletop', ...(expeditionKit ? { expeditionKit } : {}) });
const choose = (b, run) => engine.stepOf(run).phase === 'review' ? engine.merge(run, engine.advance(b, run)) : run;
function move(b, before, id, fortune = 1) {
  let run = choose(b, before); run = engine.merge(run, engine.begin(b, run, id));
  if (engine.stepOf(run).phase === 'answer') {
    const node = b.locations.find(item => item.id === id), action = { attemptId: 'attempt', turn: run.turn, requestId: engine.requestId(run), kind: 'answer', targetId: id, value: engine.solution(node) };
    run = engine.merge(run, engine.processAction(b, run, action, 'solo', { attemptId: 'attempt', active: true, paused: false }));
    const dice = Array.from({ length: engine.diceNeeded(b, run) }, () => fortune);
    run = engine.merge(run, engine.resolve(b, run, { solo: {} }, { dice }));
  }
  return run;
}
const sequence = (b, ids) => ids.reduce((run, id) => move(b, run, id), engine.emptyRun());
function freezeDeep(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freezeDeep); Object.freeze(value); } return value; }
beforeAll(() => {
  window.React = require('../desktop/web-app/node_modules/react');
  const bundle = require('node:child_process').execFileSync(process.execPath, ['-e', "process.stdout.write(require('esbuild').buildSync({stdin:{contents:\"export {forecastTabletopMove} from './lesson_board_tactical_preview.jsx';\",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'ForecastTest',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"], { encoding: 'utf8' });
  forecastTabletopMove = new Function(bundle + ';return ForecastTest.forecastTabletopMove;')();
});

describe('One-move tactical forecasts', () => {
  it('includes a destination reward only when the forecast solves its named investigation',()=>{
    const b={...board(),chance:true},waiting=sequence(b,['heater','cloud']);
    const run=engine.merge(waiting,engine.chooseFieldOpportunity(b,waiting,'lead:river')),snapshot=JSON.stringify(run);
    expect(forecastTabletopMove(b,run,'rain').leadGain).toEqual([0,0]);
    expect(forecastTabletopMove(b,run,'heater').leadGain).toEqual([0,0]);
    const forecast=forecastTabletopMove(b,run,'river');
    expect(forecast.leadGain).toEqual([1,2]);expect(forecast.preparationGain).toEqual([0,0]);
    expect(forecast.fieldGain).toEqual([1,2]);
    expect(forecast.balance).toEqual(engine.derive(b,move(b,run,'river')).balance);
    expect(JSON.stringify(run)).toBe(snapshot);
  });
  it('includes a reserved crew after a fully paid build without offering it as payment',()=>{
    const b={...board('builder'),chance:true},waiting=sequence(b,['heater','cloud']);
    let run=engine.merge(waiting,engine.chooseFieldOpportunity(b,waiting,'crew'));
    expect(forecastTabletopMove(b,run,'network')).toBeNull();
    run=move(b,run,'heater');
    const forecast=forecastTabletopMove(b,run,'research');
    expect(forecast.spent).toEqual([3,1]);expect(forecast.crewGain).toEqual([1,1]);
    expect(forecast.gain).toEqual([1,3]);
    expect(forecast.balance).toEqual(engine.derive(b,move(b,run,'research')).balance);
  });
  it('waits for the encounter decision, then includes committed preparation only on a new investigation', () => {
    const b={...board(),chance:true},pending=sequence(b,['heater','cloud']),snapshot=JSON.stringify(pending);
    expect(engine.fieldOpportunity(b,pending).pending).toBe(true);
    expect(forecastTabletopMove(b,pending,'river')).toBeNull();
    expect(forecastTabletopMove(b,pending,'heater')).toBeNull();
    expect(JSON.stringify(pending)).toBe(snapshot);
    const prepared=engine.merge(pending,engine.chooseFieldOpportunity(b,pending,'prepare'));
    const forecast=forecastTabletopMove(b,prepared,'river');
    expect(forecast.fieldGain).toEqual([2,0]);
    expect(forecast.balance).toEqual(engine.derive(b,move(b,prepared,'river')).balance);
    expect(forecastTabletopMove(b,prepared,'heater').fieldGain).toEqual([0,0]);
    const plan=simulatePlan(b,choose(b,prepared),['heater','river']);
    expect(plan.steps[1].balance).toEqual(forecast.balance);
    expect(plan.progress.fieldPreparation).toBeNull();
  });
  it('matches successful investigation supplies before fortune, including a contract and a new-concept kit bonus', () => {
    const b = { ...board('surveyor'), chance: true, contracts: [{ id: 'survey', title: 'River survey', description: 'Visit the heating and river stations.', locations: ['heater', 'river'], reward: [0, 3] }] };
    const run = move(b, engine.emptyRun(), 'heater'), before = engine.derive(b, run), forecast = forecastTabletopMove(b, run, 'river');
    const actual = engine.derive(b, move(b, run, 'river'));
    expect(forecast).toMatchObject({ investigation: true, travel: false, spent: [0, 0], gain: [4, 4], balance: [8, 5], kitGain: [2, 0], contracts: ['survey'], remaining: 6 });
    expect(forecast.balance).toEqual(actual.balance);
    expect(forecast.gain).toEqual(actual.balance.map((value, i) => value - before.balance[i]));
    const fortunate = engine.derive(b, move(b, run, 'river', 20));
    expect(fortunate.balance.map((value, i) => value - forecast.balance[i])).toEqual([2, 2]);
  });

  it('deducts a full construction cost before including a Builder refund', () => {
    const b = board('builder'), run = sequence(b, ['heater', 'cloud', 'heater']);
    const forecast = forecastTabletopMove(b, run, 'research'), actual = engine.derive(b, move(b, run, 'research'));
    expect(forecast).toMatchObject({ investigation: false, travel: false, spent: [3, 1], gain: [0, 2], kitGain: [0, 2], balance: [1, 3], contracts: [], remaining: 6 });
    expect(forecast.balance).toEqual(actual.balance);
    const atCloud = sequence(b, ['heater', 'cloud']);
    expect(forecastTabletopMove(b, atCloud, 'network')).toBeNull(); // [4,2] cannot prepay the [1,3] cost with its refund.
  });

  it('includes the first Pathfinder bridge crossing bonus, with no rewards for later cleared-space travel', () => {
    const b = board('pathfinder'), run = sequence(b, ['heater', 'cloud', 'heater', 'bridge']);
    const forecast = forecastTabletopMove(b, run, 'sequence'), crossed = move(b, run, 'sequence');
    expect(forecast).toMatchObject({ investigation: true, travel: false, gain: [4, 3], kitGain: [2, 2], balance: [6, 3] });
    expect(forecast.balance).toEqual(engine.derive(b, crossed).balance);
    const travel = forecastTabletopMove(b, crossed, 'heater');
    expect(travel).toMatchObject({ investigation: false, travel: true, gain: [0, 0], spent: [0, 0], kitGain: [0, 0], contracts: [] });
    expect(travel.balance).toEqual(engine.derive(b, move(b, crossed, 'heater')).balance);
  });

  it('forecasts and plans the selected exchanged payment without changing the real game', () => {
    const b=board('builder'),run=choose(b,sequence(b,['heater','cloud'])),snapshot=JSON.stringify(run);
    expect(forecastTabletopMove(b,run,'network')).toBeNull();
    const forecast=forecastTabletopMove(b,run,'network','research');
    const built=engine.merge(run,engine.begin(b,run,'network','research'));
    expect(forecast).toMatchObject({spent:[3,2],gain:[0,2],balance:[1,2]});
    expect(forecast.balance).toEqual(engine.derive(b,built).balance);
    expect(forecastTabletopMove(b,run,'network','invalid')).toBeNull();
    const plan=simulatePlan(b,run,['network']);
    expect(plan.steps[0]).toMatchObject({funding:'research',balance:[1,2]});
    expect(engine.derive(b,planningBase(built)).balance).toEqual(engine.derive(b,built).balance);
    expect(JSON.stringify(run)).toBe(snapshot);
  });

  it('caps future building yield by the investigation moves still available', () => {
    const b = board('builder'), ready = choose(b, sequence(b, ['heater', 'cloud', 'heater']));
    for (const remaining of [0, 1, 2]) {
      const turn = engine.MAX_TURNS - 1 - remaining;
      const run = { ...ready, turn, steps: { ...ready.steps, ['t' + turn]: { phase: 'choose' } } };
      expect(forecastTabletopMove(b, run, 'research')).toMatchObject({ remaining });
    }
  });

  it('does not alter frozen board/run input, saved responses, selections, or real kit progress', () => {
    const b = board('surveyor'), run = move(b, engine.emptyRun(), 'heater');
    const before = JSON.stringify({ b, run }); freezeDeep(b); freezeDeep(run);
    const preview = forecastTabletopMove(b, run, 'river');
    expect(preview.kitGain).toEqual([2, 0]);
    expect(JSON.stringify({ b, run })).toBe(before);
    expect(engine.derive(b, run)).toMatchObject({ kitCount: 1, kitGains: [2, 0] });
    expect(engine.stepOf(run).targetId).toBe('heater');
  });

  it('does not forecast during an open response window or for unavailable destinations', () => {
    const b = board('surveyor'), empty = engine.emptyRun(), active = engine.merge(empty, engine.begin(b, empty, 'heater'));
    expect(forecastTabletopMove(b, active, 'river')).toBeNull();
    expect(forecastTabletopMove(b, empty, 'weather')).toBeNull();
    expect(forecastTabletopMove(b, empty, 'research')).toBeNull();
    expect(forecastTabletopMove(b, empty, 'missing')).toBeNull();
    expect(forecastTabletopMove(makeBoard(), empty, 'heater')).toBeNull();
  });

  it('does not suggest hypothetical moves after delivery or the final review slot', () => {
    const b = board();
    const complete = sequence(b, ['heater', 'cloud', 'heater', 'bridge', 'sequence', 'heater', 'research', 'sequence', 'heater']);
    expect(engine.derive(b, complete).complete).toBe(true);
    expect(forecastTabletopMove(b, complete, 'cloud')).toBeNull();
    const finalSlot = { turn: engine.MAX_TURNS - 1, steps: { ['t' + (engine.MAX_TURNS - 1)]: { phase: 'review', targetId: '', result: { success: true, marks: {} } } } };
    expect(forecastTabletopMove(b, finalSlot, 'heater')).toBeNull();
  });
});
