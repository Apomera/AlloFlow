import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');const start=source.indexOf('function createRaptorFootGeometry('),end=source.indexOf('        var talonGroup =',start);
const make=Function('THREE','return ('+source.slice(start,end).trim()+')')(THREE);
describe('Raptor feet geometry',()=>{
  for(const owl of [false,true])it('builds mirrored four-toed feet with finite closed surfaces: '+(owl?'owl':'hawk'),()=>{
    const left=make(-1,owl),right=make(1,owl),open=right.attributes.position,extended=right.morphAttributes.position[0];
    expect(right.userData.toeCount).toBe(4);expect(right.userData.forwardToes).toBe(owl?2:3);expect(right.userData.rearToes).toBe(owl?2:1);expect(open.count).toBe(234);
    for(const attr of [open,extended,right.attributes.normal,right.morphAttributes.normal[0],right.attributes.color])expect(Array.from(attr.array).every(Number.isFinite)).toBe(true);
    // Ring orientation may change with the mirrored curve; compare the complete vertex sets.
    const points=(attr,mirror=false)=>Array.from({length:attr.count},(_,i)=>[(mirror?-1:1)*attr.getX(i),attr.getY(i),attr.getZ(i)].map(v=>Math.round(v*1e6)).join(',')).sort();
    expect(points(left.morphAttributes.position[0],true)).toEqual(points(extended));
    const edges=new Map(),ids=right.index.array,a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
    for(let i=0;i<ids.length;i+=3)for(let j=0;j<3;j++){const u=ids[i+j],v=ids[i+(j+1)%3],key=[Math.min(u,v),Math.max(u,v)].join(':');edges.set(key,(edges.get(key)||0)+1);}
    expect([...edges.values()].every(n=>n===2)).toBe(true);
    for(const amount of [0,0.5,1])for(let i=0;i<ids.length;i+=3){for(const [j,p] of [a,b,c].entries()){const k=ids[i+j];p.set(open.getX(k)*(1-amount)+extended.getX(k)*amount,open.getY(k)*(1-amount)+extended.getY(k)*amount,open.getZ(k)*(1-amount)+extended.getZ(k)*amount);}expect(b.sub(a).cross(c.sub(a)).length()).toBeGreaterThan(1e-9);}
    const low=attr=>Math.min(...Array.from({length:attr.count},(_,i)=>attr.getY(i)));
    expect(low(extended)).toBeLessThan(low(open)-0.1);expect(low(extended)).toBeGreaterThan(-0.37);left.dispose();right.dispose();
  });
});
