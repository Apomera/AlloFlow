import {describe,it,expect} from 'vitest';
import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8'),start=source.indexOf('  function ricePoint('),end=source.indexOf('  function inspectionLimit(',start);
if(start<0||end<start)throw new Error('Rice surface helper is missing');
const point=vm.runInNewContext('function clamp(x,a,b){return Math.max(a,Math.min(b,x));}\n'+source.slice(start,end)+'\nricePoint;');
describe('Milled rice grain morphology',()=>{
 it('keeps the tip-to-tip measuring length exactly one unit',()=>{expect(Array.from(point(0,0))).toEqual([0,-.5,0]);expect(Array.from(point(1,0))).toEqual([0,.5,0]);expect(point(1,0)[1]-point(0,0)[1]).toBe(1);});
 it('has a slender cross-section with less depth than width',()=>{const width=point(.5,0)[0]-point(.5,Math.PI)[0],depth=point(.5,Math.PI/2)[2]-point(.5,Math.PI*1.5)[2];expect(width).toBeGreaterThan(.27);expect(width).toBeLessThan(.31);expect(depth).toBeGreaterThan(.17);expect(depth).toBeLessThan(.21);expect(width/depth).toBeGreaterThan(1.4);});
 it('recesses the germ pocket on one face without cutting through the kernel',()=>{const front=point(.165,Math.PI/2)[2],back=point(.165,Math.PI*1.5)[2];expect(front).toBeGreaterThan(.01);expect(Math.abs(back)-front).toBeGreaterThan(.03);expect(front-back).toBeGreaterThan(.07);});
 it('stays finite and closed along the surface join',()=>{for(let i=0;i<=100;i++){const t=i/100,a=point(t,0),b=point(t,2*Math.PI);for(let k=0;k<3;k++)expect(a[k]).toBeCloseTo(b[k],10);for(let j=0;j<64;j++){const p=point(t,j/64*2*Math.PI);expect(p.every(Number.isFinite)).toBe(true);expect(p[1]).toBeGreaterThanOrEqual(-.5);expect(p[1]).toBeLessThanOrEqual(.5);expect(Math.abs(p[0])).toBeLessThan(.17);expect(Math.abs(p[2])).toBeLessThan(.11);}}});
});

const marker="  window.StemLab.registerTool('scaleExplorer', {",sandbox={window:{StemLab:{registerTool(){}}},console:{log(){}}};
vm.runInNewContext(source.replace(marker,'  window.riceChecks={point:riceSitePoint,limit:inspectionLimit,details:atlasDetails,notes:readObservations,drafts:readObservationDrafts,items:ITEMS};\n'+marker),sandbox);
const api=sandbox.window.riceChecks,plain=x=>JSON.parse(JSON.stringify(x));
const ids=['rice-surface','rice-germ','rice-profile','rice-husk','rice-bran','rice-section','rice-embryo'];
const details=plain(api.details('rice',(_,fallback)=>fallback));
describe('Rice grain study: anatomy and preserved observations',()=>{
 it('keeps the catalogue reference at seven millimetres',()=>{expect(api.items.find(item=>item.id==='rice')).toMatchObject({size:.007,dim:'long'});});
 it('provides seven finite, source-linked destinations within the inspection range',()=>{
  expect(details.map(d=>d.id).sort()).toEqual([...ids].sort());
  for(const detail of details){const p=plain(api.point(detail.id));expect([...p.at,...p.view,p.zoom].every(Number.isFinite)).toBe(true);expect(p.at).toHaveLength(3);expect(p.view).toHaveLength(3);expect(Math.hypot(...p.view)).toBeGreaterThan(0);expect(p.zoom).toBeGreaterThanOrEqual(1);expect(p.zoom).toBeLessThanOrEqual(api.limit('rice'));expect(typeof p.cutaway).toBe('boolean');expect(detail.at).toEqual(p.at);expect(detail.view).toEqual(p.view);expect(detail.zoom).toBe(p.zoom);expect(detail.cutaway).toBe(p.cutaway);expect(detail.label.trim()).toBeTruthy();expect(detail.body.trim()).toBeTruthy();expect(detail.source).toMatch(/^https:\/\//);}
 });
 it('falls back safely for malformed destination ids',()=>{
  const overview=plain(api.point('rice-surface'));for(const value of [undefined,null,'',NaN,Infinity,[],{},true,0,'missing','constructor','__proto__','toString'])expect(plain(api.point(value))).toEqual(overview);
 });
 it('returns independent camera vectors',()=>{for(const id of ids){const original=plain(api.point(id)),changed=api.point(id);changed.at[0]=999;changed.view[2]=-999;expect(plain(api.point(id))).toEqual(original);}});
 it('opens anatomical sections while the milling stages stay enclosed',()=>{
  for(const id of ['rice-surface','rice-germ','rice-profile','rice-husk','rice-bran'])expect(api.point(id).cutaway).toBe(false);
  for(const id of ['rice-section','rice-embryo'])expect(api.point(id).cutaway).toBe(true);
 });
 it('retains all stages and both cutaway states in saved observations',()=>{
  for(const detail of details)for(const cutaway of [true,false]){const raw={itemId:'rice',detailId:detail.id,note:'Inspect '+detail.id,cutaway,zoom:detail.zoom,yaw:.34,pitch:.22,view:'atlas'},notes=plain(api.notes([raw]));expect(notes).toHaveLength(1);expect(notes[0]).toMatchObject(raw);expect(notes[0].size).toBe(.007);}
  for(const old of ['rice-surface','rice-germ','rice-profile'])expect(api.notes([{itemId:'rice',detailId:old}])[0].detailId).toBe(old);
 });
 it('rejects unknown saved sites and bounds damaged zoom values',()=>{expect(api.notes([{itemId:'rice',detailId:'unknown-layer'}])).toHaveLength(0);expect(api.notes([{itemId:'rice',detailId:'rice-embryo',zoom:1e9}])[0].zoom).toBe(api.limit('rice'));expect(api.notes([{itemId:'rice',detailId:'rice-embryo',zoom:NaN}])[0].zoom).toBe(1);});
 it('keeps drafts only for available rice destinations',()=>{const drafts=Object.fromEntries(ids.map(id=>['rice:'+id,'Saved '+id]));expect(plain(api.drafts({...drafts,'rice:unknown-layer':'bad','rice:constructor':'bad'}))).toEqual(drafts);});
});
