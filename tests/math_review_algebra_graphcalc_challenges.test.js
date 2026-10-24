// Math review (algebra lane): Graphing Calculator task completion counts each
// challenge once. MATH_REVIEW_GRAPHCALC points the suite at another copy (mutation checks).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MATH_REVIEW_GRAPHCALC || 'stem_lab/stem_tool_graphcalc.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
beforeEach(() => { resetStemLab(); loadTool(FILE, 'graphCalc'); document.body.innerHTML = '<div id="root"></div>'; });
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; });

describe('graphing tasks', () => {
  it('re-completing the same task does not raise the quest count or pay XP again', async () => {
    const award = vi.fn();
    let latest;
    function App() {
      const [state, setState] = React.useState({ graphCalc: { _sideTab: 'challenge', activeChallenge: 0 } });
      latest = state;
      return window.StemLab._registry.graphCalc.render(makeCtx({ toolData: state, setToolData: setState, awardXP: award, addToast: vi.fn() }));
    }
    root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(() => root.render(React.createElement(App)));
    const complete = () => document.querySelector('button[aria-label="Complete"]');
    const firstCard = () => document.querySelector('[role="button"][aria-expanded]');
    for (let i = 0; i < 3; i++) {
      if (!complete()) await React.act(() => firstCard().click());
      expect(complete(), 'round ' + i).toBeTruthy();
      await React.act(() => complete().click());
    }
    expect(latest.graphCalc._challengesCompleted).toBe(1);
    expect(award.mock.calls.filter((c) => c[2] === 'Graphing challenge').length).toBe(1);
    const hook = window.StemLab._registry.graphCalc.questHooks.find((h) => h.id === 'complete_3_challenges');
    expect(hook.check(latest.graphCalc)).toBe(false);
  });

  it('three different tasks still complete the quest', async () => {
    let latest;
    function App() {
      const [state, setState] = React.useState({ graphCalc: { _sideTab: 'challenge', activeChallenge: -1 } });
      latest = state;
      return window.StemLab._registry.graphCalc.render(makeCtx({ toolData: state, setToolData: setState, addToast: vi.fn() }));
    }
    root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(() => root.render(React.createElement(App)));
    for (let i = 0; i < 3; i++) {
      const card = document.querySelectorAll('[role="button"][aria-expanded]')[i];
      await React.act(() => card.click());
      await React.act(() => document.querySelector('button[aria-label="Complete"]').click());
    }
    expect(latest.graphCalc._challengesCompleted).toBe(3);
    expect(window.StemLab._registry.graphCalc.questHooks.find((h) => h.id === 'complete_3_challenges').check(latest.graphCalc)).toBe(true);
  });
});
