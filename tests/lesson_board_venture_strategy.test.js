import { beforeAll, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import * as engine from '../lesson_board_engine.js';
import { encounterDecision } from '../lesson_board_encounter_preview.js';
import { planningBase, planningKey, simulatePlan, ventureUncertainties } from '../lesson_board_sandbox.js';
import { investmentComparisons } from '../lesson_board_investment.js';

const require = createRequire(import.meta.url), React = require('../desktop/web-app/node_modules/react');
const { renderToStaticMarkup } = require('../desktop/web-app/node_modules/react-dom/server');
const { makeBoard } = require('../dev-tools/fixtures/lesson_board.cjs');
const copy = value => JSON.parse(JSON.stringify(value));
let UI;
beforeAll(() => {
  window.React = React;
  const options = { stdin: { contents: "export {forecastTabletopMove,VentureForecastNote,TacticalMoveDetails} from './lesson_board_tactical_preview.jsx';", resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', globalName: 'VentureStrategy', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment' };
  const source = require('node:child_process').execFileSync(process.execPath, ['-e', "process.stdout.write(require('esbuild').buildSync(" + JSON.stringify(options) + ").outputFiles[0].text)"], { encoding: 'utf8' });
  UI = new Function(source + ';return VentureStrategy;')();
});
const next = (board, run) => engine.merge(run, engine.advance(board, run));
const choose = (board, run, choice) => engine.merge(run, engine.chooseFieldOpportunity(board, run, choice));
function move(board, run, id, dice = [1, 1]) {
  if (engine.stepOf(run).phase === 'review') run = next(board, run);
  run = engine.merge(run, engine.begin(board, run, id));
  if (engine.stepOf(run).phase === 'answer') {
    run = engine.merge(run, engine.processAction(board, run, { attemptId: 'venture-strategy', turn: run.turn, requestId: engine.requestId(run), kind: 'answer', targetId: id, value: engine.solution(board.locations.find(node => node.id === id)) }, 'solo', { attemptId: 'venture-strategy', active: true }));
    run = engine.merge(run, engine.resolve(board, run, { solo: {} }, { dice }));
  }
  return run;
}
function fixture(resource = 0, changeBoard = () => {}) {
  const board = { ...makeBoard(), playStyle: 'tabletop', goal: 'expedition', chance: true, travelLimit: 3 };
  board.edges = board.locations.slice(1).map((node, i) => [board.locations[i].id, node.id]);
  changeBoard(board);
  const pending = move(board, move(board, engine.emptyRun(), 'heater'), 'cloud');
  return { board, pending, run: next(board, choose(board, pending, 'venture:' + resource)) };
}
function freezeDeep(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freezeDeep); Object.freeze(value); }
  return value;
}
const markup = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));

describe('Survey venture strategy forecasts', () => {
  it('compares both resource ventures as uncertain reservations without adding spendable money', () => {
    const { board, pending } = fixture(), before = JSON.stringify(pending);
    const choices = encounterDecision(board, pending).groups.find(group => group.id === 'venture').choices;
    expect(choices.map(choice => choice.id)).toEqual(['venture:0', 'venture:1']);
    for (const choice of choices) {
      const preview = encounterDecision(board, pending, choice.id).preview;
      expect(preview.before).toEqual(preview.after);
      expect(preview.gain).toEqual([0, 0]); expect(preview.spent).toEqual([0, 0]);
      expect(preview.reserved).toMatchObject({ trigger: 'venture', reward: choice.reward, uncertain: true, threshold: 11, resource: choice.resource });
      expect(preview.newlyFunded).toEqual([]);
    }
    expect(JSON.stringify(pending)).toBe(before);
  });

  it('excludes the possible reward from one-move and plan balances and consumes it at the first new investigation', () => {
    const { board, pending, run } = fixture(1);
    const baseline = next(board, choose(board, pending, 'crew'));
    const forecast = UI.forecastTabletopMove(board, run, 'river'), plan = simulatePlan(board, run, ['river', 'rain']);
    expect(forecast.balance).toEqual(UI.forecastTabletopMove(board, baseline, 'river').balance);
    expect(forecast.fieldGain).toEqual([0, 0]); expect(forecast).not.toHaveProperty('pendingVenture');
    expect(forecast.uncertainVentures).toEqual([{ turn: 2, originTurn: 1, kind: 'venture', targetId: 'river', resource: 1, reward: [0, 4], threshold: 11, outcome: 'unknown', gain: [0, 0] }]);
    expect(plan.steps[0].uncertainVentures).toEqual(forecast.uncertainVentures);
    expect(plan.steps[1]).not.toHaveProperty('uncertainVentures');
    expect(plan.uncertainVentures).toHaveLength(1); expect(plan.progress).not.toHaveProperty('fieldVenture');
    expect(plan.progress.balance).toEqual(simulatePlan(board, baseline, ['river', 'rain']).progress.balance);
    expect(plan.progress.fieldDeliveries.filter(item => item.kind === 'venture')).toHaveLength(1);
  });

  it('keeps a venture ready through travel and construction without rolling or awarding it', () => {
    const { board, run } = fixture(1), venture = engine.derive(board, run).fieldVenture;
    const travel = UI.forecastTabletopMove(board, run, 'heater');
    expect(travel.pendingVenture).toEqual(venture); expect(travel).not.toHaveProperty('uncertainVentures');
    const returned = next(board, move(board, run, 'heater'));
    const build = UI.forecastTabletopMove(board, returned, 'research');
    expect(build.pendingVenture).toEqual(venture); expect(build).not.toHaveProperty('uncertainVentures');
    const plan = simulatePlan(board, run, ['heater', 'research']);
    expect(plan.progress.fieldVenture).toEqual(venture); expect(plan).not.toHaveProperty('uncertainVentures');
    expect(plan.progress.fieldGains).toEqual([0, 0]); expect(plan.steps.every(step => !step.uncertainVentures)).toBe(true);
  });

  it('cannot use a possible find to fund a dependent construction', () => {
    const { board, run } = fixture(1, board => { board.projects.find(project => project.id === 'research').cost = [0, 7]; });
    const site = engine.buildSite(board, 'research'), prefix = simulatePlan(board, run, ['river', site]);
    expect(prefix.progress.balance).toEqual([6, 3]);
    expect(engine.constructionFunding(board, prefix.run, 'research').every(option => !option.legal)).toBe(true);
    const plan = simulatePlan(board, run, ['river', site, { id: 'research', funding: 'standard' }]);
    expect(plan.status).toBe('invalid'); expect(plan.steps).toHaveLength(2);
    expect(plan.newProjects).toEqual([]); expect(plan.uncertainVentures).toHaveLength(1);
    const found = next(board, move(board, move(board, run, 'river', [11, 1]), site));
    expect(engine.constructionFunding(board, found, 'research').find(option => option.id === 'standard').legal).toBe(true);
  });

  it.each([[10, 20, 0], [11, 1, 4]])('separates the known baseline from actual first die %s, momentum die %s, and venture gain %s', (first, second, gain) => {
    const { board, run } = fixture(1), initial = engine.derive(board, run), forecast = UI.forecastTabletopMove(board, run, 'river');
    const actual = engine.derive(board, move(board, run, 'river', [first, second]));
    const fortune = actual.fortune.map((value, i) => value - initial.fortune[i]);
    expect(actual.balance.map((value, i) => value - fortune[i] - (i === 1 ? gain : 0))).toEqual(forecast.balance);
    expect(actual.fieldGains).toEqual([0, gain]);
    expect(ventureUncertainties(actual)).toEqual([]);
  });

  it('keeps both investment orders conservative when the venture resolves at their new investigation', () => {
    const { board, run } = fixture(1), returned = next(board, move(board, run, 'heater'));
    const comparisons = investmentComparisons(board, returned, 'research');
    expect(comparisons.length).toBeGreaterThan(0);
    for (const comparison of comparisons) for (const plan of comparison.plans) {
      expect(plan.result.uncertainVentures).toHaveLength(1);
      expect(plan.result.progress.fieldGains).toEqual([0, 0]);
      expect(plan.result).toEqual(simulatePlan(board, returned, plan.entries));
      expect(plan.result.progress).not.toHaveProperty('fieldVenture');
    }
  });

  it('does not roll, mutate play, or copy private responses into a forecast', () => {
    const { board, run } = fixture();
    run.steps.t1.responses = { learner: 'PRIVATE_LEARNER_RESPONSE' }; run.steps.t1.grading = 'PRIVATE_GRADING';
    const snapshot = JSON.stringify({ board, run }); freezeDeep(board); freezeDeep(run);
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw Error('Forecasts must not roll'); });
    try {
      const plan = simulatePlan(board, run, ['river', 'rain']), forecast = UI.forecastTabletopMove(board, run, 'river');
      expect(plan.uncertainVentures).toHaveLength(1); expect(forecast.uncertainVentures).toHaveLength(1);
      for (const value of [planningBase(run), planningKey(board, run), plan, forecast]) expect(JSON.stringify(value)).not.toMatch(/PRIVATE_LEARNER_RESPONSE|PRIVATE_GRADING/);
      const uncertainties = ventureUncertainties(plan.progress); uncertainties[0].reward[0] = 99; uncertainties[0].gain[0] = 99;
      expect(plan.progress.fieldDeliveries.at(-1).reward).toEqual([4, 0]); expect(plan.progress.fieldDeliveries.at(-1).gain).toEqual([0, 0]);
      expect(JSON.stringify({ board, run })).toBe(snapshot);
    } finally { random.mockRestore(); }
  });

  it('discloses uncertain resolution and still-ready ventures, and hides the note after an actual result', () => {
    const { board, run } = fixture(1), forecast = UI.forecastTabletopMove(board, run, 'river');
    const resolved = markup(UI.VentureForecastNote, { board, uncertainVentures: forecast.uncertainVentures });
    expect(resolved).toContain('data-venture-forecast="river"'); expect(resolved).toContain('River station');
    expect(resolved).toContain('50%'); expect(resolved).toContain('4 Connection tokens'); expect(resolved).toContain('excluded');
    const pending = markup(UI.TacticalMoveDetails, { board, run, target: board.locations.find(node => node.id === 'heater') });
    expect(pending).toContain('data-venture-forecast-pending'); expect(pending).toContain('stays ready');
    const actual = engine.derive(board, move(board, run, 'river', [11, 1]));
    expect(markup(UI.VentureForecastNote, { board, uncertainVentures: ventureUncertainties(actual), pendingVenture: actual.fieldVenture })).toBe('');
  });
});
