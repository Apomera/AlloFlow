import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
const liveSource=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8').replace(/\r\n/g,'\n');
// Preserve the historical Pass70 protection assertions against the exact full-source inverse.
const source=liveSource.includes('function createCLHuntRefugeGeometry(')?require('./helpers/cephalopod_pass71_reference.cjs').restorePass71Source(liveSource):liveSource;
const {restorePass70Source}=require('./helpers/cephalopod_pass70_reference.cjs');
const baseline=restorePass70Source(source),key='cl-octopus-surface-v70';
function factory(s){const begin=s.indexOf('function createCLHuntAnimal('),end=s.indexOf('// Compact, individually owned prey rig.',begin);if(begin<0||end<=begin)throw Error('Animal extraction failed');return new Function('T','species','Math',s.slice(begin,end)+';return createCLHuntAnimal(T,species);');}
const build=factory(source),prior=factory(baseline),owned=[];
const target=['commonOcto','giantPacific','mimicOcto','caribReef','coconutOcto'];
const protectedIds=['blueRinged','humboldtSquid','cuttlefish','bobtailSquid','vampireSquid','dumboOcto','nautilus'];
const noRandom=Object.assign(Object.create(Math),{random(){throw Error('Surface used simulation RNG');}});
const state=(extra={})=>({moving:false,jet:false,strike:0,camo:0,substrate:'sand',display:false,reducedMotion:false,...extra});
const webGL2={capabilities:{isWebGL2:true},extensions:{has(){throw Error('Unnecessary extension query');}}};
function rig(id='commonOcto',old=false){const a=(old?prior:build)(THREE,{id,bodyColor:0x99775d},noRandom);owned.push(a);return a;}
function meshes(a){const result=[];a.root.traverse(o=>{if(o.isMesh)result.push(o);});return result;}
function skinMaterials(a){return [...new Set(meshes(a).map(o=>o.material).filter(m=>m.customProgramCacheKey()===key))];}
function compiled(material,renderer=webGL2){const shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}};material.onBeforeCompile(shader,renderer);return shader;}
function geometryHash(a){const h=createHash('sha256');a.root.traverse(o=>{h.update(JSON.stringify([o.name,o.type,o.position.toArray(),o.quaternion.toArray(),o.scale.toArray(),o.visible,o.userData]));if(o.geometry){for(const [name,attr]of Object.entries(o.geometry.attributes)){h.update(name);h.update(Buffer.from(attr.array.buffer,attr.array.byteOffset,attr.array.byteLength));}if(o.geometry.index)h.update(Buffer.from(o.geometry.index.array.buffer));if(o.instanceMatrix)h.update(Buffer.from(o.instanceMatrix.array.buffer));}});return h.digest('hex');}
function shaderRecords(a){return meshes(a).map(o=>{const m=o.material,s=compiled(m);return[o.name,m.type,m.name,m.color?.toArray(),m.emissive?.toArray(),m.roughness,m.metalness,m.side,m.transparent,m.opacity,m.depthWrite,m.customProgramCacheKey(),s.vertexShader,s.fragmentShader,Object.fromEntries(Object.entries(s.uniforms).map(([k,u])=>[k,u.value?.toArray?u.value.toArray():u.value]))];});}
function scalarFunctions(shader){const definitions=Array.from(shader.fragmentShader.matchAll(/float (clOcto(?:DetailFilter|Tone|Roughness))\(([^)]*)\)\{([^{}]*)\}/g));if(definitions.length!==3)throw Error('Scalar shader helpers missing');const js=definitions.map(([,n,p,b])=>'function '+n+'('+p.replace(/float /g,'')+'){'+b.replace(/\bfloat /g,'let ')+'}').join('\n');const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));const smoothstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};return new Function('clamp','smoothstep',js+';return {'+definitions.map(([,n])=>n).join(',')+'};')(clamp,smoothstep);}
function coordinate(mesh,uniform,vertex=37){const p=new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,vertex);mesh.updateWorldMatrix(true,false);return p.applyMatrix4(mesh.matrixWorld).applyMatrix4(uniform.clOctoSurfaceFrame.value).divideScalar(uniform.clOctoBodyScale.value);}
afterEach(()=>{for(const a of owned.splice(0)){const g=new Set(),m=new Set();meshes(a).forEach(o=>{g.add(o.geometry);m.add(o.material);});g.forEach(x=>x.dispose());m.forEach(x=>x.dispose());}});

describe('Reef octopus pigment surface',()=>{
  it('uses the real bundled shader and propagates one program and frame across skin, arms and web',()=>{
    expect(THREE.REVISION).toBe('128');
    for(const id of target){const a=rig(id),materials=skinMaterials(a),shared=compiled(a.mantleMat).uniforms;expect(materials,id).toHaveLength(3);expect(meshes(a).find(o=>o.name==='cl-head').material).toBe(a.mantleMat);expect(meshes(a).find(o=>o.name==='cl-webbing').material.customProgramCacheKey()).toBe(key);
      for(const material of materials){const s=compiled(material);expect(s.vertexShader.match(/uniform mat4 clOctoSurfaceFrame;/g)).toHaveLength(1);expect(s.vertexShader).toContain('clSkinPos = position;');expect(s.vertexShader).toContain('clOctoPos=(clOctoSurfaceFrame*modelMatrix*vec4(position,1.0)).xyz/clOctoBodyScale;');expect(s.fragmentShader).toContain('return clOctoHash(p);');expect(s.fragmentShader).not.toContain('43758.5453');expect(s.fragmentShader).not.toMatch(/float patch\s*=/);expect(s.fragmentShader).not.toContain('clSkinPos*105.0');expect(s.fragmentShader).not.toContain('\\n');expect(s.fragmentShader).toContain('roughnessFactor=clOctoRoughness(');expect(s.fragmentShader.match(/=clNoise\(/g)).toHaveLength(3);for(const name of ['clPattern','clDisplay','clPhase','clOctoSurfaceFrame','clOctoBodyScale'])expect(s.uniforms[name]).toBe(shared[name]);expect(material.transparent).toBe(false);expect(material.map).toBe(null);expect(material.normalMap).toBe(null);expect(material.emissive.getHex()).toBe(0);}
    }
  });

  it('filters subpixel pigment only on supported derivative paths and gives a stable fallback',()=>{
    const m=rig().mantleMat,requests=[];
    const supported=compiled(m,{capabilities:{isWebGL2:false},extensions:{has(n){requests.push(n);return true;}}});expect(requests).toEqual(['OES_standard_derivatives']);expect(supported.fragmentShader).toContain('fwidth(clOctoMediumPos)');expect(supported.fragmentShader).toContain('fwidth(clOctoFinePos)');
    for(const context of [null,{}, {capabilities:{isWebGL2:false},extensions:{has(){return false;}}}]){const s=compiled(m,context);expect(s.fragmentShader).not.toContain('fwidth(clOcto');expect(s.fragmentShader).toContain('float clOctoMediumAA=0.35; float clOctoFineAA=0.0;');expect(s.uniforms.clOctoSurfaceFrame).toBe(supported.uniforms.clOctoSurfaceFrame);}
    const f=scalarFunctions(supported);let prev=1;for(let x=0;x<3;x+=.025){const aa=f.clOctoDetailFilter(x);expect(aa).toBeGreaterThanOrEqual(0);expect(aa).toBeLessThanOrEqual(prev);prev=aa;}expect(f.clOctoDetailFilter(.30)).toBe(1);expect(f.clOctoDetailFilter(1.05)).toBe(0);
    expect(f.clOctoTone(.3,.4,0,.35,0,.7,0)).toBe(f.clOctoTone(.3,.4,1,.35,0,.7,0));
  });

  it('keeps pigment coordinates attached during translated and rotated root transforms',()=>{
    const a=rig(),shader=compiled(a.mantleMat),s=state({reducedMotion:true,substrate:'rock'});a.update(7,0,s);const chosen=meshes(a).filter(o=>['cl-mantle','cl-head','cl-arm-2','cl-webbing'].includes(o.name));expect(chosen).toHaveLength(4);const before=chosen.map(m=>coordinate(m,shader.uniforms));a.root.position.set(13,-4,8);a.root.rotation.set(.2,1.4,-.3);a.update(7,0,s);chosen.forEach((m,i)=>expect(coordinate(m,shader.uniforms).distanceTo(before[i])).toBeLessThan(1e-10));const inverseProduct=shader.uniforms.clOctoSurfaceFrame.value.clone().multiply(a.root.matrixWorld).elements,identity=new THREE.Matrix4().elements;inverseProduct.forEach((value,i)=>expect(value).toBeCloseTo(identity[i],12));
    const small=rig(),large=rig('giantPacific');small.update(7,0,s);large.update(7,0,s);expect(compiled(large.mantleMat).uniforms.clOctoBodyScale.value).toBe(1.4);const su=compiled(small.mantleMat).uniforms,lu=compiled(large.mantleMat).uniforms;for(const name of ['cl-head','cl-arm-2','cl-webbing']){const sm=meshes(small).find(m=>m.name===name),lm=meshes(large).find(m=>m.name===name);expect(coordinate(sm,su).distanceTo(coordinate(lm,lu)),name).toBeLessThan(1e-6);}
  });

  it('isolates per-animal uniforms and retains pattern drives and resources over frozen updates',()=>{
    const a=rig(),b=rig(),u=compiled(a.mantleMat).uniforms,v=compiled(b.mantleMat).uniforms;for(const name of ['clOctoSurfaceFrame','clOctoBodyScale','clPattern','clPhase'])expect(u[name]).not.toBe(v[name]);a.root.position.set(2,3,4);a.update(9,0,state({reducedMotion:true,substrate:'grass'}));expect(u.clPattern.value).toBe(.72);expect(v.clPattern.value).toBe(.22);expect(u.clPhase.value).toBe(9);expect(v.clPhase.value).toBe(0);
    const resources=meshes(a).map(o=>[o,o.geometry,o.material,Object.values(o.geometry.attributes).map(x=>x.array)]),frozen=geometryHash(a);for(let n=0;n<4;n++)a.update(9,0,state({reducedMotion:true,substrate:'grass'}));expect(geometryHash(a)).toBe(frozen);for(const [o,g,m,arrays]of resources){expect(o.geometry).toBe(g);expect(o.material).toBe(m);Object.values(g.attributes).forEach((x,i)=>expect(x.array).toBe(arrays[i]));}
    for(const [substrate,value]of [['sand',.22],['rock',.9]]){a.update(9,0,state({reducedMotion:true,substrate}));expect(u.clPattern.value).toBe(value);}expect(u.clDisplay.value).toBe(0);
  });

  it('bounds actual tone and roughness arithmetic and increases dorsal camouflage contrast in cover',()=>{
    const f=scalarFunctions(compiled(rig().mantleMat));for(const macro of [0,.5,1])for(const medium of [0,.5,1])for(const fine of [0,.5,1])for(const aa of [0,.35,1])for(const strength of [0,.7,1])for(const belly of [0,.5,1]){const tone=f.clOctoTone(macro,medium,fine,aa,aa,strength,belly),rough=f.clOctoRoughness(.43,macro,medium,aa,belly);expect(Number.isFinite(tone)).toBe(true);expect(tone).toBeGreaterThanOrEqual(.58);expect(tone).toBeLessThanOrEqual(1.28);expect(rough).toBeGreaterThanOrEqual(.33);expect(rough).toBeLessThanOrEqual(.58);}
    const contrast=strength=>f.clOctoTone(1,1,0,1,1,strength,0)-f.clOctoTone(0,0,0,1,1,strength,0);expect(contrast(1)).toBeGreaterThan(contrast(0));expect(Math.abs(f.clOctoTone(0,0,1,1,1,1,1)-1)).toBeLessThan(Math.abs(f.clOctoTone(0,0,1,1,1,1,0)-1));
  });

  it('preserves twelve species geometry, attachments, pose actions and resources against the exact inverse',()=>{
    for(const id of [...target,...protectedIds]){const a=rig(id),b=rig(id,true);expect(geometryHash(a),id+' initial').toBe(geometryHash(b));expect(meshes(a)).toHaveLength(meshes(b).length);
      const frames=[state({moving:true,camo:.6,substrate:'rock'}),state({jet:true,moving:true,substrate:'grass'}),state({strike:.65,strikeAim:{x:.3,y:.1,z:1},strikeBrace:.5,strikePreparation:.4,squeezeBlend:.7,camo:.8,substrate:'rock',display:true}),state({reducedMotion:true,strike:.9,squeezeBlend:1,substrate:'sand'})];
      frames.forEach((s,i)=>{a.update(1+i*.05,.05,s);b.update(1+i*.05,.05,s);expect(geometryHash(a),id+' pose '+i).toBe(geometryHash(b));});
      if(protectedIds.includes(id)){expect(skinMaterials(a)).toHaveLength(0);expect(shaderRecords(a),id+' complete protected shaders').toEqual(shaderRecords(b));}
    }
  },120000);

  it('keeps the actual bounded pigment hash finite across positive and negative animal coordinates',()=>{
    const shader=compiled(rig().mantleMat),match=shader.fragmentShader.match(/float clOctoHash\(vec3 p\)\{([^{}]*)\}/);expect(match).not.toBe(null);const mod=(x,n)=>x-n*Math.floor(x/n),f=new Function('p','mod',match[1].replace(/\bfloat /g,'let ')),levels=new Set();for(let x=-80;x<=80;x+=13)for(let y=-45;y<=45;y+=11)for(let z=-100;z<=250;z+=29){const value=f({x,y,z},mod);expect(Number.isFinite(value)).toBe(true);expect(value).toBeGreaterThanOrEqual(0);expect(value).toBeLessThanOrEqual(1);levels.add(value);}expect(levels.size).toBeGreaterThan(65);expect(Math.min(...levels)).toBeLessThan(.02);expect(Math.max(...levels)).toBeGreaterThan(.98);
  });

  it('protects all simulation and camera code outside the two approved surface edits',()=>{
    const marker='// Compact, individually owned prey rig.';expect(source.slice(source.indexOf(marker))).toBe(baseline.slice(baseline.indexOf(marker)));expect(baseline).not.toContain(key);expect(source).toContain(key);
  });
});
