import fs from 'node:fs';
import {describe,it,expect} from 'vitest';
const source=fs.readFileSync('stem_lab/stem_tool_titration.js','utf8');
const pure=source.slice(source.indexOf('function titrationWeighingState('),source.indexOf('function titrationWeighingEquipment('));
const {inspect,note,mass}=new Function(pure+';return {inspect:titrationTransferInspection,note:titrationTransferInspectionNote,mass:titrationTransferMass};')();
const t=(key,fallback)=>fallback;
const state=(phase='ready',residuePermille=40,sourceUnits=5000)=>({sourceUnits,phase,residuePermille,recordedPhase:null});
describe('sample transfer inspection and mass balance',()=>{
 it('follows the remaining solid until it has all reached the receiver',()=>{
  expect(inspect(undefined,'follow').view).toBe('bench');expect(inspect(state(),'follow').view).toBe('boat');expect(inspect(state('poured'),'follow').view).toBe('boat');expect(inspect(state('rinsed'),'follow').view).toBe('receiver');expect(inspect(state('poured',0),'follow').view).toBe('receiver');
 });
 it('keeps manually selected subjects across the transfer phases',()=>{
  for(const view of ['bench','boat','receiver'])for(const phase of ['ready','poured','rinsed'])expect(inspect(state(phase),view).view).toBe(view);
  for(const view of [null,undefined,'invalid',42,{}])expect(inspect(state(),view).view).toBe('bench');
 });
 it('frames the complete weighing boat before and after its actual drawing transform',()=>{
  const points=[[43,188],[116,161],[208,188],[191,218],[121,239],[62,218]];
  for(const phase of ['ready','poured','rinsed']){const [x,y,w,h]=inspect(state(phase),'boat').viewBox.split(' ').map(Number);for(let [px,py] of points){if(phase!=='ready'){const a=24*Math.PI/180,dx=px-121,dy=py-174;px=234+dx*Math.cos(a)-dy*Math.sin(a);py=68+dx*Math.sin(a)+dy*Math.cos(a);}expect(px).toBeGreaterThan(x+2);expect(px).toBeLessThan(x+w-2);expect(py).toBeGreaterThan(y+2);expect(py).toBeLessThan(y+h-2);}}
 });
 it('frames the receiver rim, walls, and shadow',()=>{
  const [x,y,w,h]=inspect(state('poured'),'receiver').viewBox.split(' ').map(Number);expect(x).toBeLessThan(245+1);expect(x+w).toBeGreaterThan(409);expect(y).toBeLessThan(114);expect(y+h).toBeGreaterThan(256);
 });
 it('shows a proportional split derived from actual rounded solid masses',()=>{
  for(const units of [1,9,99,5000,19999,20000])for(const setting of [0,1,40,99,100])for(const phase of ['ready','poured','rinsed']){const s=state(phase,setting,units),m=mass(s),i=inspect(s);expect(i.receivedFraction).toBe(m.received/m.source);expect(i.remainingFraction).toBe(m.remaining/m.source);expect(i.receivedFraction+i.remainingFraction).toBeCloseTo(1,12);}
  expect(inspect(state('poured'))).toMatchObject({receivedFraction:0.96,remainingFraction:0.04});expect(inspect(state('poured',100,1))).toMatchObject({receivedFraction:1,remainingFraction:0});
 });
 it('shows current mass after rinsing even if the dry record has not been updated',()=>{
  const s=Object.freeze({...state('rinsed'),recordedPhase:'poured'});expect(inspect(s)).toMatchObject({receivedFraction:1,remainingFraction:0});expect(mass(s,s.recordedPhase).received).toBe(4800);expect(s.recordedPhase).toBe('poured');
 });
 it('distinguishes unpoured, dry-residue, empty-boat, and wet-boat guidance',()=>{
  expect(note(t,state(),'boat')).toContain('starting solid');expect(note(t,state('poured'),'boat')).toContain('residue still');expect(note(t,state('poured',0),'boat')).toContain('No solid remains');expect(note(t,state('rinsed'),'boat')).toContain('cannot be used as a dry');expect(note(t,state('rinsed'),'receiver')).toContain('rinse solvent');
 });
 it('handles malformed sources without fractions or fictional grain accounting',()=>{
  for(const raw of [undefined,{}, {sourceUnits:Infinity,phase:'rinsed'}, {sourceUnits:'5000',phase:'poured'}]){expect(inspect(raw,'follow')).toMatchObject({view:'bench',receivedFraction:0,remainingFraction:0});expect(note(t,raw,'receiver')).toContain('Load a recorded sample');}
 });
});
