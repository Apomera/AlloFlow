import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function extract(name){const start=source.indexOf('function '+name+'(');let end=source.indexOf('{',start),depth=1;while(depth){end++;if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return Function('return ('+source.slice(start,end+1)+')')();}
const visible=extract('terrainSightClear','        function acquireTarget');
const crossing=extract('practicePerchCrossing','        // End perch crossing helper.');
describe('Perch hunting visibility and contact',()=>{
  it('rejects prey behind an intervening ridge, but sees over it from a raised lookout',()=>{
    const terrain=(x,z)=>z<-18&&z>-30?8:0,target={x:0,y:1,z:-48};
    expect(visible({x:0,y:2,z:0},target,terrain)).toBe(false);
    expect(visible({x:0,y:24,z:0},target,terrain)).toBe(true);
  });
  it('allows an unobstructed short strike and checks vertical terrain occlusion',()=>{
    expect(visible({x:0,y:4,z:0},{x:0,y:1,z:-3},()=>0)).toBe(true);
    expect(visible({x:0,y:4,z:0},{x:0,y:-4,z:0},()=>2)).toBe(false);
  });
  const perch={x:0,y:8,z:0,radius:0.72};
  it('uses swept contact for uneven frames instead of snapping nearby flybys',()=>{
    expect(crossing({x:-0.8,y:11,z:0},{x:0.8,y:8,z:0},perch,12)).toEqual({x:0,z:0});
    expect(crossing({x:2,y:11,z:0},{x:2,y:8,z:0},perch,12)).toBeNull();
  });
  it('rejects upward launches, high-speed passes, and approaches from below',()=>{
    expect(crossing({x:0,y:8,z:0},{x:0,y:11,z:0},perch,12)).toBeNull();
    expect(crossing({x:0,y:11,z:0},{x:0,y:8,z:0},perch,30)).toBeNull();
    expect(crossing({x:0,y:9,z:0},{x:0,y:8,z:0},perch,12)).toBeNull();
  });
});
