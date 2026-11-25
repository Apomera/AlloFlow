import { describe, expect, it, afterEach } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

// Drives the real Kepler Colony turn loop in a mounted, stateful tool: predict-before-roll, dawn reports that
// match the reserves, shortage harm, offline MCQ gates with visible feedback, and XP only for results.
// SC_TOOL lets the same file run against a saved copy of the tool (fail-first check).
const TOOL = process.env.SC_TOOL || 'stem_lab/stem_tool_spacecolony.js';
const act = React.act;
const mounted = [];
const fakeCtx = () => new Proxy({}, {
  get: (o, k) => (k in o ? o[k] : (k === 'measureText' ? () => ({ width: 0 }) : (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') ? () => ({ addColorStop() {} }) : (k === 'getImageData' || k === 'createImageData') ? () => ({ data: new Uint8ClampedArray(4) }) : () => {})),
  set: (o, k, v) => { o[k] = v; return true; }
});
HTMLCanvasElement.prototype.getContext = function () { return fakeCtx(); };

function mountColony(initial) {
  resetStemLab();
  loadTool(TOOL, 'spaceColony');
  const host = document.createElement('div');
  document.body.appendChild(host);
  const out = { state: null, xp: [] };
  const Icons = new Proxy({}, { get: () => () => React.createElement('span') });
  function Harness() {
    const [data, setData] = React.useState(initial);
    out.state = data;
    const ctx = {
      React, icons: Icons, toolData: data,
      setToolData: (fn) => setData((prev) => (typeof fn === 'function' ? fn(prev) : fn)),
      update() {}, updateMulti() {}, setStemLabTool() {}, addToast() {}, announceToSR() {},
      awardXP: (id, points, reason) => out.xp.push([id, points, reason]),
      celebrate() {}, beep() {}, t: (k, fb) => fb || k,
      callGemini: null, aiAvailable: false, gradeLevel: '5th Grade', props: {}
    };
    return window.StemLab._registry.spaceColony.render(ctx);
  }
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(React.createElement(Harness)); });
  mounted.push({ root, host });
  return { host, out };
}
afterEach(() => { while (mounted.length) { const m = mounted.pop(); act(() => m.root.unmount()); m.host.remove(); } });

const settlers = () => Array.from({ length: 6 }, (_, i) => ({ name: 'S' + i, role: 'r', icon: 'x', specialty: 'biology', morale: 80, health: 100 }));
const base = (extra) => Object.assign({
  colonyPhase: 'playing', colony: { name: 'Aurora', planet: 'Centauri Haven (fictional)' }, colonyName: 'Aurora',
  colonyMap: { tiles: [], colonyPos: { x: 6, y: 6 } }, colonyTurn: 1, turnPhase: 'dusk', actionPoints: 3,
  colonyRes: { food: 40, energy: 30, water: 30, materials: 20, science: 10 }, colonyBuildings: [], colonySettlers: settlers(),
  colonyMissionProfile: 'balanced', colonyHappiness: 70, colonyEquity: 75,
  colonyStats: { questionsAnswered: 0, correct: 0, buildingsConstructed: 0, anomaliesExplored: 0, turnsPlayed: 0 }
}, extra || {});
const calm = { raw: 45, modified: 45, bonus: 0, result: { icon: 'x', label: 'Calm', color: '#22c55e', type: 'calm' } };
const btn = (host, re) => [...host.querySelectorAll('button')].find((b) => re.test((b.textContent || '').trim()));
const click = (el) => act(() => { el.click(); });
const buildBtn = (host) => {
  const panel = host.querySelector('#spacecolony-construction');
  expect(panel, 'construction panel').toBeTruthy();
  const b = [...panel.querySelectorAll('button')].find((x) => /Build$/.test((x.textContent || '').trim()));
  expect(b, 'first Build button').toBeTruthy();
  return b;
};

describe('Kepler Colony turn loop', () => {
  it('asks for a prediction before the dice can be rolled', () => {
    const { host, out } = mountColony(base());
    const roll = btn(host, /Roll the Dice/);
    expect(roll).toBeTruthy();
    expect(roll.disabled).toBe(true);
    click(btn(host, /Lower$/));
    expect(out.state.colonyForecastGuess).toMatchObject({ turn: 1, guess: 'down' });
    expect(btn(host, /Roll the Dice/).disabled).toBe(false);
  });

  it('reports dawn income and the turn summary from the final reserves, and checks the forecast', () => {
    const { host, out } = mountColony(base({ fateRoll: calm, fateAnimating: false, colonyForecastGuess: { turn: 1, res: 'food', guess: 'down', expected: -6, parts: [{ label: '6 settlers eat', amount: -6 }] } }));
    const before = Object.assign({}, out.state.colonyRes);
    click(btn(host, /Continue to Dawn/));
    const s = out.state, after = s.colonyRes;
    expect(s.colonyTurn).toBe(2);
    ['food', 'energy', 'water', 'materials', 'science'].forEach((k) => {
      expect(s.dawnData.income[k], 'dawn ' + k).toBe(after[k] - before[k]);
      expect(s.turnSummary.deltas[k], 'summary ' + k).toBe(after[k] - before[k]);
    });
    const fr = s.colonyForecastResult;
    expect(fr.actual).toBe(after.food - before.food);
    const dir = fr.actual > 0 ? 'up' : fr.actual < 0 ? 'down' : 'same';
    expect(fr.correct).toBe(dir === 'down');
    expect(out.xp.some((x) => x[1] === 5 && /forecast confirmed/.test(x[2]))).toBe(fr.correct);
    expect(out.xp.some((x) => /Turn/.test(String(x[2])))).toBe(false);
    expect(host.querySelector('[data-colony-forecast-check]')).toBeTruthy();
  });

  it('an empty water reserve shows an alarm and costs every settler health at the end of the sol', () => {
    const { host, out } = mountColony(base({ fateRoll: calm, fateAnimating: false, colonyRes: { food: 40, energy: 30, water: 0, materials: 20, science: 10 } }));
    const card = host.querySelector('[data-colony-alarm-card]');
    expect(card && card.textContent).toMatch(/Water reserve is empty/);
    click(btn(host, /Continue to Dawn/));
    expect(out.state.colonySettlers.map((st) => st.health)).toEqual([85, 85, 85, 85, 85, 85]);
    expect(out.state.colonyAlarm).toMatchObject({ alarms: ['water'], healthLoss: 15 });
  });

  it('offline MCQ gates have 4 options, explain a wrong pick, and pay XP only for a right one', () => {
    const { host, out } = mountColony(base({ turnPhase: 'day', showBuild: true, colonyMode: 'mcq', colonyRes: { food: 100, energy: 100, water: 100, materials: 100, science: 100 } }));
    click(buildBtn(host));
    const gate = out.state.scienceGate;
    expect(gate && gate.mode).toBe('mcq');
    expect(gate.options).toHaveLength(4);
    const wrongIndex = gate.correctIndex === 0 ? 1 : 0;
    click(btn(host, new RegExp('^' + String.fromCharCode(65 + wrongIndex) + '\\. ')));
    const fb = host.querySelector('[data-colony-gate-feedback]');
    expect(fb && fb.textContent).toContain(gate.whys[wrongIndex]);
    expect(out.xp.filter((x) => /^Built /.test(String(x[2])))).toHaveLength(0);
    click(btn(host, /^Got it$/));
    expect(host.querySelector('[data-colony-gate-feedback]')).toBeNull();
  });

  it('a right offline answer builds at full efficiency and awards XP through ctx.awardXP', () => {
    const { host, out } = mountColony(base({ turnPhase: 'day', showBuild: true, colonyMode: 'mcq', colonyRes: { food: 100, energy: 100, water: 100, materials: 100, science: 100 } }));
    click(buildBtn(host));
    const gate = out.state.scienceGate;
    click(btn(host, new RegExp('^' + String.fromCharCode(65 + gate.correctIndex) + '\\. ')));
    expect(out.state.colonyBuildings).toEqual([gate.building]);
    expect(out.state.buildingEff[gate.building]).toBe(100);
    expect(out.xp).toContainEqual(['spaceColony', 30, expect.stringMatching(/^Built /)]);
    expect(host.querySelector('[data-colony-gate-feedback]').getAttribute('data-colony-gate-feedback')).toBe('correct');
  });
});
