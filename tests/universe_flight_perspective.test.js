import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const window = {};
vm.runInNewContext(readFileSync('stem_lab/universe_flight_scene.js','utf8'), {window,Math});
const move=window.UniverseFlight.math.orbitView;
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));

describe('Landmark viewpoint arcs',()=>{
  it('moves left and right relative to a centered landmark, preserving height and radius',()=>{
    const center=[2,3,4],start=[2,9,-6],r=distance(start,center);
    const left=move(start,center,'left',15,100),right=move(start,center,'right',15,100);
    expect(left.position[0]).toBeLessThan(start[0]);expect(right.position[0]).toBeGreaterThan(start[0]);
    for(const view of[left,right]){expect(view.position[1]).toBe(9);expect(distance(view.position,center)).toBeCloseTo(r,12);expect(view.distanceLy).toBeCloseTo(10*Math.PI/12,12);}
    expect(start).toEqual([2,9,-6]);expect(center).toEqual([2,3,4]);
  });
  it('moves above and below at fixed range, with an exact spherical arc length',()=>{
    const up=move([0,0,-10],[0,0,0],'up',15,100),down=move([0,0,-10],[0,0,0],'down',15,100);
    expect(up.position[1]).toBeGreaterThan(0);expect(down.position[1]).toBeLessThan(0);
    for(const view of[up,down]){expect(distance(view.position,[0,0,0])).toBeCloseTo(10,12);expect(view.distanceLy).toBeCloseTo(10*Math.PI/12,12);}
    expect(up.elevationDeg).toBeCloseTo(15,12);expect(down.elevationDeg).toBeCloseTo(-15,12);
  });
  it('caps elevation at 85 degrees, rejects further ascent and recovers from a pole',()=>{
    let p=[0,0,-10];for(let i=0;i<6;i++)p=move(p,[0,0,0],'up',15,100).position;
    expect(Math.atan2(p[1],Math.hypot(p[0],p[2]))*180/Math.PI).toBeCloseTo(85,12);
    expect(move(p,[0,0,0],'up',5,100)).toBeNull();expect(move(p,[0,0,0],'down',5,100).elevationDeg).toBeCloseTo(80,12);
    expect(move([0,10,0],[0,0,0],'left',15,100)).toBeNull();expect(move([0,10,0],[0,0,0],'down',15,100).elevationDeg).toBeCloseTo(75,12);
  });
  it('checks the intermediate arc against the scene limit, including a peak between valid endpoints',()=>{
    const theta=Math.PI/2-Math.PI/12,start=[8+3*Math.sin(theta),0,3*Math.cos(theta)];
    expect(Math.hypot(...start)).toBeLessThan(10.95);
    expect(move(start,[8,0,0],'left',30,10.95)).toBeNull();
    expect(move(start,[8,0,0],'left',30,11)).not.toBeNull();
    expect(Math.hypot(11,3)).toBeLessThan(11.53);
    expect(Math.hypot(8+3*Math.cos(Math.PI/6),4.5)).toBeLessThan(11.53);
    expect(move([11,3,0],[8,3,0],'up',30,11.53)).toBeNull();
    expect(move([0,0,-10],[0,0,0],'up',15,9)).toBeNull();
  });
  it('completes a circular survey without accumulating radius drift',()=>{
    let p=[0,0,-10],path=0;
    for(let i=0;i<24;i++){const view=move(p,[0,0,0],'left',15,100);p=view.position;path+=view.distanceLy;}
    expect(distance(p,[0,0,-10])).toBeLessThan(1e-12);expect(path).toBeCloseTo(20*Math.PI,11);
  });
  it('rejects invalid input and zero-radius views without inventing a direction',()=>{
    for(const degrees of[0,-5,46,NaN,Infinity,'15'])expect(move([0,0,-10],[0,0,0],'left',degrees,100)).toBeNull();
    for(const boundary of[0,-1,Infinity,NaN])expect(move([0,0,-10],[0,0,0],'left',15,boundary)).toBeNull();
    expect(move([0,0,0],[0,0,0],'up',15,100)).toBeNull();expect(move([NaN,0,0],[0,0,0],'up',15,100)).toBeNull();
    expect(move([0,0,-10],[0,0,0],'missing',15,100)).toBeNull();expect(move(null,[0,0,0],'up',15,100)).toBeNull();
  });
});
