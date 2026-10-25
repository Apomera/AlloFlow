import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let X, TX, profiles;
const ids=['textile_cone','orange_cup_coral'];
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
    expect(entries[0].group).toBe(id==='orange_cup_coral'?'coral':'invertebrate');
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
  it('describes a non-photosynthetic colony and a mollusc-eating snail without invented assessment dates',()=>{
    const cone=X.SPECIES_META.find(x=>x.id==='textile_cone'),coral=X.SPECIES_META.find(x=>x.id==='orange_cup_coral');
    expect([cone.scientific,cone.iucn,cone.iucnYear]).toEqual(['Conus textile','LC',null]);
    expect([coral.scientific,coral.iucn,coral.iucnYear]).toEqual(['Tubastraea coccinea','NE',null]);
    expect(TX[coral.id].fact).toContain('no photosynthetic algae');
    expect(profiles[coral.id].diet).toContain('zooplankton');expect(profiles[cone.id].diet).toContain('other sea snails');
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
