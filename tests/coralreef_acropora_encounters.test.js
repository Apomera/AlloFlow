import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runtime, census, toolExports, toolSite } from './helpers/reef_life_harness.js';

const corals=['acropora_clathrata','acropora_humilis','acropora_millepora'];

describe('Acropora encounters and species references',()=>{
  it('resolves each living entry to a substantive account and its bibliography',()=>{
    const x=toolExports(), translate=(k,v)=>v, profiles=x.marineProfiles(translate), tx=x.speciesText(translate);
    const living=x.SPECIES_META.filter(row=>row.group!=='structure');
    expect(living).toHaveLength(79);
    for(const {id,scientific} of living){
      expect(scientific,id).toBeTruthy();
      for(const text of [tx[id].role,tx[id].fact,...['habitat','diet','behavior','observe'].map(k=>profiles[id][k])]) expect(text.length,id).toBeGreaterThan(12);
      expect(profiles[id].sources.length,id).toBeGreaterThan(0);
      expect(x.marineEntrySources(profiles[id]).map(source=>source.id),id).toEqual(profiles[id].sources);
    }
    for(const id of corals){
      const bytes=readFileSync('stem_lab/assets/coralreef/species/'+id+'.webp');
      expect(bytes.toString('ascii',8,12)).toBe('WEBP');
      expect(x.marinePracticeClues(tx[id],x.SPECIES_META.find(m=>m.id===id))).toHaveLength(4);
    }
  });

  it.each(['real',null])('places and locates three stationary, distinct colonies with catalog %s',species=>{
    const site=toolSite('healthy');
    expect(site.population.reduce((n,row)=>n+row.count,0)).toBe(239);
    const population=site.population.filter(row=>corals.includes(row.id));
    expect(population.map(row=>row.count)).toEqual([1,1,1]);
    const errors=[];
    const session=runtime({onError:e=>errors.push(String(e)),site:{...site,population}}, {species});
    try {
      const animals=census(session);
      expect(animals.map(o=>o.speciesId).sort()).toEqual([...corals].sort());
      const initial=animals.map(o=>o.pos.toArray());
      const pair=['acropora_humilis','acropora_millepora'].map(id=>animals.find(o=>o.speciesId===id));
      const separation=pair[0].pos.distanceTo(pair[1].pos);
      expect(separation).toBeGreaterThan(.65);
      expect(separation).toBeLessThan(10);
      for(const o of animals){
        expect(session.controller.findSpecies(o.speciesId)?.uid).toBe(o.uid);
        expect(session.controller.focus(o.uid)).toBe(true);
        expect(session.controller.getState().focused.speciesId).toBe(o.speciesId);
      }
      session.run(.3);expect(census(session).map(o=>o.pos.toArray())).toEqual(initial);
      expect(errors).toEqual([]);
    } finally {session.dispose();}
  });

  it('keeps the branching comparison within swimming distance on the populated healthy reef',()=>{
    const session=runtime({site:toolSite('healthy')},{species:null});
    try {
      const reef=census(session);
      for (const speciesId of corals) expect(reef.filter(o=>o.speciesId===speciesId)).toHaveLength(1);
      const distance=reef.find(o=>o.speciesId===corals[1]).pos.distanceTo(reef.find(o=>o.speciesId===corals[2]).pos);
      expect(distance).toBeGreaterThan(.65); expect(distance).toBeLessThan(10);
    } finally {session.dispose();}
  });
});
