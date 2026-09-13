import fs from 'node:fs';
import {describe,it,expect} from 'vitest';
const source=fs.readFileSync('stem_lab/stem_tool_titration.js','utf8');
const pure=source.slice(source.indexOf('function titrationWeighingState('),source.indexOf('function titrationWeighingEquipment('));
const {inspect,note,step}=new Function(pure+';return {inspect:titrationAliquotInspection,note:titrationAliquotInspectionNote,step:titrationAliquotTransition};')();
const t=(key,fallback)=>fallback;
const load=()=>step(undefined,{type:'load'},{sourceUnits:4800,phase:'mixed',volumeUnits:10000,eyeLevel:true});
const act=(s,type)=>step(s,{type});
const phases=()=>{let s=load();return [s,...['condition','fill','eye','adjust','wall','drain','record','blow'].map(type=>s=act(s,type))];};
describe('pipetting apparatus inspection',()=>{
 it('follows the current technique without changing the recorded procedure',()=>{
  expect(phases().map(s=>inspect(s,'follow').view)).toEqual(['bench','filler','detail','detail','receiver','receiver','detail','detail','detail']);
  expect(inspect(undefined,'follow').view).toBe('bench');
 });
 it('keeps explicitly selected views as the procedure advances',()=>{
  for(const view of ['bench','filler','detail','receiver'])for(const s of phases())expect(inspect(s,view).view).toBe(view);
  for(const bad of [null,undefined,'invalid',{},42])expect(inspect(load(),bad).view).toBe('bench');
 });
 it('keeps the complete filler and pipette bulb inside its close-up as the pipette moves',()=>{
  for(const s of phases()) {const i=inspect(s,'filler'),[x,y,w,h]=i.viewBox.split(' ').map(Number);expect(x).toBeLessThan(i.px-29);expect(x+w).toBeGreaterThan(i.px+29);expect(y).toBeLessThan(11);expect(y+h).toBeGreaterThan(177);}
 });
 it('keeps the receiving vessel and working tip inside the receiver close-up',()=>{
  for(const s of phases().filter(s=>['adjusted','delivered','blown'].includes(s.phase))){const i=inspect(s,'receiver'),[x,y,w,h]=i.viewBox.split(' ').map(Number);expect(x).toBeLessThan(292);expect(x+w).toBeGreaterThan(376);expect(y).toBeLessThan(201);expect(y+h).toBeGreaterThan(283);expect(i.px).toBeGreaterThan(x);expect(i.px).toBeLessThan(x+w);}
 });
 it('distinguishes the unset meniscus from eye alignment and the completed mark',()=>{
  const states=phases();expect(note(t,states[2],'detail')).toContain('eye is too high');expect(note(t,states[3],'detail')).toContain('meniscus is still above');expect(note(t,states[4],'detail')).toContain('lower meniscus meets');
 });
 it('gives the remaining meniscus preparation step for unloaded, loaded, and conditioned states',()=>{expect(note(t,undefined,'detail')).toContain('Load a prepared solution');expect(note(t,load(),'detail')).toContain('solution is loaded');expect(note(t,act(load(),'condition'),'detail')).toContain('ready to fill');});
 it('describes receiver placement, valid retention, and blowout without inventing volume',()=>{
  const states=phases();expect(note(t,states[0],'receiver')).toContain('still empty');expect(note(t,states[4],'receiver')).toContain('before draining');expect(note(t,states[5],'receiver')).toContain('against the receiver wall');expect(note(t,states[6],'receiver')).toContain('retained liquid');expect(note(t,states[8],'receiver')).toContain('volume is not modeled');expect(note(t,states[8],'detail')).toContain('Restart pipetting');
 });
 it('uses sanitized saved state and never changes its input',()=>{
  const s=Object.freeze({...phases()[7]});expect(inspect(s,'receiver').delivered).toBe(true);expect(s.recorded).toBe(true);expect(note(t,s,'detail')).toContain('retained liquid');
  const bad={sourceUnits:Infinity,phase:'delivered',recorded:true,atWall:true,eyeLevel:true};expect(inspect(bad,'follow')).toMatchObject({view:'bench',delivered:false,loaded:false});expect(note(t,bad,'receiver')).toContain('still empty');expect(bad.sourceUnits).toBe(Infinity);
 });
});
