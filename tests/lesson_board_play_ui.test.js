import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import * as engine from '../lesson_board_engine.js';
const require = createRequire(import.meta.url), { makeBoard } = require('../dev-tools/fixtures/lesson_board.cjs'), React = require('../desktop/web-app/node_modules/react'), { createRoot } = require('../desktop/web-app/node_modules/react-dom/client'), { act } = React;
let root, element, UI, latest;
const click = async selector => { const node = typeof selector === 'string' ? element.querySelector(selector) : selector; expect(node).toBeTruthy(); await act(async () => node.click()); };
const change = async (selector, value) => { await act(async () => { const node = element.querySelector(selector); expect(node).toBeTruthy(); node.value = value; node.dispatchEvent(new Event('change', { bubbles: true })); }); };
function completedMove(board, run, id) { let next = engine.merge(run, engine.begin(board, run, id)); if (!board.projects.some(project => project.id === id)) { const node = board.locations.find(item => item.id === id); next.steps['t' + next.turn].answers = { solo: { value: engine.solution(node), correct: true } }; next = engine.merge(next, engine.resolve(board, next, { solo: {} })); } return next; }
function Harness({ board, initial = engine.emptyRun(), ...props }) {
  const [run, setRun] = React.useState(initial); latest = run;
  return React.createElement('div', { className: 'lb' }, React.createElement(UI.Styles), React.createElement(UI.BoardView, { board, run, t: key => key, onMove: id => setRun(previous => engine.merge(previous, engine.begin(board, previous, id))), onAnswer: value => setRun(previous => { const next = structuredClone(previous), node = board.locations.find(item => item.id === engine.stepOf(next).targetId); engine.stepOf(next).answers.solo = { value, correct: value === engine.solution(node) }; return engine.merge(next, engine.resolve(board, next, { solo: {} })); }), onAdvance: () => setRun(previous => engine.merge(previous, engine.advance(board, previous))), onRetry: () => setRun(previous => engine.merge(previous, engine.retry(board, previous))), ...props }));
}
async function render(props = {}) { element = document.createElement('div'); document.body.appendChild(element); root = createRoot(element); await act(async () => root.render(React.createElement(Harness, { board: makeBoard(), ...props }))); }
beforeAll(() => { global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true; const bundle = require('node:child_process').execFileSync(process.execPath, ['-e', "process.stdout.write(require('esbuild').buildSync({ stdin: { contents: \"export { BoardView, Styles } from './lesson_board_ui.jsx';\", resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', globalName: 'BoardUI', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment' }).outputFiles[0].text)"], { encoding: 'utf8' }); UI = new Function(bundle + ';return BoardUI;')(); });
afterEach(async () => { if (root) await act(async () => root.unmount()); element?.remove(); root = element = null; localStorage.clear(); sessionStorage.clear(); });

describe('Lesson board guided play and learning', () => {
  it('makes mission goals, current routes, and optional planning explicit without making a move', async () => {
    await render({ board: { ...makeBoard(), goal: 'expedition' } });
    expect(element.querySelector('[data-board-mission]').textContent).toContain('0/8');
    expect(element.querySelector('[data-board-flow] [aria-current="step"]').textContent).toContain('Choose a move');
    expect(element.querySelector('[data-location="heater"]').dataset.state).toBe('ready');
    expect(element.querySelector('[data-location="sequence"]').dataset.state).toBe('locked');
    await click('[data-board-planner] > summary'); await change('[data-planner-goal]', 'research');
    expect(element.querySelector('[data-board-planner]').textContent).toContain('Resources still needed');
    await click('[data-planner-location="cloud"]');
    expect(element.querySelector('[data-board-move="cloud"]')).toBeTruthy();
    expect(engine.stepOf(latest).phase).toBe('choose');
    expect(element.querySelector('[data-board-practice]')).toBeNull();
  });
  it('compares a resolved response, shows exact rewards and selects a useful next move', async () => {
    await render(); await click('[data-board-move="heater"]'); await change('[data-board-choice]', '1'); await click('[data-board-submit]');
    expect(element.querySelector('[data-board-answer-review]').textContent).toContain('Your response: Evaporation');
    expect(element.querySelector('[data-board-rewards]').textContent).toContain('+2');
    expect(element.querySelector('[data-board-rewards]').textContent).toContain('River station');
    await click('[data-board-next]');
    expect(element.querySelector('[data-board-move]')).toBeTruthy();
    expect(element.querySelector('[data-board-move]').dataset.boardMove).not.toBe('heater');
    expect(element.querySelector('[data-location="heater"]').dataset.state).toBe('explored');
  });
  it('resets the response on same-turn retry and records first-to-latest improvement', async () => {
    await render(); await click('[data-board-move="heater"]'); await change('[data-board-choice]', '0'); await click('[data-board-submit]'); await click('[data-board-retry]');
    expect(latest.turn).toBe(0); expect(element.querySelector('[data-board-choice]').value).toBe('');
    await change('[data-board-choice]', '1'); await click('[data-board-submit]');
    expect(element.querySelector('[data-personal-learning]').textContent).toContain('First responses correct: 0. Latest responses correct: 1.');
    expect(element.querySelector('[data-personal-learning]').textContent).toContain('Improved after review');
    expect(engine.derive(makeBoard(), latest).balance).toEqual([2, 1]);
  });
  it('restores controlled workspace and reports edits without sessionStorage writes', async () => {
    const board = makeBoard(), initial = engine.merge(engine.emptyRun(), engine.begin(board, engine.emptyRun(), 'cloud')), save = vi.fn();
    await render({ board, initial, workspaceSnapshot: { selected: 'cloud', view: 'list', drafts: { '0:cloud': '1,' } }, onWorkspaceChange: save });
    expect(element.querySelector('[data-board-map]').dataset.view).toBe('list'); expect(element.querySelector('[data-board-control="0"]').value).toBe('1');
    await change('[data-board-control="1"]', '0'); expect(save).toHaveBeenLastCalledWith({ selected: 'cloud', view: 'list', drafts: { '0:cloud': '1,0' } }); expect(sessionStorage.length).toBe(0);
  });
  it('shows a constructed shortcut on its destination and a ready project card', async () => {
    const board = makeBoard(); let initial = completedMove(board, engine.emptyRun(), 'heater'); initial = engine.merge(initial, engine.advance(board, initial)); initial = completedMove(board, initial, 'cloud'); initial = engine.merge(initial, engine.advance(board, initial));
    await render({ board, initial }); expect(element.querySelector('[data-project="bridge"]').dataset.affordable).toBe('true'); await click('[data-project="bridge"]'); await click('[data-board-move="bridge"]');
    expect(element.querySelector('[data-board-shortcut="bridge"]')).toBeTruthy(); expect(element.querySelector('[data-board-rewards]').textContent).toContain('Cycle mechanism');
  });
  it('opens all-location learning and private practice on completion without changing the recorded run', async () => {
    const board = makeBoard(); let initial = engine.emptyRun(); for (const id of ['heater', 'cloud', 'sequence', 'river', 'bridge', 'research']) { if (id === 'sequence') continue; initial = completedMove(board, initial, id); if (!engine.derive(board, initial).complete) initial = engine.merge(initial, engine.advance(board, initial)); }
    expect(engine.derive(board, initial).complete).toBe(true); await render({ board, initial }); const before = JSON.stringify(latest);
    expect(element.querySelectorAll('[data-journal-location]')).toHaveLength(8); await click('[data-board-practice] > summary'); await change('[data-practice-location]', 'heater'); await change('[data-practice-activity] [data-board-choice]', '0'); await click('[data-practice-check]');
    expect(element.querySelector('[data-practice-result]').textContent).toContain('Compare your response'); expect(element.querySelector('[data-practice-result]').textContent).toContain('Evaporation'); expect(JSON.stringify(latest)).toBe(before);
  });
  it('keeps the final location feedback alongside completion and offers practice evidence before checking', async () => {
    const board = { ...makeBoard(), goal: 'expedition' }; let initial = engine.emptyRun();
    for (const id of ['heater', 'cloud', 'bridge', 'river', 'research', 'rain', 'lake', 'sequence', 'cooler']) { initial = completedMove(board, initial, id); initial = engine.merge(initial, engine.advance(board, initial)); }
    initial = completedMove(board, initial, 'weather'); await render({ board, initial });
    expect(element.querySelector('.lb-current h3').textContent).toBe('Your board is complete');
    const recap = element.querySelector('[data-board-final-move]'); expect(recap.textContent).toContain('Weather laboratory'); expect(recap.querySelector('[data-board-answer-review]').textContent).toContain('Your response'); expect(recap.querySelector('[data-board-rewards]').textContent).toContain('+3'); expect(recap.querySelector('blockquote').textContent).toBe(board.locations.find(node => node.id === 'weather').sourceQuote);
    await click('[data-board-practice] > summary'); expect(element.querySelector('[data-practice-result]')).toBeNull(); await click('[data-practice-evidence] > summary'); expect(element.querySelector('[data-practice-evidence]').textContent).toContain(board.locations[0].sourceQuote);
  });
  it('offers full practice at the move limit without claiming the mission is complete', async () => {
    const initial = { turn: 47, steps: { t47: { phase: 'review', targetId: 'heater', result: { success: false, marks: { solo: false } } } } };
    await render({ initial }); expect(element.querySelector('[data-board-next]').disabled).toBe(true); expect(element.querySelector('[data-board-retry]').disabled).toBe(false); expect(element.querySelector('[data-board-practice]')).toBeTruthy(); expect(element.querySelectorAll('[data-journal-location]')).toHaveLength(8); expect(element.querySelector('.lb-current h3').textContent).not.toBe('Your board is complete');
  });
  it('keeps other learners responses out of the student journal', async () => {
    const board = makeBoard(), initial = completedMove(board, engine.emptyRun(), 'heater'); initial.steps.t0.result.marks.other = false;
    await render({ board, initial, role: 'student', uid: 'solo', roster: { solo: { name: 'Rowan' }, other: { name: 'Secret learner' } } });
    expect(element.querySelector('[data-board-learning]')).toBeNull(); expect(element.querySelector('[data-board-journal]').textContent).not.toContain('Secret learner');
  });
});
