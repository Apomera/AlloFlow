import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const id = 'mandarin_dragonet';
let X, text, profile;
beforeAll(() => {
  const w = { StemLab: { isRegistered: () => false, registerTool() {} }, __RR_TEST_EXPORTS__: {} };
  vm.runInNewContext(readFileSync('stem_lab/stem_tool_coralreef.js', 'utf8'), { window: w, Math, Object, JSON, Array, Number, String, Date, URL });
  X = w.__RR_TEST_EXPORTS__.coralReef;
  text = X.speciesText((k, v) => v)[id]; profile = X.marineProfiles((k, v) => v)[id];
});

describe('adult male mandarin dragonet learning integration', () => {
  it('explains the male dorsal fin and blue pigment with resolved sources and a matching portrait', () => {
    expect(X.SPECIES_META.find(m => m.id === id)).toMatchObject({ group: 'fish', scientific: 'Synchiropus splendidus', iucn: 'LC', iucnYear: 2018, lookalikes: [] });
    expect(text.marks).toHaveLength(4);
    expect(text.marks.join(' ')).toMatch(/adult male/);
    expect(text.fact).toMatch(/pigment|cyanophores/);
    expect(text.fact).not.toMatch(/fluorescen|bioluminescen/);
    expect(profile.observe).toMatch(/female.*shorter/i);
    expect(profile.behavior).toMatch(/bottom|substrate/);
    for (const field of ['habitat', 'diet', 'behavior', 'observe']) expect(profile[field].length).toBeGreaterThan(25);
    const sources = X.marineProfileSources();
    for (const key of profile.sources) expect(sources.find(s => s.id === key)?.url).toMatch(/^https:\/\//);
    const portrait = readFileSync('stem_lab/assets/coralreef/species/' + id + '.webp');
    expect(portrait.length).toBeGreaterThan(1000);
    expect(portrait.equals(readFileSync('desktop/web-app/public/stem_lab/assets/coralreef/species/' + id + '.webp'))).toBe(true);
  });

  it('offers anonymous clues and ordinary saved-collection practice without creating discoveries', () => {
    const meta = X.SPECIES_META.find(m => m.id === id), clues = X.marinePracticeClues(text, meta);
    expect(clues).toHaveLength(4);
    expect(clues.join(' ').toLowerCase()).not.toContain(text.name.toLowerCase());
    expect(clues.join(' ').toLowerCase()).not.toContain(meta.scientific.toLowerCase());
    const bookmarks = { [id]: true }, log = { green_turtle: { firstSeen: 1 } }, before = JSON.stringify({ bookmarks, log });
    for (const seed of [1, 17, 29]) {
      const saved = X.marinePracticeCollectionIds(X.SPECIES_META, 'saved', bookmarks, []);
      const round = X.buildMarinePracticeRound(X.SPECIES_META, seed, saved, []);
      expect(round).toHaveLength(1);
      expect(round[0].id).toBe(id);
      expect(round[0].choices).toContain(id);
      expect(new Set(round[0].choices).size).toBe(3);
    }
    expect(JSON.stringify({ bookmarks, log })).toBe(before);
  });

  it('appends illustrative reef encounters after the prior catalog and population', () => {
    const ids = Object.keys(X.POPULATION);
    expect(ids.indexOf(id)).toBe(ids.indexOf('regal_angelfish') + 1);
    expect(X.SPECIES_META.findIndex(m => m.id === id)).toBe(X.SPECIES_META.findIndex(m => m.id === 'regal_angelfish') + 1);
    for (const site of X.EXPLORE_SITES) expect(X.populationFor(site).find(p => p.id === id).count).toBeGreaterThan(0);
  });
});
