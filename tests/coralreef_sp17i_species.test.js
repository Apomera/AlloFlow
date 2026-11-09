import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Round 17: four Indo-Pacific reef species. The greater blue-ringed octopus
// (warning colours, venom, look but never touch), Bedford's flatworm (a
// flatworm that looks like a sea slug), the galaxy coral (raised, star-like
// cups; sweeper tentacles) and the finger coral (a branching Porites, same
// genus as the massive boulder coral). Guide data, sources, population, the
// food web and the coral field study. No absolute totals are pinned.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const SOURCE = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const INVERTS = ['blue_ringed_octopus', 'bedfords_flatworm'], CORALS = ['galaxy_coral', 'finger_coral'], IDS = INVERTS.concat(CORALS);
const f = (k, v) => v;
let loadTool, resetStemLab, React, ReactDOMClient, X, TX, P;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, React, ReactDOMClient } = mod);
});
const mounted = [];
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  vi.spyOn(Date, 'now').mockReturnValue(1720000000000);
  loadTool(SOURCE, 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef; TX = X.speciesText(f); P = X.marineProfiles(f);
});
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } vi.restoreAllMocks(); });
const meta = (id) => X.SPECIES_META.find((m) => m.id === id);
const words = (id) => [TX[id].name, TX[id].role, TX[id].fact].concat(TX[id].marks).join(' ');

describe('sp17i guide entries', () => {
  it('adds four new species, with Red List statuses, after birdsnest coral, and duplicates no existing scientific name', () => {
    const ids = X.SPECIES_META.map((m) => m.id), at = ids.indexOf('birdsnest_coral');
    expect(ids.slice(at + 1, at + 5)).toEqual(IDS);
    expect(IDS.map((id) => [meta(id).group, meta(id).scientific, meta(id).iucn, meta(id).iucnYear])).toEqual([
      ['invertebrate', 'Hapalochlaena lunulata', 'LC', 2014], ['invertebrate', 'Pseudobiceros bedfordi', 'NE', null],
      ['coral', 'Galaxea fascicularis', 'LC', 2023], ['coral', 'Porites cylindrica', 'LC', 2023]]);
    const others = X.SPECIES_META.filter((m) => !IDS.includes(m.id) && m.scientific).map((m) => m.scientific.toLowerCase());
    for (const id of IDS) {
      const genusSpecies = meta(id).scientific.toLowerCase();
      expect(others.some((s) => s.includes(genusSpecies)), id + ' not already in the catalog').toBe(false);
      expect(meta(id).lookalikes.length, id).toBeGreaterThan(0);
      for (const other of meta(id).lookalikes) { expect(ids, id).toContain(other); expect(other).not.toBe(id); }
      const choices = X.idChoices(id, 'sp17i');
      expect(choices, id).toContain(id); expect(new Set(choices).size).toBe(3);
    }
    // The other finger and branching corals are different species, not the same one again.
    expect(meta('boulder_coral').scientific).toMatch(/massive/);
    expect(meta('finger_coral').lookalikes[0]).toBe('boulder_coral');
    expect(meta('bedfords_flatworm').lookalikes[0]).toBe('nudibranch');
    expect(meta('blue_ringed_octopus').lookalikes[0]).toBe('day_octopus');
  });

  it('gives four field marks and plain, honest text without special dashes', () => {
    for (const id of IDS) {
      const t = TX[id];
      expect(t.marks, id).toHaveLength(4);
      for (const mark of t.marks) expect(mark.length, id).toBeGreaterThan(20);
      expect(/[‐-―]/.test(words(id) + P[id].habitat + P[id].diet + P[id].behavior + P[id].observe), id + ' dash').toBe(false);
      expect(X.marinePracticeClues(t, meta(id)), id).toHaveLength(4);
    }
    // Venomous, said calmly, with what to do.
    expect(TX.blue_ringed_octopus.role).toMatch(/warning.*venomous.*never touch/);
    expect(TX.blue_ringed_octopus.marks.join(' ')).toMatch(/About 60 blue rings/);
    expect(TX.blue_ringed_octopus.marks.join(' ')).toMatch(/dark border/);
    expect(TX.blue_ringed_octopus.fact).toMatch(/tetrodotoxin/);
    expect(TX.blue_ringed_octopus.fact).toMatch(/shy/);
    expect(words('blue_ringed_octopus')).not.toMatch(/deadly|kill|lethal/i);
    // A flatworm, not a sea slug: the gills are the test.
    expect(TX.bedfords_flatworm.fact).toMatch(/flatworm, not a mollusc/);
    expect(TX.bedfords_flatworm.fact).toMatch(/look for gills/);
    expect(TX.bedfords_flatworm.marks.join(' ')).toMatch(/folds of the body edge/);
    expect(TX.galaxy_coral.marks.join(' ')).toMatch(/septa .*stick up above its rim/);
    expect(TX.galaxy_coral.fact).toMatch(/sweeper tentacles, up to 30 times longer/);
    expect(TX.finger_coral.role).toMatch(/same genus, Porites, as the boulder coral/);
    expect(TX.finger_coral.fact).toMatch(/Shape alone cannot tell you the genus/);
  });

  it('writes every new string with its English, so no raw key can show', () => {
    const src = readFileSync(SOURCE, 'utf8');
    for (const id of IDS) {
      const calls = src.match(new RegExp("__alloT\\((['\"])stem\\.coralreef\\.(sp|dx)_" + id + "_[a-z0-9_]+\\1\\s*,", 'g')) || [];
      expect(calls.length, id + ' keys with English').toBeGreaterThanOrEqual(id.endsWith('coral') ? 10 : 11);
      expect(new RegExp("__alloT\\((['\"])stem\\.coralreef\\.(sp|dx)_" + id + "_[a-z0-9_]+\\1\\s*\\)").test(src), id + ' one-argument call').toBe(false);
    }
  });

  it('explains the flatworm body plan, and reuses the stony coral note for both corals', () => {
    const notes = X.marineAnimalGroupNotes(f);
    expect(notes.bedfords_flatworm.label).toMatch(/Flatworm: not a sea slug/);
    expect(notes.bedfords_flatworm.text).toMatch(/Platyhelminthes.*molluscs/);
    expect(new URL(notes.bedfords_flatworm.source.url).hostname).toBe('www.marinespecies.org');
    for (const id of CORALS) expect(notes[id]).toEqual(notes.birdsnest_coral);
    expect(notes.blue_ringed_octopus).toBeUndefined();
  });
});

describe('sp17i profiles and sources', () => {
  it('cites every profile source, with WoRMS for each and the IUCN assessment for each listed status', () => {
    const all = X.marineProfileSources(), ids = all.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of IDS) {
      const p = P[id], cited = X.marineEntrySources(p);
      for (const k of ['habitat', 'diet', 'behavior', 'observe']) expect(p[k].length, id + ' ' + k).toBeGreaterThan(40);
      expect(cited.map((s) => s.id), id).toEqual(p.sources);
      for (const s of cited) { expect(/^https?:$/.test(new URL(s.url).protocol), s.id).toBe(true); expect(s.text.length, s.id).toBeGreaterThan(40); }
      expect(cited.some((s) => /marinespecies\.org/.test(s.url)), id + ' WoRMS').toBe(true);
      expect(cited.find((s) => /marinespecies\.org/.test(s.url)).text, id).toContain(meta(id).scientific);
      if (meta(id).iucn === 'NE') { expect(cited.some((s) => /Not Evaluated/.test(s.text)), id + ' NE cited').toBe(true); continue; }
      const iucn = cited.find((s) => /iucnredlist\.org/.test(s.url));
      expect(iucn, id + ' IUCN source').toBeTruthy();
      expect(iucn.text).toContain(meta(id).scientific);
      expect(iucn.text).toMatch(new RegExp('Least Concern \\(assessed [0-9 A-Za-z]*' + meta(id).iucnYear));
    }
  });

  it('keeps the key numbers with the sources that state them', () => {
    const src = Object.fromEntries(X.marineProfileSources().map((s) => [s.id, s]));
    expect(src['dx-mathger-blue_ringed_octopus'].text).toMatch(/about 60 iridescent blue rings as a warning/);
    expect(src['dx-mathger-blue_ringed_octopus'].url).toBe('https://doi.org/10.1242/jeb.076869');
    expect(src['dx-ttx-blue_ringed_octopus'].text).toMatch(/posterior salivary glands.*not in the arms/);
    expect(P.blue_ringed_octopus.behavior).toMatch(/not in the arms/);
    expect(src['dx-sweeper-galaxy_coral'].text).toMatch(/up to 30 times longer than catch tentacles/);
    expect(src['dx-naturalis-porites'].text).toMatch(/less than 2 mm/);
    expect(TX.finger_coral.marks.join(' ')).toMatch(/less than 2 mm/);
    expect(src['dx-adw-bedfords_flatworm'].text).toMatch(/8 to 10 cm long and about 1 mm thick/);
    for (const id of CORALS) { expect(P[id].observe, id).toContain('hard coral (HC)'); expect(P[id].sources, id).toContain('dx-reefcheck-hc-builders'); }
    expect(P.galaxy_coral.observe).toMatch(/septa standing above its rim/);
  });
});

describe('sp17i on the dive', () => {
  const count = (pop, id) => (pop.find((p) => p.id === id) || { count: 0 }).count;
  const site = (id) => X.EXPLORE_SITES.find((s) => s.id === id);
  it('places them right after feather_duster_worm, a few on the healthy reef, none on the damaged reef', () => {
    expect(IDS.map((id) => X.POPULATION[id])).toEqual([[1, 0.3], [1, 0.3], [1, 1], [2, 1]]);
    const keys = Object.keys(X.POPULATION), at = keys.indexOf(IDS[0]);
    expect(keys.slice(at, at + 4)).toEqual(IDS);
    expect(at).toBeGreaterThan(keys.indexOf('feather_duster_worm'));
    expect(at + 4).toBeLessThanOrEqual(keys.indexOf('acropora_clathrata'));
    const healthy = X.populationFor(site('healthy')), damaged = X.populationFor(site('damaged'));
    expect(IDS.map((id) => count(healthy, id))).toEqual([1, 1, 1, 2]);
    for (const id of IDS) expect(count(damaged, id), id).toBe(0);
    // Both corals need live coral cover, like the other photosynthetic corals.
    const bare = { ...site('healthy'), health: { coralCover: 0, bleaching: 0.9, algae: 0.2 } };
    for (const id of CORALS) expect(count(X.populationFor(bare), id), id).toBe(0);
    for (const id of INVERTS) expect(count(X.populationFor(bare), id), id).toBeGreaterThan(0);
  });
});

describe('sp17i food web', () => {
  it('puts the blue-ringed octopus in the middle of the web, eating small animals, cited at the level its source supports', () => {
    const src = readFileSync(SOURCE, 'utf8');
    // The middle row gains other animals over time; what matters is that the octopus is in it, once.
    const midRow = (src.match(/\{ id: 'mid', ids: \[([^\]]*)\] \}/) || [])[1] || '';
    expect(midRow.split(',').map((s) => s.trim()).filter((s) => s === "'blue_ringed_octopus'")).toHaveLength(1);
    expect(src.includes("fwLink('blue_ringed_octopus', 'small_animals', 'eats', ['dx-am-blue_ringed_octopus'], { scope: 'kind' })")).toBe(true);
    const am = X.marineProfileSources().find((s) => s.id === 'dx-am-blue_ringed_octopus');
    expect(am.text).toMatch(/crabs and small fishes/);
    // No other new species is drawn into the web.
    for (const id of ['bedfords_flatworm', 'galaxy_coral', 'finger_coral']) expect(src.includes("fwLink('" + id)).toBe(false);
  });
});

describe('sp17i coral field study', () => {
  const q = (t, s) => t.host.querySelector(s);
  async function click(el) { expect(el).toBeTruthy(); await React.act(async () => { el.focus(); el.click(); }); }
  async function select(el, value) { await React.act(async () => { el.focus(); el.value = value; el.dispatchEvent(new Event('change', { bubbles: true })); }); }
  it('compares raised star cups, tiny flat cups, a mound and fingers', async () => {
    const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host);
    const f2 = (k, v) => v;
    function Shell() { const [data, setData] = React.useState({ coralReef: { section: 'guide' } }); return window.StemLab._registry.coralReef.render({ React, toolData: data, setToolData: setData, t: f2, reduceMotion: true }); }
    const t = { host, root }; mounted.push(t);
    await React.act(async () => root.render(React.createElement(Shell)));
    await click(q(t, '[data-start-practice]')); await select(q(t, '[data-practice-collection-select]'), 'study_coral_cups');
    expect(q(t, '[data-practice-field-study]').dataset.practiceFieldStudy).toBe('study_coral_cups');
    expect([...t.host.querySelectorAll('[data-practice-study-organism]')].map((el) => el.dataset.practiceStudyOrganism)).toEqual(['galaxy_coral', 'finger_coral', 'boulder_coral']);
    expect(q(t, '[data-practice-count]').textContent).toContain('share a genus');
  });
});
