import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { loadTool, resetStemLab, renderTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
import { runIsolatedAxe } from './helpers/isolated_axe_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Lane B: the pictures of the survey data. The belt map, the transect strip,
// the stacked cover bars, the reef comparison chart, the modeled-reef picture
// and the model chart marks are each checked against the numbers they draw.

const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const CODE = { hard_coral: 'HC', bleached_coral: 'BL', recently_dead_coral: 'RKC', macroalgae: 'NIA', rock: 'RC', rubble: 'RB', sand: 'SD' };
let X;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef'); X = window.__RR_TEST_EXPORTS__.coralReef; });

const parse = (html) => new DOMParser().parseFromString('<!doctype html><body>' + html + '</body>', 'text/html');
function exportsOf(file) {
  const win = { StemLab: { isRegistered: () => false, registerTool: () => {} }, __RR_TEST_EXPORTS__: {} };
  vm.runInNewContext(readFileSync(file, 'utf8'), { window: win, Math, Object, JSON, Array, Number, String, Date, URL });
  return win.__RR_TEST_EXPORTS__.coralReef;
}
// A finished survey with a wrong record every few points and two left blank.
function survey(siteId, opts) {
  const o = opts || {};
  const site = X.siteById(siteId), L = X.buildTransect(site, site.seed), records = {};
  L.points.forEach((p, i) => { if (o.blank && o.blank.includes(i)) return; records[i] = (o.wrongEvery && i % o.wrongEvery === 3) ? (p.category === 'rock' ? 'sand' : 'rock') : p.category; });
  const fishCounts = X.fishInBelt(L);
  const score = X.scoreSurvey(L, records, fishCounts);
  const fish = {}; score.fish.forEach((f) => { fish[f.family] = f.density; });
  return { site, L, records, fishCounts, score,
    entry: { id: site.id + ':' + L.seed + ':', siteId: site.id, seed: L.seed, transect: 1, modelYear: null, at: 1, agreement: score.agreement, recorded: Object.keys(records).length, cover: score.cover, indicators: X.indicators(score.cover), fish } };
}

describe('belt map', () => {
  it('draws every fish at its layout position, the same way inside and outside the belt', () => {
    for (const id of ['reserve', 'harbor', 'restored']) {
      const site = X.siteById(id), L = X.buildTransect(site, site.seed);
      const doc = parse(renderTool('coralReef', { coralReef: { section: 'survey', surveySiteId: id, surveyStage: 'fish' } }));
      const map = doc.querySelector('svg[data-belt-map]');
      expect(map, id).toBeTruthy();
      const drawn = [...map.querySelectorAll('g[data-fish]')];
      expect(drawn.length, id + ' one drawing per fish').toBe(L.fish.length);
      L.fish.forEach((f, i) => {
        expect(drawn[i].getAttribute('data-fish')).toBe(f.family);
        expect(+drawn[i].getAttribute('data-x'), id + ' ' + f.id + ' along').toBeCloseTo(14 + f.alongM * 20, 6);
        expect(+drawn[i].getAttribute('data-y'), id + ' ' + f.id + ' across').toBeCloseTo(112 + f.offsetM * 19, 6);
        const inner = drawn[i].firstElementChild.getAttribute('transform');
        expect(inner.startsWith('translate(' + (14 + f.alongM * 20) + ' ' + (112 + f.offsetM * 19) + ')'), inner).toBe(true);
      });
      // Strip the position and facing: what is left must be identical for
      // every fish of a family, so nothing but position tells in from out.
      const byFamily = {};
      drawn.forEach((g, i) => {
        const clone = g.cloneNode(true);
        ['data-x', 'data-y'].forEach((a) => clone.removeAttribute(a));
        clone.firstElementChild.removeAttribute('transform');
        (byFamily[L.fish[i].family] = byFamily[L.fish[i].family] || new Set()).add(clone.outerHTML);
      });
      for (const fam of Object.keys(byFamily)) expect(byFamily[fam].size, id + ' ' + fam + ' drawn one way').toBe(1);
      expect(/inbelt|in-belt/i.test(map.outerHTML), 'no in-belt marker in the map').toBe(false);
      // Both sides of the belt edge are inside the figure.
      expect(L.fish.some((f) => f.inBelt) && L.fish.some((f) => !f.inBelt)).toBe(true);
    }
  });

  it('keeps the list view and the distance ticks', () => {
    const list = parse(renderTool('coralReef', { coralReef: { section: 'survey', surveyStage: 'fish', fishView: 'list' } }));
    const site = X.SITES[0], L = X.buildTransect(site, site.seed);
    expect(list.querySelectorAll('tbody tr').length).toBe(L.fish.length);
    const map = parse(renderTool('coralReef', { coralReef: { section: 'survey', surveyStage: 'fish' } })).querySelector('svg[data-belt-map]');
    expect([...map.querySelectorAll('text')].map((t) => t.textContent)).toEqual(['0 m', '5 m', '10 m', '15 m', '20 m']);
  });
});

describe('results figures', () => {
  const s = () => survey('reserve', { wrongEvery: 7, blank: [12, 30] });
  const render = (st, theme) => parse(renderTool('coralReef', { coralReef: { section: 'survey', surveySiteId: 'reserve', surveySeed: st.L.seed, records: st.records, fishCounts: st.fishCounts, surveyStage: 'results' } }, { theme }));

  it('draws the tape strip: 40 cells a row with the right codes, and one mark per mismatch in the list', () => {
    const st = s();
    for (const theme of ['light', 'dark', 'contrast']) {
      const doc = render(st, theme), strip = doc.querySelector('[data-transect-strip]');
      const yours = [...strip.querySelectorAll('[data-strip="yours"]')], key = [...strip.querySelectorAll('[data-strip="key"]')];
      expect(yours.length).toBe(40);
      expect(key.length).toBe(40);
      st.L.points.forEach((p, i) => {
        expect(+key[i].getAttribute('data-point')).toBe(i);
        expect(key[i].textContent, 'key ' + i).toBe(CODE[p.category]);
        expect(yours[i].textContent, 'yours ' + i).toBe(st.records[i] ? CODE[st.records[i]] : '?');
      });
      const marked = yours.filter((c) => c.getAttribute('data-miss') === 'true').map((c) => +c.getAttribute('data-point'));
      expect(marked).toEqual(st.score.mismatches.map((m) => m.index));
      expect(marked.length).toBeGreaterThan(2);
      // Each mismatch is a real button with its own name; matches are not.
      expect(strip.querySelectorAll('button').length).toBe(st.score.mismatches.length);
      [...strip.querySelectorAll('button')].forEach((b) => expect(b.getAttribute('aria-label')).toMatch(/^Point \d+ \(/));
      expect(strip.querySelectorAll('.crb-mark').length).toBe(40);
      expect([...strip.querySelectorAll('.crb-mark')].filter((m) => m.textContent).length).toBe(st.score.mismatches.length);
    }
  });

  it('draws two 100% bars whose segments match the cover table', () => {
    const st = s(), doc = render(st, 'light');
    const bars = [...doc.querySelectorAll('.crb-bar[data-bar]')];
    expect(bars.map((b) => b.getAttribute('data-bar'))).toEqual(['yours', 'key']);
    [[bars[0], st.score.cover], [bars[1], st.score.trueCover]].forEach(([bar, cover]) => {
      const segs = [...bar.querySelectorAll('[data-cat]')];
      let total = 0;
      segs.forEach((g) => {
        const cat = g.getAttribute('data-cat'), w = parseFloat(g.style.width);
        total += w;
        if (cat === 'missing') expect(+g.getAttribute('data-pct')).toBeCloseTo(100 - X.CATEGORY_IDS.reduce((a, id) => a + cover[id], 0), 6);
        else { expect(+g.getAttribute('data-pct')).toBe(cover[cat]); expect(w, cat).toBeCloseTo(cover[cat], 2); }
      });
      expect(total).toBeCloseTo(100, 1);
      expect(segs.filter((g) => g.getAttribute('data-cat') !== 'missing').map((g) => g.getAttribute('data-cat'))).toEqual(X.CATEGORY_IDS.filter((id) => cover[id] > 0));
    });
    expect(bars[0].querySelector('[data-cat="missing"]'), 'two blank points show as not recorded').toBeTruthy();
    // The table stays as the accessible data.
    expect(doc.querySelectorAll('table')[0].querySelectorAll('tbody tr').length).toBe(7);
  });

  it('a strip mismatch opens that point', async () => {
    const st = s();
    let data = { coralReef: { section: 'survey', surveySiteId: 'reserve', surveySeed: st.L.seed, records: st.records, fishCounts: st.fishCounts, surveyStage: 'results' } };
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
    function Shell() { const [toolData, setToolData] = React.useState(data); data = toolData; return cfg.render({ React, t: (k, f) => f || k, announceToSR: () => {}, toolData, setToolData }); }
    await React.act(async () => { root.render(React.createElement(Shell)); });
    const target = st.score.mismatches[1].index;
    const btn = host.querySelector('[data-transect-strip] button[data-point="' + target + '"]');
    await React.act(async () => { btn.click(); });
    expect(data.coralReef.surveyStage).toBe('points');
    expect(data.coralReef.pointIndex).toBe(target);
    await React.act(async () => { root.unmount(); });
    host.remove();
  });
});

describe('compare chart', () => {
  const log = () => {
    const a = survey('reserve', { wrongEvery: 9 }), a2 = survey('reserve'), b = survey('harbor'), c = survey('heatwave'), r = survey('rubble', { blank: [5] });
    a2.entry.id = 'reserve:second'; a2.entry.transect = 2;
    a2.entry.cover = Object.assign({}, a2.entry.cover, { hard_coral: 30, rock: a2.entry.cover.rock + (a2.entry.cover.hard_coral - 30) });
    return [a.entry, b.entry, a2.entry, c.entry, r.entry];
  };
  it('draws one bar per reef with segments matching the mean cover, and fish marks matching the table', () => {
    const entries = log();
    const doc = parse(renderTool('coralReef', { coralReef: { section: 'compare', surveyLog: entries } }));
    const chart = doc.querySelector('[data-compare-chart]');
    const rows = [...chart.querySelectorAll('[data-reef]')];
    expect(rows.map((r) => r.getAttribute('data-reef'))).toEqual(['reserve', 'harbor', 'heatwave', 'rubble']);
    for (const row of rows) {
      const mine = entries.filter((e) => e.siteId === row.getAttribute('data-reef'));
      const mean = (f) => Math.round(mine.reduce((a, e) => a + f(e), 0) / mine.length * 10) / 10;
      const segs = [...row.querySelectorAll('.crb-bar [data-cat]')];
      let total = 0;
      for (const id of X.CATEGORY_IDS) {
        const want = mean((e) => e.cover[id]), seg = segs.find((g) => g.getAttribute('data-cat') === id);
        if (want > 0) { expect(+seg.getAttribute('data-pct'), row.getAttribute('data-reef') + ' ' + id).toBe(want); total += parseFloat(seg.style.width); }
        else expect(seg).toBeFalsy();
      }
      const miss = segs.find((g) => g.getAttribute('data-cat') === 'missing');
      if (miss) total += parseFloat(miss.style.width);
      expect(total).toBeCloseTo(100, 1);
      const fm = (k) => +row.querySelector('[data-fish-mark="' + k + '"]').getAttribute('data-value');
      expect(fm('grazers')).toBe(mean((e) => e.fish.parrotfish + e.fish.surgeonfish));
      expect(fm('butterfly')).toBe(mean((e) => e.fish.butterflyfish));
      expect(fm('predators')).toBe(mean((e) => e.fish.grouper + e.fish.snapper));
    }
    expect(rows.find((r) => r.getAttribute('data-reef') === 'rubble').querySelector('[data-cat="missing"]'), 'blank point shown').toBeTruthy();
    const img = chart.querySelector('[role="img"]');
    expect(img.getAttribute('aria-label')).toMatch(/Most live coral: .+, \d/);
    // The table is still there, one row per reef.
    expect(doc.querySelectorAll('table tbody tr').length).toBe(4);
  });

  it('passes axe with a log, in every theme', async () => {
    for (const theme of ['light', 'contrast']) {
      const html = renderTool('coralReef', { coralReef: { section: 'compare', surveyLog: log() } }, { theme });
      const result = await runIsolatedAxe(html);
      expect(result.violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')), theme).toEqual([]);
    }
  }, 60000);
});

describe('model pictures', () => {
  const model = (id, year) => ({ section: 'model', model: X.scenarioSettings(id), modelRevealedFor: { [id]: true }, modelSurveyYear: year });

  it('the reef picture follows the year: its coral spots track the model coral fraction', () => {
    for (const [id, years] of [['rubble', [0, 10, 30]], ['recent', [3, 22]], ['warmer', [0, 30]], ['cooler', [15]]]) {
      const rows = X.runScenario(X.scenarioSettings(id), 11);
      const seen = new Set();
      for (const year of years) {
        const doc = parse(renderTool('coralReef', { coralReef: model(id, year) }));
        const art = doc.querySelector('svg[data-year-art]');
        expect(+art.getAttribute('data-year-art')).toBe(year);
        const live = +art.getAttribute('data-live-spots');
        expect(Math.abs(live - rows[year].coral * 24), id + ' year ' + year).toBeLessThanOrEqual(1);
        expect([...art.querySelectorAll('[data-spot-cat="hard_coral"],[data-spot-cat="bleached_coral"]')].length).toBe(live);
        expect(art.getAttribute('aria-label')).toContain('live coral ' + Math.round(rows[year].coral * 100) + '%');
        seen.add(art.innerHTML);
      }
      if (years.length > 1) expect(seen.size, id + ' the picture changes with the year').toBe(years.length);
    }
  }, 120000);

  it('shows the rubble field nearly bare at first and coral on Reef Stars later', () => {
    const at = (y) => parse(renderTool('coralReef', { coralReef: model('rubble', y) })).querySelector('svg[data-year-art]');
    const y0 = at(0), y30 = at(30);
    expect(+y0.getAttribute('data-live-spots')).toBeLessThanOrEqual(1);
    expect(y0.querySelectorAll('[data-spot-cat="rubble"]').length).toBeGreaterThanOrEqual(18);
    expect(+y30.getAttribute('data-live-spots')).toBeGreaterThanOrEqual(13);
    expect(+y30.getAttribute('data-frames')).toBeGreaterThan(10);
    expect(+y0.getAttribute('data-frames')).toBe(0);
  });

  it('turns coral white in a severe heatwave year', () => {
    const rows = X.runScenario(X.scenarioSettings('warmer'), 11);
    const hot = rows.find((r) => r.year > 0 && r.dhw >= 8 && r.coral > 0.15);
    const art = parse(renderTool('coralReef', { coralReef: model('warmer', hot.year) })).querySelector('svg[data-year-art]');
    const live = +art.getAttribute('data-live-spots'), white = +art.getAttribute('data-bleached-spots');
    expect(Math.abs(white - live * hot.bleached)).toBeLessThanOrEqual(1.5);
    expect(white).toBeGreaterThan(0);
    expect(art.querySelector('[data-heat]')).toBeTruthy();
  });

  it('marks the severe heatwave years and the picked year on the chart', () => {
    const rows = X.runScenario(X.scenarioSettings('recent'), 11);
    const doc = parse(renderTool('coralReef', { coralReef: model('recent', 12) }));
    const chart = doc.querySelector('svg[data-model-chart]');
    const bands = [...chart.querySelectorAll('[data-severe-year]')].map((b) => +b.getAttribute('data-severe-year'));
    expect(bands).toEqual(rows.filter((r) => r.year > 0 && r.dhw >= 8).map((r) => r.year));
    expect(bands.length).toBeGreaterThan(0);
    expect(chart.textContent).toContain('Year 12: live coral ' + Math.round(rows[12].coral * 100) + '%, seaweed ' + Math.round(rows[12].algae * 100) + '%');
    expect(doc.body.textContent).toContain('Severe heatwave year (8 or more Degree Heating Weeks)');
    // The comparison line stays when actions are on.
    const rub = parse(renderTool('coralReef', { coralReef: model('rubble', 30) }));
    expect(rub.querySelector('svg[data-model-chart]').textContent).toContain('Without actions');
  });

  it('passes axe on the rubble run with its picture', async () => {
    const html = renderTool('coralReef', { coralReef: model('rubble', 4) }, { theme: 'dark' });
    const result = await runIsolatedAxe(html);
    expect(result.violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', '))).toEqual([]);
  }, 60000);
});
