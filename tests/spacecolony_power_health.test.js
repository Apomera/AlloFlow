import { describe, expect, it, afterEach, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

// Kepler Colony round 2: the power budget (one table for turn, forecast, cards and reports, with load shedding),
// what happens at 0 health (warning, evacuation, end of mission), free-response grading, AI disaster option order,
// naming, and 12 px text. Model checks run the functions; turn checks click the real Continue to Dawn handler.
// SC_TOOL lets the same file run against a saved copy of the tool (fail-first check).
const TOOL = process.env.SC_TOOL || 'stem_lab/stem_tool_spacecolony.js';
const act = React.act;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
const fakeCtx = () => new Proxy({}, {
  get: (o, k) => (k in o ? o[k] : (k === 'measureText' ? () => ({ width: 0 }) : (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') ? () => ({ addColorStop() {} }) : (k === 'getImageData' || k === 'createImageData') ? () => ({ data: new Uint8ClampedArray(4) }) : () => {})),
  set: (o, k, v) => { o[k] = v; return true; }
});
HTMLCanvasElement.prototype.getContext = function () { return fakeCtx(); };

function mountColony(initial, extraCtx) {
  resetStemLab();
  loadTool(TOOL, 'spaceColony');
  const host = document.createElement('div');
  document.body.appendChild(host);
  const out = { state: null, xp: [] };
  const Icons = new Proxy({}, { get: () => () => React.createElement('span') });
  function Harness() {
    const [data, setData] = React.useState(initial);
    out.state = data;
    out.set = setData;
    const ctx = Object.assign({
      React, icons: Icons, toolData: data,
      setToolData: (fn) => setData((prev) => (typeof fn === 'function' ? fn(prev) : fn)),
      update() {}, updateMulti() {}, setStemLabTool() {}, addToast() {}, announceToSR() {},
      awardXP: (id, points, reason) => out.xp.push([id, points, reason]),
      celebrate() {}, beep() {}, t: (k, fb) => fb || k, callGemini: null, aiAvailable: false, gradeLevel: '5th Grade', props: {}
    }, extraCtx || {});
    return window.StemLab._registry.spaceColony.render(ctx);
  }
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(React.createElement(Harness)); });
  mounted.push({ root, host });
  return { host, out };
}
afterEach(() => { vi.restoreAllMocks(); while (mounted.length) { const m = mounted.pop(); act(() => m.root.unmount()); m.host.remove(); } });

const people = (n, health) => Array.from({ length: n }, (_, i) => ({ name: 'S' + i, role: 'r', icon: 'x', specialty: 'biology', morale: 80, health: Array.isArray(health) ? health[i] : (health == null ? 100 : health) }));
const base = (extra) => Object.assign({
  colonyPhase: 'playing', colony: { name: 'Aurora', planet: 'Centauri Haven (fictional)' }, colonyName: 'Aurora',
  colonyMap: { tiles: [], colonyPos: { x: 6, y: 6 } }, colonyTurn: 1, turnPhase: 'dusk', actionPoints: 3,
  colonyRes: { food: 40, energy: 30, water: 30, materials: 20, science: 10 }, colonyBuildings: [], colonySettlers: people(6),
  colonyMissionProfile: 'balanced', colonyHappiness: 70, colonyEquity: 75, buildingEff: {},
  colonyStats: { questionsAnswered: 0, correct: 0, buildingsConstructed: 0, anomaliesExplored: 0, turnsPlayed: 0 },
  fateRoll: { raw: 45, modified: 45, bonus: 0, result: { icon: 'x', label: 'Calm', color: '#22c55e', type: 'calm' } }, fateAnimating: false
}, extra || {});
const btn = (host, re) => [...host.querySelectorAll('button')].find((b) => re.test((b.textContent || '').trim()));
const click = (el) => act(() => { el.click(); });
const dawn = (host) => { vi.spyOn(Math, 'random').mockReturnValue(0.5); click(btn(host, /Continue to Dawn/)); };

let M;
beforeAll(() => { resetStemLab(); loadTool(TOOL, 'spaceColony'); M = window.StemLab.spaceColonyModel; });

describe('power budget model', () => {
  it('one table: generators make power, systems use it, the habitat always draws, power is no longer a production', () => {
    expect(M.powerTable).toBeTruthy();
    expect(M.powerTable.solar).toBeGreaterThan(0);
    expect(M.powerTable.fusion).toBeGreaterThan(M.powerTable.solar);
    ['hydroponics', 'waterReclaim', 'mine', 'lab', 'medbay', 'refinery', 'atmo', 'cloning', 'shield', 'oceanSeeder', 'biodome', 'comms', 'spaceport'].forEach((id) => expect(M.powerTable[id], id).toBeLessThan(0));
    expect(M.powerTable.greenhouse).toBe(0);
    expect(M.habitatPower).toBeGreaterThan(0);
    expect(M.powerText('solar')).toBe('Makes ' + M.powerTable.solar + ' power/sol');
    expect(M.powerText('refinery')).toBe('Uses ' + -M.powerTable.refinery + ' power/sol');
    const src = readFileSync(TOOL, 'utf8');
    expect(src).not.toMatch(/production: \{ energy:/);
  });
  it('with enough stored power everything runs and the reserve moves by made - used', () => {
    const p = M.powerStep(30, ['solar', 'hydroponics', 'waterReclaim'], {}, []);
    const used = M.habitatPower - M.powerTable.hydroponics - M.powerTable.waterReclaim;
    expect(p.offline).toEqual([]);
    expect(p.made).toBe(M.powerTable.solar);
    expect(p.use).toBe(used);
    expect(p.reserveAfter).toBe(30 + M.powerTable.solar - used);
    expect(p.net).toBe(M.powerTable.solar - used);
  });
  it('a shortfall switches systems off in the stated order (least vital first), life support last', () => {
    const b = ['solar', 'hydroponics', 'waterReclaim', 'mine', 'lab', 'greenhouse', 'medbay', 'refinery', 'atmo', 'oceanSeeder'];
    const p = M.powerStep(3, b, {}, []);
    const order = M.shedOrder.filter((id) => b.includes(id));
    expect(p.offline).toEqual(order.slice(0, p.offline.length));
    expect(p.offline[0]).toBe('refinery');
    expect(p.use).toBeLessThanOrEqual(3 + p.made);
    expect(p.reserveAfter).toBe(3 + p.made - p.use);
    expect(M.shedOrder.slice(-3)).toEqual(['medbay', 'hydroponics', 'waterReclaim']);
    // A broken generator (0% efficiency) makes nothing; with nothing stored even life support switches off.
    const dark = M.powerStep(0, ['solar', 'hydroponics', 'waterReclaim'], { solar: 0 }, []);
    expect(dark.offline).toEqual(['hydroponics', 'waterReclaim']);
    expect(dark.habitatShort).toBe(true);
    expect(dark.reserveAfter).toBe(0);
  });
  it('steady extras (doctrine, policy, season, research, mentors) count as made or used power', () => {
    const p = M.powerStep(10, ['solar'], {}, [{ label: 'Doctrine', amount: -1 }, { label: 'Dry Season', amount: 2 }]);
    expect(p.made).toBe(M.powerTable.solar + 2);
    expect(p.use).toBe(M.habitatPower + 1);
  });
  it('the baseline forecast reads the same budget: switched-off systems make nothing', () => {
    const defs = [{ id: 'hydroponics', name: 'Hydroponics Bay', production: { food: 3 } }, { id: 'lab', name: 'Research Lab', production: { science: 3 } }, { id: 'solar', name: 'Solar Array', production: {} }];
    const f = M.baselineForecast(6, ['hydroponics', 'lab', 'solar'], defs, {}, { science: 1 }, { energy: 0, powerExtras: [] });
    const pw = M.powerStep(0, ['hydroponics', 'lab', 'solar'], {}, []);
    expect(f.energy.total).toBe(pw.net);
    expect(f.power.offline).toEqual(pw.offline);
    expect(f.science.total).toBe(1 + (pw.offline.includes('lab') ? 0 : 3));
    expect(f.food.total).toBe(-6 + (pw.offline.includes('hydroponics') ? 0 : 3));
    expect(f.energy.parts.map((x) => x.label)).toContain('Habitat air and heat');
  });
});

describe('health model: warning, evacuation, end of mission', () => {
  it('heals, then harms; a settler at 0 is evacuated; settlers who would reach 0 next sol are at risk', () => {
    const hs = M.healthStep(people(4, [100, 30, 12, 15]), { water: 0, food: 5, energy: 5 }, 0);
    expect(hs.healthLoss).toBe(M.shortageHarm.water);
    expect(hs.evacuated.map((s) => s.name)).toEqual(['S2', 'S3']);
    expect(hs.settlers.map((s) => s.health)).toEqual([85, 15]);
    expect(hs.atRisk.map((s) => s.name)).toEqual(['S1']);
    expect(hs.everyoneLeft).toBe(false);
    const healed = M.healthStep(people(1, [12]), { water: 0, food: 5, energy: 5 }, M.medbayHeal);
    expect(healed.settlers[0].health).toBe(12 + M.medbayHeal - M.shortageHarm.water);
    expect(M.healthStep(people(2, [5, 10]), { water: 0, food: 0, energy: 5 }, 0).everyoneLeft).toBe(true);
    expect(M.healthStep([], { water: 0 }, 0).everyoneLeft).toBe(false);
    // Power harm follows the budget: only when the habitat itself could not be powered.
    expect(M.lifeSupportCheck({ water: 5, food: 5, energy: 0 }, true).alarms).toEqual([]);
    expect(M.lifeSupportCheck({ water: 5, food: 5, energy: 9 }, false).alarms).toEqual(['energy']);
    expect(M.healthStep(people(1, [50]), { water: 5, food: 5, energy: 0 }, 0, true).settlers[0].health).toBe(50);
  });
  it('the end-of-mission review names what went wrong and what to try', () => {
    let t = null;
    t = M.tallyAdd(t, { alarms: ['water'], offline: ['lab'], evacuated: 0 });
    t = M.tallyAdd(t, { alarms: ['water', 'food'], offline: ['lab', 'mine'], evacuated: 6 });
    const r = M.missionReview(t, { lab: 'Research Lab', mine: 'Mining Rig' });
    expect(r.causes).toContain('Water was empty for 2 sols.');
    expect(r.causes).toContain('Food was empty for 1 sol.');
    expect(r.causes.join(' ')).toMatch(/Power ran short on 2 sols.*Research Lab/);
    expect(r.tips.join(' ')).toMatch(/Solar Array/);
    expect(r.tips.join(' ')).toMatch(/Water Reclaimer/);
  });
});

describe('the real turn handler', () => {
  it('a calm sol changes Power by exactly the forecast, and the build panel shows the same line', () => {
    const b = ['solar', 'hydroponics', 'waterReclaim', 'mine'];
    const start = base({ turnPhase: 'day', colonyBuildings: b, colonyRes: { food: 40, energy: 20, water: 30, materials: 20, science: 10 }, showBuild: true });
    const { host, out } = mountColony(start);
    const plan = M.powerStep(20, b, {}, []);
    expect(host.querySelector('[data-colony-build-power]').textContent).toContain('makes ' + plan.made + ', uses ' + plan.use);
    expect(host.querySelector('[data-colony-card-power="solar"]').textContent).toContain(M.powerText('solar'));
    const { host: h2, out: o2 } = mountColony(base({ colonyBuildings: b, colonyRes: { food: 40, energy: 20, water: 30, materials: 20, science: 10 } }));
    dawn(h2);
    expect(o2.state.colonyRes.energy - 20).toBe(plan.net);
    expect(o2.state.colonyPower).toMatchObject({ made: plan.made, use: plan.use, offline: [] });
    expect(h2.querySelector('[data-colony-power-report]').textContent).toContain('Stored 20 + made ' + plan.made);
  });
  it('a power shortfall switches systems off in order; they make nothing; the alarm, log and 3D label say so', () => {
    const b = ['solar', 'hydroponics', 'waterReclaim', 'mine', 'lab', 'greenhouse', 'medbay', 'refinery', 'atmo', 'oceanSeeder'];
    const res = { food: 40, energy: 3, water: 30, materials: 20, science: 10 };
    const plan = M.powerStep(3, b, {}, []);
    const { host, out } = mountColony(base({ colonyBuildings: b, colonyRes: res }));
    const card = host.querySelector('[data-colony-alarm-card]');
    expect(card && card.getAttribute('data-colony-alarm-card')).toContain('power');
    expect(card.textContent).toMatch(/these switch off: Material Refinery/);
    expect(card.textContent).toMatch(/least vital first/);
    expect(host.querySelector('[data-colony-dusk-power]').textContent).toMatch(/Material Refinery/);
    dawn(host);
    const s = out.state;
    expect(s.colonyPower.offline).toEqual(plan.offline);
    expect(s.colonyAlarm.offline).toEqual(plan.offline);
    // Switching systems off kept the habitat's air and heat running, so an empty battery did no harm.
    expect(s.colonyRes.energy).toBe(0);
    expect(s.colonyAlarm.alarms).toEqual([]);
    expect(s.colonySettlers.every((x) => x.health === 100)).toBe(true);
    // Mining Rig and Refinery were off: no materials made (balanced doctrine adds none).
    expect(plan.offline).toEqual(expect.arrayContaining(['refinery', 'mine']));
    expect(s.colonyRes.materials).toBe(20);
    expect(s.colonyLog.join('\n')).toMatch(/Power ran short\. Switched off: Material Refinery, Mining Rig/);
    expect(host.querySelector('[data-colony-power-report="short"]')).toBeTruthy();
    const cv = host.querySelector('[data-colony-3d-canvas]');
    expect(cv.getAttribute('aria-label')).toMatch(/Switched off last sol for lack of power: Material Refinery/);
  });
  it('warns one sol before, then evacuates a settler at 0 health, which lowers water and food demand', () => {
    const { host, out } = mountColony(base({ colonySettlers: people(6, [100, 100, 100, 100, 100, 20]), colonyRes: { food: 40, energy: 30, water: 0, materials: 20, science: 10 } }));
    dawn(host);
    let s = out.state;
    expect(s.colonySettlers.find((x) => x.name === 'S5').health).toBe(5);
    expect(s.colonyAlarm.atRisk).toEqual(['S5']);
    expect(host.querySelector('[data-colony-alarm-risk]').textContent).toMatch(/S5 \(health 5\).*will be evacuated/);
    // Next sol, the water is still empty.
    act(() => out.set((p) => Object.assign({}, p, { turnPhase: 'dusk', fateRoll: base().fateRoll, fateAnimating: false, colonyRes: Object.assign({}, p.colonyRes, { water: 0 }) })));
    const h2 = host;
    dawn(h2);
    s = out.state;
    expect(s.colonySettlers.map((x) => x.name)).not.toContain('S5');
    expect(s.colonyEvacuated.map((x) => x.name)).toEqual(['S5']);
    expect(s.colonyLog.join('\n')).toMatch(/S5 reached 0 health and was evacuated to the rescue ship to recover/);
    expect(h2.textContent).toMatch(/5 settlers · 1 evacuated/);
    expect(h2.querySelector('[data-colony-alarm-card]').textContent).toMatch(/S5 was evacuated to the rescue ship last sol/);
    const f = M.baselineForecast(s.colonySettlers.length, [], [], {}, {}, {});
    expect(f.water.total).toBe(-Math.ceil(5 * 0.5));
  });
  it('when everyone is evacuated the mission ends with what went wrong and a restart', () => {
    const { host, out } = mountColony(base({ colonySettlers: people(3, [10, 5, 12]), colonyRes: { food: 40, energy: 30, water: 0, materials: 20, science: 10 } }));
    dawn(host);
    expect(out.state.colonyMissionEnd).toMatchObject({ evacuated: 3 });
    const end = host.querySelector('[data-colony-mission-end]');
    expect(end).toBeTruthy();
    expect(end.textContent).toMatch(/Mission over: everyone is safe/);
    expect(end.textContent).toMatch(/Water was empty for 1 sol/);
    expect(end.textContent).toMatch(/Build a Water Reclaimer before the water runs low/);
    expect(btn(host, /Continue to Dawn/)).toBeFalsy();
    click(host.querySelector('[data-colony-restart]'));
    expect(out.state.colonyPhase).toBe('setup');
    expect(out.state.colonyMissionEnd).toBeNull();
  });
});

describe('free-response grading', () => {
  const g = (input, spec) => M.gradeFreeResponse(input, spec);
  it('numbers are parsed with a unit and a tolerance', () => {
    expect(g('110', 'spaceport').ok).toBe(false);
    expect(g('110', 'spaceport').feedback).toMatch(/110 km\/s.*about 10 times too big/);
    ['11', '11.2 km/s', 'about 11 km per second', '11200 m/s', '25,000 mph'].forEach((x) => expect(g(x, 'spaceport').ok, x).toBe(true));
    expect(g('11 or 110', 'spaceport').feedback).toMatch(/one number/);
    ['300000', '300,000 km/s', '3 x 10^8 m/s', '186,000 miles per second', '3e5'].forEach((x) => expect(g(x, 'comms').ok, x).toBe(true));
    expect(g('30000', 'comms').ok).toBe(false);
    expect(g('13.14', 'lab').ok).toBe(false);
    expect(g('3.14', 'lab').ok).toBe(true);
    expect(g('pi', 'lab').feedback).toMatch(/Type a number/);
  });
  it('word answers need the key idea, and a pasted list of choices does not pass', () => {
    expect(g('igneous sedimentary metamorphic', 'mine').ok).toBe(false);
    expect(g('igneous', 'mine').ok).toBe(true);
    expect(g('nitrogen and oxygen', 'atmo').ok).toBe(false);
    expect(g('field', 'shield').ok).toBe(false);
    expect(g('field', 'shield').feedback).toMatch(/magnet/);
    expect(g('magnetic field', 'shield').ok).toBe(true);
    expect(g('heat', 'greenhouse').ok).toBe(false);
    expect(g('heat', 'greenhouse').feedback).toMatch(/held in/);
    expect(g('the glass traps heat inside', 'greenhouse').ok).toBe(true);
    expect(g('cellulose', 'medbay').ok).toBe(false);
    expect(g('cells', 'medbay').ok).toBe(true);
    expect(g('h2o2', 'waterReclaim').ok).toBe(false);
    expect(g('H₂O', 'waterReclaim').ok).toBe(true);
    expect(g('light', 'solar').feedback).toMatch(/Yes, light/);
  });
  it('AI answers become a rubric: all key words, or a number within 2%', () => {
    expect(g('carbon', 'Carbon dioxide').ok).toBe(false);
    expect(g('carbon dioxide', 'Carbon dioxide').ok).toBe(true);
    expect(g('a, b, c, newton third law', "Newton's third law").ok).toBe(false);
    expect(g('9.8', '9.8 m/s²').ok).toBe(true);
    expect(g('98', '9.8 m/s²').ok).toBe(false);
    expect(g('anything', '').ok).toBe(false);
  });
  it('the gate gives a hint on the first miss, then shows the answer and locks that building until next sol', () => {
    const { host, out } = mountColony(base({ turnPhase: 'day', showBuild: true, colonyMode: 'freeResponse', colonyRes: { food: 100, energy: 100, water: 100, materials: 100, science: 100 } }));
    const panel = host.querySelector('#spacecolony-construction');
    click([...panel.querySelectorAll('button')].find((x) => /Build$/.test((x.textContent || '').trim())));
    const gate = out.state.scienceGate;
    expect(gate.mode).toBe('freeResponse');
    expect(gate.building).toBe('hydroponics');
    const input = host.querySelector('input[aria-label="Your answer to the science gate challenge"]');
    const type = (v) => act(() => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(input, v); input.dispatchEvent(new Event('input', { bubbles: true })); });
    type('respiration');
    click(host.querySelector('#kepler-gate-btn'));
    expect(out.state.scienceGate).toBeTruthy();
    expect(host.querySelector('[data-colony-fr-feedback]').textContent).toMatch(/Respiration releases energy/);
    type('plants grow');
    click(host.querySelector('#kepler-gate-btn'));
    expect(out.state.scienceGate).toBeNull();
    expect(out.state.colonyBuildings).toEqual([]);
    expect(host.querySelector('[data-colony-gate-feedback]').textContent).toMatch(/Answer: Photosynthesis/);
    expect(out.state.colonyGateLock).toEqual({ building: 'hydroponics', turn: 1 });
    expect(host.querySelector('#spacecolony-construction').textContent).toMatch(/try this one again next sol/);
  });
  it('a right free-response answer builds', () => {
    const { host, out } = mountColony(base({ turnPhase: 'day', showBuild: true, colonyMode: 'freeResponse', colonyRes: { food: 100, energy: 100, water: 100, materials: 100, science: 100 } }));
    click([...host.querySelector('#spacecolony-construction').querySelectorAll('button')].find((x) => /Build$/.test((x.textContent || '').trim())));
    const input = host.querySelector('input[aria-label="Your answer to the science gate challenge"]');
    act(() => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(input, 'Photosynthesis!'); input.dispatchEvent(new Event('input', { bubbles: true })); });
    click(host.querySelector('#kepler-gate-btn'));
    expect(out.state.colonyBuildings).toEqual(['hydroponics']);
    expect(out.xp).toContainEqual(['spaceColony', 30, 'Built Hydroponics Bay']);
  });
});

describe('AI disaster options, naming and text size', () => {
  it('reorders an AI disaster\'s options locally and keeps the key', async () => {
    const reply = JSON.stringify({ emoji: '!', title: 'Dust Surge', description: 'd', lesson: 'l', question: 'q?', options: ['RIGHT', 'w1', 'w2', 'w3', 'w4', 'w5'], correctIndex: 0, fullDamage: { food: -5 }, mitigatedDamage: { food: -1 } });
    const callGemini = vi.fn(() => Promise.resolve(reply));
    const { host, out } = mountColony(base({ colonyTurn: 19 }), { callGemini, aiAvailable: true, aiHintsEnabled: true });
    vi.spyOn(Math, 'random').mockReturnValue(0.4);
    click(btn(host, /Continue to Dawn/));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await new Promise((r) => setTimeout(r, 0)); });
    const dis = out.state.activeDisaster;
    expect(dis, 'disaster generated').toBeTruthy();
    expect(dis.options[dis.correctIndex]).toBe('RIGHT');
    expect(dis.options.slice().sort()).toEqual(['RIGHT', 'w1', 'w2', 'w3', 'w4', 'w5']);
    const M2 = window.StemLab.spaceColonyModel;
    expect(dis.correctIndex).toBe(M2.shuffleMcq({ options: ['RIGHT', 'w1', 'w2', 'w3', 'w4', 'w5'], correctIndex: 0 }, 'disaster:20').correctIndex);
  });
  it('"Kepler" is the colony name; nothing places the colony at Kepler-442b', () => {
    const src = readFileSync(TOOL, 'utf8');
    expect(src).not.toMatch(/'Kepler-442b'/);
    expect(src).toContain('Kepler is the name of your colony, not of the planet.');
    const { host } = mountColony(base({ colony: { name: 'Legacy', planet: 'Kepler-442b' }, turnPhase: 'day' }));
    expect(host.querySelector('#centauri-habitat-title').textContent).toBe('Centauri Haven (fictional)');
    expect(host.textContent).not.toMatch(/Kepler-442b/);
  });
  it('no 10-11 px class text is left (two contrast-pinned classes carry an inline 12 px size)', () => {
    const src = readFileSync(TOOL, 'utf8');
    expect(src).not.toContain('text-[0.625rem]');
    const left = src.split('text-[0.6875rem]').length - 1;
    expect(left).toBe(2);
    expect(src.split("text-[0.6875rem] hover:bg-indigo-900 active:scale-[0.97]', style: { fontSize: '0.75rem' }").length).toBe(2);
    expect(src.split("text-[0.6875rem] font-bold hover:bg-yellow-900 active:scale-[0.97]', style: { fontSize: '0.75rem' }").length).toBe(2);
  });
});
