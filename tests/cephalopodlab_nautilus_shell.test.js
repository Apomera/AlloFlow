import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8').replace(/\r\n/g,'\n');
const start=source.indexOf('function createCLHuntAnimal('),end=source.indexOf('// Compact, individually owned prey rig.',start);
if(start<0||end<=start)throw Error('Animal factory anchors missing');
const build=new Function('T','species','Math',source.slice(start,end)+';return createCLHuntAnimal(T,species);');
const noRandom=Object.assign(Object.create(Math),{random(){throw Error('Shell construction consumed dive RNG');}}),allocated=[];
const state=(extra={})=>({moving:false,jet:false,strike:0,camo:0,substrate:'sand',display:false,reducedMotion:false,...extra});
function rig(id='nautilus'){const a=build(THREE,{id,bodyColor:0x8a7a52},noRandom);allocated.push(a);return a;}
function meshes(a){const all=[];a.root.traverse(o=>{if(o.isMesh)all.push(o);});return all;}
function shellChild(o){for(let p=o;p;p=p.parent)if(p.name==='cl-shell')return true;return false;}
function shellMeshes(a){return meshes(a).filter(shellChild);}
function compiled(m,renderer={capabilities:{isWebGL2:true}}){const s={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}};m.onBeforeCompile(s,renderer);return s;}
// Pass sixteen excludes only the four approved nautilus eye subtrees; other species and anatomy remain protected.
function insideNautilusEye(o){let eye=false;for(let p=o;p;p=p.parent){if(['cl-eye-rim','cl-iris','cl-pupil','cl-eye-highlight'].includes(p.name))eye=true;if(p.userData.species==='nautilus')return eye;}return false;}
// Pass twenty-three excludes only Humboldt's intentionally replaced siphon subtree.
function insideSquidSiphon(o){let siphon=false;for(let p=o;p;p=p.parent){if(p.name==='cl-siphon')siphon=true;if(p.userData.species==='humboldtSquid')return siphon;}return false;}
function protectedRecords(a){return meshes(a).filter(o=>!shellChild(o)&&!insideNautilusEye(o)&&!insideSquidSiphon(o)).map(o=>{const g=o.geometry,m=o.material,s=compiled(m);return[o.name,Object.entries(g.attributes).map(([k,v])=>[k,Array.from(v.array)]),g.index?Array.from(g.index.array):null,o.position.toArray(),o.quaternion.toArray(),o.scale.toArray(),o.isInstancedMesh?Array.from(o.instanceMatrix.array):null,m.type,m.name,m.color?.toArray(),m.roughness,m.metalness,m.side,m.opacity,m.transparent,m.customProgramCacheKey(),s.vertexShader,s.fragmentShader,Object.fromEntries(Object.entries(s.uniforms).map(([k,v])=>[k,v.value?.toArray?v.value.toArray():v.value]))];});}
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function points(mesh){const p=mesh.geometry.attributes.position;return Array.from({length:p.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld));}
afterEach(()=>{for(const a of allocated.splice(0)){const geometries=new Set(),materials=new Set();meshes(a).forEach(o=>{geometries.add(o.geometry);materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}});

describe('Nautilus external shell and living-chamber opening',()=>{
  it('replaces raised stripe meshes with three bounded opaque surfaces and finite outward-facing triangles',()=>{
    const a=rig(),all=shellMeshes(a);expect(all.map(o=>o.name)).toEqual(['cl-shell-outer','cl-shell-lip','cl-shell-interior']);
    expect(new Set(all.map(o=>o.material)).size).toBe(2);expect(all.reduce((n,o)=>n+o.geometry.attributes.position.count,0)).toBe(2550);
    expect(all.reduce((n,o)=>n+o.geometry.index.count/3,0)).toBe(4800);
    expect(a.mantle.visible).toBe(false);expect(a.arms).toHaveLength(90);expect(a.cuttleTentacles).toHaveLength(0);expect(a.root.getObjectByName('cl-suckers')).toBeUndefined();expect(meshes(a).filter(o=>o.name.startsWith('cl-fin-'))).toHaveLength(0);
    expect(a.nautilusShell.position.toArray()).toEqual([0,0,0]);expect(a.nautilusShell.scale.toArray()).toEqual([1,1,1]);
    const baseline=[.6459599733352661,1.4940000176429749,1.4831070303916931],size=new THREE.Box3().setFromObject(a.nautilusShell).getSize(new THREE.Vector3()).toArray();
    size.forEach((value,i)=>expect(Math.abs(value/baseline[i]-1)).toBeLessThan(.05));
    for(const mesh of all){const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal,ix=g.index.array;expect(Array.from(p.array).every(Number.isFinite)).toBe(true);expect(Array.from(n.array).every(Number.isFinite)).toBe(true);
      for(let i=0;i<n.count;i++)expect(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))).toBeCloseTo(1,5);
      const u=new THREE.Vector3(),v=new THREE.Vector3(),w=new THREE.Vector3(),normal=new THREE.Vector3();
      for(let i=0;i<ix.length;i+=3){u.fromBufferAttribute(p,ix[i]);v.fromBufferAttribute(p,ix[i+1]);w.fromBufferAttribute(p,ix[i+2]);v.sub(u).cross(w.sub(u));normal.fromBufferAttribute(n,ix[i]);expect(v.dot(normal),mesh.name+' winding '+i/3).toBeGreaterThan(0);}
      expect(g.boundingBox).not.toBe(null);expect(g.boundingSphere).not.toBe(null);expect(mesh.material.transparent).toBe(false);expect(mesh.material.map).toBe(null);expect(mesh.material.normalMap).toBe(null);
    }
  });

  it('mirrors both sides, welds lip boundaries, and leaves a genuine open passage to the unbanded interior',()=>{
    const a=rig(),[outer,lip,inner]=shellMeshes(a),stride=49,op=outer.geometry.attributes.position,lp=lip.geometry.attributes.position,ip=inner.geometry.attributes.position;
    for(const mesh of [outer,inner]){const p=mesh.geometry.attributes.position,rows=(p.count-1)/stride;
      for(let r=0;r<rows;r++)for(let c=0;c<48;c++){const mirror=(24-c+48)%48,q=r*stride+c,m=r*stride+mirror;expect(p.getX(q)).toBeCloseTo(-p.getX(m),6);expect(p.getY(q)).toBeCloseTo(p.getY(m),6);expect(p.getZ(q)).toBeCloseTo(p.getZ(m),6);}
      const normals=mesh.geometry.attributes.normal;for(let r=0;r<rows;r++)for(const axis of ['getX','getY','getZ'])expect(normals[axis](r*stride)).toBe(normals[axis](r*stride+48));
    }
    for(let c=0;c<=48;c++)for(const axis of ['getX','getY','getZ']){expect(lp[axis](c)).toBe(op[axis](c));expect(lp[axis](3*stride+c)).toBe(ip[axis](c));}
    const axis=new THREE.Vector3(0,-.7,Math.sqrt(.51)),center=new THREE.Vector3(0,.35,-.3),ray=new THREE.Raycaster(center.clone().addScaledVector(axis,1),axis.clone().negate());a.root.updateMatrixWorld(true);
    // No disk seals the mouth: the first surface hit is the far internal wall.
    const hits=ray.intersectObjects([outer,lip,inner],false);expect(hits.length).toBeGreaterThan(0);expect(hits[0].object).toBe(inner);expect(hits[0].distance).toBeGreaterThan(1.5);
    expect(compiled(inner.material).fragmentShader).not.toContain('clShellBand');expect(lip.material).toBe(inner.material);
  });

  it('clears the unchanged head and both pinhole apertures through the complete existing shell-rocking range',()=>{
    const a=rig(),shell=a.nautilusShell,head=a.root.getObjectByName('cl-head'),axis=new THREE.Vector3(0,-.7,Math.sqrt(.51)),center=new THREE.Vector3(0,.35,-.3),v=new THREE.Vector3(),inverse=new THREE.Matrix4();
    const eyes=meshes(a).filter(o=>o.name==='cl-iris'||o.name==='cl-pupil');let minimum=Infinity;
    for(let step=0;step<=16;step++){shell.rotation.z=-.04+step*.005;a.root.updateMatrixWorld(true);inverse.copy(shell.matrixWorld).invert();
      for(const point of points(head)){v.copy(point).applyMatrix4(inverse).sub(center);minimum=Math.min(minimum,v.dot(axis)-.73*.49);}
      for(const eye of eyes){
        // Geometry is local to the retained attachment anchors. Aim through the
        // real opening: the iris final ring and pupil first ring coincide.
        const positions=eye.geometry.attributes.position,stride=33,first=eye.name==='cl-iris'?positions.count-stride:0,target=new THREE.Vector3();
        for(let vertex=0;vertex<stride-1;vertex++)target.add(new THREE.Vector3().fromBufferAttribute(positions,first+vertex));
        target.multiplyScalar(1/(stride-1)).applyMatrix4(eye.matrixWorld);const side=Math.sign(target.x);
        for(const direction of [new THREE.Vector3(side,0,0),new THREE.Vector3(side*.7,.12,.7).normalize()]){const ray=new THREE.Raycaster(target.clone().addScaledVector(direction,2),direction.clone().negate(),0,1.999);expect(ray.intersectObjects(shellMeshes(a),false),eye.name+' shell occlusion at '+shell.rotation.z).toHaveLength(0);}
      }
    }
    expect(minimum).toBeGreaterThan(.005);
    // Collision/depth/gameplay and the external scene-loop motion remain untouched.
    expect(source.includes('nautilusShell.rotation.z = gameState.a11y.reducedMotion?0:Math.sin(now * 0.0008) * 0.04;')).toBe(true);
  });

  it('applies fixed surface pigment to the real standard shader with a supported derivative path and fallback',()=>{
    const a=rig(),material=a.root.getObjectByName('cl-shell-outer').material,s=compiled(material);expect(material.customProgramCacheKey()).toBe('cl-nautilus-shell-v15');
    expect(s.vertexShader).toContain('clShellPos=position;');expect(s.fragmentShader).toContain('fwidth(clShellWave)');expect(s.fragmentShader).toContain('diffuseColor.rgb=mix(');expect(s.fragmentShader).not.toContain('\\n');expect(Object.keys(s.uniforms)).toHaveLength(0);
    const queried=[];expect(compiled(material,{capabilities:{isWebGL2:false},extensions:{has(name){queried.push(name);return true;}}}).fragmentShader).toContain('fwidth(clShellWave)');expect(queried).toEqual(['OES_standard_derivatives']);
    for(const context of [null,{capabilities:{isWebGL2:false},extensions:{has(){return false;}}}]){const fallback=compiled(material,context);expect(fallback.fragmentShader).not.toContain('fwidth(clShellWave)');expect(fallback.fragmentShader).toContain('float clShellAA=0.10;');expect(fallback.fragmentShader).toContain('clShellBand');}
    expect(s.fragmentShader).not.toMatch(/clPhase|clDisplay|clPattern|uniform.*time/);expect(material.emissive.getHex()).toBe(0);
    expect(s.fragmentShader).toContain('clShellRadius>0.0001?atan(clShellRadial.y,clShellRadial.x):0.0');
    // Execute the actual scalar pigment expressions to protect finite, seam-periodic
    // modulation and varied inner tips, without pinning a particular rendered image.
    const expressions=Array.from(s.fragmentShader.matchAll(/float (clShellInset|clShellCurve|clShellWave|clShellThreshold|clShellStart|clShellBand)=([^;]+);/g));expect(expressions).toHaveLength(6);
    const clamp=(x,min,max)=>Math.max(min,Math.min(max,x)),smoothstep=(min,max,x)=>{const t=clamp((x-min)/(max-min),0,1);return t*t*(3-2*t);};
    const sample=new Function('clShellRadius','clShellAngle','clShellAA','sin','cos','clamp','smoothstep',expressions.map(([,name,expression])=>'const '+name+'='+expression+';').join('')+'return [clShellCurve,clShellWave,clShellThreshold,clShellStart,clShellBand];');
    const pigment=(radius,angle)=>sample(radius,angle,.10,Math.sin,Math.cos,clamp,smoothstep),starts=[];
    for(let r=0;r<=20;r++)for(let a=0;a<=96;a++){const radius=r/20,angle=-Math.PI+a*Math.PI/48,values=pigment(radius,angle);expect(values.every(Number.isFinite)).toBe(true);expect(values[4]).toBeGreaterThanOrEqual(0);expect(values[4]).toBeLessThanOrEqual(1);if(r===0){expect(values[4]).toBe(0);starts.push(values[3]);}if(a===0)values.forEach((value,i)=>expect(value).toBeCloseTo(pigment(radius,Math.PI)[i],10));}
    expect(Math.max(...starts)-Math.min(...starts)).toBeGreaterThan(.15);
    const innerCurve=Array.from({length:32},(_,i)=>pigment(.35,i*Math.PI/16)[0]);expect(Math.max(...innerCurve)-Math.min(...innerCurve)).toBeGreaterThan(.8);
    for(let i=0;i<32;i++)expect(pigment(1,i*Math.PI/16)[0]).toBe(0);
  });

  it('keeps shell buffers and material identity static across live, jet, frozen and reduced-motion updates',()=>{
    const a=rig(),all=shellMeshes(a),before=all.map(o=>[o.geometry,o.material,o.geometry.attributes.position.array,o.geometry.attributes.normal.array,hash(Array.from(o.geometry.attributes.position.array)),hash(Array.from(o.geometry.attributes.normal.array))]);
    for(let i=0;i<24;i++)a.update(i*17,i%3?.05:0,state({moving:true,jet:i%2===0,strike:.8,reducedMotion:i>12}));
    all.forEach((o,i)=>{expect(o.geometry).toBe(before[i][0]);expect(o.material).toBe(before[i][1]);expect(o.geometry.attributes.position.array).toBe(before[i][2]);expect(o.geometry.attributes.normal.array).toBe(before[i][3]);expect(hash(Array.from(o.geometry.attributes.position.array))).toBe(before[i][4]);expect(hash(Array.from(o.geometry.attributes.normal.array))).toBe(before[i][5]);});
    const other=rig(),geometries=new Set(all.map(o=>o.geometry)),materials=new Set(all.map(o=>o.material));expect(shellMeshes(other).every(o=>!geometries.has(o.geometry)&&!materials.has(o.material))).toBe(true);
    const events=[];for(const geometry of geometries){geometry.addEventListener('dispose',()=>events.push(geometry));geometry.dispose();}for(const material of materials){material.addEventListener('dispose',()=>events.push(material));material.dispose();}expect(new Set(events).size).toBe(5);
  });

  it('preserves pre-change complete other-species rigs and nautilus non-shell/non-eye geometry, materials and shaders',()=>{
    const expected={commonOcto:'062749c57c069d1144ba02361e100b9cc357e646e7a6d6cde864cb98f1f36121',blueRinged:'93198a1edb04aa7894c65c563d945ca17483c046c025d04a5a0c0c92e71a2aaf',mimicOcto:'062749c57c069d1144ba02361e100b9cc357e646e7a6d6cde864cb98f1f36121',giantPacific:'bbd7f1259032347eaf63884ca47074e90ccea89f3e37a014395e7a5011c464c0',caribReef:'062749c57c069d1144ba02361e100b9cc357e646e7a6d6cde864cb98f1f36121',coconutOcto:'062749c57c069d1144ba02361e100b9cc357e646e7a6d6cde864cb98f1f36121',humboldtSquid:'0465da14cafdede3a8afe9f8d93c4621d6609502353d88bfcc2eef731fe5ceef',nautilus:'2e589536a86ed76b23108faea2fd93accde9f660f0d6c95fc4e9e8eac69fee74',cuttlefish:'05067cfb886de1799621787d65729da2b9888d0e9f7bab36adce7176b14e14f6',bobtailSquid:'4ee65934d880254c0949288a9955588e46912707c2b6dae5c4e71b02e3291e38',dumboOcto:'fa760b6a4268d0af180653270cf5708467461425420bdfe93db17236104f836b',vampireSquid:'7497d5c70ed65a3b7bf94ecc0d081369d1dcfc124c16dbd12f56da5545751d70'};
    for(const [id,fingerprint]of Object.entries(expected)){const a=rig(id),frames=[];for(let i=0;i<4;i++){a.update(1+i*.05,.05,state({moving:i>0,jet:i===2,strike:i===3?.6:0,camo:.6,substrate:['sand','rock','grass','sand'][i],display:i===2,reducedMotion:i===3}));frames.push(hash(protectedRecords(a)));}expect(hash(frames),id).toBe(fingerprint);}
  },30000); // Forty-eight complete geometry/shader snapshots can exceed the default 5s on a busy host.
});
