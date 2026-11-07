import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Bubble, hammer and flowerpot corals: three fleshy-polyp Indo-Pacific corals
// that show coral polyps are animals with tentacles. Guide data, sourced
// profiles and the healthy-reef population. CORALREEF_SOURCE and
// REEF3D_SPECIES_SOURCE point the suite at a lane copy.
const ADDED = ['bubble_coral', 'hammer_coral', 'flowerpot_coral'];
const SCIENTIFIC = { bubble_coral: 'Plerogyra sinuosa', hammer_coral: 'Fimbriaphyllia ancora', flowerpot_coral: 'Goniopora columna' };
let X, Species, TX, profiles, sources;
const tr = (key, fallback) => fallback;

beforeAll(() => {
  const win = { StemLab: { isRegistered: () => false, registerTool() {} }, __RR_TEST_EXPORTS__: {} };
  vm.runInNewContext(readFileSync(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'utf8'), { window: win });
  X = win.__RR_TEST_EXPORTS__.coralReef;
  const catalog = {};
  vm.runInNewContext(readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'), { window: catalog });
  Species = catalog.Reef3DSpecies;
  TX = X.speciesText(tr); profiles = X.marineProfiles(tr); sources = X.marineProfileSources();
});
const meta = (id) => X.SPECIES_META.find((m) => m.id === id);
const allText = (id) => [TX[id].name, TX[id].role, TX[id].fact, ...TX[id].marks, profiles[id].habitat, profiles[id].diet, profiles[id].behavior, profiles[id].observe];

describe('fleshy-polyp corals: guide entries', () => {
  it('registers each coral once, right after the orange cup coral, with Red List data and real look-alikes', () => {
    const ids = X.SPECIES_META.map((m) => m.id), at = ids.indexOf('orange_cup_coral');
    expect(ids.slice(at + 1, at + 4)).toEqual(ADDED);
    for (const id of ADDED) {
      expect(ids.filter((x) => x === id)).toHaveLength(1);
      expect(meta(id)).toMatchObject({ group: 'coral', scientific: SCIENTIFIC[id], iucn: 'LC', iucnYear: 2023 });
      expect(meta(id).lookalikes.length).toBeGreaterThanOrEqual(1);
      expect(meta(id).lookalikes.length).toBeLessThanOrEqual(2);
      for (const l of meta(id).lookalikes) { expect(ids, id + ' lookalike ' + l).toContain(l); expect(l).not.toBe(id); }
    }
    // WoRMS: Euphyllia ancora is a superseded combination of Fimbriaphyllia ancora.
    expect(meta('hammer_coral').scientificAliases).toEqual(['Euphyllia ancora']);
    expect(X.marineComparisonPair('bubble_coral')).toEqual(['bubble_coral', 'hammer_coral']);
    expect(X.marineComparisonPair('flowerpot_coral')).toEqual(['flowerpot_coral', 'orange_cup_coral']);
  });

  it('gives four field marks, a role and a fact in plain words that teach polyps and tentacles', () => {
    for (const id of ADDED) {
      const t = TX[id];
      expect(t.marks).toHaveLength(4);
      expect(new Set(t.marks).size).toBe(4);
      expect(t.role.length).toBeGreaterThan(40);
      expect(t.fact.length).toBeGreaterThan(60);
      for (const s of allText(id)) { expect(/[–—‑]/.test(s), id + ' dash: ' + s).toBe(false); expect(s, id).not.toMatch(/\s{2}/); }
      expect([t.role, ...t.marks].join(' '), id + ' names its algae partners or tentacles').toMatch(/algae|tentacle/i);
      // Anonymous practice clues never state the answer.
      const clues = X.marinePracticeClues(t, meta(id));
      expect(clues).toHaveLength(4);
      expect(clues.join(' ').toLowerCase()).not.toContain(t.name.replace(/\s*\(.*$/, '').toLowerCase());
      expect(clues.join(' ')).not.toContain(SCIENTIFIC[id]);
    }
    expect(TX.bubble_coral.marks.join(' ')).toMatch(/grape-sized, water-filled vesicles.*At night the vesicles shrink/);
    expect(TX.bubble_coral.fact).toContain('photosynthetic organs');
    expect(TX.hammer_coral.marks[0]).toMatch(/T-shaped or anchor-shaped tips/);
    expect(TX.hammer_coral.marks.join(' ')).toContain('by day and by night');
    expect(TX.hammer_coral.fact).toMatch(/2017.*Euphyllia to Fimbriaphyllia/);
    expect(TX.flowerpot_coral.marks[0]).toContain('24 tentacles');
    expect(TX.flowerpot_coral.fact).toMatch(/24.*Alveopora has 12/);
  });

  it('writes a sourced marine profile for each coral, with https sources listed once', () => {
    const ids = sources.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ADDED) {
      const p = profiles[id];
      for (const field of ['habitat', 'diet', 'behavior', 'observe']) expect(p[field].length, id + ' ' + field).toBeGreaterThan(60);
      expect(p.sources.length).toBeGreaterThanOrEqual(5);
      expect(new Set(p.sources).size).toBe(p.sources.length);
      for (const key of p.sources) {
        const s = sources.find((x) => x.id === key);
        expect(s, key).toBeTruthy();
        expect(s.url, key).toMatch(/^https:\/\//);
        expect(s.text.length, key).toBeGreaterThan(40);
      }
      // Every profile cites WoRMS, a Corals of the World factsheet, SeaLifeBase and the Red List.
      for (const site of ['worms', 'cotw', 'slb', 'iucn']) expect(p.sources, id + ' ' + site).toContain('dx-' + site + '-' + id);
    }
    expect(profiles.bubble_coral.sources).toContain('dx-meps-bubble_coral');
    expect(sources.find((s) => s.id === 'dx-meps-bubble_coral').url).toBe('https://doi.org/10.3354/meps007273');
    expect(sources.find((s) => s.id === 'dx-worms-hammer_coral').url).toContain('id=1048073');
    expect(profiles.hammer_coral.sources).toEqual(expect.arrayContaining(['dx-oca-hammer_coral', 'dx-peerj-hammer_coral']));
    expect(profiles.flowerpot_coral.sources).toContain('dx-naturalis-flowerpot_coral');
    expect(profiles.bubble_coral.habitat).toContain('0 to 40 m');
    expect(profiles.hammer_coral.habitat).toContain('0 to 40 m');
    expect(profiles.flowerpot_coral.habitat).toContain('2 to 18 m');
    expect(profiles.bubble_coral.behavior).toContain('three tentacles open at the base of each one');
    expect(profiles.bubble_coral.observe).toContain('daytime form');
  });

  it('finds the hammer coral by its older scientific name', () => {
    const id = 'hammer_coral';
    expect(X.marineGuideSearch('Euphyllia ancora', TX[id], meta(id), profiles[id])).toBe(true);
    expect(X.marineGuideSearch('Fimbriaphyllia', TX[id], meta(id), profiles[id])).toBe(true);
    expect(X.marineGuideSearch('Goniopora', TX[id], meta(id), profiles[id], 'names')).toBe(false);
  });
});

describe('fleshy-polyp corals: reef population', () => {
  it('adds small, coral-dependent counts to the healthy reef and stays deterministic', () => {
    expect(X.POPULATION.bubble_coral).toEqual([1, 1]);
    expect(X.POPULATION.hammer_coral).toEqual([1, 1]);
    expect(X.POPULATION.flowerpot_coral).toEqual([2, 1]);
    // New species sit together between feather_duster_worm and the Acropora entries.
    const keys = Object.keys(X.POPULATION), last = keys.indexOf('acropora_clathrata'), at = keys.indexOf(ADDED[0]);
    expect(keys.slice(at, at + 3)).toEqual(ADDED);
    expect(at).toBeGreaterThan(keys.indexOf('feather_duster_worm')); expect(at + 3).toBeLessThanOrEqual(last);
    const healthy = X.populationFor(X.EXPLORE_SITES.find((s) => s.id === 'healthy')), count = (pop, id) => (pop.find((e) => e.id === id) || {}).count || 0;
    expect(ADDED.map((id) => count(healthy, id))).toEqual([1, 1, 2]);
    for (const site of X.EXPLORE_SITES) {
      const a = X.populationFor(site);
      expect(X.populationFor(site)).toEqual(a);
      for (const id of ADDED) { expect(a.filter((e) => e.id === id).length).toBeLessThanOrEqual(1); expect(count(a, id)).toBeLessThanOrEqual(2); }
    }
    // Coral dependence 1: a reef with little coral cover keeps fewer of these corals.
    const damaged = X.populationFor(X.EXPLORE_SITES.find((s) => s.id === 'damaged'));
    expect(ADDED.reduce((n, id) => n + count(damaged, id), 0)).toBeLessThan(ADDED.reduce((n, id) => n + count(healthy, id), 0));
  });

  it('matches the 3D catalogue: same ids, group and three coral health states', () => {
    for (const id of ADDED) {
      expect(Species.ids).toContain(id);
      expect(Species.info(id)).toMatchObject({ group: 'coral', habit: 'sessile', origin: 'base', healthStates: ['healthy', 'bleached', 'dead'] });
    }
    expect(Species.info('bubble_coral').depthM).toEqual([0, 40]);
    expect(Species.info('hammer_coral').depthM).toEqual([0, 40]);
    expect(Species.info('flowerpot_coral').depthM).toEqual([2, 18]);
  });
});
