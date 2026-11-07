import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Lane sv9: the Field survey visual pass. Site cards picture the setting only,
// the belt map is richer without moving or marking any animal, the counts sit
// beside the map, and Results opens with a band made only from the records.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
let loadTool, resetStemLab, renderTool, React, ReactDOMClient, X, I;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, renderTool, React, ReactDOMClient } = mod);
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef; I = window.__RR_TEST_EXPORTS__.coralReefInverts;
});
const mounted = [];
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } });
const parse = (html) => new DOMParser().parseFromString('<!doctype html><body>' + html + '</body>', 'text/html');
const render = (data, theme) => parse(renderTool('coralReef', { coralReef: data }, theme ? { theme } : undefined));
const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 24);
const IDS = ['reserve', 'harbor', 'heatwave', 'rubble', 'restored'];
const FISH = ['parrotfish', 'surgeonfish', 'butterflyfish', 'grouper', 'snapper'];

function all(site, n) { const L = X.buildTransect(X.siteById(site), n), r = {}; L.points.forEach((p, i) => { r[i] = p.category; }); return { L, r }; }
function firstN(site, n) { const { L, r } = all(site, X.siteById(site).seed), o = {}; for (let i = 0; i < n; i++) o[i] = r[i]; return { L, r: o }; }
const results = (site, records, extra) => render(Object.assign({ section: 'survey', surveySiteId: site, surveySeed: X.siteById(site).seed, records, surveyStage: 'results' }, extra || {}));

// sha256 of the animals' data and of their drawn markup, taken from the
// untouched base copy of the tool: seed offsets 0, 101 and 977 on every site.
const PINNED = {
  'reserve+0': {fish: '869eef467383470a890af21e', inBelt: 'b098c8a0e9c2825ab9e3b40f', inverts: '7abe60b230903b62f19fbb78', fishDrawn: '0c0ca5ae8dba4955ad35ffe0', invDrawn: '9858a63436743cf1cb55ac6a'},
  'reserve+101': {fish: '80b67bd0720dfb8e35064308', inBelt: '4f8734efc60c5f2b8d4a846d', inverts: '5cc27753cdcf0b8d641f12cf', fishDrawn: 'e9dcbda1c8a95e5e4fd8a84d', invDrawn: 'db829b8e5dc77cf565c2d491'},
  'reserve+977': {fish: '869a37426a54bb2269e60e37', inBelt: '1d04c9076c629c2a72e7bf34', inverts: '1421f80b5b20de106301081c', fishDrawn: 'ac3b539f5d3f9d72123e3941', invDrawn: '0e0cb5829dec83162c8c95b9'},
  'harbor+0': {fish: '1b55645a3b155c7a14c0247d', inBelt: 'e6d80f1fd6741cf9802ecc44', inverts: '0b550510b99fce047a1b63f0', fishDrawn: '69c987eb29e9d5109f849b71', invDrawn: '4778112559aaccc2009ae47b'},
  'harbor+101': {fish: 'c08286dab3ebcc6ed190248e', inBelt: '8fd6f2004d3e89f6c04b595c', inverts: '5f41ae28a6364df88f897231', fishDrawn: '2eb2a97b5c64bbdd95a830b1', invDrawn: 'a7314ddcddc6f4c5a6ae2f75'},
  'harbor+977': {fish: 'a8894ddd3c15e86de5516bcc', inBelt: 'e3afff651ad3928570bc1c8a', inverts: 'fa531cfbb780f9ac34b19363', fishDrawn: '148a8bc104c86411e29f66de', invDrawn: '3424723ffe69f1f150c9d06b'},
  'heatwave+0': {fish: '724b4de050bab79a95eab8ac', inBelt: '6d6ce9873c6253e794591beb', inverts: '5bfc4697b739d1e7899c6910', fishDrawn: '110e740fb3708d3ec3bf1da1', invDrawn: 'bf21e4fc22e5e9d880cdb7f5'},
  'heatwave+101': {fish: '9d3990072713f0d11a208a3d', inBelt: '6b6f6d9022fe692ac09d3803', inverts: 'a65fc47963ab2a1ad04348e3', fishDrawn: '1c13ed686ba2fda9900df03a', invDrawn: '4ee865b63f9f14e371f4903b'},
  'heatwave+977': {fish: 'efb5615205794459f3a8f247', inBelt: 'aa1bb200ba39eb000bb94b50', inverts: 'd7abe6670a0b4b08045845d4', fishDrawn: '11d68bfa8b2a6e6be55788b6', invDrawn: '6ffec9436c248270aa04235d'},
  'rubble+0': {fish: 'c8d8d58e3ca0b6ca91f507ef', inBelt: '07cc7d2e339559c1bf7f8681', inverts: '4f24900388ca78bd7b50b2b0', fishDrawn: '314b9ae406224d701e0f5f77', invDrawn: '35dd97048c766af6ad48eb0c'},
  'rubble+101': {fish: 'e391e1ddbfe10cac54723546', inBelt: 'a0ca50b4d06a3c49464623b6', inverts: '261e678ae84ae95a19497126', fishDrawn: 'a0fbd30f67c940cbd534b191', invDrawn: 'a2ad857ba5b81370759725a3'},
  'rubble+977': {fish: '642bdcb73a4602114e335708', inBelt: 'e4f6564c8c6ea26e6c23203b', inverts: '70f00a84868f2c55fd987f9e', fishDrawn: 'c45015dc3248b8c528a7b8f6', invDrawn: 'c4097fd9d36ca2b6f91f7ac8'},
  'restored+0': {fish: '5c5e899b1792a754725b8298', inBelt: '37a052fbbffa9365da4cbf2e', inverts: '18a24910da0dd7cbc31ccda6', fishDrawn: 'a4a35d12110ba10e0fd6d01e', invDrawn: 'fa4c6c214f777c9bfa8d47a3'},
  'restored+101': {fish: '496a82e928cf2068e704672c', inBelt: '5e4868e5efdd642c31230071', inverts: 'fdb37169cadf392541358ad9', fishDrawn: '0af4c048df545b8f34b1cf75', invDrawn: 'ac2f481e2fe43922dba153a8'},
  'restored+977': {fish: '620d434bb60adc4e95bca11f', inBelt: '1fb4a66e99484158ad96ae68', inverts: '4a5ef9b87b353b692b3494b8', fishDrawn: '8d3d88e3c9a87dde119fa485', invDrawn: '9fd46f5c34c7875ed09aface'},
};

describe('belt map: no animal moved, resized, renamed, dimmed or marked', () => {
  const SEEDS = [0, 101, 977];
  function digests() {
    const out = {};
    for (const id of IDS) for (const off of SEEDS) {
      const site = X.siteById(id), seed = site.seed + off;
      const L = X.buildTransect(site, seed), inv = I.buildInverts(site, seed);
      const fishMap = render({ section: 'survey', surveySiteId: id, surveySeed: seed, surveyStage: 'fish' }).querySelector('svg[data-belt-map]');
      const invMap = render({ section: 'survey', surveySiteId: id, surveySeed: seed, surveyStage: 'inverts' }).querySelector('svg[data-inv-map]');
      out[id + '+' + off] = {
        fish: sha(JSON.stringify(L.fish)),
        inBelt: sha(JSON.stringify(L.fish.filter((f) => f.inBelt).map((f) => f.id))),
        inverts: sha(JSON.stringify(inv.animals)),
        fishDrawn: sha([...fishMap.querySelectorAll('g[data-fish]')].map((g) => g.outerHTML).join('')),
        invDrawn: sha([...invMap.querySelectorAll('g[data-inv]')].map((g) => g.outerHTML).join('')),
      };
    }
    return out;
  }
  it('keeps every position, identity, size and in-belt set byte-identical to the base copy, on several seeds', () => {
    if (process.env.SV9_PRINT_PINS) console.log('PINS ' + JSON.stringify(digests()));
    expect(digests()).toEqual(PINNED);
  });
  it('draws the animals above all water and shading, with nothing over or around them', () => {
    for (const stage of ['fish', 'inverts']) {
      const map = render({ section: 'survey', surveySiteId: 'reserve', surveyStage: stage }).querySelector(stage === 'fish' ? 'svg[data-belt-map]' : 'svg[data-inv-map]');
      const sel = stage === 'fish' ? 'g[data-fish]' : 'g[data-inv]';
      const group = map.querySelector(sel).parentElement;
      const kids = [...map.children];
      // Nothing but the metre band comes after the animals, and it sits below the floor.
      const after = kids.slice(kids.indexOf(group) + 1);
      after.forEach((n) => { if (n.tagName === 'rect') expect(+n.getAttribute('y')).toBeGreaterThanOrEqual(208); else expect(n.tagName).toBe('text'); });
      expect(group.getAttribute('opacity')).toBe(null);
      [...group.children].forEach((g) => { expect(g.getAttribute('opacity')).toBe(null); expect(g.getAttribute('filter')).toBe(null); expect(g.getAttribute('style')).toBe(null); });
      expect(map.querySelector('[data-belt-bottom] [data-fish], [data-belt-bottom] [data-inv]')).toBe(null);
    }
  });
  it('adds no mark that tells in from out: one shading edge and one belt line, at the same place as before', () => {
    const map = render({ section: 'survey', surveySiteId: 'reserve', surveyStage: 'fish' }).querySelector('svg[data-belt-map]');
    const top = 112 - 2.5 * 19, bot = 112 + 2.5 * 19;
    const edged = [...map.children].filter((n) => n.tagName === 'path' && (n.getAttribute('d') || '').includes('V' + top) || (n.getAttribute('d') || '').startsWith('M14 ' + top));
    expect(edged.length).toBe(3); // the shading outside, the belt under-stroke, the dashed belt line
    edged.forEach((n) => expect(n.getAttribute('d')).toContain(String(bot)));
  });
  it('draws the same bottom kinds as the transect: bottom detail adds no animal and no text', () => {
    const bottom = render({ section: 'survey', surveySiteId: 'harbor', surveyStage: 'fish' }).querySelector('[data-belt-bottom]');
    expect(bottom.querySelector('text, g')).toBe(null);
  });
  it('uses one caustics pattern id per map copy, in user space', () => {
    const doc = render({ section: 'survey', surveySiteId: 'reserve', surveyStage: 'fish' });
    const ids = [...doc.querySelectorAll('[id]')].map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    const pat = doc.querySelector('svg[data-belt-map] pattern');
    expect(pat.getAttribute('patternUnits') || pat.getAttribute('patternunits')).toBe('userSpaceOnUse');
  });
});

describe('site cards: the setting and nothing else', () => {
  const cards = (doc) => [...doc.querySelectorAll('button[data-sv9-site]')];
  it('draws five picture cards, each with a hidden scene and the reef name as its only text', () => {
    const doc = render({ section: 'survey', surveySiteId: 'harbor' });
    const list = cards(doc);
    expect(list.map((b) => b.getAttribute('data-sv9-site'))).toEqual(IDS);
    list.forEach((b) => {
      const art = b.querySelector('svg[data-sv9-art]');
      expect(art.getAttribute('aria-hidden')).toBe('true');
      expect(art.querySelector('text')).toBe(null);
      expect(b.getAttribute('tabindex')).toBe(null);
    });
    expect(list[0].textContent).toBe('Outer reef in a no-take reserve');
    expect(list[4].textContent).toBe('Rubble field, 4 years after Reef Stars');
  });
  it('marks the chosen reef by aria-pressed and a tick shape, not colour alone', () => {
    for (const theme of ['light', 'dark', 'contrast']) {
      const list = cards(render({ section: 'survey', surveySiteId: 'heatwave' }, theme));
      expect(list.map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'true', 'false', 'false']);
      expect(list.map((b) => !!b.querySelector('[data-sv9-check]'))).toEqual([false, false, true, false, false]);
    }
  });
  it('draws no coral, seaweed or fish hooks, and each picture is the same whatever the transect or records', () => {
    const scene = (data) => { const out = {}; cards(render(Object.assign({ section: 'survey' }, data))).forEach((b) => { const a = b.querySelector('svg[data-sv9-art]'); a.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id')); out[b.getAttribute('data-sv9-site')] = a.innerHTML.replace(/url\(#[^)]*\)/g, 'url(#)'); }); return out; };
    const plain = scene({ surveySiteId: 'reserve' });
    const { r } = all('rubble', X.siteById('rubble').seed);
    const other = scene({ surveySiteId: 'rubble', surveySeed: 99, records: r, surveyStage: 'results', fishCounts: { grouper: 9 } });
    expect(other).toEqual(plain);
    Object.values(plain).forEach((html) => expect(html).not.toMatch(/data-fish|data-spot|seaweed|polyps|crb-cat/));
  });
  it('gives the reserve, the harbor and the heatwave the same plain reef outline, so none looks better or worse stocked', () => {
    const doc = render({ section: 'survey' });
    const reef = (id) => doc.querySelector('svg[data-sv9-art="' + id + '"] [data-sv9-reef]').getAttribute('d');
    expect(reef('harbor')).toBe(reef('reserve'));
    expect(reef('heatwave')).toBe(reef('reserve'));
  });
  it('shows the setting each card promises', () => {
    const doc = render({ section: 'survey' });
    const art = (id) => doc.querySelector('svg[data-sv9-art="' + id + '"]');
    expect(art('reserve').querySelector('[data-sv9-buoy]')).toBeTruthy();
    expect(art('harbor').querySelector('[data-sv9-plume]')).toBeTruthy();
    expect(art('heatwave').querySelector('[data-sv9-sun]')).toBeTruthy();
    expect(art('restored').querySelector('[data-sv9-frames]')).toBeTruthy();
    expect(art('rubble').querySelector('[data-sv9-frames]')).toBe(null);
  });
  it('adds a sixth card for a modeled reef with its year', () => {
    const model = X.siteFromModelYear({ year: 5, coral: 0.3, bleached: 0, killed: 0, algae: 0.1 }, X.scenarioSettings('recent'), 77, 77);
    const list = cards(render({ section: 'survey', surveySiteId: 'reserve', modelSite: model }));
    expect(list.length).toBe(6);
    expect(list[5].textContent).toContain('(year 5)');
  });
  it('switches reef by mouse and by the keyboard-reachable native button, and keeps the warning flow', async () => {
    let data = { coralReef: { section: 'survey', surveySiteId: 'reserve', records: { 0: 'rock' } } };
    const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host);
    function Shell() { const [state, setState] = React.useState(data); data = state; return window.StemLab._registry.coralReef.render({ React, toolData: state, setToolData: setState, t: (k, f) => f || k, theme: 'light', announceToSR: () => {} }); }
    mounted.push({ host, root });
    await React.act(async () => root.render(React.createElement(Shell)));
    const card = host.querySelector('button[data-sv9-site="harbor"]');
    expect(card.tagName).toBe('BUTTON');
    await React.act(async () => { card.focus(); card.click(); });
    expect(host.querySelector('[role="alert"]').textContent).toContain('Switching reefs clears them');
    expect(data.coralReef.surveySiteId).toBe('reserve');
    const yes = [...host.querySelectorAll('button')].find((b) => b.textContent === 'Switch and clear my records');
    await React.act(async () => yes.click());
    expect(data.coralReef.surveySiteId).toBe('harbor');
    expect(host.querySelector('button[data-sv9-site="harbor"]').getAttribute('aria-pressed')).toBe('true');
  });
});

describe('counts beside the map', () => {
  it('puts map, counts and keys in that order in one grid, for fish and invertebrates, on map and list views', () => {
    for (const data of [{ surveyStage: 'fish' }, { surveyStage: 'fish', fishView: 'list' }, { surveyStage: 'inverts' }, { surveyStage: 'inverts', invView: 'list' }]) {
      const doc = render(Object.assign({ section: 'survey' }, data));
      const grid = doc.querySelector('.sv9-grid');
      const parts = [...grid.children].map((n) => n.className);
      expect(parts.slice(0, 2)).toEqual(['sv9-main', 'sv9-side']);
      const counts = grid.querySelectorAll('.sv9-side input[type="number"]');
      expect(counts.length).toBe(data.surveyStage === 'fish' ? 5 : 9);
      if (data.fishView === 'list' || data.invView === 'list') {
        expect(grid.querySelector('.sv9-main table')).toBeTruthy();
        expect(grid.querySelector('.sv9-main svg[data-belt-map], .sv9-main svg[data-inv-map]')).toBe(null);
      } else {
        expect(grid.querySelector('.sv9-main svg[data-belt-map], .sv9-main svg[data-inv-map]')).toBeTruthy();
        expect(grid.querySelector('.sv9-keys [aria-label="What the bottom drawings show"]')).toBeTruthy();
      }
    }
  });
  it('holds the list view rows and the distance columns as they were', () => {
    const site = X.SITES[0], L = X.buildTransect(site, site.seed);
    const doc = render({ section: 'survey', surveyStage: 'fish', fishView: 'list' });
    expect(doc.querySelectorAll('.sv9-main tbody tr').length).toBe(L.fish.length);
  });
  it('switches side by side by a container query, so a narrow host keeps the stacked order', () => {
    const css = render({ section: 'survey', surveyStage: 'fish' }).documentElement.innerHTML;
    expect(css).toMatch(/@container sv9work \(min-width:960px\)/);
    expect(css).toMatch(/\.sv9-side\{grid-area:side;position:sticky/);
  });
});

describe('the 40 tiles', () => {
  it('keeps one button per point with one tab stop, in tape rows of 10 or 20', () => {
    const doc = render({ section: 'survey', pointIndex: 3 });
    const tb = doc.querySelector('[role="toolbar"].sv9-tiles');
    const list = [...tb.querySelectorAll('button.crb-pt')];
    expect(list.length).toBe(40);
    expect(list.filter((b) => b.getAttribute('tabindex') === '0').length).toBe(1);
    expect(list[3].getAttribute('aria-current')).toBe('true');
    const html = doc.documentElement.innerHTML;
    expect(html).toMatch(/\.sv9-tiles\{display:grid;grid-template-columns:repeat\(10,/);
    expect(html).toMatch(/@container sv9tiles \(min-width:640px\)\{[^}]*repeat\(20,/);
  });
  it('still moves by arrow keys and jumps by click', async () => {
    let data = { coralReef: { section: 'survey', surveySiteId: 'reserve', pointIndex: 5 } };
    const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host);
    function Shell() { const [state, setState] = React.useState(data); data = state; return window.StemLab._registry.coralReef.render({ React, toolData: state, setToolData: setState, t: (k, f) => f || k, theme: 'light', announceToSR: () => {} }); }
    mounted.push({ host, root });
    await React.act(async () => root.render(React.createElement(Shell)));
    const tb = host.querySelector('[role="toolbar"]');
    await React.act(async () => { tb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); });
    expect(data.coralReef.pointIndex).toBe(6);
    expect(document.activeElement).toBe(host.querySelectorAll('.crb-pt')[6]);
    await React.act(async () => { tb.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })); });
    expect(data.coralReef.pointIndex).toBe(39);
    await React.act(async () => host.querySelectorAll('.crb-pt')[20].click());
    expect(data.coralReef.pointIndex).toBe(20);
  });
});

describe('results band: only what was recorded', () => {
  const band = (doc) => doc.querySelector('[data-sv9-band]');
  const stat = (doc, id) => band(doc).querySelector('[data-sv9-stat="' + id + '"] dd').textContent;
  const fractions = (cover) => { const o = {}; Object.keys(cover).forEach((k) => { if (k !== '_recorded') o[k] = cover[k] / 100; }); return o; };

  it('comes first on Results and carries the focus heading', () => {
    const doc = results('reserve', all('reserve', X.siteById('reserve').seed).r);
    const stage = doc.querySelector('[data-sv9-band]');
    expect(stage.querySelector('[data-survey-stage-title="results"]')).toBeTruthy();
    expect(doc.querySelectorAll('[data-survey-stage-title="results"]').length).toBe(1);
    expect(stage.compareDocumentPosition(doc.querySelector('[data-srv-key-hidden], [data-transect-strip]')) & 4).toBe(4);
  });
  it('shows the numbers of the same functions the table uses, and draws the spots yearSpots gives, on all sites', () => {
    for (const id of IDS) {
      const seed = X.siteById(id).seed, { L, r } = all(id, seed);
      const rec = {}; Object.keys(r).forEach((k) => { rec[k] = (+k % 9 === 2) ? 'sand' : r[k]; });
      const counts = { parrotfish: 3, surgeonfish: 11, butterflyfish: 0, grouper: 5, snapper: 7 };
      const doc = results(id, rec, { fishCounts: counts }), score = X.scoreSurvey(L, rec, counts), mine = X.indicators(score.cover);
      expect(stat(doc, 'live').startsWith(mine.liveCoral + '%'), id).toBe(true);
      expect(stat(doc, 'weed').startsWith(mine.macroalgae + '%'), id).toBe(true);
      expect(stat(doc, 'fish').startsWith(String(score.fish.reduce((a, f) => a + f.counted, 0))), id).toBe(true);
      const want = X.yearSpots(fractions(score.cover));
      const art = doc.querySelector('svg[data-sv9-art-reef]');
      const drawn = [...art.querySelectorAll('[data-sv9-spot]')];
      expect(drawn.length, id + ' exactly 24 spots, the scene spots replaced').toBe(24);
      drawn.forEach((g) => expect(g.getAttribute('data-sv9-cat'), id + ' spot').toBe(want.spots[+g.getAttribute('data-sv9-spot')]));
      expect(art.querySelector('[data-spot]'), id + ' no model spots left').toBe(null);
      expect(+art.getAttribute('data-sv9-live')).toBe(want.counts.hard_coral + want.counts.bleached_coral);
      expect(art.getAttribute('data-sv9-none')).toBe('0');
      // Fish: one drawn per fish counted, also past the year picture's places.
      FISH.forEach((fam) => expect(art.querySelectorAll('[data-sv9-fish="' + fam + '"]').length, id + ' ' + fam).toBe(counts[fam]));
      expect(art.querySelector('[data-fish]')).toBe(null);
    }
  });
  it('draws no fish before the fish are counted, and says so; a survey marked done with no entries reads 0', () => {
    const { r } = all('reserve', X.siteById('reserve').seed);
    const none = results('reserve', r);
    expect(stat(none, 'fish')).toBe('Not counted yet');
    expect(none.querySelector('svg[data-sv9-art-reef] [data-sv9-fish]')).toBe(null);
    expect(stat(results('reserve', r, { srvFishDone: true }), 'fish').startsWith('0')).toBe(true);
  });
  it('does not read unrecorded points as zero or as rock', () => {
    const { L } = firstN('reserve', 0);
    const rec = { 0: 'sand', 1: 'sand', 2: 'sand', 3: 'sand', 4: 'hard_coral' };
    const doc = results('reserve', rec), score = X.scoreSurvey(L, rec, {});
    const art = doc.querySelector('svg[data-sv9-art-reef]'), cats = [...art.querySelectorAll('[data-sv9-spot]')].map((g) => g.getAttribute('data-sv9-cat'));
    expect(cats.length).toBe(24);
    expect(cats.filter((c) => c === 'rock').length, 'no rock was recorded').toBe(0);
    expect(cats.filter((c) => c === 'macroalgae').length).toBe(0);
    expect(cats.filter((c) => c === 'hard_coral').length).toBe(1);
    expect(cats.filter((c) => c === 'sand').length).toBe(2);
    expect(cats.filter((c) => c === 'unrecorded').length).toBe(21);
    expect(band(doc).querySelector('[data-sv9-progress]').textContent).toBe('5 of 40 points recorded.');
    expect(stat(doc, 'live').startsWith(X.indicators(score.cover).liveCoral + '%')).toBe(true);
    expect(stat(doc, 'weed')).toBe('None recorded so far');
    expect(band(doc).textContent).not.toMatch(/\b0%/);
    expect(band(doc).textContent).toContain('so far');
    expect(art.getAttribute('aria-label')).toContain('21 not recorded yet');
  });
  it('with nothing recorded shows no number at all', () => {
    const doc = results('reserve', {});
    expect(stat(doc, 'live')).toBe('Not recorded yet');
    expect(stat(doc, 'weed')).toBe('Not recorded yet');
    expect(band(doc).querySelector('dl').textContent).not.toMatch(/%/);
    expect(band(doc).querySelector('svg[data-sv9-art-reef]').getAttribute('data-sv9-none')).toBe('24');
  });
  it('fills the same share of spots as the records, in steps, for every partial length', () => {
    const { r } = all('heatwave', X.siteById('heatwave').seed);
    for (const n of [1, 2, 3, 7, 13, 20, 33, 39]) {
      const rec = {}; for (let i = 0; i < n; i++) rec[i] = r[i];
      const art = results('heatwave', rec).querySelector('svg[data-sv9-art-reef]');
      const none = +art.getAttribute('data-sv9-none');
      expect(24 - none, n + ' points').toBe(Math.max(1, Math.round(n * 24 / 40)));
    }
  });
  it('cannot leak the reef key: with the same records it is the same on any reef or transect, finished or not', () => {
    const { r } = all('reserve', X.siteById('reserve').seed);
    const part = {}; for (let i = 0; i < 17; i++) part[i] = r[i];
    const strip = (d) => band(d).outerHTML.replace(/crb-sv9b-[A-Za-z0-9_-]+/g, 'u').replace(/(id|href)="[^"]*"/g, '');
    for (const rec of [part, r]) {
      const a = results('reserve', rec), b = results('harbor', rec), c = results('reserve', rec, { surveySeed: 31337 });
      expect(strip(b)).toBe(strip(a));
      expect(strip(c)).toBe(strip(a));
    }
    // The reef key's own words stay out of the band, and hidden on a partial survey.
    const doc = results('reserve', part);
    expect(band(doc).textContent).not.toMatch(/reef key/i);
    expect(doc.querySelector('[data-srv-key-hidden]')).toBeTruthy();
  });
  it('labels the picture, uses unique ids, and contains no duplicate keys when two copies render', () => {
    const { r } = all('reserve', X.siteById('reserve').seed);
    const doc = results('reserve', r);
    const art = doc.querySelector('svg[data-sv9-art-reef]');
    expect(art.getAttribute('role')).toBe('img');
    expect(art.getAttribute('aria-label')).toMatch(/^Drawing made from your records/);
    const ids = [...doc.querySelectorAll('[id]')].map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('has English with no long dashes and every new string with its English in the source', () => {
    const src = readFileSync(TOOL, 'utf8');
    const keys = src.match(/__alloT\('stem\.coralreef\.sv9_[a-z_]+', '[^']+'\)/g) || [];
    expect(keys.length).toBeGreaterThan(5);
    keys.forEach((k) => expect(k).not.toMatch(/[–—]/));
    expect(src).not.toMatch(/__alloT\('stem\.coralreef\.sv9_[a-z_]+'\)/);
  });
});
