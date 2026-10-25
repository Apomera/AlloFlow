import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const id = 'chocolate_chip_sea_star';
let X, text, profile;
beforeAll(() => {
  const w = { StemLab: { isRegistered: () => false, registerTool() {} }, __RR_TEST_EXPORTS__: {} };
  vm.runInNewContext(readFileSync('stem_lab/stem_tool_coralreef.js', 'utf8'), { window: w, Math, Object, JSON, Array, Number, String, Date, URL });
  X = w.__RR_TEST_EXPORTS__.coralReef;
  text = X.speciesText((key, fallback) => fallback)[id]; profile = X.marineProfiles((key, fallback) => fallback)[id];
});

describe('chocolate chip sea star learning integration', () => {
  it('teaches robust knobbed anatomy and tube feet without turning a local listing into a global assessment', () => {
    expect(X.SPECIES_META.find(m => m.id === id)).toMatchObject({ group: 'invertebrate', scientific: 'Protoreaster nodosus', iucn: 'NE', iucnYear: null, lookalikes: ['blue_sea_star'] });
    expect(text.marks).toHaveLength(4);
    expect(text.marks.join(' ')).toMatch(/Five broad, tapering arms.*thick central disc/);
    expect(text.marks.join(' ')).toMatch(/dark cone-shaped knobs/);
    expect(text.marks.join(' ')).toMatch(/can be beige, orange or pinkish/);
    expect(text.marks.join(' ')).toMatch(/tube feet.*underside/);
    expect(text.fact).toMatch(/tube feet.*work together/);
    expect(profile.behavior).toMatch(/seafloor using many tube feet.*sediment and seagrass/);
    expect(profile.diet).toMatch(/films, detritus.*tiny organisms/);
    expect(profile.observe).toMatch(/colour alone is not enough/);
    for (const field of ['habitat', 'diet', 'behavior', 'observe']) expect(profile[field].length).toBeGreaterThan(25);
    const sources = X.marineProfileSources();
    for (const key of profile.sources) expect(sources.find(s => s.id === key)?.url).toMatch(/^https:\/\//);
    expect(sources.find(s => s.id === 'dx-local-' + id).text).toMatch(/national.*not a global assessment/);
    const facts = JSON.parse(readFileSync('docs/coralreef-chocolate-chip-sea-star-2026-10-23.json', 'utf8'));
    expect(facts.specimens[0].iucnDateAssessed).toBeNull();
    expect(facts.modelProvenance).toMatchObject({ nominalLengthM: 0.28, depthM: [0, 30], habit: 'bottom', anchor: 'base', zone: 'sand' });
    const portrait = readFileSync('stem_lab/assets/coralreef/species/' + id + '.webp');
    expect(portrait.length).toBeGreaterThan(1000);
    expect(portrait.equals(readFileSync('desktop/web-app/public/stem_lab/assets/coralreef/species/' + id + '.webp'))).toBe(true);
  });

  it('contrasts arm shape and supplies anonymous practice without changing discoveries', () => {
    const pair = [id, 'blue_sea_star'], bookmarks = { [id]: true }, log = { green_turtle: { firstSeen: 1 } };
    expect(X.marineComparisonPair(id)).toEqual(pair);
    const meta = X.SPECIES_META.filter(m => pair.includes(m.id));
    const clues = X.marinePracticeClues(text, X.SPECIES_META.find(m => m.id === id));
    expect(clues).toHaveLength(4);
    expect(clues.join(' ').toLowerCase()).not.toContain('protoreaster');
    expect(clues.join(' ').toLowerCase()).not.toContain('chocolate chip');
    const before = JSON.stringify({ bookmarks, log });
    for (const seed of [1, 17, 29]) {
      const round = X.buildMarinePracticeRound(meta, seed, pair, []);
      expect(round.map(q => q.id).sort()).toEqual(pair.slice().sort());
      for (const question of round) expect(question.choices.slice().sort()).toEqual(pair.slice().sort());
      const saved = X.marinePracticeCollectionIds(X.SPECIES_META, 'saved', bookmarks, []);
      const ordinary = X.buildMarinePracticeRound(X.SPECIES_META, seed, saved, []);
      expect(ordinary).toHaveLength(1); expect(ordinary[0].id).toBe(id);
      expect(ordinary[0].choices).toContain('blue_sea_star');
      expect(new Set(ordinary[0].choices).size).toBe(3);
    }
    expect(JSON.stringify({ bookmarks, log })).toBe(before);
  });

  it('appends illustrative sand encounters after the prior catalog and population', () => {
    const ids = Object.keys(X.POPULATION);
    expect(ids.indexOf(id)).toBe(ids.indexOf('longnose_hawkfish') + 1);
    expect(X.SPECIES_META.findIndex(m => m.id === id)).toBe(X.SPECIES_META.findIndex(m => m.id === 'longnose_hawkfish') + 1);
    for (const site of X.EXPLORE_SITES) expect(X.populationFor(site).find(p => p.id === id).count).toBeGreaterThan(0);
  });
});
