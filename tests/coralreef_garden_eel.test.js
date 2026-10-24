import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

let X, text, profile;
const id = 'spotted_garden_eel';
beforeAll(() => {
  const w = { StemLab: { isRegistered: () => false, registerTool() {} }, __RR_TEST_EXPORTS__: {} };
  vm.runInNewContext(readFileSync('stem_lab/stem_tool_coralreef.js', 'utf8'), { window: w, Math, Object, JSON, Array, Number, String, Date, URL });
  X = w.__RR_TEST_EXPORTS__.coralReef;
  text = X.speciesText((k, v) => v)[id]; profile = X.marineProfiles((k, v) => v)[id];
});

describe('spotted garden eel learning integration', () => {
  it('provides sourced adult field marks, an ecology profile and a mirrored guide portrait', () => {
    expect(X.SPECIES_META.find(m => m.id === id)).toMatchObject({ group: 'fish', scientific: 'Heteroconger hassi', lookalikes: [] });
    expect(text.name).toBe('Spotted garden eel'); expect(text.marks).toHaveLength(4);
    expect(text.marks.join(' ')).toMatch(/burrow/); expect(text.marks.join(' ')).toMatch(/spots/);
    for (const field of ['habitat', 'diet', 'behavior', 'observe']) expect(profile[field].length).toBeGreaterThan(25);
    const references = X.marineProfileSources().map(s => s.id);
    for (const source of profile.sources) expect(references).toContain(source);
    const portrait = readFileSync('stem_lab/assets/coralreef/species/' + id + '.webp');
    expect(portrait.length).toBeGreaterThan(1000);
    expect(portrait.equals(readFileSync('desktop/web-app/public/stem_lab/assets/coralreef/species/' + id + '.webp'))).toBe(true);
  });

  it('keeps a saved eel identification round scoped to that specimen', () => {
    const bookmarks = { spotted_garden_eel: true }, log = { green_turtle: { firstSeen: 1 } }, before = JSON.stringify({ bookmarks, log });
    const ids = X.marinePracticeCollectionIds(X.SPECIES_META, 'saved', bookmarks, []);
    expect(ids).toEqual([id]);
    for (const seed of [1, 7, 21]) {
      const round = X.buildMarinePracticeRound(X.SPECIES_META, seed, ids, []);
      expect(round).toHaveLength(1); expect(round[0].id).toBe(id);
      expect(round[0].choices).toContain(id); expect(new Set(round[0].choices).size).toBe(3);
    }
    expect(JSON.stringify({ bookmarks, log })).toBe(before);
  });

  it('adds garden eels after established population entries and places them on every survey site', () => {
    const ids = Object.keys(X.POPULATION);
    expect(ids.indexOf(id)).toBe(ids.indexOf('copperband_butterflyfish') + 1);
    for (const site of X.EXPLORE_SITES) expect(X.populationFor(site).find(p => p.id === id).count).toBeGreaterThan(0);
  });
});
