import {beforeAll,describe,it,expect,vi} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
import {readFileSync} from 'node:fs';
let BF,BH;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_butterfly.js','butterfly');loadTool('stem_lab/stem_tool_beehive.js','beehive');BF=window.__RR_TEST_EXPORTS__.butterfly;BH=window.__RR_TEST_EXPORTS__.beehive;});
describe('Butterfly habitat exploration',()=>{
 it('requires a real nearby landing and examination to earn evidence',()=>{
   const s=BF.freshState();expect(BF.land(s).ok).toBe(false);expect(BF.observe(s).ok).toBe(false);expect(s.observations).toEqual([]);
   Object.assign(s,{x:-42,z:-28,energy:30});expect(BF.land(s).ok).toBe(true);expect(s.observations).toEqual([]);
   expect(BF.observe(s).ok).toBe(true);expect(s.energy).toBe(100);expect(s.observations).toEqual(['milkweed']);BF.observe(s);expect(s.observations).toEqual(['milkweed']);
 });
 it('does not award nectar or host-plant properties to the mown patch',()=>{
   const s=BF.freshState();Object.assign(s,{x:38,z:38,energy:25});BF.land(s);BF.observe(s);expect(s.energy).toBe(25);
   expect(BF.plants.filter(p=>p.host).map(p=>p.id)).toEqual(['milkweed']);expect(BF.plants.find(p=>p.id==='bergamot').nectar).toBe(true);
 });
 it('freezes time, energy and movement when paused or landed',()=>{
   for(const setup of [{paused:true},{paused:false,landed:'milkweed'}]){const s=Object.assign(BF.freshState(),setup),before=JSON.stringify(s);for(let i=0;i<100;i++)BF.step(s,.05,{forward:true});expect(JSON.stringify(s)).toBe(before);}
 });
 it('bounds frame deltas and world coordinates, and normalizes diagonal input',()=>{
   const a=Object.assign(BF.freshState(),{paused:false}),b={...a};BF.step(a,999,{right:true});BF.step(b,.05,{right:true});expect(a).toEqual(b);
   const c=Object.assign(BF.freshState(),{paused:false}),d={...c};BF.step(c,.05,{forward:true});BF.step(d,.05,{forward:true,right:true});expect(Math.hypot(c.x,c.z-52)).toBeCloseTo(Math.hypot(d.x,d.z-52),8);
   for(let i=0;i<20000;i++)BF.step(a,.05,{right:true,back:true,rise:true});expect(a.x).toBeLessThanOrEqual(100);expect(a.z).toBeLessThanOrEqual(100);expect(a.y).toBe(24);expect(a.energy).toBeGreaterThanOrEqual(0);
   const before=JSON.stringify(a);for(const dt of [NaN,Infinity,0,-2])BF.step(a,dt,{left:true});expect(JSON.stringify(a)).toBe(before);
 });
 it('guided travel reaches each destination and pauses before the learner lands',()=>{
   for(const p of BF.plants){const s=Object.assign(BF.freshState(),{paused:false,target:p.id});for(let i=0;i<1000&&!s.paused;i++)BF.step(s,.05,{});expect(s.paused).toBe(true);expect(BF.nearest(s).plant.id).toBe(p.id);expect(BF.nearest(s).distance).toBeLessThan(4);expect(s.observations).toEqual([]);expect(BF.land(s).ok).toBe(true);}
 });
 it('manual steering takes over from guidance without losing recorded observations',()=>{
   const s=Object.assign(BF.freshState({observations:['milkweed']}),{paused:false,target:'lawn'});BF.step(s,.05,{left:true});expect(s.target).toBeNull();expect(s.x).toBeLessThan(0);expect(s.observations).toEqual(['milkweed']);
 });
 it('persists only known unique observations and starts restored sessions safely paused',()=>{
   const s=BF.freshState({observations:['milkweed','constructor','milkweed','bergamot'],paused:false,x:Infinity});expect(s.observations).toEqual(['milkweed','bergamot']);expect(s.paused).toBe(true);expect(s.x).toBe(0);
   const saved=BF.save(s);saved.observations.push('lawn');expect(s.observations).toHaveLength(2);expect(Object.keys(saved).sort()).toEqual(['lifecycle','observations','restoration','version']);
 });
});
describe('Shared meadow extraction',()=>{
 it('Bee Lab delegates to the same recipes without sharing mutable results',()=>{
   const original=window.StemMeadow,spy=vi.fn(original.butterflyWing);window.StemMeadow={...original,butterflyWing:spy};
   try{expect(BH.bhDroneButterflyWing('fore')).toEqual(original.butterflyWing('fore'));expect(spy).toHaveBeenCalledWith('fore');}finally{window.StemMeadow=original;}
   const a=original.vegetation('grass'),b=original.vegetation('grass');a.positions[0]=999;expect(b.positions[0]).not.toBe(999);
   expect(BH.bhDroneButterflyPose(1,{simulationClock:12},false)).toEqual(original.ambientPose(1,{simulationClock:12},false));
 });
 it('ships the new tool, shared module and host identically in the desktop bundle',()=>{
   for(const p of ['stem_lab/stem_tool_butterfly.js','stem_lab/stem_sim_meadow.js','stem_lab/stem_lab_module.js','stem_lab/stem_tool_beehive.js'])expect(readFileSync('desktop/web-app/public/'+p,'utf8')).toBe(readFileSync(p,'utf8'));
 });
});
