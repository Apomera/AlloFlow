import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { cleanup, census, runtime, site, POP } from './helpers/reef_dive_harness.js';

let X, TX;
const additions = ['firefish', 'copperband_butterflyfish'];
beforeAll(() => {
  const win = { StemLab: { isRegistered: () => false, registerTool() {} }, __RR_TEST_EXPORTS__: {} };
  vm.runInNewContext(readFileSync('stem_lab/stem_tool_coralreef.js', 'utf8'), { window: win, Math, Object, JSON, Array, Number, String, Date, URL });
  X = win.__RR_TEST_EXPORTS__.coralReef;
  TX = X.speciesText((key, fallback) => fallback);
});
afterEach(cleanup);

describe('expanded reef specimen collection', () => {
  it('provides both new specimens with complete sourced profiles, readable field marks and packaged portraits', () => {
    const profiles = X.marineProfiles((key, fallback) => fallback);
    const sourceIds = X.marineProfileSources().map(s => s.id);
    const scientific = ['Nemateleotris magnifica', 'Chelmon rostratus'];
    additions.forEach((id, i) => {
      expect(X.SPECIES_META.find(m => m.id === id)).toMatchObject({ group: 'fish', scientific: scientific[i] });
      expect(TX[id].marks.length).toBeGreaterThanOrEqual(3);
      expect(TX[id].marks.every(mark => mark.length > 15)).toBe(true);
      for (const field of ['habitat', 'diet', 'behavior', 'observe']) expect(profiles[id][field].length).toBeGreaterThan(25);
      expect(profiles[id].sources.length).toBeGreaterThan(0);
      for (const source of profiles[id].sources) expect(sourceIds).toContain(source);
      for (const prefix of ['', 'desktop/web-app/public/']) expect(existsSync(prefix + 'stem_lab/assets/coralreef/species/' + id + '.webp')).toBe(true);
    });
  });

  it('includes each newcomer in a small saved identification round without changing discovery data', () => {
    const log = { green_turtle: { firstSeen: 10 } };
    const bookmarks = { firefish: true, copperband_butterflyfish: true };
    const before = JSON.stringify({ log, bookmarks });
    const ids = X.marinePracticeCollectionIds(X.SPECIES_META, 'saved', bookmarks, []);
    expect([...ids].sort()).toEqual([...additions].sort());
    for (const seed of [1, 5, 20]) {
      const round = X.buildMarinePracticeRound(X.SPECIES_META, seed, ids, []);
      expect(round.map(q => q.id).sort()).toEqual([...additions].sort());
      for (const q of round) {
        const choices = X.idChoices(q.id, 'new-' + seed);
        expect(choices).toContain(q.id);
        expect(new Set(choices).size).toBe(3);
      }
    }
    expect(JSON.stringify({ log, bookmarks })).toBe(before);
  });

  it('appends encounters without changing the existing population entries', () => {
    const ids = Object.keys(X.POPULATION);
    const first = ids.indexOf(additions[0]);
    expect(first).toBeGreaterThan(0);
    expect(ids.slice(first, first + 2)).toEqual(additions);
    const healthy = X.EXPLORE_SITES.find(s => s.id === 'healthy');
    const population = X.populationFor(healthy);
    for (const id of additions) expect(population.find(p => p.id === id).count).toBeGreaterThan(0);
  });

  it('keeps established reef placement exact when the new swimmers are appended, and permits read-only lookup', () => {
    const old = runtime({ paused: true, site: site({ population: POP }) });
    const previous = census(old);
    const expanded = runtime({ paused: true, site: site({ population: [...POP, ...additions.map(id => ({ id, count: 2 }))] }) });
    expect(census(expanded).filter(o => !additions.includes(o.speciesId))).toEqual(previous);
    for (const id of additions) {
      const before = expanded.state();
      const found = expanded.controller.findSpecies(id);
      expect(found).toMatchObject({ speciesId: id });
      expect(Number.isFinite(found.distanceM)).toBe(true);
      expect(expanded.state()).toEqual(before);
    }
  }, 60000);
});
