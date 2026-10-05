import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),Camera=require('../stem_lab/kitchen_studio/recipe_lab_camera_fit.js');
const bounds={min:{x:-3.5,y:1.05,z:-1.9},max:{x:4.9,y:2.35,z:1.75}};
function visible(fit,point){const p=Camera.project(fit,point);expect(p.depth).toBeGreaterThan(.1);expect(Math.abs(p.x)).toBeLessThanOrEqual(.900000001);expect(Math.abs(p.y)).toBeLessThanOrEqual(.900000001);}

describe('Kitchen overview camera fits the complete working surfaces',()=>{
  for(const view of ['bench','top'])for(const aspect of [.35,.5,.75,1,1.5,2.5,4])it(`${view} keeps all working bounds within ten-percent padding at aspect ${aspect}`,()=>{
    const fit=Camera.fit({view,aspect,fov:38});expect(fit.fov).toBe(38);expect(fit.target).toEqual({x:.7,y:1.7,z:-.075});
    for(const point of Camera.corners(bounds))visible(fit,point);
    for(const point of [{x:4.9,y:1.17,z:.9},{x:4.66,y:1.47,z:.62},{x:3.76,y:1.47,z:.62},{x:-3.35,y:1.4,z:1}])visible(fit,point);
    expect(fit.maxDistance).toBeGreaterThan(fit.distance);expect(fit.maxDistance).toBeGreaterThanOrEqual(13);
  });
  it('backs out as a landscape bench becomes a portrait bench and restores the landscape frame when resized back',()=>{
    const initial=Camera.fit({aspect:2.5}),portrait=Camera.fit({aspect:.75}),restored=Camera.fit({aspect:2.5});
    expect(portrait.distance).toBeGreaterThan(initial.distance);expect(portrait.distance).toBeGreaterThan(20);expect(portrait.distance).toBeLessThan(21);
    expect(portrait.maxDistance).toBeGreaterThan(13);expect(restored).toEqual(initial);
    for(const point of Camera.corners())visible(portrait,point);
  });
  it('preserves the existing diagonal direction for the bench and a near-overhead direction for the top view',()=>{
    const bench=Camera.fit({aspect:1}),top=Camera.fit({view:'top',aspect:1});
    expect(bench.back.x/bench.back.z).toBeCloseTo(6/7,12);expect(bench.back.y/bench.back.z).toBeCloseTo(4.6/7,12);
    expect(top.back.y).toBeGreaterThan(.99);expect(top.back.z).toBeGreaterThan(0);expect(top.position.x).not.toBe(top.target.x);
  });
  it('fits a wider FOV without changing the supplied target or direction objects',()=>{
    const direction={x:6,y:4.6,z:7},target={x:.7,y:1.7,z:-.075},options={aspect:.75,fov:52,direction,target,bounds};
    const before=JSON.stringify(options),wide=Camera.fit(options),normal=Camera.fit({aspect:.75,fov:38});
    expect(JSON.stringify(options)).toBe(before);expect(wide.distance).toBeLessThan(normal.distance);
    for(const point of Camera.corners(bounds))visible(wide,point);
  });
  it('uses finite defaults for temporarily missing layout dimensions and invalid view options',()=>{
    for(const aspect of [undefined,0,-1,NaN,Infinity]){
      const fit=Camera.fit({aspect,fov:0,fill:1,direction:{x:0,y:0,z:0}});expect(fit).toEqual(Camera.fit());
      for(const point of Camera.corners())visible(fit,point);
    }
  });
  it('returns independent target and position data without sharing mutable defaults between calls',()=>{
    const fit=Camera.fit();fit.target.x=99;fit.position.x=-99;expect(Camera.fit().target).toEqual({x:.7,y:1.7,z:-.075});
    const first=Camera.corners();first[0].x=99;expect(Camera.corners()[0]).toEqual(bounds.min);
  });
});
