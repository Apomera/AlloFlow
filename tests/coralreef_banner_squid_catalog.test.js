import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let X, TX, profiles;
const ids=['longfin_bannerfish','bigfin_reef_squid'];
beforeEach(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool(process.env.CORALREEF_SOURCE||'stem_lab/stem_tool_coralreef.js','coralReef');X=window.__RR_TEST_EXPORTS__.coralReef;TX=X.speciesText((k,f)=>f);profiles=X.marineProfiles((k,f)=>f);});
describe('bannerfish and reef squid guide coverage',()=>{
 it.each(ids)('%s has four usable observations and resolvable sources',id=>{
  const entries=X.SPECIES_META.filter(x=>x.id===id);expect(entries).toHaveLength(1);expect(entries[0].group).toBe(id==='longfin_bannerfish'?'fish':'invertebrate');
  expect(TX[id].marks).toHaveLength(4);expect(X.marinePracticeClues(TX[id],entries[0])).toHaveLength(4);
  for(const other of entries[0].lookalikes)expect(TX[id].marks.join(' ').toLowerCase()).not.toContain(TX[other].name.split(' (')[0].toLowerCase());
  const sources=X.marineProfileSources();expect(profiles[id].sources.length).toBeGreaterThanOrEqual(3);
  for(const source of profiles[id].sources){expect(sources.filter(s=>s.id===source)).toHaveLength(1);expect(sources.find(s=>s.id===source).url).toMatch(/^https:\/\//);}
 });
 it('distinguishes assessment dates and explains the squid species complex',()=>{
  const fish=X.SPECIES_META.find(x=>x.id===ids[0]),squid=X.SPECIES_META.find(x=>x.id===ids[1]);
  expect([fish.scientific,fish.iucn,fish.iucnYear]).toEqual(['Heniochus acuminatus','LC',2009]);
  expect([squid.scientific,squid.iucn,squid.iucnYear]).toEqual(['Sepioteuthis lessoniana (species complex)','DD',2014]);
  expect(TX[fish.id].marks.join(' ')).toContain('bright yellow');expect(profiles[fish.id].observe).toContain('shorter snout');
  expect(TX[squid.id].marks.join(' ')).toContain('Eight arms');expect(TX[squid.id].marks.join(' ')).toContain('two longer feeding tentacles');expect(TX[squid.id].fact).toContain('species complex');
  expect(profiles[squid.id].observe).toContain('Colour alone cannot identify it.');
 });
 it('makes both new specimens available with their own meaningful alternatives',()=>{
  const original=JSON.stringify(X.SPECIES_META),round=X.buildMarinePracticeRound(X.SPECIES_META,'new-banner-squid',ids,[],[],3);
  expect(round.map(q=>q.id).sort()).toEqual([...ids].sort());
  for(const q of round){const m=X.SPECIES_META.find(m=>m.id===q.id);expect(new Set(q.choices).size).toBe(3);expect(q.choices).toContain(q.id);expect(q.choices.filter(id=>m.lookalikes.includes(id))).toHaveLength(2);}
  expect(JSON.stringify(X.SPECIES_META)).toBe(original);
 });
});
