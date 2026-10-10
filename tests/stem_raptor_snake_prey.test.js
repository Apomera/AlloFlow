import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function body(name){const start=source.indexOf('function '+name+'(');if(start<0)throw Error(name);let end=source.indexOf('{',start),depth=1;while(depth){end++;if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end+1);}
const names=['preyKindFor','mergeGroundPreyParts','buildSnakePreyParts','advanceSnakeSlither','updateSnakePreySurface','buildPreyVisual','preyContactProfile'];
const api=Function('THREE',names.map(body).join('\n')+';return {build:buildPreyVisual,advance:advanceSnakeSlither,surface:updateSnakePreySurface,shadow:preyContactProfile};')(THREE);
const build=(size=2)=>api.build({id:'snake',color:0x365314},size);
function dispose(model){const resources=new Set();model.root.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);});resources.forEach(o=>o.dispose());}
function pose(m,heading,height,x=3,z=-7){const size=m.slither.size,y=height(x,z)+size*.15;api.surface(m.slither,x,y,z,heading,size*.15,height);m.root.position.set(x,y,z);m.root.rotation.y=heading;m.root.updateMatrixWorld(true);}
function clearance(m,height){let min=Infinity;const point=new THREE.Vector3();m.root.traverse(o=>{if(!o.geometry)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);min=Math.min(min,point.y-height(point.x,point.z));}});return min;}

describe('Snake prey surface and slither',()=>{
  it('builds a continuous tapered body and detailed head in two draws with one material',()=>{
    const m=build(),g=m.body.geometry,parts=m.root.children;
    expect(parts.map(p=>p.name)).toEqual(['prey-snake-body','prey-snake-head']);expect(parts[0].material).toBe(parts[1].material);expect(parts[0].material.map).toBeNull();
    expect(g.attributes.position.count).toBe(535);expect(g.index.count/3).toBe(984);expect(g.attributes.color.count).toBe(535);
    const p=g.attributes.position;for(let ring=0;ring<41;ring++){const a=new THREE.Vector3().fromBufferAttribute(p,ring*13),b=new THREE.Vector3().fromBufferAttribute(p,ring*13+12);expect(a.distanceTo(b)).toBeLessThan(1e-6);}
    const width=ring=>new THREE.Vector3().fromBufferAttribute(p,ring*13).distanceTo(new THREE.Vector3().fromBufferAttribute(p,ring*13+6));expect(width(40)).toBeLessThan(width(0)*.03);dispose(m);
  });
  it('keeps smooth outward normals and closes the seam throughout a moving wave',()=>{
    const m=build(),g=m.body.geometry;
    for(let frame=0;frame<30;frame++){api.advance(m.slither,1.8,1.8,1/30,false);api.surface(m.slither,0,.3,0,0,.3,null);const n=g.attributes.normal;
      for(let ring=2;ring<39;ring++){expect(n.getY(ring*13+3)).toBeGreaterThan(.5);expect(n.getY(ring*13+9)).toBeLessThan(-.5);for(let axis=0;axis<3;axis++)expect(n.array[ring*39+axis]).toBeCloseTo(n.array[ring*39+36+axis],6);}
      for(let i=0;i<n.count;i++)expect(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))).toBeCloseTo(1,5);
    }dispose(m);
  });
  it('keeps the belly and head above flat ground at every phase and visual size',()=>{
    for(const size of [.75,2,4.5]){const m=build(size);for(let phase=0;phase<12;phase++){m.slither.phase=phase/12*Math.PI*2;m.slither.amplitude=.22;pose(m,.7,()=>2);expect(clearance(m,()=>2)).toBeGreaterThan(size*.0119);expect(clearance(m,()=>2)).toBeLessThan(size*.0121);}dispose(m);}
  });
  it('conforms the whole body to uphill, downhill and cross-slope terrain at any heading',()=>{
    for(const heading of [0,.8,Math.PI,5.4])for(const slope of [[.3,0],[0,-.35],[.28,.22]]){
      const height=(x,z)=>x*slope[0]+z*slope[1],m=build(4.5);
      for(const phase of [0,1.7,4.5]){m.slither.phase=phase;pose(m,heading,height);expect(clearance(m,height)).toBeGreaterThan(.03);}
      dispose(m);
    }
  });
  it('follows a rounded crest without leaving the snake rigid across its length',()=>{
    const m=build(4.5),height=(x,z)=>.2*Math.sin(x*.8)+.2*Math.cos(z*.7);
    for(let i=0;i<24;i++){m.slither.phase=i*.3;pose(m,i*.12,height,-3+i*.25,2);expect(clearance(m,height)).toBeGreaterThan(-.005);}
    dispose(m);
  });
  it('integrates speed changes consistently at 30, 60 and 120 frames per second',()=>{
    const results=[];for(const hz of [30,60,120]){const m=build();for(const speed of [0,1.8,.4,0])for(let i=0;i<hz;i++)api.advance(m.slither,speed,1.8,1/hz,false);results.push({phase:m.slither.phase,rate:m.slither.rate,amplitude:m.slither.amplitude});dispose(m);}
    for(const key of ['phase','rate','amplitude']){expect(results[0][key]).toBeCloseTo(results[1][key],9);expect(results[0][key]).toBeCloseTo(results[2][key],9);}
  });
  it('eases into an escape and settles when movement stops',()=>{
    const m=build();api.advance(m.slither,0,1.8,1,false);const phase=m.slither.phase,amplitude=m.slither.amplitude;
    api.advance(m.slither,1.8,1.8,1/60,false);expect(m.slither.phase-phase).toBeLessThan(.015);expect(m.slither.amplitude-amplitude).toBeLessThan(.012);
    for(let i=0;i<120;i++)api.advance(m.slither,1.8,1.8,1/60,false);expect(m.slither.rate).toBeGreaterThan(11);expect(m.slither.amplitude).toBeCloseTo(.22,5);
    for(let i=0;i<120;i++)api.advance(m.slither,0,1.8,1/60,false);expect(m.slither.rate).toBeLessThan(.00002);expect(m.slither.amplitude).toBeCloseTo(.12,5);dispose(m);
  });
  it('freezes decorative motion for pause and reduced motion while still supporting the ground',()=>{
    const m=build();api.advance(m.slither,1.8,1.8,.4,false);const before={phase:m.slither.phase,rate:m.slither.rate,amplitude:m.slither.amplitude};
    api.advance(m.slither,1.8,1.8,60,true);api.advance(m.slither,1.8,1.8,0,false);for(const key of Object.keys(before))expect(m.slither[key]).toBe(before[key]);
    pose(m,.8,(x,z)=>.3*x-.2*z);expect(clearance(m,(x,z)=>.3*x-.2*z)).toBeGreaterThan(.015);for(const key of Object.keys(before))expect(m.slither[key]).toBe(before[key]);dispose(m);
  });
  it('narrows the contact shadow while keeping the moving silhouette within its footprint',()=>{
    const m=build(),snake=api.shadow({},2,0,'snake',0),mammal=api.shadow({},2,0,'rabbit',0);
    expect(snake.width).toBeLessThan(mammal.width*.65);expect(snake.length).toBeGreaterThan(mammal.length);
    for(let frame=0;frame<120;frame++){api.advance(m.slither,1.8,1.8,1/60,false);api.surface(m.slither,0,.3,0,0,.3,null);const bounds=m.body.geometry.boundingBox;expect(Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x))).toBeLessThan(snake.width);expect(Math.max(Math.abs(bounds.min.z),Math.abs(bounds.max.z))).toBeLessThan(snake.length);}
    dispose(m);
  });
  it('reuses its buffers and bounds as it moves, then removes terrain deformation for carrying',()=>{
    const m=build(),g=m.body.geometry,position=g.attributes.position,normal=g.attributes.normal,color=g.attributes.color,index=g.index,box=g.boundingBox,sphere=g.boundingSphere;
    for(let i=0;i<100;i++){api.advance(m.slither,1.8,1.8,1/60,false);pose(m,i*.02,(x,z)=>x*.3+z*.2);expect(g.attributes.position).toBe(position);expect(g.attributes.normal).toBe(normal);expect(g.attributes.color).toBe(color);expect(g.index).toBe(index);expect(g.boundingBox).toBe(box);expect(g.boundingSphere).toBe(sphere);
      for(let j=0;j<position.count;j++){const p=new THREE.Vector3().fromBufferAttribute(position,j);expect(box.distanceToPoint(p)).toBeLessThan(1e-6);expect(p.distanceTo(sphere.center)).toBeLessThanOrEqual(sphere.radius+1e-6);}
    }
    api.surface(m.slither,0,.3,0,0,.3,null);m.root.position.set(0,.3,0);m.root.rotation.set(0,0,0);m.root.updateMatrixWorld(true);expect(clearance(m,()=>0)).toBeCloseTo(.024,6);expect(m.slither.head.rotation.x).toBeCloseTo(0,10);expect(m.slither.head.rotation.z).toBeCloseTo(0,10);dispose(m);
  });
});
