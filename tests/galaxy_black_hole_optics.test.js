import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source=readFileSync('stem_lab/stem_tool_galaxy.js','utf8');
const kernel=source.split('// BEGIN BLACK HOLE OPTICS MODEL')[1].split('// END BLACK HOLE OPTICS MODEL')[0];
const {ray,table,impact,fraction,shift}=new Function(kernel+';return {ray:blackHoleLightRay,table:blackHoleOpticalTable,impact:blackHoleImpactAt,fraction:blackHoleImpactFraction,shift:blackHoleDiskShift};')();
const critical=1.5*Math.sqrt(3);

describe('Schwarzschild optical paths',()=>{
  it.each([.5,.9,.99,1.01,1.1,2])('matches the capture threshold at %s times the critical impact parameter',multiple=>{
    expect(ray(critical*multiple).outcome).toBe(multiple<1?'captured':'escaped');
  });
  it('conserves the null-geodesic invariant through a strong deflection',()=>{
    for(const b of [2,2.5,2.63,4,12])expect(ray(b).energyError).toBeLessThan(1e-8);
  });
  it('approaches the weak-field deflection 2 Rs / b',()=>{
    const b=1000,radius=1e6,result=ray(b,{radius,step:.001});
    const deflection=result.endAngle-Math.PI+Math.asin(b/radius);
    expect(result.outcome).toBe('escaped');
    expect(Math.abs(deflection-2/b)).toBeLessThan(6e-6);
  });
  it('spends a larger angle near the photon sphere as the critical ray is approached',()=>{
    expect(ray(critical*1.0001).endAngle).toBeGreaterThan(ray(critical*1.01).endAngle);
    expect(ray(critical*.9999).endAngle).toBeGreaterThan(ray(critical*.99).endAngle);
  });
  it('maps the entire inward light cone into a table with extra samples near the critical ray',()=>{
    const maximum=20/Math.sqrt(.95);
    for(const x of [0,.1,.4,.499,.5,.501,.6,.9,1])expect(fraction(impact(x,maximum),maximum)).toBeCloseTo(x,6);
    expect(impact(.5,maximum)).toBeCloseTo(critical,12);
  });
  it('packs finite path radii and escape classifications into portable 16-bit values',()=>{
    const data=table(128);
    expect(data.radial.length).toBe(128*128*4);
    for(const row of [0,20,50,70,100,127]){
      const run=ray(impact(row/127,data.maximum),{samples:128});
      for(const col of [0,1,12,30,60,127]){
        const at=(row*128+col)*4,decoded=(data.radial[at]*256+data.radial[at+1])/65535;
        expect(Math.abs(decoded-run.values[col])).toBeLessThanOrEqual(.5/65535+1e-12);
      }
      expect(data.escape[row*4+2]===255).toBe(run.outcome==='escaped');
    }
  });
  it('has the transverse shift face-on and opposite Doppler shifts on the approaching and receding sides',()=>{
    const r=6;
    expect(shift(r,0,20)).toBeCloseTo(Math.sqrt(1-1.5/r)/Math.sqrt(.95),12);
    expect(shift(r,-5,20)).toBeGreaterThan(1);
    expect(shift(r,5,20)).toBeLessThan(shift(r,0,20));
  });
});
