import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
import { runtime, census } from './helpers/reef_life_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const additions = ['goldmouth_sea_squirt', 'feather_duster_worm'];
const mounted = [], dives = [];
let X, TX, profiles;
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef;
  TX = X.speciesText((key, fallback) => fallback); profiles = X.marineProfiles((key, fallback) => fallback);
});
afterEach(async () => {
  while (dives.length) dives.pop().dispose();
  while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); }
});
async function mountGuide() {
  let data = { coralReef: { section: 'guide', speciesBookmarks: { goldmouth_sea_squirt: true }, speciesFieldNotes: { feather_duster_worm: 'Two spreading fans' }, speciesLog: { clownfish: { firstSeen: 1 } } } };
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() { const [state, setState] = React.useState(data); data = state; return cfg.render({ React, toolData: state, setToolData: setState, t: (key, fallback) => fallback || key, reduceMotion: true }); }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell))); return t;
}
async function select(element, value) { expect(element).toBeTruthy(); await React.act(async () => { element.value = value; element.dispatchEvent(new Event('change', { bubbles: true })); }); }

describe('tunicate and fan-worm learning integration', () => {
  it('adds distinct, sourced animal profiles and four anonymous diagnostic clues', () => {
    const names = ['Polycarpa aurata', 'Sabellastarte spectabilis'];
    const sources = X.marineProfileSources();
    for (const [i, id] of additions.entries()) {
      const meta = X.SPECIES_META.find(m => m.id === id);
      expect(meta).toMatchObject({ group: 'invertebrate', scientific: names[i], iucn: 'NE', iucnYear: null });
      expect(TX[id].marks).toHaveLength(4);
      const clues = X.marinePracticeClues(TX[id], meta);
      expect(clues).toHaveLength(4); expect(new Set(clues).size).toBe(4);
      expect(clues.every(clue => clue.length > 30)).toBe(true);
      expect(clues.join(' ')).not.toMatch(/Polycarpa|Sabellastarte|gold.?mouth|sea squirt|feather.?duster/i);
      for (const field of ['habitat', 'diet', 'behavior', 'observe']) expect(profiles[id][field].length, id + ' ' + field).toBeGreaterThan(35);
      expect(profiles[id].sources.length).toBeGreaterThanOrEqual(3);
      for (const key of profiles[id].sources) expect(sources.find(source => source.id === key)?.url, key).toMatch(/^https:\/\//);
    }
    expect(TX.goldmouth_sea_squirt.marks.join(' ')).toMatch(/Two separate openings.*siphons/);
    expect(TX.goldmouth_sea_squirt.fact).toMatch(/chordates.*notochord.*no backbone/);
    expect(profiles.goldmouth_sea_squirt.diet).toContain('filtering pharynx');
    expect(TX.feather_duster_worm.marks.join(' ')).toMatch(/two fan-like lobes.*side branches.*bands.*tube/);
    expect(profiles.feather_duster_worm.observe).toContain('not a complete identification key');
    expect(profiles.feather_duster_worm.behavior).toContain('study model shows an extended crown');
  });

  it('supports saved identification practice and meaningful look-alikes without changing discoveries', () => {
    const bookmarks = Object.fromEntries(additions.map(id => [id, true])), log = { clownfish: { firstSeen: 1 } };
    const before = JSON.stringify({ bookmarks, log });
    const saved = X.marinePracticeCollectionIds(X.SPECIES_META, 'saved', bookmarks, []);
    expect(saved).toEqual(additions);
    expect(X.marineComparisonPair(additions[0])).toEqual([additions[0], 'barrel_sponge']);
    expect(X.marineComparisonPair(additions[1])).toEqual([additions[1], 'christmas_tree_worm']);
    for (const seed of [1, 7, 19]) {
      const round = X.buildMarinePracticeRound(X.SPECIES_META, seed, saved, [], [], 5);
      expect(round.map(q => q.id).sort()).toEqual(additions.slice().sort());
      for (const question of round) {
        expect(question.choices).toContain(question.id); expect(new Set(question.choices).size).toBe(3);
        const lookalikes = X.SPECIES_META.find(m => m.id === question.id).lookalikes;
        expect(question.choices.some(choice => lookalikes.includes(choice))).toBe(true);
      }
    }
    expect(JSON.stringify({ bookmarks, log })).toBe(before);
  });

  it('adds only two encounters to the healthy reef and keeps explicit populations deterministic', () => {
    const healthy = X.EXPLORE_SITES.find(site => site.id === 'healthy'), population = X.populationFor(healthy);
    expect(population.reduce((total, entry) => total + entry.count, 0)).toBe(239);
    expect(Object.keys(X.POPULATION).slice(-2)).toEqual(additions);
    for (const id of additions) expect(population.find(entry => entry.id === id)?.count).toBe(1);
    for (const site of X.EXPLORE_SITES) {
      const first = X.populationFor(site); expect(X.populationFor(site)).toEqual(first);
      expect(first.reduce((total, entry) => total + entry.count, 0)).toBeLessThanOrEqual(240);
      for (const id of additions) expect(first.filter(entry => entry.id === id).length).toBeLessThanOrEqual(1);
    }
  });

  it('includes both organisms in plankton feeding and invertebrate browsing without changing learner records', async () => {
    const t = await mountGuide(), before = JSON.stringify(t.data);
    await select(t.host.querySelector('[data-guide-role]'), 'plankton');
    await select(t.host.querySelector('[data-guide-group-filter]'), 'invertebrate');
    const cards = [...t.host.querySelectorAll('[data-species]')];
    expect(cards.map(card => card.dataset.species).sort()).toEqual(['christmas_tree_worm', 'sea_fan', ...additions].sort());
    for (const id of additions) expect(t.host.querySelector('[data-guide-role-note="' + id + '"]').textContent).toBe('What it eats: ' + profiles[id].diet);
    expect(t.data.speciesBookmarks).toEqual(JSON.parse(before).speciesBookmarks);
    expect(t.data.speciesFieldNotes).toEqual(JSON.parse(before).speciesFieldNotes);
    expect(t.data.speciesLog).toEqual(JSON.parse(before).speciesLog);
  });
});

describe('small attached filter feeders in the dive', () => {
  it.each(['real', null])('keeps both organisms discoverable and anchored with species catalog %s', species => {
    const errors = [];
    const t = runtime({ onError: error => errors.push(String(error)), site: { seed: 29, depthM: 9, health: { coralCover: .5, bleaching: 0, algae: .05 }, population: additions.map(id => ({ id, count: 1 })), restoration: null } }, { species });
    dives.push(t);
    expect(t.controller.getState().ready).toBe(true);
    const organisms = census(t);
    expect(organisms.map(o => o.speciesId).sort()).toEqual(additions.slice().sort());
    t.run(.2);
    const positions = Object.fromEntries(census(t).map(o => [o.speciesId, o.pos.toArray()]));
    for (const id of additions) {
      const before = t.controller.getState(), found = t.controller.findSpecies(id);
      expect(found).toMatchObject({ speciesId: id }); expect(Number.isFinite(found.distanceM)).toBe(true);
      expect(found.distanceM).toBeGreaterThanOrEqual(0); expect(typeof found.inView).toBe('boolean');
      expect(t.controller.getState().focused).toBe(before.focused);
      expect(t.controller.getState().navigation).toBe(before.navigation);
      expect(t.controller.focus(found.uid)).toBe(true);
      expect(t.controller.getState().focused).toMatchObject({ uid: found.uid, speciesId: id });
      t.controller.clearFocus();
    }
    t.run(3);
    for (const organism of census(t)) {
      expect(organism.pos.toArray()).toEqual(positions[organism.speciesId]);
      expect(organism.pos.toArray().every(Number.isFinite)).toBe(true);
      if (organism.object) {
        expect(organism.object.matrixWorld.elements.every(Number.isFinite)).toBe(true);
        expect(organism.object.scale.toArray().every(value => Number.isFinite(value) && value > 0)).toBe(true);
      }
    }
    expect(errors).toEqual([]);
  }, 60000);
});
