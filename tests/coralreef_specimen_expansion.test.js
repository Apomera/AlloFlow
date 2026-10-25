import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let X, TX, profiles;
const ids=['blackspotted_puffer','ocellated_eagle_ray'];
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
    expect(entries[0].group).toBe('fish');
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
  it('keeps the Indo-Pacific eagle ray distinct from Atlantic taxonomy and older global status',()=>{
    const ray=X.SPECIES_META.find(x=>x.id==='ocellated_eagle_ray');
    expect(ray.scientific).toBe('Aetobatus ocellatus');
    expect([ray.iucn,ray.iucnYear]).toEqual(['EN',2024]);
    expect(TX[ray.id].fact).toContain('Atlantic');
    expect(X.marineProfileSources().find(s=>s.id==='dx-iucn-ocellated_eagle_ray').url).toContain('124549514');
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
