import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import path from 'node:path';

// Round 11, phones. jsdom has no layout, so these pin the markup and the phone rules that make
// the layout possible. Real sizes were measured in Chromium (see the lane notes).

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
let loadTool, resetStemLab, renderTool, React, ReactDOMClient, X, I;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, renderTool, React, ReactDOMClient } = mod);
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef; I = window.__RR_TEST_EXPORTS__.coralReefInverts;
});

function setWidth(width) {
  window.matchMedia = (query) => {
    const max = /max-width:\s*(\d+)px/.exec(query), min = /min-width:\s*(\d+)px/.exec(query);
    const matches = (!max || width <= Number(max[1])) && (!min || width >= Number(min[1])) && !!(max || min);
    return { media: query, matches, addEventListener() {}, removeEventListener() {} };
  };
}
function setObserverWidth(width) {
  window.ResizeObserver = class { constructor(cb) { this.cb = cb; } observe() { this.cb([{ contentRect: { width } }]); } unobserve() {} disconnect() {} };
}
const savedRO = window.ResizeObserver;
const mounted = [];
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); }
  delete window.matchMedia;
  window.ResizeObserver = savedRO;
});
async function mount(seed) {
  let data = { coralReef: seed };
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef;
  function Shell() {
    const st = React.useState(data);
    data = st[0];
    return cfg.render({ React, toolData: st[0], setToolData: st[1], t: (k, f) => f || k, announceToSR() {}, theme: 'light' });
  }
  mounted.push({ host, root });
  await React.act(async () => root.render(React.createElement(Shell)));
  return { host, get data() { return data.coralReef; } };
}
const parse = (html) => new DOMParser().parseFromString('<!doctype html><body>' + html + '</body>', 'text/html');
const render = (state, theme) => parse(renderTool('coralReef', { coralReef: state }, theme ? { theme } : undefined));
// The server render escapes style text, and a parsed style element does not decode it.
const cssOf = (doc) => [...doc.querySelectorAll('style')].map((s) => s.textContent).join('\n').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&');
const shown = (id, year) => ({ section: 'model', model: X.scenarioSettings(id), modelRevealedFor: { [id]: true }, modelSurveyYear: year });
const INV = () => ['banded_coral_shrimp', 'diadema_urchin', 'crown_of_thorns', 'triton', 'lobster', 'pencil_urchin', 'collector_urchin', 'sea_cucumber', 'giant_clam'];
// A saved entry the way Results saves one, as in coralreef_survey_inverts.
function entry(id, n, withInv) {
  const site = X.siteById(id), S = window.__RR_TEST_EXPORTS__.coralReefSurvey, seed = S ? S.transectSeed(site, n) : site.seed + n;
  const L = X.buildTransect(site, seed), records = {};
  L.points.forEach((p) => { records[p.index] = p.category; });
  const score = X.scoreSurvey(L, records, X.fishInBelt(L)), fish = {};
  score.fish.forEach((f) => { fish[f.family] = f.density; });
  const e = { id: X.surveyEntryId(site, L.seed), siteId: id, seed: L.seed, transect: n, modelYear: null, at: 1, agreement: 40, recorded: 40, records, cover: score.cover, indicators: X.indicators(score.cover), fish, modelRun: null };
  if (withInv) e.inverts = I.invEntryFromCounts(I.invertsInBelt(I.buildInverts(site, seed)));
  return e;
}

describe('Reef future chart on a phone', () => {
  it('moves Year 0 off the 0% label, keeping its x on the first year', async () => {
    setObserverWidth(300);
    const { host } = await mount(shown('recent', 30));
    const yr0 = host.querySelector('[data-md9-year-label="0"]'), pct0 = [...host.querySelectorAll('svg[data-model-chart] text')].find((t) => t.textContent === '0%');
    expect(yr0.textContent).toBe('Year 0');
    expect(yr0.getAttribute('text-anchor')).toBe('start');
    expect(+pct0.getAttribute('x')).toBeLessThan(+yr0.getAttribute('x'));
    expect(pct0.getAttribute('text-anchor')).toBe('end');
    expect(host.querySelector('[data-md9-year-label="10"]').getAttribute('text-anchor')).toBe('middle');
  });
  it('keeps the wide chart centred', () => {
    const yr0 = render(shown('recent', 30)).querySelector('[data-md9-year-label="0"]');
    expect(yr0.getAttribute('text-anchor')).toBe('middle');
  });
  for (const year of [1, 2, 12, 30]) {
    it('year ' + year + ': the picked value sits beside its dashed line, clear of the axis, and is the model value', async () => {
      setObserverWidth(300);
      const rows = X.runScenario(X.scenarioSettings('recent'), 11);
      const { host } = await mount(shown('recent', year));
      const strip = host.querySelector('[data-md9-heat-strip]');
      const value = strip.querySelector('[data-pf11-mark-value]');
      expect(value.textContent).toBe(String(rows[year].dhw));
      const dashed = [...strip.querySelectorAll('line')].find((l) => l.getAttribute('stroke-dasharray') === '4 3');
      const lineX = +dashed.getAttribute('x1'), x = +value.getAttribute('x'), a = value.getAttribute('text-anchor');
      const w = value.textContent.length * 13 * 0.6;
      const left = a === 'end' ? x - w : x, right = a === 'end' ? x : x + w;
      expect(right <= lineX - 2 || left >= lineX + 2, 'not across the dashed line').toBe(true);
      const axisEnd = +[...strip.querySelectorAll('text')].find((t) => t.textContent === '8').getAttribute('x');
      expect(left, 'not over the axis numbers').toBeGreaterThan(axisEnd);
    });
  }
});

describe('Invertebrates table on Compare', () => {
  const log = () => [entry('reserve', 1, true), entry('reserve', 2), entry('harbor', 1, true), entry('rubble', 1)];
  it('stays one table with explicit roles, since the phone rules make it display:block', () => {
    const doc = render({ section: 'compare', surveyLog: log() });
    const card = doc.querySelector('[data-inv-compare="true"]');
    const tables = card.querySelectorAll('table');
    expect(tables.length).toBe(1);
    expect(tables[0].getAttribute('role')).toBe('table');
    const cols = [...card.querySelectorAll('thead th')];
    expect(cols.length).toBe(4);
    cols.forEach((c) => expect(c.getAttribute('role')).toBe('columnheader'));
    card.querySelectorAll('tbody th').forEach((c) => expect(c.getAttribute('role')).toBe('rowheader'));
    card.querySelectorAll('tbody td').forEach((c) => expect(c.getAttribute('role')).toBe('cell'));
    card.querySelectorAll('tbody tr, thead tr').forEach((c) => expect(c.getAttribute('role')).toBe('row'));
    expect(card.querySelectorAll('tbody tr').length).toBe(9);
    card.querySelectorAll('tbody tr').forEach((tr) => expect(tr.querySelectorAll('td').length).toBe(3));
  });
  it('has phone rules that fit the table with no sideways scrolling, and hides the slide hint there', () => {
    const doc = render({ section: 'compare', surveyLog: log() });
    const css = cssOf(doc);
    const m = css.match(/@container sv-cmp \(max-width:560px\)\{[^\n]*\.pf11-invt[^\n]*/);
    expect(!!m).toBe(true);
    const block = m ? m[0] : '';
    expect(block.includes('.pf11-invscroll{overflow:visible}')).toBe(true);
    expect(block.includes('min-width:0!important')).toBe(true);
    expect(block.includes('.pf11-invhint{display:none!important}')).toBe(true);
    expect(block.includes('content:counter(pf11r)')).toBe(true);
    const card = doc.querySelector('[data-inv-compare="true"]');
    expect(card.querySelector('.sv-cmp-hint').className.includes('pf11-invhint')).toBe(true);
    expect(card.querySelector('.sv-cmp-scroll').className.includes('pf11-invscroll')).toBe(true);
    expect(card.querySelector('table').className.includes('pf11-invt')).toBe(true);
  });
  it('loses no value: each cell keeps its reef order and Not counted stays words', () => {
    const entries = log();
    const groups = X.summarizeLog(entries), doc = render({ section: 'compare', surveyLog: entries });
    const card = doc.querySelector('[data-inv-compare="true"]');
    INV().forEach((id) => {
      const cells = [...card.querySelectorAll('[data-inv-cmp-row="' + id + '"] td')];
      groups.forEach((g, i) => {
        const m = g.inverts && g.inverts.means ? g.inverts.means[id] : null;
        expect(cells[i].textContent).toBe(m == null ? 'Not counted' : String(m));
      });
    });
  });
});

describe('Invertebrates list on Field survey', () => {
  it('keeps every animal and column, with roles, and gives the name its own line in a narrow workspace', () => {
    const site = X.siteById('reserve'), inv = I.buildInverts(site, site.seed);
    const doc = render({ section: 'survey', surveySiteId: 'reserve', surveySeed: site.seed, surveyStage: 'inverts', invView: 'list' });
    const t = doc.querySelector('table[data-inv-list]');
    expect(t.getAttribute('role')).toBe('table');
    expect(t.className.includes('pf11-invlist')).toBe(true);
    const rows = [...t.querySelectorAll('tbody tr')];
    expect(rows.length).toBe(inv.animals.length);
    rows.forEach((r) => { expect(r.getAttribute('role')).toBe('row'); expect(r.querySelectorAll('td[role="cell"]').length).toBe(3 + 1); });
    expect(t.querySelectorAll('thead th[role="columnheader"]').length).toBe(4);
    const css = cssOf(doc);
    expect(css.includes('@container sv9work (max-width:480px){[data-coralreef-root] .pf11-invlist,')).toBe(true);
    expect(css.includes('.pf11-invlist tbody td:first-child{grid-column:1/-1')).toBe(true);
  });
});

describe('phone fold on Compare: numbers and log', () => {
  const log = () => [entry('reserve', 1, true), entry('harbor', 1)];
  it('folds on a phone behind a button, opens on press, and saves nothing', async () => {
    setWidth(390);
    const t = await mount({ section: 'compare', surveyLog: log() });
    const before = JSON.stringify(t.data);
    for (const id of ['numbers', 'log']) {
      const fold = t.host.querySelector('[data-pf11-fold="' + id + '"]');
      const btn = fold.querySelector(':scope > button'), panel = fold.querySelector(':scope > div');
      expect(btn.getAttribute('aria-expanded')).toBe('false');
      expect(btn.getAttribute('aria-controls')).toBe(panel.id);
      expect(panel.hidden).toBe(true);
      expect(!!panel.querySelector(id === 'log' ? '[data-sv-log]' : 'table.cp9-rtable'), 'still in the page').toBe(true);
      await React.act(async () => btn.click());
      expect(btn.getAttribute('aria-expanded')).toBe('true');
      expect(panel.hidden).toBe(false);
    }
    expect(JSON.stringify(t.data)).toBe(before);
    expect(t.host.querySelector('[data-pf11-fold="log"] button').textContent).toBe('Hide the log');
    // Download and clear stay outside the fold.
    const fold = t.host.querySelector('[data-pf11-fold="log"]');
    const buttons = [...t.host.querySelectorAll('button')].map((b) => b.textContent);
    expect(buttons.includes('Clear the survey log')).toBe(true);
    expect(fold.textContent.includes('Clear the survey log')).toBe(false);
  });
  it('shows everything with no button on wider screens and on hosts with no matchMedia', async () => {
    for (const width of [768, 0]) {
      if (width) setWidth(width); else delete window.matchMedia;
      const t = await mount({ section: 'compare', surveyLog: log() });
      for (const id of ['numbers', 'log']) {
        const fold = t.host.querySelector('[data-pf11-fold="' + id + '"]');
        expect(fold.querySelector(':scope > button'), width + ' ' + id).toBe(null);
        expect(fold.querySelector(':scope > div').hidden).toBe(false);
      }
    }
  });
});

describe('Field survey tiles on a phone', () => {
  it('uses 5 tiles a row, 44 px tall, below 480 px of room, by a rule added after the pinned ones', () => {
    const doc = render({ section: 'survey', pointIndex: 3 });
    const css = cssOf(doc);
    const rule = '@container sv9tiles (max-width:479px){[data-coralreef-root] .sv9-tiles{grid-template-columns:repeat(5,minmax(0,1fr));gap:4px}[data-coralreef-root] .sv9-tiles .crb-pt{min-height:44px}}';
    expect(css.includes(rule)).toBe(true);
    expect(css.indexOf(rule)).toBeGreaterThan(css.indexOf('@container sv9tiles (max-width:260px)'));
    expect(doc.querySelectorAll('[role="toolbar"].sv9-tiles button.crb-pt').length).toBe(40);
  });
  it('gives the go-back buttons on Results a phone hook', () => {
    const site = X.siteById('reserve'), L = X.buildTransect(site, site.seed), r = {};
    L.points.forEach((p, i) => { r[i] = i === 3 ? (p.category === 'sand' ? 'rock' : 'sand') : p.category; });
    const doc = render({ section: 'survey', surveySiteId: 'reserve', surveySeed: site.seed, records: r, surveyStage: 'results' });
    const go = [...doc.querySelectorAll('button')].filter((b) => b.textContent === 'Go to this point');
    expect(go.length).toBeGreaterThan(0);
    go.forEach((b) => expect(b.className.includes('pf11-go')).toBe(true));
    expect(cssOf(doc).includes('.pf11-go{min-height:44px!important}')).toBe(true);
  });
});

describe('belt map: water outside the belt', () => {
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const over = (top, a, under) => under.map((v, i) => top[i] * a + v * (1 - a));
  const cr = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const OUTLINE = { parrotfish: '#0b3d35', surgeonfish: '#0f1f4a', butterflyfish: '#4a3a07', grouper: '#2b190d', snapper: '#4a1410' };
  it('lets every fish outline clear 3:1 on the plain grounds, using the map\'s own water and shade', () => {
    const map = render({ section: 'survey', surveySiteId: 'reserve', surveyStage: 'fish' }).querySelector('svg[data-belt-map]');
    const water = [...map.children].find((n) => n.tagName === 'rect' && n.getAttribute('fill') === '#8fd0de');
    const top = 112 - 2.5 * 19;
    const shade = [...map.children].find((n) => n.tagName === 'path' && (n.getAttribute('d') || '').startsWith('M0 0H') && (n.getAttribute('d') || '').includes('V' + top + 'H0Z'));
    expect(!!water && !!shade).toBe(true);
    for (const ground of ['#dcd1aa', '#bfb9a4', '#a59f88']) {
      const seen = over(rgb(shade.getAttribute('fill')), +shade.getAttribute('opacity'), over(rgb('#8fd0de'), +water.getAttribute('opacity'), rgb(ground)));
      for (const fam of Object.keys(OUTLINE)) expect(cr(lum(seen), lum(rgb(OUTLINE[fam]))), ground + ' ' + fam).toBeGreaterThanOrEqual(3);
    }
  });
  it('still shades only outside the belt, so in and out read apart', () => {
    const map = render({ section: 'survey', surveySiteId: 'reserve', surveyStage: 'fish' }).querySelector('svg[data-belt-map]');
    const top = 112 - 2.5 * 19, bot = 112 + 2.5 * 19;
    const shade = [...map.children].find((n) => n.tagName === 'path' && (n.getAttribute('d') || '').startsWith('M0 0H'));
    expect(shade.getAttribute('d').includes('V' + top + 'H0Z')).toBe(true);
    expect(shade.getAttribute('d').includes('M0 ' + bot + 'H')).toBe(true);
    expect(+shade.getAttribute('opacity')).toBeGreaterThanOrEqual(0.3);
  });
});

describe('species guide tile on a phone', () => {
  it('opens field marks in the tile without moving a card, and search matches still span', async () => {
    setWidth(390);
    const t = await mount({ section: 'guide' });
    const order = () => [...t.host.querySelectorAll('[data-species]')].map((n) => n.getAttribute('data-species')).join();
    const before = order();
    const card = t.host.querySelector('[data-species="blue_tang"]');
    await React.act(async () => { const box = card.querySelector('[data-gd10-marks]'); box.open = true; box.dispatchEvent(new Event('toggle', { bubbles: false })); });
    const open = t.host.querySelector('[data-species="blue_tang"]');
    expect(open.classList.contains('gd10-wide')).toBe(true);
    expect(open.classList.contains('pf11-inplace')).toBe(true);
    expect(order()).toBe(before);
    const css = cssOf(t.host);
    expect(css.includes('@media(max-width:640px){[data-coralreef-root] .crds-guide[data-gd10-grid=true] .gd10-wide.pf11-inplace{grid-column:auto}}')).toBe(true);
  });
});

describe('phone tap sizes', () => {
  it('brings every button but the tape cells, every summary and the auto-advance row to 44 px, on phones only', () => {
    const css = cssOf(render({ section: 'survey', surveyStage: 'points' }));
    const m = css.match(/@media\(max-width:640px\)\{[^\n]*?button:not\(\.crb-cell\)\{min-height:44px!important\}[^\n]*/);
    expect(!!m).toBe(true);
    const block = m ? m[0] : '';
    expect(block.includes('summary{min-height:44px')).toBe(true);
    expect(block.includes('.pf11-check{min-height:44px}')).toBe(true);
  });
  it('grows a tape cell\'s tap area over plain neighbours only', () => {
    const css = cssOf(render({ section: 'survey', surveyStage: 'points' }));
    expect(css.includes('button.crb-cell::after{content:"";position:absolute;left:0;right:0;top:-8px;bottom:-8px}')).toBe(true);
    expect(css.includes(':not(button)+button.crb-cell::after{left:-9px}')).toBe(true);
    expect(css.includes('button.crb-cell:not(:has(+button))::after{right:-9px}')).toBe(true);
  });
});

describe('Field guide on a phone', () => {
  it('lets the words run under the picture, keeps all seven cards and the ask card', () => {
    const doc = render({ section: 'methods', w2MethodsPart: 'guide' });
    const css = cssOf(doc);
    expect(css.includes('.w2-gcards>li:not(.mt10-ask)>svg:first-child{float:left;width:38%!important')).toBe(true);
    expect(css.indexOf('float:left;width:38%')).toBeGreaterThan(css.indexOf('grid-template-columns:38% minmax(0,1fr)'));
    const cards = [...doc.querySelectorAll('.w2-gcards>li')];
    expect(cards.length).toBe(8);
    cards.slice(0, 7).forEach((li) => { expect(li.firstElementChild.tagName.toLowerCase()).toBe('svg'); expect(li.querySelectorAll('p').length).toBe(2); });
  });
});
