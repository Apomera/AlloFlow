import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const id = 'longnose_hawkfish';
let X, text, profile;
beforeAll(() => {
  const w = { StemLab: { isRegistered: () => false, registerTool() {} }, __RR_TEST_EXPORTS__: {} };
  vm.runInNewContext(readFileSync('stem_lab/stem_tool_coralreef.js', 'utf8'), { window: w, Math, Object, JSON, Array, Number, String, Date, URL });
  X = w.__RR_TEST_EXPORTS__.coralReef;
  text = X.speciesText((key, fallback) => fallback)[id]; profile = X.marineProfiles((key, fallback) => fallback)[id];
});

describe('longnose hawkfish learning integration', () => {
  it('teaches red grid, cirri and perched anatomy with an assessment-date conservation label', () => {
    expect(X.SPECIES_META.find(m => m.id === id)).toMatchObject({ group: 'fish', scientific: 'Oxycirrhites typus', iucn: 'LC', iucnYear: 2015, lookalikes: ['yellow_longnose_butterflyfish'] });
    expect(text.marks).toHaveLength(4);
    expect(text.marks.join(' ')).toMatch(/long pointed snout.*slender body/);
    expect(text.marks.join(' ')).toMatch(/lines cross.*bars.*grid/);
    expect(text.marks.join(' ')).toMatch(/tassels.*back-fin spines/);
    expect(text.marks.join(' ')).toMatch(/lower side-fin rays/);
    expect(text.fact).toMatch(/called cirri/);
    expect(profile.behavior).toMatch(/gorgonian sea fans and black corals/);
    expect(profile.diet).toMatch(/planktonic.*crustaceans/);
    expect(profile.observe).toMatch(/long snout alone is not enough/);
    for (const field of ['habitat', 'diet', 'behavior', 'observe']) expect(profile[field].length).toBeGreaterThan(25);
    const sources = X.marineProfileSources();
    for (const key of profile.sources) expect(sources.find(s => s.id === key)?.url).toMatch(/^https:\/\//);
    expect(sources.find(s => s.id === 'dx-iucn-' + id).text).toMatch(/2016.*2017.*Assessed 3 March 2015/);
    const portrait = readFileSync('stem_lab/assets/coralreef/species/' + id + '.webp');
    expect(portrait.length).toBeGreaterThan(1000);
    expect(portrait.equals(readFileSync('desktop/web-app/public/stem_lab/assets/coralreef/species/' + id + '.webp'))).toBe(true);
  });

  it('compares long-snouted forms and supplies anonymous practice without changing discoveries', () => {
    const pair = [id, 'yellow_longnose_butterflyfish'], bookmarks = { [id]: true }, log = { green_turtle: { firstSeen: 1 } };
    expect(X.marineComparisonPair(id)).toEqual(pair);
    const meta = X.SPECIES_META.filter(m => pair.includes(m.id));
    const clues = X.marinePracticeClues(text, X.SPECIES_META.find(m => m.id === id));
    expect(clues).toHaveLength(4);
    expect(clues.join(' ').toLowerCase()).not.toContain('oxycirrhites');
    expect(clues.join(' ').toLowerCase()).not.toContain('longnose hawkfish');
    const before = JSON.stringify({ bookmarks, log });
    for (const seed of [1, 17, 29]) {
      const round = X.buildMarinePracticeRound(meta, seed, pair, []);
      expect(round.map(q => q.id).sort()).toEqual(pair.slice().sort());
      for (const question of round) expect(question.choices.slice().sort()).toEqual(pair.slice().sort());
      const saved = X.marinePracticeCollectionIds(X.SPECIES_META, 'saved', bookmarks, []);
      const ordinary = X.buildMarinePracticeRound(X.SPECIES_META, seed, saved, []);
      expect(ordinary).toHaveLength(1); expect(ordinary[0].id).toBe(id);
      expect(ordinary[0].choices).toContain('yellow_longnose_butterflyfish');
      expect(new Set(ordinary[0].choices).size).toBe(3);
    }
    expect(JSON.stringify({ bookmarks, log })).toBe(before);
  });

  it('appends illustrative perching encounters after the prior catalog and population', () => {
    const ids = Object.keys(X.POPULATION);
    expect(ids.indexOf(id)).toBe(ids.indexOf('leaf_scorpionfish') + 1);
    expect(X.SPECIES_META.findIndex(m => m.id === id)).toBe(X.SPECIES_META.findIndex(m => m.id === 'leaf_scorpionfish') + 1);
    for (const site of X.EXPLORE_SITES) expect(X.populationFor(site).find(p => p.id === id).count).toBeGreaterThan(0);
  });
});
