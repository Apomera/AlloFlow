import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let BH;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_beehive.js','beehive');BH=window.__RR_TEST_EXPORTS__.beehive;});
describe('Illustrative meadow ecology',()=>{
  it('recreates each plant layer without external randomness or shared mutable arrays',()=>{
    const a=BH.bhDroneHabitatLayout(),b=BH.bhDroneHabitatLayout();expect(a).toEqual(b);expect(a).not.toBe(b);
    expect(a.filter(p=>p.kind==='shrub')).toHaveLength(60);expect(a.filter(p=>p.kind==='grass')).toHaveLength(168);expect(a.filter(p=>p.kind==='reed')).toHaveLength(96);
    a[0].height=-1;expect(b[0].height).toBeGreaterThan(0);
  });
  it('places reeds on both stream margins, with open space through the flight lane',()=>{
    const plants=BH.bhDroneHabitatLayout();
    for(const p of plants){expect([p.x,p.z,p.height,p.width,p.angle].every(Number.isFinite)).toBe(true);expect(p.height).toBeGreaterThan(0);expect(p.height).toBeLessThanOrEqual(20);
      if(p.kind==='reed'){const offset=Math.abs(p.x-(-270+Math.sin(p.z*.004)*55));expect(offset).toBeGreaterThanOrEqual(17);expect(offset).toBeLessThan(24);}
      else expect(Math.abs(p.x)).toBeGreaterThanOrEqual(p.kind==='shrub'?100:42);
    }
    for(const kind of ['grass','shrub','reed']){const subset=plants.filter(p=>p.kind===kind).slice(0,12);expect(Math.max(...subset.map(p=>p.z))-Math.min(...subset.map(p=>p.z))).toBeGreaterThan(1900);}
  });
  it('uses the actual encounter thresholds and ignores invalid birds without modifying evidence',()=>{
    const state={x:0,y:80,z:0,paused:true,birds:[{x:NaN,y:80,z:0},{x:0,y:80,z:119}],energy:70,score:20},before=JSON.stringify(state);
    expect(BH.bhDronePredatorReadout(state)).toMatchObject({status:'nearby',distance:119});expect(JSON.stringify(state)).toBe(before);
    expect(BH.bhDronePredatorReadout({...state,birds:[{x:0,y:80,z:19.9}]}).status).toBe('contact');
    expect(BH.bhDronePredatorReadout({...state,birds:[{x:0,y:80,z:20}]}).status).toBe('nearby');
    expect(BH.bhDronePredatorReadout({...state,birds:[{x:0,y:80,z:120}]}).status).toBe('clear');
  });
  it('does not report unknown position as safe or invent a bird when none exists',()=>{
    expect(BH.bhDronePredatorReadout({})).toMatchObject({status:'unknown'});
    expect(BH.bhDronePredatorReadout({x:0,y:80,z:0,birds:[]})).toMatchObject({status:'clear',text:'No predator birds in this flight.'});
  });
});
