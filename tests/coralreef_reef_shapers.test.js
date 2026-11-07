import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

// Four small animals that shape a reef: a coral-eating snail, a coral-eating
// sea star, a sponge-eating sea slug and a cleaner shrimp. Robust to other
// lanes adding species at the same time: no catalog or population totals.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const IDS = ['drupella_snail', 'pincushion_sea_star', 'spanish_dancer', 'banded_coral_shrimp'];
const SCIENTIFIC = { drupella_snail: 'Drupella cornus', pincushion_sea_star: 'Culcita novaeguineae', spanish_dancer: 'Hexabranchus sanguineus (species complex)', banded_coral_shrimp: 'Stenopus hispidus' };
const LOOKALIKES = { drupella_snail: ['giant_triton', 'textile_cone'], pincushion_sea_star: ['crown_of_thorns', 'chocolate_chip_sea_star'], spanish_dancer: ['nudibranch', 'varicose_phyllidia'], banded_coral_shrimp: ['cleaner_shrimp', 'harlequin_shrimp'] };
const NAMES = /drupella|drupe|culcita|pincushion|cushion|hexabranchus|spanish|dancer|stenopus|boxer|banded coral/i;
const mounted = [];
let X, TX, profiles, sources;
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef;
  TX = X.speciesText((key, fallback) => fallback); profiles = X.marineProfiles((key, fallback) => fallback); sources = X.marineProfileSources();
});
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); }
});
async function mountGuide() {
  let data = { coralReef: { section: 'guide', speciesBookmarks: { drupella_snail: true }, speciesFieldNotes: { spanish_dancer: 'Six gills at the back' }, speciesLog: { clownfish: { firstSeen: 1 } } } };
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() { const [state, setState] = React.useState(data); data = state; return cfg.render({ React, toolData: state, setToolData: setState, t: (key, fallback) => fallback || key, reduceMotion: true }); }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell))); return t;
}
async function select(element, value) { expect(element).toBeTruthy(); await React.act(async () => { element.value = value; element.dispatchEvent(new Event('change', { bubbles: true })); }); }
const ownText = (id) => [TX[id].name, ...TX[id].marks, TX[id].role, TX[id].fact, profiles[id].habitat, profiles[id].diet, profiles[id].behavior, profiles[id].observe];

describe('reef shapers: catalog entries', () => {
  it('adds four Not Evaluated invertebrates with honest metadata and meaningful look-alikes', () => {
    for (const id of IDS) {
      const meta = X.SPECIES_META.find(m => m.id === id);
      expect(meta, id).toMatchObject({ group: 'invertebrate', scientific: SCIENTIFIC[id], iucn: 'NE', iucnYear: null });
      expect(meta.lookalikes, id).toEqual(LOOKALIKES[id]);
      for (const other of meta.lookalikes) expect(X.SPECIES_META.some(m => m.id === other), other).toBe(true);
      expect(X.marineComparisonPair(id)).toEqual([id, LOOKALIKES[id][0]]);
    }
    // Not already covered by an existing entry under another id.
    const named = X.SPECIES_META.filter(m => !IDS.includes(m.id)).map(m => String(m.scientific || ''));
    for (const id of IDS) expect(named.some(s => s.indexOf(SCIENTIFIC[id].split(' (')[0]) >= 0), id).toBe(false);
  });

  it('gives four anonymous field marks, plain sourced profiles and no special dashes', () => {
    for (const id of IDS) {
      const meta = X.SPECIES_META.find(m => m.id === id), clues = X.marinePracticeClues(TX[id], meta);
      expect(TX[id].marks).toHaveLength(4);
      expect(clues, id).toHaveLength(4); expect(new Set(clues).size).toBe(4);
      expect(clues.every(clue => clue.length > 25), id).toBe(true);
      expect(clues.join(' '), id).not.toMatch(NAMES);
      for (const field of ['habitat', 'diet', 'behavior', 'observe']) expect(profiles[id][field].length, id + ' ' + field).toBeGreaterThan(35);
      for (const line of ownText(id)) expect(line, id).not.toMatch(/[‐-―−]/);
      expect(profiles[id].sources.length, id).toBeGreaterThanOrEqual(3);
      expect(new Set(profiles[id].sources).size).toBe(profiles[id].sources.length);
      for (const key of profiles[id].sources) {
        const source = sources.find(s => s.id === key);
        expect(source?.url, key).toMatch(/^https:\/\//); expect(source.text.length, key).toBeGreaterThan(40);
        expect(source.text, key).not.toMatch(/[–—]/);
      }
      expect(profiles[id].sources.some(key => /^dx-worms-/.test(key)), id + ' cites WoRMS').toBe(true);
      // The Not Evaluated listing is cited, not assumed.
      expect(profiles[id].sources.map(key => sources.find(s => s.id === key).text).join(' '), id).toMatch(/Not Evaluated/);
    }
  });

  it('teaches the diagnostic biology of each animal', () => {
    expect(TX.drupella_snail.marks.join(' ')).toMatch(/knobbly.*nodules.*group.*white patches of bare coral skeleton/);
    expect(profiles.drupella_snail.diet).toMatch(/^Only living coral/);
    expect(profiles.drupella_snail.behavior).toMatch(/Ningaloo.*still working out/);
    expect(profiles.drupella_snail.observe).toMatch(/giant triton/);
    expect(TX.pincushion_sea_star.marks.join(' ')).toMatch(/pentagonal.*barely see.*five grooves.*star-shaped/);
    expect(profiles.pincushion_sea_star.observe).toMatch(/crown-of-thorns.*both eat living coral.*Colour alone is not enough/);
    expect(profiles.pincushion_sea_star.behavior).toMatch(/one fifth/);
    expect(TX.spanish_dancer.marks.join(' ')).toMatch(/white border.*Six branched.*swim/);
    expect(profiles.spanish_dancer.behavior).toMatch(/cannot be pulled back.*joins the body separately/);
    expect(profiles.spanish_dancer.observe).toMatch(/several similar species/);
    expect(TX.spanish_dancer.fact).toMatch(/egg masses.*flower/);
    expect(TX.banded_coral_shrimp.marks.join(' ')).toMatch(/red and white.*third pair of legs.*antennae.*pair/);
    expect(profiles.banded_coral_shrimp.observe).toMatch(/Pacific cleaner shrimp.*third pair of legs/);
  });

  it('supports saved practice with look-alike choices without changing learner records', () => {
    const bookmarks = Object.fromEntries(IDS.map(id => [id, true])), log = { clownfish: { firstSeen: 1 } }, before = JSON.stringify({ bookmarks, log });
    const saved = X.marinePracticeCollectionIds(X.SPECIES_META, 'saved', bookmarks, []);
    expect(saved.slice().sort()).toEqual(IDS.slice().sort());
    for (const seed of [1, 7, 19]) {
      const round = X.buildMarinePracticeRound(X.SPECIES_META, seed, saved, [], [], 5);
      expect(round.map(q => q.id).sort()).toEqual(IDS.slice().sort());
      for (const question of round) {
        expect(question.choices).toContain(question.id); expect(new Set(question.choices).size).toBe(3);
        expect(question.choices.some(choice => LOOKALIKES[question.id].includes(choice)), question.id).toBe(true);
      }
    }
    expect(JSON.stringify({ bookmarks, log })).toBe(before);
  });
});

describe('reef shapers: populations', () => {
  it('lists the four entries together, before the Acropora entries, in both tables', () => {
    const meta = X.SPECIES_META.map(m => m.id), pop = Object.keys(X.POPULATION);
    for (const ids of [meta, pop]) {
      const at = ids.indexOf(IDS[0]);
      expect(ids.slice(at, at + 4), 'contiguous').toEqual(IDS);
      expect(at, 'after the feather-duster worm').toBeGreaterThan(ids.indexOf('feather_duster_worm'));
      expect(at + 3, 'before the Acropora entries').toBeLessThan(ids.indexOf('acropora_clathrata'));
    }
  });

  it('adds modest, deterministic encounters: one each, and the shrimp as a pair', () => {
    const healthy = X.populationFor(X.EXPLORE_SITES.find(site => site.id === 'healthy'));
    const count = id => healthy.find(entry => entry.id === id)?.count || 0;
    expect(IDS.map(count)).toEqual([1, 1, 1, 2]);
    // The coral eaters depend strongly on live coral; fewer appear on the damaged reef.
    expect(X.POPULATION.drupella_snail[1]).toBeGreaterThan(X.POPULATION.spanish_dancer[1]);
    for (const site of X.EXPLORE_SITES) {
      const first = X.populationFor(site); expect(X.populationFor(site)).toEqual(first);
      for (const id of IDS) expect(first.filter(entry => entry.id === id).length, site.id + ' ' + id).toBeLessThanOrEqual(1);
    }
  });
});

describe('reef shapers: guide', () => {
  it('collects the coral eaters as a featured role with their diet notes and leaves learner records alone', async () => {
    const eaters = { ids: ['crown_of_thorns', 'drupella_snail', 'pincushion_sea_star'] };
    const t = await mountGuide(), before = JSON.stringify(t.data), role = t.host.querySelector('[data-guide-role]');
    const option = [...role.querySelectorAll('option')].find(o => o.value === 'coral_eaters');
    expect(option?.textContent).toContain('Coral eaters');
    await select(role, 'coral_eaters');
    const cards = [...t.host.querySelectorAll('[data-species]')].map(card => card.dataset.species);
    expect(cards.sort()).toEqual(eaters.ids.slice().sort());
    for (const id of eaters.ids) expect(t.host.querySelector('[data-guide-role-note="' + id + '"]').textContent).toBe('What it eats: ' + profiles[id].diet);
    expect(JSON.stringify(t.data)).toBe(before);
  });
});
