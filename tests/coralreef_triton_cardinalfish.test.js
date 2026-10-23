import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const additions = ['banggai_cardinalfish', 'giant_triton'];
let X, text, profiles;
beforeAll(() => {
  const w = { StemLab: { isRegistered: () => false, registerTool() {} }, __RR_TEST_EXPORTS__: {} };
  vm.runInNewContext(readFileSync('stem_lab/stem_tool_coralreef.js', 'utf8'), { window: w, Math, Object, JSON, Array, Number, String, Date, URL });
  X = w.__RR_TEST_EXPORTS__.coralReef; text = X.speciesText((k, v) => v); profiles = X.marineProfiles((k, v) => v);
});

describe('Banggai cardinalfish and giant triton learning integration', () => {
  it('provides distinct fish and mollusc profiles with sourced field marks and honest dated status', () => {
    expect(X.SPECIES_META.find(m => m.id === additions[0])).toMatchObject({ group: 'fish', scientific: 'Pterapogon kauderni', iucn: 'EN', iucnYear: 2007, lookalikes: ['pajama_cardinalfish'] });
    expect(X.SPECIES_META.find(m => m.id === additions[1])).toMatchObject({ group: 'invertebrate', scientific: 'Charonia tritonis', iucn: 'NE', iucnYear: null });
    const sources = X.marineProfileSources();
    for (const id of additions) {
      expect(text[id].marks).toHaveLength(4);
      for (const field of ['habitat', 'diet', 'behavior', 'observe']) expect(profiles[id][field].length).toBeGreaterThan(25);
      for (const sourceId of profiles[id].sources) expect(sources.find(s => s.id === sourceId)?.url).toMatch(/^https:\/\//);
      const portrait = readFileSync('stem_lab/assets/coralreef/species/' + id + '.webp'); expect(portrait.length).toBeGreaterThan(1000);
      expect(portrait.equals(readFileSync('desktop/web-app/public/stem_lab/assets/coralreef/species/' + id + '.webp'))).toBe(true);
    }
    expect(text.banggai_cardinalfish.marks.join(' ')).toMatch(/three.*bars.*white spots.*dorsal.*forked tail/);
    expect(text.giant_triton.marks.join(' ')).toMatch(/spiral shell.*ridges.*orange.*teeth/);
    expect(text.giant_triton.role).toMatch(/not enough to control/);
  });

  it('supports a two-cardinalfish exercise with exactly two names while saved targets remain scoped', () => {
    const pair = ['pajama_cardinalfish', 'banggai_cardinalfish'];
    const meta = X.SPECIES_META.filter(m => pair.includes(m.id));
    const log = { green_turtle: { firstSeen: 1 } }, bookmarks = { banggai_cardinalfish: true, giant_triton: true };
    const before = JSON.stringify({ log, bookmarks });
    expect(X.marineComparisonPair('banggai_cardinalfish')).toEqual(['banggai_cardinalfish', 'pajama_cardinalfish']);
    for (const seed of [1, 7, 21]) {
      const round = X.buildMarinePracticeRound(meta, seed, pair, []);
      expect(round.map(q => q.id).sort()).toEqual(pair.slice().sort());
      for (const q of round) expect(q.choices.slice().sort()).toEqual(pair.slice().sort());
      const saved = X.marinePracticeCollectionIds(X.SPECIES_META, 'saved', bookmarks, []);
      const mixed = X.buildMarinePracticeRound(X.SPECIES_META, seed, saved, []);
      expect(mixed.map(q => q.id).sort()).toEqual(additions.slice().sort());
      expect(mixed.every(q => q.choices.length === 3)).toBe(true);
    }
    expect(JSON.stringify({ log, bookmarks })).toBe(before);
  });

  it('appends encounters after the established cardinalfish and includes both organisms at every site', () => {
    const ids = Object.keys(X.POPULATION), first = ids.indexOf('pajama_cardinalfish') + 1;
    expect(first).toBeGreaterThan(0); expect(ids.slice(first, first + 2)).toEqual(additions);
    for (const site of X.EXPLORE_SITES) for (const id of additions) expect(X.populationFor(site).find(p => p.id === id).count).toBeGreaterThan(0);
  });
});
