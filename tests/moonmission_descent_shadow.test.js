import { beforeEach, describe, expect, it, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const THREE=createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source=readFileSync('stem_lab/stem_tool_moonmission.js','utf8');
function extract(name){const m=source.match(new RegExp('^  function '+name+'\\([^\\n]*\\) \\{[\\s\\S]*?^  \\}', 'm'));if(!m)throw Error(name);return m[0];}
const drawing=new Proxy({}, {get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>{t[k]=v;return true;}});
const hardware=new Function('THREE','document',extract('mmLunarRng')+'\n'+extract('mmBuildSurfaceLM')+'\nreturn mmBuildSurfaceLM(THREE,null,true);')
  (THREE,{createElement:()=>({setAttribute(){},getContext:()=>drawing})});
hardware.position.y=-2.2-.02*.78;
let P;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_moonmission.js','moonMission');P=window.MoonMissionPure;});
const plane={x:0,y:1,z:0,constant:0};
const close=(a,b)=>['x','y','z'].forEach(k=>expect(a[k]).toBeCloseTo(b[k],9));
afterAll(()=>{
  const geometries=new Set(),materials=new Set(),textures=new Set();
  hardware.traverse(n=>{if(n.geometry)geometries.add(n.geometry);if(n.material)materials.add(n.material);});
  materials.forEach(m=>{if(m.map)textures.add(m.map);if(m.bumpMap)textures.add(m.bumpMap);m.dispose();});
  geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());
});

describe('parallel sunlight and lunar descent support',()=>{
  it('projects a ten-metre object opposite the current scene Sun onto level ground',()=>{
    close(P.projectDescentShadow({x:3,y:10,z:2},plane),{x:3+7000/260,y:0,z:2-3600/260});
    expect(Object.isFrozen(P.descentSun)).toBe(true);
  });
  it('shadow offset grows linearly with height and has no lamp-distance falloff',()=>{
    const a=P.projectDescentShadow({x:0,y:4,z:0},plane),b=P.projectDescentShadow({x:0,y:12,z:0},plane);
    expect(b.x).toBeCloseTo(a.x*3,12);expect(b.z).toBeCloseTo(a.z*3,12);
    close(a,P.projectDescentShadow({x:0,y:4,z:0},plane,{x:-7,y:2.6,z:3.6}));
  });
  it('normal sunlight projects directly underneath the object',()=>{
    close(P.projectDescentShadow({x:-4,y:19,z:12},plane,{x:0,y:1,z:0}),{x:-4,y:0,z:12});
  });
  it('a point on the receiving plane stays at that point',()=>{
    close(P.projectDescentShadow({x:14,y:0,z:-7},plane),{x:14,y:0,z:-7});
  });
  it('projections onto a sloped plane lie on the plane and along the incident ray',()=>{
    const n={x:-.15,y:1,z:.07,constant:-31},point={x:2,y:40,z:-3},q=P.projectDescentShadow(point,n);
    expect(n.x*q.x+n.y*q.y+n.z*q.z+n.constant).toBeCloseTo(0,10);
    const delta=new THREE.Vector3(q.x-point.x,q.y-point.y,q.z-point.z),sun=new THREE.Vector3(-700,260,360);
    expect(delta.clone().cross(sun).length()).toBeLessThan(1e-9);expect(delta.dot(sun)).toBeLessThan(0);
  });
  it('rescaling the plane normal does not change the ray intersection',()=>{
    const n={x:-.1,y:1,z:.02,constant:-12},point={x:0,y:24,z:0};
    close(P.projectDescentShadow(point,n),P.projectDescentShadow(point,{x:-.4,y:4,z:.08,constant:-48}));
  });
  it('translating ground and lander together preserves the footprint',()=>{
    const p={x:2,y:8,z:3},q=P.projectDescentShadow(p,plane),move={x:41,y:13,z:-18};
    const shifted=P.projectDescentShadow({x:p.x+move.x,y:p.y+move.y,z:p.z+move.z},{x:0,y:1,z:0,constant:-move.y});
    close(shifted,{x:q.x+move.x,y:q.y+move.y,z:q.z+move.z});
  });
  it('does not project sunlight from below the receiver or too near its horizon',()=>{
    for(const light of [{x:0,y:-1,z:0},{x:1,y:0,z:0},{x:1,y:.001,z:0},{x:0,y:0,z:0}])
      expect(P.projectDescentShadow({x:0,y:2,z:0},plane,light)).toBeNull();
  });
  it('rejects missing, invalid, zero-normal and below-plane geometry',()=>{
    for(const p of [null,{}, {x:0,y:NaN,z:0},{x:0,y:Infinity,z:0},{x:0,y:-1,z:0}])expect(P.projectDescentShadow(p,plane)).toBeNull();
    expect(P.projectDescentShadow({x:0,y:1,z:0},null)).toBeNull();
    expect(P.projectDescentShadow({x:0,y:1,z:0},{x:0,y:0,z:0,constant:0})).toBeNull();
  });
  it('detaches the result and does not change the source point, plane or light',()=>{
    const p={x:1,y:4,z:2},n={...plane},sun={...P.descentSun},before=JSON.stringify([p,n,sun]),q=P.projectDescentShadow(p,n,sun);
    expect(Object.isFrozen(q)).toBe(true);expect(JSON.stringify([p,n,sun])).toBe(before);
  });
  for(const bank of [-.35,0,.35])for(const clearance of [0,2,40]){
    it(`keeps every circular pad above the ground at bank ${bank} and clearance ${clearance}`,()=>{
      const pose=P.descentSidePose(332,clearance,bank),matrix=new THREE.Matrix4().makeRotationZ(bank);
      const raw=[[-24,2.5],[-10,2],[10,2],[24,2.5]];
      const gaps=raw.map(([x,r],i)=>{
        const q=new THREE.Vector3(x,28,0).applyMatrix4(matrix);
        expect(pose.pads[i].x).toBeCloseTo(q.x,10);expect(pose.pads[i].y).toBeCloseTo(q.y+pose.pivotY,10);
        return 332-(pose.pivotY+q.y+r);
      });
      expect(Math.min(...gaps)).toBeCloseTo(clearance,10);expect(gaps.every(g=>g>=clearance-1e-9)).toBe(true);
    });
  }
  it('opposite banks have mirrored support height and foot positions',()=>{
    const a=P.descentSidePose(332,10,-.3),b=P.descentSidePose(332,10,.3);
    expect(a.pivotY).toBeCloseTo(b.pivotY,12);
    a.pads.forEach((p,i)=>{expect(p.x).toBeCloseTo(-b.pads[3-i].x,12);expect(p.y).toBeCloseTo(b.pads[3-i].y,12);});
  });
  it('side support translates with the ground while retaining clearance',()=>{
    const a=P.descentSidePose(100,7,.2),b=P.descentSidePose(180,7,.2);expect(b.pivotY-a.pivotY).toBeCloseTo(80,12);
    expect(Object.isFrozen(a)).toBe(true);expect(Object.isFrozen(a.pads)).toBe(true);expect(a.pads.every(Object.isFrozen)).toBe(true);
  });
  it('rejects invalid side geometry without creating an invented pose',()=>{
    for(const values of [[NaN,0,0],[100,-1,0],[100,0,Infinity],[100,0,.4]])expect(P.descentSidePose(...values)).toBeNull();
  });
  it('copies every actual indexed hardware triangle in the flight-pivot frame',()=>{
    const vertices=P.descentShadowVertices(THREE,hardware);let count=0,first=null;
    hardware.traverse(part=>{
      if(!part.isMesh||!part.visible||!part.geometry)return;
      const attr=part.geometry.attributes.position,index=part.geometry.index;count+=(index?index.count:attr.count);
      if(!first)first=new THREE.Vector3().fromBufferAttribute(attr,index?index.getX(0):0).applyMatrix4(part.matrixWorld);
    });
    expect(vertices.length).toBe(count*3);expect(count%3).toBe(0);expect(count).toBeGreaterThan(3000);
    ['x','y','z'].forEach((k,i)=>expect(vertices[i]).toBeCloseTo(first[k],6));
    expect(Array.from(vertices).every(Number.isFinite)).toBe(true);
  });
  it('builds one bounded merged shadow mesh without duplicating model resources',()=>{
    const shadow=P.buildDescentShadow(THREE,hardware),expected=P.descentShadowVertices(THREE,hardware);
    expect(shadow.name).toBe('moon-descent-shadow-caster');expect(shadow.geometry.attributes.position.array).toEqual(expected);
    expect(shadow.material.depthWrite).toBe(false);expect(shadow.material.transparent).toBe(false);
    expect(shadow.material.colorWrite).toBe(false);expect(shadow.material.depthTest).toBe(false);expect(shadow.castShadow).toBe(true);
    expect(shadow.frustumCulled).toBe(false);expect(hardware.children.includes(shadow)).toBe(false);
    shadow.geometry.dispose();shadow.material.dispose();
  });
});
