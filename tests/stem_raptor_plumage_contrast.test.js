import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
const start=source.indexOf('function raptorPlumageContrast('),open=source.indexOf('{',start);
let depth=1,end=open+1;for(;depth;end++){if(source[end]==='{')depth++;else if(source[end]==='}')depth--;}
const contrast=Function('return ('+source.slice(start,end)+')')();

describe('Raptor plumage visibility',()=>{
  it('lifts dark plumage in a dim habitat more than white plumage',()=>{
    const dark=contrast(.16,.0888,.0141,0),white=contrast(.16,.9553,.0141,0);
    expect(dark.shadowFill).toBeGreaterThan(.1);expect(dark.shadowFill).toBeGreaterThan(white.shadowFill*10);
    expect(dark.edgeShade).toBe(0);expect(white.edgeShade).toBe(0);
  });
  it('shades the contours of white plumage that nearly matches bright snow',()=>{
    const snow=contrast(.06,.9553,.8959,1);
    expect(snow.edgeShade).toBeGreaterThan(.3);expect(snow.shadowFill).toBe(0);
    expect(contrast(.06,.9553,.25,1).edgeShade).toBe(0);
  });
  it('keeps an already distinct daytime falcon at its existing light level',()=>{
    const daylight=contrast(.06,.0522,.4762,1);
    expect(daylight).toEqual({shadowFill:0,edgeShade:0});
  });
  it('removes snow contour shading as the habitat becomes dark',()=>{
    const dusk=contrast(.10,.9553,.8959,.55),day=contrast(.06,.9553,.8959,1);
    expect(dusk.edgeShade).toBeCloseTo(day.edgeShade*.5,8);
    expect(contrast(.16,.9553,.8959,.1).edgeShade).toBe(0);
  });
  it('bounds both lighting contributions across all pigment and backdrop extremes',()=>{
    for(const light of [0,.06,.16,.22,1])for(const body of [0,.05,.5,.95,1])for(const background of [0,.05,.5,.95,1])for(const day of [0,.25,.55,1]){
      const value=contrast(light,body,background,day);
      expect(value.shadowFill).toBeGreaterThanOrEqual(0);expect(value.shadowFill).toBeLessThanOrEqual(.2);
      expect(value.edgeShade).toBeGreaterThanOrEqual(0);expect(value.edgeShade).toBeLessThanOrEqual(.46);
    }
  });
});
