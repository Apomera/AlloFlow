import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function body(name){const start=source.indexOf('function '+name+'(');let end=source.indexOf('{',start),depth=1;while(depth){end++;if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end+1);}
function fixture(){
  const bird={x:0,y:12,z:0,diving:false,crashed:false};const prey=[];
  const api=Function('raptor','preyMeshes',`var activePerch=null,attendedPrey=null,mission={id:'open'},lockConeDot=0.1,flightForward={};
    function flightForwardVector(){return {x:0,y:0,z:-1};}function terrainHeightAt(x,z){return z < -18 && z > -30 ? 8 : 0;}
    ${['evaluatePreyTarget','terrainSightClear','chooseAttendedTarget','acquireTarget'].map(body).join('\n')}
    return {select:acquireTarget,current:()=>attendedPrey};`)(bird,prey);
  const add=(distance,y=12)=>{const p={mesh:{position:{x:0,y,z:-distance}}};prey.push(p);return p;};return {bird,prey,add,...api};
}
describe('Stable, visible raptor attention',()=>{
  it('keeps the same visible animal through small score changes and yields to a much better target',()=>{
    const f=fixture(),a=f.add(40),b=f.add(41);expect(f.select(true).prey).toBe(a);
    for(let i=0;i<20;i++){b.mesh.position.z=-39-i%2;expect(f.select(true).prey).toBe(a);}
    b.mesh.position.z=-30;expect(f.select(true).prey).toBe(b);
  });
  it('releases prey behind a ridge and reacquires another visible animal immediately',()=>{
    const f=fixture(),a=f.add(40),b=f.add(55);f.select(true);a.mesh.position.y=1;
    expect(f.select(true).prey).toBe(b);
  });
  it('drops removed, out-of-range, and rear targets without a grace period',()=>{
    const f=fixture(),a=f.add(40);f.select(true);a.mesh.position.z=10;expect(f.select(true)).toBeNull();
    a.mesh.position.z=-40;f.select(true);a.mesh.position.z=-301;expect(f.select(true)).toBeNull();
    a.mesh.position.z=-40;f.select(true);f.prey.length=0;expect(f.select(true)).toBeNull();expect(f.current()).toBeNull();
  });
  it('prioritizes a reachable strike even when distance/angle scoring favors an unreachable animal',()=>{
    const f=fixture(),a=f.add(4),b=f.add(4.1);f.select(true);a.mesh.position.x=4;
    const chosen=f.select(true);expect(chosen.prey).toBe(b);expect(chosen.canStrike).toBe(true);
  });
  it('revalidates read-only queries without mutating committed attention',()=>{
    const f=fixture(),a=f.add(40),b=f.add(41);f.select(true);b.mesh.position.z=-20;
    expect(f.select().prey).toBe(b);expect(f.current()).toBe(a);expect(f.select(true).prey).toBe(b);expect(f.current()).toBe(b);
  });
});
