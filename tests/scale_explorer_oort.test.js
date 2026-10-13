import {describe,it,expect} from 'vitest';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8'),start=source.indexOf('  function oortOrbitPoint('),end=source.indexOf('  function isElectromagneticWave(',start);if(start<0||end<start)throw new Error('Oort orbit helper missing');
const orbit=vm.runInNewContext(source.slice(start,end)+'\noortOrbitPoint;'),au=149597870700/1.5e16;
describe('Oort Cloud illustrative orbit',()=>{
 it('places the stated perihelion and aphelion at true radial scale',()=>{expect(Math.hypot(...orbit(0))/au).toBeCloseTo(30,8);expect(Math.hypot(...orbit(Math.PI))/au).toBeCloseTo(40000,8);});
 it('keeps the Sun at one ellipse focus throughout the inclined orbit',()=>{const q=orbit(0),Q=orbit(Math.PI),center=q.map((v,i)=>(v+Q[i])/2),second=center.map(v=>v*2),major=(40000+30)*au;for(let i=0;i<300;i++){const p=orbit(i/300*Math.PI*2),distance=Math.hypot(...p)+Math.hypot(...p.map((v,j)=>v-second[j]));expect(distance).toBeCloseTo(major,12);expect(p.every(Number.isFinite)).toBe(true);}});
 it('forms a closed path in one tilted plane inside the reference cloud',()=>{const first=orbit(0),last=orbit(Math.PI*2);first.forEach((v,i)=>expect(v).toBeCloseTo(last[i],12));for(let i=0;i<300;i++){const p=orbit(i/300*Math.PI*2);expect(p[1]*Math.cos(.48)-p[2]*Math.sin(.48)).toBeCloseTo(0,12);expect(Math.hypot(...p)).toBeLessThan(.5);}});
});
