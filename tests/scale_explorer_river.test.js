import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8');
const sandbox={window:{StemLab:{registerTool(){}}}};
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {","  window.river={cameraBlend,canyonRouteKm,canyonRoutePoint,canyonRouteView,CANYON_PATH,readObservations};\n  window.StemLab.registerTool('scaleExplorer', {"),sandbox);
const {cameraBlend,canyonRouteKm:km,canyonRoutePoint:point,canyonRouteView:view,CANYON_PATH:path,readObservations:notes}=sandbox.window.river;
describe('Canyon route distance and saved positions',()=>{
  it('gives camera motion the same progress over equal elapsed time',()=>{
    const whole=1-cameraBlend(100,.82),steps=Math.pow(1-cameraBlend(10,.82),10);
    expect(whole).toBeCloseTo(steps,12);expect(cameraBlend(0,.82)).toBe(0);expect(cameraBlend(2000,.82)).toBe(cameraBlend(150,.82));
  });
  it('bounds malformed and older saved positions',()=>{
    expect([undefined,NaN,Infinity,'25',-1,0,223,900].map(km)).toEqual([0,0,0,0,0,0,223,446]);
    for(const value of [-20,Infinity,223,800]){
      expect(notes([{itemId:'grand-canyon',detailId:'river-journey',riverKm:value}])[0].riverKm).toBe(km(value));
    }
    expect(notes([{itemId:'grand-canyon',detailId:'river-journey'}])[0].riverKm).toBe(0);
  });
  it('reaches both ends of the measured river and advances equal route distances',()=>{
    expect(point(0)[0]).toBe(-.5);expect(point(446)[0]).toBe(.5);
    const sections=[];
    for(let start=0;start<400;start+=100){
      let length=0,previous=point(start);
      for(let i=1;i<=400;i++){const next=point(start+i/4);length+=Math.hypot(next[0]-previous[0],next[2]-previous[2]);previous=next;}
      sections.push(length/path.length*446);
    }
    sections.forEach(distance=>expect(distance).toBeCloseTo(100,1));
    // Distance follows bends, so half the length need not be the x midpoint.
    expect(point(223)[0]).not.toBeCloseTo(0,5);
  });
  it('keeps positions and headings continuous and finite across every kilometre',()=>{
    let previous=point(0);
    for(let i=0;i<=446;i++){
      const p=point(i),v=view(i);expect([...p,...v].every(Number.isFinite)).toBe(true);
      expect(p[0]).toBeGreaterThanOrEqual(previous[0]);expect(Math.hypot(v[0],v[2])).toBeCloseTo(1,8);
      expect(Math.hypot(p[0]-previous[0],p[2]-previous[2])).toBeLessThan(.004);previous=p;
    }
  });
});
