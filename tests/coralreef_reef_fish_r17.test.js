import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// Four Indo-Pacific reef fish (round 17, lane fish): a foxface rabbitfish (a grazer that
// lives in pairs and takes turns on watch), a leopard coral grouper (the coral trout of the
// no-take reserve story), a dash-and-dot goatfish (a sand sifter with chemical-sense
// barbels) and a sixbar wrasse (a wing-finned swimmer of wave-swept reefs). Facts and
// sources: lane_fish/NOTES.md (WoRMS, Fishes of Australia, FishBase quoting the IUCN Red
// List, Australian Museum, Hoey et al. 2013, Brandl and Bellwood 2015, Emslie et al. 2015,
// Fulton et al. 2005 and 2017). Other lanes add species at the same time, so nothing here
// pins a catalog or population total.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const SOURCE = readFileSync(TOOL, 'utf8');
const IDS = ['foxface_rabbitfish', 'leopard_coral_grouper', 'dash_and_dot_goatfish', 'sixbar_wrasse'];
const META = {
  foxface_rabbitfish: { group: 'fish', scientific: 'Siganus vulpinus', iucn: 'LC', iucnYear: 2015, lookalikes: [] },
  leopard_coral_grouper: { group: 'fish', scientific: 'Plectropomus leopardus', iucn: 'LC', iucnYear: 2016, lookalikes: ['peacock_grouper'] },
  dash_and_dot_goatfish: { group: 'fish', scientific: 'Parupeneus barberinus', iucn: 'LC', iucnYear: 2015, lookalikes: [] },
  sixbar_wrasse: { group: 'fish', scientific: 'Thalassoma hardwicke', iucn: 'LC', iucnYear: 2008, lookalikes: [] }
};
const APHIA = { foxface_rabbitfish: 273929, leopard_coral_grouper: 218261, dash_and_dot_goatfish: 218660, sixbar_wrasse: 212217 };
const REDLIST = {
  foxface_rabbitfish: /Least Concern assessment dated 12 March 2015/,
  leopard_coral_grouper: /Least Concern assessment dated 20 November 2016/,
  dash_and_dot_goatfish: /Least Concern assessment dated 11 March 2015/,
  sixbar_wrasse: /Least Concern assessment dated 12 June 2008/
};
const DASHES = /[‐-―]/;
let X, W, text, profiles, sources;
beforeAll(() => {
  const w = { StemLab: { isRegistered: () => false, registerTool() {} }, __RR_TEST_EXPORTS__: {} };
  vm.runInNewContext(SOURCE, { window: w, Math, Object, JSON, Array, Number, String, Date, URL });
  X = w.__RR_TEST_EXPORTS__.coralReef; W = w.__RR_TEST_EXPORTS__.coralReefWeb;
  text = X.speciesText((key, fallback) => fallback); profiles = X.marineProfiles((key, fallback) => fallback); sources = X.marineProfileSources();
});

describe('round 17 reef fish: guide data', () => {
  it('registers each once, together after the dusky farmerfish, with its accepted name and dated Red List status', () => {
    const ids = X.SPECIES_META.map(m => m.id), at = ids.indexOf(IDS[0]);
    expect(ids.slice(at, at + IDS.length)).toEqual(IDS);
    expect(at).toBe(ids.indexOf('dusky_farmerfish') + 1);
    expect(at + IDS.length).toBeLessThanOrEqual(ids.indexOf('acropora_clathrata'));
    for (const id of IDS) {
      expect(X.SPECIES_META.filter(m => m.id === id), id).toHaveLength(1);
      expect(X.SPECIES_META.find(m => m.id === id)).toMatchObject(META[id]);
      for (const look of META[id].lookalikes) expect(ids, look).toContain(look);
    }
    // None duplicates an existing scientific name.
    const names = X.SPECIES_META.map(m => m.scientific).filter(Boolean);
    for (const id of IDS) expect(names.filter(n => n === META[id].scientific), id).toHaveLength(1);
  });

  it('teaches four sourced field marks, a role and a fact, in plain words without dashes', () => {
    for (const id of IDS) {
      const t = text[id];
      expect(t.marks, id).toHaveLength(4);
      for (const s of [t.name, t.role, t.fact, ...t.marks]) { expect(DASHES.test(s), id + ': ' + s).toBe(false); expect(s.length, id).toBeGreaterThan(10); }
    }
    const marks = id => text[id].marks.join(' ');
    expect(text.foxface_rabbitfish.name).toBe('Foxface rabbitfish');
    expect(marks('foxface_rabbitfish')).toMatch(/black band runs from the mouth through the eye up to the start of the back fin/);
    expect(marks('foxface_rabbitfish')).toMatch(/black patch on the chest/);
    expect(marks('foxface_rabbitfish')).toMatch(/venomous/);
    expect(text.foxface_rabbitfish.fact).toMatch(/take turns standing guard.*head up.*swap/);
    expect(text.leopard_coral_grouper.name).toMatch(/^Leopard coral grouper/);
    expect(marks('leopard_coral_grouper')).toMatch(/small, round, bright blue spots/);
    expect(marks('leopard_coral_grouper')).toMatch(/narrow white rear edge/);
    expect(text.leopard_coral_grouper.fact).toMatch(/closed to fishing.*more and bigger coral trout on the protected reefs/);
    expect(marks('dash_and_dot_goatfish')).toMatch(/black spot, bigger than the eye, at the base of the tail/);
    expect(marks('dash_and_dot_goatfish')).toMatch(/barbels under the chin/);
    expect(text.dash_and_dot_goatfish.fact).toMatch(/chemical sense organs/);
    expect(marks('sixbar_wrasse')).toMatch(/Six dark, wedge-shaped bars.*shorter than the one in front/);
    expect(marks('sixbar_wrasse')).toMatch(/pink bands spread out from the eye/);
    expect(text.sixbar_wrasse.fact).toMatch(/up to 15 times more common than any other wrasse/);
  });

  it('gives every profile field substance and resolves each bibliography entry exactly once', () => {
    for (const id of IDS) {
      const p = profiles[id];
      for (const field of ['habitat', 'diet', 'behavior', 'observe']) { expect(p[field].length, id + ' ' + field).toBeGreaterThan(25); expect(DASHES.test(p[field]), id + ' ' + field).toBe(false); }
      expect(p.sources.length, id).toBeGreaterThanOrEqual(4);
      expect(X.marineEntrySources(p).map(s => s.id)).toEqual(p.sources);
      for (const key of p.sources) {
        const s = sources.find(e => e.id === key);
        expect(s?.url, key).toMatch(/^https:\/\//); expect(s.text.length, key).toBeGreaterThan(40);
        expect(sources.filter(e => e.id === key), key).toHaveLength(1);
      }
      expect(sources.find(s => s.id === 'dx-worms-' + id).url).toBe('https://www.marinespecies.org/aphia.php?p=taxdetails&id=' + APHIA[id]);
      expect(sources.find(s => s.id === 'dx-fishbase-' + id).text).toMatch(REDLIST[id]);
    }
    expect(sources.find(s => s.id === 'dx-vigilance-foxface_rabbitfish').url).toBe('https://doi.org/10.1038/srep14556');
    expect(sources.find(s => s.id === 'dx-reserves-leopard_coral_grouper').url).toBe('https://doi.org/10.1016/j.cub.2015.01.073');
    expect(sources.find(s => s.id === 'dx-waves-sixbar_wrasse').text).toMatch(/up to 15 times/);
    expect(profiles.foxface_rabbitfish.behavior).toMatch(/80 out of every 100 adults were in pairs/);
    expect(profiles.leopard_coral_grouper.observe).toMatch(/Compare the peacock grouper/);
    expect(profiles.dash_and_dot_goatfish.behavior).toMatch(/tucks them away under its gill covers/);
  });

  it('compares the coral trout with the peacock grouper and keeps practice clues anonymous', () => {
    expect(X.marineComparisonPair('leopard_coral_grouper')).toEqual(['leopard_coral_grouper', 'peacock_grouper']);
    for (const id of IDS) {
      const meta = X.SPECIES_META.find(m => m.id === id), clues = X.marinePracticeClues(text[id], meta);
      expect(clues, id).toHaveLength(4);
      const joined = clues.join(' ').toLowerCase();
      for (const word of ['rabbitfish', 'foxface', 'grouper', 'coral trout', 'goatfish', 'wrasse', meta.scientific.toLowerCase()]) expect(joined.includes(word), id + ' names ' + word).toBe(false);
      for (let u = 0; u < 12; u++) { const c = X.idChoices(id, 'p' + u); expect(c).toHaveLength(3); expect(c).toContain(id); if (meta.lookalikes[0]) expect(c).toContain(meta.lookalikes[0]); }
    }
  });

  it('writes every new string as a two-argument __alloT call with a stem.coralreef key', () => {
    for (const id of IDS) {
      const keys = ['name', 'mark1', 'mark2', 'mark3', 'mark4', 'role', 'fact'].map(k => 'sp_' + id + '_' + k).concat(['habitat', 'diet', 'behavior', 'observe'].map(k => 'dx_' + id + '_' + k));
      for (const key of keys) {
        const all = SOURCE.split('"stem.coralreef.' + key + '"').length - 1, twoArg = (SOURCE.match(new RegExp('__alloT\\("stem\\.coralreef\\.' + key + '", "')) || []).length;
        expect(all, key).toBe(1); expect(twoArg, key).toBe(1);
      }
    }
  });
});

describe('round 17 reef fish: the dive population, food web and roles', () => {
  it('adds them after the feather duster worm and before the Acropora entries, with sensible site counts', () => {
    const keys = Object.keys(X.POPULATION), at = keys.indexOf(IDS[0]);
    expect(keys.slice(at, at + IDS.length)).toEqual(IDS);
    expect(at).toBeGreaterThan(keys.indexOf('feather_duster_worm')); expect(at + IDS.length).toBeLessThanOrEqual(keys.indexOf('acropora_clathrata'));
    expect(X.POPULATION).toMatchObject({ foxface_rabbitfish: [2, 0.6], leopard_coral_grouper: [1, 0.5], dash_and_dot_goatfish: [1, 0.1], sixbar_wrasse: [1, 0.4] });
    const site = id => X.populationFor(X.EXPLORE_SITES.find(s => s.id === id)), count = (p, id) => p.find(e => e.id === id)?.count || 0;
    const healthy = site('healthy'), damaged = site('damaged');
    // A healthy reef holds one foxface pair and one of each of the others.
    expect(IDS.map(id => count(healthy, id))).toEqual([2, 1, 1, 1]);
    // Coral-rich fish thin out on the damaged reef; the pair is broken up.
    expect(count(damaged, 'foxface_rabbitfish')).toBe(1);
    expect(count(damaged, 'leopard_coral_grouper')).toBe(0);
    for (const s of ['restoration', 'heatwave']) for (const id of IDS) expect(count(site(s), id), s + ' ' + id).toBeGreaterThanOrEqual(1);
  });

  it('draws the coral trout as a hunter of reef fish and the foxface as an algae eater, each link sourced', () => {
    expect(W, 'food web exports').toBeTruthy();
    const links = W.LINKS, has = (from, to) => links.some(l => l.from === from && l.to === to && l.kind === 'eats');
    expect(W.ROWS.find(r => r.id === 'top').ids).toContain('leopard_coral_grouper');
    expect(W.ROWS.find(r => r.id === 'grazers').ids).toContain('foxface_rabbitfish');
    expect(has('leopard_coral_grouper', 'reef_fishes')).toBe(true);
    expect(has('leopard_coral_grouper', 'small_animals')).toBe(true);
    expect(has('foxface_rabbitfish', 'algae')).toBe(true);
    expect(has('foxface_rabbitfish', 'detritus')).toBe(true);
    for (const l of links.filter(x => IDS.includes(x.from))) for (const s of l.sources) expect(profiles[l.from].sources, l.from + ' cites ' + s).toContain(s);
    // The prepared cases keep their answers with the new eaters in the table.
    const dir = (id, g) => W.caseResult(W.CASES.find(c => c.id === id)).groups.find(x => x.id === g).dir;
    expect(dir('grazers', 'algae')).toBe('more'); expect(dir('sharks', 'reef_fishes')).toBe('more'); expect(dir('farmer', 'algae')).toBe('more');
  });

  it('lists the foxface with the algae grazers in the guide roles', () => {
    // marineGuideRoleCollections is not exported; read its grazers row from the source.
    const row = /\{ id: 'grazers', label: __alloT\('stem\.coralreef\.dr_grazers', 'Algae and seagrass grazers'\), ids: \[([^\]]*)\] \}/.exec(SOURCE);
    expect(row, 'grazers role row').toBeTruthy();
    const ids = row[1].split(',').map(s => s.trim().replace(/'/g, ''));
    expect(ids).toContain('foxface_rabbitfish');
    for (const id of ids) expect(X.SPECIES_META.some(m => m.id === id), id).toBe(true);
  });
});

describe('round 17 reef fish: the guide page', () => {
  let loadTool, resetStemLab, React, ReactDOMClient;
  const mounted = [];
  beforeAll(async () => {
    const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
    ({ loadTool, resetStemLab, React, ReactDOMClient } = mod);
    resetStemLab(); loadTool(TOOL, 'coralReef');
  });
  afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } });
  async function mount(seed) {
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
    function Shell() { const [toolData, setToolData] = React.useState({ coralReef: { section: 'guide', ...seed } }); return cfg.render({ React, toolData, setToolData, t: (k, f) => f || k, announceToSR() {} }); }
    mounted.push({ host, root });
    await React.act(async () => root.render(React.createElement(Shell)));
    return host;
  }
  it('shows each new fish in the species guide with its marks and dated Red List line', async () => {
    const host = await mount({ guideCompact: false });
    expect(host.querySelector('.crds-guide'), 'the guide, not the hub').toBeTruthy();
    const page = host.textContent;
    for (const id of IDS) {
      expect(page.includes(text[id].name), id).toBe(true);
      expect(page.includes(META[id].scientific), id).toBe(true);
    }
    expect(page.includes('Least Concern (2016)')).toBe(true);
  });
});
