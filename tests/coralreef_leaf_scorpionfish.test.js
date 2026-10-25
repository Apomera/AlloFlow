import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const id = 'leaf_scorpionfish';
let X, text, profile;
beforeAll(() => {
  const w = { StemLab: { isRegistered: () => false, registerTool() {} }, __RR_TEST_EXPORTS__: {} };
  vm.runInNewContext(readFileSync('stem_lab/stem_tool_coralreef.js', 'utf8'), { window: w, Math, Object, JSON, Array, Number, String, Date, URL });
  X = w.__RR_TEST_EXPORTS__.coralReef;
  text = X.speciesText((key, fallback) => fallback)[id]; profile = X.marineProfiles((key, fallback) => fallback)[id];
});

describe('leaf scorpionfish learning integration', () => {
  it('teaches shape, camouflage and variable colour with an assessed-date conservation label', () => {
    expect(X.SPECIES_META.find(m => m.id === id)).toMatchObject({ group: 'fish', scientific: 'Taenianotus triacanthus', iucn: 'LC', iucnYear: 2015, lookalikes: ['lionfish'] });
    expect(text.marks).toHaveLength(4);
    expect(text.marks.join(' ')).toMatch(/flattened strongly from side to side/);
    expect(text.marks.join(' ')).toMatch(/sail-like.*rounded tail/);
    expect(text.marks.join(' ')).toMatch(/mouth.*eyes/);
    expect(text.marks.join(' ')).toMatch(/fan-shaped/);
    expect(text.fact).toMatch(/sheds.*skin.*colour can change/);
    expect(profile.behavior).toMatch(/rocks with water movement/);
    expect(profile.diet).toMatch(/fishes and crustaceans/);
    expect(profile.observe).toMatch(/Colour varies widely/);
    for (const field of ['habitat', 'diet', 'behavior', 'observe']) expect(profile[field].length).toBeGreaterThan(25);
    const sources = X.marineProfileSources();
    for (const key of profile.sources) expect(sources.find(s => s.id === key)?.url).toMatch(/^https:\/\//);
    expect(sources.find(s => s.id === 'dx-iucn-' + id).text).toMatch(/2016.*Assessed 5 March 2015/);
    const portrait = readFileSync('stem_lab/assets/coralreef/species/' + id + '.webp');
    expect(portrait.length).toBeGreaterThan(1000);
    expect(portrait.equals(readFileSync('desktop/web-app/public/stem_lab/assets/coralreef/species/' + id + '.webp'))).toBe(true);
  });

  it('supports a contrasting scorpionfish pair and anonymous practice without changing discoveries', () => {
    const pair = [id, 'lionfish'], bookmarks = { [id]: true }, log = { green_turtle: { firstSeen: 1 } };
    expect(X.marineComparisonPair(id)).toEqual(pair);
    const meta = X.SPECIES_META.filter(m => pair.includes(m.id));
    const clues = X.marinePracticeClues(text, X.SPECIES_META.find(m => m.id === id));
    expect(clues).toHaveLength(4);
    expect(clues.join(' ').toLowerCase()).not.toContain('taenianotus');
    expect(clues.join(' ').toLowerCase()).not.toContain('leaf scorpionfish');
    const before = JSON.stringify({ bookmarks, log });
    for (const seed of [1, 17, 29]) {
      const round = X.buildMarinePracticeRound(meta, seed, pair, []);
      expect(round.map(q => q.id).sort()).toEqual(pair.slice().sort());
      for (const question of round) expect(question.choices.slice().sort()).toEqual(pair.slice().sort());
      const saved = X.marinePracticeCollectionIds(X.SPECIES_META, 'saved', bookmarks, []);
      const ordinary = X.buildMarinePracticeRound(X.SPECIES_META, seed, saved, []);
      expect(ordinary).toHaveLength(1); expect(ordinary[0].id).toBe(id);
      expect(ordinary[0].choices).toContain('lionfish');
      expect(new Set(ordinary[0].choices).size).toBe(3);
    }
    expect(JSON.stringify({ bookmarks, log })).toBe(before);
  });

  it('appends illustrative bottom encounters after the prior catalog and population', () => {
    const ids = Object.keys(X.POPULATION);
    expect(ids.indexOf(id)).toBe(ids.indexOf('ribbon_eel') + 1);
    expect(X.SPECIES_META.findIndex(m => m.id === id)).toBe(X.SPECIES_META.findIndex(m => m.id === 'ribbon_eel') + 1);
    for (const site of X.EXPLORE_SITES) expect(X.populationFor(site).find(p => p.id === id).count).toBeGreaterThan(0);
  });
});
