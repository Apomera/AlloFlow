import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8').replace(/\r\n/g,'\n');
const start=source.indexOf('function createCLHuntAnimal('),end=source.indexOf('// Compact, individually owned prey rig.',start);
if(start<0||end<=start)throw Error('Cannot locate the actual production animal factory');
const build=new Function('T','species','Math',source.slice(start,end)+';return createCLHuntAnimal(T,species);');
const math=Object.assign(Object.create(Math),{random(){throw Error('Oral finish consumed the dive RNG');}}),allocated=[];
const bodyKey='cl-squid-surface-v34-layered',limbKey='cl-squid-limb-oral-v36';
const state=(extra={})=>({moving:false,jet:false,strike:0,strikeAim:null,camo:0,substrate:'sand',reducedMotion:false,...extra});
const rig=(id='humboldtSquid')=>{const a=build(THREE,{id,bodyColor:0xbc6048},math);allocated.push(a);return a;};
const meshes=a=>{const rows=[];a.root.traverse(o=>{if(o.isMesh)rows.push(o);});return rows;};
const limbs=a=>meshes(a).filter(o=>/^cl-(arm|tentacle)-\d+$/.test(o.name));
const bytes=array=>Buffer.from(array.buffer,array.byteOffset,array.byteLength);
const smooth=(lo,hi,x)=>{const t=Math.max(0,Math.min(1,(x-lo)/(hi-lo)));return t*t*(3-2*t);};
const compiled=(m,renderer)=>{const s={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};m.onBeforeCompile(s,renderer);return s;};
function ring(mesh,at){
  const p=mesh.geometry.attributes.position,center=new THREE.Vector3();
  expect(p.count).toBe(189);
  for(let side=0;side<8;side++)center.add(new THREE.Vector3().fromBufferAttribute(p,at*9+side));
  center.multiplyScalar(1/8);
  const oral=new THREE.Vector3().fromBufferAttribute(p,at*9).sub(center).normalize();
  return {center,oral};
}
function geometry(a){return meshes(a).map(o=>[o.name,Object.entries(o.geometry.attributes).map(([name,attr])=>[name,Array.from(attr.array)]),o.geometry.index?Array.from(o.geometry.index.array):null,o.position.toArray(),o.quaternion.toArray(),o.scale.toArray(),o.instanceMatrix?Array.from(o.instanceMatrix.array):null]);}
const digest=a=>createHash('sha256').update(JSON.stringify(geometry(a))).digest('hex');
afterEach(()=>{for(const a of allocated.splice(0)){const resources=new Set();for(const o of meshes(a)){resources.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])resources.add(m);}for(const r of resources)r.dispose();}});

describe('Humboldt static feeding-club oral finish',()=>{
  it('owns one bounded static scalar on exactly ten existing limbs, with every arm and stalk vertex zero',()=>{
    const a=rig(),all=meshes(a),rows=limbs(a);expect(rows).toHaveLength(10);
    expect(rows.filter(o=>o.name.startsWith('cl-arm-'))).toHaveLength(8);
    expect(rows.filter(o=>o.name.startsWith('cl-tentacle-'))).toHaveLength(2);
    let total=0;
    for(const mesh of rows){
      const attribute=mesh.geometry.attributes.clLimbOral;expect(attribute,mesh.name).toBeDefined();
      expect(attribute.array instanceof Float32Array,mesh.name).toBe(true);expect(attribute.itemSize).toBe(1);
      expect(attribute.count).toBe(mesh.geometry.attributes.position.count);expect(attribute.count).toBe(189);
      expect(attribute.normalized).toBe(false);expect(attribute.usage).toBe(THREE.StaticDrawUsage);expect(attribute.version).toBe(0);
      expect(mesh.material.customProgramCacheKey()).toBe(limbKey);total+=attribute.array.byteLength;
      expect(Array.from(attribute.array).every(value=>Number.isFinite(value)&&value>=0&&value<=1),mesh.name).toBe(true);
      if(mesh.name.startsWith('cl-arm-'))expect(Array.from(attribute.array).every(value=>value===0),mesh.name).toBe(true);
      else{
        expect(Array.from(attribute.array.slice(0,16*9)).every(value=>value===0),mesh.name+' uncolored stalk').toBe(true);
        expect(attribute.getX(16*9)).toBeCloseTo(.5,7);expect(attribute.getX(17*9)).toBe(1);
        for(let at=16;at<=20;at++){
          expect(attribute.getX(at*9+8)).toBeCloseTo(attribute.getX(at*9),7);
          for(const side of [2,3,4,5,6])expect(attribute.getX(at*9+side),mesh.name+' non-oral face').toBe(0);
          expect(attribute.getX(at*9+1)).toBeCloseTo(attribute.getX(at*9+7),7);
        }
      }
    }
    expect(total).toBe(7560);
    expect(all.filter(o=>o.geometry.attributes.clLimbOral).map(o=>o.name).sort()).toEqual(rows.map(o=>o.name).sort());
    for(const id of ['commonOcto','cuttlefish','bobtailSquid','vampireSquid','nautilus'])for(const mesh of meshes(rig(id))){
      expect(mesh.geometry.attributes.clLimbOral,id).toBeUndefined();expect(mesh.material.customProgramCacheKey(),id).not.toBe(limbKey);
    }
  });

  it('matches actual rendered normals and cup openings through dense forward, vertical and backward strikes',()=>{
    const a=rig(),cups=a.root.getObjectByName('cl-suckers');
    const aims=[new THREE.Vector3(.8,.3,1.6),new THREE.Vector3(0,2.1,.48),new THREE.Vector3(-1.1,.6,-1.2)];
    let tick=0;
    for(const aim of aims){
      for(let step=0;step<=24;step++){
        a.update(++tick*.05,.05,state({moving:true,jet:step%3===0,strike:step/24,strikeAim:aim}));
        for(let index=0;index<2;index++){
          const mesh=a.root.getObjectByName('cl-tentacle-'+index),normals=mesh.geometry.attributes.normal,mask=mesh.geometry.attributes.clLimbOral;
          for(let at=15;at<=20;at++){
            const frame=ring(mesh,at),fade=smooth(.75,.85,at/20);
            for(let side=0;side<=8;side++){
              const normal=new THREE.Vector3().fromBufferAttribute(normals,at*9+side).normalize();
              const dot=normal.dot(frame.oral),expected=fade*smooth(.05,.95,dot);
              // The oracle comes from real updated position/normal buffers, not the authored ellipse coefficients.
              expect(Math.abs(mask.getX(at*9+side)-expected),mesh.name+' rendered oral normal').toBeLessThan(.00002);
              if(dot<=.05)expect(mask.getX(at*9+side),mesh.name+' aboral vertex').toBe(0);
            }
            if(at>=16&&at<=19){
              const opening=[];
              for(let row=0;row<2;row++){
                const matrix=new THREE.Matrix4();cups.getMatrixAt(192+index*8+(at-16)*2+row,matrix);
                opening.push(new THREE.Vector3(0,1,0).transformDirection(matrix));
              }
              expect(opening[0].dot(frame.oral)).toBeGreaterThan(.90);expect(opening[1].dot(frame.oral)).toBeGreaterThan(.90);
              expect(opening[0].clone().add(opening[1]).normalize().dot(frame.oral)).toBeGreaterThan(.9999);
              expect(mask.getX(at*9),mesh.name+' brightest cup-facing surface').toBeCloseTo(fade,6);
            }
          }
        }
      }
      a.root.position.set(12,-3,8);a.root.rotation.set(.27,1.1,-.31,'YXZ');
      a.update(++tick*.05,.05,state({jet:true,strike:1,strikeAim:aim}));a.root.updateMatrixWorld(true);
      const target=a.root.localToWorld(aim.clone()),mean=new THREE.Vector3();
      for(let index=0;index<2;index++){
        const mesh=a.root.getObjectByName('cl-tentacle-'+index),contact=mesh.localToWorld(ring(mesh,18).center);
        expect(contact.distanceTo(target)).toBeLessThan(.04);mean.add(contact);
      }
      expect(mean.multiplyScalar(.5).distanceTo(target)).toBeLessThan(.00001);
    }
    expect(cups.count).toBe(208);
  },20000);

  it('never rewrites, versions, reallocates or disposes the oral buffers during motion, pause and reduced motion',()=>{
    const a=rig(),saved=limbs(a).map(mesh=>({mesh,geometry:mesh.geometry,material:mesh.material,attribute:mesh.geometry.attributes.clLimbOral,array:mesh.geometry.attributes.clLimbOral.array,data:Buffer.from(bytes(mesh.geometry.attributes.clLimbOral.array)),version:mesh.geometry.attributes.clLimbOral.version}));
    let disposed=0;for(const resource of new Set(saved.flatMap(row=>[row.geometry,row.material])))resource.addEventListener('dispose',()=>disposed++);
    const check=()=>{for(const row of saved){const current=row.mesh.geometry.attributes.clLimbOral;expect(row.mesh.geometry).toBe(row.geometry);expect(row.mesh.material).toBe(row.material);expect(current).toBe(row.attribute);expect(current.array).toBe(row.array);expect(current.version).toBe(row.version);expect(bytes(current.array).equals(row.data),row.mesh.name).toBe(true);}expect(disposed).toBe(0);};
    for(let step=1;step<=90;step++){a.update(step*.05,.05,state({moving:true,jet:step>20&&step<60,strike:step>60?(90-step)/30:0,strikeAim:new THREE.Vector3(.8,.3,1.6)}));check();}
    const frozen=digest(a);for(let i=0;i<4;i++){a.update(4.5,0,state({moving:true}));check();expect(digest(a)).toBe(frozen);}
    a.update(8,.05,state({reducedMotion:true}));const reduced=digest(a);
    for(const time of [8.5,25,10000]){a.update(time,.05,state({moving:true,jet:true,strike:1,strikeAim:new THREE.Vector3(1,2,0),reducedMotion:true}));check();expect(digest(a)).toBe(reduced);}
  },20000);

  it('isolates the new varying to the existing limb material and reuses seven scalar helpers, four noise reads and the medium filter',()=>{
    const a=rig(),materials=[...new Set(meshes(a).map(o=>o.material).filter(m=>[bodyKey,limbKey].includes(m.customProgramCacheKey())))];
    expect(materials).toHaveLength(4);expect(materials.map(m=>m.customProgramCacheKey()).sort()).toEqual([bodyKey,bodyKey,bodyKey,limbKey].sort());
    const before=digest(a),webgl2={capabilities:{isWebGL2:true},extensions:{has(){throw Error('WebGL2 queried a derivative extension');}}};
    for(const renderer of [webgl2,{capabilities:{isWebGL2:false},extensions:{has:name=>name==='OES_standard_derivatives'}},{capabilities:{isWebGL2:false},extensions:{has:()=>false}},null]){
      const shaders=materials.map(m=>compiled(m,renderer)),first=shaders[0];
      for(let i=0;i<materials.length;i++){
        const shader=shaders[i],oral=materials[i].customProgramCacheKey()===limbKey;
        expect((shader.fragmentShader.match(/float clSq\w+\([^)]*\)\{/g)||[]).length).toBe(7);
        expect((shader.fragmentShader.match(/=clNoise\(/g)||[]).length).toBe(4);
        expect((shader.fragmentShader.match(/fwidth\(clSq/g)||[]).length).toBe(renderer?.capabilities.isWebGL2||renderer?.extensions?.has('OES_standard_derivatives')?3:0);
        for(const name of ['clSurfaceFrame','clPattern','clDisplay','clPhase'])expect(shader.uniforms[name]).toBe(first.uniforms[name]);
        expect(shader.vertexShader.includes('attribute float clLimbOral;')).toBe(oral);expect(shader.fragmentShader.includes('clClubOral')).toBe(oral);
        expect(shader.fragmentShader).not.toContain('texture2D(');expect(shader.fragmentShader).not.toContain('43758.5453');
        if(oral){expect(shader.vertexShader).toContain('clLimbOralFace=clLimbOral;');expect(shader.fragmentShader).toContain('(clMedium-0.5)*clSqMediumAA*0.045');}
      }
    }
    expect(digest(a)).toBe(before);
    const oral=compiled(materials.find(m=>m.customProgramCacheKey()===limbKey),webgl2).fragmentShader;
    const response=oral.match(/roughnessFactor=(mix\(roughnessFactor,clamp\([^;]+\));/);
    if(!response)throw Error('Cannot locate the actual oral roughness expression');
    const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x)),mix=(x,y,t)=>x+(y-x)*t;
    const finish=new Function('roughnessFactor','clMedium','clSqMediumAA','clClubOral','clamp','mix','return '+response[1]+';');
    for(const base of [.38,.50,.64])for(const medium of [0,.5,1])for(const aa of [0,.35,1])for(const mask of [0,.25,.5,1]){
      const result=finish(base,medium,aa,mask,clamp,mix);expect(Number.isFinite(result)).toBe(true);expect(result).toBeGreaterThanOrEqual(.38);expect(result).toBeLessThanOrEqual(.64);if(mask===0)expect(result).toBe(base);
    }
  });
});
