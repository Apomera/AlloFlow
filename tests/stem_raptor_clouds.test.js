import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
const a=source.indexOf('function cloudVisibility('),b=source.indexOf('function applyCloudLighting(',a);
const visibility=Function('return ('+source.slice(a,b).trim()+')')();
describe('Raptor cloud distance blending',()=>{
  it('fades out on every wrap boundary and stays continuous across a recycled position',()=>{
    expect(visibility(0,0,300,100)).toBe(1);
    for(const axis of [0,1])for(const side of [-1,1]){
      const p=(v)=>axis?[0,v]:[v,0];
      expect(visibility(...p(side*340),500,100)).toBe(1);
      expect(visibility(...p(side*390),500,100)).toBeCloseTo(0.5,10);
      expect(visibility(...p(side*450),500,100)).toBe(0);
      expect(visibility(...p(side*449.99),500,100)).toBe(visibility(...p(-side*449.99),500,100));
    }
  });
  it('softens close billboard crossings, stays bounded, and has smooth blend endpoints',()=>{
    expect(visibility(0,0,32,100)).toBe(0);expect(visibility(0,0,85,100)).toBe(1);
    expect(visibility(0,0,58.5,100)).toBeCloseTo(0.5,10);
    expect(visibility(0,0,32.001,100)).toBeLessThan(1e-8);
    expect(1-visibility(0,0,84.999,100)).toBeLessThan(1e-8);
    for(let x=-600;x<=600;x+=37)for(let d=0;d<400;d+=19){const value=visibility(x,x*0.5,d,100);expect(value).toBeGreaterThanOrEqual(0);expect(value).toBeLessThanOrEqual(1);}
  });
});
