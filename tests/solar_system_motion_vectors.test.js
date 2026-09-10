import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const source=readFileSync('stem_lab/stem_tool_solarsystem.js','utf8');
const start=source.indexOf('  function solveKepler('),end=source.indexOf('  // One common x/y scale preserves eccentricity;',start);
const {pos,velocity,explain}=new Function('var TAU=2*Math.PI,G_SI=6.674e-11,M_SUN=1.989e30,AU_KM=1.496e8;'+source.slice(start,end)+';return {pos:orbitalPos,velocity:orbitalVelocity,explain:orbitalMotionExplanation};')();
describe('exact orbital motion directions',()=>{
  for(const e of [0,0.01671,0.20564,0.9671])it('conserves energy and angular momentum for eccentricity '+e,()=>{
    const a=17.83,mu=6.674e-11*1.989e30/1e9,km=1.496e8;
    for(let j=0;j<=96;j++) {
      const M=j/96*Math.PI*2,p=pos(a,e,M),v=velocity(a,e,M);
      expect(Number.isFinite(v.x+v.y)).toBe(true);
      expect(v.x*v.x+v.y*v.y).toBeCloseTo(mu*(2/(p.r*km)-1/(a*km)),7);
      const momentum=(p.x*v.y-p.y*v.x)*km;
      expect(momentum/Math.sqrt(mu*a*km*(1-e*e))).toBeCloseTo(1,8);
      const normalX=(p.x+a*e)/(a*a),normalY=p.y/(a*a*(1-e*e));
      expect(normalX*v.x+normalY*v.y).toBeCloseTo(0,8);
    }
  });
  it('points perpendicular to the radius at both apsides and accepts wrapped time',()=>{
    const v=velocity(1,0.20564,0),apo=velocity(1,0.20564,Math.PI);
    expect(v.x).toBeCloseTo(0,9);expect(v.y).toBeGreaterThan(0);expect(apo.y).toBeLessThan(0);
    expect(velocity(1,0.20564,-Math.PI/2)).toEqual(velocity(1,0.20564,Math.PI*1.5));
  });
  it('explains outward, inward, and near-circular motion without confusing force with velocity',()=>{
    const mercury={a:0.387,e:0.20564,T:0.241};
    expect(explain(mercury,mercury.T/4)).toContain('reduces speed');
    expect(explain(mercury,mercury.T*3/4)).toContain('increases speed');
    expect(explain(mercury,0)).toContain('turning point');
    expect(explain({a:1,e:0.01671,T:1},0.25)).toContain('Nearly circular');
  });
});
