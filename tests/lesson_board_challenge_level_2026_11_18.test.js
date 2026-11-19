import { beforeAll, afterEach, describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import * as engine from '../lesson_board_engine.js';
import { makeWaterworksBoard, WATERWORKS_SOURCE } from '../lesson_board_demo.js';
const require = createRequire(import.meta.url), React = require('../desktop/web-app/node_modules/react'), { createRoot } = require('../desktop/web-app/node_modules/react-dom/client'), { act } = React;
const { makeBoard, source } = require('../dev-tools/fixtures/lesson_board.cjs');

// 2026-11-18 challenge level. Relaxed (no field) keeps the authored costs and folds the exchange
// payments under "Other ways to pay". Strategic raises each project cost by half (at most 6),
// trimmed so activity rewards still fund all three projects, and keeps the authored costs in
// relaxedCosts so switching back is exact. A scratch sweep (5,400 random full games over six
// boards, three goals and both levels) finished every game; Strategic moved the first build
// one to two explorations later.

const costs = (board) => board.projects.map((p) => p.cost);
const totals = (board) => board.locations.reduce((sum, n) => sum.map((v, i) => v + n.reward[i]), [0, 0]);

describe('Lesson Board challenge level', () => {
  it('raises Waterworks costs by half within the funding rule and restores them exactly', () => {
    const relaxed = makeWaterworksBoard();
    expect(engine.challengeOf(relaxed)).toBe('relaxed');
    const strategic = engine.prepareBoard(engine.withChallenge(relaxed, 'strategic'), WATERWORKS_SOURCE);
    expect(engine.challengeOf(strategic)).toBe('strategic');
    expect(costs(strategic)).toEqual([[5, 6], [6, 5], [6, 6]]);
    expect(strategic.relaxedCosts).toEqual(Object.fromEntries(relaxed.projects.map((p) => [p.id, p.cost])));
    const total = totals(strategic);
    for (const i of [0, 1]) expect(strategic.projects.reduce((sum, p) => sum + p.cost[i], 0)).toBeLessThanOrEqual(total[i]);
    expect(engine.validateBoard(strategic, WATERWORKS_SOURCE)).toEqual([]);
    const back = engine.prepareBoard(engine.withChallenge(strategic, 'relaxed'), WATERWORKS_SOURCE);
    expect(costs(back)).toEqual(costs(relaxed));
    expect(back.challenge).toBeUndefined();
    expect(back.relaxedCosts).toBeUndefined();
  });

  it('trims raised costs that would break "rewards fund all three projects"', () => {
    const tight = makeBoard(); tight.playStyle = 'tabletop';
    tight.projects.forEach((p) => { p.cost = [5, 5]; });
    tight.locations.forEach((n) => { n.reward = [2, 2]; });
    expect(engine.validateBoard(tight, source)).toEqual([]);
    const strategic = engine.withChallenge(tight, 'strategic');
    const total = totals(strategic);
    for (const i of [0, 1]) expect(strategic.projects.reduce((sum, p) => sum + p.cost[i], 0)).toBeLessThanOrEqual(total[i]);
    strategic.projects.forEach((p, index) => p.cost.forEach((value, i) => expect(value).toBeGreaterThanOrEqual(tight.projects[index].cost[i])));
    expect(engine.validateBoard(strategic, source)).toEqual([]);
  });

  it('applying Strategic twice keeps the first authored costs', () => {
    const once = engine.withChallenge(makeWaterworksBoard(), 'strategic'), twice = engine.withChallenge(once, 'strategic');
    expect(twice.relaxedCosts).toEqual(once.relaxedCosts);
    expect(costs(twice)).toEqual(costs(once));
  });

  it('rejects an unknown level and relaxed costs that do not match the projects', () => {
    const board = makeWaterworksBoard();
    expect(engine.validateBoard({ ...board, challenge: 'hard' }, WATERWORKS_SOURCE)).toContain('Choose strategic as the challenge level, or leave it out for relaxed play.');
    const strategic = engine.withChallenge(board, 'strategic');
    const { [board.projects[0].id]: dropped, ...partial } = strategic.relaxedCosts;
    expect(engine.validateBoard({ ...strategic, relaxedCosts: partial }, WATERWORKS_SOURCE)).toContain('Relaxed costs must list every project on a strategic board.');
    expect(engine.validateBoard({ ...board, relaxedCosts: strategic.relaxedCosts }, WATERWORKS_SOURCE)).toContain('Relaxed costs must list every project on a strategic board.');
  });
});

describe('Lesson Board payment choices by challenge level', () => {
  let UI, root, element;
  const choose = (b, run) => engine.stepOf(run).phase === 'review' ? engine.merge(run, engine.advance(b, run)) : run;
  function move(b, run, id) {
    run = engine.merge(choose(b, run), engine.begin(b, choose(b, run), id));
    if (engine.stepOf(run).phase === 'answer') {
      const node = b.locations.find((item) => item.id === id);
      run = engine.merge(run, engine.processAction(b, run, { attemptId: 'a', requestId: engine.requestId(run), turn: run.turn, kind: 'answer', targetId: id, value: engine.solution(node) }, 'solo', { attemptId: 'a', active: true }));
      run = engine.merge(run, engine.resolve(b, run, { solo: {} }, { dice: Array.from({ length: engine.diceNeeded(b, run) }, () => 1) }));
    }
    return run;
  }
  const render = async (props) => {
    if (!root) { element = document.createElement('div'); element.className = 'lb'; document.body.append(element); root = createRoot(element); }
    await act(async () => root.render(React.createElement(UI.ConstructionFundingPicker, { t: (key) => key, onChange() {}, ...props })));
  };
  beforeAll(() => {
    window.React = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const code = require('node:child_process').execFileSync(process.execPath, ['-e', "process.stdout.write(require('esbuild').buildSync({stdin:{contents:\"export {ConstructionFundingPicker} from './lesson_board_funding_ui.jsx';\",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'ChallengeUI',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"], { encoding: 'utf8' });
    UI = new Function(code + ';return ChallengeUI;')();
  });
  afterEach(async () => { if (root) await act(async () => root.unmount()); element?.remove(); root = element = null; });
  const setup = (level) => {
    const raw = { ...makeBoard(), playStyle: 'tabletop' }, b = level === 'strategic' ? engine.withChallenge(raw, 'strategic') : raw;
    return { b, run: (level === 'strategic' ? ['heater', 'cloud', 'river', 'heater'] : ['heater', 'cloud', 'heater']).reduce((r, id) => move(b, r, id), engine.emptyRun()) };
  };

  it('Relaxed shows the plain price and folds the exchanges', async () => {
    const { b, run } = setup('relaxed'), project = b.projects.find((p) => p.id === 'research');
    const options = engine.constructionFunding(b, run, 'research');
    expect(options.find((o) => o.id === 'standard').legal).toBe(true);
    expect(options.length).toBeGreaterThan(1);
    await render({ board: b, run, project, value: 'standard' });
    const more = element.querySelector('details[data-funding-more]');
    expect(more).toBeTruthy();
    expect(more.open).toBe(false);
    expect(more.querySelector('summary').textContent).toBe('Other ways to pay');
    expect(element.querySelector('[data-funding-option="standard"]').closest('details')).toBeNull();
    expect(more.querySelectorAll('[data-funding-option]').length).toBe(options.length - 1);
  });

  it('Relaxed keeps every option in view once an exchange is chosen', async () => {
    const { b, run } = setup('relaxed'), project = b.projects.find((p) => p.id === 'research');
    const exchange = engine.constructionFunding(b, run, 'research').find((o) => o.id !== 'standard');
    await render({ board: b, run, project, value: exchange.id });
    expect(element.querySelector('details[data-funding-more]')).toBeNull();
  });

  it('Strategic shows every payment option', async () => {
    const { b, run } = setup('strategic'), project = b.projects.find((p) => p.id === 'research');
    // One more exploration than Relaxed so the raised plain price is payable here too.
    expect(engine.constructionFunding(b, run, 'research').find((o) => o.id === 'standard').legal).toBe(true);
    await render({ board: b, run, project, value: 'standard' });
    expect(element.querySelector('details[data-funding-more]')).toBeNull();
    expect(element.querySelectorAll('[data-funding-option]').length).toBe(engine.constructionFunding(b, run, 'research').length);
  });
});
