import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
import { runIsolatedAxe } from './helpers/isolated_axe_harness.js';

// Reef future, lane rescue: "Plan a reef rescue", an engineering design
// challenge. Costs and budget are enforced, plans map onto settings the model
// already has, every number on screen equals running the model directly, and
// no result of any kind appears before the student predicts.

vi.setConfig({ testTimeout: 60000 });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const mounted = [];
let X, M, R;
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef; M = window.__RR_TEST_EXPORTS__.coralReefModel; R = window.__RR_TEST_EXPORTS__.coralReefRescue;
});
afterEach(async () => {
  while (mounted.length) { const m = mounted.pop(); await act(async () => m.root.unmount()); m.host.remove(); }
});

async function mount(seed = {}, theme) {
  let data = { coralReef: { section: 'model', ...seed } };
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef;
  const said = [];
  function Shell() {
    const [toolData, setToolData] = React.useState(data);
    data = toolData;
    return cfg.render({ React, toolData, setToolData, theme, t: (key, fallback) => fallback || key, announceToSR: (m) => said.push(m) });
  }
  const item = { host, root, said, get data() { return data.coralReef; } };
  mounted.push(item);
  await act(async () => root.render(React.createElement(Shell)));
  return item;
}
const rescue = (extra = {}) => ({ mdlView: 'rescue', ...extra });
const q = (t, sel) => t.host.querySelector(sel);
const qa = (t, sel) => [...t.host.querySelectorAll(sel)];
async function click(node) { expect(node, 'control').toBeTruthy(); await act(async () => { node.focus(); node.click(); await Promise.resolve(); }); await act(async () => { await new Promise((r) => setTimeout(r, 40)); }); }
async function typeNumber(node, v) {
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await act(async () => { set.call(node, String(v)); node.dispatchEvent(new window.Event('input', { bubbles: true })); });
}
const pc = (v) => Math.round(v * 100);
const median = (list) => { const s = [...list].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
// All the words a student or a screen reader could get: text and every attribute.
function everything(t) {
  const parts = [t.host.textContent];
  for (const el of t.host.querySelectorAll('*')) for (const a of el.attributes) if (a.name !== 'style' && a.name !== 'd' && a.name !== 'class') parts.push(a.value);
  for (const el of t.host.querySelectorAll('input,textarea')) parts.push(el.value);
  return parts.concat(t.said).join(' \n ');
}
function savedState(plans, extra = {}) { return { draft: { start: plans[0] ? plans[0].start : 'rubble' }, plans, nextN: plans.length + 1, ...extra }; }
const P1 = { id: 'plan-1', n: 1, start: 'rubble', stars: true, garden: true, predict: 30, criterion: 'coral' };
async function runPlanThroughUi(t, predict = 30, crit = 'coral') {
  await typeNumber(q(t, '[data-rc-predict]'), predict);
  await click(q(t, '[data-rc-crit="' + crit + '"]'));
  await click(q(t, '[data-rc-run]'));
}

describe('costs and budget', () => {
  it('points are a small fixed table, with structures dearest and a fish step cheapest', () => {
    expect(R.RESCUE_BUDGET).toBe(8);
    expect(R.RESCUE_COST).toEqual({ stars: 4, garden: 3, structures: 6, fish: 2, runoff: 3 });
    const c = R.RESCUE_COST;
    expect(Math.max(c.stars, c.garden, c.structures, c.fish, c.runoff)).toBe(c.structures);
    expect(Math.min(c.stars, c.garden, c.structures, c.fish, c.runoff)).toBe(c.fish);
    expect(R.rescueCost({ stars: true, garden: true })).toBe(7);
    expect(R.rescueCost({ fish: 2, runoff: 1 })).toBe(7);
    expect(R.rescueCost({})).toBe(0);
  });

  it('no plan, however it was saved, comes out over budget or with what its reef cannot have', () => {
    for (const start of R.RESCUE_STARTS) for (const stars of [0, 1]) for (const garden of [0, 1]) for (const structures of [0, 1]) for (const fish of [0, 1, 2, 9]) for (const runoff of [0, 1, 2, 9]) {
      const p = R.rescueCleanPlan({ start, stars, garden, structures, fish, runoff }), lim = R.rescueLimits(start);
      expect(R.rescueCost(p)).toBeLessThanOrEqual(R.RESCUE_BUDGET);
      expect(p.fish).toBeLessThanOrEqual(lim.fish);
      expect(p.runoff).toBeLessThanOrEqual(lim.runoff);
      if (!lim.stars) expect(p.stars).toBe(false);
    }
    // A legal plan comes back untouched.
    expect(R.rescueCleanPlan({ start: 'fished', garden: true, fish: 1, runoff: 1 })).toEqual({ start: 'fished', stars: false, garden: true, structures: false, fish: 1, runoff: 1 });
  });

  it('Reef Stars are offered only where rubble covers the bottom, and the screen says why', async () => {
    expect(R.rescueLimits('rubble').stars).toBe(true);
    expect(R.rescueLimits('fished').stars).toBe(false);
    expect(R.rescueLimits('runoff').stars).toBe(false);
    const t = await mount(rescue({ mdlRescue: { draft: { start: 'fished' } } }));
    expect(q(t, '[data-rc-toggle="stars"]')).toBe(null);
    expect(q(t, '[data-rc-note="stars"]').textContent).toContain(pc(R.rescueLimits('fished').rubble) + '% of this bottom');
  });

  it('a choice the budget cannot pay for is refused, says so, and keeps focus', async () => {
    const t = await mount(rescue({ mdlRescue: { draft: { start: 'rubble', stars: true, garden: true } } }));
    expect(q(t, '[data-rc-budget]').textContent).toBe('7 of 8 points spent, 1 left');
    const btn = q(t, '[data-rc-toggle="structures"]');
    expect(btn.getAttribute('aria-disabled')).toBe('true');
    expect(btn.disabled).toBe(false);
    await click(btn);
    expect(t.data.mdlRescue.draft.structures).toBeFalsy();
    expect(q(t, '[data-rc-budget]').textContent).toBe('7 of 8 points spent, 1 left');
    expect(q(t, '[data-rc-over]').textContent).toContain('Reef structures costs 6 points and you have 1 left');
    expect(t.said.at(-1)).toContain('6 points');
    expect(document.activeElement).toBe(q(t, '[data-rc-toggle="structures"]'));
    // Taking something out frees the points.
    await click(q(t, '[data-rc-toggle="stars"]'));
    await click(q(t, '[data-rc-toggle="garden"]'));
    await click(q(t, '[data-rc-toggle="structures"]'));
    expect(t.data.mdlRescue.draft.structures).toBe(true);
    expect(q(t, '[data-rc-budget]').textContent).toBe('6 of 8 points spent, 2 left');
  });

  it('labels the points as a simplification, says which are made up, and that the heat cannot be bought', async () => {
    const t = await mount(rescue());
    const costs = q(t, '[data-rc-costs]').textContent;
    expect(costs).toContain('teaching simplification');
    expect(costs).toContain('made up for the game');
    expect(costs).toContain('Bayraktarov et al. 2019');
    expect(costs).toContain('Haisfield et al. 2010');
    expect(costs).toContain('Bostrom-Einarsson et al. 2020');
    expect(q(t, '[data-rc-heat-lock]').textContent).toContain('no local plan can change it');
    // The heat words come from the settings, not from typing them in.
    const s = R.rescueStartSettings('rubble');
    expect(q(t, '[data-rc-heat-lock]').textContent).toContain('every ' + s.heatIntervalStart + ' years');
    expect(q(t, '[data-rc-heat-lock]').textContent).toContain(s.heatPeakStart + ' Degree Heating Weeks');
    for (const start of R.RESCUE_STARTS) {
      const b = R.rescueStartSettings(start);
      expect([b.heatIntervalStart, b.heatIntervalEnd, b.heatPeakStart, b.heatPeakEnd, b.omegaEnd]).toEqual([s.heatIntervalStart, s.heatIntervalEnd, s.heatPeakStart, s.heatPeakEnd, s.omegaEnd]);
    }
  });
});

describe('plans map to the right model settings', () => {
  it('the three starts are starts the tool already has', () => {
    const rub = R.rescueStartSettings('rubble'), sc = X.scenarioSettings('rubble');
    expect([rub.startCoral, rub.startAlgae, rub.startHardBottom, rub.herbivores, rub.nutrients]).toEqual([sc.startCoral, sc.startAlgae, sc.startHardBottom, sc.herbivores, sc.nutrients]);
    expect([rub.rubbleStabilization, rub.restoration, rub.reefStructures]).toEqual([false, false, false]);
    const fished = R.rescueStartSettings('fished');
    expect([fished.startCoral, fished.startAlgae, fished.herbivores, fished.nutrients]).toEqual([0.12, 0.35, 'low', 'medium']);
    const run = R.rescueStartSettings('runoff'), harbor = M.mdlStartFromGroup({ key: 'harbor', siteId: 'harbor', cover: X.siteById('harbor').cover });
    expect([run.startCoral, run.startAlgae, run.startHardBottom, run.nutrients]).toEqual([harbor.coral, harbor.algae, harbor.hardBottom, 'high']);
  });

  it('each choice switches exactly its own model setting and nothing else', () => {
    const cases = [
      ['rubble', { stars: true }, { rubbleStabilization: true }],
      ['rubble', { garden: true }, { restoration: true }],
      ['rubble', { structures: true }, { reefStructures: true }],
      ['rubble', { fish: 1 }, { herbivores: 'high' }],
      ['fished', { fish: 1 }, { herbivores: 'medium' }],
      ['fished', { fish: 2 }, { herbivores: 'high' }],
      ['fished', { runoff: 1 }, { nutrients: 'low' }],
      ['runoff', { runoff: 1 }, { nutrients: 'medium' }],
      ['runoff', { runoff: 2 }, { nutrients: 'low' }]
    ];
    for (const [start, choice, change] of cases) {
      expect(R.rescueSettings({ start, ...choice }), JSON.stringify([start, choice])).toEqual({ ...R.rescueStartSettings(start), ...change });
    }
  });

  it('the student picks through the page and saves those same settings', async () => {
    const t = await mount(rescue());
    await click(q(t, '[data-rc-start="fished"]'));
    await click(q(t, '[data-rc-step="fish:2"]'));
    await click(q(t, '[data-rc-toggle="garden"]'));
    await runPlanThroughUi(t, 40, 'risk');
    const p = t.data.mdlRescue.plans[0];
    expect(R.rescueSettings(p)).toEqual({ ...R.rescueStartSettings('fished'), herbivores: 'high', restoration: true });
    expect(p.predict).toBe(40);
    expect(p.criterion).toBe('risk');
    expect(p.n).toBe(1);
  });

  it('other heat futures change only heatwaves and acidification', () => {
    const s = R.rescueSettings({ start: 'rubble', stars: true }), w = R.rescueWithHeat(s, 'warmer'), h = X.scenarioSettings('warmer');
    expect(w).toEqual({ ...s, heatIntervalStart: h.heatIntervalStart, heatIntervalEnd: h.heatIntervalEnd, heatPeakStart: h.heatPeakStart, heatPeakEnd: h.heatPeakEnd, omegaEnd: h.omegaEnd });
  });
});

describe('results equal running the model directly', () => {
  const direct = (settings) => {
    const runs = M.mdlEnsembleSeeds(R.RESCUE_SEED, 20).map((s) => X.runScenario(settings, s));
    const finals = runs.map((r) => r[30].coral).sort((a, b) => a - b);
    return { runs, finals, min: finals[0], max: finals[19], median: median(finals) };
  };

  it('rescueStats matches 20 independent runs and mdlEnsemble', () => {
    for (const plan of [{ start: 'rubble', stars: true, garden: true }, { start: 'fished', fish: 2 }, { start: 'runoff', structures: true }, { start: 'rubble' }]) {
      const st = R.rescueSettings(plan), a = R.rescueStats(st), d = direct(st), e = M.mdlEnsemble(st, R.RESCUE_SEED, 20);
      expect(a.count).toBe(20);
      expect(a.median).toBe(d.median);
      expect(a.min).toBe(d.min);
      expect(a.max).toBe(d.max);
      expect(a.median).toBe(e.bands[30].median);
      expect(a.lo).toBe(e.bands[30].lo);
      expect(a.hi).toBe(e.bands[30].hi);
      expect(a.bands).toEqual(e.bands);
      expect([...a.dots].sort((x, y) => x - y)).toEqual(d.finals);
      const fish = d.runs.map((r) => { const f = X.siteFromModelYear(r[30], st, 1).fish; return Object.values(f).reduce((n, v) => n + v, 0); });
      expect(a.fish).toBe(median(fish));
    }
  });

  it('every number on the results page is the model\'s', async () => {
    const plan = { start: 'rubble', stars: true, garden: true };
    const t = await mount(rescue({ mdlRescue: savedState([P1], { activeId: 'plan-1' }) }));
    const st = R.rescueSettings(plan), d = direct(st), n = direct(R.rescueStartSettings('rubble'));
    expect(q(t, '[data-rc-tile="coral"] b').textContent).toBe(pc(d.median) + '%');
    expect(q(t, '[data-rc-tile="risk"] b').textContent).toBe(pc(d.min) + '%');
    expect(q(t, '[data-rc-tile="coral"]').textContent).toContain('no plan: ' + pc(n.median) + '%');
    expect(q(t, '[data-rc-pred-line]').textContent).toBe('You predicted 30%. Every run ended higher, from ' + pc(d.min) + '% to ' + pc(d.max) + '%.');
    const rowDots = (id) => qa(t, '[data-rc-strip="plans"] [data-rc-strip-row="' + id + '"] [data-rc-dot]').map((c) => Number(c.getAttribute('data-rc-dot'))).sort((a, b) => a - b);
    expect(rowDots('plan-1')).toEqual(d.finals.map(pc).sort((a, b) => a - b));
    expect(rowDots('none')).toEqual(n.finals.map(pc).sort((a, b) => a - b));
    expect(q(t, '[data-rc-strip="plans"] [data-rc-strip-row="plan-1"] [data-rc-median]').getAttribute('data-rc-median')).toBe(String(pc(d.median)));
    expect(q(t, '[data-rc-strip="plans"] [data-rc-strip-row="plan-1"] [data-rc-predict-mark]').getAttribute('data-rc-predict-mark')).toBe('30');
    expect(q(t, '[data-rc-strip="plans"]').getAttribute('aria-label')).toContain('middle run ' + pc(d.median) + '%, from ' + pc(d.min) + '% to ' + pc(d.max) + '%');
    expect(q(t, '[data-rc-fan]').getAttribute('aria-label')).toContain('from ' + pc(st.startCoral) + '% to ' + pc(d.median) + '%');
    // Heat futures: the same plan, 20 runs of each.
    for (const id of ['cooler', 'recent', 'warmer']) {
      const h = direct(R.rescueWithHeat(st, id));
      expect(q(t, '[data-rc-strip="heat"] [data-rc-strip-row="' + id + '"] [data-rc-median]').getAttribute('data-rc-median')).toBe(String(pc(h.median)));
    }
  });

  it('the reason comes from the cause data, year by year', () => {
    for (const plan of [{ start: 'rubble', stars: true }, { start: 'fished', fish: 2 }, { start: 'runoff', garden: true, runoff: 1 }]) {
      const st = R.rescueSettings(plan), ev = R.rescueEvaluate(plan), seeds = M.mdlEnsembleSeeds(R.RESCUE_SEED, 20), sum = { heat: 0, regrowth: 0, background: 0, overgrowth: 0, planted: 0 };
      let ground = 0, blocked = 0;
      for (const s of seeds) {
        const rows = X.runScenario(st, s, true);
        for (let y = 1; y <= 30; y++) {
          const c = M.mdlYearCauses(rows, y, st);
          for (const part of c.coral) sum[part.id] += part.amount / 20;
          ground += c.groundAdded / 20; blocked += c.blocked / 20;
        }
      }
      for (const k of Object.keys(sum)) expect(ev.causes[k]).toBeCloseTo(sum[k], 10);
      expect(ev.causes.ground).toBeCloseTo(ground, 10);
      expect(ev.causes.blocked).toBeCloseTo(blocked, 10);
    }
    expect(R.rescueEvaluate({ start: 'rubble', stars: true }).reason.id).toBe('ground');
    expect(R.rescueEvaluate({ start: 'fished', fish: 2 }).reason.id).toBe('seaweed');
    expect(R.rescueEvaluate({ start: 'rubble', fish: 1 }).reason.id).toBe('little');
    expect(R.rescueEvaluate({ start: 'rubble' }).reason.id).toBe('nothing');
    expect(R.rescueEvaluate({ start: 'rubble', garden: true }).reason.id).toBe('planted');
    // Reef structures on rubble: seaweed was never the problem, so it is not blamed.
    const surface = R.rescueEvaluate({ start: 'rubble', structures: true });
    expect(['regrowth', 'little']).toContain(surface.reason.id);
    expect(R.rescueEvaluate({ start: 'runoff', structures: true }).reason.id).toBe('worse');
  });

  it('shows the reason with filled-in numbers and the cause table', async () => {
    const t = await mount(rescue({ mdlRescue: savedState([P1], { activeId: 'plan-1' }) }));
    const ev = R.rescueEvaluate(P1);
    expect(q(t, '[data-rc-why]').getAttribute('data-rc-why')).toBe('ground');
    expect(q(t, '[data-rc-reason]').textContent).toContain('(' + Math.round(ev.causes.ground * 100) + ' points of new ground)');
    expect(q(t, '[data-rc-reason]').textContent).toContain('added ' + Math.round(ev.causes.regrowth * 100) + ' points');
    const row = q(t, '[data-rc-cause="heat"]').textContent;
    expect(row).toContain(String(Math.round(Math.abs(ev.causes.heat) * 1000) / 10));
    expect(q(t, '[data-rc-causes]').textContent).toContain('averaged across 20 runs');
  });
});

describe('predict first', () => {
  const planner = (draft, plans = []) => rescue({ mdlRescue: { draft, plans, nextN: plans.length + 1 } });

  it('shows no result of any kind before the run, across text, labels and aria', async () => {
    const draft = { start: 'rubble', stars: true, garden: true };
    const t = await mount(planner(draft));
    for (const sel of ['[data-rc-view="results"]', '[data-rc-dot]', '[data-rc-median]', '[data-rc-fan]', '[data-rc-strip]', '[data-rc-pic]', '[data-rc-tile]', '[data-rc-cause]', '[data-rc-reason]', '[data-rc-cer]', '[data-rc-table]', '[data-rc-hope]'])
      expect(q(t, sel), sel).toBe(null);
    const text = everything(t);
    const st = R.rescueStats(R.rescueSettings(draft)), none = R.rescueStats(R.rescueStartSettings('rubble'));
    const mine = [st.median, st.min, st.max, st.lo, st.hi].map(pc), theirs = [none.median, none.max].map(pc).filter((v) => v !== pc(st.start));
    for (const v of mine.concat(theirs)) expect(new RegExp('(^|[^0-9.])' + v + '%').test(text), v + '% must not appear').toBe(false);
    expect(/middle run \d/.test(text), 'a middle run number').toBe(false);
    for (const word of ['do nothing:', 'no plan:', 'small effect', 'Every run', 'Test results', 'Why this plan', 'more points of live coral'])
      expect(text.toLowerCase().includes(word.toLowerCase()), word).toBe(false);
    // The action hints describe what a thing is, never how well it works.
    expect(q(t, '[data-rc-action="structures"]').textContent).not.toMatch(/studies|small|survive/i);
  });

  it('runs no ensemble for an untested plan, even across re-renders', async () => {
    const before = R.rescueMemoKeys().length;
    const draft = { start: 'runoff', garden: true };
    const t = await mount(planner(draft));
    await click(q(t, '[data-rc-toggle="structures"]'));
    await typeNumber(q(t, '[data-rc-predict]'), 22);
    await click(q(t, '[data-rc-crit="fish"]'));
    expect(R.rescueMemoKeys().length).toBe(before);
    await click(q(t, '[data-rc-run]'));
    expect(R.rescueMemoKeys().length).toBeGreaterThan(before);
  });

  it('needs both a prediction and a criterion, and says what is missing', async () => {
    const t = await mount(planner({ start: 'fished', fish: 1 }));
    expect(q(t, '[data-rc-run]').disabled).toBe(true);
    expect(q(t, '[data-rc-need]').textContent).toBe('First, write your prediction and pick what makes a plan good.');
    await typeNumber(q(t, '[data-rc-predict]'), 15);
    expect(q(t, '[data-rc-run]').disabled).toBe(true);
    expect(q(t, '[data-rc-need]').textContent).toBe('First, pick what makes a plan good.');
    await click(q(t, '[data-rc-crit="risk"]'));
    expect(q(t, '[data-rc-run]').disabled).toBe(false);
    expect(q(t, '[data-rc-need]')).toBe(null);
  });

  it('the slider does not count as a prediction until the student moves it', async () => {
    const t = await mount(planner({ start: 'rubble', stars: true }));
    expect(t.data.mdlRescue.draft.predict == null).toBe(true);
    expect(q(t, '[data-rc-predict-range]').getAttribute('aria-valuetext')).toBe('No prediction yet');
    await typeNumber(q(t, '[data-rc-predict-range]'), 45);
    expect(t.data.mdlRescue.draft.predict).toBe(45);
    expect(q(t, '[data-rc-predict]').value).toBe('45');
  });

  it('a screen reader hears no result until the run, then hears it', async () => {
    const t = await mount(planner({ start: 'rubble', stars: true }));
    await click(q(t, '[data-rc-start="fished"]'));
    await click(q(t, '[data-rc-step="fish:1"]'));
    for (const m of t.said) expect(m).not.toMatch(/live coral|middle run/i);
    await typeNumber(q(t, '[data-rc-predict]'), 20);
    await click(q(t, '[data-rc-crit="coral"]'));
    await click(q(t, '[data-rc-run]'));
    const st = R.rescueStats(R.rescueSettings({ start: 'fished', fish: 1 }));
    expect(t.said.at(-1)).toContain('middle run ' + pc(st.median) + '%');
  });

  it('a new test needs a new prediction, and nothing from another reef shows', async () => {
    const t = await mount(rescue({ mdlRescue: savedState([P1], { activeId: 'plan-1' }) }));
    await click(q(t, '[data-rc-again]'));
    expect(q(t, '[data-rc-view="planner"]')).toBeTruthy();
    expect(t.data.mdlRescue.draft.predict).toBe(null);
    expect(t.data.mdlRescue.draft.stars).toBe(true);
    expect(q(t, '[data-rc-run]').disabled).toBe(true);
    // The tested plan's own row is there, as it was already predicted and run.
    expect(q(t, '[data-rc-table]')).toBeTruthy();
    // Another reef has not been tested: no table, no numbers.
    await click(q(t, '[data-rc-start="fished"]'));
    expect(q(t, '[data-rc-table]')).toBe(null);
    const none = R.rescueStats(R.rescueStartSettings('fished'));
    expect(everything(t).includes('no plan')).toBe(false);
    expect(q(t, '[data-rc-view="planner"]').textContent).not.toContain('middle run ' + pc(none.median));
  });

  it('a saved plan with no prediction never shows a result', async () => {
    const bad = { id: 'plan-9', n: 9, start: 'rubble', stars: true, criterion: 'coral' };
    const t = await mount(rescue({ mdlRescue: savedState([bad], { activeId: 'plan-9' }) }));
    expect(q(t, '[data-rc-view="results"]')).toBe(null);
    expect(q(t, '[data-rc-view="planner"]')).toBeTruthy();
    expect(q(t, '[data-rc-table]')).toBe(null);
  });
});

describe('comparing with doing nothing and earlier plans', () => {
  it('doing nothing is the same reef with no choices, on the same heat', () => {
    for (const start of R.RESCUE_STARTS) {
      const ev = R.rescueEvaluate({ start, garden: true });
      const direct = M.mdlEnsemble(R.rescueStartSettings(start), R.RESCUE_SEED, 20);
      expect(ev.none.median).toBe(direct.bands[30].median);
      expect(ev.none.seeds).toEqual(ev.stats.seeds);
      expect(direct.runs[0].map((r) => r.dhw)).toEqual(X.runScenario(ev.settings, R.RESCUE_SEED).map((r) => r.dhw));
      // A plan with no choices IS doing nothing.
      expect(R.rescueEvaluate({ start }).stats.median).toBe(ev.none.median);
    }
  });

  it('the table shows doing nothing first, then each plan on that reef only', async () => {
    const p2 = { id: 'plan-2', n: 2, start: 'rubble', garden: true, predict: 10, criterion: 'risk' };
    const p3 = { id: 'plan-3', n: 3, start: 'fished', fish: 1, predict: 10, criterion: 'risk' };
    const t = await mount(rescue({ mdlRescue: savedState([P1, p2, p3], { activeId: 'plan-1' }) }));
    expect(qa(t, '[data-rc-row]').map((r) => r.getAttribute('data-rc-row'))).toEqual(['none', 'plan-1', 'plan-2']);
    const st2 = R.rescueStats(R.rescueSettings(p2));
    const row = q(t, '[data-rc-row="plan-2"]');
    expect(row.querySelector('[data-rc-cell="coral"]').textContent).toContain(pc(st2.median) + '%');
    expect(row.querySelector('[data-rc-cell="risk"]').textContent).toContain(pc(st2.min) + '%');
    expect(row.querySelector('[data-rc-cell="fish"]').textContent).toContain(String(Math.round(st2.fish)));
    expect(qa(t, '[data-rc-strip="plans"] [data-rc-strip-row]').map((r) => r.getAttribute('data-rc-strip-row'))).toEqual(['none', 'plan-2', 'plan-1']);
    expect(q(t, '[data-rc-standing]').textContent).toContain('best plan on this reef so far');
    // Show opens the other plan, with its own criterion and prediction.
    await click(q(t, '[data-rc-show="plan-2"]'));
    expect(t.data.mdlRescue.activeId).toBe('plan-2');
    expect(q(t, '[data-rc-tile="risk"]').getAttribute('data-rc-crit')).toBe('true');
    expect(q(t, '[data-rc-standing]').textContent).toContain('Plan 1 is still ahead');
  });

  it('testing the same actions again replaces that row and keeps its name', () => {
    const s0 = R.rescueNormalize({ plans: [P1], nextN: 2 });
    const same = R.rescueAddPlan(s0, { start: 'rubble', stars: true, garden: true }, 44, 'fish');
    expect(same.plans).toHaveLength(1);
    expect([same.plans[0].n, same.plans[0].predict, same.plans[0].criterion]).toEqual([1, 44, 'fish']);
    expect(same.nextN).toBe(2);
    const next = R.rescueAddPlan(s0, { start: 'rubble', garden: true }, 12, 'coral');
    expect(next.plans.map((p) => p.n)).toEqual([1, 2]);
    expect(next.activeId).toBe('plan-2');
    expect(next.nextN).toBe(3);
  });

  it('the list stays small: the oldest plan drops off', () => {
    let st = R.rescueNormalize({});
    const plans = [{ garden: true }, { stars: true }, { structures: true }, { fish: 1 }, { stars: true, garden: true }, { stars: true, fish: 1 }, { garden: true, fish: 1 }, { structures: true, fish: 1 }, {}];
    for (const p of plans) st = R.rescueNormalize({ ...st, ...R.rescueAddPlan(st, { start: 'rubble', ...p }, 5, 'coral') });
    expect(st.plans).toHaveLength(R.RESCUE_MAX_PLANS);
    expect(st.plans[0].n).toBe(2);
    expect(st.nextN).toBe(10);
  });

  it('removing a plan is safe, and removing the open one returns to the planner with focus', async () => {
    const p2 = { id: 'plan-2', n: 2, start: 'rubble', garden: true, predict: 10, criterion: 'risk' };
    const t = await mount(rescue({ mdlRescue: savedState([P1, p2], { activeId: 'plan-1' }) }));
    await click(q(t, '[data-rc-remove="plan-2"]'));
    expect(t.data.mdlRescue.plans.map((p) => p.id)).toEqual(['plan-1']);
    expect(document.activeElement).toBe(q(t, '#cr-rc-result'));
    await click(q(t, '[data-rc-remove="plan-1"]'));
    expect(t.data.mdlRescue.plans).toEqual([]);
    expect(q(t, '[data-rc-view="planner"]')).toBeTruthy();
    expect(document.activeElement).toBe(q(t, '#cr-rc-plan-title'));
    expect(t.data.mdlRescue.draft.predict).toBe(null);
  });
});

describe('honest and hopeful', () => {
  it('says a plan cannot stop heatwaves, that emissions matter most, and what local action achieved', async () => {
    const t = await mount(rescue({ mdlRescue: savedState([P1], { activeId: 'plan-1' }) }));
    const card = q(t, '[data-rc-heat]').textContent, ev = R.rescueEvaluate(P1);
    expect(card).toContain('No plan can stop a heatwave');
    expect(card).toContain('cutting emissions matters most');
    expect(q(t, '[data-rc-hope]').getAttribute('data-rc-hope')).toBe('gain');
    expect(q(t, '[data-rc-hope]').textContent).toContain((pc(ev.stats.median) - pc(ev.none.median)) + ' more points of live coral');
    // The model itself backs the words: more heat shrinks the very same plan.
    expect(ev.heat.warmer.median).toBeLessThan(ev.heat.recent.median);
    expect(ev.heat.recent.median).toBeLessThan(ev.heat.cooler.median);
    expect(ev.heat.recent.median).toBe(ev.stats.median);
  });

  it('a plan that adds nothing is told so, kindly', async () => {
    const plan = { id: 'plan-1', n: 1, start: 'rubble', fish: 1, predict: 30, criterion: 'coral' };
    const t = await mount(rescue({ mdlRescue: savedState([plan], { activeId: 'plan-1' }) }));
    expect(q(t, '[data-rc-why]').getAttribute('data-rc-why')).toBe('little');
    expect(q(t, '[data-rc-hope]').getAttribute('data-rc-hope')).toBe('flat');
    expect(q(t, '[data-rc-standing]').textContent).toContain('does not beat doing nothing yet');
  });

  it('explains reef structures only when picked, with the difference they made in these runs', async () => {
    const off = await mount(rescue({ mdlRescue: savedState([P1], { activeId: 'plan-1' }) }));
    expect(q(off, '[data-rc-structures]')).toBe(null);
    const plan = { id: 'plan-1', n: 1, start: 'runoff', structures: true, fish: 1, predict: 30, criterion: 'coral' };
    const t = await mount(rescue({ mdlRescue: savedState([plan], { activeId: 'plan-1' }) }));
    const note = q(t, '[data-rc-structures]').textContent;
    expect(note).toContain('only a small effect on purpose');
    expect(note).toContain('studies have not found');
    const a = R.rescueStats(R.rescueSettings({ start: 'runoff', structures: true, fish: 1 })).median, b = R.rescueStats(R.rescueSettings({ start: 'runoff', fish: 1 })).median;
    const pts = Math.round(Math.abs(a - b) * 1000) / 10;
    expect(note).toContain((pts < 0.05 ? '0' : (a < b ? '-' : '+') + pts) + ' points of live coral');
    expect(note).toContain('2 points of hard bottom');
  });

  it('keeps the model limits on the page, in the planner and in the results', async () => {
    const a = await mount(rescue());
    expect(a.host.textContent).toContain('What this model leaves out');
    expect(a.host.textContent).toContain('Here all coral is one number.');
    const lever = { id: 'plan-1', n: 1, start: 'fished', fish: 1, predict: 10, criterion: 'coral' };
    const b = await mount(rescue({ mdlRescue: savedState([lever], { activeId: 'plan-1' }) }));
    expect(q(b, '[data-rc-limit-levers]').textContent).toContain('The grazing and runoff numbers are illustrative');
    expect(b.host.textContent).toContain('Corals may adapt to warmer water over time.');
    const c = await mount(rescue({ mdlRescue: savedState([P1], { activeId: 'plan-1' }) }));
    expect(q(c, '[data-rc-limit-levers]')).toBe(null);
  });
});

describe('Why this plan?', () => {
  it('builds a claim, evidence and reasoning from the runs', async () => {
    const t = await mount(rescue({ mdlRescue: savedState([P1], { activeId: 'plan-1' }) }));
    const ev = R.rescueEvaluate(P1), text = q(t, '[data-rc-cer]').value;
    expect(q(t, '[data-rc-cer]').readOnly).toBe(true);
    expect(text).toMatch(/^Claim: On the blasted rubble field, my plan \(Reef Stars, Coral gardening; 7 of 8 points\) does better than doing nothing when judged by most coral\./);
    expect(text).toContain('Evidence: I ran the plan 20 times');
    expect(text).toContain('the middle run had ' + pc(ev.stats.median) + '% live coral (lowest ' + pc(ev.stats.min) + '%, highest ' + pc(ev.stats.max) + '%)');
    expect(text).toContain('With no plan, the middle run had ' + pc(ev.none.median) + '%');
    expect(text).toContain('The fish count was ' + Math.round(ev.stats.fish) + ', against ' + Math.round(ev.none.fish));
    expect(text).toContain('I predicted 30%.');
    expect(text).toContain('Reasoning: Reef Stars turned loose rubble');
    expect(text).toContain('the same plan reaches ' + pc(ev.heat.warmer.median) + '%');
    expect(text).toContain('cutting emissions matters most');
    expect(text).toContain('not a forecast');
  });

  it('copies with the clipboard, and falls back to selecting the text', async () => {
    const t = await mount(rescue({ mdlRescue: savedState([P1], { activeId: 'plan-1' }) }));
    const writes = [];
    Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: { writeText: (x) => { writes.push(x); return Promise.resolve(); } } });
    await click(q(t, '[data-rc-copy]'));
    expect(writes).toEqual([q(t, '[data-rc-cer]').value]);
    expect(q(t, '[data-rc-copied]').textContent).toContain('Copied');
    Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: undefined });
    await click(q(t, '[data-rc-copy]'));
    expect(q(t, '[data-rc-copied]').textContent).toContain('selected');
    expect(document.activeElement).toBe(q(t, '[data-rc-cer]'));
    delete window.navigator.clipboard;
  });
});

describe('saved data stays compatible', () => {
  it('old saved data with no new fields opens the scenarios exactly as before', async () => {
    const t = await mount({ modelRevealedFor: { recent: true }, modelPredictions: { recent: { choice: 'lower' } } });
    expect(q(t, '[data-mdl-views]').getAttribute('data-mdl-views')).toBe('scenarios');
    expect(q(t, '[data-rc-section]')).toBe(null);
    expect(q(t, 'svg[data-model-chart]')).toBeTruthy();
    expect(t.data.mdlRescue).toBeUndefined();
    expect(t.data.mdlView).toBeUndefined();
  });

  it('switching to the rescue and back leaves the scenario work alone', async () => {
    const seed = { modelRevealedFor: { recent: true }, modelPredictions: { recent: { choice: 'lower', reason: 'heat' } }, mdlSpread: true, mdlCompare: 'none', model: X.scenarioSettings('recent') };
    const t = await mount(seed);
    await click(q(t, '[data-mdl-view="rescue"]'));
    expect(q(t, 'svg[data-model-chart]')).toBe(null);
    expect(q(t, '[data-rc-section]')).toBeTruthy();
    await click(q(t, '[data-rc-toggle="garden"]'));
    await runPlanThroughUi(t, 12, 'coral');
    expect(q(t, '[data-rc-view="results"]')).toBeTruthy();
    await click(q(t, '[data-mdl-view="scenarios"]'));
    expect(q(t, 'svg[data-model-chart]')).toBeTruthy();
    for (const k of Object.keys(seed)) expect(t.data[k], k).toEqual(seed[k]);
    expect(q(t, '[data-mdl-spread="on"]')).toBeTruthy();
    // Back again: the plan is still there.
    await click(q(t, '[data-mdl-view="rescue"]'));
    expect(q(t, '[data-rc-view="results"]')).toBeTruthy();
  });

  it('a link that opens a scenario lands on the scenarios', async () => {
    const t = await mount(rescue({ section: 'science' }));
    const link = [...t.host.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Model a restoration');
    if (link) {
      await click(link);
      expect(t.data.section).toBe('model');
      expect(t.data.mdlView).toBe('scenarios');
      expect(q(t, '[data-rc-section]')).toBe(null);
    }
    // The tool's source sends every such link to the scenarios view.
    const src = readFileSync(TOOL, 'utf8');
    expect((src.match(/env\.go\('model'\)/g) || []).length).toBe((src.match(/mdlView: 'scenarios' \}\); env\.go\('model'\)/g) || []).length);
  });

  it('broken saved data comes back as a fresh, legal state', () => {
    for (const raw of [undefined, null, 7, 'x', [], {}, { plans: 'no' }, { plans: [null, 3, { id: 5 }], draft: 'x', activeId: {} }, { draft: { start: 'mars', stars: 'yes', fish: 99 } }]) {
      const st = R.rescueNormalize(raw);
      expect(st.plans).toEqual([]);
      expect(st.activeId).toBe(null);
      expect(R.RESCUE_STARTS).toContain(st.draft.start);
      expect(R.rescueCost(st.draft)).toBeLessThanOrEqual(R.RESCUE_BUDGET);
      expect(st.nextN).toBeGreaterThanOrEqual(1);
    }
    const st = R.rescueNormalize({ plans: [{ id: 'a', n: 4, start: 'rubble', stars: true, garden: true, structures: true, fish: 9, predict: 900, criterion: 'vibes' }], activeId: 'a' });
    expect(st.activeId).toBe('a');
    expect(st.plans[0].predict).toBe(100);
    expect(st.plans[0].criterion).toBe('coral');
    expect(R.rescueCost(st.plans[0])).toBeLessThanOrEqual(8);
    expect(st.nextN).toBe(5);
  });

  it('what it saves is small and survives a JSON round trip', async () => {
    const t = await mount(rescue());
    await click(q(t, '[data-rc-toggle="garden"]'));
    await runPlanThroughUi(t, 12, 'fish');
    const saved = JSON.parse(JSON.stringify(t.data.mdlRescue));
    expect(JSON.stringify(saved).length).toBeLessThan(400);
    expect(Object.keys(saved.plans[0]).sort()).toEqual(['criterion', 'fish', 'garden', 'id', 'n', 'predict', 'runoff', 'stars', 'start', 'structures']);
    const t2 = await mount(rescue({ mdlRescue: saved }));
    expect(q(t2, '[data-rc-view="results"]')).toBeTruthy();
    expect(q(t2, '[data-rc-tile="fish"]').getAttribute('data-rc-crit')).toBe('true');
  });

  it('does not disturb the model: the 450-run digest test is unchanged, and no scenario gains a rescue', () => {
    expect(X.SCENARIOS.map((s) => s.id)).toEqual(['recent', 'reserve', 'warmer', 'cooler', 'rubble']);
    const before = JSON.stringify(X.runScenario(X.scenarioSettings('rubble'), 11));
    R.rescueEvaluate({ start: 'rubble', stars: true });
    expect(JSON.stringify(X.runScenario(X.scenarioSettings('rubble'), 11))).toBe(before);
  });
});

describe('keyboard and accessibility', () => {
  it('can be driven with focus moves only, and focus never falls to the body', async () => {
    const t = await mount({});
    const tab = q(t, '[data-mdl-view="rescue"]');
    await click(tab);
    expect(document.activeElement).toBe(q(t, '[data-mdl-view="rescue"]'));
    expect(tab.getAttribute('aria-pressed')).toBe('true');
    await click(q(t, '[data-rc-start="fished"]'));
    expect(document.activeElement).toBe(q(t, '[data-rc-start="fished"]'));
    await click(q(t, '[data-rc-step="fish:1"]'));
    expect(document.activeElement).toBe(q(t, '[data-rc-step="fish:1"]'));
    q(t, '[data-rc-predict]').focus();
    await typeNumber(q(t, '[data-rc-predict]'), 20);
    await click(q(t, '[data-rc-crit="coral"]'));
    await click(q(t, '[data-rc-run]'));
    expect(document.activeElement).toBe(q(t, '#cr-rc-result'));
    expect(document.activeElement).not.toBe(document.body);
    await click(q(t, '[data-rc-again]'));
    expect(document.activeElement).toBe(q(t, '#cr-rc-plan-title'));
    expect(document.activeElement).not.toBe(document.body);
  });

  it('every control is a real, named control with a pressed state where it toggles', async () => {
    const t = await mount(rescue({ mdlRescue: { draft: { start: 'fished', garden: true, fish: 1 } } }));
    for (const b of qa(t, '[data-rc-section] button')) expect((b.getAttribute('aria-label') || b.textContent).trim().length, b.outerHTML.slice(0, 100)).toBeGreaterThan(1);
    expect(q(t, '[data-rc-toggle="garden"]').getAttribute('aria-pressed')).toBe('true');
    expect(q(t, '[data-rc-toggle="structures"]').getAttribute('aria-pressed')).toBe('false');
    expect(q(t, '[data-rc-step="fish:1"]').getAttribute('aria-pressed')).toBe('true');
    expect(q(t, '[data-rc-step="fish:0"]').getAttribute('aria-pressed')).toBe('false');
    expect(q(t, '[data-rc-start="fished"]').getAttribute('aria-pressed')).toBe('true');
    expect(q(t, '[data-rc-predict-range]').getAttribute('aria-labelledby')).toBe('cr-rc-pred-label');
    expect(q(t, '[data-rc-predict]').closest('label')).toBeTruthy();
  });

  it('passes axe on the planner and the results, in every theme', async () => {
    const p2 = { id: 'plan-2', n: 2, start: 'rubble', structures: true, predict: 10, criterion: 'risk' };
    for (const theme of ['light', 'dark', 'contrast']) {
      for (const seed of [rescue(), rescue({ mdlRescue: { draft: { start: 'fished', fish: 1, predict: 20, criterion: 'fish' }, plans: [{ ...P1, start: 'fished', stars: false, fish: 2 }] } }), rescue({ mdlRescue: savedState([P1, p2], { activeId: 'plan-2' }) })]) {
        const t = await mount(seed, theme);
        const res = await runIsolatedAxe(t.host.innerHTML);
        expect(res.violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')), theme).toEqual([]);
      }
    }
  }, 180000);

  it('charts say their numbers in words, and come with a table', async () => {
    const t = await mount(rescue({ mdlRescue: savedState([P1], { activeId: 'plan-1' }) }));
    for (const sel of ['[data-rc-fan]', '[data-rc-strip="plans"]', '[data-rc-strip="heat"]', '[data-rc-pic="none"]', '[data-rc-pic="plan"]']) {
      const svg = q(t, sel);
      expect(svg.getAttribute('role'), sel).toBe('img');
      expect(svg.getAttribute('aria-label').length, sel).toBeGreaterThan(30);
    }
    expect(q(t, '[data-rc-numbers] table')).toBeTruthy();
    expect(q(t, '[data-rc-table] caption')).toBeTruthy();
    expect(q(t, '[data-rc-causes] caption')).toBeTruthy();
  });

  it('the source stays ES5 here, with no dashes in the words', () => {
    const src = readFileSync(TOOL, 'utf8');
    const a = src.indexOf('// ── Plan a reef rescue (lane rescue)'), b = src.indexOf('if (window.__RR_TEST_EXPORTS__) window.__RR_TEST_EXPORTS__.coralReefModel');
    const c = src.indexOf('// ── Plan a reef rescue: the student view'), e = src.indexOf('// ── Science text, model rules and sources');
    expect(a).toBeGreaterThan(0); expect(c).toBeGreaterThan(0);
    for (const block of [src.slice(a, b), src.slice(c, e)]) {
      const code = block.replace(/'(?:[^'\\\n]|\\.)*'/g, "''").replace(/\/\/.*$/gm, '');
      expect(/=>|`|\blet\b|\bconst\b|\bclass\s+[A-Z]/.test(code), 'ES6 syntax in the block').toBe(false);
      const strings = [...block.matchAll(/__alloT\('stem\.coralreef\.[a-z0-9_]+', '((?:[^'\\]|\\.)*)'\)/gi)].map((m) => m[1]);
      for (const s of strings) expect(s, s).not.toMatch(/[–—‑]/);
    }
    expect(src.slice(c, e).match(/__alloT\('stem\.coralreef\.rc_/g).length).toBeGreaterThan(80);
    // Every new key uses the rc_ prefix, other than words shared with the tool.
    const newKeys = [...src.slice(c, e).matchAll(/__alloT\('stem\.coralreef\.([a-z0-9_]+)'/gi)].map((m) => m[1]).filter((k) => !/^rc_/.test(k));
    expect([...new Set(newKeys)].sort()).toEqual(['mdl_li_background', 'mdl_li_overgrowth', 'mdl_li_planted', 'mdl_li_regrowth', 'mo_col_year', 'mo_limit_4']);
  });
});
