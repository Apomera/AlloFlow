import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Area Model challenge flow, driven through the real UI (jsdom + React 18).
//
// MR_NUMBERSENSE_AREAMODEL_SRC points the suite at another copy of the tool
// (mutation check: the pre-fix copy must turn these red).

const FILE = process.env.MR_NUMBERSENSE_AREAMODEL_SRC || 'stem_lab/stem_tool_areamodel.js';

let root = null;
beforeEach(() => { resetStemLab(); loadTool(FILE, 'areamodel'); });
afterEach(async () => {
  if (root) { await React.act(async () => { root.unmount(); }); root = null; }
  if (window._areaModelKbHandler) window.removeEventListener('keydown', window._areaModelKbHandler);
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

async function mount(areaState) {
  const tool = window.StemLab._registry.areamodel;
  const view = { state: null };
  function App() {
    const [state, setState] = React.useState({ _areamodel: areaState });
    view.state = state._areamodel;
    return tool.render(makeCtx({ toolData: state, setToolData: setState }));
  }
  document.body.innerHTML = '<div id="am-root"></div>';
  root = ReactDOMClient.createRoot(document.getElementById('am-root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  return view;
}
const byLabel = (label) => document.querySelector('button[aria-label="' + label + '"]');
const click = async (el) => { await React.act(async () => { el.click(); }); };

describe('word-problem challenges', () => {
  it('"Next Challenge" after a solved word problem poses a new word problem', async () => {
    // genChallenge had no 'word' branch, so this button (and the N key) did nothing.
    const solved = { a: 3, b: 4, answer: 12, question: 'A garden has 3 rows with 4 plants in each row. How many plants total?', mode: 'word' };
    const view = await mount({ viewMode: 'word', challenge: solved, answer: '12', feedback: { correct: true, msg: 'ok' }, score: { correct: 1, total: 1 } });
    const next = byLabel('Next Challenge');
    expect(next).toBeTruthy();
    await click(next);
    const ch = view.state.challenge;
    expect(view.state.feedback).toBeNull();
    expect(view.state.answer).toBe('');
    expect(ch.mode).toBe('word');
    expect(ch).not.toBe(solved);
    expect(ch.answer).toBe(ch.a * ch.b);
    expect(ch.question).toContain(String(ch.a));
    expect(ch.question).toContain(String(ch.b));
    expect(view.state.challengeTypesUsed.word).toBe(true);
  });
});

describe('distributive challenges', () => {
  it('the drawn split matches the split the question names, even after the commutative toggle', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.3);
    const view = await mount({ viewMode: 'distributive', swapped: true });
    await click(byLabel('Distributive'));
    const ch = view.state.challenge;
    expect(ch.mode).toBe('distributive');
    expect(view.state.swapped).toBe(false);
    // The equation panel under the grid must read a x b = a x split + a x (b - split).
    const text = document.body.textContent.replace(/\s+/g, ' ');
    const named = ch.a + ' × ' + ch.b + ' = ' + ch.a + ' × ' + ch.split + ' + ' + ch.a + ' × ' + (ch.b - ch.split);
    expect(ch.question).toContain(named);
    expect(text).toContain(named);
  });
});
