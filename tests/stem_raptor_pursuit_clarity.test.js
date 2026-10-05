import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
const start=source.indexOf('  function raptorTargetHighlightStrength('),end=source.indexOf('  function raptorCarryOpacity(',start);
const strength=Function(source.slice(start,end)+';return raptorTargetHighlightStrength;')();

describe('pursuit highlight clarity',()=>{
  it('keeps distant highlighting strong and clears the immediate strike space',()=>{
    for(const reach of [5,7]){
      expect(strength(300,reach)).toBe(1);
      expect(strength(45,reach)).toBe(1);
      expect(strength(reach,reach)).toBe(0);
      expect(strength(0,reach)).toBe(0);
    }
  });
  it('fades monotonically and remains bounded throughout an approach',()=>{
    for(const reach of [5,7]){
      const values=Array.from({length:601},(_,i)=>strength(60-i*.1,reach));
      expect(values.every(n=>Number.isFinite(n)&&n>=0&&n<=1)).toBe(true);
      expect(values.every((n,i)=>i===0||n<=values[i-1])).toBe(true);
      expect(values.every((n,i)=>i===0||values[i-1]-n<.005)).toBe(true);
    }
  });
  it('has no abrupt change at either end of the fade',()=>{
    for(const reach of [5,7]){
      const near=Math.max(6,reach*1.4),far=near+32;
      expect(strength(near+.001,reach)).toBeLessThan(1e-8);
      expect(1-strength(far-.001,reach)).toBeLessThan(1e-8);
      expect(strength(near-1,reach)).toBe(0);expect(strength(far+1,reach)).toBe(1);
    }
  });
  it('depends on current geometry so paused redraws and frame rates agree',()=>{
    const direct=strength(16,5);
    for(let i=60;i>=16;i-=.25)strength(i,5);
    expect(strength(16,5)).toBe(direct);
    expect(strength(16,7)).toBeLessThan(direct);
    expect(strength(16,undefined)).toBe(direct);
  });
});
