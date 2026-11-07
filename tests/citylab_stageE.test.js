// City Planning Lab stage E (2026-11-04): two follow-ups Aaron approved.
//   1. Modelled missions are judged under the student's assumption set AND
//      the central estimates, so loosening the assumptions cannot pass one.
//      The student still sees their own-set numbers, and is told plainly
//      when only the central check is short.
//   2. A plan found in this device's localStorage (no City Lab plan in the
//      project) may be another student's: it opens marked imported (no XP)
//      with a note saying where it came from. A project reload is untouched.
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

// Riverbend, the 720-home west-bank plan from citylab_deep_model (roads and
// green infrastructure, about $5.9M), well inside the $22M bond.
function westHomesPlan() {
  const homes = [];
  ['A', 'B', 'C'].forEach((c) => [9, 10, 11, 12].forEach((r) => homes.push(c + r)));
  let p = homes.reduce((a, id) => P.toggleGreenInfra(P.setUse(a, id, 'mixed'), id), P.basePlan('riverbend'));
  const pairs = [['C8', 'C9'], ['C9', 'C10'], ['C10', 'C11'], ['C11', 'C12']];
  [9, 10, 11, 12].forEach((r) => pairs.push(['A' + r, 'B' + r], ['B' + r, 'C' + r]));
  return pairs.reduce((a, e) => P.setEdge(a, e[0], e[1], 'local'), p);
}
// ...then civic buildings ($9M each) on open fields until the CENTRAL cost
// first passes the bond. Under the optimistic set (costs x 0.85) the same
// plan is still inside it.
function bondTrapPlan() {
  const tg = P.missionTargets('riverbend');
  let plan = westHomesPlan();
  for (const id of P.allParcelIds()) {
    if (P.scorecard(plan, 'central').tier2.capitalCost > tg.bond) break;
    if (plan.uses[id] === 'field') plan = P.setUse(plan, id, 'civic');
  }
  return Object.assign(P.clonePlan(plan), { assumptionSetId: 'optimistic' });
}

function parkPlan() {
  const ex = P.parkExample('riverbend');
  let plan = P.basePlan('riverbend');
  for (const s of ex.steps) { plan = P.setUse(plan, s.id, 'park'); if (s.via) plan = P.setEdge(plan, s.id, s.via, 'path'); }
  return plan;
}

describe('stage E - missions are judged under the central estimates too', () => {
  it('the trap is real: the bond plan passes under optimistic and fails under central', () => {
    const plan = bondTrapPlan();
    const tg = P.missionTargets('riverbend');
    expect(P.scorecard(plan, 'central').tier1.newUnitsServed).toBeGreaterThanOrEqual(tg.homes);
    expect(P.scorecard(plan, 'optimistic').tier2.capitalCost).toBeLessThanOrEqual(tg.bond);
    expect(P.scorecard(plan, 'central').tier2.capitalCost).toBeGreaterThan(tg.bond);
  });

  it('a plan that passes only under the looser set does not pass the mission', () => {
    const plan = bondTrapPlan();
    const st = P.missionStatus('m_bond', plan);
    expect(st.met).toBe(false);
    expect(st.standardOnly).toBe(true);
    const cost = st.conds.find((c) => c.k === 'cost');
    // The student still sees their own (optimistic) number.
    expect(cost.value).toBeCloseTo(P.scorecard(plan, 'optimistic').tier2.capitalCost, 6);
    expect(cost.ownMet).toBe(true);
    expect(cost.standardMet).toBe(false);
    expect(cost.standardValue).toBeCloseTo(P.scorecard(plan, 'central').tier2.capitalCost, 6);
    expect(P.condStandardNote(cost)).toMatch(/central estimates/);
  });

  it('a plan inside the bond under both sets still passes, and a stricter own set still binds', () => {
    expect(P.missionStatus('m_bond', Object.assign(westHomesPlan(), { assumptionSetId: 'optimistic' })).met).toBe(true);
    // Conservative (costs x 1.2): the trap plan fails on its own set, not as "standard only".
    const cons = Object.assign(P.clonePlan(bondTrapPlan()), { assumptionSetId: 'conservative' });
    const st = P.missionStatus('m_bond', cons);
    expect(st.met).toBe(false);
    expect(st.standardOnly).toBe(false);
  });

  it('mounted: Check my plan gives no completion, no XP, and says the central check is why', async () => {
    const m = await mount({ toolData: { _cityLab: { plan: bondTrapPlan(), level: 'missions', missionsDone: { 'riverbend:m_park': true } } }, ctx: { gradeBand: 'g68' } });
    await click(buttonByText('Check my plan'));
    expect(m.award).not.toHaveBeenCalled();
    expect((m.latest._cityLab.missionsDone || {})['riverbend:m_bond']).toBeUndefined();
    expect(text()).toContain('Under your own assumption set this plan meets the mission, but it does not count yet');
    expect(text()).toContain('every mission is also checked under the central estimates, and there it is not met');
    expect(m.announced.join(' ')).toContain('Under your own assumption set this plan meets the mission');
    expect(errors).toEqual([]);
  });
});

// Stage E2 (2026-11-04, Aaron approved): the FULL brief follows the mission rule. Brief XP, the
// "meet every required part" quest flag (metAllHard) and the brief step of the Start-here path all
// need every required part met under the student's set AND the central estimates.
function briefPlan() {
  const useAll = (p, ids, u) => ids.reduce((a, id) => P.setUse(a, id, u), p);
  const homes = [];
  ['A', 'B', 'C'].forEach((c) => [9, 10, 11, 12].forEach((r) => homes.push(c + r)));
  ['A', 'B', 'C'].forEach((c) => [1, 2].forEach((r) => homes.push(c + r)));
  homes.push('A3', 'B3');
  let p = useAll(P.basePlan('riverbend'), homes, 'mixed');
  p = homes.reduce((a, id) => P.toggleGreenInfra(a, id), p);
  p = useAll(p, ['D10', 'D2', 'D12'], 'park');
  const pairs = [];
  for (let r = 8; r <= 11; r++) pairs.push(['C' + r, 'C' + (r + 1)]);
  [9, 10, 11, 12].forEach((r) => pairs.push(['A' + r, 'B' + r], ['B' + r, 'C' + r], ['C' + r, 'D' + r]));
  for (let r = 2; r <= 5; r++) pairs.push(['C' + r, 'C' + (r - 1)]);
  [1, 2, 3].forEach((r) => pairs.push(['A' + r, 'B' + r], ['B' + r, 'C' + r], ['C' + r, 'D' + r]));
  pairs.push(['D2', 'D1']);
  return pairs.reduce((a, e) => P.setEdge(a, e[0], e[1], 'local'), p);
}
// The brief plan ($12.0M central) plus one civic building ($9M), then local roads on open fields
// until the CENTRAL cost first passes the $22M bond. Under the optimistic set (costs x 0.85) the
// same plan is still inside it, so every required part is met only under the student's set.
function briefTrapPlan() {
  let plan = P.setUse(briefPlan(), 'D1', 'civic');
  const roads = [['F1', 'G1'], ['G1', 'H1'], ['F2', 'G2'], ['G2', 'H2'], ['F3', 'G3'], ['G3', 'H3'], ['H3', 'I3'],
    ['F4', 'G4'], ['G4', 'H4'], ['H4', 'I4'], ['F5', 'G5'], ['G5', 'H5'], ['H5', 'I5'], ['I5', 'J5']];
  for (const e of roads) {
    if (!P.constraintReport(plan, 'central').allHardMet) break;
    plan = P.setEdge(plan, e[0], e[1], 'local');
  }
  return Object.assign(P.clonePlan(plan), { assumptionSetId: 'optimistic' });
}
const pathBriefDone = (d, plan) => P.learningPath('g912', {}, d, plan).steps.find((s) => s.id === 'brief').done;

describe('stage E2 - the full brief is judged under the central estimates too', () => {
  it('the trap is real: every required part met under optimistic, not under central', () => {
    const plan = briefTrapPlan();
    expect(P.constraintReport(plan, 'optimistic').allHardMet).toBe(true);
    expect(P.constraintReport(plan, 'central').allHardMet).toBe(false);
  });

  it('brief XP eligibility and the path step need both sets', () => {
    const trap = briefTrapPlan();
    expect(P.briefXpEligible(trap), 'own-set-only brief earns no XP').toBe(false);
    expect(pathBriefDone({}, trap), 'own-set-only brief does not tick the path').toBe(false);
    // Paid earlier still ticks the step.
    expect(pathBriefDone({ xpAwarded: { citylab_brief_riverbend: true } }, trap)).toBe(true);
    // A plan that meets the brief under both sets still passes, from either set.
    const both = Object.assign(briefPlan(), { assumptionSetId: 'optimistic' });
    expect(P.constraintReport(both, 'central').allHardMet).toBe(true);
    expect(P.briefXpEligible(both)).toBe(true);
    // W7: meeting it is not enough for the path any more: a passing Check ticks it.
    expect(pathBriefDone({}, both)).toBe(false);
    expect(pathBriefDone({ briefPassed: { riverbend: true } }, both)).toBe(true);
    expect(P.briefXpEligible(briefPlan())).toBe(true);
  });

  it('mounted: no brief XP, no metAllHard, and the row says the central check is why', async () => {
    const trap = briefTrapPlan();
    const failing = P.constraintReport(trap, 'central').rows.filter((r) => r.hard && !r.met);
    expect(failing.length).toBeGreaterThan(0);
    const m = await mount({ toolData: { _cityLab: { plan: trap, level: 'brief' } }, ctx: { gradeBand: 'g912' } });
    // W7: the brief's XP and metAllHard come from Check my plan: press it.
    await click(document.querySelector('[data-citylab-strip-check="brief"]'));
    expect(m.award.mock.calls.filter((c) => c[0] === 'citylab_brief_riverbend')).toHaveLength(0);
    expect(m.latest._cityLab.metAllHard).toBeUndefined();
    expect(text()).toContain('the full brief is also checked under the central estimates, and there it is not met');
    expect(errors).toEqual([]);
  });

  it('mounted: a plan meeting the brief under both sets still pays and sets metAllHard, with no such note', async () => {
    const m = await mount({ toolData: { _cityLab: { plan: Object.assign(briefPlan(), { assumptionSetId: 'optimistic' }), level: 'brief' } }, ctx: { gradeBand: 'g912' } });
    // W7: nothing before Check; Check pays and sets the flag.
    expect(m.award.mock.calls.filter((c) => c[0] === 'citylab_brief_riverbend')).toHaveLength(0);
    expect(m.latest._cityLab.metAllHard).toBeUndefined();
    await click(document.querySelector('[data-citylab-strip-check="brief"]'));
    expect(m.award.mock.calls.filter((c) => c[0] === 'citylab_brief_riverbend')).toHaveLength(1);
    expect(m.latest._cityLab.metAllHard).toBe(true);
    expect(text()).not.toContain('the full brief is also checked under the central estimates');
    expect(errors).toEqual([]);
  });
});

describe('stage E - a plan found on this device', () => {
  it('a device-only plan with work opens marked imported, with a note, and earns no mission XP', async () => {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(parkPlan()));
    const m = await mount({ toolData: {}, ctx: { gradeBand: 'g68' } });
    expect(m.latest._cityLab.plan.imported).toBe(true);
    expect(text()).toContain('This plan was found saved on this device');
    await click(buttonByText('Check my plan'));
    expect(m.award).not.toHaveBeenCalled();
    expect(m.latest._cityLab.missionsDone['riverbend:m_park']).toBe(true);
    expect(errors).toEqual([]);
  });

  it('the same holds when the project has City Lab progress but no plan', async () => {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(parkPlan()));
    const m = await mount({ toolData: { _cityLab: { level: 'missions', xpAwarded: {} } }, ctx: { gradeBand: 'g68' } });
    expect(m.latest._cityLab.plan.imported).toBe(true);
    await click(buttonByText('Check my plan'));
    expect(m.award).not.toHaveBeenCalled();
  });

  it('"Start my own plan" gives a fresh plan that can earn XP, and the note goes', async () => {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(parkPlan()));
    const m = await mount({ toolData: {}, ctx: { gradeBand: 'g68' } });
    await click(buttonByText('Start my own plan'));
    expect(m.latest._cityLab.plan.imported).toBeUndefined();
    expect(P.planHasWork(m.latest._cityLab.plan)).toBe(false);
    expect(text()).not.toContain('This plan was found saved on this device');
    expect(document.activeElement && document.activeElement.getAttribute('role')).toBe('tab');
  });

  it('an untouched town on the device is nobody\'s work: no mark, no note', async () => {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(Object.assign(P.basePlan('mesahollow'), { imported: true })));
    const m = await mount({ toolData: {} });
    expect(m.latest._cityLab.plan.scenarioId).toBe('mesahollow');
    expect(m.latest._cityLab.plan.imported).toBeUndefined();
    expect(text()).not.toContain('This plan was found saved on this device');
  });

  it('a project reload (plan in toolData) is untouched and still earns its XP', async () => {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(P.setUse(P.basePlan('riverbend'), 'A9', 'park')));
    const m = await mount({ toolData: { _cityLab: { plan: parkPlan(), level: 'missions' } }, ctx: { gradeBand: 'g68' } });
    expect(m.latest._cityLab.plan.imported).toBeUndefined();
    expect(text()).not.toContain('This plan was found saved on this device');
    await click(buttonByText('Check my plan'));
    expect(m.award).toHaveBeenCalledTimes(1);
    expect(m.award.mock.calls[0][0]).toBe('citylab_mission_riverbend_m_park');
  });

  it('planHasWork ignores key order and sees overlays and memo text', () => {
    const base = P.basePlan('riverbend');
    const memoReversed = {};
    Object.keys(base.memo).reverse().forEach((k) => { memoReversed[k] = base.memo[k]; });
    expect(P.planHasWork(Object.assign(P.clonePlan(base), { memo: memoReversed }))).toBe(false);
    expect(P.planHasWork(P.restorePlan(JSON.stringify(base)))).toBe(false);
    expect(P.planHasWork(Object.assign(P.clonePlan(base), { coolRoofs: { A1: true } }))).toBe(true);
    const memo = P.clonePlan(base); memo.memo.tradeoff = 'mine';
    expect(P.planHasWork(memo)).toBe(true);
  });
});
