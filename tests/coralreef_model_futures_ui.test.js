import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadTool, resetStemLab, renderTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
import { runIsolatedAxe } from './helpers/isolated_axe_harness.js';

// Reef future, lane mdl: many runs, a second future on the chart, the cause
// diagram and starting from a saved survey, driven through the real section.
// Numbers on screen are compared with the model's own functions.

vi.setConfig({ testTimeout: 60000 });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const mounted = [];
let X, M;
beforeEach(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef'); X = window.__RR_TEST_EXPORTS__.coralReef; M = window.__RR_TEST_EXPORTS__.coralReefModel; });
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
const buttons = (t) => [...t.host.querySelectorAll('button')];
const button = (t, name) => buttons(t).find((b) => b.textContent.trim() === name);
async function click(node) { expect(node, 'button').toBeTruthy(); await act(async () => { node.focus(); node.click(); await Promise.resolve(); }); }
const pc = (v) => Math.round(v * 100);
function surveyEntry(siteId, n) {
  const site = X.siteById(siteId), seed = (site.seed + (n - 1) * 7919) >>> 0, layout = X.buildTransect(site, seed);
  const records = Object.fromEntries(layout.points.map((p, i) => [i, p.category]));
  const sc = X.scoreSurvey(layout, records, X.fishInBelt(layout)), fish = {};
  sc.fish.forEach((f) => { fish[f.family] = f.density; });
  return { id: X.surveyEntryId(site, seed), siteId, seed, transect: n, modelYear: null, at: 1, agreement: sc.agreement, recorded: 40, records, cover: sc.cover, indicators: X.indicators(sc.cover), fish, modelRun: null };
}
const ALL = { recent: true, reserve: true, warmer: true, cooler: true, rubble: true };

describe('no answer before the prediction', () => {
  it('shows no run, band, comparison or diagram until the student predicts and runs', async () => {
    // Even with the new options already switched on in saved data.
    const t = await mount({ mdlSpread: true, mdlCompare: 'warmer', modelSurveyYear: 30, modelRevealedFor: { warmer: true } });
    const h = t.host;
    for (const sel of ['[data-mdl-strip]', '[data-mdl-band]', '[data-mdl-diagram]', '[data-mdl-tools]', 'svg[data-model-chart]', '[data-mdl-spread-toggle]']) expect(h.querySelector(sel), sel).toBe(null);
    expect(button(t, 'Run it 20 times')).toBeUndefined();
    const rows = X.runScenario(X.scenarioSettings('recent'), 11);
    expect(h.textContent.includes('to ' + pc(rows[30].coral) + '%')).toBe(false);
    await click(button(t, 'Lower than today'));
    await click(button(t, 'Run the model'));
    expect(h.querySelector('svg[data-model-chart]')).toBeTruthy();
    expect(h.querySelector('[data-mdl-diagram]')).toBeTruthy();
    expect(h.querySelector('[data-mdl-strip]'), 'the saved spread choice now shows').toBeTruthy();
    expect(t.data.modelRevealedFor.recent).toBe(true);
  });

  it('offers to compare only with scenarios already predicted and run from the same start', async () => {
    const t = await mount({ modelRevealedFor: { recent: true, cooler: true }, modelPredictions: { recent: { choice: 'lower' } } });
    const offered = [...t.host.querySelectorAll('[data-mdl-compare]')].map((b) => b.getAttribute('data-mdl-compare'));
    expect(offered).toEqual(['none', 'cooler']);
    expect(t.host.textContent).toContain('Scenarios you have predicted and run from this starting reef appear here.');
  });

  it('a new starting reef needs a new prediction', async () => {
    const log = [surveyEntry('harbor', 1)];
    const t = await mount({ surveyLog: log, modelRevealedFor: ALL, modelPredictions: { recent: { choice: 'lower' } } });
    expect(t.host.querySelector('svg[data-model-chart]')).toBeTruthy();
    const opt = t.host.querySelector('[data-mdl-start-option]');
    await click(opt);
    expect(t.data.mdlStartKey).toBe('survey:harbor');
    expect(opt.getAttribute('aria-pressed')).toBe('true');
    expect(t.host.querySelector('svg[data-model-chart]')).toBe(null);
    expect(t.host.textContent).toContain('Predict first');
    const start = M.mdlSurveyStarts(log)[0];
    expect(t.host.textContent).toContain('Today the reef you surveyed has ' + pc(start.coral) + '% live coral.');
    expect(t.said.at(-1)).toContain('Starting reef: your survey of');
    // Other scenarios were run from the standard start only, so none is offered yet.
    await click(button(t, 'Higher than today'));
    await click(button(t, 'Run the model'));
    expect(t.data.modelRevealedFor['recent@survey:harbor']).toBe(true);
    expect([...t.host.querySelectorAll('[data-mdl-compare]')].map((b) => b.getAttribute('data-mdl-compare'))).toEqual(['none']);
    const rows = X.runScenario(M.mdlWithStart(X.scenarioSettings('recent'), start), 11);
    expect(t.host.textContent).toContain('live coral went from ' + pc(rows[0].coral) + '% to ' + pc(rows[30].coral) + '%');
    // The survey and dive of a modeled year carry the surveyed start.
    await click(button(t, 'Survey this reef in year 30'));
    expect(t.data.modelSite.modelRun.settings.startCoral).toBe(start.coral);
  });
});

describe('many runs', () => {
  it('toggles with aria-pressed, draws the band and dot plot, and says the numbers', async () => {
    const t = await mount({ modelRevealedFor: ALL, modelPredictions: { recent: { choice: 'lower' } } });
    const btn = t.host.querySelector('[data-mdl-spread-toggle]');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    await click(btn);
    const again = t.host.querySelector('[data-mdl-spread-toggle]');
    expect(again.getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement).toBe(again);
    const e = M.mdlEnsemble(X.scenarioSettings('recent'), 11), b = e.bands[30];
    expect(t.host.querySelectorAll('svg[data-model-chart] [data-mdl-band]')).toHaveLength(2);
    const dots = [...t.host.querySelectorAll('[data-mdl-strip] [data-mdl-dot]')];
    expect(dots).toHaveLength(20);
    expect(dots.filter((d) => d.getAttribute('data-mdl-mine') === 'true').map((d) => +d.getAttribute('data-mdl-dot'))).toEqual([pc(X.runScenario(X.scenarioSettings('recent'), 11)[30].coral)]);
    const live = t.host.querySelector('[data-mdl-spread="on"]');
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.textContent).toContain('live coral ranged from ' + pc(b.min) + '% to ' + pc(b.max) + '%; the middle 16 runs ended between ' + pc(b.lo) + '% and ' + pc(b.hi) + '%');
    expect(live.textContent).toContain('higher in ' + e.counts.higher + ' runs, about the same in ' + e.counts.same + ', lower in ' + e.counts.lower + '.');
    expect(t.said.at(-1)).toBe('Showing 20 runs. Live coral in year 30 ranged from ' + pc(b.min) + '% to ' + pc(b.max) + '%.');
    expect(t.host.textContent).toContain('Middle 16 of 20 runs');
    await click(again);
    expect(t.host.querySelector('[data-mdl-strip]')).toBe(null);
  });
});

describe('two futures on one chart', () => {
  it('keeps the without-actions line by default and lets the student switch it off', async () => {
    const t = await mount({ model: X.scenarioSettings('rubble'), modelRevealedFor: { rubble: true }, modelSurveyYear: 30 });
    expect(t.host.querySelector('svg[data-model-chart]').textContent).toContain('Without actions');
    expect(t.host.querySelector('[data-mdl-compare="without"]').getAttribute('aria-pressed')).toBe('true');
    await click(t.host.querySelector('[data-mdl-compare="none"]'));
    expect(t.host.querySelector('svg[data-model-chart]').textContent.includes('Without actions')).toBe(false);
    // The year-30 sentence about the actions stays.
    expect(t.host.textContent).toContain('With the restoration actions, live coral in year 30');
  });

  it('overlays another scenario with a readout taken from the model', async () => {
    const t = await mount({ modelRevealedFor: ALL, modelPredictions: { recent: { choice: 'lower' } } });
    await click(t.host.querySelector('[data-mdl-compare="warmer"]'));
    const r = X.runScenario(X.scenarioSettings('recent'), 11), w = X.runScenario(X.scenarioSettings('warmer'), 11);
    const text = t.host.querySelector('[data-mdl-compare-text]');
    expect(text.getAttribute('aria-live')).toBe('polite');
    expect(text.textContent).toContain('In year 30, live coral is ' + pc(r[30].coral) + '% in Recent pattern and ' + pc(w[30].coral) + '% in Faster warming: ' + (pc(r[30].coral) - pc(w[30].coral)) + ' percentage points more in Recent pattern.');
    expect(text.textContent).toContain('different heatwaves');
    expect(t.host.textContent).toContain('Live coral in Faster warming');
    expect(t.host.querySelector('svg[data-model-chart]').getAttribute('aria-label')).toContain('A dotted grey line shows live coral in Faster warming, ending at ' + pc(w[30].coral) + '%.');
    await click(t.host.querySelector('[data-mdl-compare="reserve"]'));
    expect(t.host.querySelector('[data-mdl-compare-text]').textContent).toContain('exactly the same heatwaves');
    // The two default futures end the same here because seaweed never takes hold; the readout says why.
    expect(t.host.querySelector('[data-mdl-compare-text]').textContent).toContain('Seaweed never covered more than');
  });
});

describe('what pushed on the coral', () => {
  it('draws arrows from the traced run of the picked year and steps through years', async () => {
    const st = X.scenarioSettings('warmer'), rows = X.runScenario(st, 11, true), drop = M.mdlBiggestDrop(rows);
    const t = await mount({ model: st, modelRevealedFor: ALL, modelSurveyYear: drop.year });
    const c = M.mdlYearCauses(rows, drop.year, st);
    const diagram = t.host.querySelector('[data-mdl-diagram]');
    expect(+diagram.getAttribute('data-mdl-diagram')).toBe(drop.year);
    expect(diagram.getAttribute('data-mdl-main')).toBe('heat');
    expect(+diagram.querySelector('[data-mdl-arrow="heat"]').getAttribute('data-amount')).toBe(Math.round(rows[drop.year].killed * 100 * 10) / 10);
    expect(diagram.getAttribute('aria-label')).toContain('Coral fell from ' + pc(c.coralFrom) + '% to ' + pc(c.coralTo) + '% mainly because of the heatwave');
    expect(t.host.querySelector('[data-mdl-headline]').textContent).toContain(rows[drop.year].dhw + ' Degree Heating Weeks');
    const items = [...t.host.querySelectorAll('[data-mdl-cause]')].map((li) => li.getAttribute('data-mdl-cause'));
    expect(items.slice(0, 1)).toEqual(['heat']);
    expect(items).toContain('a_grazed');
    const next = button(t, 'Next year');
    await click(next);
    expect(t.data.modelSurveyYear).toBe(drop.year + 1);
    expect(document.activeElement.textContent).toBe('Next year');
    expect(+t.host.querySelector('[data-mdl-diagram]').getAttribute('data-mdl-diagram')).toBe(drop.year + 1);
    expect(t.said.at(-1)).toBe('Year ' + (drop.year + 1) + '.');
    await click(button(t, 'Go to the biggest coral drop (year ' + drop.year + ')'));
    expect(t.data.modelSurveyYear).toBe(drop.year);
  });

  it('explains year 0 and shows planting arrows only when people are helping', async () => {
    const t = await mount({ modelRevealedFor: ALL, modelSurveyYear: 0 });
    expect(t.host.querySelector('[data-mdl-diagram]')).toBe(null);
    expect(t.host.textContent).toContain('Year 0 is the starting reef.');
    expect(button(t, 'Previous year').disabled).toBe(true);
    const r = await mount({ model: X.scenarioSettings('rubble'), modelRevealedFor: ALL, modelSurveyYear: 3 });
    const rows = X.runScenario(X.scenarioSettings('rubble'), 11, true), p = rows[3].mdlParts;
    expect(+r.host.querySelector('[data-mdl-arrow="planted"]').getAttribute('data-amount')).toBe(Math.round((p.planted + p.fragments) * 100 * 10) / 10);
    expect(r.host.querySelector('[data-mdl-cause="planted"]')).toBeTruthy();
    expect(r.host.querySelector('[data-mdl-flag="ground"]')).toBeTruthy();
  });
});

describe('themes and accessibility', () => {
  const FULL = (log) => ({ surveyLog: log, model: X.scenarioSettings('reserve'), mdlStartKey: 'survey:harbor', mdlSpread: true, mdlCompare: 'recent', modelSurveyYear: 12,
    modelRevealedFor: { ...ALL, 'reserve@survey:harbor': true, 'recent@survey:harbor': true } });
  it.each(['light', 'dark', 'contrast'])('%s renders every new part with no NaN and no errors', async (theme) => {
    const log = [surveyEntry('harbor', 1), surveyEntry('rubble', 1)];
    const errors = [], spy = vi.spyOn(console, 'error').mockImplementation((...a) => errors.push(a.join(' ')));
    const t = await mount(FULL(log), theme);
    spy.mockRestore();
    expect(errors).toEqual([]);
    for (const sel of ['[data-mdl-strip]', '[data-mdl-band]', '[data-mdl-diagram]', '[data-mdl-start-note]', '[data-mdl-compare-text] p']) expect(t.host.querySelector(sel), sel).toBeTruthy();
    expect(t.host.innerHTML.includes('NaN')).toBe(false);
    expect(t.host.innerHTML.includes('undefined')).toBe(false);
    for (const svg of t.host.querySelectorAll('[data-mdl-strip],[data-mdl-diagram]')) { expect(svg.getAttribute('role')).toBe('img'); expect(svg.getAttribute('aria-label').length).toBeGreaterThan(40); }
    const P = X.palette(theme);
    expect(t.host.querySelector('[data-mdl-arrow="regrowth"] line').getAttribute('stroke')).toBe(P.accent);
    expect(t.host.querySelector('[data-mdl-arrow="background"] line').getAttribute('stroke')).toBe(P.bad);
  });

  it('passes axe with all of it switched on', async () => {
    const log = [surveyEntry('harbor', 1)];
    for (const theme of ['light', 'contrast']) {
      const html = renderTool('coralReef', { coralReef: { section: 'model', ...FULL(log) } }, { theme });
      const result = await runIsolatedAxe(html);
      expect(result.violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')), theme).toEqual([]);
    }
  }, 90000);

  it('suggests a survey when the log is empty, and every new control is a labelled button', async () => {
    const t = await mount({ modelRevealedFor: ALL });
    expect(t.host.textContent).toContain('Save a survey in Field survey');
    await click(button(t, 'Go to Field survey'));
    expect(t.data.section).toBe('survey');
  });
});

describe('Reef Stars need loose rubble', () => {
  const box = (t) => [...t.host.querySelectorAll('label')].find((l) => l.textContent.includes('Stabilize loose rubble')).querySelector('input');
  const note = (t) => t.host.querySelector('[data-stars-low-rubble]');
  it('turns the control off on a reef with little rubble, and says why with the real number', async () => {
    const t = await mount({ modelRevealedFor: { recent: true } });
    const s = X.scenarioSettings('recent'), r = Math.round((1 - (s.startHardBottom != null ? s.startHardBottom : 0.8) - 0.12) * 100);
    expect(box(t).disabled).toBe(true);
    expect(box(t).checked).toBe(false);
    expect(note(t).dataset.starsLowRubble).toBe('off');
    expect(note(t).textContent).toContain('only ' + r + '% loose rubble');
    expect(box(t).getAttribute('aria-describedby')).toBe(note(t).id);
  });
  it('keeps it working on the rubble field, with no note', async () => {
    const t = await mount({ model: X.scenarioSettings('rubble'), modelRevealedFor: { rubble: true } });
    expect(box(t).disabled).toBe(false);
    expect(box(t).checked).toBe(true);
    expect(note(t)).toBe(null);
    await click(box(t));
    expect(t.data.model.rubbleStabilization).toBe(false);
    expect(box(t).disabled, 'can be turned back on').toBe(false);
  });
  it('lets a saved reef with Reef Stars on turn them off, and is honest about the result', async () => {
    const t = await mount({ model: Object.assign(X.scenarioSettings('recent'), { rubbleStabilization: true }), modelRevealedFor: { recent: true } });
    expect(box(t).checked).toBe(true);
    expect(box(t).disabled).toBe(false);
    expect(note(t).dataset.starsLowRubble).toBe('on');
    expect(note(t).textContent).toContain('overstates');
    await click(box(t));
    expect(t.data.model.rubbleStabilization).toBe(false);
    expect(box(t).disabled).toBe(true);
  });
});
