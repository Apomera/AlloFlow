import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const window={};
const source=readFileSync('stem_lab/universe_flight_scene.js','utf8');
vm.runInNewContext(source.replace('  global.UniverseFlight =','  global.__leg={create:flybyLeg,position:flybyLegPosition};\n  global.UniverseFlight ='),{window,Math});
const leg=window.__leg;
describe('Cinematic route timing',()=>{
  it('has monotonic finite endpoints and continuous velocity at each ramp boundary',()=>{
    for(const distance of[.001,.08,1,4,38])for(const depart of[false,true]){
      const plan=leg.create(7,7+distance,depart),h=distance*1e-6;
      expect(leg.position(plan,0)).toBe(7);expect(leg.position(plan,plan.duration+1)).toBe(7+distance);
      let previous=7;for(let i=0;i<=200;i++){const value=leg.position(plan,plan.duration*i/200);expect(value).toBeGreaterThanOrEqual(previous);expect(value).toBeLessThanOrEqual(plan.end);previous=value;}
      for(const t of[plan.entry,plan.duration-plan.exit].filter(t=>t>h)){
        const left=(leg.position(plan,t)-leg.position(plan,t-h))/h,right=(leg.position(plan,t+h)-leg.position(plan,t))/h;
        expect(Math.abs(left-right)).toBeLessThan(.0001);
      }
      expect((plan.end-leg.position(plan,plan.duration-h))/h).toBeLessThan(.0001);
      if(depart)expect((leg.position(plan,h)-plan.start)/h).toBeLessThan(.0001);
    }
  });
});
