import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Math Manipulatives "Explorer: Try all 4 modes". The check counted ANY four
// entries in modesVisited, so opening Help, Glossary, Teacher and History
// earned it without touching a manipulative. The four modes are the tool's
// original four: Base-10 Blocks, Abacus, Slide Rule and Quiz. The mode a
// learner starts in (Blocks) counts once they leave it.
//
// MR2_NUMBERSENSE_MANIP_SRC points the suite at another copy of the tool
// (mutation check: the pre-fix copy must turn these red).

const FILE = process.env.MR2_NUMBERSENSE_MANIP_SRC || 'stem_lab/stem_tool_manipulatives.js';

class NoopObserver { observe() {} unobserve() {} disconnect() {} }
if (!window.ResizeObserver) window.ResizeObserver = NoopObserver;
const ctx2d = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => { t[k] = v; return true; } });

let root = null;
beforeEach(() => {
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx2d);
  resetStemLab();
  loadTool(FILE, 'base10');
});
afterEach(async () => {
  if (root) { await React.act(async () => { root.unmount(); }); root = null; }
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

async function mount(manipState) {
  const tool = window.StemLab._registry.base10;
  const view = { state: null };
  function App() {
    const [state, setState] = React.useState({ _manipulatives: manipState });
    view.state = state._manipulatives;
    return tool.render(makeCtx({ toolData: state, setToolData: setState }));
  }
  document.body.innerHTML = '<div id="m-root"></div>';
  root = ReactDOMClient.createRoot(document.getElementById('m-root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  return view;
}
async function switchTo(mode) {
  const select = document.querySelector('nav[aria-label="Math manipulative tools"] select');
  expect(select, 'mode picker').toBeTruthy();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
  await React.act(async () => { setter.call(select, mode); select.dispatchEvent(new Event('change', { bubbles: true })); });
}

describe('Explorer badge: all 4 modes means the four manipulative modes', () => {
  it('reference screens are not modes', async () => {
    const view = await mount({});
    for (const mode of ['help', 'glossary', 'teacher', 'history', 'curriculum', 'standards']) await switchTo(mode);
    expect(view.state.mode).toBe('standards');
    expect(view.state.earnedBadges && view.state.earnedBadges.all_modes).toBeFalsy();
  });

  it('three of the four plus reference screens is not enough', async () => {
    const view = await mount({ mode: 'abacus' });
    for (const mode of ['slideRule', 'quiz', 'help', 'glossary']) await switchTo(mode);
    expect(view.state.earnedBadges && view.state.earnedBadges.all_modes).toBeFalsy();
  });

  it('starting in Blocks, then Abacus, Slide Rule and Quiz earns it', async () => {
    const view = await mount({});
    for (const mode of ['abacus', 'slideRule']) await switchTo(mode);
    expect(view.state.earnedBadges && view.state.earnedBadges.all_modes).toBeFalsy();
    await switchTo('quiz');
    expect(view.state.earnedBadges.all_modes).toBeTruthy();
    expect(view.state.modesVisited.blocks).toBe(true);
  });
});
