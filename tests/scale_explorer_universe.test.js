import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

// Independent FLRW reference values supplied for the declared flat cosmology.
// Distances are present-day comoving distance, not light-travel distance or
// proper distance at emission. Units below use the exact Julian year and c.
// The CMB anchor includes radiation: dropping it noticeably changes early age.
const MPC_METRES=3.085677581491367e22;
const JULIAN_YEAR_SECONDS=365.25*86400;
const GLY_METRES=299792458*JULIAN_YEAR_SECONDS*1e9;
const REFERENCE_METRES=8.8e26;
const anchors=[
 {z:0,distanceGly:0,ageGyr:13.79069},
 {z:1,distanceGly:11.09237,ageGyr:5.840747},
 {z:3,distanceGly:21.21513,ageGyr:2.138429},
 {z:8,distanceGly:29.76559,ageGyr:.635564},
 {z:1089,distanceGly:45.21887,ageGyr:.000371771},
 {z:Infinity,distanceGly:46.13327,ageGyr:0}
];
const source=fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8');
const marker="  window.StemLab.registerTool('scaleExplorer', {";
if(!source.includes('UNIVERSE_COSMO'))throw new Error('Universe cosmology helpers missing');
const sandbox={window:{StemLab:{registerTool(){}}},console:{log(){}}};
vm.runInNewContext(source.replace(marker,'  window.universeChecks={cosmo:UNIVERSE_COSMO,epoch:universeEpoch,horizon:UNIVERSE_HORIZON,epochs:UNIVERSE_EPOCHS,sliceIndex:universeSliceIndex,viewEpoch:universeViewEpoch,details:atlasDetails,notes:readObservations,drafts:readObservationDrafts,items:ITEMS};\n'+marker),sandbox);
const api=sandbox.window.universeChecks;
const plain=x=>JSON.parse(JSON.stringify(x));
const closeVector=(actual,expected,digits=11)=>{expect(actual).toHaveLength(3);actual.forEach((v,i)=>expect(v).toBeCloseTo(expected[i],digits));};
const coreIds=['universe-overview','universe-near','universe-growth','universe-dawn','universe-cmb','universe-horizon'];
const coreRedshifts=[0,1,3,8,1089,Infinity];
const details=plain(api.details('universe',(_,fallback)=>fallback));

describe('Observable universe cosmology and exploration',()=>{
 it('declares the flat cosmology and preserves the catalog measurement',()=>{
  expect(plain(api.cosmo)).toEqual({H0:67.4,matter:.315,radiation:.000092,lambda:.684908});
  expect(api.cosmo.matter+api.cosmo.radiation+api.cosmo.lambda).toBeCloseTo(1,14);
  const item=api.items.find(item=>item.id==='universe');
  expect(item.size).toBe(REFERENCE_METRES);
 });

 it('matches independent distance and age anchors through the radiation era',()=>{
  for(const anchor of anchors){
   const actual=api.epoch(anchor.z);
   expect(actual.z).toBe(anchor.z);
   expect(Math.abs(actual.distanceMpc*MPC_METRES/GLY_METRES-anchor.distanceGly)).toBeLessThan(5e-5);
   // 10,000-year tolerance for rounded Gyr anchors, 10 years at recombination.
   expect(Math.abs(actual.ageGyr-anchor.ageGyr)).toBeLessThan(anchor.z===1089?1e-8:1e-5);
  }
 });

 it('normalizes physical comoving distance against the diameter reference',()=>{
  for(const anchor of anchors){
   const actual=api.epoch(anchor.z);
   expect(actual.radius).toBeCloseTo(actual.distanceMpc*MPC_METRES/REFERENCE_METRES,12);
   expect(actual.radius).toBeCloseTo(anchor.distanceGly*GLY_METRES/REFERENCE_METRES,6);
  }
  // The independent integrated horizon need not equal the rounded 93 Gly ruler.
  expect(api.horizon.radius).toBeGreaterThan(.49);
  expect(api.horizon.radius).toBeLessThan(.5);
 });

 it('separates the last-scattering surface from the particle horizon',()=>{
  const cmb=api.epoch(1089),horizon=api.horizon;
  expect(horizon.z).toBe(Infinity);
  expect(horizon.ageGyr).toBe(0);
  expect(horizon.distanceMpc).toBeGreaterThan(cmb.distanceMpc);
  expect(horizon.radius).toBeGreaterThan(cmb.radius);
  expect((horizon.distanceMpc-cmb.distanceMpc)*MPC_METRES/GLY_METRES).toBeCloseTo(.91440,4);
  expect(cmb.ageGyr*1e9).toBeGreaterThan(370000);
  expect(cmb.ageGyr*1e9).toBeLessThan(374000);
  expect(horizon.distanceMpc).toBeCloseTo(api.epoch(Infinity).distanceMpc,10);
 });

 it('builds 101 ordered samples from today through the CMB epoch',()=>{
  const epochs=api.epochs;
  expect(epochs).toHaveLength(101);
  expect(epochs[0].z).toBe(0);
  expect(epochs[100].z).toBeCloseTo(1089,10);
  expect(epochs[0].distanceMpc).toBe(0);
  expect(epochs[100].ageGyr).toBeCloseTo(.000371771,8);
  for(let i=0;i<epochs.length;i++){
   const epoch=epochs[i];
   expect(epoch.z).toBeCloseTo(Math.pow(1090,i/100)-1,10);
   expect([epoch.z,epoch.distanceMpc,epoch.ageGyr,epoch.lookbackGyr,epoch.radius].every(Number.isFinite)).toBe(true);
   if(i){
    expect(epoch.z).toBeGreaterThan(epochs[i-1].z);
    expect(epoch.distanceMpc).toBeGreaterThan(epochs[i-1].distanceMpc);
    expect(epoch.radius).toBeGreaterThan(epochs[i-1].radius);
    expect(epoch.ageGyr).toBeLessThan(epochs[i-1].ageGyr);
    expect(epoch.lookbackGyr).toBeGreaterThan(epochs[i-1].lookbackGyr);
   }
  }
 });

 it('conserves age plus lookback time across every selectable epoch',()=>{
  const today=api.epoch(0);
  expect(today.lookbackGyr).toBe(0);
  for(const epoch of [...api.epochs,api.horizon]){
   expect(epoch.ageGyr).toBeGreaterThanOrEqual(0);
   expect(epoch.lookbackGyr).toBeGreaterThanOrEqual(0);
   expect(epoch.ageGyr+epoch.lookbackGyr).toBeCloseTo(today.ageGyr,9);
   expect(epoch.radius).toBeCloseTo(epoch.distanceMpc*MPC_METRES/REFERENCE_METRES,12);
  }
 });

 it('treats invalid and negative redshifts as today without propagating NaN',()=>{
  const today=plain(api.epoch(0));
  for(const invalid of [undefined,null,NaN,-Infinity,-1,-1e6,'invalid',{},[]]){
   expect(plain(api.epoch(invalid))).toEqual(today);
  }
  const capped=plain(api.epoch(1e7));
  for(const huge of [1e8,Number.MAX_VALUE])expect(plain(api.epoch(huge))).toEqual(capped);
  expect(capped.ageGyr).toBeGreaterThan(0);
  expect(capped.distanceMpc).toBeLessThan(api.horizon.distanceMpc);
 });

 it('round-trips every sample index and rejects malformed selection IDs',()=>{
  for(let i=0;i<=100;i++)expect(api.sliceIndex('universe-slice-'+i)).toBe(i);
  for(const invalid of ['',undefined,null,NaN,100,'universe-overview','universe-slice-','universe-slice--1','universe-slice-101','universe-slice-1.5','universe-slice-1e2','universe-slice-1junk','other-slice-1'])expect(api.sliceIndex(invalid)).toBe(null);
 });

 it('resolves named views and slider views to the correct physical epoch',()=>{
  coreIds.forEach((id,i)=>{
   const actual=api.viewEpoch(id),expected=api.epoch(coreRedshifts[i]);
   expect(actual.z).toBe(expected.z);
   expect(actual.radius).toBeCloseTo(expected.radius,12);
   expect(actual.ageGyr).toBeCloseTo(expected.ageGyr,12);
  });
  for(let i=0;i<=100;i++){
   const actual=api.viewEpoch('universe-slice-'+i);
   expect(actual.z).toBeCloseTo(api.epochs[i].z,10);
   expect(actual.radius).toBeCloseTo(api.epochs[i].radius,12);
  }
  for(const invalid of ['',undefined,'universe-missing','universe-slice-101','constructor','toString','__proto__'])expect(plain(api.viewEpoch(invalid))).toEqual(plain(api.epoch(0)));
 });

 it('provides six unique guide views and all 101 sample targets',()=>{
  expect(details).toHaveLength(107);
  expect(details.slice(0,6).map(d=>d.id)).toEqual(coreIds);
  expect(details.slice(6).map(d=>d.id)).toEqual(Array.from({length:101},(_,i)=>'universe-slice-'+i));
  expect(new Set(details.map(d=>d.id)).size).toBe(107);
  expect(details.every(d=>d.universeSite&&d.at.length===3&&d.at.every(Number.isFinite)&&d.view.length===3&&d.view.every(Number.isFinite)&&Number.isFinite(d.zoom)&&d.zoom>0)).toBe(true);
  expect(details.slice(6).every(d=>d.universeSample===true)).toBe(true);
  // Teaching text must distinguish a modelled lookback view from a solid edge.
  expect(details.every(d=>typeof d.label==='string'&&d.label.trim()&&typeof d.body==='string'&&d.body.trim())).toBe(true);
  expect(details.slice(0,6).every(d=>/^https:\/\//.test(d.source))).toBe(true);
 });

 it('positions guide and sample targets at their physical shell distance',()=>{
  for(const detail of details){
   const epoch=api.viewEpoch(detail.id);
   closeVector(detail.at,[.8*epoch.radius,0,.6*epoch.radius]);
   expect(Math.hypot(...detail.at)).toBeCloseTo(epoch.radius,12);
  }
 });

 it('restores every named view and slider position through notebook records',()=>{
  // The notebook intentionally has a 24-record limit; validate all sample IDs
  // in separate records rather than weakening that existing limit.
  for(const detail of details){
   const raw={itemId:'universe',detailId:detail.id,note:'Remember '+detail.id,zoom:2,yaw:.34,pitch:.22,view:'atlas'};
   const notes=plain(api.notes([raw]));
   expect(notes).toHaveLength(1);
   expect(notes[0]).toMatchObject(raw);
   expect(notes[0].size).toBe(REFERENCE_METRES);
   const restored=details.find(d=>d.id===notes[0].detailId);
   closeVector(restored.at,detail.at);
   expect(api.viewEpoch(notes[0].detailId).radius).toBeCloseTo(api.viewEpoch(detail.id).radius,12);
  }
  const raw=details.filter(d=>coreIds.includes(d.id)||['universe-slice-0','universe-slice-50','universe-slice-100'].includes(d.id)).map(d=>({itemId:'universe',detailId:d.id}));
  const invalid=['universe-missing','universe-slice--1','universe-slice-101'].map(detailId=>({itemId:'universe',detailId}));
  expect(plain(api.notes(raw.concat(invalid))).map(n=>n.detailId)).toEqual(raw.map(n=>n.detailId));
 });

 it('retains drafts for the whole study and rejects unknown slider targets',()=>{
  const drafts=Object.fromEntries(details.map(d=>['universe:'+d.id,'Saved '+d.id]));
  expect(plain(api.drafts({...drafts,'universe:universe-missing':'Unknown','universe:universe-slice-101':'Beyond range'}))).toEqual(drafts);
 });
});
