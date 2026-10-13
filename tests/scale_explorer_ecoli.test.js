import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8');
const marker="  window.StemLab.registerTool('scaleExplorer', {";
const sandbox={window:{StemLab:{registerTool(){}}},console:{log(){}}};
vm.runInNewContext(source.replace(marker,'  window.ecoliChecks={reference:ECOLI_REFERENCE_M,dimensions:ECOLI_DIMENSIONS,point:ecoliPoint,clipNear:ecoliClipNear,limit:inspectionLimit,details:atlasDetails,notes:readObservations,drafts:readObservationDrafts,items:ITEMS};\n'+marker),sandbox);
const api=sandbox.window.ecoliChecks;
const plain=x=>JSON.parse(JSON.stringify(x));
const ids=['ecoli-overview','cell-envelope','ecoli-envelope-section','nucleoid','ribosomes','flagella','ecoli-motor'];
const details=plain(api.details('ecoli',(_,fallback)=>fallback));
const closeVector=(actual,expected,digits=12)=>{expect(actual).toHaveLength(3);actual.forEach((v,i)=>expect(v).toBeCloseTo(expected[i],digits));};

describe('E. coli physical reference, navigation and notebook compatibility',()=>{
 it('preserves the two-micrometre catalog body reference',()=>{
  expect(api.items.find(item=>item.id==='ecoli')).toMatchObject({size:2e-6,dim:'long'});expect(api.reference).toBe(2e-6);
 });
 it('offers seven finite measured destinations with sources',()=>{
  expect(details.map(d=>d.id)).toEqual(ids);expect(new Set(details.map(d=>d.id)).size).toBe(7);
  for(const detail of details){const p=api.point(detail.id);expect([...p.at,...p.view,p.zoom].every(Number.isFinite)).toBe(true);expect(p.at).toHaveLength(3);expect(p.view).toHaveLength(3);expect(Math.hypot(...p.view)).toBeGreaterThan(0);expect(p.zoom).toBeGreaterThanOrEqual(1);expect(p.zoom).toBeLessThanOrEqual(api.limit('ecoli'));expect(typeof p.cutaway).toBe('boolean');closeVector(detail.at,p.at);closeVector(detail.view,p.view);expect(detail.zoom).toBe(p.zoom);expect(detail.cutaway).toBe(p.cutaway);expect(detail.label.trim()).toBeTruthy();expect(detail.body.trim()).toBeTruthy();expect(detail.source).toMatch(/^https:\/\//);}
 });
 it('counts peptidoglycan within the periplasm rather than adding it twice',()=>{
  const d=api.dimensions;expect(d.lengthM).toBe(api.reference);expect(d.widthM/d.lengthM).toBeCloseTo(.4,14);expect(d.envelopeM).toBeCloseTo(d.outerMembraneM+d.periplasmM+d.innerMembraneM,20);expect(d.peptidoglycanM).toBeLessThan(d.periplasmM);expect(d.outerGapM+d.peptidoglycanM).toBeLessThan(d.periplasmM);expect(d.envelopeM).toBe(34e-9);expect(d.ribosomeM).toBe(25e-9);expect(d.flagellumM).toBe(20e-9);expect(d.pilusM).toBe(7e-9);
 });
 it('uses safe overview defaults for unknown detail IDs',()=>{
  const overview=plain(api.point('ecoli-overview'));for(const value of [undefined,null,'',NaN,Infinity,[],{},true,0,'missing','constructor','__proto__','toString'])expect(plain(api.point(value))).toEqual(overview);
 });
 it('returns independent coordinates so camera edits cannot corrupt later views',()=>{
  for(const id of ids){const original=plain(api.point(id)),edited=api.point(id);edited.at[0]=12345;edited.view[1]=-54321;expect(plain(api.point(id))).toEqual(original);}
 });
 it('opens interior destinations and keeps exterior destinations enclosed',()=>{
  for(const id of ['ecoli-overview','cell-envelope','flagella'])expect(api.point(id).cutaway).toBe(false);
  for(const id of ['ecoli-envelope-section','nucleoid','ribosomes','ecoli-motor'])expect(api.point(id).cutaway).toBe(true);
  const visits=Object.fromEntries(details.filter(d=>d.visit).map(d=>[d.id,d.visit]));expect(visits).toEqual({nucleoid:'dna',ribosomes:'ribosome'});
 });
 it('preserves every new or legacy view and either saved section state',()=>{
  for(const detail of details)for(const cutaway of [true,false]){const raw={itemId:'ecoli',detailId:detail.id,note:'Observe '+detail.id,cutaway,zoom:detail.zoom,yaw:.34,pitch:.22,view:'atlas'},notes=plain(api.notes([raw]));expect(notes).toHaveLength(1);expect(notes[0]).toMatchObject(raw);expect(notes[0].size).toBe(2e-6);}
  for(const oldId of ['cell-envelope','flagella','nucleoid','ribosomes'])expect(api.notes([{itemId:'ecoli',detailId:oldId}])[0].detailId).toBe(oldId);
 });
 it('rejects unknown notebook destinations while bounding damaged camera values',()=>{
  expect(api.notes([{itemId:'ecoli',detailId:'invented-layer'}])).toHaveLength(0);expect(api.notes([{itemId:'ecoli',detailId:'ecoli-motor',zoom:1e9}])[0].zoom).toBe(api.limit('ecoli'));expect(api.notes([{itemId:'ecoli',detailId:'ecoli-motor',zoom:NaN}])[0].zoom).toBe(1);
 });
 it('keeps saved drafts only for valid cell structures',()=>{
  const drafts=Object.fromEntries(ids.map(id=>['ecoli:'+id,'Saved '+id]));expect(plain(api.drafts({...drafts,'ecoli:invented-layer':'bad','ecoli:constructor':'bad'}))).toEqual(drafts);
 });
 it('keeps camera depth precision finite across cell and molecular inspection',()=>{
  for(const d of [.005,.05,.5,2,6.8,20,1000]){expect(api.clipNear(d)).toBeGreaterThan(0);expect(api.clipNear(d)).toBeLessThan(d);expect(api.clipNear(d)).toBeLessThanOrEqual(.05);expect(api.clipNear(d)).toBeCloseTo(Math.min(.05,d*.02),12);}
  for(const bad of [undefined,null,NaN,Infinity,-Infinity,0,-1,'1',{},[]])expect(api.clipNear(bad)).toBe(.05);
  expect(api.clipNear(Number.MIN_VALUE)).toBe(.00001);
 });
});
