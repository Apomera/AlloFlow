import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8');
const marker="  window.StemLab.registerTool('scaleExplorer', {";
const sandbox={window:{StemLab:{registerTool(){}}},console:{log(){}}};
vm.runInNewContext(source.replace(marker,'  window.parameciumChecks={point:parameciumPoint,limit:inspectionLimit,details:atlasDetails,notes:readObservations,drafts:readObservationDrafts,items:ITEMS};\n'+marker),sandbox);
const api=sandbox.window.parameciumChecks;
const plain=x=>JSON.parse(JSON.stringify(x));
const ids=['para-overview','cilia','pellicle','oral-groove','nuclei','contractile-vacuole','food-vacuoles'];
const details=plain(api.details('paramecium',(_,fallback)=>fallback));

describe('Paramecium microscope: physical reference and saved views',()=>{
 it('preserves the catalog reference length of 200 micrometres',()=>{
  expect(api.items.find(item=>item.id==='paramecium')).toMatchObject({size:2e-4,dim:'long'});
 });
 it('provides seven distinct, finite camera destinations with source links',()=>{
  expect(details.map(d=>d.id).sort()).toEqual([...ids].sort());
  for(const detail of details){const p=plain(api.point(detail.id));expect([...p.at,...p.view,p.zoom].every(Number.isFinite)).toBe(true);expect(p.at).toHaveLength(3);expect(p.view).toHaveLength(3);expect(Math.hypot(...p.view)).toBeGreaterThan(0);expect(p.zoom).toBeGreaterThanOrEqual(1);expect(p.zoom).toBeLessThanOrEqual(api.limit('paramecium'));expect(typeof p.cutaway).toBe('boolean');expect(detail.at).toEqual(p.at);expect(detail.view).toEqual(p.view);expect(detail.zoom).toBe(p.zoom);expect(detail.cutaway).toBe(p.cutaway);expect(detail.label.trim()).toBeTruthy();expect(detail.body.trim()).toBeTruthy();expect(detail.source).toMatch(/^https:\/\//);}
 });
 it('uses the whole-cell camera for malformed destinations',()=>{
  const overview=plain(api.point('para-overview'));for(const value of [undefined,null,'',NaN,Infinity,[],{},true,0,'missing','constructor','__proto__','toString'])expect(plain(api.point(value))).toEqual(overview);
 });
 it('isolates returned camera arrays from later calls',()=>{
  for(const id of ids){const original=plain(api.point(id)),edited=api.point(id);edited.at[0]=12345;edited.view[1]=-54321;expect(plain(api.point(id))).toEqual(original);}
 });
 it('opens the anatomical interior and encloses surface destinations',()=>{
  for(const id of ['cilia','pellicle','oral-groove'])expect(api.point(id).cutaway).toBe(false);
  for(const id of ['para-overview','nuclei','contractile-vacuole','food-vacuoles'])expect(api.point(id).cutaway).toBe(true);
 });
 it('retains both saved cutaway states and each existing destination',()=>{
  for(const detail of details)for(const cutaway of [true,false]){const raw={itemId:'paramecium',detailId:detail.id,note:'Observe '+detail.id,cutaway,zoom:detail.zoom,yaw:.34,pitch:.22,view:'atlas'},notes=plain(api.notes([raw]));expect(notes).toHaveLength(1);expect(notes[0]).toMatchObject(raw);expect(notes[0].size).toBe(2e-4);}
  for(const oldId of ['cilia','oral-groove','nuclei','contractile-vacuole'])expect(api.notes([{itemId:'paramecium',detailId:oldId}])[0].detailId).toBe(oldId);
 });
 it('rejects unknown notebook destinations and clamps damaged zoom values',()=>{
  expect(api.notes([{itemId:'paramecium',detailId:'invented-layer'}])).toHaveLength(0);expect(api.notes([{itemId:'paramecium',detailId:'nuclei',zoom:1e9}])[0].zoom).toBe(api.limit('paramecium'));expect(api.notes([{itemId:'paramecium',detailId:'nuclei',zoom:NaN}])[0].zoom).toBe(1);
 });
 it('preserves drafts only for valid structures',()=>{
  const drafts=Object.fromEntries(ids.map(id=>['paramecium:'+id,'Saved '+id]));expect(plain(api.drafts({...drafts,'paramecium:invented-layer':'bad','paramecium:constructor':'bad'}))).toEqual(drafts);
 });
});
