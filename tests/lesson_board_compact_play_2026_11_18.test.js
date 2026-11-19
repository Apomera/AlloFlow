import { beforeAll, afterEach, describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import * as engine from '../lesson_board_engine.js';
const require = createRequire(import.meta.url), React = require('../desktop/web-app/node_modules/react'), { createRoot } = require('../desktop/web-app/node_modules/react-dom/client'), { act } = React;
const { makeBoard } = require('../dev-tools/fixtures/lesson_board.cjs');

// 2026-11-18 "keep every feature, show less at once" pass on the tabletop play screen:
// - On stacked layouts (<=960px) the current-move panel comes before the map, so a learner on a
//   phone or tablet sees the move and its action button first (open exploration already did this
//   at <=700px). On a 390px phone "Explore this space" moved from ~2,890px down to ~930px.
// - The "Supplies after this move" table folds for a plain exploration or travel move (the Reward
//   line already states the gain); a build, or a move with any forecast note, keeps it open.

let UI, root, element;
const board = (kit) => ({ ...makeBoard(), playStyle: 'tabletop', ...(kit ? { expeditionKit: kit } : {}) }), find = (selector) => element.querySelector(selector);
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
async function render({ b = board(), run = engine.emptyRun(), targetId = 'heater' } = {}) {
  if (!root) { element = document.createElement('div'); element.className = 'lb'; document.body.append(element); root = createRoot(element); }
  const target = [...b.locations, ...b.projects].find((item) => item.id === targetId);
  await act(async () => root.render(React.createElement(UI.TacticalMoveDetails, { board: b, run, target, t: (key) => key })));
}
beforeAll(() => {
  window.React = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const source = require('node:child_process').execFileSync(process.execPath, ['-e', "process.stdout.write(require('esbuild').buildSync({stdin:{contents:\"export {TacticalMoveDetails} from './lesson_board_tactical_preview.jsx';\",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'CompactPlayUI',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"], { encoding: 'utf8' });
  UI = new Function(source + ';return CompactPlayUI;')();
});
afterEach(async () => { if (root) await act(async () => root.unmount()); element?.remove(); root = element = null; });

describe('Lesson Board compact play screen', () => {
  it('folds the supply table for a plain exploration but keeps every row in it', async () => {
    await render();
    const forecast = find('[data-tabletop-forecast]');
    expect(forecast.tagName).toBe('DETAILS');
    expect(forecast.open).toBe(false);
    expect(forecast.dataset.forecastFolded).toBe('true');
    expect(forecast.querySelector('summary').textContent).toBe('Supplies after this move');
    expect(forecast.querySelectorAll('[data-resource-forecast-row]').length).toBe(2);
    expect(forecast.textContent).toContain('Assumes a successful investigation');
  });

  it('keeps the table open for a build and for a move with a forecast note', async () => {
    const b = board('builder'), run = sequence(b, ['heater', 'cloud', 'heater']);
    await render({ b, run, targetId: 'research' });
    const build = find('[data-tabletop-forecast]');
    expect(build.open).toBe(true);
    expect(build.dataset.forecastFolded).toBeUndefined();
    expect(find('[data-forecast-kit]')).toBeTruthy();
    // A build with no kit and no other note (a path project) still keeps its payment table open.
    const plain = board(), paid = sequence(plain, ['heater', 'cloud', 'heater']);
    await render({ b: plain, run: paid, targetId: 'bridge' });
    const payment = find('[data-tabletop-forecast]');
    expect(find('[data-forecast-kit]')).toBeNull();
    expect(payment.open).toBe(true);
    expect(payment.dataset.forecastFolded).toBeUndefined();
  });

  it('puts the current-move panel before the map whenever the tabletop layout stacks', () => {
    const css = readFileSync('lesson_board_tabletop_ui.jsx', 'utf8');
    const stacked = css.match(/@media\(max-width:960px\)\{([^@]*)/)?.[1] || '';
    expect(stacked).toContain('.lb [data-spatial-play=true] .lb-columns{grid-template-columns:minmax(0,1fr)}');
    expect(stacked).toContain('.lb [data-spatial-play=true] .lb-current{position:static;grid-row:1}');
    expect(stacked).not.toContain('grid-row:auto');
  });
});
