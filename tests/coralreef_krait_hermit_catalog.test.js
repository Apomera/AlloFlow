import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let X, TX, profiles;
const ids=['banded_sea_krait','white_spotted_hermit_crab'];
beforeEach(()=>{
  resetStemLab();window.__RR_TEST_EXPORTS__={};
  loadTool(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js','coralReef');
  X=window.__RR_TEST_EXPORTS__.coralReef;
  TX=X.speciesText((key,fallback)=>fallback);
  profiles=X.marineProfiles((key,fallback)=>fallback);
});

describe('new marine specimens are usable throughout the guide',()=>{
  it.each(ids)('%s has distinct field marks and resolvable source citations',id=>{
    const entries=X.SPECIES_META.filter(x=>x.id===id);
    expect(entries).toHaveLength(1);
    expect(entries[0].group).toBe(id==='banded_sea_krait'?'reptile':'invertebrate');
    expect(TX[id].marks).toHaveLength(4);
    expect(X.marinePracticeClues(TX[id],entries[0])).toHaveLength(4);
    for(const other of entries[0].lookalikes){
      const otherName=TX[other].name.split(' (')[0].toLowerCase();
      expect(TX[id].marks.join(' ').toLowerCase()).not.toContain(otherName);
    }
    const sources=X.marineProfileSources();
    expect(profiles[id].sources.length).toBeGreaterThanOrEqual(3);
    for(const source of profiles[id].sources){
      expect(sources.filter(s=>s.id===source)).toHaveLength(1);
      expect(sources.find(s=>s.id===source).url).toMatch(/^https:\/\//);
    }
  });
  it('distinguishes an amphibious reptile from a shell-carrying crustacean without inventing assessment dates',()=>{
    const krait=X.SPECIES_META.find(x=>x.id==='banded_sea_krait'),hermit=X.SPECIES_META.find(x=>x.id==='white_spotted_hermit_crab');
    expect([krait.scientific,krait.iucn,krait.iucnYear]).toEqual(['Laticauda colubrina','LC',null]);
    expect([hermit.scientific,hermit.iucn,hermit.iucnYear]).toEqual(['Dardanus megistos','NE',null]);
    expect(TX[krait.id].fact).toContain('comes ashore');expect(profiles[krait.id].diet).toContain('eels');
    expect(TX[hermit.id].marks.join(' ')).toContain('left claw is larger');expect(TX[hermit.id].fact).toContain('borrowed');
  });
  it('includes both specimens in a scoped round with useful known lookalikes',()=>{
    const before=JSON.stringify(X.SPECIES_META);
    const round=X.buildMarinePracticeRound(X.SPECIES_META,'new-specimens',ids,[],[],3);
    expect(round.map(q=>q.id).sort()).toEqual([...ids].sort());
    for(const q of round){
      const meta=X.SPECIES_META.find(m=>m.id===q.id);
      expect(new Set(q.choices).size).toBe(3);
      expect(q.choices).toContain(q.id);
      expect(q.choices.filter(choice=>meta.lookalikes.includes(choice))).toHaveLength(2);
    }
    expect(JSON.stringify(X.SPECIES_META)).toBe(before);
  });
});
