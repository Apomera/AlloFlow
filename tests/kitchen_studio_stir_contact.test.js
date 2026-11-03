import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const Contact=require('../stem_lab/kitchen_studio/kitchen_studio_stir_contact.js');
const length=point=>Math.hypot(point.x,point.z);
const displacement=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const blade={x:-.23,z:0};
const ring=(radius=.29,travel=0)=>Array.from({length:8},(_,index)=>({x:Math.cos(index*Math.PI/4+travel*.2)*radius,z:Math.sin(index*Math.PI/4+travel*.2)*radius}));

describe('Reversible local stirring contact',()=>{
  it('moves food near the blade while preserving far food exactly',()=>{
    const points=[{x:-.14,z:0},{x:.14,z:0}],moved=Contact.layout(points,blade,.5);
    expect(displacement(moved[0],points[0])).toBeGreaterThan(.02);
    expect(moved[1]).toEqual(points[1]);
    expect(moved[1]).not.toBe(points[1]);
  });
  it('responds locally for both the crowded and spread base arrangements',()=>{
    for(const radius of [.14,.29]){
      const points=ring(radius),moved=Contact.layout(points,blade,.5),deltas=points.map((p,i)=>displacement(p,moved[i]));
      expect(deltas.filter(delta=>delta>.005).length).toBeGreaterThan(0);
      expect(deltas.filter(delta=>delta===0).length).toBeGreaterThan(0);
      expect(Math.max(...deltas)).toBeLessThanOrEqual(.09+1e-12);
    }
  });
  it('moves near pieces in opposite tangential directions for opposite stirring',()=>{
    const points=[{x:-.14,z:0}],forward=Contact.layout(points,blade,.5)[0],backward=Contact.layout(points,blade,-.5)[0];
    expect(forward.z).toBeLessThan(0);expect(backward.z).toBeGreaterThan(0);
    expect(forward.z).toBeCloseTo(-backward.z,12);
    expect(forward.x).toBeCloseTo(backward.x,12);
    expect(forward.x).toBeGreaterThan(points[0].x);
  });
  it('follows the blade at another angle without nudging its previous neighbours',()=>{
    const points=[{x:-.14,z:0},{x:0,z:.14}],moved=Contact.layout(points,{x:0,z:.23},.5);
    expect(moved[0]).toEqual(points[0]);expect(moved[1].x).toBeLessThan(0);
    expect(displacement(moved[1],points[1])).toBeGreaterThan(.02);
  });
  it('leaves zero travel at the untouched base with fresh coordinates',()=>{
    const points=ring(),moved=Contact.layout(points,blade,0);
    expect(moved).toEqual(points);expect(moved).not.toBe(points);
    moved.forEach((p,index)=>expect(p).not.toBe(points[index]));
  });
  it('ramps gently from pickup rather than jumping to full contact',()=>{
    const points=[{x:-.14,z:0}],tiny=Contact.layout(points,blade,.001)[0],partial=Contact.layout(points,blade,.06)[0],full=Contact.layout(points,blade,.12)[0];
    expect(displacement(tiny,points[0])).toBeGreaterThan(0);
    expect(displacement(tiny,points[0])).toBeLessThan(.00002);
    expect(displacement(partial,points[0])).toBeLessThan(displacement(full,points[0]));
    expect(displacement(partial,points[0])).toBeGreaterThan(displacement(tiny,points[0]));
    expect(Contact.layout(points,blade,20)).toEqual(Contact.layout(points,blade,.12));
  });
  it('is continuous at the contact edge and does not move pieces beyond it',()=>{
    const justInside={x:-.03001,z:0},edge={x:-.03,z:0},outside={x:-.02999,z:0};
    expect(displacement(Contact.layout([justInside],blade,.5)[0],justInside)).toBeLessThan(1e-8);
    expect(Contact.layout([edge],blade,.5)[0]).toEqual(edge);
    expect(Contact.layout([outside],blade,.5)[0]).toEqual(outside);
  });
  it('attenuates displacement as food gets farther from the blade',()=>{
    const points=[{x:-.18,z:0},{x:-.13,z:0},{x:-.08,z:0}],moved=Contact.layout(points,blade,.5),delta=points.map((p,i)=>displacement(p,moved[i]));
    expect(delta[0]).toBeGreaterThan(delta[1]);expect(delta[1]).toBeGreaterThan(delta[2]);
  });
  it('keeps coincident blade and food positions finite in both directions',()=>{
    for(const travel of [-1,1]){
      const moved=Contact.layout([blade],blade,travel)[0];
      expect(Number.isFinite(moved.x)&&Number.isFinite(moved.z)).toBe(true);
      expect(displacement(moved,blade)).toBeGreaterThan(0);expect(length(moved)).toBeLessThanOrEqual(.335);
    }
  });
  it('passes smoothly through a piece centre without flipping its normal offset',()=>{
    const points=[{x:.23,z:0}],epsilon=1e-7;
    for(const travel of [-1,1]){
      const centre=Contact.layout(points,{x:.23,z:0},travel)[0];
      expect(centre.x).toBe(points[0].x);
      for(const axis of ['x','z']){
        const left={x:.23,z:0},right={x:.23,z:0};left[axis]-=epsilon;right[axis]+=epsilon;
        const a=Contact.layout(points,left,travel)[0],b=Contact.layout(points,right,travel)[0];
        expect(displacement(a,b)).toBeLessThan(epsilon*10);
        expect(displacement(a,centre)).toBeLessThan(epsilon*10);expect(displacement(b,centre)).toBeLessThan(epsilon*10);
      }
    }
  });
  it('keeps an outward-pushed cap centre inside the pan rim',()=>{
    const points=[{x:.335,z:0}],moved=Contact.layout(points,{x:.23,z:0},1)[0];
    expect(length(moved)).toBeCloseTo(.335,12);expect(moved.z).toBeGreaterThan(0);
    expect(displacement(moved,points[0])).toBeGreaterThan(0);
  });
  it('stays bounded throughout crowded and spread circular previews',()=>{
    for(const radius of [.14,.29,.335])for(let step=0;step<16;step++)for(const travel of [-7,-.03,.03,7]){
      const angle=step*Math.PI/8,tool={x:Math.cos(angle)*.23,z:Math.sin(angle)*.23},points=ring(radius,travel),moved=Contact.layout(points,tool,travel);
      expect(moved).toHaveLength(points.length);
      moved.forEach((p,index)=>{
        expect(Number.isFinite(p.x)&&Number.isFinite(p.z)).toBe(true);expect(length(p)).toBeLessThanOrEqual(.335+1e-12);
        expect(displacement(p,points[index])).toBeLessThanOrEqual(.09+1e-12);
        if(displacement(points[index],tool)>=.20)expect(p).toEqual(points[index]);
      });
    }
  });
  it('recomputes a frame without accumulation or changes to frozen inputs',()=>{
    const points=Object.freeze(ring(.29,.5).map(Object.freeze)),tool=Object.freeze({...blade}),before=JSON.stringify(points),first=Contact.layout(points,tool,.5);
    Contact.layout(ring(.14),{x:.23,z:0},-1);
    expect(Contact.layout(points,tool,.5)).toEqual(first);expect(JSON.stringify(points)).toBe(before);expect(tool).toEqual(blade);
    first[0].x=99;expect(Contact.layout(points,tool,.5)[0].x).not.toBe(99);
  });
  it.each([null,undefined,{},'points',1,[null],[[]],[{x:NaN,z:0}],[{x:0,z:Infinity}],[{x:'0',z:0}],[{x:.336,z:0}]])('rejects malformed or out-of-pan base points %j',points=>{
    expect(Contact.layout(points,blade,.5)).toEqual([]);
  });
  it('rejects sparse arrays rather than returning holes in the food layout',()=>expect(Contact.layout(new Array(2),blade,.5)).toEqual([]));
  it.each([null,undefined,[],{},false,{x:NaN,z:0},{x:0,z:Infinity},{x:'0',z:.23},{x:0,z:0},{x:.069,z:0},{x:.461,z:0}])('leaves the base unchanged with invalid blade contact %j',tool=>{
    const points=ring();const moved=Contact.layout(points,tool,.5);expect(moved).toEqual(points);expect(moved).not.toBe(points);
  });
  it.each([NaN,Infinity,-Infinity,null,undefined,'1',true])('leaves the base unchanged for invalid travel %j',travel=>{
    const points=ring();expect(Contact.layout(points,blade,travel)).toEqual(points);
  });
  it.each([.07,.46])('accepts the inclusive blade radius %s',radius=>{
    const points=[{x:Math.min(.335,radius),z:0}],moved=Contact.layout(points,{x:radius,z:0},.5);
    expect(displacement(moved[0],points[0])).toBeGreaterThan(0);
  });
  it('handles an empty arrangement without introducing new food',()=>expect(Contact.layout([],blade,1)).toEqual([]));
});
