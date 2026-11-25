import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

// Scripted campaigns through the REAL Kepler Colony turn handler (Continue to Dawn), with calm fate rolls and
// Math.random pinned so weather and arrivals are repeatable. Day actions follow the real rules: a build pays its
// cost, one build and one exploration (-2 power, +2 materials) per sol. It checks the power budget's balance:
// a sensible colony under each doctrine stays powered and healthy and reaches 100% terraforming, while a
// careless one (no generator) runs short, switches life support off, harms and evacuates settlers. SC_TOOL lets the file run against a saved copy (fail-first).
const TOOL = process.env.SC_TOOL || 'stem_lab/stem_tool_spacecolony.js';
const act = React.act;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const YIELD = ['materials', 'water', 'food', 'materials', 'water', 'food', 'science', 'energy', 'materials', 'water'];
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
  const out = { state: null, set: null };
  const Icons = new Proxy({}, { get: () => () => React.createElement('span') });
  function Harness() {
    const [data, setData] = React.useState(initial);
    out.state = data;
    out.set = setData;
    const ctx = {
      React, icons: Icons, toolData: data,
      setToolData: (fn) => setData((prev) => (typeof fn === 'function' ? fn(prev) : fn)),
      update() {}, updateMulti() {}, setStemLabTool() {}, addToast() {}, announceToSR() {}, awardXP() {},
      celebrate() {}, beep() {}, t: (k, fb) => fb || k, callGemini: null, aiAvailable: false, gradeLevel: '5th Grade', props: {}
    };
    return window.StemLab._registry.spaceColony.render(ctx);
  }
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(React.createElement(Harness)); });
  mounted.push({ root, host });
  return { host, out };
}
beforeEach(() => { vi.spyOn(Math, 'random').mockReturnValue(0.5); });
afterEach(() => { vi.restoreAllMocks(); while (mounted.length) { const m = mounted.pop(); act(() => m.root.unmount()); m.host.remove(); } });

const START = { balanced: { food: 40, energy: 30, water: 30, materials: 20, science: 10 }, ecology: { food: 48, energy: 22, water: 38, materials: 18, science: 12 }, frontier: { food: 34, energy: 38, water: 25, materials: 30, science: 8 } };
const DEFS = {
  hydroponics: [{ materials: 15, energy: 5 }, []], solar: [{ materials: 10, science: 5 }, []], waterReclaim: [{ materials: 12, energy: 5 }, []], mine: [{ energy: 10, water: 5 }, []],
  lab: [{ materials: 20, energy: 10 }, ['solar', 'mine']], medbay: [{ materials: 15, science: 10 }, ['hydroponics', 'waterReclaim']], atmo: [{ materials: 25, energy: 15, science: 10 }, ['lab', 'waterReclaim']],
  fusion: [{ materials: 30, science: 20 }, ['lab', 'solar']], biodome: [{ materials: 50, energy: 30, science: 25, water: 20 }, ['atmo', 'fusion', 'medbay']], comms: [{ materials: 40, energy: 25, science: 30 }, ['fusion', 'lab']],
  greenhouse: [{ materials: 18, water: 10 }, ['hydroponics', 'waterReclaim']], refinery: [{ energy: 15, materials: 10 }, ['mine', 'solar']], cloning: [{ materials: 30, science: 20, energy: 15 }, ['medbay', 'lab']],
  shield: [{ materials: 35, energy: 25, science: 15 }, ['fusion', 'atmo']], oceanSeeder: [{ materials: 25, water: 15, science: 10 }, ['waterReclaim', 'atmo']], spaceport: [{ materials: 60, energy: 40, science: 35 }, ['comms', 'fusion', 'shield']]
};
const calm = { raw: 45, modified: 45, bonus: 0, result: { icon: 'x', label: 'Calm', color: '#22c55e', type: 'calm' } };
const settlers = () => Array.from({ length: 6 }, (_, i) => ({ name: 'S' + i, role: 'r', icon: 'x', specialty: 'biology', morale: 80, health: 100 }));

// A sensible student (default options) builds the first affordable system among the next three on the plan, keeps
// a little power, water and food when paying for it, explores only with spare power, and uses the Resource Converter
// when food is low or power is plentiful. A careless student (careless: true) builds strictly in order with no
// reserve floor, explores until power is gone and never trades.
function campaign(doctrine, plan, sols, opts) {
  const o = Object.assign({ careless: false }, opts || {});
  const floor = o.careless ? { energy: 0, water: 0, food: 0 } : { energy: 2, water: 3, food: 3 };
  const { host, out } = mountColony({
    colonyPhase: 'playing', colony: { name: 'Sim', planet: 'Centauri Haven (fictional)' }, colonyName: 'Sim', colonyMap: { tiles: [], colonyPos: { x: 6, y: 6 } },
    colonyTurn: 1, turnPhase: 'day', actionPoints: 3, colonyRes: Object.assign({}, START[doctrine]), colonyBuildings: [], colonySettlers: settlers(),
    colonyMissionProfile: doctrine, colonyHappiness: 70, colonyEquity: 75, buildingEff: {},
    colonyStats: { questionsAnswered: 0, correct: 0, buildingsConstructed: 0, anomaliesExplored: 0, turnsPlayed: 0 }
  });
  const rows = [];
  for (let sol = 1; sol <= sols; sol++) {
    const st = out.state;
    if (st.colonyMissionEnd) break;
    act(() => out.set((p) => {
      const res = Object.assign({}, p.colonyRes), b = (p.colonyBuildings || []).slice(), eff = Object.assign({}, p.buildingEff || {});
      // Dossier claims a student can collect: first system online (+5 materials), first survey (+4 science), Sol 3 (+5 science).
      const claims = Object.assign({}, p.simClaims || {});
      if (!claims.loop && b.length > 0) { claims.loop = 1; res.materials += 5; }
      if (!claims.survey && sol >= 2) { claims.survey = 1; res.science += 4; }
      if (!claims.feedback && sol >= 3) { claims.feedback = 1; res.science += 5; }
      const affordable = (id) => DEFS[id][1].every((r) => b.includes(r)) && Object.keys(DEFS[id][0]).every((k) => res[k] - DEFS[id][0][k] >= (floor[k] || 0));
      const id = plan.filter((x) => !b.includes(x)).slice(0, o.careless ? 1 : 3).find(affordable);
      if (id) { Object.keys(DEFS[id][0]).forEach((k) => { res[k] -= DEFS[id][0][k]; }); b.push(id); eff[id] = 100; }
      for (let x = 0; x < 2; x++) { if (res.energy < (o.careless ? 2 : 12)) break; res.energy -= 2; res[YIELD[(sol * 2 + x) % YIELD.length]] += 2; }
      // Resource Converter (5 of one for 3 of another), used the way the alarm card suggests.
      for (let x = 0; x < 3 && !o.careless && res.food < 15 && res.water >= 20; x++) { res.water -= 5; res.food += 3; }
      const nextNeed = (DEFS[plan.find((x) => !b.includes(x))] || [{}])[0].energy || 0;
      for (let x = 0; x < 3 && !o.careless && res.energy > 30 + nextNeed; x++) { res.energy -= 5; res.materials += 3; }
      // Spare science buys the food and water research (Xenobiology, then Bioengineering, then Cryogenic Storage).
      const rq = (p.colonyResearch || []).slice();
      const study = [['xenobiology', 15], ['bioengine', 18], ['cryonics', 28]].find((x) => !rq.includes(x[0]));
      if (!o.careless && study && res.science >= study[1] + 20) { res.science -= study[1]; rq.push(study[0]); }
      return Object.assign({}, p, { colonyRes: res, colonyBuildings: b, buildingEff: eff, simClaims: claims, colonyResearch: rq, turnPhase: 'dusk', fateRoll: calm, fateAnimating: false, colonyForecastGuess: { turn: p.colonyTurn, res: 'food', guess: 'down', expected: 0, parts: [] } });
    }));
    const btn = [...host.querySelectorAll('button')].find((x) => /Continue to Dawn/.test(x.textContent || ''));
    if (!btn) break;
    act(() => { btn.click(); });
    const s2 = out.state, pw = s2.colonyPower || {};
    rows.push({ sol, e: s2.colonyRes.energy, f: s2.colonyRes.food, w: s2.colonyRes.water, m: s2.colonyRes.materials, sci: s2.colonyRes.science, n: (s2.colonySettlers || []).length, evac: (s2.colonyEvacuated || []).length, off: (pw.offline || []).join('+'), net: pw.net, tf: s2.colonyTerraform, built: (s2.colonyBuildings || []).length, minH: Math.min(...(s2.colonySettlers || [{ health: 0 }]).map((x) => x.health)) });
    act(() => out.set((p) => Object.assign({}, p, { turnPhase: 'day', actionPoints: 3, builtThisTurn: false })));
  }
  return { rows, state: out.state, built: out.state.colonyBuildings || [] };
}
const summary = (r) => { const x = r.rows; const tf = x.find((y) => y.tf >= 100); return 'sols ' + x.length + ', 100% terraform at sol ' + (tf ? tf.sol : 'never') + ', lowest Power ' + Math.min(...x.map((y) => y.e)) + ', sols with systems off ' + x.filter((y) => y.off).length + ', evacuated ' + (r.state.colonyEvacuated || []).length + ', lowest health ' + Math.min(...x.map((y) => (isFinite(y.minH) ? y.minH : 0))) + ', built ' + r.built.length; };
const fmt = (r) => 'SUMMARY ' + summary(r) + '\n' + r.rows.filter((x, i) => i < 3 || i % 5 === 4 || x.off || x.evac).map((x) => `sol ${x.sol}: P${x.e}(${x.net >= 0 ? '+' : ''}${x.net}) F${x.f} W${x.w} M${x.m} S${x.sci} n${x.n} ev${x.evac} tf${x.tf} b${x.built}${x.off ? ' OFF:' + x.off : ''} minH${x.minH}`).join('\n');
// Each doctrine's plan starts the way its own "first command" advises.
const LATER = ['lab', 'fusion', 'medbay', 'atmo', 'oceanSeeder', 'biodome', 'refinery', 'shield', 'cloning', 'comms', 'spaceport'];
const SENSIBLE = {
  balanced: ['hydroponics', 'solar', 'mine', 'waterReclaim', 'greenhouse'].concat(LATER),
  ecology: ['solar', 'hydroponics', 'mine', 'waterReclaim', 'greenhouse'].concat(LATER),
  frontier: ['waterReclaim', 'solar', 'hydroponics', 'mine', 'greenhouse'].concat(LATER)
};

describe('Kepler Colony power balance (scripted runs through the real turn handler)', () => {
  ['balanced', 'ecology', 'frontier'].forEach((doctrine) => {
    it('a sensible ' + doctrine + ' colony stays powered and healthy and reaches 100% terraforming', () => {
      const r = campaign(doctrine, SENSIBLE[doctrine], 80);
      console.log('SENSIBLE ' + doctrine + '\n' + fmt(r));
      expect(r.rows.every((x) => !x.off), 'no system switched off').toBe(true);
      expect(r.rows.every((x) => x.evac === 0), 'nobody evacuated').toBe(true);
      expect(r.rows.some((x) => x.tf >= 100), 'reaches 100% terraform').toBe(true);
      expect(r.built.length).toBe(16);
    });
  });
  it('a careless colony with no generator runs out of power, switches life support off and loses settlers to evacuation', () => {
    const r = campaign('balanced', ['hydroponics', 'waterReclaim', 'mine', 'greenhouse', 'medbay'], 80, { careless: true });
    console.log('CARELESS no generator\n' + fmt(r));
    expect(r.rows.some((x) => x.off), 'some sol switched systems off').toBe(true);
    const firstOff = r.rows.find((x) => x.off);
    expect(firstOff.off).toBe('hydroponics+waterReclaim');
    expect((r.state.colonyEvacuated || []).length).toBeGreaterThanOrEqual(6);
    expect(r.rows.some((x) => x.tf >= 100)).toBe(false);
  });
});
