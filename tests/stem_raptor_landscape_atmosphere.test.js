import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

const {Color}=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');

const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
const start=source.indexOf('        function atmosphereFogColor(');
const end=source.indexOf('        function updateEnvironmentalLight(',start);
const fogColor=Function(source.slice(start,end)+';return atmosphereFogColor;')();
function color(day,twilight,cloud,elevation) {
  const target=new Color();
  fogColor(target,day,twilight,cloud,1,elevation);
  return [target.r,target.g,target.b];
}

describe('landscape atmosphere color',()=>{
  it('preserves the existing horizon and below-horizon palette',()=>{
    for(const day of [0,.2,.7,1])for(const cloud of [0,.4,1]) {
      expect(color(day,.3,cloud,0)).toEqual(color(day,.3,cloud,undefined));
      expect(color(day,.3,cloud,-.5)).toEqual(color(day,.3,cloud,0));
    }
  });
  it('keeps clear daytime zenith darker and bluer than the hazy horizon',()=>{
    const horizon=color(1,0,0,0),zenith=color(1,0,0,1);
    expect(zenith.every((value,i)=>value<horizon[i])).toBe(true);
    expect(zenith[2]/zenith[0]).toBeGreaterThan(horizon[2]/horizon[0]);
  });
  it('keeps night atmosphere darker at every elevation',()=>{
    for(const cloud of [0,.5,1])for(const elevation of [0,.01,.1,.5,1]) {
      const night=color(0,0,cloud,elevation),day=color(1,0,cloud,elevation);
      expect(night.every((v,i)=>v<day[i])).toBe(true);
    }
  });
  it('softens the horizon-to-zenith difference under overcast skies',()=>{
    const gap=cloud=>Math.hypot(...color(1,0,cloud,0).map((v,i)=>v-color(1,0,cloud,1)[i]));
    expect(gap(1)).toBeLessThan(gap(0)*.65);
  });
  it('keeps color bounded and continuous across weather, twilight and elevation',()=>{
    for(const day of [0,.2,.6,1])for(const twilight of [0,.4,1])for(const cloud of [0,.5,1]){
      let previous=color(day,twilight,cloud,0);
      for(let i=1;i<=100;i++){
        const current=color(day,twilight,cloud,i*.01);
        expect(current.every(v=>Number.isFinite(v)&&v>=0&&v<=1)).toBe(true);
        expect(Math.max(...current.map((v,k)=>Math.abs(v-previous[k])))).toBeLessThan(.045);
        previous=current;
      }
    }
  });
});
