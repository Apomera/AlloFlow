import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, renderTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
import { runIsolatedAxe } from './helpers/isolated_axe_harness.js';

// Lane srv: the Results and Compare views. No answer before the attempt,
// spread and effort figures drawn from the computed numbers, the claim
// builder's feedback, the labelled example that never enters the data, and
// old saved logs that still load.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
let X, S;
const mounted = [];
beforeEach(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef'); X = window.__RR_TEST_EXPORTS__.coralReef; S = window.__RR_TEST_EXPORTS__.coralReefSurvey; });
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); }
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});
const parse = (html) => new DOMParser().parseFromString('<!doctype html><body>' + html + '</body>', 'text/html');
const render = (data, theme) => parse(renderTool('coralReef', { coralReef: data }, theme ? { theme } : undefined));
async function mount(seed) {
  let data = { coralReef: Object.assign({ speciesFieldNotes: { clownfish: 'Keep this note' } }, seed) };
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host);
  function Shell() { const [state, setState] = React.useState(data); data = state; return window.StemLab._registry.coralReef.render({ React, toolData: state, setToolData: setState, t: (k, f) => f || k, reduceMotion: true }); }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell))); return t;
}
const q = (t, s) => t.host.querySelector(s);
const button = (t, text) => [...t.host.querySelectorAll('button')].find((b) => b.textContent.trim() === text);
async function click(el) { expect(el, 'control exists').toBeTruthy(); await React.act(async () => { el.focus(); el.click(); }); }
async function toggle(el) { expect(el, 'input exists').toBeTruthy(); await React.act(async () => { el.click(); }); }

function transect(siteId, n) { const site = X.siteById(siteId); return X.buildTransect(site, S.transectSeed(site, n)); }
function entry(siteId, n) {
  const site = X.siteById(siteId), L = transect(siteId, n), records = {};
  L.points.forEach((p, i) => { records[i] = p.category; });
  const score = X.scoreSurvey(L, records, X.fishInBelt(L)), fish = {};
  score.fish.forEach((f) => { fish[f.family] = f.density; });
  return { id: X.surveyEntryId(site, L.seed), siteId, seed: L.seed, transect: n, modelYear: null, at: 1, agreement: 40, recorded: 40, records, cover: score.cover, indicators: X.indicators(score.cover), fish, modelRun: null };
}
const recordsOf = (L, upTo = 40) => Object.fromEntries(L.points.slice(0, upTo).map((p) => [p.index, p.category]));
const fullLog = () => [entry('reserve', 1), entry('reserve', 2), entry('reserve', 3), entry('harbor', 1), entry('harbor', 2), entry('heatwave', 1)];

describe('no answers before the attempt', () => {
  it('hides the reef key, its cover and the whole-reef value until all 40 points are recorded', () => {
    const L = transect('reserve', 1);
    for (const upTo of [0, 1, 39]) {
      const doc = render({ section: 'survey', surveySiteId: 'reserve', records: recordsOf(L, upTo), fishCounts: X.fishInBelt(L), surveyStage: 'results' });
      const text = doc.body.textContent;
      expect(doc.querySelector('[data-strip="key"]'), upTo + ': key row').toBeNull();
      expect(doc.querySelector('.crb-bar[data-bar="key"]'), upTo + ': key bar').toBeNull();
      expect(doc.querySelector('[data-srv-key-hidden]'), upTo).toBeTruthy();
      expect(text.includes('the reef key says'), upTo).toBe(false);
      expect(text.includes('in the reef key'), upTo).toBe(false);
      expect([...doc.querySelectorAll('th')].some((th) => th.textContent === 'Reef key' || th.textContent === 'In the belt'), upTo).toBe(false);
      expect(doc.querySelector('[data-srv-effort]'), upTo + ': no whole-reef value').toBeNull();
      // Only the learner's own codes appear; every unrecorded cell is a "?" button.
      const cells = [...doc.querySelectorAll('[data-strip="yours"]')];
      expect(cells).toHaveLength(40);
      cells.forEach((c, i) => expect(c.textContent).toBe(i < upTo ? ({ hard_coral: 'HC', bleached_coral: 'BL', recently_dead_coral: 'RKC', macroalgae: 'NIA', rock: 'RC', rubble: 'RB', sand: 'SD' })[L.points[i].category] : '?'));
      [...doc.querySelectorAll('[data-transect-strip] button')].forEach((b) => expect(b.getAttribute('aria-label')).toMatch(/not recorded yet/));
    }
    const done = render({ section: 'survey', surveySiteId: 'reserve', records: recordsOf(L), fishCounts: X.fishInBelt(L), surveyStage: 'results' });
    expect(done.querySelectorAll('[data-strip="key"]')).toHaveLength(40);
    expect(done.querySelector('.crb-bar[data-bar="key"]')).toBeTruthy();
    expect(done.querySelector('[data-srv-effort]')).toBeTruthy();
  });

  it('shows the belt check only after the fish are counted', async () => {
    const L = transect('reserve', 1);
    const t = await mount({ section: 'survey', surveySiteId: 'reserve', records: recordsOf(L), surveyStage: 'results' });
    expect(t.host.textContent.includes('In the belt')).toBe(false); expect(q(t, '[data-srv-fish-hidden]')).toBeTruthy();
    await click(button(t, '2. Fish in the belt')); await click(button(t, 'See my results'));
    expect(t.data.srvFishDone).toBe(true);
    expect([...t.host.querySelectorAll('th')].some((th) => th.textContent === 'In the belt')).toBe(true);
    // A fresh transect starts with the check hidden again.
    await click(button(t, 'Survey another transect at this reef'));
    expect(t.data.srvFishDone).toBe(false);
  });

  it('sends a learner from the hidden key to the next point to record', async () => {
    const L = transect('reserve', 1);
    const t = await mount({ section: 'survey', surveySiteId: 'reserve', records: recordsOf(L, 5), surveyStage: 'results' });
    await click(button(t, 'Go to this point'));
    expect(t.data.surveyStage).toBe('points'); expect(t.data.pointIndex).toBe(5);
    expect(document.activeElement).toBe(q(t, '#cr-point-title'));
  });
});

describe('repeat transects in Results', () => {
  it('draws one dot per saved transect at this reef with its mean and range', () => {
    const log = fullLog(), L = transect('reserve', 1);
    const doc = render({ section: 'survey', surveySiteId: 'reserve', surveySeed: L.seed, records: recordsOf(L), fishCounts: X.fishInBelt(L), surveyStage: 'results', srvFishDone: true, surveyLog: log, surveySaved: true });
    const panel = doc.querySelector('[data-srv-repeat]');
    expect(panel.getAttribute('data-srv-repeat')).toBe('3');
    const reserve = log.filter((e) => e.siteId === 'reserve'), st = S.groupStats(reserve);
    for (const [id, metric] of [['live', 'live'], ['algae', 'algae'], ['grazers', 'grazers']]) {
      const row = panel.querySelector('[data-srv-row="' + id + '"]');
      const dots = [...row.querySelectorAll('[data-srv-dot]')].map((d) => +d.getAttribute('data-srv-dot'));
      expect(dots.sort((a, b) => a - b)).toEqual(reserve.map((e) => S.entryValue(e, metric)).sort((a, b) => a - b));
      if (st[metric].spread > 0) expect(row.querySelector('[data-srv-band]').getAttribute('data-srv-band')).toBe(st[metric].min + ':' + st[metric].max);
      expect(+row.querySelector('[data-srv-mean]').getAttribute('data-srv-mean')).toBe(st[metric].mean);
      expect(row.textContent).toContain('3 transects');
    }
    // The saved current transect is ringed; the panel cites Reef Check.
    expect(panel.querySelectorAll('.srv-own').length).toBeGreaterThan(0);
    expect(panel.innerHTML).toContain('reefcheck.org');
  });

  it('invites a second transect when the reef has fewer than two saved', () => {
    const L = transect('harbor', 1);
    const doc = render({ section: 'survey', surveySiteId: 'harbor', records: recordsOf(L), surveyStage: 'results' });
    const panel = doc.querySelector('[data-srv-repeat]');
    expect(panel.getAttribute('data-srv-repeat')).toBe('0'); expect(panel.querySelector('[data-srv-row]')).toBeNull();
    expect(panel.textContent).toContain('Save this one');
  });
});

describe('how many points are enough', () => {
  it('shows the numbers srvEffort computes, and switches indicator with a pressed-state toggle', async () => {
    const site = X.siteById('reserve'), L = transect('reserve', 1);
    const t = await mount({ section: 'survey', surveySiteId: 'reserve', records: recordsOf(L), surveyStage: 'results' });
    for (const metric of ['live', 'algae']) {
      if (metric === 'algae') await click(button(t, 'Seaweed'));
      const card = q(t, '[data-srv-effort]'); expect(card.getAttribute('data-srv-effort')).toBe(metric);
      const res = S.effort(site, L, metric, 1);
      for (const r of res.rows) {
        const row = card.querySelector('[data-srv-row="' + r.id + '"]');
        expect(row.textContent).toContain(r.own + '%'); expect(row.textContent).toContain('typically off by ' + r.typicalMiss);
        expect(row.querySelectorAll('[data-srv-sim]')).toHaveLength(S.SIMS);
        expect(+row.querySelector('[data-srv-truth]').getAttribute('data-srv-truth')).toBe(res.truth);
      }
      expect(card.textContent).toContain('whole-reef value: ' + res.truth + '%');
      const group = card.querySelector('[role="group"]');
      expect([...group.querySelectorAll('button')].map((b) => b.getAttribute('aria-pressed'))).toEqual(metric === 'live' ? ['true', 'false'] : ['false', 'true']);
      expect(card.querySelector('[data-srv-effort-summary]').getAttribute('aria-live')).toBe('polite');
    }
    expect(t.data.srvEffortMetric).toBe('algae');
    expect(document.activeElement).toBe(button(t, 'Seaweed'));
  });
});

describe('Compare: spread, overlap and the empty states', () => {
  it('draws every transect per reef and says when two reefs overlap', async () => {
    const log = [entry('reserve', 1), entry('reserve', 2), entry('restored', 1), entry('restored', 2)];
    const t = await mount({ section: 'compare', surveyLog: log });
    const card = q(t, '[data-srv-spread]'), groups = X.summarizeLog(log);
    for (const g of groups) {
      const row = card.querySelector('[data-srv-row="' + g.key + '"]');
      expect([...row.querySelectorAll('[data-srv-dot]')].map((d) => +d.getAttribute('data-srv-dot'))).toEqual(g.entries.map((e) => e.indicators.liveCoral));
    }
    const a = S.groupStats(groups[0].entries).live, b = S.groupStats(groups[1].entries).live;
    const want = S.compareStats(a, b).certainty;
    expect(card.querySelector('[data-srv-certainty]').getAttribute('data-srv-certainty')).toBe(want);
    if (want === 'overlap') expect(card.textContent).toContain('not clearly different yet');
    expect(card.querySelector('[data-srv-overlap]').getAttribute('aria-live')).toBe('polite');
    await click(button(t, 'Grazing fish')); expect(t.data.srvSpreadMetric).toBe('grazers');
    expect(q(t, '[data-srv-spread]').getAttribute('data-srv-spread')).toBe('grazers');
  });

  it('shows a labelled example and the steps when nothing or one reef is saved, and never writes it to the data', async () => {
    const empty = await mount({ section: 'compare' });
    const ex = q(empty, '[data-srv-example]');
    expect(ex.textContent).toContain('Example, not your data');
    expect(empty.host.textContent).toContain('No surveys saved yet');
    expect(q(empty, '[data-survey-export] button')).toBeNull();
    expect([...empty.host.querySelectorAll('[data-srv-step]')].map((s) => s.getAttribute('data-done'))).toEqual(['false', 'false', 'false', 'false']);
    expect(empty.data.surveyLog).toBeUndefined();
    // The example rows are the example reefs, not survey sites.
    expect([...ex.querySelectorAll('[data-reef]')].map((r) => r.getAttribute('data-reef'))).toEqual(['srv_example_a', 'srv_example_b']);

    const one = entry('reserve', 1);
    const createURL = vi.fn(() => 'blob:x'), blobs = [];
    const NativeURL = window.URL;
    vi.stubGlobal('URL', class extends NativeURL { static createObjectURL = (b) => { blobs.push(b); return createURL(); }; static revokeObjectURL = () => {}; });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const t = await mount({ section: 'compare', surveyLog: [one] });
    expect(q(t, '[data-srv-example]')).toBeTruthy();
    expect([...t.host.querySelectorAll('[data-srv-step]')].map((s) => s.getAttribute('data-done'))).toEqual(['true', 'false', 'false', 'false']);
    await click(q(t, '[data-survey-export] button'));
    expect(t.data.surveyLog).toEqual([one]);
    const csv = await new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsText(blobs[0]); });
    expect(csv.includes('srv_example') || csv.includes('Example reef')).toBe(false);
    expect(csv.trim().split('\r\n')).toHaveLength(2);
    expect(csv.replace(/^\uFEFF/, '')).toBe(X.surveyLogCsv([one], (e) => X.surveyLogSiteName(e, (k, f) => f, (s, v) => s.replace(/\{(\w+)\}/g, (m, k) => v[k]), [one])).replace(/^\uFEFF/, ''));
  });

  it('still loads an old saved log with missing fields', () => {
    const old = entry('reserve', 1); delete old.records; delete old.at; delete old.modelRun; delete old.fish.snapper;
    const old2 = entry('harbor', 1); delete old2.indicators.coralToAlgae; delete old2.transect;
    const doc = render({ section: 'compare', surveyLog: [old, old2] });
    expect(doc.querySelector('[data-compare-chart]')).toBeTruthy();
    expect(doc.querySelectorAll('[data-srv-spread] [data-srv-row]')).toHaveLength(2);
    expect(doc.querySelector('[data-srv-claim]')).toBeTruthy();
    expect(X.surveyLogCsv([old, old2]).split('\r\n')[0]).toBe(X.surveyLogCsv([]).split('\r\n')[0]);
  });
});

describe('claim, evidence and reasoning', () => {
  it('checks the chosen evidence against the saved numbers and announces the feedback politely', async () => {
    const t = await mount({ section: 'compare', surveyLog: fullLog() });
    const card = q(t, '[data-srv-claim]');
    const radios = [...card.querySelectorAll('input[type="radio"]')];
    expect(radios).toHaveLength(S.CLAIM_IDS.length);
    await toggle(radios[0]); // Reef A has more live coral than reef B.
    expect(t.data.srvClaim.type).toBe('more_live');
    const selects = [...q(t, '[data-srv-claim]').querySelectorAll('select')];
    expect(selects.map((s) => s.labels[0].textContent.startsWith('Reef'))).toEqual([true, true]);
    const boxes = () => [...q(t, '[data-srv-claim]').querySelectorAll('input[type="checkbox"]')];
    await toggle(boxes()[0]); // live coral
    const status = q(t, '[data-srv-claim] [role="status"]');
    expect(status.getAttribute('aria-live')).toBe('polite'); expect(status.textContent).toBe('');
    await click(button(t, 'Check my evidence'));
    const groups = X.summarizeLog(t.data.surveyLog), want = S.checkClaim(groups, { type: 'more_live', a: groups[0].key, b: groups[1].key, evidence: { live: true } });
    expect(q(t, '[data-srv-feedback]').getAttribute('data-srv-feedback')).toBe(want.status);
    expect(q(t, '[data-srv-verdict]').getAttribute('data-srv-verdict')).toBe('supports');
    const st = S.groupStats(groups[0].entries).live;
    expect(q(t, '[data-srv-claim] [role="status"]').textContent).toContain(st.mean + '%');
    expect(q(t, '[data-srv-reasoning]').getAttribute('data-srv-reasoning')).toBe('empty');
    // Changing the evidence asks for a fresh check; reasoning does not.
    await toggle(boxes()[5]);
    expect(t.data.srvClaim.checked).toBe(false); expect(q(t, '[data-srv-verdict]')).toBeNull();
    await click(button(t, 'Check my evidence'));
    const area = q(t, '[data-srv-claim] textarea');
    await React.act(async () => { const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; set.call(area, 'Grazing fish eat the seaweed, so more of them leaves space for coral to grow.'); area.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(t.data.srvClaim.checked).toBe(true);
    expect(q(t, '[data-srv-reasoning]').getAttribute('data-srv-reasoning')).toBe('written');
    expect(t.data.surveyLog).toHaveLength(6); expect(t.data.speciesFieldNotes.clownfish).toBe('Keep this note');
  });

  it('lists every reef for a pattern claim and stays kind when the data disagree', () => {
    const groups = X.summarizeLog(fullLog());
    const doc = render({ section: 'compare', surveyLog: fullLog(), srvClaim: { type: 'grazers_algae', evidence: { grazers: true, algae: true }, checked: true } });
    const res = S.checkClaim(groups, { type: 'grazers_algae', evidence: { grazers: true, algae: true } });
    expect(doc.querySelector('[data-srv-feedback]').getAttribute('data-srv-feedback')).toBe(res.status);
    expect(doc.querySelectorAll('[data-srv-link-rows] li')).toHaveLength(groups.length);
    const against = render({ section: 'compare', surveyLog: fullLog(), srvClaim: { type: 'more_live', a: 'harbor', b: 'reserve', evidence: { live: true }, checked: true } });
    expect(against.querySelector('[data-srv-feedback]').getAttribute('data-srv-feedback')).toBe('contradicted');
    expect(against.querySelector('[data-srv-summary]').textContent).toMatch(/real finding/);
  });
});

describe('three themes', () => {
  const views = () => [
    ['compare empty', { section: 'compare' }],
    ['compare one', { section: 'compare', surveyLog: [entry('reserve', 1)] }],
    ['compare full', { section: 'compare', surveyLog: fullLog(), srvClaim: { type: 'healthier', a: 'reserve', b: 'harbor', evidence: { live: true, algae: true, spread: true }, checked: true } }],
    ['results done', { section: 'survey', surveySiteId: 'reserve', records: recordsOf(transect('reserve', 1)), surveyStage: 'results', surveyLog: fullLog(), surveySaved: true, srvFishDone: true }],
    ['results partial', { section: 'survey', surveySiteId: 'reserve', records: { 0: 'sand' }, surveyStage: 'results' }]
  ];
  it.each(['light', 'dark', 'contrast'])('render in %s and pass axe', async (theme) => {
    for (const [name, data] of views()) {
      const html = renderTool('coralReef', { coralReef: data }, { theme });
      expect(html.length, name).toBeGreaterThan(1000);
      const result = await runIsolatedAxe(html);
      expect(result.violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')), theme + ' ' + name).toEqual([]);
    }
  }, 120000);
});
