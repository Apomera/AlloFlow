import { beforeAll, afterEach, describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import * as e from '../lesson_board_engine.js';
import { makeWaterworksBoard } from '../lesson_board_demo.js';
const require = createRequire(import.meta.url), { makeBoard } = require('../dev-tools/fixtures/lesson_board.cjs'), React = require('../desktop/web-app/node_modules/react'), { createRoot } = require('../desktop/web-app/node_modules/react-dom/client'), { act } = React;

// 2026-11-18 Lesson Board refinements:
// - A retry starts from the learner's previous answer (multi-part activities), so only the parts
//   that need another look change. A single choice still starts empty.
// - The result after a correct answer does not repeat itself: no "Your response" line under a
//   per-part review that already lists it, no "Solution" line equal to the response, and the
//   lesson quote folds under "Lesson source" (it stays open after an unsuccessful answer).

// The fixture board with its first stop swapped for the Waterworks sorting challenge.
function sortingBoard() {
  const board = makeBoard(), camp = makeWaterworksBoard().locations.find((node) => node.kind === 'classify');
  const base = board.locations[0];
  board.locations[0] = { ...camp, id: base.id, conceptId: base.conceptId, reward: base.reward, explanation: 'An ice cube and a snowflake are solid water.', sourceQuote: 'Ice is solid water. A raindrop is liquid water.' };
  return board;
}

describe('Lesson Board retry and result recap', () => {
  let UI, root, element, latest;
  const click = async (selector) => { const node = element.querySelector(selector); expect(node, selector).toBeTruthy(); await act(async () => node.click()); };
  const change = async (selector, value) => { await act(async () => { const node = element.querySelector(selector); expect(node, selector).toBeTruthy(); node.value = value; node.dispatchEvent(new Event('change', { bubbles: true })); }); };
  const sort = async (values) => { for (const [index, value] of values.entries()) await change('[data-challenge-select="' + index + '"]', String(value)); };
  function Harness({ board }) {
    const [run, setRun] = React.useState(e.emptyRun()); latest = run;
    return React.createElement('div', { className: 'lb' }, React.createElement(UI.Styles), React.createElement(UI.BoardView, { board, run, t: (key) => key,
      onMove: (id) => setRun((previous) => e.merge(previous, e.begin(board, previous, id))),
      onAnswer: (value) => setRun((previous) => { const next = structuredClone(previous), node = board.locations.find((item) => item.id === e.stepOf(next).targetId); e.stepOf(next).answers.solo = { value, correct: value === e.solution(node) }; return e.merge(next, e.resolve(board, next, { solo: {} })); }),
      onAdvance: () => setRun((previous) => e.merge(previous, e.advance(board, previous))), onRetry: () => setRun((previous) => e.merge(previous, e.retry(board, previous))) }));
  }
  const render = async (board) => { element = document.createElement('div'); document.body.appendChild(element); root = createRoot(element); await act(async () => root.render(React.createElement(Harness, { board }))); };
  beforeAll(() => { global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true; const bundle = require('node:child_process').execFileSync(process.execPath, ['-e', "process.stdout.write(require('esbuild').buildSync({ stdin: { contents: \"export { BoardView, Styles, retryDraft } from './lesson_board_ui.jsx';\", resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', globalName: 'RetryRecapUI', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment' }).outputFiles[0].text)"], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); UI = new Function(bundle + ';return RetryRecapUI;')(); });
  afterEach(async () => { if (root) await act(async () => root.unmount()); element?.remove(); root = element = null; localStorage.clear(); sessionStorage.clear(); });

  it('keeps a sorting answer on retry so only the misplaced card moves', async () => {
    const board = sortingBoard(), key = e.solution(board.locations[0]);
    expect(key).toBe('2,0,1,2');
    await render(board);
    await click('[data-board-move="heater"]');
    await sort([2, 0, 1, 0]);
    await click('[data-board-submit]');
    const wrong = element.querySelector('[data-board-recap]');
    expect(wrong.textContent).toContain('relationships fit the lesson');
    // The per-part review lists the response, so no separate "Your response" line; the key stays hidden.
    expect(wrong.querySelector('[data-board-answer-review]').textContent).not.toContain('Your response');
    expect(wrong.querySelector('[data-board-solution]').closest('details[data-board-reveal]')).toBeTruthy();
    // Unsuccessful: the lesson quote is not folded away.
    expect(wrong.querySelector('details[data-board-source-quote]')).toBeNull();

    await click('[data-board-retry]');
    expect([0, 1, 2, 3].map((index) => element.querySelector('[data-challenge-select="' + index + '"]').value)).toEqual(['2', '0', '1', '0']);
    expect(element.querySelector('[data-board-submit]').disabled).toBe(false);
    await change('[data-challenge-select="3"]', '2');
    await click('[data-board-submit]');
    expect(e.stepOf(latest).result.success).toBe(true);
    const done = element.querySelector('[data-board-recap]');
    expect(done.querySelector('[data-board-solution]')).toBeNull();
    expect(done.querySelector('[data-board-answer-review]').textContent).not.toContain('Your response');
    expect(done.textContent).toContain('An ice cube and a snowflake are solid water.');
    const folded = done.querySelector('details[data-board-source-quote]');
    expect(folded).toBeTruthy();
    expect(folded.open).toBe(false);
    expect(folded.querySelector('summary').textContent).toBe('Lesson source');
    expect(folded.querySelector('blockquote').textContent).toContain('A raindrop is liquid water.');
  });

  it('starts a single-choice retry empty', async () => {
    await render(makeBoard());
    await click('[data-board-move="heater"]'); await change('[data-board-choice]', '0'); await click('[data-board-submit]');
    expect(element.querySelector('[data-board-answer-review]').textContent).toContain('Your response: Condensation');
    await click('[data-board-retry]');
    expect(element.querySelector('[data-board-choice]').value).toBe('');
    expect(element.querySelector('[data-board-submit]').disabled).toBe(true);
  });

  it('shows the solution when it differs from the response', async () => {
    // The reveal holds it while a retry is open, and a correct response replaces it.
    await render(makeBoard());
    await click('[data-board-move="heater"]'); await change('[data-board-choice]', '2'); await click('[data-board-submit]');
    const review = element.querySelector('[data-board-recap]');
    expect(review.querySelector('[data-board-solution]').textContent).toContain('Evaporation');
  });

  it('reuses only a valid previous answer for the same stop and round', () => {
    const node = sortingBoard().locations[0], choice = makeBoard().locations[0];
    expect(UI.retryDraft(node, { '3:heater': '2,0,1,0' }, 3, 1)).toBe('2,0,1,0');
    expect(UI.retryDraft(node, { '3:1:heater': '2,0,1,1' }, 3, 2)).toBe('2,0,1,1');
    expect(UI.retryDraft(node, { '3:heater': '2,0,1,0' }, 3, 0)).toBeUndefined();
    expect(UI.retryDraft(node, { '2:heater': '2,0,1,0' }, 3, 1)).toBeUndefined();
    expect(UI.retryDraft(node, { '3:heater': '9,9' }, 3, 1)).toBeUndefined();
    expect(UI.retryDraft(choice, { '3:heater': '0' }, 3, 1)).toBeUndefined();
    expect(UI.retryDraft(null, {}, 3, 1)).toBeUndefined();
  });
});
