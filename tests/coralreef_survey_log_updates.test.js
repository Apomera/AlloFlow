import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient, renderTool } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let X;
const mounted = [];
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef;
});
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); }
});
async function mount(seed = {}) {
  let data = { coralReef: { section: 'survey', surveyStage: 'results', ...seed } }, update;
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  function Shell() {
    const [state, setState] = React.useState(data); data = state;
    update = patch => setState(previous => ({ ...previous, coralReef: { ...previous.coralReef, ...patch } }));
    return window.StemLab._registry.coralReef.render({ React, toolData: state, setToolData: setState, t: (k, f) => f || k, reduceMotion: true });
  }
  const t = { host, root, get data() { return data.coralReef; }, async update(patch) { await React.act(async () => update(patch)); } };
  mounted.push(t); await React.act(async () => root.render(React.createElement(Shell))); return t;
}
const button = (t, name) => [...t.host.querySelectorAll('button')].find(b => b.textContent.trim() === name);
const saveButton = t => t.host.querySelector('[data-survey-save]');
async function click(node) { expect(node).toBeTruthy(); await React.act(async () => { node.focus(); node.click(); }); }
const recordsOf = layout => Object.fromEntries(layout.points.map(p => [p.index, p.category]));
function entryFor(site, seed = site.seed) {
  const layout = X.buildTransect(site, seed), records = recordsOf(layout), score = X.scoreSurvey(layout, records, X.fishInBelt(layout));
  return { id: X.surveyEntryId(site, seed), siteId: site.id, seed, transect: 1, modelYear: site.modelYear ?? null,
    modelRun: site.modelRun || null, recorded: 40, agreement: 40, records, cover: score.cover, indicators: X.indicators(score.cover), fish: X.fishInBelt(layout) };
}

describe('saved reef survey corrections', () => {
  it('updates point and fish corrections in place and preserves other observations', async () => {
    const layout = X.buildTransect(X.SITES[0], X.SITES[0].seed), records = recordsOf(layout);
    const t = await mount({ records, fishCounts: X.fishInBelt(layout), speciesFieldNotes: { clownfish: 'My observation' } });
    await click(saveButton(t)); const id = t.data.surveyLog[0].id;
    expect(saveButton(t).disabled).toBe(true);
    await t.update({ surveyStage: 'points', pointIndex: 0, autoAdvance: false });
    const group = [...t.host.querySelectorAll('[role="group"]')].find(e => /^Record point/.test(e.getAttribute('aria-label') || ''));
    const other = [...group.querySelectorAll('button')].find(b => b.getAttribute('aria-pressed') !== 'true');
    await click(other); await click(button(t, 'Go to the fish count'));
    await click(t.host.querySelector('button[aria-label="One more Parrotfish"]'));
    await click(button(t, 'See my results'));
    expect(saveButton(t).textContent).toBe('Update saved survey'); expect(saveButton(t).disabled).toBe(false);
    await click(saveButton(t));
    expect(t.data.surveyLog).toHaveLength(1); expect(t.data.surveyLog[0].id).toBe(id);
    expect(t.data.surveyLog[0].agreement).toBe(39);
    expect(t.data.surveyLog[0].fish.parrotfish).toBe(X.fishInBelt(layout).parrotfish + 1);
    expect(t.data.surveyLog[0].records[0]).toBe(t.data.records[0]);
    expect(t.data.speciesFieldNotes.clownfish).toBe('My observation');
    expect(saveButton(t).disabled).toBe(true);
  });

  it('detects changed point records even when percentages and agreement stay the same', async () => {
    const layout = X.buildTransect(X.SITES[0], X.SITES[0].seed);
    const positions = layout.points.filter(p => p.category === layout.points[0].category).slice(0, 2).map(p => p.index);
    const wrong = X.CATEGORY_IDS.filter(id => id !== layout.points[0].category).slice(0, 2);
    const records = recordsOf(layout); positions.forEach((index, i) => { records[index] = wrong[i]; });
    const t = await mount({ records }); await click(saveButton(t));
    const changed = { ...records, [positions[0]]: wrong[1], [positions[1]]: wrong[0] };
    await t.update({ records: changed, surveySaved: false });
    expect(saveButton(t).disabled).toBe(false); await click(saveButton(t));
    expect(t.data.surveyLog).toHaveLength(1); expect(t.data.surveyLog[0].records).toEqual(changed);
  });

  it('allows corrections to older saved surveys and ignores out-of-range point keys', async () => {
    const old = entryFor(X.SITES[0]); delete old.records;
    const t = await mount({ records: { ...recordsOf(X.buildTransect(X.SITES[0], X.SITES[0].seed)), 40: 'sand', invalid: 'rock' }, fishCounts: old.fish, surveyLog: [old], surveySaved: false });
    expect(saveButton(t).textContent).toBe('Update saved survey'); await click(saveButton(t));
    expect(t.data.surveyLog[0].recorded).toBe(40); expect(Object.keys(t.data.surveyLog[0].records)).toHaveLength(40);
  });

  it('asks before discarding a fish-only survey when changing reefs', async () => {
    const t = await mount({ surveyStage: 'fish', fishCounts: { parrotfish: 2 } });
    const group = t.host.querySelector('[aria-label="Survey sites"]');
    await click(group.querySelectorAll('button')[1]);
    expect(t.host.querySelector('[role="alert"]')).toBeTruthy(); expect(t.data.fishCounts.parrotfish).toBe(2);
    await click(button(t, 'Stay here')); expect(t.data.fishCounts.parrotfish).toBe(2);
  });
});

describe('modeled survey provenance', () => {
  it('distinguishes scenarios, custom settings and weather while keeping repeated transects together', () => {
    const base = X.scenarioSettings('recent');
    const settings = [base, X.scenarioSettings('warmer'), { ...base, scenarioId: 'custom', nutrients: 'low' }, { ...base, scenarioId: 'custom', nutrients: 'high' }];
    const sites = settings.map(s => X.siteFromModelYear(X.runScenario(s, 11)[30], s, 371, 11));
    sites.push(X.siteFromModelYear(X.runScenario(base, 12)[30], base, 402, 12));
    const log = sites.map(s => entryFor(s)); log.push(entryFor(sites[0], 8290));
    const groups = X.summarizeLog(log); expect(groups).toHaveLength(5); expect(groups[0].entries).toHaveLength(2);
    expect(new Set(log.map(e => e.id)).size).toBe(6);
    expect(new Set(groups.map(g => X.surveyLogSiteName(g, (k, f) => f, (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k]), log))).size).toBe(5);
    const reordered = Object.fromEntries(Object.entries(base).reverse());
    expect(X.modelRunSnapshot(base, 11).id).toBe(X.modelRunSnapshot(reordered, 11).id);
    base.nutrients = 'high'; expect(sites[0].modelRun.settings.nutrients).toBe('medium');
  });

  it('keeps earlier model surveys separate with an explicit unknown-conditions label', () => {
    const settings = X.scenarioSettings('recent'), row = X.runScenario(settings, 11)[30];
    const legacySite = X.siteFromModelYear(row, settings, 371), knownSite = X.siteFromModelYear(row, settings, 371, 11);
    const log = [entryFor(legacySite), entryFor(legacySite, 8290), entryFor(knownSite)];
    expect(X.summarizeLog(log)).toHaveLength(3);
    const html = renderTool('coralReef', { coralReef: { section: 'compare', surveyLog: log } });
    expect(html).toContain('conditions not saved'); expect(html).toContain('Recent pattern, run 1 (year 30)');
  });

  it('captures the run through the real model-to-survey action without overwriting an earlier scenario', async () => {
    const t = await mount({ section: 'model', model: X.scenarioSettings('recent'), modelSurveyYear: 30, modelSeed: 11, modelRevealedFor: { recent: true, warmer: true } });
    await click(button(t, 'Survey this reef in year 30')); expect(t.data.modelSite.modelRun.seed).toBe(11);
    await t.update({ surveyStage: 'results' }); await click(saveButton(t));
    await t.update({ section: 'model', model: X.scenarioSettings('warmer') });
    await click(button(t, 'Survey this reef in year 30')); await t.update({ surveyStage: 'results' });
    expect(saveButton(t).disabled).toBe(false); await click(saveButton(t));
    expect(t.data.surveyLog).toHaveLength(2);
    expect(t.data.surveyLog.map(e => e.modelRun.scenarioId)).toEqual(['recent', 'warmer']);
    await t.update({ section: 'compare' }); expect(t.host.textContent).toContain('Recent pattern, run 1'); expect(t.host.textContent).toContain('Faster warming, run 2');
  });
});
