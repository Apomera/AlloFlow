import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const NEW_SPECIES = ['porcelain_anemone_crab', 'varicose_phyllidia', 'broadclub_cuttlefish',
  'blackspotted_puffer', 'ocellated_eagle_ray', 'textile_cone', 'orange_cup_coral',
  'banded_sea_krait', 'white_spotted_hermit_crab', 'longfin_bannerfish', 'bigfin_reef_squid',
  'goldmouth_sea_squirt', 'feather_duster_worm'];
const PHOTOSYNTHETIC_CORALS = ['brain_coral', 'staghorn_coral', 'table_coral', 'mushroom_coral',
  'boulder_coral', 'cauliflower_coral', 'foliose_coral'];
let X, Species;
const count = (population, id) => population.find(entry => entry.id === id)?.count || 0;
const total = population => population.reduce((sum, entry) => sum + entry.count, 0);
const site = id => X.EXPLORE_SITES.find(entry => entry.id === id);

beforeAll(() => {
  const win = { StemLab: { isRegistered: () => false, registerTool() {} }, __RR_TEST_EXPORTS__: {} };
  vm.runInNewContext(readFileSync(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'utf8'), { window: win });
  X = win.__RR_TEST_EXPORTS__.coralReef;
  const catalog = {};
  vm.runInNewContext(readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'), { window: catalog });
  Species = catalog.Reef3DSpecies;
});

describe('explicit reef population diversity', () => {
  it('assigns every modeled living guide entry a deliberate count and dependency without adding restoration structures', () => {
    const living = X.SPECIES_META.filter(meta => meta.group !== 'structure');
    expect([...Species.ids].sort()).toEqual(X.SPECIES_META.map(meta => meta.id).sort());
    expect(Object.keys(X.POPULATION).sort()).toEqual(living.map(meta => meta.id).sort());
    for (const meta of living) {
      const definition = X.POPULATION[meta.id];
      expect(Object.hasOwn(X.POPULATION, meta.id), meta.id).toBe(true);
      expect(definition, meta.id).toHaveLength(2);
      expect(Number.isInteger(definition[0]), meta.id).toBe(true);
      expect(definition[0], meta.id).toBeGreaterThan(0);
      expect(Number.isFinite(definition[1]), meta.id).toBe(true);
      expect(definition[1], meta.id).toBeGreaterThanOrEqual(0);
      expect(definition[1], meta.id).toBeLessThanOrEqual(1);
      expect(Species.info(meta.id).group, meta.id).toBe(meta.group);
    }
    for (const meta of X.SPECIES_META.filter(meta => meta.group === 'structure')) expect(Object.hasOwn(X.POPULATION, meta.id)).toBe(false);
  });

  it('appends a modest set of new organisms while retaining the existing population order and healthy scene budget', () => {
    const oldIds = X.SPECIES_META.filter(meta => meta.group !== 'structure' && !NEW_SPECIES.includes(meta.id)).map(meta => meta.id);
    expect(oldIds).toHaveLength(63);
    expect(Object.keys(X.POPULATION)).toEqual([...oldIds, ...NEW_SPECIES]);
    const healthy = X.populationFor(site('healthy'));
    for (const id of NEW_SPECIES) {
      expect(count(healthy, id), id).toBeGreaterThanOrEqual(1);
      expect(count(healthy, id), id).toBeLessThanOrEqual(3);
    }
    expect(NEW_SPECIES.reduce((sum, id) => sum + count(healthy, id), 0)).toBe(23);
    expect(total(healthy.filter(entry => !NEW_SPECIES.includes(entry.id)))).toBe(216);
    expect(total(healthy)).toBeLessThanOrEqual(240);
  });

  it('keeps all four sites and a model-derived dive deterministic, unique, bounded, and free of implicit restoration units', () => {
    const settings = X.scenarioSettings('recent');
    const row = X.runScenario(settings, 4)[10];
    const model = X.exploreSiteFromModel(row, settings);
    expect(model.health.coralCover).toBeCloseTo(row.coral, 9);
    const original = JSON.stringify({ population: X.POPULATION, sites: X.EXPLORE_SITES, model });
    for (const location of [...X.EXPLORE_SITES, model]) {
      const population = X.populationFor(location);
      expect(X.populationFor(location), location.id).toEqual(population);
      expect(new Set(population.map(entry => entry.id)).size, location.id).toBe(population.length);
      expect(total(population), location.id).toBeGreaterThan(20);
      expect(total(population), location.id).toBeLessThanOrEqual(240);
      for (const entry of population) {
        expect(Number.isInteger(entry.count), entry.id).toBe(true);
        expect(entry.count, entry.id).toBeGreaterThan(0);
        expect(Species.info(entry.id)?.group, entry.id).not.toBe('structure');
        expect(Object.hasOwn(X.POPULATION, entry.id), entry.id).toBe(true);
      }
      expect(count(population, 'porcelain_anemone_crab')).toBeLessThanOrEqual(count(population, 'magnificent_anemone'));
    }
    expect(JSON.stringify({ population: X.POPULATION, sites: X.EXPLORE_SITES, model })).toBe(original);
  });

  it('preserves degraded reef contrasts and permits low-abundance species to disappear instead of forcing every species into every site', () => {
    const healthy = X.populationFor(site('healthy')), damaged = X.populationFor(site('damaged'));
    expect(total(damaged)).toBeLessThan(total(healthy));
    expect(damaged.length).toBeLessThan(healthy.length);
    expect(count(damaged, 'threadfin_butterflyfish')).toBeLessThan(count(healthy, 'threadfin_butterflyfish'));
    for (const id of ['crown_of_thorns', 'long_spined_urchin']) expect(count(damaged, id), id).toBeGreaterThan(count(healthy, id));
    expect(count(damaged, 'broadclub_cuttlefish')).toBe(0);
    const coralTotal = population => PHOTOSYNTHETIC_CORALS.reduce((sum, id) => sum + count(population, id), 0);
    expect(coralTotal(healthy)).toBe(54); expect(coralTotal(damaged)).toBe(5);
  });

  it('keeps nonphotosynthetic orange cup coral distinct from live-coral-dependent colonies and bleaching states', () => {
    const bare = { ...site('healthy'), health: { coralCover: 0, bleaching: 0.9, algae: 0.2 } };
    const population = X.populationFor(bare);
    for (const id of PHOTOSYNTHETIC_CORALS) {
      expect(count(population, id), id).toBe(0);
      expect(Species.info(id).healthStates, id).toContain('bleached');
    }
    expect(count(population, 'orange_cup_coral')).toBeGreaterThan(0);
    expect(Species.info('orange_cup_coral').healthStates).toEqual(['healthy', 'dead']);
    const heat = { ...site('healthy'), health: { ...site('healthy').health, bleaching: 0.9 } };
    expect(X.populationFor(heat)).toEqual(X.populationFor(site('healthy')));
  });

  it('caps host-dependent crabs to actual anemones and omits them when the host population is absent', () => {
    const hostDefinition = X.POPULATION.magnificent_anemone;
    try {
      X.POPULATION.magnificent_anemone = [1, 0.4];
      const sparse = X.populationFor(site('healthy'));
      expect(count(sparse, 'magnificent_anemone')).toBe(1);
      expect(count(sparse, 'porcelain_anemone_crab')).toBe(1);
      X.POPULATION.magnificent_anemone = [0, 0.4];
      const noHost = X.populationFor(site('healthy'));
      expect(noHost.some(entry => entry.id === 'magnificent_anemone')).toBe(false);
      expect(noHost.some(entry => entry.id === 'porcelain_anemone_crab')).toBe(false);
    } finally { X.POPULATION.magnificent_anemone = hostDefinition; }
  });
});
