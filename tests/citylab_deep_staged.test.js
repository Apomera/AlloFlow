// City Planning Lab stage D (2026-11-04): independent bug hunt. Each block
// is a regression test for a defect reproduced on the stage C file:
//   1. hostile saved/imported JSON ("toString|A1" edges, "constructor" ids,
//      {"toString":null} memo fields) crashed the scorecard, and a plan saved
//      that way bricked every later mount;
//   2. imported edges were not checked for adjacency or canonical order;
//   3. negative editCount handed a move-budget challenge extra moves;
//   4. the 3D signature ignored edge kinds;
//   5. a missed target could print as the target ("19.0 C, must be 19.0 C");
//   6. inspector prices ignored the assumption set's cost scale;
//   7. an imported (somebody else's) plan still earned mission XP.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

vi.setConfig({ testTimeout: 60000, hookTimeout: 30000 });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const FILE = process.env.CITYLAB_FILE || 'stem_lab/stem_tool_citylab.js';
const STORE_KEY = 'allo_citylab_plan_v1';
const act = React.act || React.unstable_act;

let P = null;
let root = null;
let errors = [];
let errSpy = null;

beforeEach(() => {
  resetStemLab();
  delete window.__alloCityLabPure;
  loadTool(FILE, 'cityLab');
  P = window.__alloCityLabPure;
  window.localStorage.removeItem(STORE_KEY);
  document.body.innerHTML = '<div id="root"></div>';
  errors = [];
  errSpy = vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ')); });
});
afterEach(async () => {
  if (root) { try { await act(() => root.unmount()); } catch (_) { /* a crashed root */ } }
  root = null;
  window.localStorage.removeItem(STORE_KEY);
  errSpy.mockRestore();
});

async function mount(opts) {
  opts = opts || {};
  const out = { latest: null, announced: [], award: vi.fn() };
  function App() {
    const [state, setState] = React.useState(opts.toolData || {});
    out.latest = state;
    return window.StemLab._registry.cityLab.render(makeCtx(Object.assign({
      toolData: state, setToolData: setState, awardXP: out.award,
      announceToSR: (m) => out.announced.push(m), theme: 'light'
    }, opts.ctx || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await act(() => root.render(React.createElement(App)));
  return out;
}
const $$ = (sel) => [...document.querySelectorAll(sel)];
const buttonByText = (text) => $$('button').find((b) => b.textContent.trim() === text);
async function click(el) { await act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }); }
const text = () => document.body.textContent;

// Riverbend, five served open parcels as mixed use with cool roofs: the
// homes' surface heat comes out a few hundredths over the 19.0 C target.
function nearHeatPlan() {
  let plan = P.basePlan('riverbend');
  const open = P.servedOpenParcels(plan);
  for (let i = 0; i < 5; i++) { plan = P.setUse(plan, open[i], 'mixed'); plan = P.toggleCoolRoof(plan, open[i]); }
  return plan;
}

describe('stage D - hostile saved and imported JSON', () => {
  it('drops edges whose ends are Object.prototype names, and the scorecard still runs', () => {
    for (const key of ['toString|A1', 'A1|constructor', '__proto__|A1', 'A1|hasOwnProperty']) {
      const r = P.importPlan({ v: 1, scenarioId: 'riverbend', edges: { [key]: 'local' } });
      expect(r.ok).toBe(true);
      expect(Object.keys(r.plan.edges).every((k) => /^[A-L]\d{1,2}\|[A-L]\d{1,2}$/.test(k))).toBe(true);
      expect(() => P.scorecard(r.plan)).not.toThrow();
      expect(r.warnings.join(' ')).toMatch(/Connections not recognised and skipped: 1/);
    }
  });

  it('never throws on prototype-named parcels or non-string memo fields', () => {
    const raw = '{"v":1,"scenarioId":"riverbend","uses":{"constructor":"park","toString":"park","A1":"park"},' +
      '"memo":{"bindingConstraint":{"toString":null},"tradeoff":{"toString":null},"counter":[1]},' +
      '"equity":{"note":{"toString":null}}}';
    let r;
    expect(() => { r = P.importPlan(raw); }).not.toThrow();
    expect(r.ok).toBe(true);
    expect(r.plan.uses.A1).toBe('park');
    expect(Object.prototype.hasOwnProperty.call(r.plan.uses, 'constructor')).toBe(false);
    expect(r.plan.memo.bindingConstraint).toBe('');
    expect(r.plan.memo.tradeoff).toBe('');
    expect(r.plan.equity.note).toBe('');
    expect(() => P.restorePlan(raw)).not.toThrow();
  });

  it('refuses a town or assumption set named after an Object.prototype member', () => {
    expect(P.importPlan({ v: 1, scenarioId: 'constructor' }).ok).toBe(false);
    expect(P.importPlan({ v: 1, scenarioId: 'toString' }).ok).toBe(false);
    expect(P.restorePlan({ v: 1, scenarioId: 'constructor' })).toBe(null);
    const r = P.importPlan({ v: 1, scenarioId: 'riverbend', assumptionSetId: 'constructor' });
    expect(r.plan.assumptionSetId).toBe('central');
    expect(Number.isFinite(P.scorecard(r.plan).tier2.runoffCoefficient)).toBe(true);
    expect(P.scenarioOf('constructor').id).toBe('riverbend');
  });

  it('teacher settings ignore prototype names for the town and the sets', () => {
    const s = P.teacherSettings({ lockTown: 'constructor', setA: 'toString', setB: '__proto__', scoreSet: 'constructor' });
    expect(s.lockTown).toBe('');
    expect(s.setA).toBe('conservative');
    expect(s.setB).toBe('optimistic');
    expect(s.scoreSet).toBe('');
  });

  it('keeps only edges between side-by-side parcels, stored under the canonical key', () => {
    const r = P.importPlan({ v: 1, scenarioId: 'riverbend', edges: { 'A1|L12': 'local', 'A1|A1': 'path', 'B1|A1': 'path' } });
    expect(r.plan.edges['A1|L12']).toBeUndefined();
    expect(r.plan.edges['A1|A1']).toBeUndefined();
    expect(r.plan.edges['B1|A1']).toBeUndefined();
    expect(r.plan.edges['A1|B1']).toBe('path');
    expect(r.warnings.join(' ')).toMatch(/skipped: 2/);
  });

  it('a reversed copy of an existing road is not billed again', () => {
    const base = P.basePlan('riverbend');
    const ex = Object.keys(base.edges)[0];
    const [a, b] = ex.split('|');
    const r = P.importPlan({ v: 1, scenarioId: 'riverbend', edges: { [b + '|' + a]: 'local' } });
    expect(Object.keys(r.plan.edges).length).toBe(Object.keys(base.edges).length);
    expect(P.scorecard(r.plan, 'central').tier2.capitalCost).toBe(0);
  });

  it('a negative edit count cannot buy extra moves, and a fractional budget is at least one move', () => {
    const neg = P.importPlan({ v: 1, scenarioId: 'riverbend', editCount: -500, moveBudget: 10 });
    expect(neg.plan.editCount).toBe(0);
    expect(P.movesLeft(neg.plan)).toBe(10);
    expect(P.importPlan({ v: 1, scenarioId: 'riverbend', moveBudget: 0.3 }).plan.moveBudget).toBe(1);
  });
});

describe('stage D - the 3D signature', () => {
  it('changes when a link changes kind (road to path)', () => {
    const base = P.basePlan('riverbend');
    const x = P.setEdge(base, 'A1', 'A2', 'local');
    const y = P.setEdge(base, 'A1', 'A2', 'path');
    expect(x).not.toBe(base);
    expect(P.massingSignature(x, 'central', 'D6')).not.toBe(P.massingSignature(y, 'central', 'D6'));
  });
});

describe('stage D - a miss never prints as the target', () => {
  it('heat 19.03 against 19.0 shows the extra decimal', () => {
    const plan = nearHeatPlan();
    const st = P.missionStatus('m_heat', plan);
    const heat = st.conds.find((c) => c.k === 'heat');
    expect(heat.met).toBe(false);
    expect(heat.value).toBeGreaterThan(heat.target);
    expect(heat.value.toFixed(1)).toBe(heat.target.toFixed(1));   // the trap is real
    const s = P.condSentence(heat);
    expect(s).toContain('(must be 19.0 C or less)');
    expect(s).not.toMatch(/: 19\.0 C \(/);
    expect(s).toContain(heat.value.toFixed(2) + ' C');
  });

  it('runoff, park and water conditions get the same treatment, and a met value is left alone', () => {
    expect(P.condSentence({ k: 'runoff', value: 1.1318, target: 1.13, met: false })).toContain('113.2% of today');
    expect(P.condSentence({ k: 'park', value: 0.797, target: 0.8, met: false })).toContain(': 79.7% (');
    expect(P.condSentence({ k: 'water', value: 1400.4, target: 1400, met: false })).not.toMatch(/: 1,?400 cubic/);
    expect(P.condSentence({ k: 'runoff', value: 1.128, target: 1.13, met: true })).toContain(': 113% of today');
    expect(P.sharpen((v, e) => v.toFixed(e), 2.4, 3, false)).toBe('2');
  });
});

describe('stage D - mounted', () => {
  it('a toolData plan with a prototype-named edge no longer crashes the tool', async () => {
    await mount({ toolData: { _cityLab: { plan: { v: 1, scenarioId: 'riverbend', edges: { 'toString|A1': 'local' } } } } });
    expect(text()).toContain('Riverbend');
    expect(errors.filter((e) => /is not a function|Cannot read/.test(e))).toEqual([]);
  });

  it('a localStorage plan with a prototype-named edge no longer crashes the tool', async () => {
    window.localStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, scenarioId: 'riverbend', edges: { 'A1|constructor': 'path' } }));
    await mount({ toolData: {} });
    expect(text()).toContain('Riverbend');
    expect(errors.filter((e) => /is not a function|Cannot read/.test(e))).toEqual([]);
  });

  it('a teacher lock naming "constructor" is ignored rather than crashing', async () => {
    await mount({ toolData: { _cityLab: { teacher: { lockTown: 'constructor' } } } });
    expect(text()).toContain('Riverbend');
    expect(errors.filter((e) => /Cannot read|Maximum update/.test(e))).toEqual([]);
  });

  it('an imported plan that meets a mission is marked done but earns no XP', async () => {
    const ex = P.parkExample('riverbend');
    let plan = P.basePlan('riverbend');
    for (const s of ex.steps) { plan = P.setUse(plan, s.id, 'park'); if (s.via) plan = P.setEdge(plan, s.id, s.via, 'path'); }
    expect(P.missionStatus('m_park', plan).met).toBe(true);
    const m = await mount({ toolData: { _cityLab: { plan: Object.assign(P.clonePlan(plan), { imported: true }), level: 'missions' } }, ctx: { gradeBand: 'g68' } });
    await click(buttonByText('Check my plan'));
    expect(m.award).not.toHaveBeenCalled();
    expect(m.latest._cityLab.missionsDone['riverbend:m_park']).toBe(true);
    expect((m.latest._cityLab.xpAwarded || {})['citylab_mission_riverbend_m_park']).toBeUndefined();
  });

  it('the same plan built here (not imported) still earns the mission XP once', async () => {
    const ex = P.parkExample('riverbend');
    let plan = P.basePlan('riverbend');
    for (const s of ex.steps) { plan = P.setUse(plan, s.id, 'park'); if (s.via) plan = P.setEdge(plan, s.id, s.via, 'path'); }
    const m = await mount({ toolData: { _cityLab: { plan, level: 'missions' } }, ctx: { gradeBand: 'g68' } });
    await click(buttonByText('Check my plan'));
    expect(m.award).toHaveBeenCalledTimes(1);
    expect(m.award.mock.calls[0][0]).toBe('citylab_mission_riverbend_m_park');
  });

  it('the heat mission note prints 19.03 C, not 19.0 C, beside "must be 19.0 C"', async () => {
    const done = {};
    ['m_park', 'm_bond', 'm_runoff', 'm_town'].forEach((mid) => { done['riverbend:' + mid] = true; });
    await mount({ toolData: { _cityLab: { plan: nearHeatPlan(), level: 'missions', missionsDone: done } }, ctx: { gradeBand: 'g68' } });
    await click(buttonByText('Check my plan'));
    const note = text();
    expect(note).toContain('must be 19.0 C or less');
    expect(note).not.toMatch(/central estimates: 19\.0 C \(must/);
  });

  it('inspector prices follow the assumption set the scorecard uses', async () => {
    const plan = Object.assign(P.basePlan('riverbend'), { assumptionSetId: 'conservative' });
    await mount({ toolData: { _cityLab: { plan } } });
    await click(document.getElementById('citylab-parcel-A1'));
    const builds = $$('button').filter((b) => /Build connection .* \$/.test(b.getAttribute('aria-label') || ''));
    expect(builds.length).toBeGreaterThan(0);
    const labels = builds.map((b) => b.getAttribute('aria-label')).join(' | ');
    // 180k x 1.2 = 216k; the unscaled 180k must not appear.
    expect(labels).toMatch(/\$216k|\$3\.36M/);
    expect(labels).not.toMatch(/\$180k/);
    // A built parcel offers green infrastructure: $250k x 1.2 = $300k a hectare.
    const built = P.allParcelIds().find((id) => P.canGreenInfra(plan.uses[id]));
    await click(document.getElementById('citylab-parcel-' + built));
    expect(text()).toContain('Add green infrastructure ($300k/ha)');
  });
});
