import fs from 'node:fs';
import {describe,it,expect} from 'vitest';
const source=fs.readFileSync('stem_lab/stem_tool_titration.js','utf8');
const pure=source.slice(source.indexOf('function titrationBurettePosition('),source.indexOf('function TitrationVolumeContributions('));
const {parts,difference}=new Function(pure+';return {parts:titrationVolumeContributions,difference:titrationVolumeDifference};')();
describe('per-fill delivered volume visual',()=>{
 it('shows the actual reading interval within the first or a later fill',()=>{
  expect(parts(12.3,24.9)).toEqual({rows:[{fill:1,from:12.3,to:24.9,volume:12.6,startFraction:0.246,widthFraction:0.252}],total:12.6,refills:0});
  expect(parts(62.3,74.9).rows[0]).toMatchObject({fill:2,from:12.3,to:24.9,volume:12.6});
 });
 it('splits a refill into the counted end and beginning intervals',()=>{
  expect(parts(49.5,50.5)).toEqual({rows:[{fill:1,from:49.5,to:50,volume:0.5,startFraction:0.99,widthFraction:0.01},{fill:2,from:0,to:0.5,volume:0.5,startFraction:0,widthFraction:0.01}],total:1,refills:1});
 });
 it('includes a complete intervening fill without counting the refill as delivery',()=>{
  expect(parts(49.5,100.5).rows.map(r=>[r.fill,r.volume])).toEqual([[1,0.5],[2,50],[3,0.5]]);expect(parts(49.5,100.5).total).toBe(51);
 });
 it('keeps exact 50/100/150 mL readings on the empty fill',()=>{
  expect(parts(49.5,50).rows).toHaveLength(1);expect(parts(50,50.1).rows.map(r=>[r.fill,r.from,r.to,r.volume])).toEqual([[1,50,50,0],[2,0,0.1,0.1]]);
  expect(parts(100,100.1).rows.map(r=>[r.fill,r.volume])).toEqual([[2,0],[3,0.1]]);expect(parts(0,150).rows.map(r=>[r.fill,r.volume])).toEqual([[1,50],[2,50],[3,50]]);
 });
 it('preserves refill identity before rounding restored decimal readings',()=>{
  expect(parts(49.5,50.04)).toMatchObject({refills:1,total:0.5,rows:[{fill:1,volume:0.5},{fill:2,volume:0}]});
  expect(parts(50.04,50.14)).toMatchObject({refills:0,total:0.1,rows:[{fill:2,from:0,to:0.1,volume:0.1}]});
  expect(parts(50,50.04)).toMatchObject({refills:1,total:0,rows:[{fill:1,volume:0},{fill:2,volume:0}]});
 });
 it('does not invent a minimum visible amount when the total is zero or a single tenth',()=>{
  expect(parts(25,25)).toMatchObject({total:0,rows:[{from:25,to:25,widthFraction:0}]});expect(parts(49.9,50).rows[0].widthFraction).toBe(0.002);
 });
 it('keeps row totals, geometry and the existing calculation in agreement',()=>{
  const values=[0,0.01,0.04,0.1,12.3,24.9,49.5,49.9,49.99,50,50.04,50.1,62.3,99.95,100,100.04,100.1,125,149.9,150];
  for(const start of values)for(const end of values.filter(v=>v>=start)){
   const p=parts(start,end);expect(p.rows.length).toBeGreaterThanOrEqual(1);expect(p.rows.length).toBeLessThanOrEqual(3);expect(p.total).toBe(difference(start,end).total);expect(p.rows.reduce((n,r)=>n+Math.round(r.volume*10),0)).toBe(Math.round(p.total*10));
   for(const row of p.rows){expect(row.from).toBeGreaterThanOrEqual(0);expect(row.to).toBeLessThanOrEqual(50);expect(row.to).toBeGreaterThanOrEqual(row.from);expect(row.startFraction).toBeCloseTo(row.from/50,12);expect(row.widthFraction).toBeCloseTo(row.volume/50,12);expect(row.startFraction+row.widthFraction).toBeLessThanOrEqual(1.00000000001);}
  }
 });
 it('withholds invalid marks and backwards readings, even inside the same rounded tenth',()=>{
  for(const bad of [undefined,null,NaN,Infinity,-1,150.1,'25',{},[]]){expect(parts(bad,30)).toBeNull();expect(parts(0,bad)).toBeNull();}
  for(const [a,b] of [[25,24.9],[50.04,50],[50.04,50.01],[100.1,50.1]])expect(parts(a,b)).toBeNull();
 });
 it('registers matching English fallbacks for the visual and tracker',()=>{
  const section=source.slice(source.indexOf('function TitrationVolumeContributions('),source.indexOf('function TitrationReadingLens(')),en=JSON.parse(fs.readFileSync('dev-tools/i18n/stem_titration_en.json','utf8'));let count=0;
  for(const m of section.matchAll(/t\('stem\.titration\.([a-z0-9_]+)',\s*('(?:[^'\\]|\\.)*')\)/g)){expect(en[m[1]],m[1]).toBe(new Function('return '+m[2])());count++;}expect(count).toBeGreaterThan(25);
 });
});
