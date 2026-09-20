import {beforeAll,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let BF;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_butterfly.js','butterfly');BF=window.__RR_TEST_EXPORTS__.butterfly;});
function landed(s,id){const p=BF.habitats(s).find(p=>p.id===id);Object.assign(s,{x:p.x,z:p.z});expect(BF.land(s).ok).toBe(true);return s;}

describe('Butterfly field lens',()=>{
 it.each([['milkweed',true,true,'Common milkweed'],['bergamot',true,false,'Wild bergamot'],['lawn',false,false,'Mown grass']])('distinguishes flowers and host leaves at %s',(id,nectar,host,species)=>{
   const s=landed(BF.freshState(),id),flowers=BF.fieldDetail(s,'flowers'),leaves=BF.fieldDetail(s,'leaves');
   expect(flowers).toMatchObject({present:nectar,species});expect(leaves).toMatchObject({present:host,species});
   if(id==='bergamot')expect(leaves.note).toContain('do not replace milkweed');
   if(id==='lawn')expect(flowers.part).toBe('Mown ground');
   if(nectar)expect(flowers.point.y).toBeGreaterThan(leaves.point.y);
 });
 it.each([['lawn',false,false,'Mown grass','Mown grass'],['flowers',true,false,'Wild bergamot','Wild bergamot'],['mixed',true,true,'Wild bergamot','Common milkweed']])('inspects the current %s restoration planting',(id,nectar,host,flowerSpecies,leafSpecies)=>{
   const s=BF.freshState();BF.applyPlan(s,id,'both');landed(s,'restoration');
   expect(BF.fieldDetail(s,'flowers')).toMatchObject({present:nectar,species:flowerSpecies});expect(BF.fieldDetail(s,'leaves')).toMatchObject({present:host,species:leafSpecies});
   if(id==='mixed')expect(BF.fieldDetail(s,'flowers').point.x).toBeGreaterThan(BF.fieldDetail(s,'leaves').point.x);
 });
 it('does not fly, consume energy, save evidence, or resolve a prediction when looking closer',()=>{
   const s=BF.freshState({observations:['milkweed']});BF.applyPlan(s,'mixed','nectar');landed(s,'restoration');s.energy=39;s.clock=14;
   const before=JSON.stringify(s),saved=BF.save(s);for(let i=0;i<30;i++){BF.fieldDetail(s,'flowers');BF.fieldDetail(s,'leaves');}
   expect(JSON.stringify(s)).toBe(before);expect(BF.save(s)).toEqual(saved);expect(s.restoration.prediction).toBe('nectar');
 });
 it('requires a landed habitat and a recognized lens',()=>{
   const s=BF.freshState();expect(BF.fieldDetail(s,'flowers')).toBeNull();landed(s,'milkweed');
   for(const kind of [null,'','constructor','petals'])expect(BF.fieldDetail(s,kind)).toBeNull();
 });
 it('shows recorded evidence only after examination and treats a new prediction as pending',()=>{
   const s=landed(BF.freshState(),'milkweed'),p=BF.habitats(s)[0];expect(BF.evidenceRecorded(s,p)).toBe(false);BF.observe(s);expect(BF.evidenceRecorded(s,p)).toBe(true);
   BF.applyPlan(s,'mixed','both');landed(s,'restoration');const plot=BF.habitats(s)[3];expect(BF.evidenceRecorded(s,plot)).toBe(false);BF.observe(s);expect(BF.evidenceRecorded(s,plot)).toBe(true);
   BF.applyPlan(s,'mixed','nectar');expect(BF.evidenceRecorded(s,plot)).toBe(false);expect(s.restoration.trials).toHaveLength(1);
 });
});
