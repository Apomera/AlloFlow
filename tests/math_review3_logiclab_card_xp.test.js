// Math review 3 (Logic Lab): the fallacy, detective and quick-fire practice cards
// paid XP again every time "Next" cycled back to a card already answered. Each
// card now pays once (payOnce, keyed by card); the game score may still count
// repeats. MATH_REVIEW3_LOGICLAB points the suite at another copy (mutation checks).
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { sliceBetween } from './helpers/anchored_slice.js';

const FILE = process.env.MATH_REVIEW3_LOGICLAB || 'stem_lab/stem_tool_logiclab.js';
const src = fs.readFileSync(FILE, 'utf8');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const tFn = (k, fb) => fb;
const listFrom = (name) => {
  const body = sliceBetween(src, 'var ' + name + ' = [', '];', { file: FILE, label: name, includeEnd: true });
  // eslint-disable-next-line no-new-func
  return new Function('t', body + '\nreturn ' + name + ';')(tFn);
};
const FALLACIES = listFrom('FALLACIES');
const DETECTIVE = listFrom('DETECTIVE');
const TT_CHALLENGES = listFrom('TT_CHALLENGES');
const eng = (() => {
  const body = sliceBetween(src, 'var CONN = {', '// ── Proof Challenges', { file: FILE, label: 'logic engine' });
  // eslint-disable-next-line no-new-func
  return new Function('t', body + '\nreturn { genTable };')(tFn);
})();

let root = null;
let cfg;
beforeEach(() => { resetStemLab(); cfg = loadTool(FILE, 'logicLab'); document.body.innerHTML = '<div id="root"></div>'; });
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; });

async function mount(challengeMode) {
  const award = vi.fn();
  const view = { award, state: null };
  function App() {
    const [state, setState] = React.useState({ logicLab: { mode: 'challenges', challengeMode, challengeIdx: 0 } });
    view.state = state;
    return cfg.render(makeCtx({ toolData: state, setToolData: setState, awardXP: award, addToast: vi.fn(), celebrate: vi.fn() }));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(() => root.render(React.createElement(App)));
  return view;
}
const paid = (view, reason) => view.award.mock.calls.filter((c) => c[2] === reason).length;
async function press(el, what) {
  expect(el, what).toBeTruthy();
  await React.act(() => el.click());
}
const byLabel = (label) => document.querySelector('button[aria-label="' + label + '"]');
const byText = (text) => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === text);

describe('practice cards pay once each', () => {
  it('fallacy spotter: a full lap plus a repeat pays once per card, and the score still counts the repeat', async () => {
    const view = await mount('fallacy');
    expect(FALLACIES.length).toBeGreaterThan(2);
    let scoreBeforeRepeat = 0;
    for (let i = 0; i <= FALLACIES.length; i++) {
      const f = FALLACIES[i % FALLACIES.length];
      if (i === FALLACIES.length) scoreBeforeRepeat = view.state.logicLab.score;
      await press(byLabel(f.valid ? 'Valid' : 'Invalid (Fallacy)'), 'answer card ' + i);
      expect(view.state.logicLab.challengeAnswer, 'card ' + i).toBe('correct');
      await press(byLabel('Next'), 'Next after card ' + i);
    }
    expect(paid(view, 'Fallacy spotted')).toBe(FALLACIES.length);
    expect(view.state.logicLab.score).toBeGreaterThan(scoreBeforeRepeat);
  });

  it('real-world reasoning: cycling back to a solved case does not pay again', async () => {
    const view = await mount('detective');
    const LABEL = { true: 'Yes', false: 'No', unknown: "Can't tell" };
    for (let i = 0; i < 2 * DETECTIVE.length; i++) {
      const c = DETECTIVE[i % DETECTIVE.length];
      await press(byLabel(LABEL[String(c.answer)]), 'answer case ' + i);
      expect(view.state.logicLab.challengeAnswer, 'case ' + i).toBe('correct');
      await press(byText('Next →'), 'Next after case ' + i);
    }
    expect(paid(view, 'Detective reasoning')).toBe(DETECTIVE.length);
  });

  it('quick-fire truth tables: completing a table again after a lap does not pay again', async () => {
    const view = await mount('quickfire');
    for (let i = 0; i <= TT_CHALLENGES.length; i++) {
      const table = eng.genTable(TT_CHALLENGES[i % TT_CHALLENGES.length].expr);
      expect(table, TT_CHALLENGES[i % TT_CHALLENGES.length].expr).toBeTruthy();
      for (const row of table.rows) {
        // Answered rows lose their buttons, so the first pair left is the next row.
        await press(document.querySelector('button[aria-label="' + (row.result ? 'T' : 'F') + '"]'), 'row of table ' + i);
      }
      expect(document.body.textContent, 'table ' + i).toContain('Perfect! All correct!');
      await press(byLabel('Next Challenge'), 'Next Challenge after table ' + i);
    }
    expect(paid(view, 'Quick-fire completed')).toBe(TT_CHALLENGES.length);
  });

  it('a wrong answer pays nothing and does not use up the card', async () => {
    const view = await mount('fallacy');
    const f = FALLACIES[0];
    await press(byLabel(f.valid ? 'Invalid (Fallacy)' : 'Valid'), 'wrong answer');
    expect(view.state.logicLab.challengeAnswer).toBe('wrong');
    expect(paid(view, 'Fallacy spotted')).toBe(0);
    // Lap back to card 0 and answer it correctly: that is its first payment.
    for (let i = 0; i < FALLACIES.length; i++) {
      if (i > 0) await press(byLabel(FALLACIES[i].valid ? 'Valid' : 'Invalid (Fallacy)'), 'card ' + i);
      await press(byLabel('Next'), 'Next ' + i);
    }
    await press(byLabel(f.valid ? 'Valid' : 'Invalid (Fallacy)'), 'card 0 again');
    expect(paid(view, 'Fallacy spotted')).toBe(FALLACIES.length);
  });
});
