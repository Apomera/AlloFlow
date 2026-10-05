import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
const start=source.indexOf('function raptorAirflowFade('),open=source.indexOf('{',start);
let depth=1,end=open+1;for(;depth;end++){if(source[end]==='{')depth++;else if(source[end]==='}')depth--;}
const fade=Function('return ('+source.slice(start,end)+')')();

describe('Airflow stroke lifetimes',()=>{
  it('keeps position wraps invisible and hides values outside the lifetime',()=>{
    for(const progress of [-2,-.001,0,1,1.001,2])expect(fade(progress)).toBe(0);
    expect(fade(.00001)).toBeLessThan(.000001);
    expect(fade(.99999)).toBeLessThan(.000001);
  });
  it('gives the visible middle of a stroke a steady contribution',()=>{
    for(const progress of [.18,.3,.5,.68])expect(fade(progress)).toBeCloseTo(1,10);
  });
  it('appears and disappears gradually without overshooting opacity',()=>{
    let previous=0;
    for(let i=0;i<=20;i++){const value=fade(i*.18/20);expect(value).toBeGreaterThanOrEqual(previous);previous=value;}
    previous=1;
    for(let i=0;i<=20;i++){const value=fade(.68+i*.32/20);expect(value).toBeLessThanOrEqual(previous);expect(value).toBeGreaterThanOrEqual(0);previous=value;}
  });
  it('meets the hidden and steady parts without an abrupt change in fade rate',()=>{
    const step=.0001;
    for(const boundary of [0,.18,.68,1]){
      expect(Math.abs(fade(boundary+step)-fade(boundary))/step).toBeLessThan(.1);
      expect(Math.abs(fade(boundary-step)-fade(boundary))/step).toBeLessThan(.1);
    }
  });
  it('keeps every sampled lifetime finite and inside the opacity range',()=>{
    for(let i=-100;i<=1100;i++){const value=fade(i/1000);expect(Number.isFinite(value)).toBe(true);expect(value).toBeGreaterThanOrEqual(0);expect(value).toBeLessThanOrEqual(1);}
  });
});
