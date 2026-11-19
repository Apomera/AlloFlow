import { beforeAll, afterEach, describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import * as engine from '../lesson_board_engine.js';
const require = createRequire(import.meta.url), React = require('../desktop/web-app/node_modules/react'), { createRoot } = require('../desktop/web-app/node_modules/react-dom/client'), { act } = React;
const { makeBoard } = require('../dev-tools/fixtures/lesson_board.cjs');

// 2026-11-18 gameplay clarity pass (tabletop boards):
// - A "Next goal:" line under the score says the one next step while the objective is open: build a
//   project the party can already pay for, otherwise explore what the mission still needs. The
//   later stages (use a construction, return to camp) keep their existing objective line.
// - "How to play" leads with three steps (Move, Answer, Build); every earlier rule is kept under
//   "More rules".

let UI, root, element;
const board = (extra = {}) => ({ ...makeBoard(), playStyle: 'tabletop', ...extra }), find = (selector) => element.querySelector(selector);
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
const sequence = (b, ids) => ids.reduce((run, id) => move(b, run, id), engine.emptyRun());
const english = JSON.parse(readFileSync('ui_strings.js', 'utf8')).lesson_board;
const t = (key) => english[key.replace(/^lesson_board\./, '')];
const render = async (Component, props) => {
  if (!root) { element = document.createElement('div'); element.className = 'lb'; document.body.append(element); root = createRoot(element); }
  await act(async () => root.render(React.createElement(UI[Component], { t, ...props })));
};
beforeAll(() => {
  window.React = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const source = require('node:child_process').execFileSync(process.execPath, ['-e', "process.stdout.write(require('esbuild').buildSync({stdin:{contents:\"export {TabletopHud,TabletopRules,tabletopNextGoal} from './lesson_board_tabletop_ui.jsx';\",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'NextGoalUI',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"], { encoding: 'utf8' });
  UI = new Function(source + ';return NextGoalUI;')();
});
afterEach(async () => { if (root) await act(async () => root.unmount()); element?.remove(); root = element = null; });

describe('Lesson Board next goal', () => {
  it('names the ideas still open at the start of a core mission', () => {
    const b = board();
    expect(UI.tabletopNextGoal(b, engine.emptyRun())).toEqual({ kind: 'concepts', params: { names: 'Temperature changes, Water-cycle processes' } });
  });

  it('counts the spaces left on a full expedition', () => {
    const b = board({ goal: 'expedition' });
    expect(UI.tabletopNextGoal(b, engine.emptyRun())).toEqual({ kind: 'explore', params: { count: b.locations.length } });
    expect(UI.tabletopNextGoal(b, sequence(b, ['heater']))).toEqual({ kind: 'explore', params: { count: b.locations.length - 1 } });
  });

  it('points to a project the party can already pay for, cheapest first, at its build site', () => {
    const b = board(), run = sequence(b, ['heater', 'cloud']), p = engine.derive(b, run);
    const goal = UI.tabletopNextGoal(b, run);
    expect(goal.kind).toBe('build');
    const project = b.projects.find((item) => item.name === goal.params.project);
    expect(project.cost.every((value, index) => p.balance[index] >= value)).toBe(true);
    const cheapest = Math.min(...b.projects.filter((item) => item.cost.every((value, index) => p.balance[index] >= value)).map((item) => item.cost[0] + item.cost[1]));
    expect(project.cost[0] + project.cost[1]).toBe(cheapest);
    expect(goal.params.site).toBe(b.locations.find((n) => n.id === engine.buildSite(b, project.id)).name);
  });

  it('sends the party to a build site when nothing is left to explore but the price is out of reach', () => {
    const b = board(); b.projects.forEach((item) => { item.cost = [40, 40]; });
    const run = sequence(b, ['heater', 'river']);
    expect(engine.derive(b, run).concepts.length).toBe(b.concepts.length);
    const goal = UI.tabletopNextGoal(b, run);
    expect(goal.kind).toBe('pay');
    expect(b.projects.map((item) => item.name)).toContain(goal.params.project);
  });

  it('leaves the later stages to the existing objective line', () => {
    const b = board(), run = { ...engine.emptyRun() };
    const stub = { ...b, concepts: [], projects: [] };
    // No concepts and no projects: the requirements are already met, so no next-goal line.
    expect(UI.tabletopNextGoal(stub, run)).toBeNull();
  });

  it('shows the line under the score with registered English text', async () => {
    const b = board();
    await render('TabletopHud', { board: b, run: engine.emptyRun() });
    const line = find('[data-board-next-goal]');
    expect(line.dataset.boardNextGoal).toBe('concepts');
    expect(line.textContent).toBe('Next goal: Explore a space for each idea still open: Temperature changes, Water-cycle processes.');
    const ready = sequence(b, ['heater', 'cloud']);
    await render('TabletopHud', { board: b, run: ready });
    expect(find('[data-board-next-goal]').textContent).toMatch(/^Next goal: You can afford .+\. Build it at .+\.$/);
  });
});

describe('Lesson Board How to play', () => {
  it('leads with three steps and keeps every earlier rule under More rules', async () => {
    const b = board({ chance: true });
    await render('TabletopRules', { board: b });
    const steps = [...find('[data-tabletop-core-loop]').children].map((li) => li.textContent);
    expect(steps).toEqual([
      'Move Choose a space on the board and travel there.',
      'Answer Solve its challenge to earn supplies. Hints and retries are always available.',
      'Build Spend supplies on projects at their sites, then return to camp to finish.',
    ]);
    const more = find('details[data-tabletop-more-rules]');
    expect(more.open).toBe(false);
    expect(more.querySelector('summary').textContent).toBe('More rules');
    const rules = more.querySelectorAll('ol > li');
    expect(rules.length).toBe(6);
    for (const key of ['tabletop_rule_route_choice', 'tabletop_rule_explore', 'tabletop_rule_field_routes', 'tabletop_rule_build', 'tabletop_rule_finish_delivery']) expect(more.textContent).toContain(english[key]);
  });

  it('registers every new line in ui_strings', () => {
    for (const key of ['tabletop_next_label', 'tabletop_next_build', 'tabletop_next_explore', 'tabletop_next_concepts', 'tabletop_next_pay', 'tabletop_core_move_label', 'tabletop_core_move', 'tabletop_core_answer_label', 'tabletop_core_answer', 'tabletop_core_build_label', 'tabletop_core_build', 'tabletop_more_rules']) expect(typeof english[key], key).toBe('string');
  });
});
