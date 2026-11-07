import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, renderTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
import { runIsolatedAxe } from './helpers/isolated_axe_harness.js';

// Lane srvinv: the "Invertebrates in the belt" survey step. Reef Check swims
// the fish belt a second time for nine Indo-Pacific indicator invertebrates
// (Hodgson et al. 2006, revised 2016, belt transect form p. 79). The belt
// truth comes from its own seeded stream, so the bottom points and the fish
// of every existing transect are unchanged; the truth stays hidden until the
// attempt; old saved surveys without invertebrates read "not counted".

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const INV = ['banded_coral_shrimp', 'diadema_urchin', 'crown_of_thorns', 'triton', 'lobster', 'pencil_urchin', 'collector_urchin', 'sea_cucumber', 'giant_clam'];
let X, S, I, downloads;
const mounted = [];
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef; S = window.__RR_TEST_EXPORTS__.coralReefSurvey; I = window.__RR_TEST_EXPORTS__.coralReefInverts;
});
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
async function type(el, value) {
  expect(el, 'input exists').toBeTruthy();
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  await React.act(async () => { setter.call(el, String(value)); el.dispatchEvent(new Event('input', { bubbles: true })); });
}
const site = (id) => X.siteById(id);
const transect = (id, n) => X.buildTransect(site(id), S.transectSeed(site(id), n));
const inverts = (id, n) => I.buildInverts(site(id), S.transectSeed(site(id), n));
const recordsOf = (L, upTo = 40) => Object.fromEntries(L.points.slice(0, upTo).map((p) => [p.index, p.category]));
// A saved entry the way Results saves one; withInv adds a perfect invertebrate count.
function entry(id, n, withInv) {
  const L = transect(id, n), records = recordsOf(L), score = X.scoreSurvey(L, records, X.fishInBelt(L)), fish = {};
  score.fish.forEach((f) => { fish[f.family] = f.density; });
  const e = { id: X.surveyEntryId(site(id), L.seed), siteId: id, seed: L.seed, transect: n, modelYear: null, at: 1, agreement: 40, recorded: 40, records, cover: score.cover, indicators: X.indicators(score.cover), fish, modelRun: null };
  if (withInv) e.inverts = I.invEntryFromCounts(I.invertsInBelt(inverts(id, n)));
  return e;
}
function csvRows(csv) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = csv.charCodeAt(0) === 0xFEFF ? 1 : 0; i < csv.length; i++) {
    const ch = csv[i];
    if (ch === '"') { if (quoted && csv[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (!quoted && ch === ',') { row.push(cell); cell = ''; }
    else if (!quoted && (ch === '\r' || ch === '\n')) { if (ch === '\r' && csv[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  return rows;
}
function csvObjects(csv) { const [headers, ...rows] = csvRows(csv); return rows.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]]))); }

describe('the protocol', () => {
  it('counts the nine Indo-Pacific belt-form indicators, mapped to guide entries where one exists', () => {
    expect(I.INV_IDS).toEqual(INV);
    const meta = new Set(X.SPECIES_META.map((m) => m.id));
    expect(I.INV_GUIDE).toEqual({ banded_coral_shrimp: 'banded_coral_shrimp', diadema_urchin: 'long_spined_urchin', crown_of_thorns: 'crown_of_thorns', triton: 'giant_triton',
      lobster: null, pencil_urchin: null, collector_urchin: null, sea_cucumber: 'sea_cucumber', giant_clam: 'giant_clam' });
    for (const [id, guide] of Object.entries(I.INV_GUIDE)) if (guide) expect(meta.has(guide), id).toBe(true);
    // Drupella is recorded as coral damage, not counted, so it is not an indicator here.
    expect(I.INV_IDS).not.toContain('drupella_snail');
    const sources = S.sources().map((s) => s.id);
    expect(sources).toContain('rc_inverts'); expect(sources).toContain('rcm_2025');
  });
  it('generates the belt deterministically from its own stream, every animal clearly in or out', () => {
    for (const id of ['reserve', 'harbor', 'heatwave', 'rubble', 'restored']) {
      for (const n of [1, 2, 3]) {
        const a = inverts(id, n), b = inverts(id, n);
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
        for (const an of a.animals) {
          expect(INV).toContain(an.kind);
          const off = Math.abs(an.offsetM);
          if (an.inBelt) expect(off).toBeLessThanOrEqual(2.0); else { expect(off).toBeGreaterThanOrEqual(3.1); expect(off).toBeLessThanOrEqual(4.5); }
          expect(an.alongM).toBeGreaterThanOrEqual(0.8); expect(an.alongM).toBeLessThanOrEqual(19.2);
          expect(an.hidden).toBe(an.kind === 'lobster' || an.kind === 'banded_coral_shrimp');
        }
        const truth = I.invertsInBelt(a);
        expect(Object.keys(truth)).toEqual(INV);
        expect(Object.values(truth).reduce((s, v) => s + v, 0)).toBe(a.animals.filter((x) => x.inBelt).length);
      }
    }
    expect(JSON.stringify(inverts('reserve', 1))).not.toBe(JSON.stringify(inverts('reserve', 2)));
  });
  it('averages the stated teaching rules over many belts: collected animals fewer where fishing is heavy, long-spined urchins more', () => {
    const mean = (id, kind) => { let s = 0; for (let k = 0; k < 200; k++) s += I.invertsInBelt(I.buildInverts(site(id), 1000 + k * 7))[kind]; return s / 200; };
    const m = I.invMeans(site('reserve')), h = I.invMeans(site('harbor'));
    for (const kind of ['banded_coral_shrimp', 'triton', 'lobster', 'pencil_urchin', 'collector_urchin', 'sea_cucumber', 'giant_clam']) expect(m[kind], kind).toBeGreaterThan(h[kind]);
    expect(h.diadema_urchin).toBeGreaterThan(m.diadema_urchin);
    expect(m.crown_of_thorns).toBe(h.crown_of_thorns);
    expect(Math.abs(mean('reserve', 'sea_cucumber') - m.sea_cucumber)).toBeLessThan(0.35);
    expect(Math.abs(mean('harbor', 'diadema_urchin') - h.diadema_urchin)).toBeLessThan(0.6);
    // A modeled reef has fish and cover, so it gets a belt too.
    const model = X.siteFromModelYear({ year: 5, coral: 0.3, bleached: 0, killed: 0, algae: 0.1 }, X.scenarioSettings('recent'), 77, 77);
    expect(I.buildInverts(model, 77).animals.length).toBeGreaterThan(0);
  });
  it('leaves every existing bottom-point and fish layout byte-identical', () => {
    const parts = [];
    for (const s of X.SITES.concat(S.EXAMPLE_SITES)) {
      for (let n = 1; n <= 6; n++) parts.push(JSON.stringify(X.buildTransect(s, S.transectSeed(s, n))));
      for (let k = 0; k < 3; k++) for (let j = 0; j < 4; j++) parts.push(JSON.stringify(X.buildTransect(s, S.simSeed(s, k, j))));
    }
    parts.push(JSON.stringify(S.exampleLog()));
    const L = transect('heatwave', 2); parts.push(JSON.stringify(X.scoreSurvey(L, recordsOf(L, 33), { parrotfish: 2, grouper: 9 })));
    // Digest of the same outputs computed from the round-4 base file before this lane.
    expect(createHash('sha256').update(parts.join('\n')).digest('hex')).toBe('9ed1656e69fa19eec582bb1743c336f94db9542421165796f2db3fce57f6a663');
  });
});

describe('the counting step', () => {
  it('sits between the fish and the results in the survey steps', async () => {
    const t = await mount({ section: 'survey', surveySiteId: 'reserve' });
    const steps = [...q(t, '[role="group"][aria-label="Survey steps"]').querySelectorAll('button')].map((b) => b.textContent);
    expect(steps).toEqual(['1. Bottom points (0 of 40)', '2. Fish in the belt', '3. Invertebrates in the belt', '4. Results']);
    await click(button(t, '2. Fish in the belt')); await click(button(t, 'Next: count the invertebrates'));
    expect(t.data.surveyStage).toBe('inverts'); expect(t.data.srvFishDone).toBe(true);
    expect(document.activeElement).toBe(q(t, '[data-survey-stage-title="inverts"]'));
  });
  it('has an accessible number input, buttons and a tally for every indicator', async () => {
    const t = await mount({ section: 'survey', surveySiteId: 'reserve', surveyStage: 'inverts' });
    const rows = [...t.host.querySelectorAll('[data-inv-count]')];
    expect(rows.map((r) => r.dataset.invCount)).toEqual(INV);
    const names = rows.map((r) => r.querySelector('.cr-survey-count-name').textContent);
    expect(names).toContain('Long-spined urchin'); expect(names).toContain('Crown-of-thorns starfish');
    for (const r of rows) {
      const input = r.querySelector('input[type="number"]'), name = r.querySelector('.cr-survey-count-name').textContent;
      expect(input.getAttribute('aria-label')).toBe(name + ' count');
      expect(input.min).toBe('0'); expect(input.max).toBe('99');
      expect(r.querySelector('button[aria-label="One more ' + name + '"]')).toBeTruthy();
      expect(r.querySelector('.sv-tally').getAttribute('aria-hidden')).toBe('true');
      expect(r.querySelector('svg[data-inv-chip]').getAttribute('aria-hidden')).toBe('true');
    }
    await click(rows[1].querySelector('button[aria-label="One more Long-spined urchin"]'));
    await click(rows[1].querySelector('button[aria-label="One more Long-spined urchin"]'));
    await type(rows[6].querySelector('input'), 3);
    expect(t.data.invCounts).toEqual({ diadema_urchin: 2, collector_urchin: 3 });
    const run = q(t, '[data-inv-count="diadema_urchin"] svg[data-inv-run]');
    expect(run.getAttribute('data-filled')).toBe('2');
    expect(q(t, '[data-inv-count="giant_clam"] svg[data-inv-run]')).toBeNull();
    // The truth is not on this page: no "In the belt" column, and the map is a labelled image.
    expect([...t.host.querySelectorAll('th')].some((th) => th.textContent === 'In the belt')).toBe(false);
    expect(q(t, 'svg[data-inv-map]').getAttribute('role')).toBe('img');
    expect(q(t, '[data-inv-drupella]').textContent).toMatch(/Drupella/);
  });
  it('draws every animal on the map and lists the same animals in words', () => {
    const L = transect('reserve', 1), inv = inverts('reserve', 1);
    const map = render({ section: 'survey', surveySiteId: 'reserve', surveyStage: 'inverts' });
    expect(map.querySelectorAll('svg[data-inv-map] [data-inv]')).toHaveLength(inv.animals.length);
    expect(map.querySelectorAll('svg[data-inv-map] [data-fish]')).toHaveLength(0);
    const list = render({ section: 'survey', surveySiteId: 'reserve', surveyStage: 'inverts', invView: 'list' });
    const rows = [...list.querySelectorAll('[data-inv-list] tbody tr')];
    expect(rows.map((r) => r.dataset.invRow)).toEqual(inv.animals.map((a) => a.kind));
    rows.forEach((r, i) => expect(r.textContent).toContain(inv.animals[i].hidden ? 'In a crack' : 'In the open'));
    expect(L.seed).toBe(inv.seed);
  });
});

describe('results and the answer key', () => {
  it('hides the belt totals until all 40 points are recorded and the invertebrates are counted', async () => {
    const L = transect('reserve', 1), truth = I.invertsInBelt(inverts('reserve', 1));
    const notYet = render({ section: 'survey', surveySiteId: 'reserve', records: recordsOf(L), fishCounts: X.fishInBelt(L), srvFishDone: true, surveyStage: 'results' });
    expect(notYet.querySelector('[data-inv-results]').dataset.invResults).toBe('not-counted');
    expect(notYet.querySelector('[data-inv-results]').textContent).toMatch(/Not counted yet/);
    const partial = render({ section: 'survey', surveySiteId: 'reserve', records: recordsOf(L, 39), invCounts: truth, srvInvDone: true, surveyStage: 'results' });
    const card = partial.querySelector('[data-inv-results]');
    expect(card.dataset.invResults).toBe('counted'); expect(card.querySelector('[data-srv-inv-hidden]')).toBeTruthy();
    expect([...card.querySelectorAll('th')].some((th) => th.textContent === 'In the belt')).toBe(false);
    expect(card.querySelector('[data-in-belt]')).toBeNull();
    const t = await mount({ section: 'survey', surveySiteId: 'reserve', records: recordsOf(L), surveyStage: 'results' });
    await click(button(t, 'Count the invertebrates')); expect(t.data.surveyStage).toBe('inverts');
    await click(q(t, '[data-inv-done]')); expect(t.data.srvInvDone).toBe(true); expect(t.data.surveyStage).toBe('results');
    const done = q(t, '[data-inv-results]');
    expect(done.dataset.invResults).toBe('checked');
    expect([...done.querySelectorAll('th')].some((th) => th.textContent === 'In the belt')).toBe(true);
    for (const id of INV) {
      const row = done.querySelector('[data-inv-result="' + id + '"]');
      expect(row.querySelectorAll('td')[0].textContent).toBe('0'); expect(row.querySelectorAll('td')[1].textContent).toBe(String(truth[id]));
      expect(done.querySelector('[data-sv-inv="' + id + '"]').getAttribute('data-in-belt')).toBe(String(truth[id]));
    }
    // A new transect hides the check again and clears only survey records.
    await click(button(t, 'Survey another transect at this reef'));
    expect(t.data.srvInvDone).toBe(false); expect(t.data.invCounts).toEqual({}); expect(t.data.speciesFieldNotes).toEqual({ clownfish: 'Keep this note' });
  });
  it('saves the count with the transect, and "Update" appears when the count changes', async () => {
    const L = transect('harbor', 1), truth = I.invertsInBelt(inverts('harbor', 1));
    const t = await mount({ section: 'survey', surveySiteId: 'harbor', records: recordsOf(L), fishCounts: X.fishInBelt(L), srvFishDone: true, invCounts: truth, srvInvDone: true, surveyStage: 'results' });
    await click(q(t, '[data-survey-save]'));
    const saved = t.data.surveyLog[0];
    expect(saved.inverts).toEqual(I.invEntryFromCounts(truth));
    expect(Object.keys(saved.inverts)).toEqual(INV);
    expect(q(t, '[data-survey-save]').textContent).toBe('Saved to your survey log');
    await click(button(t, '3. Invertebrates in the belt'));
    await click(q(t, '[data-inv-count="lobster"] button[aria-label="One more Lobster"]'));
    await click(q(t, '[data-inv-done]'));
    expect(q(t, '[data-survey-save]').textContent).toBe('Update saved survey');
    await click(q(t, '[data-survey-save]'));
    expect(t.data.surveyLog).toHaveLength(1); expect(t.data.surveyLog[0].inverts.lobster).toBe(truth.lobster + 1);
  });
  it('saves a transect without a count as not counted, never as zeros', async () => {
    const L = transect('reserve', 2);
    const t = await mount({ section: 'survey', surveySiteId: 'reserve', surveySeed: L.seed, surveyTransect: 2, records: recordsOf(L), surveyStage: 'results' });
    await click(q(t, '[data-survey-save]'));
    expect('inverts' in t.data.surveyLog[0]).toBe(false);
    expect(I.invEntryValues(t.data.surveyLog[0])).toBeNull();
  });
});

describe('old saved surveys', () => {
  it('load, compare and export, reading "not counted" rather than zero', async () => {
    const old = [entry('reserve', 1), entry('harbor', 1)];
    const doc = render({ section: 'compare', surveyLog: old });
    const card = doc.querySelector('[data-inv-compare]');
    expect(card.dataset.invCompare).toBe('none'); expect(card.textContent).toMatch(/Not counted/);
    expect(doc.querySelector('[data-compare-chart]')).toBeTruthy();
    const groups = X.summarizeLog(old);
    expect(groups.map((g) => g.inverts)).toEqual([{ counted: 0, total: 1, means: null }, { counted: 0, total: 1, means: null }]);
    const rows = csvObjects(X.surveyLogCsv(old));
    for (const r of rows) {
      expect(r.invertebrates_counted).toBe('false');
      for (const id of INV) expect(r[id + '_per_100_m2'], id).toBe('');
      expect(r.parrotfish_per_100_m2).not.toBe('');
    }
    // An old result still shows as saved, and the Results step still opens.
    const L = transect('reserve', 1);
    const res = render({ section: 'survey', surveySiteId: 'reserve', records: recordsOf(L), fishCounts: X.fishInBelt(L), srvFishDone: true, surveyStage: 'results', surveyLog: old, surveySaved: true });
    expect(res.querySelector('[data-survey-save]').textContent).toBe('Saved to your survey log');
    expect(res.querySelector('[data-inv-results]').dataset.invResults).toBe('not-counted');
    // Hostile or partial invertebrate data never breaks the page.
    for (const bad of [null, 7, 'x', [], {}, { lobster: 'two' }]) expect(I.invEntryValues({ inverts: bad }), JSON.stringify(bad)).toBeNull();
    expect(I.invEntryValues({ inverts: { lobster: 2 } })).toMatchObject({ lobster: 2, giant_clam: null });
  });
  it('compares mixed logs: averages only the transects with a count, and says not counted elsewhere', () => {
    const log = [entry('reserve', 1, true), entry('reserve', 2), entry('reserve', 3, true), entry('harbor', 1)];
    const groups = X.summarizeLog(log), reserve = groups[0];
    expect(reserve.inverts.counted).toBe(2); expect(reserve.inverts.total).toBe(3);
    const a = log[0].inverts, c = log[2].inverts;
    for (const id of INV) expect(reserve.inverts.means[id], id).toBe(Math.round((a[id] + c[id]) / 2 * 10) / 10);
    // The model "start from survey" path reads the same groups and is unchanged.
    const M = window.__RR_TEST_EXPORTS__.coralReefModel;
    expect(M.mdlSurveyStarts(log).map((s) => s.key)).toEqual(['survey:reserve', 'survey:harbor']);
    const doc = render({ section: 'compare', surveyLog: log });
    const card = doc.querySelector('[data-inv-compare="true"]');
    expect([...card.querySelectorAll('[data-inv-cmp-row]')].map((r) => r.dataset.invCmpRow)).toEqual(INV);
    expect([...card.querySelectorAll('[data-inv-n]')].map((n) => n.dataset.invN)).toEqual(['2/3', '0/1']);
    for (const id of INV) {
      const cells = [...card.querySelectorAll('[data-inv-cmp-row="' + id + '"] td')];
      expect(cells[0].dataset.invCell).toBe(String(reserve.inverts.means[id]));
      expect(cells[1].textContent).toBe('Not counted');
    }
    expect(card.querySelector('.sv-cmp-scroll').getAttribute('role')).toBe('region');
    const rows = csvObjects(X.surveyLogCsv(log));
    expect(rows.map((r) => r.invertebrates_counted)).toEqual(['true', 'false', 'true', 'false']);
    for (const id of INV) { expect(rows[0][id + '_per_100_m2']).toBe(String(a[id])); expect(rows[1][id + '_per_100_m2']).toBe(''); }
  });
});

describe('survey methods and the teacher page', () => {
  it('explains the invertebrate half of the belt, with guide links only where a guide entry exists', async () => {
    const t = await mount({ section: 'methods', w2MethodsPart: 'fish' });
    const block = q(t, '[data-inv-methods]');
    expect([...block.querySelectorAll('[data-inv-method]')].map((li) => li.dataset.invMethod)).toEqual(INV);
    for (const id of INV) {
      const li = block.querySelector('[data-inv-method="' + id + '"]'), link = li.querySelector('[data-inv-guide]');
      if (I.INV_GUIDE[id]) expect(link.dataset.invGuide).toBe(I.INV_GUIDE[id]); else { expect(link).toBeNull(); expect(li.textContent).toMatch(/Not in the species guide yet/); }
    }
    expect(q(t, '[data-w2-mtab="fish"]').textContent).toContain('Fish and invertebrates');
    await click(block.querySelector('[data-inv-guide="giant_triton"]'));
    expect(t.data.section).toBe('guide'); expect(t.data.guideSpeciesId).toBe('giant_triton');
    const teacher = render({ section: 'teacher' }).body.textContent;
    expect(teacher).toContain('four steps: the bottom points, the fish, the invertebrates, then the results');
  });
});

describe('three themes', () => {
  const L = () => transect('reserve', 1);
  const views = () => [
    ['inverts map', { section: 'survey', surveySiteId: 'reserve', surveyStage: 'inverts', invCounts: { diadema_urchin: 2, giant_clam: 1 } }],
    ['inverts list', { section: 'survey', surveySiteId: 'reserve', surveyStage: 'inverts', invView: 'list' }],
    ['results checked', { section: 'survey', surveySiteId: 'reserve', records: recordsOf(L()), fishCounts: X.fishInBelt(L()), srvFishDone: true, invCounts: { diadema_urchin: 9, sea_cucumber: 1 }, srvInvDone: true, surveyStage: 'results' }],
    ['compare mixed', { section: 'compare', surveyLog: [entry('reserve', 1, true), entry('reserve', 2), entry('harbor', 1, true)] }],
    ['methods belt', { section: 'methods', w2MethodsPart: 'fish' }]
  ];
  it.each(['light', 'dark', 'contrast'])('render in %s and pass axe', async (theme) => {
    for (const [name, data] of views()) {
      const html = renderTool('coralReef', { coralReef: data }, { theme });
      expect(html.length, name).toBeGreaterThan(1000);
      expect(/undefined|NaN/.test(parse(html).body.textContent), name).toBe(false);
      const result = await runIsolatedAxe(html);
      expect(result.violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')), theme + ' ' + name).toEqual([]);
    }
  }, 180000);
});
