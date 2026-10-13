import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';

// Independent fixture: VizieR J/ApJ/944/94/table2, retrieved via Harvard mirror.
// Source TSV SHA-256: e85d07f12db3823e9a1bafd0851915c4bf78f833814d73566517453044d78a6c
// Columns: PGC, 1PGC, DM, e_DM, SGL, SGB. Filter: a spherical reference window
// of diameter 9.461e23 m centered halfway to measured M87 (PGC 41361).
// Expected rows/digest were calculated from the raw TSV, outside production helpers.
const source=fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8');
const start=source.indexOf('  var VIRGO_CATALOG='),end=source.indexOf('  var LOCAL_BUBBLE_MAP=',start);
if(start<0||end<start)throw new Error('Virgo catalog helpers missing');
const api=vm.runInNewContext(source.slice(start,end)+'\n({VIRGO_CATALOG,VIRGO_REFERENCE_MPC,VIRGO_CORE,VIRGO_WINDOW_CENTER,VIRGO_FRAME,virgoDistance,virgoPoint,virgoUncertainty});');
const rows=Array.from(api.VIRGO_CATALOG,r=>Array.from(r)),referenceMpc=9.461e23/3.085677581491367e22;
const point=r=>api.virgoPoint(r[4],r[5],api.virgoDistance(r[2]));
const closeVector=(a,b,digits=11)=>a.forEach((v,i)=>expect(v).toBeCloseTo(b[i],digits));
const rawTsv=fs.readFileSync('reports/scale-explorer-virgo/cf4-nearby.tsv');
const sourceLines=rawTsv.toString('utf8').split(/\r?\n/),sourceHeader=sourceLines.findIndex(l=>l.startsWith('PGC\t'));
const sourceRows=sourceLines.slice(sourceHeader+3).filter(l=>/^\s*\d+\t/.test(l)).map(l=>l.split('\t').map(Number));
// Calculate the crop in native supergalactic Cartesian coordinates, independently
// of the production axis mapping and helper functions.
function nativePoint(row){const lon=row[4]*Math.PI/180,lat=row[5]*Math.PI/180,d=10**(row[2]/5-5);return [d*Math.cos(lat)*Math.cos(lon),d*Math.cos(lat)*Math.sin(lon),d*Math.sin(lat)];}

describe('Virgo Supercluster measured atlas',()=>{
 it('reproduces the spherical sample directly from the unchanged source TSV',()=>{
  expect(createHash('sha256').update(rawTsv).digest('hex')).toBe('e85d07f12db3823e9a1bafd0851915c4bf78f833814d73566517453044d78a6c');
  expect(sourceHeader).toBeGreaterThan(0);
  expect(sourceLines[sourceHeader].split('\t')).toEqual(['PGC','1PGC','DM','e_DM','SGL','SGB']);
  expect(sourceRows).toHaveLength(2158);
  const origin=nativePoint(sourceRows.find(r=>r[0]===41361)).map(v=>v/2);
  const selected=sourceRows.filter(row=>Math.hypot(...nativePoint(row).map((v,i)=>v-origin[i]))<=referenceMpc/2);
  expect(rows.toSorted((a,b)=>a[0]-b[0])).toEqual(selected.toSorted((a,b)=>a[0]-b[0]));
  for(const row of rows){const [x,y,z]=nativePoint(row);closeVector(point(row),[x/referenceMpc,z/referenceMpc,-y/referenceMpc]);}
 });
 it('retains the independently selected original catalog rows without additions or changed measurements',()=>{
  expect(rows).toHaveLength(1018);
  expect(new Set(rows.map(r=>r[0])).size).toBe(rows.length);
  for(const r of rows){expect(r).toHaveLength(6);expect(r.every(Number.isFinite)).toBe(true);expect(r[3]).toBeGreaterThan(0);}
  const digest=createHash('sha256').update(JSON.stringify(rows.toSorted((a,b)=>a[0]-b[0]))).digest('hex');
  expect(digest).toBe('51144dca1060877bf212d254dc683e0d215faa2b30c2b51b81b9923317b00dd7');
  expect(rows.filter(r=>r[1]===41220)).toHaveLength(162);
 });
 it('uses the physical 100-million-light-year reference and logarithmic distance-modulus relation',()=>{
  const entry=source.match(/id: 'virgo-sc',[^\n]+/);
  expect(entry).not.toBeNull();
  expect(entry[0]).toContain("size: 9.461e23, dim: 'reference span'");
  expect(api.VIRGO_REFERENCE_MPC).toBeCloseTo(referenceMpc,12);
  expect(api.virgoDistance(25)).toBeCloseTo(1,12);
  expect(api.virgoDistance(30)).toBeCloseTo(10,12);
  expect(api.virgoDistance(35)).toBeCloseTo(100,12);
  expect(api.virgoDistance(31.134)).toBeCloseTo(16.85776517828977,11);
  expect(Math.hypot(...api.virgoPoint(73,21,referenceMpc))).toBeCloseTo(1,12);
 });
 it('keeps supergalactic coordinates in a right-handed frame with SGZ vertically up',()=>{
  const x=api.virgoPoint(0,0,referenceMpc),y=api.virgoPoint(90,0,referenceMpc),z=api.virgoPoint(0,90,referenceMpc);
  closeVector(x,[1,0,0]);closeVector(y,[0,0,-1]);closeVector(z,[0,1,0]);
  closeVector([x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]],z);
  closeVector(api.virgoPoint(360,0,referenceMpc),x);
 });
 it('anchors M87 separately from the Virgo group key and keeps the selected reference window centered correctly',()=>{
  const m87=rows.find(r=>r[0]===41361),m49=rows.find(r=>r[0]===41220);
  expect(m87[1]).toBe(41220);expect(m49).toBeDefined();
  expect(m87).toEqual([41361,41220,31.134,0.04,102.8805,-2.348]);
  closeVector(api.VIRGO_CORE,point(m87));
  closeVector(api.VIRGO_WINDOW_CENTER,api.VIRGO_CORE.map(v=>v*.5));
  expect(Math.hypot(...point(m87).map((v,i)=>v-point(m49)[i]))).toBeGreaterThan(.03);
  for(const r of rows)expect(Math.hypot(...point(r).map((v,i)=>v-api.VIRGO_WINDOW_CENTER[i]))).toBeLessThanOrEqual(.5+1e-12);
 });
 it('converts distance uncertainty into asymmetric radial limits without changing sky position',()=>{
  for(const id of [41361,41220,2557,5818,47404]){
   const row=rows.find(r=>r[0]===id);expect(row).toBeDefined();
   const [near,far]=api.virgoUncertainty(row),p=point(row),mid=Math.hypot(...p),lo=Math.hypot(...near),hi=Math.hypot(...far),factor=10**(row[3]/5);
   expect(lo).toBeCloseTo(mid/factor,12);expect(hi).toBeCloseTo(mid*factor,12);
   expect(lo).toBeLessThan(mid);expect(hi).toBeGreaterThan(mid);
   expect(hi-mid).toBeGreaterThan(mid-lo);
   closeVector(near.map(v=>v/lo),p.map(v=>v/mid));closeVector(far.map(v=>v/hi),p.map(v=>v/mid));
  }
 });
 it('fits all measured locations without silently stretching or clipping the physical reference',()=>{
  const points=rows.map(point),min=[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))),max=[0,1,2].map(i=>Math.max(...points.map(p=>p[i])));
  closeVector(api.VIRGO_FRAME.min,min);closeVector(api.VIRGO_FRAME.max,max);
  closeVector(api.VIRGO_FRAME.center,min.map((v,i)=>(v+max[i])*.5));
  for(const p of points){expect(p.every(Number.isFinite)).toBe(true);for(let i=0;i<3;i++){expect(p[i]).toBeGreaterThanOrEqual(api.VIRGO_FRAME.min[i]-1e-12);expect(p[i]).toBeLessThanOrEqual(api.VIRGO_FRAME.max[i]+1e-12);}}
 });
});
