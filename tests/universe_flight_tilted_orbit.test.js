import { describe,it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const window={};vm.runInNewContext(readFileSync('stem_lab/universe_flight_scene.js','utf8'),{window,Math});
const plane=window.UniverseFlight.math.orbitPlane;
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0),length=a=>Math.hypot(...a),sub=(a,b)=>a.map((v,i)=>v-b[i]);
const sample=(p,angle)=>p.center.map((v,i)=>v+p.radial[i]*Math.cos(angle)+p.tangent[i]*Math.sin(angle));
describe('Tilted camera orbit geometry',()=>{
  it('anchors the tilted circle to the current position without changing its radius',()=>{
    const start=[2,3,-10],center=[1,-2,4],before=JSON.stringify([start,center]),p=plane(start,center,35);
    sample(p,0).forEach((v,i)=>expect(v).toBeCloseTo(start[i],12));
    expect(length(p.axis)).toBeCloseTo(1,12);expect(dot(p.axis,p.radial)).toBeCloseTo(0,12);expect(dot(p.axis,p.tangent)).toBeCloseTo(0,12);expect(dot(p.radial,p.tangent)).toBeCloseTo(0,12);
    expect(length(p.radial)).toBeCloseTo(p.radiusLy,12);expect(length(p.tangent)).toBeCloseTo(p.radiusLy,12);expect(p.radiusLy).toBeCloseTo(Math.hypot(1,-14),12);expect(JSON.stringify([start,center])).toBe(before);
  });
  it('completes a rising and falling circle while preserving range and the orbit plane',()=>{
    const center=[2,1,4],p=plane([2,3,-10],center,35),heights=[];
    for(let n=0;n<=120;n++){const point=sample(p,n*Math.PI/60);heights.push(point[1]);expect(length(sub(point,center))).toBeCloseTo(p.rangeLy,11);expect(dot(sub(point,p.center),p.axis)).toBeCloseTo(0,11);}
    sample(p,2*Math.PI).forEach((v,i)=>expect(v).toBeCloseTo([2,3,-10][i],11));expect(Math.max(...heights)-Math.min(...heights)).toBeGreaterThan(10);
  });
  it('matches the level orbit and reverses along the same tilted circle',()=>{
    const start=[3,4,-10],center=[0,1,0],p=plane(start,center,0),angle=.3;
    const actual=sample(p,angle);expect(actual[0]).toBeCloseTo(3*Math.cos(angle)-10*Math.sin(angle),12);expect(actual[1]).toBe(4);expect(actual[2]).toBeCloseTo(-3*Math.sin(angle)-10*Math.cos(angle),12);
    const tilted=plane(start,center,35);for(const a of[0,.4,2,4]){const forward=sample(tilted,a),reverse=sample(tilted,a+2*Math.PI);forward.forEach((v,i)=>expect(v).toBeCloseTo(reverse[i],11));}
  });
  it('keeps accepted paths clear of the vertical look limit',()=>{
    for(const elevation of[-85,-60,0,60,85])for(const bearing of[-170,-30,90]){
      const e=elevation*Math.PI/180,a=bearing*Math.PI/180,start=[10*Math.cos(e)*Math.sin(a),10*Math.sin(e),10*Math.cos(e)*Math.cos(a)],p=plane(start,[0,0,0],35);expect(p).not.toBeNull();
      for(let n=0;n<360;n++){const point=sample(p,n*Math.PI/180);expect(Math.abs(point[1])/10).toBeLessThan(Math.cos(.01));}
    }
    expect(plane([.001,10,0],[0,0,0],35)).toBeNull();
  });
  it('rejects malformed, coincident, polar and unsupported inputs',()=>{
    for(const tilt of[-1,46,NaN,Infinity,'35'])expect(plane([0,0,-10],[0,0,0],tilt)).toBeNull();
    for(const start of[null,[],[0,0,0],[0,10,0],[NaN,0,0],[Infinity,0,0]])expect(plane(start,[0,0,0],35)).toBeNull();
    expect(plane([0,0,-10],[Number.MAX_VALUE,-Number.MAX_VALUE,Number.MAX_VALUE],35)).toBeNull();
  });
});
