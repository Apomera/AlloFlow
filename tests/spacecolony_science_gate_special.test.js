import { describe, expect, it, afterEach } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

// Research and wonder science gates are not buildings: their gate.building is
// '_research_<id>' / '_wonder_<id>'. The correct-answer handler looked the id up in
// buildingDefs first and read bdef.cost of undefined, so a right answer threw
// before research or wonder progress was recorded (with AI on, the only way these
// gates appear). Drive the real handler through a mounted, stateful tool.

const act = React.act;
const mounted = [];

// jsdom has no 2D canvas; the map canvas ref draws on mount. A permissive fake
// context (every method a no-op, every property settable) keeps it inert.
const fakeCtx = () => new Proxy({}, {
  get: (o, k) => (k in o ? o[k] : (k === 'measureText' ? () => ({ width: 0 }) : (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') ? () => ({ addColorStop() {} }) : (k === 'getImageData' || k === 'createImageData') ? () => ({ data: new Uint8ClampedArray(4) }) : () => {})),
  set: (o, k, v) => { o[k] = v; return true; }
});
HTMLCanvasElement.prototype.getContext = function () { return fakeCtx(); };

function mountColony(initial) {
  resetStemLab();
  loadTool('stem_lab/stem_tool_spacecolony.js', 'spaceColony');
  const host = document.createElement('div');
  document.body.appendChild(host);
  const out = { state: null, errors: [] };
  const Icons = new Proxy({}, { get: () => () => React.createElement('span') });
  function Harness() {
    const [data, setData] = React.useState(initial);
    out.state = data;
    const ctx = {
      React, toolData: data, icons: Icons,
      setToolData: (fn) => setData((prev) => (typeof fn === 'function' ? fn(prev) : fn)),
      update() {}, updateMulti() {}, setStemLabTool() {}, addToast() {}, announceToSR() {},
      awardXP() {}, celebrate() {}, beep() {}, t: (k, fb) => fb || k,
      callGemini: null, aiAvailable: false, gradeLevel: '5th Grade', props: {}
    };
    return window.StemLab._registry.spaceColony.render(ctx);
  }
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(React.createElement(Harness)); });
  mounted.push({ root, host });
  return { host, out };
}

afterEach(() => {
  while (mounted.length) { const m = mounted.pop(); act(() => m.root.unmount()); m.host.remove(); }
});

const baseState = () => ({
  colonyPhase: 'playing',
  colony: { name: 'Aurora', planet: 'Kepler-442b' },
  colonyMap: { tiles: [], colonyPos: { x: 6, y: 6 } },
  colonyTurn: 3,
  turnPhase: 'action',
  colonyRes: { food: 100, energy: 100, water: 100, materials: 100, science: 100 },
  colonyBuildings: [],
  colonySettlers: [],
  colonyStats: { questionsAnswered: 0, correct: 0, buildingsConstructed: 0, anomaliesExplored: 0, turnsPlayed: 3 }
});

function clickOption(host, label) {
  const btn = [...host.querySelectorAll('button')].find((b) => (b.textContent || '').indexOf(label) === 0);
  expect(btn, 'option button ' + label).toBeTruthy();
  let thrown = null;
  const onErr = (e) => { thrown = e.error || e; e.preventDefault && e.preventDefault(); };
  window.addEventListener('error', onErr);
  try { act(() => { btn.click(); }); } catch (e) { thrown = e; }
  window.removeEventListener('error', onErr);
  return thrown;
}

describe('Space Colony research / wonder science gates', () => {
  it('a correct research answer completes the research without touching buildings', () => {
    const st = baseState();
    st.scienceGate = { building: '_research_xenobiology', domain: 'biology', mode: 'mcq', question: 'Q?',
      options: ['Right', 'W1', 'W2', 'W3', 'W4', 'W5'], correctIndex: 0, explanation: 'Because.',
      _researchId: 'xenobiology', _researchCost: 15 };
    const { host, out } = mountColony(st);
    const err = clickOption(host, 'A. Right');
    expect(err && String(err.message || err)).toBeFalsy();
    expect(out.state.colonyResearch).toEqual(['xenobiology']);
    expect(out.state.colonyRes.science).toBe(85);
    expect(out.state.colonyBuildings || []).toEqual([]);
    expect(out.state.colonyStats.correct).toBe(1);
    expect(out.state.scienceGate).toBeNull();
  });

  it('a correct wonder answer records wonder progress without touching buildings', () => {
    const st = baseState();
    st.scienceGate = { building: '_wonder_terraformEngine', domain: 'chemistry', mode: 'mcq', question: 'Q?',
      options: ['Right', 'W1', 'W2', 'W3', 'W4', 'W5'], correctIndex: 0, explanation: 'Because.',
      _wonderId: 'terraformEngine', _wonderChallenges: 3, _wonderName: 'Planetary Terraform Engine', _wonderCost: { energy: 50 } };
    const { host, out } = mountColony(st);
    const err = clickOption(host, 'A. Right');
    expect(err && String(err.message || err)).toBeFalsy();
    expect(out.state.colonyWonders).toEqual({ terraformEngine_progress: 1 });
    expect(out.state.colonyBuildings || []).toEqual([]);
    expect(out.state.colonyRes.energy).toBe(100);
    expect(out.state.scienceGate).toBeNull();
  });

  it('a correct free-response research answer also completes the research', () => {
    const st = baseState();
    st.scienceGate = { building: '_research_xenobiology', domain: 'biology', mode: 'freeResponse', question: 'Q?',
      answer: 'osmosis', _researchId: 'xenobiology', _researchCost: 15 };
    st.scienceGateInput = 'Osmosis';
    const { host, out } = mountColony(st);
    const btn = host.querySelector('#kepler-gate-btn');
    expect(btn).toBeTruthy();
    let thrown = null;
    try { act(() => { btn.click(); }); } catch (e) { thrown = e; }
    expect(thrown && String(thrown.message || thrown)).toBeFalsy();
    expect(out.state.colonyResearch).toEqual(['xenobiology']);
    expect(out.state.colonyBuildings || []).toEqual([]);
    expect(out.state.scienceGate).toBeNull();
  });
});
