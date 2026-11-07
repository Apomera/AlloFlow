import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import path from 'node:path';

// Lane jr11: bugs found by walking the whole tool as a student, in the seams between sections.
// Every test drives the real tool state through clicks, then reads the screen a student would see.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
let loadTool, resetStemLab, React, ReactDOMClient, X;
beforeAll(async () => {
  window.__RR_TEST_EXPORTS__ = window.__RR_TEST_EXPORTS__ || {};
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, React, ReactDOMClient } = mod);
  resetStemLab(); loadTool(TOOL, 'coralReef');
  X = window.__RR_TEST_EXPORTS__;
});
const mounted = [];
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); }
});
async function mount(seed = {}) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef, live = { state: null };
  function Shell() {
    const [toolData, setToolData] = React.useState({ coralReef: seed });
    live.state = toolData.coralReef;
    return cfg.render({ React, toolData, setToolData, t: (k, f) => f || k, announceToSR() {} });
  }
  mounted.push({ host, root });
  await React.act(async () => root.render(React.createElement(Shell)));
  return { host, live };
}
const wait = (ms) => new Promise((res) => setTimeout(res, ms));
async function press(el, detail) {
  el.focus();
  await React.act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: detail == null ? 1 : detail })); });
}
// a11yRefocus runs on a timer and retries; give it time to land.
async function settle() { await React.act(async () => { await wait(90); }); }
const byText = (host, text) => [...host.querySelectorAll('button')].find((b) => b.textContent.trim() === text);
const byLabel = (host, text) => [...host.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === text);
function surveyEntry(site, n, extra) {
  const cover = { hard_coral: 40, bleached_coral: 0, recently_dead_coral: 0, macroalgae: 10, rock: 20, rubble: 15, sand: 15 };
  return Object.assign({ id: site + ':' + n + ':', siteId: site, seed: n, transect: 1, modelYear: null, at: 1, agreement: 40, recorded: 40, cover, indicators: { liveCoral: 40, bleachedShare: 0, macroalgae: 10, coralToAlgae: 4 }, fish: { parrotfish: 3, surgeonfish: 2, butterflyfish: 1, grouper: 1, snapper: 1 } }, extra || {});
}

describe('keyboard focus stays on the page in Field survey', () => {
  it('Previous point at point 2 hands focus to Next point when it turns itself off', async () => {
    const { host, live } = await mount({ section: 'survey', surveyStage: 'points', pointIndex: 1 });
    const prev = byText(host, 'Previous point');
    await press(prev);
    await settle();
    expect(live.state.pointIndex).toBe(0);
    expect(prev.disabled).toBe(true);
    expect(document.activeElement.textContent).toBe('Next point');
  });
  it('Next point at point 39 hands focus to Previous point', async () => {
    const { host, live } = await mount({ section: 'survey', surveyStage: 'points', pointIndex: 38 });
    const next = byText(host, 'Next point');
    await press(next);
    await settle();
    expect(live.state.pointIndex).toBe(39);
    expect(document.activeElement.textContent).toBe('Previous point');
  });
  it('a fish count going down to 0 leaves focus on that count', async () => {
    const { host, live } = await mount({ section: 'survey', surveyStage: 'fish', fishCounts: { parrotfish: 1 } });
    await press(byLabel(host, 'One fewer Parrotfish'));
    await settle();
    expect(live.state.fishCounts.parrotfish).toBe(0);
    expect(document.activeElement.getAttribute('aria-label')).toBe('Parrotfish count');
  });
  it('an invertebrate count going down to 0 leaves focus on that count', async () => {
    const { host, live } = await mount({ section: 'survey', surveyStage: 'inverts', invCounts: { lobster: 1 } });
    await press(byLabel(host, 'One fewer Lobster'));
    await settle();
    expect(live.state.invCounts.lobster).toBe(0);
    expect(document.activeElement.getAttribute('aria-label')).toBe('Lobster count');
  });
  it('saving moves focus from the turned-off save button to the next step', async () => {
    const records = {}; for (let i = 0; i < 40; i++) records[i] = 'sand';
    const { host, live } = await mount({ section: 'survey', surveyStage: 'results', records });
    const save = host.querySelector('[data-survey-save]');
    await press(save);
    await settle();
    expect(live.state.surveyLog.length).toBe(1);
    expect(document.activeElement.textContent).toBe('Survey another transect at this reef');
  });
});

describe('keyboard focus stays on the page in Compare reefs', () => {
  const twoReefs = () => [surveyEntry('reserve', 1), surveyEntry('harbor', 2)];
  it('opening the clear prompt lands on the safe answer, and Keep them comes back', async () => {
    const { host, live } = await mount({ section: 'compare', surveyLog: twoReefs() });
    await press(byText(host, 'Clear the survey log'));
    await settle();
    expect(document.activeElement.textContent).toBe('Keep them');
    await press(byText(host, 'Keep them'));
    await settle();
    expect(document.activeElement.textContent).toBe('Clear the survey log');
    expect(live.state.surveyLog.length).toBe(2);
  });
  it('removing every survey lands on the way to start again', async () => {
    const { host, live } = await mount({ section: 'compare', surveyLog: twoReefs() });
    await press(byText(host, 'Clear the survey log'));
    await settle();
    await press(byText(host, 'Remove all surveys'));
    await settle();
    expect(live.state.surveyLog.length).toBe(0);
    expect(document.activeElement.textContent).toBe('Start a field survey');
  });
});

// A whole transect through the real buttons, so the log entry is the one the tool writes.
async function surveyAll(host, live) {
  const X2 = window.__RR_TEST_EXPORTS__.coralReef;
  const site = X2.siteById(live.state.surveySiteId || 'reserve') || X2.SITES[0];
  const seed = live.state.surveySeed != null ? live.state.surveySeed >>> 0 : site.seed;
  const cats = X2.buildTransect(site, seed).points.map((pt) => pt.category);
  const start = live.state.pointIndex | 0;
  for (let i = start; i < 40; i++) {
    const grp = host.querySelector('[role=group][aria-label^="Record point"]');
    await React.act(async () => { grp.querySelectorAll('button')[X2.CATEGORY_IDS.indexOf(cats[i])].dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 })); });
  }
}
async function toResults(host) { await React.act(async () => { byText(host, '4. Results').dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 })); }); }
async function click(el) { await React.act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 })); }); }

describe('saved work is not lost and Start does not loop', () => {
  it('coming back to a reef starts the next transect, and saving it keeps the finished one', async () => {
    const { host, live } = await mount({ section: 'survey' });
    await surveyAll(host, live);
    await toResults(host);
    await click(host.querySelector('[data-survey-save]'));
    expect(live.state.surveyLog.map((e) => e.recorded)).toEqual([40]);
    await click(host.querySelector('[data-sv9-site=harbor]'));
    expect(live.state.surveySiteId).toBe('harbor');
    await click(host.querySelector('[data-sv9-site=reserve]'));
    expect(live.state.surveyTransect).toBe(2);
    // Two points of the new transect, then save.
    const grp = () => host.querySelector('[role=group][aria-label^="Record point"]');
    await click(grp().querySelectorAll('button')[0]);
    await click(grp().querySelectorAll('button')[0]);
    await toResults(host);
    await click(host.querySelector('[data-survey-save]'));
    expect(live.state.surveyLog.map((e) => [e.siteId, e.transect, e.recorded])).toEqual([['reserve', 1, 40], ['reserve', 2, 2]]);
  });
  it('Survey another transect skips a number that is already saved', async () => {
    const { host, live } = await mount({ section: 'survey' });
    await surveyAll(host, live);
    await toResults(host);
    await click(host.querySelector('[data-survey-save]'));
    // The student is back on transect 1, and transect 2 is already in the log.
    const X2 = window.__RR_TEST_EXPORTS__.coralReefSurvey, site = window.__RR_TEST_EXPORTS__.coralReef.siteById('reserve');
    const second = Object.assign({}, live.state.surveyLog[0], { id: 'reserve:' + X2.transectSeed(site, 2) + ':', seed: X2.transectSeed(site, 2), transect: 2 });
    const again = await mount({ section: 'survey', surveyStage: 'results', records: live.state.records, fishCounts: {}, surveySaved: true, surveyLog: [live.state.surveyLog[0], second] });
    await click(byText(again.host, 'Survey another transect at this reef'));
    expect(again.live.state.surveyTransect).toBe(3);
  });
  it('pressing the same answer again on a saved transect does not trap Start on "not saved"', async () => {
    const { host, live } = await mount({ section: 'survey' });
    await surveyAll(host, live);
    await toResults(host);
    await click(host.querySelector('[data-survey-save]'));
    await click(byText(host, '1. Bottom points (40 of 40)'));
    await click(host.querySelectorAll('.crb-pt')[0]);
    const same = live.state.records[0], ids = window.__RR_TEST_EXPORTS__.coralReef.CATEGORY_IDS;
    await click(host.querySelector('[role=group][aria-label^="Record point"]').querySelectorAll('button')[ids.indexOf(same)]);
    expect(live.state.surveySaved).toBe(false);
    await click(byText(host, 'Start'));
    expect(host.querySelector('.w2-next').getAttribute('data-w2-why')).not.toBe('unsaved');
    // And the reef buttons do not warn about records that are in the log.
    await click(byText(host, 'Field survey'));
    await click(host.querySelector('[data-sv9-site=harbor]'));
    expect(!!host.querySelector('[role=alert]')).toBe(false);
    expect(live.state.surveySiteId).toBe('harbor');
  });
  it('a real change after saving still counts as not saved', async () => {
    const { host, live } = await mount({ section: 'survey' });
    await surveyAll(host, live);
    await toResults(host);
    await click(host.querySelector('[data-survey-save]'));
    await click(byText(host, '1. Bottom points (40 of 40)'));
    await click(host.querySelectorAll('.crb-pt')[0]);
    const ids = window.__RR_TEST_EXPORTS__.coralReef.CATEGORY_IDS, other = ids.filter((c) => c !== live.state.records[0])[0];
    await click(host.querySelector('[role=group][aria-label^="Record point"]').querySelectorAll('button')[ids.indexOf(other)]);
    await click(byText(host, 'Start'));
    expect(host.querySelector('.w2-next').getAttribute('data-w2-why')).toBe('unsaved');
  });
  it('Survey this reef in Reef future asks before clearing a survey in progress', async () => {
    const records = { 0: 'sand', 1: 'rock', 2: 'rock' };
    const { host, live } = await mount({ section: 'model', records, modelPredictions: { recent: { choice: 'lower' } }, modelRevealedFor: { recent: true }, modelRevealed: true });
    const go = host.querySelector('[data-jr11-survey-year]') || [...host.querySelectorAll('button')].find((b) => /^Survey this reef in year/.test(b.textContent));
    expect(!!go).toBe(true);
    await click(go);
    expect(live.state.section).toBe('model');
    expect(Object.keys(live.state.records).length).toBe(3);
    const ask = host.querySelector('[role=alert]');
    expect(!!ask && /not saved/.test(ask.textContent)).toBe(true);
    await click(byText(host, 'Stay here'));
    expect(!!host.querySelector('[role=alert]')).toBe(false);
    expect(Object.keys(live.state.records).length).toBe(3);
    await click(go);
    await click(byText(host, 'Switch and clear my records'));
    expect(live.state.section).toBe('survey');
    expect(live.state.surveySiteId).toBe('model');
  });
  it('surveying the same modeled year twice does not reopen the saved transect', async () => {
    const { host, live } = await mount({ section: 'model', modelPredictions: { recent: { choice: 'lower' } }, modelRevealedFor: { recent: true }, modelRevealed: true });
    const go = () => [...host.querySelectorAll('button')].find((b) => /^Survey this reef in year/.test(b.textContent));
    await click(go());
    await surveyAll(host, live);
    await toResults(host);
    await click(host.querySelector('[data-survey-save]'));
    await click(byText(host, 'Reef future'));
    await click(go());
    expect(live.state.surveyTransect).toBe(2);
    await toResults(host);
    expect(host.querySelector('[data-survey-save]').textContent).toBe('Save to my survey log');
  });
  it('the second click of a double-click does not fill the next point', async () => {
    const { host, live } = await mount({ section: 'survey' });
    const btn = () => host.querySelector('[role=group][aria-label^="Record point"]').querySelectorAll('button')[0];
    const first = btn();
    await React.act(async () => { first.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 })); });
    await React.act(async () => { first.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 2 })); });
    expect(Object.keys(live.state.records).length).toBe(1);
    // Keyboard presses report detail 0 and always count.
    await React.act(async () => { first.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 })); });
    expect(Object.keys(live.state.records).length).toBe(2);
    // A quick student on a run of one answer: the browser still says detail 2, but it is not a double-click.
    await React.act(async () => { await wait(380); });
    await React.act(async () => { first.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 2 })); });
    expect(Object.keys(live.state.records).length).toBe(3);
  });
  it('the description above the record buttons keeps a fixed slot, so the buttons stay under the thumb', async () => {
    // jsdom has no layout: this pins the rule, and journey/w3d.cjs measured the buttons in Chromium.
    const { host } = await mount({ section: 'survey' });
    const see = host.querySelector('[role=group][aria-label^="Record point"]').previousElementSibling;
    expect(see.className.includes('jr11-see')).toBe(true);
    const css = [...host.querySelectorAll('style')].map((s) => s.textContent).join('\n');
    expect(css.includes('.jr11-see{min-height:90px}')).toBe(true);
  });
  it('a transect with nothing in it cannot be saved, so empty saves cannot finish the step', async () => {
    const { host } = await mount({ section: 'survey', surveyStage: 'results' });
    expect(host.querySelector('[data-survey-save]').disabled).toBe(true);
    const one = await mount({ section: 'survey', surveyStage: 'results', records: { 0: 'sand' } });
    expect(one.host.querySelector('[data-survey-save]').disabled).toBe(false);
    const fishOnly = await mount({ section: 'survey', surveyStage: 'results', fishCounts: { parrotfish: 2 } });
    expect(fishOnly.host.querySelector('[data-survey-save]').disabled).toBe(false);
    // Pressing straight through the fish and invertebrate steps counts nothing either.
    const through = await mount({ section: 'survey', surveyStage: 'results', fishCounts: { parrotfish: 0 }, srvFishDone: true, srvInvDone: true });
    expect(through.host.querySelector('[data-survey-save]').disabled).toBe(true);
  });
});

describe('damaged saved logs', () => {
  const good = () => ({ id: 'reserve:1:', siteId: 'reserve', seed: 1, transect: 1, modelYear: null, at: 1, agreement: 30, recorded: 40, cover: { hard_coral: 40 }, indicators: { liveCoral: 40, bleachedShare: 0, macroalgae: 10 }, fish: { parrotfish: 2 } });
  for (const [name, bad] of [['null', null], ['empty object', {}], ['string', 'x'], ['no indicators', { id: 'a', siteId: 'reserve', fish: {} }], ['cover only', { id: 'b', siteId: 'harbor', cover: { hard_coral: 20 } }]]) {
    it('Compare and Results survive a log entry that is ' + name, async () => {
      const seen = [];
      for (const view of [{ section: 'compare' }, { section: 'survey', surveyStage: 'results' }, { section: 'hub' }, { section: 'report' }]) {
        const { host } = await mount(Object.assign({ surveyLog: [good(), bad] }, view));
        seen.push(host.querySelectorAll('[data-coralreef-root]').length);
      }
      expect(seen).toEqual([1, 1, 1, 1]);
    });
  }
  for (const [name, seed] of [
    ['a survey year that is text', { section: 'model', modelSurveyYear: 'x', modelRevealedFor: { recent: true }, modelRevealed: true }],
    ['a survey year with a fraction', { section: 'model', modelSurveyYear: 2.5, modelRevealedFor: { recent: true }, modelRevealed: true }],
    ['a modeled dive site with no health', { section: 'explore', diveSiteId: 'model', diveModelSite: {} }],
  ]) {
    it('survives ' + name, async () => {
      const { host } = await mount(seed);
      expect(host.querySelectorAll('[data-coralreef-root]').length).toBe(1);
    });
  }
  it('a healthy log reaches the sections as the same array', async () => {
    const log = [good()];
    const { host } = await mount({ section: 'compare', surveyLog: log });
    expect(host.querySelector('[data-sv-log]').querySelectorAll('li').length).toBe(1);
  });
});

describe('Compare says when fish were never counted', () => {
  const noFish = { parrotfish: 0, surgeonfish: 0, butterflyfish: 0, grouper: 0, snapper: 0 };
  it('a transect saved with no fish is called out, not shown as a measured zero alone', async () => {
    const { host } = await mount({ section: 'compare', surveyLog: [surveyEntry('reserve', 1, { fish: noFish }), surveyEntry('harbor', 2)] });
    const note = host.querySelector('[data-jr11-no-fish]');
    expect(!!note).toBe(true);
    expect(/no fish recorded: 1 of 2/.test(note.textContent)).toBe(true);
  });
  it('stays away when every transect has fish', async () => {
    const { host } = await mount({ section: 'compare', surveyLog: [surveyEntry('reserve', 1), surveyEntry('harbor', 2)] });
    expect(!!host.querySelector('[data-jr11-no-fish]')).toBe(false);
  });
});

describe('the path on Start tells the truth', () => {
  const two = () => [surveyEntry('reserve', 1), surveyEntry('harbor', 2)];
  it('checking a claim with no evidence does not finish the Compare step', async () => {
    const { host } = await mount({ section: 'hub', surveyLog: two(), srvClaim: { type: 'more_live', a: 'reserve', b: 'harbor', evidence: {}, checked: true, checks: 1 } });
    const step = host.querySelector('[data-w2-step=compare]');
    expect(step.getAttribute('data-state')).toBe('started');
    expect(host.querySelector('.w2-next').getAttribute('data-w2-next')).toBe('compare');
  });
  it('with evidence ticked the step is finished', async () => {
    const { host } = await mount({ section: 'hub', surveyLog: two(), srvClaim: { type: 'more_live', a: 'reserve', b: 'harbor', evidence: { live: true }, checked: true, checks: 1 } });
    expect(host.querySelector('[data-w2-step=compare]').getAttribute('data-state')).toBe('done');
  });
  it('Compare with one reef offers the way to a second survey, the step Start sent the student for', async () => {
    const { host, live } = await mount({ section: 'compare', surveyLog: [surveyEntry('reserve', 1)] });
    const go = byText(host, 'Start a field survey');
    expect(!!go).toBe(true);
    await press(go);
    expect(live.state.section).toBe('survey');
  });
});
