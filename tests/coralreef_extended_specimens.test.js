import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const additions = ['yellow_longnose_butterflyfish', 'pajama_cardinalfish'];
let X, text, profiles;
beforeAll(() => {
  const w = { StemLab: { isRegistered: () => false, registerTool() {} }, __RR_TEST_EXPORTS__: {} };
  vm.runInNewContext(readFileSync('stem_lab/stem_tool_coralreef.js', 'utf8'), { window: w, Math, Object, JSON, Array, Number, String, Date, URL });
  X = w.__RR_TEST_EXPORTS__.coralReef; text = X.speciesText((k, v) => v); profiles = X.marineProfiles((k, v) => v);
});

describe('longnose butterflyfish and pajama cardinalfish learning integration', () => {
  it('includes diagnostic field marks, sourced profiles, dated status and matching packaged portraits', () => {
    const scientific = ['Forcipiger flavissimus', 'Sphaeramia nematoptera'];
    const years = [2009, 2021];
    const sources = X.marineProfileSources();
    additions.forEach((id, i) => {
      expect(X.SPECIES_META.find(m => m.id === id)).toMatchObject({ group: 'fish', scientific: scientific[i], iucn: 'LC', iucnYear: years[i] });
      expect(text[id].marks).toHaveLength(4);
      for (const field of ['habitat', 'diet', 'behavior', 'observe']) expect(profiles[id][field].length).toBeGreaterThan(25);
      for (const key of profiles[id].sources) expect(sources.find(s => s.id === key)?.url).toMatch(/^https:\/\//);
      expect(profiles[id].sources.some(key => sources.find(s => s.id === key)?.url.includes('iucnredlist.org/species/'))).toBe(true);
      const portrait = readFileSync('stem_lab/assets/coralreef/species/' + id + '.webp');
      expect(portrait.length).toBeGreaterThan(1000);
      expect(portrait.equals(readFileSync('desktop/web-app/public/stem_lab/assets/coralreef/species/' + id + '.webp'))).toBe(true);
    });
    expect(text[additions[0]].marks.join(' ')).toMatch(/snout.*head.*anal fin/);
    expect(text[additions[1]].marks.join(' ')).toMatch(/eye.*bar.*spots.*dorsal fins/);
    expect(X.SPECIES_META.find(m => m.id === additions[0]).lookalikes).toEqual(['copperband_butterflyfish']);
  });

  it('lets a saved collection practice the pair without changing notes, bookmarks or discoveries', () => {
    const bookmarks = Object.fromEntries(additions.map(id => [id, true])), log = { green_turtle: { firstSeen: 1 } };
    const before = JSON.stringify({ bookmarks, log });
    const ids = X.marinePracticeCollectionIds(X.SPECIES_META, 'saved', bookmarks, []);
    expect(ids).toEqual(additions);
    for (const seed of [1, 7, 21]) for (const length of [3, 5, 10]) {
      const round = X.buildMarinePracticeRound(X.SPECIES_META, seed, ids, [], [], length);
      expect(round.map(q => q.id).sort()).toEqual(additions.slice().sort());
      for (const q of round) { expect(q.choices).toContain(q.id); expect(new Set(q.choices).size).toBe(3); }
    }
    expect(JSON.stringify({ bookmarks, log })).toBe(before);
  });

  it('appends encounters after pipefish and makes both specimens available at every survey site', () => {
    const ids = Object.keys(X.POPULATION), start = ids.indexOf('banded_pipefish') + 1;
    expect(start).toBeGreaterThan(0); expect(ids.slice(start, start + 2)).toEqual(additions);
    for (const site of X.EXPLORE_SITES) for (const id of additions) expect(X.populationFor(site).find(p => p.id === id).count).toBeGreaterThan(0);
  });
});
