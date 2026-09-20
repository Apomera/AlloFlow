import fs from 'node:fs';
import {describe,it,expect} from 'vitest';
const source=fs.readFileSync('stem_lab/stem_tool_titration.js','utf8');
const pure=source.slice(source.indexOf('function titrationBenchTracePoints('),source.indexOf('function TitrationBenchTrace('));
const frame=new Function(pure+';return titrationBenchTraceWindow;')();
const points=[{vol:0,y:0},{vol:10,y:100},{vol:20,y:200},{vol:30,y:300}];
describe('live curve volume window',()=>{
 it('keeps the complete volume axis as the default and ends at the exact current value',()=>{
  expect(frame(points,12,123,50)).toEqual({min:0,max:50,span:50,recent:false,points:[{vol:0,y:0},{vol:10,y:100},{vol:12,y:123}]});
 });
 it('follows a five-milliliter window with a stable initial range',()=>{
  for(const [volume,min,max] of [[0,0,5],[2,0,5],[5,0,5],[5.1,0.1,5.1],[25,20,25],[50,45,50],[80,75,80]]){const f=frame(points,volume,7,80,true);expect(f.min).toBeCloseTo(min,12);expect(f.max).toBe(max);expect(f.span).toBe(5);expect(f.points.at(-1)).toEqual({vol:volume,y:7});}
 });
 it('clips the entering line segment by interpolation instead of piling history on the left edge',()=>{
  expect(frame(points,12,123,50,true).points).toEqual([{vol:7,y:70},{vol:10,y:100},{vol:12,y:123}]);
  const f=frame([{vol:19,y:1},{vol:20,y:4},{vol:21,y:8}],25,12,50,true);expect(f.points).toEqual([{vol:20,y:4},{vol:21,y:8},{vol:25,y:12}]);
 });
 it('never exposes future curve values or invents history when only the current point exists',()=>{
  expect(frame(points,0,1,50,true).points).toEqual([{vol:0,y:1}]);expect(frame([],25,7,50,true).points).toEqual([{vol:25,y:7}]);
  const f=frame(points,12,123,50,true);expect(f.points.every(p=>p.vol<=12)).toBe(true);expect(f.points).not.toContainEqual({vol:20,y:200});
 });
 it('preserves current values and handles reset or rewind using only the current curve',()=>{
  const before=frame(points,26,6.8,50,true),rewound=frame(points,3,2,50,true);expect(before.points.at(-1).y).toBe(6.8);expect(rewound).toMatchObject({min:0,max:5,points:[{vol:0,y:0},{vol:3,y:2}]});
  expect(frame([{vol:0,y:0.6},{vol:0.2,y:0.8}],0.1,0.7,12,true).points).toEqual([{vol:0,y:0.6},{vol:0.1,y:0.7}]);
 });
 it('sanitizes and orders source samples without mutating them or duplicating current volume',()=>{
  const input=Object.freeze([Object.freeze({vol:10,y:9}),Object.freeze({vol:0,y:1}),{vol:10,y:10},{vol:12,y:999},null,{vol:-1,y:5},{vol:NaN,y:1},{vol:2,y:Infinity},{vol:'3',y:1},{vol:4,y:'2'}]);
  expect(frame(input,12,12,50).points).toEqual([{vol:0,y:1},{vol:10,y:10},{vol:12,y:12}]);expect(input[0]).toEqual({vol:10,y:9});
 });
 it('supports shorter ranges and requires explicit recent mode',()=>{
  expect(frame([],1,7,2,true)).toMatchObject({min:0,max:2,span:2,recent:true});for(const mode of [undefined,null,'true',1,{},[]])expect(frame([],12,7,50,mode)).toMatchObject({min:0,max:50,recent:false});
 });
 it('rejects malformed axis/current values without creating non-finite geometry',()=>{
  for(const bad of [undefined,null,NaN,Infinity,'25',{},[]]){expect(frame(points,bad,7,50,true)).toBeNull();expect(frame(points,25,bad,50,true)).toBeNull();expect(frame(points,25,7,bad,true)).toBeNull();}
  for(const args of [[-1,7,50],[51,7,50],[0,7,0],[0,7,-5]])expect(frame(points,...args,true)).toBeNull();expect(frame(null,25,7,50,true).points).toEqual([{vol:25,y:7}]);
 });
 it('keeps all retained points inside the window across supported experiment ranges',()=>{
  for(const max of [12,50,80]){const samples=Array.from({length:max*5+1},(_,i)=>({vol:i/5,y:i%17}));for(let i=0;i<=max*10;i++){const volume=i/10,f=frame(samples,volume,6.7,max,true);expect(f.points.at(-1)).toEqual({vol:volume,y:6.7});expect(f.points.every(p=>p.vol>=f.min&&p.vol<=volume)).toBe(true);expect(f.points.filter(p=>p.vol===f.min).length).toBeLessThanOrEqual(1);}}
 });
 it('keeps the tracker and new curve-window English fallbacks registered',()=>{
  const section=source.slice(source.indexOf('function TitrationBenchTrace('),source.indexOf('function titrationBenchDose(')),en=JSON.parse(fs.readFileSync('dev-tools/i18n/stem_titration_en.json','utf8'));let count=0;for(const m of section.matchAll(/t\('stem\.titration\.([a-z0-9_]+)',\s*('(?:[^'\\]|\\.)*')\)/g)){expect(en[m[1]],m[1]).toBe(new Function('return '+m[2])());count++;}expect(count).toBeGreaterThan(8);
 });
});
