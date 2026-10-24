import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const id = 'regal_angelfish';
let X, text, profile;
beforeAll(() => {
  const w = { StemLab: { isRegistered: () => false, registerTool() {} }, __RR_TEST_EXPORTS__: {} };
  vm.runInNewContext(readFileSync('stem_lab/stem_tool_coralreef.js', 'utf8'), { window:w, Math, Object, JSON, Array, Number, String, Date, URL });
  X = w.__RR_TEST_EXPORTS__.coralReef; text = X.speciesText((k, v) => v)[id]; profile = X.marineProfiles((k, v) => v)[id];
});

describe('Pacific adult regal angelfish learning integration', () => {
  it('provides a sourced adult colour pattern, geographic variation and dated conservation status', () => {
    expect(X.SPECIES_META.find(m => m.id === id)).toMatchObject({ group:'fish', scientific:'Pygoplites diacanthus', iucn:'LC', iucnYear:2009, lookalikes:['emperor_angelfish'] });
    expect(text.marks).toHaveLength(4); expect(text.marks.join(' ')).toMatch(/bars|bands/); expect(text.fact).toMatch(/Pacific/); expect(text.fact).toMatch(/Indian|Red Sea/);
    for (const field of ['habitat','diet','behavior','observe']) expect(profile[field].length).toBeGreaterThan(25);
    const sources = X.marineProfileSources(); for (const key of profile.sources) expect(sources.find(s => s.id === key)?.url).toMatch(/^https:\/\//);
    const portrait = readFileSync('stem_lab/assets/coralreef/species/'+id+'.webp'); expect(portrait.length).toBeGreaterThan(1000);
    expect(portrait.equals(readFileSync('desktop/web-app/public/stem_lab/assets/coralreef/species/'+id+'.webp'))).toBe(true);
  });

  it('supports targeted comparison with the emperor angelfish and ordinary saved-species practice', () => {
    const pair = [id,'emperor_angelfish']; expect(X.marineComparisonPair(id)).toEqual(pair);
    const meta = X.SPECIES_META.filter(m => pair.includes(m.id)), bookmarks = { [id]:true }, log = { green_turtle:{firstSeen:1} }, before = JSON.stringify({bookmarks,log});
    for (const seed of [1,17,29]) {
      const paired = X.buildMarinePracticeRound(meta,seed,pair,[]); expect(paired.map(q=>q.id).sort()).toEqual(pair.slice().sort());
      for (const q of paired) expect(q.choices.slice().sort()).toEqual(pair.slice().sort());
      const saved = X.marinePracticeCollectionIds(X.SPECIES_META,'saved',bookmarks,[]), ordinary = X.buildMarinePracticeRound(X.SPECIES_META,seed,saved,[]);
      expect(ordinary).toHaveLength(1); expect(ordinary[0].id).toBe(id); expect(ordinary[0].choices).toContain('emperor_angelfish'); expect(new Set(ordinary[0].choices).size).toBe(3);
    }
    expect(JSON.stringify({bookmarks,log})).toBe(before);
  });

  it('appends reef encounters without reordering existing population entries', () => {
    const ids = Object.keys(X.POPULATION); expect(ids.indexOf(id)).toBe(ids.indexOf('blue_velvet_headshield_slug')+1);
    for (const site of X.EXPLORE_SITES) expect(X.populationFor(site).find(p=>p.id===id).count).toBeGreaterThan(0);
  });
});
