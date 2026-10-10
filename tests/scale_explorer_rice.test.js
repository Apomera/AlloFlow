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
