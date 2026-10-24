import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const id = 'blue_velvet_headshield_slug';
let X, text, profile;
beforeAll(() => {
  const w = { StemLab: { isRegistered: () => false, registerTool() {} }, __RR_TEST_EXPORTS__: {} };
  vm.runInNewContext(readFileSync('stem_lab/stem_tool_coralreef.js', 'utf8'), { window: w, Math, Object, JSON, Array, Number, String, Date, URL });
  X = w.__RR_TEST_EXPORTS__.coralReef; text = X.speciesText((k, v) => v)[id]; profile = X.marineProfiles((k, v) => v)[id];
});

describe('blue velvet headshield slug learning integration', () => {
  it('explains the headshield and rolled side flaps with sourced field marks and a matching portrait', () => {
    expect(X.SPECIES_META.find(m => m.id === id)).toMatchObject({ group: 'invertebrate', scientific: 'Chelidonura varians', iucn: 'NE', iucnYear: null, lookalikes: ['nudibranch'] });
    expect(text.marks).toHaveLength(4); expect(text.marks.join(' ')).toMatch(/black.*blue.*headshield.*parapodia.*unequal/);
    expect(text.fact).toContain('different sea-slug group');
    for (const field of ['habitat', 'diet', 'behavior', 'observe']) expect(profile[field].length).toBeGreaterThan(25);
    const sources = X.marineProfileSources();
    for (const key of profile.sources) expect(sources.find(s => s.id === key)?.url).toMatch(/^https:\/\//);
    const portrait = readFileSync('stem_lab/assets/coralreef/species/' + id + '.webp'); expect(portrait.length).toBeGreaterThan(1000);
    expect(portrait.equals(readFileSync('desktop/web-app/public/stem_lab/assets/coralreef/species/' + id + '.webp'))).toBe(true);
  });

  it('supports a teaching contrast with the nudibranch while leaving ordinary saved practice at three names', () => {
    const pair = [id, 'nudibranch']; expect(X.marineComparisonPair(id)).toEqual(pair);
    const candidates = X.SPECIES_META.filter(m => pair.includes(m.id));
    const bookmarks = { [id]: true }, log = { green_turtle: { firstSeen: 1 } }, before = JSON.stringify({ bookmarks, log });
    for (const seed of [1, 17, 29]) {
      const paired = X.buildMarinePracticeRound(candidates, seed, pair, []);
      expect(paired.map(q => q.id).sort()).toEqual(pair.slice().sort());
      for (const q of paired) expect(q.choices.slice().sort()).toEqual(pair.slice().sort());
      const saved = X.marinePracticeCollectionIds(X.SPECIES_META, 'saved', bookmarks, []);
      const ordinary = X.buildMarinePracticeRound(X.SPECIES_META, seed, saved, []);
      expect(ordinary).toHaveLength(1); expect(ordinary[0].id).toBe(id); expect(ordinary[0].choices).toContain('nudibranch'); expect(new Set(ordinary[0].choices).size).toBe(3);
    }
    expect(JSON.stringify({ bookmarks, log })).toBe(before);
  });

  it('appends its encounters after the triton and includes it at every survey site', () => {
    const ids = Object.keys(X.POPULATION); expect(ids.indexOf(id)).toBe(ids.indexOf('giant_triton') + 1);
    for (const site of X.EXPLORE_SITES) expect(X.populationFor(site).find(p => p.id === id).count).toBeGreaterThan(0);
  });
});
