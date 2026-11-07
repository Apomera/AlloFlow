import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadTool, resetStemLab, renderTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
import { runIsolatedAxe } from './helpers/isolated_axe_harness.js';

// Reef science lab (lane sciLab, 2026-11-03): topic tabs and three
// investigations. The pure rules are checked against the tool's own shared
// rules (dhwFor, alertLevel, bleachedShare, heatMortality, acidFactor,
// runScenario), so the investigations cannot drift from the rest of the lab.

vi.setConfig({ testTimeout: 60000 });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
let S, X;
const mounted = [];
beforeEach(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef'); S = window.__RR_TEST_EXPORTS__.coralReefSci; X = window.__RR_TEST_EXPORTS__.coralReef; });
afterEach(async () => {
  while (mounted.length) { const m = mounted.pop(); await act(async () => m.root.unmount()); m.host.remove(); }
  delete window.matchMedia;
});

function dom(html) { const host = document.createElement('div'); host.innerHTML = html; return host; }
async function mount(seed = {}) {
  let data = { coralReef: { section: 'science', ...seed } };
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef;
  const said = [];
  function Shell() {
    const [toolData, setToolData] = React.useState(data);
    data = toolData;
    return cfg.render({ React, toolData, setToolData, t: (k, f) => f || k, announceToSR: (m) => said.push(m) });
  }
  const item = { host, root, said, get d() { return data.coralReef; } };
  mounted.push(item);
  await act(async () => root.render(React.createElement(Shell)));
  return item;
}
async function click(node) { expect(node, 'button exists').toBeTruthy(); await act(async () => { node.click(); await Promise.resolve(); }); }
async function key(node, k) { await act(async () => { node.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); }); }
async function slide(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await act(async () => { setter.call(input, String(value)); input.dispatchEvent(new Event('input', { bubbles: true })); });
}
const byText = (root, sel, re) => [...root.querySelectorAll(sel)].find((n) => re.test(n.textContent));
const panel = (host, id) => host.querySelector('#cr-scilab-panel-' + id);

describe('inside a coral: one heatwave week by week', () => {
  it('adds up Degree Heating Weeks with the tool\'s own NOAA rule, then lets them fall', () => {
    for (const [a, w] of [[1, 3], [2, 4], [1.5, 6], [3, 8], [4, 12], [0.5, 6]]) {
      const run = S.bleachRun({ anomaly: a, weeks: w });
      expect(run.peak).toBe(S.dhwFor(a, w));
      expect(Math.max(...run.rows.map((r) => r.dhw))).toBe(run.peak);
      for (const r of run.rows) {
        expect(r.level).toBe(S.alertLevel(r.dhw));
        const inHeat = r.week >= S.HEAT_FIRST && r.week < S.HEAT_FIRST + w;
        expect(r.heat).toBe(inHeat);
        if (inHeat) expect(r.dhw).toBe(S.dhwFor(a, r.week - S.HEAT_FIRST + 1));
        // The 12-week window forgets the heat 12 weeks after it ends.
        if (r.week >= S.HEAT_FIRST + w + 11) expect(r.dhw).toBe(0);
      }
    }
    // Less than 1 degree C adds nothing (Bleaching Watch).
    expect(S.bleachRun({ anomaly: 0.5, weeks: 12 }).peak).toBe(0);
  });

  it('matches the Reef future curves: deaths from heatMortality, paling from bleachedShare', () => {
    for (const sens of ['tolerant', 'typical', 'sensitive']) for (let a = 1; a <= 4; a += 0.5) for (const w of [1, 2, 4, 6, 9, 12]) {
      const run = S.bleachRun({ anomaly: a, weeks: w, sensitivity: sens });
      const where = sens + ' ' + a + 'x' + w;
      expect(run.killed, where).toBe(S.heatMortality(run.peak, sens));
      expect(run.dead, where).toBe(Math.round(10 * S.heatMortality(run.peak, sens)));
      expect(run.survivors + run.dead).toBe(10);
      const last = run.rows[run.rows.length - 1];
      expect(Math.abs(last.alive - (1 - run.killed)), where).toBeLessThan(0.01);
      expect(last.dead).toBe(run.dead);
      // At the end of the heat the algae are at 1 - bleachedShare(peak).
      expect(run.rows[run.heatEnd].algae, where).toBeCloseTo(Math.max(0.05, 1 - S.bleachedShare(run.peak)), 6);
      expect(run.peakWhite, where).toBeLessThanOrEqual(Math.round(10 * S.bleachedShare(run.peak)));
      // Corals never come back from the dead, and the dead count only grows.
      for (let i = 1; i < run.rows.length; i++) {
        expect(run.rows[i].alive).toBeLessThanOrEqual(run.rows[i - 1].alive + 1e-12);
        expect(run.rows[i].dead).toBeGreaterThanOrEqual(run.rows[i - 1].dead);
      }
      // Alert wording: up to 3 DHW nothing dies; at Alert Level 5 (20+) at most 2 of 10 survive.
      if (run.peak <= 3) expect(run.dead, where).toBe(0);
      if (run.peak >= 20) expect(run.survivors, where).toBeLessThanOrEqual(2);
    }
  });

  it('shows that bleached is not dead and that a short heatwave ends in recovery', () => {
    const run = S.bleachRun({ anomaly: 2, weeks: 4, sensitivity: 'tolerant' });
    expect(run.peak).toBe(8);
    expect(run.peakWhite).toBeGreaterThanOrEqual(6);
    expect(run.survivors).toBeGreaterThanOrEqual(9);
    expect(run.outcome).toBe('most');
    // Color back between about 1.5 and 4 months after the heat (Rodrigues and Grottoli 2007).
    expect(run.colorBack - run.heatEnd).toBeGreaterThanOrEqual(6);
    expect(run.colorBack - run.heatEnd).toBeLessThanOrEqual(18);
    expect(run.rows[run.rows.length - 1].algae).toBeGreaterThan(0.95);
    const mild = S.bleachRun(S.PRESETS.find((p) => p.id === 'mild'));
    expect(mild.dead).toBe(0);
    expect(mild.outcome).toBe('most');
  });

  it('kills nearly every coral when severe heat lasts a long time', () => {
    const run = S.bleachRun({ anomaly: 3, weeks: 12, sensitivity: 'sensitive' });
    expect(run.peak).toBe(36);
    expect(run.outcome).toBe('few');
    expect(run.survivors).toBeLessThanOrEqual(1);
    expect(run.rows[run.rows.length - 1].living).toBe(run.survivors);
    const long = S.bleachRun(S.PRESETS.find((p) => p.id === 'extreme'));
    expect(long.dead).toBeGreaterThan(S.bleachRun({ anomaly: 3, weeks: 2 }).dead);
  });

  it('gives the same result for the same heat stress, however it is made', () => {
    const a = S.bleachRun(S.PRESETS.find((p) => p.id === 'hot_short')), b = S.bleachRun(S.PRESETS.find((p) => p.id === 'warm_long'));
    expect(a.peak).toBe(b.peak);
    expect(a.dead).toBe(b.dead);
    expect(a.outcome).toBe(b.outcome);
    // And a longer heatwave at the same warmth is worse.
    expect(S.bleachRun({ anomaly: 2, weeks: 8, sensitivity: 'sensitive' }).dead).toBeGreaterThan(S.bleachRun({ anomaly: 2, weeks: 2, sensitivity: 'sensitive' }).dead);
  });
});

describe('the limestone budget', () => {
  it('adds coral building and subtracts each kind of erosion', () => {
    for (const cover of [0, 0.1, 0.2, 0.4, 0.6]) for (const omega of [1.5, 1.9, 3.4, 4.2]) for (const grazers of ['low', 'medium', 'high']) for (const urchins of ['few', 'many']) {
      const b = S.budget({ cover, omega, grazers, urchins });
      expect(b.added).toBeCloseTo(S.BUDGET.coralPerCover * cover * S.acidFactor(omega), 10);
      expect(b.removed).toBeCloseTo(S.BUDGET.parrotfish[grazers] + S.BUDGET.urchins[urchins] + S.BUDGET.other, 10);
      expect(b.net).toBeCloseTo(b.added - b.removed, 10);
      expect(b.mmPerYear).toBeCloseTo(b.net * S.BUDGET.mmPerKg, 10);
      expect(b.state).toBe(b.net >= 0.3 ? 'grow' : b.net <= -0.3 ? 'shrink' : 'even');
    }
  });

  it('reproduces the published Caribbean magnitudes it was built from', () => {
    // Today's average reef (20.6% coral, Perry et al. 2018): coral production 4.22, net 1.5 to 2.6.
    const today = S.budget({ cover: 0.206, omega: 3.5 });
    expect(today.added).toBeCloseTo(4.22, 1);
    expect(today.net).toBeGreaterThan(1.5);
    expect(today.net).toBeLessThan(2.6);
    // Erosion near the 2.0 average of Perry et al. 2014.
    expect(today.removed).toBeGreaterThan(1.7);
    expect(today.removed).toBeLessThan(2.3);
    // The balance point sits near the ~10% coral cover of Perry et al. 2013.
    expect(today.breakEvenCover).toBeGreaterThan(0.08);
    expect(today.breakEvenCover).toBeLessThan(0.13);
    expect(S.BUDGET.coralPerCover * today.breakEvenCover * S.acidFactor(3.5)).toBeCloseTo(today.removed, 8);
  });

  it('flips from growing to shrinking when coral is lost, urchins boom, or the water turns acidic', () => {
    expect(S.budget({}).state).toBe('grow');
    expect(S.budget({ cover: 0.05 }).state).toBe('shrink');
    expect(S.budget({ cover: 0.2, urchins: 'many' }).state).toBe('shrink');
    const acid = S.budget({ cover: 0.15, omega: 1.5 }), now = S.budget({ cover: 0.15, omega: 3.4 });
    expect(now.net).toBeGreaterThan(0);
    expect(acid.net).toBeLessThan(now.net);
    expect(acid.breakEvenCover).toBeGreaterThan(now.breakEvenCover);
    expect(S.budget({ cover: 0.4 }).mmPerYear).toBeGreaterThan(S.BUDGET.seaMm);
  });
});

describe('seaweed versus grazers: a tipping point', () => {
  it('uses the Reef future model\'s own yearly rule', () => {
    const settings = Object.assign(X.scenarioSettings('recent'), { heatPeakStart: 0, heatPeakEnd: 0, acidification: false, sensitivity: 'tolerant', years: 20, startCoral: 0.4, startAlgae: 0.05 });
    const model = X.runScenario(settings, 7), mine = S.seaweedRun({ coral: 0.4, algae: 0.05 }, 0.6, 'medium', 20);
    for (let i = 0; i <= 20; i++) {
      expect(mine[i].coral, 'coral year ' + i).toBeCloseTo(model[i].coral, 10);
      expect(mine[i].algae, 'seaweed year ' + i).toBeCloseTo(model[i].algae, 10);
    }
  });

  it('needs more grazers to bring coral back than it took to keep it (hysteresis)', () => {
    let prev = null;
    for (const n of ['low', 'medium', 'high']) {
      const t = S.seaweedThresholds(n);
      expect(t.recover, n).toBeGreaterThan(t.keep + 0.1);
      // In between, the reef's past decides: both states hold.
      const mid = (t.keep + t.recover) / 2;
      expect(S.settled(S.HEALTHY, mid, n).coral, n + ' healthy start').toBeGreaterThan(0.4);
      expect(S.settled(S.WEEDY, mid, n).coral, n + ' weedy start').toBeLessThan(0.1);
      // Runoff pushes both tipping points up.
      if (prev) { expect(t.keep).toBeGreaterThan(prev.keep); expect(t.recover).toBeGreaterThan(prev.recover); }
      prev = t;
    }
    // Low grazing (the model's own low level) keeps a healthy reef, but cannot rescue a seaweed reef.
    const low = 0.3, t = S.seaweedThresholds('medium');
    expect(low).toBeGreaterThan(t.keep);
    expect(low).toBeLessThan(t.recover);
  });

  it('tips a low-grazing reef to seaweed after a heatwave', () => {
    let reef = S.seaweedRun(S.HEALTHY, 0.3, 'medium', 20).pop();
    expect(reef.coral).toBeGreaterThan(0.45);
    const shocked = S.shock(reef);
    expect(shocked.killed).toBe(S.heatMortality(S.SHOCK_DHW, 'sensitive'));
    reef = S.seaweedRun(shocked, 0.3, 'medium', 40).pop();
    expect(reef.algae).toBeGreaterThan(reef.coral * 3);
    // Raising grazing back up to high brings it back.
    expect(S.seaweedRun(reef, 0.9, 'medium', 60).pop().coral).toBeGreaterThan(0.4);
  });
});

describe('reef science lab page', () => {
  it('groups every science and help card under six topics and shows one topic at a time', () => {
    const host = dom(renderTool('coralReef', { coralReef: { section: 'science' } }));
    const tabs = [...host.querySelectorAll('[role="tablist"] [role="tab"]')];
    expect(tabs.map((t) => t.id)).toEqual(S.TOPICS.map((id) => 'cr-scilab-tab-' + id));
    expect(tabs.filter((t) => t.getAttribute('aria-selected') === 'true').map((t) => t.id)).toEqual(['cr-scilab-tab-heat']);
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1', '-1', '-1']);
    const panels = [...host.querySelectorAll('[role="tabpanel"]')];
    expect(panels.filter((p) => !p.hasAttribute('hidden')).map((p) => p.id)).toEqual(['cr-scilab-panel-heat']);
    for (const p of panels) expect(host.querySelector('#' + p.getAttribute('aria-labelledby'))).toBeTruthy();
    for (const [topic, ids] of Object.entries(S.TOPIC_CARDS)) {
      const shown = [...panel(host, topic).querySelectorAll('section.cr-sci-card svg[data-figure]')].map((s) => s.getAttribute('data-figure'));
      expect(shown, topic).toEqual(ids);
    }
    expect(panel(host, 'help').querySelectorAll('section.cr-help-card').length).toBe(8);
    // The old stand-alone DHW calculator is folded into the heatwave investigation.
    expect(host.textContent).not.toMatch(/Try it: Degree Heating Weeks/);
    expect(panel(host, 'heat').querySelector('[data-scilab-figure="bleach-week"]')).toBeTruthy();
    // Sources are collapsed, and include the new ones.
    const src = host.querySelector('details.cr-scilab-sources');
    expect(src.hasAttribute('open')).toBe(false);
    for (const s of S.sources()) expect(src.textContent).toContain(s.text);
  });

  it('switches topics with the arrow, Home and End keys, keeping focus on the tab', async () => {
    const t = await mount();
    const tab = (id) => t.host.querySelector('#cr-scilab-tab-' + id);
    tab('heat').focus();
    await key(tab('heat'), 'ArrowRight');
    expect(t.d.sciTopic).toBe('seaweed');
    expect(document.activeElement).toBe(tab('seaweed'));
    expect(tab('seaweed').getAttribute('aria-selected')).toBe('true');
    expect(panel(t.host, 'seaweed').hasAttribute('hidden')).toBe(false);
    expect(panel(t.host, 'heat').hasAttribute('hidden')).toBe(true);
    await key(tab('seaweed'), 'End');
    expect(t.d.sciTopic).toBe('help');
    expect(document.activeElement).toBe(tab('help'));
    await key(tab('help'), 'ArrowRight');
    expect(t.d.sciTopic).toBe('heat');
    await key(tab('heat'), 'ArrowLeft');
    expect(t.d.sciTopic).toBe('help');
    await key(tab('help'), 'Home');
    expect(t.d.sciTopic).toBe('heat');
    expect(document.activeElement).toBe(tab('heat'));
    await click(tab('build'));
    expect(t.d.sciTopic).toBe('build');
    expect(t.said.some((m) => /Topic: Building a reef/.test(m))).toBe(true);
  });

  it('asks for a heatwave prediction before showing what happens, then plays the year', async () => {
    window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
    const t = await mount();
    const p = panel(t.host, 'heat');
    const runBtn = byText(p, 'button', /^Run the heatwave$/);
    expect(runBtn.disabled).toBe(true);
    expect(p.textContent).not.toMatch(/What happened/);
    expect(p.querySelector('input[type="range"][max="52"]')).toBeNull();
    await click(byText(p, 'button', /Long and milder/));
    expect(t.d.sciBleach).toMatchObject({ anomaly: 1.5, weeks: 6, sensitivity: 'typical' });
    await click(byText(p, 'button', /^Some die, the rest recover$/));
    expect(byText(p, 'button', /^Run the heatwave$/).disabled).toBe(false);
    vi.useFakeTimers();
    try {
      await click(byText(p, 'button', /^Run the heatwave$/));
      expect(t.d.sciBleach.revealed).toBe(true);
      const run = S.bleachRun(t.d.sciBleach);
      const live = p.querySelector('[aria-live="polite"] p');
      const results = live.parentNode;
      expect(results.textContent).toContain('You predicted: Some die, the rest recover. What happened:');
      expect(results.textContent).toContain('peaked at ' + run.peak + ' Degree Heating Weeks');
      expect(t.said.some((m) => m.includes('Peak heat stress ' + run.peak))).toBe(true);
      // The year plays week by week.
      const label = () => p.querySelector('[data-scilab-figure="bleach-week"]').getAttribute('aria-label');
      expect(label()).toMatch(/^Week 0\./);
      await act(async () => { vi.advanceTimersByTime(160 * 10); });
      expect(label()).toMatch(/^Week 10\./);
      await act(async () => { vi.advanceTimersByTime(160 * 60); });
      expect(label()).toMatch(/^Week 52\./);
      expect(label()).toContain(run.survivors + ' are alive');
    } finally { vi.useRealTimers(); }
    // A second heatwave with the same heat stress is compared with the first.
    await click(byText(p, 'button', /Short and very hot/));
    expect(t.d.sciBleach.revealed).toBe(false);
    expect(t.d.sciBleach.pred).toBe(null);
    expect(p.textContent).not.toMatch(/What happened/);
    await click(byText(p, 'button', /^Some die, the rest recover$/));
    await click(byText(p, 'button', /^Run the heatwave$/));
    expect(p.textContent).toMatch(/both added up to 9 Degree Heating Weeks, and they ended the same way/);
    expect(p.querySelector('table caption').textContent).toBe('Your heatwaves');
  });

  it('shows the last week at once, with no animation, when motion is reduced', async () => {
    window.matchMedia = (q) => ({ matches: /reduce/.test(q), addListener() {}, removeListener() {} });
    const t = await mount({ sciBleach: { anomaly: 3, weeks: 12, sensitivity: 'sensitive', pred: 'few' } });
    await click(byText(panel(t.host, 'heat'), 'button', /^Run the heatwave$/));
    const fig = panel(t.host, 'heat').querySelector('[data-scilab-figure="bleach-week"]');
    expect(fig.getAttribute('aria-label')).toMatch(/^Week 52\./);
    await click(byText(panel(t.host, 'heat'), 'button', /Play the year/));
    expect(fig.getAttribute('aria-label')).toMatch(/^Week 52\./);
    expect(panel(t.host, 'heat').textContent).toMatch(/All 10 corals died|died in the weeks after the peak/);
  });

  it('budget: predict, check, then change the reef and hear the result', async () => {
    const t = await mount({ sciTopic: 'build' });
    const p = panel(t.host, 'build');
    expect(byText(p, 'button', /^Check the budget$/).disabled).toBe(true);
    expect(p.querySelector('[data-scilab-figure="budget"]')).toBeNull();
    await click(byText(p, 'button', /^Shrinking$/));
    await click(byText(p, 'button', /^Check the budget$/));
    expect(p.textContent).toContain('You predicted: Shrinking. For today\'s average reef the budget says: Growing.');
    expect(p.querySelector('[data-scilab-figure="budget"]')).toBeTruthy();
    const coverSlider = [...p.querySelectorAll('input[type="range"]')].find((i) => i.max === '60');
    await slide(coverSlider, 5);
    expect(t.d.sciBudget.cover).toBe(0.05);
    const live = p.querySelector('[aria-live="polite"]');
    expect(live.textContent).toMatch(/so the reef is shrinking/);
    await click(byText(p, 'button', /Back to today's average reef/));
    await click(byText(p, 'button', /^Many \(before 1983\)$/));
    expect(t.d.sciBudget.urchins).toBe('many');
    const b = S.budget(t.d.sciBudget);
    expect(live.textContent).toContain('but ' + b.removed.toFixed(1) + ' kg is worn away');
  });

  it('seaweed: predict, then run years and a heatwave, then reveal the tipping points', async () => {
    const t = await mount({ sciTopic: 'seaweed' });
    const p = panel(t.host, 'seaweed');
    expect(byText(p, 'button', /^Start the experiment$/).disabled).toBe(true);
    await click(byText(p, 'button', /^Yes, the same grazing brings it back$/));
    await click(byText(p, 'button', /^Start the experiment$/));
    expect(t.d.sciSeaweed.started).toBe(true);
    const graze = [...p.querySelectorAll('input[type="range"]')].find((i) => i.max === '100');
    await slide(graze, 30);
    await click(byText(p, 'button', /^Let 20 years pass$/));
    const after = S.seaweedRun(S.HEALTHY, 0.3, 'medium', 20).pop();
    expect(p.querySelector('p[aria-live="polite"]').textContent).toContain('live coral ' + Math.round(after.coral * 100) + '%');
    await click(byText(p, 'button', /^A heatwave hits$/));
    expect(p.querySelector('p[aria-live="polite"]').textContent).toContain('killed 85% of the coral');
    await click(byText(p, 'button', /^Let 20 years pass$/));
    expect(t.d.sciSeaweed.path.map((e) => e.kind)).toEqual(['start', 'run', 'heat', 'run']);
    expect(p.querySelector('[data-scilab-figure="tipping"]')).toBeNull();
    await click(byText(p, 'button', /^Show the tipping points$/));
    const thr = S.seaweedThresholds('medium');
    const fig = p.querySelector('[data-scilab-figure="tipping"]');
    expect(fig.getAttribute('aria-label')).toContain('about ' + Math.round(thr.keep * 100) + '% grazing');
    expect(fig.getAttribute('aria-label')).toContain('above about ' + Math.round(thr.recover * 100) + '% grazing');
    expect(p.textContent).toContain('You predicted: Yes, the same grazing brings it back. The model says: Only with more grazing fish than before.');
    // The student's own runs are plotted on the chart.
    expect(fig.querySelectorAll('circle').length).toBeGreaterThanOrEqual(3);
  });

  it('opens the dive and the model at matching places', async () => {
    let t = await mount();
    await click(byText(panel(t.host, 'heat'), 'button', /Dive a reef in a heatwave/));
    expect(t.d.section).toBe('explore');
    expect(t.d.diveSiteId).toBe('heatwave');
    expect(X.EXPLORE_SITES.map((s) => s.id)).toContain('heatwave');
    t = await mount({ sciTopic: 'seaweed' });
    await click(byText(panel(t.host, 'seaweed'), 'button', /Model a protected reef/));
    expect(t.d.section).toBe('model');
    expect(t.d.model).toEqual(X.scenarioSettings('reserve'));
    t = await mount({ sciTopic: 'build' });
    await click(byText(panel(t.host, 'build'), 'button', /See what helps reefs/));
    expect(t.d.sciTopic).toBe('help');
  });

  const STATES = {
    'heat predict': { sciTopic: 'heat' },
    'heat revealed': { sciTopic: 'heat', sciBleach: { anomaly: 2, weeks: 4, sensitivity: 'sensitive', pred: 'some', revealed: true, log: [{ key: '1.5:6:sensitive', anomaly: 1.5, weeks: 6, sensitivity: 'sensitive', peak: 9, survivors: 2 }] } },
    'budget revealed': { sciTopic: 'build', sciBudget: { cover: 0.1, omega: 1.9, grazers: 'high', urchins: 'many', pred: 'grow', revealed: true } },
    'seaweed revealed': { sciTopic: 'seaweed', sciSeaweed: { graze: 0.3, nutrients: 'high', started: true, revealed: true, pred: 'more', path: [{ kind: 'start', graze: 0.6, coral: 0.4, algae: 0.05 }, { kind: 'run', graze: 0.3, nutrients: 'high', coral: 0.1, algae: 0.5 }] } },
    'future': { sciTopic: 'future' }, 'help': { sciTopic: 'help' }
  };

  it.each(Object.keys(STATES))('%s renders in every theme with palette ink and readable labels', (name) => {
    for (const theme of ['light', 'dark', 'contrast']) {
      const html = renderTool('coralReef', { coralReef: { section: 'science', ...STATES[name] } }, { theme });
      expect(html.includes('NaN'), name + ' ' + theme).toBe(false);
      expect(html.includes('undefined'), name + ' ' + theme).toBe(false);
      const P = X.palette(theme), host = dom(html);
      for (const svg of host.querySelectorAll('svg[data-scilab-figure]')) {
        expect(svg.getAttribute('viewBox')).toMatch(/^0 0 320 \d+$/);
        expect(svg.getAttribute('role')).toBe('img');
        expect((svg.getAttribute('aria-label') || '').length).toBeGreaterThan(40);
        for (const tx of svg.querySelectorAll('text')) {
          const where = theme + ' ' + svg.getAttribute('data-scilab-figure') + ' "' + tx.textContent + '"';
          expect(Number(tx.getAttribute('font-size')), where).toBeGreaterThanOrEqual(13.5);
          expect([P.text, P.muted, P.good, P.bad], where).toContain(tx.getAttribute('fill'));
        }
      }
    }
  });

  it.each(Object.keys(STATES))('%s passes axe', async (name) => {
    const html = renderTool('coralReef', { coralReef: { section: 'science', ...STATES[name] } });
    const result = await runIsolatedAxe(html);
    expect(result.violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')), name).toEqual([]);
  }, 30000);
});
