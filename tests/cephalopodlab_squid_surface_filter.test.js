import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8').replace(/\r\n/g,'\n');
const begin=source.indexOf('function createCLHuntAnimal('),end=source.indexOf('// Compact, individually owned prey rig.',begin);
if(begin<0||end<=begin)throw Error('Cannot find actual production animal factory');
const build=new Function('T','species','Math',source.slice(begin,end)+';return createCLHuntAnimal(T,species);');
const noRandom=Object.assign(Object.create(Math),{random(){throw Error('Squid surface consumed dive RNG');}}),allocated=[];
const key='cl-squid-surface-v34-layered',limbKey='cl-squid-limb-oral-v36',skinKeys=[key,limbKey],state=(extra={})=>({moving:false,jet:false,strike:0,camo:0,substrate:'sand',display:false,reducedMotion:false,...extra});
const webgl2={capabilities:{isWebGL2:true},extensions:{has(){throw Error('WebGL2 must not query derivative extension');}}};
function rig(id='humboldtSquid'){const a=build(THREE,{id,bodyColor:0xbc6048},noRandom);allocated.push(a);return a;}
function meshes(a){const out=[];a.root.traverse(o=>{if(o.isMesh)out.push(o);});return out;}
function skinMaterials(a){return [...new Set(meshes(a).map(o=>o.material).filter(m=>skinKeys.includes(m.customProgramCacheKey())))];}
function compiled(m,renderer=webgl2){const s={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}};m.onBeforeCompile(s,renderer);return s;}
function scalarFunctions(shader){
  const defs=Array.from(shader.fragmentShader.matchAll(/float (clSq\w+)\(([^)]*)\)\{([^{}]*)\}/g));
  if(defs.length!==7)throw Error('Expected seven production squid scalar helpers');
  const js=defs.map(([,name,params,body])=>'function '+name+'('+params.replace(/float /g,'')+'){'+body.replace(/\bfloat /g,'let ')+'}').join('\n');
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mod=(x,n)=>x-n*Math.floor(x/n);
  const smoothstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
  return new Function('clamp','mod','smoothstep',js+';return {'+defs.map(([,name])=>name).join(',')+'};')(clamp,mod,smoothstep);
}
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function geometry(a){return meshes(a).map(o=>[o.name,Object.entries(o.geometry.attributes).map(([k,v])=>[k,Array.from(v.array)]),o.geometry.index?Array.from(o.geometry.index.array):null,o.position.toArray(),o.quaternion.toArray(),o.scale.toArray(),o.isInstancedMesh?Array.from(o.instanceMatrix.array):null]);}
afterEach(()=>{for(const a of allocated.splice(0)){const owned=new Set();meshes(a).forEach(o=>{owned.add(o.geometry);owned.add(o.material);});owned.forEach(r=>r.dispose());}});

describe('Humboldt squid stable pigment finish',()=>{
  it('compiles filtered opaque pigment on every existing skin clone while preserving anatomical palette and root coordinates',()=>{
    const a=rig(),materials=skinMaterials(a);expect(THREE.REVISION).toBe('128');expect(materials).toHaveLength(4);expect(materials.map(m=>m.customProgramCacheKey()).sort()).toEqual([key,key,key,limbKey].sort());
    const first=compiled(a.mantleMat);
    const body=meshes(a).filter(mesh=>skinKeys.includes(mesh.material.customProgramCacheKey()));
    for(const name of ['cl-mantle','cl-head','cl-arm-0','cl-tentacle-0','cl-fin--1','cl-fin-1'])expect(body.some(mesh=>mesh.name===name),name).toBe(true);
    for(const mesh of body){expect(mesh.material.roughness,mesh.name+' actual skin finish').toBe(mesh.name.startsWith('cl-fin-')?.55:.50);expect(mesh.material.metalness,mesh.name).toBe(0);}
    for(const [name,roughness]of [['cl-iris',.36],['cl-pupil',.17]]){
      const pair=meshes(a).filter(mesh=>mesh.name===name);expect(pair,name).toHaveLength(2);
      for(const mesh of pair){const material=mesh.material;expect(material.roughness,name+' unchanged wet dome').toBe(roughness);expect(material.transparent,name).toBe(false);expect(material.opacity,name).toBe(1);expect(material.emissive.getHex(),name).toBe(0);expect(skinKeys.includes(material.customProgramCacheKey()),name).toBe(false);
        if(name==='cl-pupil'){expect(material.isMeshPhysicalMaterial).toBe(true);expect(material.clearcoat).toBe(.82);expect(material.clearcoatRoughness).toBe(.12);expect(material.metalness).toBe(0);expect(Math.max(...material.color.toArray())).toBeLessThan(.004);}
        else{expect(material.vertexColors).toBe(true);expect(material.metalness).toBe(.20);}
      }
    }
    for(const m of materials){const s=compiled(m);
      expect(s.vertexShader.match(/uniform mat4 clSurfaceFrame;/g)).toHaveLength(1);
      expect(s.vertexShader).toContain('clSkinPos = (clSurfaceFrame * modelMatrix * vec4(position,1.0)).xyz;');
      expect(s.fragmentShader).toContain('return clSqHash(p.x,p.y,p.z);');expect(s.fragmentShader).not.toContain('43758.5453');expect(s.fragmentShader).not.toContain('\\n');
      expect(s.fragmentShader.match(/=clNoise\(/g)).toHaveLength(4);expect(s.fragmentShader.match(/fwidth\(clSq/g)).toHaveLength(3);
      expect(s.fragmentShader).toContain('clSkinPos*vec3(4.5,7.0,3.0)');
      expect(s.fragmentShader).toContain('vec3 clPale=diffuseColor.rgb*0.22+vec3(0.29,0.23,0.20);');
      expect(s.fragmentShader).toContain('vec3 clRed=diffuseColor.rgb*(0.91+0.20*clPatch);');
      expect(s.fragmentShader).toContain('clVentral*0.69+(1.0-clDorsal)*(0.06+(1.0-clPatch)*0.08)');
      expect(s.fragmentShader).toContain('#include <roughnessmap_fragment>\nroughnessFactor=clSqMediumRoughness(clSqRoughness(roughnessFactor,clFine,clSqFineAA),clMacro,clMedium,clSqMediumAA,clVentral);');
      for(const u of ['clSurfaceFrame','clPattern','clDisplay','clPhase'])expect(s.uniforms[u]).toBe(first.uniforms[u]);
      expect(m.transparent).toBe(false);expect(m.opacity).toBe(1);expect(m.emissive.getHex()).toBe(0);expect(m.map).toBe(null);expect(m.normalMap).toBe(null);
    }
    for(const name of ['cl-pupil','cl-iris','cl-suckers','cl-siphon-tube']){
      const material=a.root.getObjectByName(name).material,s=compiled(material);expect(s.fragmentShader,name).not.toContain('clSqPigmentTone');expect(skinKeys.includes(material.customProgramCacheKey())).toBe(false);
    }
  });

  it('gates actual derivative support and keeps unsupported renderers free of subpixel grain',()=>{
    const m=rig().mantleMat,requested=[];
    const supported=compiled(m,{capabilities:{isWebGL2:false},extensions:{has(name){requested.push(name);return true;}}});
    expect(requested).toEqual(['OES_standard_derivatives']);expect(supported.fragmentShader).toContain('fwidth(clSqFinePos)');expect(supported.fragmentShader).toContain('fwidth(clSqGrainPos)');expect(supported.fragmentShader).toContain('fwidth(clSqMediumPos)');
    for(const renderer of [null,{capabilities:{isWebGL2:false},extensions:{has(){return false;}}},{capabilities:{isWebGL2:false}}]){
      const s=compiled(m,renderer);expect(s.fragmentShader).not.toMatch(/fwidth\(clSq/);expect(s.fragmentShader).toContain('float clSqFineAA=0.0; float clSqGrainAA=0.0;');
      expect(s.fragmentShader).toContain('float clSqMediumAA=0.35;');expect(s.fragmentShader).toContain('float clMacro=clNoise(');expect(s.uniforms.clSurfaceFrame).toBe(supported.uniforms.clSurfaceFrame);
    }
  });

  it('bounds actual polynomial noise hash across positive and negative animal coordinates without short lattice repeats',()=>{
    const f=scalarFunctions(compiled(rig().mantleMat)),levels=new Set();
    for(let x=-1000;x<=1000;x+=37)for(let y=-250;y<=250;y+=29)for(let z=-450;z<=450;z+=41){const value=f.clSqHash(x,y,z);expect(Number.isFinite(value)).toBe(true);expect(value).toBeGreaterThanOrEqual(0);expect(value).toBeLessThanOrEqual(1);levels.add(value);}
    expect(levels.size).toBeGreaterThan(60);expect(Math.min(...levels)).toBeLessThan(.02);expect(Math.max(...levels)).toBeGreaterThan(.98);
    for(const shift of [[2,0,-9],[5,-7,0],[0,1,24]]){let changed=0;for(let i=-20;i<=20;i++)if(f.clSqHash(i,i*2,-i)!==f.clSqHash(i+shift[0],i*2+shift[1],-i+shift[2]))changed++;expect(changed,'short spatial repeat '+shift.join(',')).toBeGreaterThan(35);}
  },60000);

  it('fades detail monotonically and retains the original resolved pigment and roughness coefficients',()=>{
    const f=scalarFunctions(compiled(rig().mantleMat));let previous=1;
    for(let footprint=0;footprint<=3;footprint+=.025){const aa=f.clSqDetailFilter(footprint);expect(aa).toBeGreaterThanOrEqual(0);expect(aa).toBeLessThanOrEqual(previous);previous=aa;}
    expect(f.clSqDetailFilter(.35)).toBe(1);expect(f.clSqDetailFilter(1.1)).toBe(0);
    const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
    for(const fine of [0,.25,.5,.75,1])for(const grain of [0,.25,.5,.75,1])for(const patch of [0,.5,1])for(const dorsal of [0,.5,1]){
      const old=1-smooth(.60+patch*.045,.82,fine)*(.07+.09*dorsal)-smooth(.67,.84,grain)*.028;
      expect(f.clSqPigmentTone(fine,grain,patch,dorsal,1,1)).toBeCloseTo(old,14);
      expect(f.clSqPigmentTone(fine,grain,patch,dorsal,0,0)).toBe(1);
      for(const aa of [0,.25,.5,.75,1]){const tone=f.clSqPigmentTone(fine,grain,patch,dorsal,aa,aa);expect(tone).toBeGreaterThanOrEqual(.812-Number.EPSILON);expect(tone).toBeLessThanOrEqual(1);}
    }
    for(const base of [.28,.39,.50,.55,.62])for(const fine of [0,.25,.5,.75,1]){
      expect(f.clSqRoughness(base,fine,1)).toBeCloseTo(Math.max(.28,Math.min(.62,base*(.93+fine*.16))),14);
      expect(f.clSqRoughness(base,fine,0)).toBe(f.clSqRoughness(base,.5,0));
      for(const aa of [0,.25,.5,.75,1]){const r=f.clSqRoughness(base,fine,aa);expect(r).toBeGreaterThanOrEqual(.28);expect(r).toBeLessThanOrEqual(.62);}
    }
  });

  it('keeps broad dorsal mottling visible independently of fine filtering and leaves the fully pale belly unchanged',()=>{
    const shader=compiled(rig().mantleMat),f=scalarFunctions(shader);
    expect(shader.fragmentShader).toContain('diffuseColor.rgb*=clSqMottleTone(clPatch,clDorsal,clVentral);');
    expect(shader.fragmentShader).toContain('float strength=(0.12+0.16*dorsal)*(1.0-ventral);');
    expect(shader.fragmentShader).not.toMatch(/clSqMottleTone\(clPatch[^;]*clSq(?:Fine|Grain)AA/);
    for(const dorsal of [0,.25,.5,.75,1])for(const ventral of [0,.25,.5,.75,1]){
      let previous=-Infinity;
      for(let patch=0;patch<=1;patch+=.025){
        const tone=f.clSqMottleTone(patch,dorsal,ventral);
        expect(Number.isFinite(tone)).toBe(true);expect(tone).toBeGreaterThanOrEqual(.86-Number.EPSILON);expect(tone).toBeLessThanOrEqual(1.14+Number.EPSILON);
        expect(tone).toBeGreaterThanOrEqual(previous);previous=tone;
        if(ventral===1)expect(tone).toBe(1);
      }
      expect(f.clSqMottleTone(.5,dorsal,ventral)).toBe(1);
    }
    const dorsalContrast=f.clSqMottleTone(1,1,0)-f.clSqMottleTone(0,1,0);
    const flankContrast=f.clSqMottleTone(1,0,0)-f.clSqMottleTone(0,0,0);
    expect(dorsalContrast).toBeGreaterThan(.27);expect(dorsalContrast).toBeGreaterThan(flankContrast);
    expect(f.clSqMottleTone(0,1,.75)).toBeGreaterThan(f.clSqMottleTone(0,1,0));
    // Even the simultaneous darkest red macro patch and fully resolved fine cells retain color.
    const dark=f.clSqMottleTone(0,1,0)*.91*f.clSqPigmentTone(1,1,0,1,1,1);
    expect(dark).toBeGreaterThan(.63);
    // Filtering can remove fine cells; it cannot erase the coherent broad patch.
    expect(f.clSqMottleTone(0,1,0)*f.clSqPigmentTone(1,1,0,1,0,0)).toBeLessThan(.9);
  });

  it('retains readable medium pigment after fine filtering while preserving the pale ventral surface',()=>{
    const shader=compiled(rig().mantleMat),f=scalarFunctions(shader);
    expect(shader.fragmentShader).toContain('clSkinPos*vec3(20.0,28.0,18.0)');
    expect(shader.fragmentShader).toContain('clSqDetailFilter(length(fwidth(clSqMediumPos)))');
    expect(shader.fragmentShader).toContain('diffuseColor.rgb*=clSqMediumTone(clMedium,clDorsal,clVentral,clSqMediumAA);');
    expect(shader.fragmentShader).not.toMatch(/clSqMediumPos[^;]*clPhase/);
    for(const dorsal of [0,.5,1])for(const ventral of [0,.5,1])for(const aa of [0,.25,.5,.75,1]){
      let previous=Infinity;
      for(let pigment=0;pigment<=1.00001;pigment+=.025){const tone=f.clSqMediumTone(pigment,dorsal,ventral,aa);expect(Number.isFinite(tone)).toBe(true);expect(tone).toBeGreaterThanOrEqual(.70-1e-12);expect(tone).toBeLessThanOrEqual(1);expect(tone).toBeLessThanOrEqual(previous+1e-12);previous=tone;if(ventral===1||aa===0)expect(tone).toBe(1);}
    }
    expect(f.clSqMediumTone(1,1,0,1)).toBeCloseTo(.70,14);expect(f.clSqMediumTone(1,0,0,1)).toBeCloseTo(.85,14);
    // At this ordinary footprint, medium pigment remains legible while fine cells are fully filtered.
    expect(f.clSqDetailFilter(.4)).toBeGreaterThan(.95);expect(f.clSqDetailFilter(1.6)).toBe(0);
    expect(f.clSqMediumTone(1,1,0,f.clSqDetailFilter(.4))).toBeLessThan(.72);
    for(const medium of [0,.25,.5,.75,1])expect(f.clSqMediumTone(medium,1,0,0)).toBe(1);
  });

  it('varies bounded surface response at playable scale without changing a fully ventral finish',()=>{
    const f=scalarFunctions(compiled(rig().mantleMat));
    for(const base of [.465,.50,.55,.5995])for(const macro of [0,.5,1])for(const medium of [0,.5,1])for(const aa of [0,.5,1])for(const ventral of [0,.5,1]){
      const r=f.clSqMediumRoughness(base,macro,medium,aa,ventral);expect(Number.isFinite(r)).toBe(true);expect(r).toBeGreaterThanOrEqual(.38);expect(r).toBeLessThanOrEqual(.64);if(ventral===1)expect(r).toBe(base);
    }
    expect(f.clSqMediumRoughness(.505,.5,0,1,0)).toBeCloseTo(.435,14);expect(f.clSqMediumRoughness(.505,.5,1,1,0)).toBeCloseTo(.575,14);
    expect(f.clSqMediumRoughness(.505,0,.5,0,0)).toBeCloseTo(.475,14);expect(f.clSqMediumRoughness(.505,1,.5,0,0)).toBeCloseTo(.535,14);
    expect(f.clSqMediumRoughness(.505,.5,0,0,0)).toBe(f.clSqMediumRoughness(.505,.5,1,0,0));
  });

  it('reuses the root inverse frame and every geometry/material buffer across motion, strike and frozen updates',()=>{
    const a=rig(),parent=new THREE.Group();parent.position.set(9,-3,11);parent.rotation.set(.2,.5,-.1);parent.scale.set(1.3,.8,1.1);parent.add(a.root);
    const shared=compiled(a.mantleMat).uniforms.clSurfaceFrame,original=shared.value,materials=skinMaterials(a);
    const owned=meshes(a).map(o=>[o,o.geometry,o.material,Object.values(o.geometry.attributes).map(attr=>attr.array),o.geometry.index?.array,o.instanceMatrix?.array]);
    expect(owned).toHaveLength(25);expect(new Set(owned.map(row=>row[2])).size).toBe(8);
    for(let step=0;step<8;step++){
      a.root.position.set(step*.4,.6,-step*.2);a.root.rotation.set(.1,step*.5,-.2);a.update(2+step*.05,.05,state({moving:true,jet:step===2,strike:step===4?.6:0,strikeAim:step===4?new THREE.Vector3(.8,.3,1.6):null}));parent.updateMatrixWorld(true);
      expect(shared.value).toBe(original);const identity=shared.value.clone().multiply(a.root.matrixWorld);identity.elements.forEach((v,i)=>expect(v).toBeCloseTo(i%5===0?1:0,10));
      for(const m of materials)expect(compiled(m).uniforms.clSurfaceFrame).toBe(shared);
      for(const name of ['cl-mantle','cl-head','cl-arm-0','cl-fin--1','cl-fin-1']){const mesh=a.root.getObjectByName(name),local=new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,7),point=local.clone().applyMatrix4(mesh.matrixWorld).applyMatrix4(shared.value);expect(point.distanceTo(local.clone().applyMatrix4(mesh.matrix)),name).toBeLessThan(1e-9);}
    }
    a.update(7,0,state({reducedMotion:true}));const frozen=hash(geometry(a));for(let i=0;i<5;i++)a.update(7,0,state({reducedMotion:true}));expect(hash(geometry(a))).toBe(frozen);
    for(const [o,g,m,arrays,index,instances]of owned){expect(o.geometry).toBe(g);expect(o.material).toBe(m);Object.values(g.attributes).forEach((attr,i)=>expect(attr.array).toBe(arrays[i]));expect(g.index?.array).toBe(index);expect(o.instanceMatrix?.array).toBe(instances);}
    for(const id of ['commonOcto','blueRinged','mimicOcto','giantPacific','caribReef','coconutOcto','cuttlefish','bobtailSquid','dumboOcto','vampireSquid','nautilus'])for(const mesh of meshes(rig(id))){const s=compiled(mesh.material);expect(s.fragmentShader,id).not.toContain('clSqDetailFilter');expect(skinKeys.includes(mesh.material.customProgramCacheKey())).toBe(false);}
  },20000);
});
